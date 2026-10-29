/*! Fuseo circadian engine v2.0.0 — moteur de chronobiologie du voyage (Institut Médical du Sommeil). Généré par scripts/build-browser.mjs — ne pas éditer. */
(function (global) {
  'use strict';
  const __defs = {
'src/index.js': function (exports, __req) {
const { MS_H, MS_MIN, MS_D, LIGHT_REC, INTERVENTION, CATEGORY_OF, STRATEGY, MODE, wrap24, wrap12, clamp } = __req('src/constants.js');
const { buildCircadianProfile } = __req('src/profile/index.js');
const { buildItinerary, timeFrames, locationAt, classifyFlight } = __req('src/itinerary/index.js');
const { hhmm, isoLocal, hoursToHHMM, localParts, utcIso } = __req('src/itinerary/tz.js');
const { prepareContext, optimize, traceRun } = __req('src/optimizer/index.js');
const { calculateLightEffect } = __req('src/light/index.js');
const { isRecommendationFeasible } = __req('src/practicality/index.js');
const { screenCaffeine, globalSafetyNotes } = __req('src/safety/index.js');
const { adaptationDashboard, confidenceAt, adaptationPercentage, formatDuration } = __req('src/scoring/index.js');
const ENGINE_VERSION = '2.0.0';
function traceAt(trace, t) {
  if (!trace.length) return null;
  let lo = 0, hi = trace.length - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (trace[m].t <= t) lo = m; else hi = m - 1; }
  return trace[lo];
}
function mergeLights(lights) {
  const out = [];
  for (const l of [...lights].sort((x, y) => x.a - y.a)) {
    const last = out[out.length - 1];
    if (last && last.rec === l.rec && last.inFlight === l.inFlight && Math.abs(last.b - l.a) < 1000) { last.b = l.b; last.luxSum += l.lux * (l.b - l.a); }
    else out.push({ a: l.a, b: l.b, rec: l.rec, inFlight: l.inFlight, luxSum: l.lux * (l.b - l.a) });
  }
  return out.map(x => ({ a: x.a, b: x.b, rec: x.rec, inFlight: x.inFlight, lux: Math.round(x.luxSum / Math.max(1, x.b - x.a)) }));
}
function buildInterventions(ctx, run, trace, sleepsAll) {
  const { profile, it, prefs } = ctx;
  const list = [];
  let n = 0;
  const cityOf = tz => (tz === it.homeTz ? it.home.city : tz === it.destTz ? it.dest.city : tz === it.finalTz ? it.final.city : tz.split('/').pop().replace(/_/g, ' '));
  const add = (type, start, end, extra = {}) => {
    const p = traceAt(trace, start);
    const fr = timeFrames(it, start);
    const feas = isRecommendationFeasible({ type, start, end, recommendation: extra.recommendation }, it, { hasLightBox: prefs.hasLightBox, blockedWindows: prefs.blockedWindows });
    list.push({
      id: `${type}-${++n}`, type, category: CATEGORY_OF[type],
      start, end, startUtc: utcIso(start), endUtc: utcIso(end), durationMin: Math.round((end - start) / MS_MIN),
      frames: { ...fr, bodyClock: p ? hoursToHHMM(p.bodyClockHome) : null, bodyClockCity: it.home.city, localCity: cityOf(fr.localTz) },
      localTime: hhmm(start, fr.localTz), localTz: fr.localTz,
      inFlight: locationAt(it, (start + end) / 2).inFlight,
      feasible: feas.feasible, setting: feas.setting || null, alternative: feas.alternative || null, feasibilityReason: feas.reason || null,
      biologicalTime: p ? p.biologicalTime : null,
      ...extra,
    });
  };
  const planned = sleepsAll.filter(s => s.kind !== 'NAP' && s.b > ctx.T0 + 1).sort((a, b) => a.a - b.a);
  const episodes = [];
  for (const s of planned) {
    const last = episodes[episodes.length - 1];
    if (last && s.a - last.b < 3 * MS_H) last.b = s.b; else episodes.push({ a: s.a, b: s.b });
  }
  for (const s of planned) if (s.a >= ctx.T0) add(INTERVENTION.SLEEP, s.a, s.b, { priority: 1, rationale: { code: 'SLEEP_WINDOW' } });
  for (const e of episodes) if (e.b > ctx.T0 && e.b < run.end + 1) add(INTERVENTION.WAKE, e.b, e.b, { priority: 1 });
  for (const e of episodes) if (e.a > ctx.T0 + MS_H) {
    let a = e.a - MS_H;
    for (const ev of it.events || []) if (ev.start < e.a && ev.end > a) a = Math.max(a, ev.end);
    if (e.a - a >= 15 * MS_MIN) add(INTERVENTION.WIND_DOWN, a, e.a, { priority: 3, recommendation: LIGHT_REC.DIM_LIGHT });
  }
  const cyc = run.cycles;
  const lightModeAt = t => { const c = cyc.find(c => t >= c.wakePrev && t < c.wake); return c ? c.lightMode : 'HOLD'; };
  for (const w of mergeLights(run.lights)) {
    if (w.b - w.a < 20 * MS_MIN) continue;
    const dir = lightModeAt(w.a);
    const p = traceAt(trace, w.a);
    const eff = p ? calculateLightEffect(p.biologicalTime, w.lux, (w.b - w.a) / MS_H, 1) : null;
    const nearSleep = episodes.some(e => e.a >= w.a && e.a - w.b < 1 * MS_H && e.a - w.a <= 1.05 * MS_H);
    if (w.rec === LIGHT_REC.SEEK_BRIGHT_LIGHT || w.rec === LIGHT_REC.SEEK_DAYLIGHT) {
      add(INTERVENTION.LIGHT, w.a, w.b, { recommendation: w.rec, priority: w.rec === LIGHT_REC.SEEK_BRIGHT_LIGHT ? 1 : 2, rationale: { code: dir === 'HOLD' ? 'STABILIZE' : dir, expectedPhaseShiftH: eff ? eff.phaseShiftH : null, zone: eff ? eff.zone : null } });
    } else if (w.rec === LIGHT_REC.AVOID_BRIGHT_LIGHT || (w.rec === LIGHT_REC.DIM_LIGHT && !nearSleep)) {
      add(INTERVENTION.LIGHT_AVOIDANCE, w.a, w.b, { recommendation: w.rec, priority: w.rec === LIGHT_REC.AVOID_BRIGHT_LIGHT ? 1 : 2, rationale: { code: dir, wouldShiftIfBrightH: p ? calculateLightEffect(p.biologicalTime, 3000, (w.b - w.a) / MS_H, 1).phaseShiftH : null } });
    }
  }
  for (const m of run.melDecisions) add(INTERVENTION.MELATONIN_OPTIONAL, m.t, m.t, {
    priority: 2, optional: true, requiresMedicalAdvice: ctx.melatoninScreen.requiresMedicalAdvice, doseLabel: ctx.melatoninScreen.label, doseMg: m.dose,
    rationale: { code: 'ADVANCE', expectedPhaseShiftH: m.effect.circadianPhaseShifting.phaseShiftH, hypnoticEffect: m.effect.sleepPromotingEffect.hypnoticEffect, sedationDurationH: m.effect.sleepPromotingEffect.durationH },
  });
  const caf = prefs.caffeine === false ? { allowed: false } : screenCaffeine(profile, prefs.medical || {});
  const wakeEpisodes = [];
  for (let i = 0; i + 1 < episodes.length; i++) wakeEpisodes.push({ a: episodes[i].b, b: episodes[i + 1].a });
  for (const w of wakeEpisodes) {
    const len = (w.b - w.a) / MS_H; if (len < 6 || w.b < ctx.T0) continue;
    const mode = lightModeAt(w.a + MS_H);
    if (caf.allowed) {
      const perfEv = prefs.mode === MODE.PERFORM ? it.events.find(ev => ev.start > w.a && ev.start < w.b) : null;
      const cutoff = perfEv ? Math.max(w.b - caf.cutoffBeforeSleepH * MS_H, perfEv.start) : w.b - caf.cutoffBeforeSleepH * MS_H;
      if (cutoff > w.a + MS_H) {
        add(INTERVENTION.CAFFEINE_CUTOFF, cutoff, cutoff, { priority: 2 });
        const dip = trace.find(p => p.t >= w.a + 0.75 * MS_H && p.t < cutoff - 0.5 * MS_H && !p.asleep && p.predictedAlertness != null && p.predictedAlertness < 50);
        if (dip && !(perfEv && dip.t > perfEv.start - 3 * MS_H)) add(INTERVENTION.CAFFEINE, dip.t, dip.t, { priority: 3, optional: true, rationale: { code: 'LOW_PREDICTED_ALERTNESS', predictedAlertness: dip.predictedAlertness } });
      }
      for (const ev of it.events) if (ev.start > w.a && ev.start < w.b) {
        const t = ev.start - 45 * MS_MIN;
        if (t > w.a + 0.5 * MS_H && t <= cutoff) add(INTERVENTION.CAFFEINE, t, t, { priority: 2, optional: true, rationale: { code: 'PRE_EVENT', eventId: ev.id, tradeOff: perfEv ? 'MAY_DELAY_SLEEP_ONSET' : null } });
      }
    }
    const inF = t => locationAt(it, t).inFlight;
    add(INTERVENTION.MEAL, w.a + 0.5 * MS_H, w.a + 0.5 * MS_H, { priority: 3, meal: 'BREAKFAST', setting: inF(w.a + 0.5 * MS_H) ? 'CABIN_SERVICE' : null });
    if (len >= 10) add(INTERVENTION.MEAL, w.a + len * 0.42 * MS_H, w.a + len * 0.42 * MS_H, { priority: 3, meal: 'LUNCH' });
    if (len >= 8) add(INTERVENTION.MEAL, w.b - 3 * MS_H, w.b - 3 * MS_H, { priority: 3, meal: 'DINNER' });
    if (mode === 'ADVANCE' || mode === 'DELAY') {
      const s = mode === 'ADVANCE' ? w.a + 1.5 * MS_H : w.b - 5 * MS_H;
      if (s > w.a && s + 0.5 * MS_H < w.b - 2 * MS_H) {
        const f = isRecommendationFeasible({ type: INTERVENTION.EXERCISE, start: s, end: s + 30 * MS_MIN }, it, {});
        if (f.feasible) add(INTERVENTION.EXERCISE, s, s + 30 * MS_MIN, { priority: 3, rationale: { code: mode } });
      }
    }
  }
  for (const s of sleepsAll.filter(s => s.kind === 'NAP')) add(INTERVENTION.NAP, s.a, s.b, { priority: 3, optional: true, rationale: { code: s.reason || 'LOW_PREDICTED_ALERTNESS' } });
  for (const l of it.legs) {
    for (let t = l.depUtc + MS_H; t < l.arrUtc - 0.5 * MS_H; t += 2 * MS_H) {
      if (!sleepsAll.some(s => t >= s.a && t < s.b)) add(INTERVENTION.HYDRATION, t, t, { priority: 3 });
    }
  }
  return list.filter(x => x.feasible !== false || x.type === INTERVENTION.SLEEP).sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));
}
function planNaps(ctx, run, trace) {
  const { profile, it, prefs } = ctx;
  const naps = [];
  const sleeps = run.sleeps.filter(s => s.kind !== 'NAP').sort((a, b) => a.a - b.a);
  for (let i = 0; i + 1 < sleeps.length; i++) {
    const a = sleeps[i].b, b = sleeps[i + 1].a;
    if ((b - a) / MS_H < 8 || b < ctx.T0) continue;
    const thr = profile.napHabit === 'never' ? 25 : 35;
    const dip = trace.find(p => p.t >= a + 1.5 * MS_H && p.t <= b - 6 * MS_H && !p.asleep && p.predictedAlertness != null && p.predictedAlertness < thr);
    if (dip) {
      const nap = { a: dip.t, b: dip.t + 20 * MS_MIN, kind: 'NAP', reason: 'LOW_PREDICTED_ALERTNESS' };
      if (isRecommendationFeasible({ type: INTERVENTION.NAP, start: nap.a, end: nap.b }, it, prefs).feasible) naps.push(nap);
    }
  }
  if (prefs.mode === MODE.PERFORM) for (const ev of it.events) {
    const p = traceAt(trace, ev.start);
    if (!p || (p.predictedAlertness ?? 100) >= 70) continue;
    const alertAt = extra => { const tr = traceRun(ctx, run, [...naps, ...extra], 30).trace; const q = traceAt(tr, ev.start + 15 * MS_MIN); return q && !q.asleep ? q.predictedAlertness ?? 0 : 0; };
    let best = { gain: 0 }; const base = alertAt([]);
    for (const [durMin, endLead] of [[20, 2], [20, 3], [90, 2], [90, 3.5], [90, 5]]) {
      const b = ev.start - endLead * MS_H, a = b - durMin * MS_MIN;
      const nap = { a, b, kind: 'NAP', reason: 'PRE_EVENT', durationMin: durMin };
      if (sleeps.some(s => a < s.b + 2 * MS_H && b > s.a - 2 * MS_H)) continue;
      if (!isRecommendationFeasible({ type: INTERVENTION.NAP, start: a, end: b }, it, prefs).feasible) continue;
      const gain = alertAt([nap]) - base - (durMin > 30 ? 2 : 0); // légère préférence pour la sieste courte
      if (gain > best.gain) best = { gain, nap };
    }
    if (best.nap) naps.push({ ...best.nap, expectedGain: best.gain });
  }
  return naps;
}
function applyObservations(behavior, observations = [], now = Infinity) {
  let sleeps = behavior.sleeps.filter(s => s.a < now).map(s => ({ ...s, b: Math.min(s.b, now) }));
  let lights = behavior.lights.filter(l => l.a < now).map(l => ({ ...l, b: Math.min(l.b, now) }));
  let jumps = behavior.jumps.filter(j => j.t < now);
  for (const o of observations) {
    const a = o.start ?? o.at, b = o.end ?? o.at;
    switch (o.type) {
      case 'SLEEP': case 'UNPLANNED_SLEEP': case 'NAP':
        if (o.type === 'SLEEP') sleeps = sleeps.filter(s => !(s.a < b && s.b > a && s.kind !== 'NAP'));
        sleeps.push({ a, b, kind: o.type === 'NAP' ? 'NAP' : 'SLEEP', observed: true }); break;
      case 'WOKE_EARLY': sleeps = sleeps.map(s => (o.at > s.a && o.at < s.b ? { ...s, b: o.at } : s)); break;
      case 'NO_SLEEP': sleeps = sleeps.flatMap(s => (s.a < b && s.b > a ? [s.a < a ? { ...s, b: a } : null, s.b > b ? { ...s, a: b } : null].filter(Boolean) : [s])); break;
      case 'LIGHT_MISSED': lights = lights.filter(l => !(l.a < b && l.b > a && (l.rec === LIGHT_REC.SEEK_BRIGHT_LIGHT || l.rec === LIGHT_REC.SEEK_DAYLIGHT))); break;
      case 'LIGHT_TAKEN': lights.push({ a, b, rec: LIGHT_REC.SEEK_BRIGHT_LIGHT, lux: o.lux ?? 3000, observed: true }); break;
      case 'AVOIDANCE_MISSED': lights = lights.filter(l => !(l.a < b && l.b > a && (l.rec === LIGHT_REC.AVOID_BRIGHT_LIGHT || l.rec === LIGHT_REC.DIM_LIGHT))); lights.push({ a, b, rec: LIGHT_REC.NORMAL_LIGHT, lux: o.lux ?? 1000, observed: true }); break;
      case 'MELATONIN_SKIPPED': jumps = jumps.filter(j => Math.abs(j.t - (o.at ?? j.t)) > 2 * MS_H); break;
      case 'MELATONIN_TAKEN': if (Number.isFinite(o.phaseShiftH)) jumps.push({ t: o.at, h: o.phaseShiftH }); break;
      default: break;
    }
  }
  const byA = (x, y) => x.a - y.a;
  return { sleeps: sleeps.filter(s => s.b > s.a).sort(byA), lights: lights.sort(byA), jumps: jumps.sort((x, y) => x.t - y.t) };
}
/**
 * Génère un plan circadien complet.
 * @param {object} profileInput réponses du voyageur (voir buildCircadianProfile)
 * @param {object} itineraryInput voyage (voir buildItinerary)
 * @param {object} preferences { mode:'ADAPT'|'PERFORM', strategy:'AUTO'|STRATEGY, preDays:0-3, caffeine:boolean,
 *   melatonin:{enabled, physicianApproved, doseMg}, medical:{...}|null, hasLightBox, blockedWindows:[{start,end,label}],
 *   now?, observations?, previousBehavior?, planStart?, traceStepMin? }
 */
function generateCircadianPlan(profileInput, itineraryInput, preferences = {}, overrides = {}) {
  const t0 = Date.now();
  const { profile, errors: pe } = buildCircadianProfile({ ...profileInput, timezone: profileInput.timezone });
  const it = buildItinerary(itineraryInput);
  const errors = [...pe, ...(it.ok ? [] : it.errors)];
  if (errors.length) return { ok: false, version: ENGINE_VERSION, errors, warnings: it.warnings || [] };
  const prefs = { mode: MODE.ADAPT, strategy: 'AUTO', preDays: 0, caffeine: true, ...preferences };
  const ctx = prepareContext(profile, it, prefs, overrides);
  if (prefs.previousBehavior && Number.isFinite(prefs.now)) {
    ctx.history = applyObservations(prefs.previousBehavior, prefs.observations || [], prefs.now);
    ctx.now = prefs.now;
  }
  const opt = optimize(ctx);
  const run = opt.chosen;
  const pass1 = traceRun(ctx, run, [], 15);
  const naps = planNaps(ctx, run, pass1.trace);
  const { trace, sleeps } = traceRun(ctx, run, naps, prefs.traceStepMin || 15);
  run.naps = naps;
  const interventions = buildInterventions(ctx, run, trace, sleeps);
  const initialShift = it.shiftOutHours;
  for (const p of trace) {
    p.iso = utcIso(p.t);
    p.adaptationPercentage = adaptationPercentage(p.residualToLocalH ?? 0, p.t < it.stay.start ? initialShift : p.t >= (it.isRoundTrip ? it.returnLegs[0].depUtc : Infinity) ? it.shiftBackHours : initialShift);
  }
  const dashCtx = t => {
    const loc = locationAt(it, t);
    const ref = t >= (it.isRoundTrip ? it.returnLegs[0].depUtc : Infinity) ? it.shiftBackHours : initialShift;
    return { homeTz: it.homeTz, homeCity: it.home.city, localTz: loc.tz, localCity: loc.place ? loc.place.city : (loc.leg ? loc.leg.to.city : it.dest.city), initialShiftH: ref, profile, planStart: ctx.T0, observationsCount: (prefs.observations || []).length };
  };
  const dash = t => { const p = traceAt(trace, t); return p ? adaptationDashboard(p, dashCtx(t)) : null; };
  const days = [];
  const tEnd = trace.length ? trace[trace.length - 1].t : ctx.T0;
  let cur = ctx.T0;
  while (cur < tEnd && days.length < 40) {
    const loc = locationAt(it, cur); const tz = loc.tz; const p = localParts(cur, tz);
    const noon = (() => { const lp = localParts(cur, tz); let t = cur; for (let k = 0; k < 48 && localParts(t, tz).h !== 12; k++) t += 30 * MS_MIN; return t; })();
    const dateKey = `${p.y}-${String(p.mo).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
    let next = cur + MS_H; while (next < tEnd + MS_D) { const q = localParts(next, locationAt(it, next).tz); if (q.d !== p.d) break; next += 30 * MS_MIN; }
    const items = interventions.filter(x => x.start >= cur && x.start < next).map(x => x.id);
    const pEnd = traceAt(trace, next - 1);
    days.push({ date: dateKey, tz, start: cur, end: next, interventionIds: items, dashboardNoon: dash(noon), residualEndH: pEnd ? pEnd.residualToLocalH : null, adaptationEnd: pEnd ? pEnd.adaptationPercentage : null, phase: loc.phase });
    cur = next;
  }
  const legs = it.legs.map(l => ({
    id: l.id, group: l.group, from: l.from, to: l.to, flightNumber: l.flightNumber,
    departure: { ...timeFrames(it, l.depUtc), bodyClock: (traceAt(trace, l.depUtc) ? hoursToHHMM(traceAt(trace, l.depUtc).bodyClockHome) : null), localAtOrigin: isoLocal(l.depUtc, l.from.tz) },
    arrival: { ...timeFrames(it, l.arrUtc), bodyClock: (traceAt(trace, l.arrUtc) ? hoursToHHMM(traceAt(trace, l.arrUtc).bodyClockHome) : null), localAtDestination: isoLocal(l.arrUtc, l.to.tz) },
    durationH: +l.durationH.toFixed(2), type: classifyFlight(l, it.homeTz, profile.usualBedtimeH, profile.usualWakeTimeH),
    crossesDateLine: l.crossesDateLine, localDateChangeDays: l.localDateChangeDays, tzShiftHours: l.tzShiftHours,
  }));
  const chosenCmp = opt.comparison.find(c => c.chosen);
  const result = {
    ok: true, version: ENGINE_VERSION, generatedAt: new Date().toISOString(), computeMs: 0,
    warnings: it.warnings,
    profile,
    itinerary: {
      homeTz: it.homeTz, destTz: it.destTz, finalTz: it.finalTz, home: it.home, destination: it.dest, final: it.final,
      isRoundTrip: it.isRoundTrip, shiftOutHours: it.shiftOutHours, shiftBackHours: it.shiftBackHours,
      crossesDateLine: it.crossesDateLine, legs, layovers: it.layovers.map(l => ({ ...l, place: l.place })),
      stay: { ...it.stay, end: Number.isFinite(it.stay.end) ? it.stay.end : null, durationH: Number.isFinite(it.stay.durationH) ? +it.stay.durationH.toFixed(1) : null },
      events: it.events,
    },
    strategy: {
      mode: prefs.mode, chosen: run.strategy, direction: chosenCmp.direction, targetShiftH: chosenCmp.targetShiftH,
      shortTrip: opt.shortTrip, forced: opt.forced, comparison: opt.comparison,
    },
    interventions,
    days,
    dashboard: {
      atArrival: dash(it.stay.start + 2 * MS_H),
      atEndOfPlan: dash(tEnd),
      now: Number.isFinite(prefs.now) ? dash(prefs.now) : null,
    },
    cycles: run.cycles,
    trace,
    safety: {
      melatonin: ctx.melatoninScreen,
      caffeine: prefs.caffeine === false ? { allowed: false, reason: 'USER_DISABLED' } : screenCaffeine(profile, prefs.medical || {}),
      notes: globalSafetyNotes({ itinerary: it, trace }),
    },
    behavior: { sleeps: sleeps.map(s => ({ a: s.a, b: s.b, kind: s.kind })), lights: mergeLights(run.lights), jumps: run.jumps },
    meta: {
      planStart: ctx.T0, planEnd: tEnd, observationsCount: (prefs.observations || []).length,
      inputs: { profile: profileInput, itinerary: itineraryInput, preferences: { ...preferences, previousBehavior: undefined } },
      confidenceAtArrival: confidenceAt(profile, it.stay.start, ctx.T0, (prefs.observations || []).length),
    },
  };
  result.computeMs = Date.now() - t0;
  return result;
}
/**
 * Recalcule un plan après un changement (vol retardé/modifié, recommandation manquée, sommeil imprévu…).
 * Le passé (avant `now`) est rejoué tel qu'il s'est réellement déroulé (plan + observations), puis
 * l'optimiseur replanifie à partir de l'état biologique estimé à `now`.
 * @param {object} previousPlan plan retourné par generateCircadianPlan
 * @param {{now:number, observations?:Array, itinerary?:object, profile?:object, preferences?:object, events?:Array}} changes
 */
function recalculatePlan(previousPlan, changes = {}) {
  if (!previousPlan || !previousPlan.ok) throw new Error('recalculatePlan : plan précédent invalide.');
  const inp = previousPlan.meta.inputs;
  const now = Number.isFinite(changes.now) ? changes.now : Date.now();
  const itineraryInput = changes.itinerary || (changes.events ? { ...inp.itinerary, events: changes.events } : inp.itinerary);
  const observations = [...(inp.preferences.observations || []), ...(changes.observations || [])];
  const prefs = { ...inp.preferences, ...(changes.preferences || {}), now, observations, previousBehavior: previousPlan.behavior, planStart: previousPlan.meta.planStart };
  const plan = generateCircadianPlan(changes.profile || inp.profile, itineraryInput, prefs);
  if (plan.ok) plan.meta.recalculatedFrom = previousPlan.generatedAt;
  return plan;
}
for (const k of Object.keys(__req('src/constants.js'))) if (k !== 'default' && !(k in exports)) Object.defineProperty(exports, k, { enumerable: true, get: () => __req('src/constants.js')[k] });
Object.defineProperty(exports, 'parseLocal', { enumerable: true, get: () => __req('src/itinerary/tz.js')['parseLocal'] });
Object.defineProperty(exports, 'localToUtc', { enumerable: true, get: () => __req('src/itinerary/tz.js')['localToUtc'] });
Object.defineProperty(exports, 'offsetMin', { enumerable: true, get: () => __req('src/itinerary/tz.js')['offsetMin'] });
Object.defineProperty(exports, 'hhmm', { enumerable: true, get: () => __req('src/itinerary/tz.js')['hhmm'] });
Object.defineProperty(exports, 'isoLocal', { enumerable: true, get: () => __req('src/itinerary/tz.js')['isoLocal'] });
Object.defineProperty(exports, 'hoursToHHMM', { enumerable: true, get: () => __req('src/itinerary/tz.js')['hoursToHHMM'] });
Object.defineProperty(exports, 'locationAt', { enumerable: true, get: () => __req('src/itinerary/index.js')['locationAt'] });
Object.defineProperty(exports, 'timeFrames', { enumerable: true, get: () => __req('src/itinerary/index.js')['timeFrames'] });
Object.defineProperty(exports, 'classifyFlight', { enumerable: true, get: () => __req('src/itinerary/index.js')['classifyFlight'] });
Object.defineProperty(exports, 'calculateMelatoninEffect', { enumerable: true, get: () => __req('src/melatonin/index.js')['calculateMelatoninEffect'] });
Object.defineProperty(exports, 'melatoninPRC', { enumerable: true, get: () => __req('src/melatonin/index.js')['melatoninPRC'] });
Object.defineProperty(exports, 'predictAlertness', { enumerable: true, get: () => __req('src/sleep/index.js')['predictAlertness'] });
Object.defineProperty(exports, 'circadianWakeDrive', { enumerable: true, get: () => __req('src/sleep/index.js')['circadianWakeDrive'] });
Object.defineProperty(exports, 'updateSleepPressure', { enumerable: true, get: () => __req('src/sleep/index.js')['updateSleepPressure'] });
Object.defineProperty(exports, 'classifyLight', { enumerable: true, get: () => __req('src/light/index.js')['classifyLight'] });
Object.defineProperty(exports, 'lightPRCShape', { enumerable: true, get: () => __req('src/light/index.js')['lightPRCShape'] });
Object.defineProperty(exports, 'isRecommendationFeasible', { enumerable: true, get: () => __req('src/practicality/index.js')['isRecommendationFeasible'] });
Object.defineProperty(exports, 'solarElevation', { enumerable: true, get: () => __req('src/practicality/index.js')['solarElevation'] });
Object.defineProperty(exports, 'screenMelatonin', { enumerable: true, get: () => __req('src/safety/index.js')['screenMelatonin'] });
Object.defineProperty(exports, 'screenCaffeine', { enumerable: true, get: () => __req('src/safety/index.js')['screenCaffeine'] });
Object.defineProperty(exports, 'adaptationDashboard', { enumerable: true, get: () => __req('src/scoring/index.js')['adaptationDashboard'] });
Object.defineProperty(exports, 'adaptationPercentage', { enumerable: true, get: () => __req('src/scoring/index.js')['adaptationPercentage'] });
Object.defineProperty(exports, 'formatDuration', { enumerable: true, get: () => __req('src/scoring/index.js')['formatDuration'] });
Object.defineProperty(exports, 'buildCircadianProfile', { enumerable: true, get: () => buildCircadianProfile });
Object.defineProperty(exports, 'buildItinerary', { enumerable: true, get: () => buildItinerary });
Object.defineProperty(exports, 'calculateLightEffect', { enumerable: true, get: () => calculateLightEffect });
Object.defineProperty(exports, 'ENGINE_VERSION', { enumerable: true, get: () => ENGINE_VERSION });
Object.defineProperty(exports, 'applyObservations', { enumerable: true, get: () => applyObservations });
Object.defineProperty(exports, 'generateCircadianPlan', { enumerable: true, get: () => generateCircadianPlan });
Object.defineProperty(exports, 'recalculatePlan', { enumerable: true, get: () => recalculatePlan });
},
'src/constants.js': function (exports, __req) {
const MS_MIN = 60e3;
const MS_H = 3600e3;
const MS_D = 24 * MS_H;
const LIGHT_REC = Object.freeze({
  SEEK_BRIGHT_LIGHT: 'SEEK_BRIGHT_LIGHT',
  SEEK_DAYLIGHT: 'SEEK_DAYLIGHT',
  NORMAL_LIGHT: 'NORMAL_LIGHT',
  DIM_LIGHT: 'DIM_LIGHT',
  AVOID_BRIGHT_LIGHT: 'AVOID_BRIGHT_LIGHT',
  DARKNESS: 'DARKNESS',
});
const INTERVENTION = Object.freeze({
  LIGHT: 'LIGHT', LIGHT_AVOIDANCE: 'LIGHT_AVOIDANCE', SLEEP: 'SLEEP', NAP: 'NAP', WAKE: 'WAKE',
  CAFFEINE: 'CAFFEINE', CAFFEINE_CUTOFF: 'CAFFEINE_CUTOFF', MELATONIN_OPTIONAL: 'MELATONIN_OPTIONAL',
  MEAL: 'MEAL', HYDRATION: 'HYDRATION', EXERCISE: 'EXERCISE', WIND_DOWN: 'WIND_DOWN',
});
const CATEGORY_OF = Object.freeze({
  LIGHT: 'CIRCADIAN', LIGHT_AVOIDANCE: 'CIRCADIAN', MELATONIN_OPTIONAL: 'CIRCADIAN',
  SLEEP: 'SCHEDULE', WAKE: 'SCHEDULE', WIND_DOWN: 'SCHEDULE',
  CAFFEINE: 'SYMPTOMATIC', CAFFEINE_CUTOFF: 'SYMPTOMATIC', NAP: 'SYMPTOMATIC',
  MEAL: 'SYMPTOMATIC', HYDRATION: 'SYMPTOMATIC', EXERCISE: 'SYMPTOMATIC',
});
const STRATEGY = Object.freeze({
  FULL_ADAPTATION: 'FULL_ADAPTATION',
  PARTIAL_ADAPTATION: 'PARTIAL_ADAPTATION',
  HOME_TIME_MAINTENANCE: 'HOME_TIME_MAINTENANCE',
});
const MODE = Object.freeze({ ADAPT: 'ADAPT', PERFORM: 'PERFORM' });
const wrap24 = h => ((h % 24) + 24) % 24;
const wrap12 = h => { let x = wrap24(h); if (x > 12) x -= 24; return x; };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const gauss = (x, mu, s) => Math.exp(-((x - mu) ** 2) / (2 * s * s));
/** Gaussienne circulaire sur 24 h. */
const circGauss = (x, mu, s) => gauss(wrap12(x - mu), 0, s);
Object.defineProperty(exports, 'MS_MIN', { enumerable: true, get: () => MS_MIN });
Object.defineProperty(exports, 'MS_H', { enumerable: true, get: () => MS_H });
Object.defineProperty(exports, 'MS_D', { enumerable: true, get: () => MS_D });
Object.defineProperty(exports, 'LIGHT_REC', { enumerable: true, get: () => LIGHT_REC });
Object.defineProperty(exports, 'INTERVENTION', { enumerable: true, get: () => INTERVENTION });
Object.defineProperty(exports, 'CATEGORY_OF', { enumerable: true, get: () => CATEGORY_OF });
Object.defineProperty(exports, 'STRATEGY', { enumerable: true, get: () => STRATEGY });
Object.defineProperty(exports, 'MODE', { enumerable: true, get: () => MODE });
Object.defineProperty(exports, 'wrap24', { enumerable: true, get: () => wrap24 });
Object.defineProperty(exports, 'wrap12', { enumerable: true, get: () => wrap12 });
Object.defineProperty(exports, 'clamp', { enumerable: true, get: () => clamp });
Object.defineProperty(exports, 'gauss', { enumerable: true, get: () => gauss });
Object.defineProperty(exports, 'circGauss', { enumerable: true, get: () => circGauss });
},
'src/profile/index.js': function (exports, __req) {
const { wrap24, clamp } = __req('src/constants.js');
const { hoursToHHMM, isValidTz } = __req('src/itinerary/tz.js');
const PROFILE_DEFAULTS = Object.freeze({
  dlmoToMidsleepH: 6.25,
  dlmoToNadirH: 7.0,
  chronotypePhaseAngleAdjH: { morning: -0.5, intermediate: 0, evening: +0.5, unknown: 0 },
  tauByChronotype: { morning: 24.1, intermediate: 24.2, evening: 24.3, unknown: 24.2 },
});
function parseClock(s) {
  if (typeof s === 'number') return wrap24(s);
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '').trim());
  return m ? wrap24(+m[1] + +m[2] / 60) : NaN;
}
/**
 * @param {object} input
 *  usualBedtime "23:00", usualWakeTime "07:00", sleepDuration? (h), chronotype 'morning'|'intermediate'|'evening'|'unknown',
 *  age?, napHabit 'never'|'sometimes'|'often', sleepQuality 'good'|'fair'|'poor', caffeineUse 'none'|'low'|'moderate'|'high',
 *  melatoninPreference 'yes'|'no'|'ask', timezone (IANA), freeDayBedtime?, freeDayWakeTime?
 * @returns {{profile, errors:Array}}
 */
function buildCircadianProfile(input = {}) {
  const errors = [];
  const bed = parseClock(input.usualBedtime), wake = parseClock(input.usualWakeTime);
  if (!Number.isFinite(bed) || !Number.isFinite(wake)) errors.push({ code: 'SLEEP_TIMES', message: 'Indiquez vos heures habituelles de coucher et de lever.' });
  const span = Number.isFinite(bed) && Number.isFinite(wake) ? wrap24(wake - bed) : NaN;
  let sleepDuration = Number.isFinite(+input.sleepDuration) && +input.sleepDuration > 0 ? +input.sleepDuration : span;
  if (Number.isFinite(span) && (span < 4 || span > 12)) errors.push({ code: 'SLEEP_SPAN', message: 'La durée entre coucher et lever doit être comprise entre 4 et 12 heures.' });
  sleepDuration = clamp(sleepDuration || 8, 4, 12);
  const chronotype = ['morning', 'intermediate', 'evening'].includes(input.chronotype) ? input.chronotype : 'unknown';
  const age = Number.isFinite(+input.age) && +input.age > 0 ? Math.round(+input.age) : null;
  if (input.timezone && !isValidTz(input.timezone)) errors.push({ code: 'BAD_TZ', message: 'Fuseau horaire du domicile invalide.' });
  if (errors.length) return { profile: null, errors };
  let midsleep = wrap24(bed + span / 2), usedFreeDays = false;
  const fb = parseClock(input.freeDayBedtime), fw = parseClock(input.freeDayWakeTime);
  if (Number.isFinite(fb) && Number.isFinite(fw)) {
    const sdf = wrap24(fw - fb); const msf = wrap24(fb + sdf / 2);
    midsleep = wrap24(msf - Math.max(0, sdf - span) / 2); usedFreeDays = true;
  }
  const P = PROFILE_DEFAULTS;
  let dlmo = wrap24(midsleep - P.dlmoToMidsleepH + P.chronotypePhaseAngleAdjH[chronotype]);
  if (age != null && age >= 65) dlmo = wrap24(dlmo - 0.5); // phase plus précoce rapportée chez le sujet âgé (hypothèse modélisée)
  const nadir = wrap24(dlmo + P.dlmoToNadirH);
  let conf = 0.5;
  if (chronotype !== 'unknown') conf += 0.08;
  if (usedFreeDays) conf += 0.1;
  if (age != null) conf += 0.04;
  if (input.sleepQuality === 'good') conf += 0.05; else if (input.sleepQuality === 'poor') conf -= 0.08;
  if (chronotype === 'morning' && midsleep > 4.5 && midsleep < 12) conf -= 0.08;
  if (chronotype === 'evening' && (midsleep < 3 || midsleep > 20)) conf -= 0.08;
  if (Math.abs(sleepDuration - span) > 1) conf -= 0.05;
  conf = clamp(conf, 0.25, 0.8);
  const dlmoUncertaintyH = +(2.2 - 1.8 * conf).toFixed(2); // ≈ ±0,8 à ±1,7 h
  const profile = {
    usualBedtime: hoursToHHMM(bed), usualWakeTime: hoursToHHMM(wake),
    usualBedtimeH: bed, usualWakeTimeH: wake,
    sleepDuration: +sleepDuration.toFixed(2), timeInBedH: +span.toFixed(2),
    chronotype, age,
    napHabit: ['never', 'sometimes', 'often'].includes(input.napHabit) ? input.napHabit : 'sometimes',
    sleepQuality: ['good', 'fair', 'poor'].includes(input.sleepQuality) ? input.sleepQuality : 'fair',
    caffeineUse: ['none', 'low', 'moderate', 'high'].includes(input.caffeineUse) ? input.caffeineUse : 'low',
    melatoninPreference: ['yes', 'no', 'ask'].includes(input.melatoninPreference) ? input.melatoninPreference : 'no',
    timezone: input.timezone || null,
    midsleepH: +midsleep.toFixed(2),
    estimatedDLMO: { clock: hoursToHHMM(dlmo), hours: +dlmo.toFixed(2), isEstimate: true, uncertaintyH: dlmoUncertaintyH, method: usedFreeDays ? 'MSF_SC' : 'MIDSLEEP' },
    estimatedCircadianNadir: { clock: hoursToHHMM(nadir), hours: +nadir.toFixed(2), isEstimate: true, uncertaintyH: dlmoUncertaintyH },
    confidenceScore: +conf.toFixed(2),
    model: {
      tauH: P.tauByChronotype[chronotype],
      lightSensitivity: age != null && age >= 60 ? 0.85 : 1,
      shortSleeper: sleepDuration < 6.5, longSleeper: sleepDuration > 9,
    },
    disclaimer: 'DLMO et nadir circadien estimés à partir des horaires déclarés ; ce ne sont pas des mesures biologiques.',
  };
  return { profile, errors: [] };
}
Object.defineProperty(exports, 'PROFILE_DEFAULTS', { enumerable: true, get: () => PROFILE_DEFAULTS });
Object.defineProperty(exports, 'parseClock', { enumerable: true, get: () => parseClock });
Object.defineProperty(exports, 'buildCircadianProfile', { enumerable: true, get: () => buildCircadianProfile });
},
'src/itinerary/tz.js': function (exports, __req) {
const { MS_MIN, MS_H } = __req('src/constants.js');
const tzCache = new Map();
function tzFmt(tz) {
  let f = tzCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    tzCache.set(tz, f);
  }
  return f;
}
function isValidTz(tz) { try { tzFmt(tz); return true; } catch { return false; } }
function rawParts(ms, tz) {
  const o = {};
  for (const p of tzFmt(tz).formatToParts(new Date(ms))) o[p.type] = p.value;
  return { y: +o.year, mo: +o.month, d: +o.day, h: (+o.hour) % 24, mi: +o.minute, s: +o.second };
}
const offCache = new Map();
const Q = 15 * MS_MIN;
/** Décalage UTC (minutes) du fuseau `tz` à l'instant `ms`. Gère le DST. */
function offsetMin(tz, ms) {
  const bucket = Math.floor(ms / Q);
  const key = tz + '|' + bucket;
  let v = offCache.get(key);
  if (v === undefined) {
    const t = bucket * Q;
    const p = rawParts(t, tz);
    v = Math.round((Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - t) / MS_MIN);
    if (offCache.size > 200000) offCache.clear();
    offCache.set(key, v);
  }
  return v;
}
function localParts(ms, tz) {
  const d = new Date(ms + offsetMin(tz, ms) * MS_MIN);
  return { y: d.getUTCFullYear(), mo: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes(), s: d.getUTCSeconds() };
}
/**
 * Heure locale -> UTC.
 * Heure inexistante (saut vers l'heure d'été) : projetée après le saut, flag `gap`.
 * Heure ambiguë (retour à l'heure d'hiver) : première occurrence, flag `ambiguous`.
 */
function localToUtc(y, mo, d, h, mi, tz) {
  const nd = new Date(Date.UTC(y, mo - 1, d)); y = nd.getUTCFullYear(); mo = nd.getUTCMonth() + 1; d = nd.getUTCDate();
  const g = Date.UTC(y, mo - 1, d, h, mi);
  const o1 = offsetMin(tz, g - 14 * MS_H), o2 = offsetMin(tz, g + 14 * MS_H);
  const c1 = g - o1 * MS_MIN, c2 = g - o2 * MS_MIN;
  const ok = c => { const p = localParts(c, tz); return p.y === y && p.mo === mo && p.d === d && p.h === h && p.mi === mi; };
  const v1 = ok(c1), v2 = ok(c2);
  if (v1 && v2 && c1 !== c2) return { utc: Math.min(c1, c2), ambiguous: true, gap: false };
  if (v1) return { utc: c1, ambiguous: false, gap: false };
  if (v2) return { utc: c2, ambiguous: false, gap: false };
  return { utc: Math.max(c1, c2), ambiguous: false, gap: true };
}
/** "2026-10-12T19:30" (heure locale de `tz`) -> {utc, gap, ambiguous} | null */
function parseLocal(str, tz) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(String(str || ''));
  if (!m) return null;
  return localToUtc(+m[1], +m[2], +m[3], +m[4], +m[5], tz);
}
const pad2 = n => String(n).padStart(2, '0');
function hhmm(ms, tz) { const p = localParts(ms, tz); return `${pad2(p.h)}:${pad2(p.mi)}`; }
function isoLocal(ms, tz) { const p = localParts(ms, tz); return `${p.y}-${pad2(p.mo)}-${pad2(p.d)}T${pad2(p.h)}:${pad2(p.mi)}`; }
function localClockHours(ms, tz) { const p = localParts(ms, tz); return p.h + p.mi / 60 + p.s / 3600; }
function hoursToHHMM(h) {
  const x = ((h % 24) + 24) % 24; let H = Math.floor(x), M = Math.round((x - H) * 60);
  if (M === 60) { H = (H + 1) % 24; M = 0; }
  return `${pad2(H)}:${pad2(M)}`;
}
function utcIso(ms) { return new Date(ms).toISOString(); }
/** Prochain instant (>= ms) où l'horloge locale de tz indique hh:mm. */
function nextLocalClock(ms, tz, hours) {
  const p = localParts(ms, tz);
  const H = Math.floor(hours), Mi = Math.round((hours - H) * 60);
  for (let k = 0; k < 3; k++) {
    const c = localToUtc(p.y, p.mo, p.d + k, H, Mi, tz).utc;
    if (c >= ms) return c;
  }
  return ms;
}
Object.defineProperty(exports, 'isValidTz', { enumerable: true, get: () => isValidTz });
Object.defineProperty(exports, 'offsetMin', { enumerable: true, get: () => offsetMin });
Object.defineProperty(exports, 'localParts', { enumerable: true, get: () => localParts });
Object.defineProperty(exports, 'localToUtc', { enumerable: true, get: () => localToUtc });
Object.defineProperty(exports, 'parseLocal', { enumerable: true, get: () => parseLocal });
Object.defineProperty(exports, 'hhmm', { enumerable: true, get: () => hhmm });
Object.defineProperty(exports, 'isoLocal', { enumerable: true, get: () => isoLocal });
Object.defineProperty(exports, 'localClockHours', { enumerable: true, get: () => localClockHours });
Object.defineProperty(exports, 'hoursToHHMM', { enumerable: true, get: () => hoursToHHMM });
Object.defineProperty(exports, 'utcIso', { enumerable: true, get: () => utcIso });
Object.defineProperty(exports, 'nextLocalClock', { enumerable: true, get: () => nextLocalClock });
},
'src/itinerary/index.js': function (exports, __req) {
const { MS_H, MS_MIN, MS_D, wrap12 } = __req('src/constants.js');
const { parseLocal, offsetMin, isValidTz, isoLocal, utcIso, localParts } = __req('src/itinerary/tz.js');
const { AIRPORT_COORDS } = __req('src/itinerary/airports.js');
const MAX_FLIGHT_H = 22;
function normPlace(p) {
  if (!p) return null;
  const code = p.code ? String(p.code).toUpperCase() : null;
  const c = code && AIRPORT_COORDS[code];
  return { code, tz: p.tz, city: p.city || code || p.tz, lat: p.lat ?? (c ? c[0] : null), lon: p.lon ?? (c ? c[1] : null) };
}
function toUtcField(v, tz, errs, label) {
  if (typeof v === 'number') return { utc: v, gap: false, ambiguous: false };
  const r = parseLocal(v, tz);
  if (!r) errs.push({ code: 'BAD_DATETIME', message: `${label} : date/heure invalide.` });
  return r;
}
/** Vrai si l'arc (grand cercle simplifié en longitude) traverse l'antiméridien. */
function crossesDateLine(lon1, lon2) {
  if (lon1 == null || lon2 == null) return false;
  return Math.abs(lon1 - lon2) > 180;
}
/** Position approximative sur le grand cercle entre deux points, fraction f ∈ [0,1]. */
function greatCirclePoint(lat1, lon1, lat2, lon2, f) {
  const r = Math.PI / 180;
  const φ1 = lat1 * r, λ1 = lon1 * r, φ2 = lat2 * r, λ2 = lon2 * r;
  const d = 2 * Math.asin(Math.sqrt(Math.sin((φ2 - φ1) / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2));
  if (d < 1e-9) return { lat: lat1, lon: lon1 };
  const A = Math.sin((1 - f) * d) / Math.sin(d), B = Math.sin(f * d) / Math.sin(d);
  const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
  const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
  const z = A * Math.sin(φ1) + B * Math.sin(φ2);
  return { lat: Math.atan2(z, Math.hypot(x, y)) / r, lon: Math.atan2(y, x) / r };
}
/**
 * Construit l'itinéraire normalisé.
 * @param {object} input { homeTz?, outbound:[leg], return?:[leg], events?:[{label, local, tz, durationMin, importance}] }
 *   leg = { from:{code,tz,city,lat,lon}, to:{...}, departure:"YYYY-MM-DDTHH:mm" (heure locale départ) | ms UTC,
 *           arrival:"YYYY-MM-DDTHH:mm" (heure locale arrivée) | ms UTC, flightNumber? }
 */
function buildItinerary(input) {
  const errors = [], warnings = [];
  const groups = [['OUTBOUND', input.outbound || input.legs || []], ['RETURN', input.return || []]];
  const legs = [];
  for (const [group, list] of groups) {
    list.forEach((raw, i) => {
      const from = normPlace(raw.from), to = normPlace(raw.to);
      const label = `${group === 'OUTBOUND' ? 'Aller' : 'Retour'} ${i + 1}`;
      if (!from || !to || !isValidTz(from.tz) || !isValidTz(to.tz)) { errors.push({ code: 'BAD_TZ', message: `${label} : fuseau horaire IANA invalide.` }); return; }
      const dep = toUtcField(raw.departure, from.tz, errors, label), arr = toUtcField(raw.arrival, to.tz, errors, label);
      if (!dep || !arr) return;
      if (dep.gap || arr.gap) warnings.push({ code: 'DST_GAP', message: `${label} : une heure saisie n'existe pas (passage à l'heure d'été) ; elle a été décalée.` });
      if (dep.ambiguous || arr.ambiguous) warnings.push({ code: 'DST_AMBIGUOUS', message: `${label} : heure ambiguë (retour à l'heure d'hiver) ; la première occurrence a été retenue.` });
      const durationH = (arr.utc - dep.utc) / MS_H;
      if (durationH <= 0) { errors.push({ code: 'ARRIVAL_BEFORE_DEPARTURE', message: `${label} : l'arrivée tombe avant le départ une fois les fuseaux pris en compte.` }); return; }
      if (durationH > MAX_FLIGHT_H) { errors.push({ code: 'FLIGHT_TOO_LONG', message: `${label} : plus de ${MAX_FLIGHT_H} h de vol, vérifiez les dates.` }); return; }
      const depL = localParts(dep.utc, from.tz), arrL = localParts(arr.utc, to.tz);
      const localDateChangeDays = Math.round((Date.UTC(arrL.y, arrL.mo - 1, arrL.d) - Date.UTC(depL.y, depL.mo - 1, depL.d)) / MS_D);
      legs.push({
        id: `${group[0]}${i + 1}`, group, index: i, flightNumber: raw.flightNumber || null,
        from, to, depUtc: dep.utc, arrUtc: arr.utc, durationH,
        tzShiftHours: (offsetMin(to.tz, arr.utc) - offsetMin(from.tz, dep.utc)) / 60,
        crossesDateLine: crossesDateLine(from.lon, to.lon), localDateChangeDays,
      });
    });
  }
  if (errors.length) return { ok: false, errors, warnings };
  if (!legs.length) return { ok: false, errors: [{ code: 'NO_FLIGHT', message: 'Aucun vol.' }], warnings };
  legs.sort((a, b) => a.depUtc - b.depUtc);
  for (let i = 1; i < legs.length; i++) {
    if (legs[i].depUtc < legs[i - 1].arrUtc) errors.push({ code: 'OVERLAP', message: `Le vol ${legs[i].id} part avant l'arrivée du vol précédent.` });
    else if (legs[i].from.tz !== legs[i - 1].to.tz && legs[i].from.code !== legs[i - 1].to.code) warnings.push({ code: 'DISCONTINUITY', message: `Le vol ${legs[i].id} ne part pas de l'aéroport d'arrivée du vol précédent.` });
  }
  if (errors.length) return { ok: false, errors, warnings };
  const out = legs.filter(l => l.group === 'OUTBOUND'), ret = legs.filter(l => l.group === 'RETURN');
  const homeTz = input.homeTz && isValidTz(input.homeTz) ? input.homeTz : legs[0].from.tz;
  const home = legs[0].from;
  const dest = out[out.length - 1].to;
  const final = ret.length ? ret[ret.length - 1].to : dest;
  const layovers = [];
  for (const g of [out, ret]) for (let i = 1; i < g.length; i++) {
    layovers.push({ place: g[i - 1].to, tz: g[i - 1].to.tz, start: g[i - 1].arrUtc, end: g[i].depUtc, durationH: (g[i].depUtc - g[i - 1].arrUtc) / MS_H, group: g[i].group });
  }
  const stay = ret.length ? { place: dest, tz: dest.tz, start: out[out.length - 1].arrUtc, end: ret[0].depUtc, durationH: (ret[0].depUtc - out[out.length - 1].arrUtc) / MS_H } : { place: dest, tz: dest.tz, start: out[out.length - 1].arrUtc, end: Infinity, durationH: Infinity };
  if (stay.durationH < 0) return { ok: false, errors: [{ code: 'NEGATIVE_STAY', message: 'Le retour part avant l’arrivée à destination.' }], warnings };
  const firstDep = legs[0].depUtc, lastArr = legs[legs.length - 1].arrUtc;
  const shiftOutHours = wrap12((offsetMin(dest.tz, stay.start) - offsetMin(homeTz, firstDep)) / 60);
  const shiftBackHours = ret.length ? wrap12((offsetMin(final.tz, lastArr) - offsetMin(dest.tz, ret[0].depUtc)) / 60) : 0;
  const events = (input.events || []).map((e, i) => {
    const tz = e.tz || dest.tz; const r = typeof e.local === 'number' ? { utc: e.local } : parseLocal(e.local, tz);
    if (!r) { warnings.push({ code: 'BAD_EVENT', message: `Événement « ${e.label || i + 1} » : date invalide, ignoré.` }); return null; }
    return { id: e.id || `EV${i + 1}`, label: e.label || 'Événement', tz, start: r.utc, end: r.utc + (e.durationMin ?? 120) * MS_MIN, importance: e.importance || 'critical' };
  }).filter(Boolean);
  const it = {
    ok: true, errors, warnings, homeTz, home, dest, destTz: dest.tz, final, finalTz: final.tz,
    legs, outbound: out, returnLegs: ret, layovers, stay, events,
    isRoundTrip: ret.length > 0, firstDep, lastArr, shiftOutHours, shiftBackHours,
    crossesDateLine: legs.some(l => l.crossesDateLine),
  };
  it.locationAt = t => locationAt(it, t);
  return it;
}
/** Où est le voyageur à l'instant t ? {tz, place, inFlight, leg, layover, lat, lon, phase} */
function locationAt(it, t) {
  if (t < it.firstDep) return { tz: it.homeTz, place: it.home, inFlight: false, phase: 'PRE', lat: it.home.lat, lon: it.home.lon };
  let cur = { tz: it.homeTz, place: it.home, phase: 'PRE' };
  for (const l of it.legs) {
    if (t >= l.depUtc && t < l.arrUtc) {
      const f = (t - l.depUtc) / (l.arrUtc - l.depUtc);
      const pos = l.from.lat != null && l.to.lat != null ? greatCirclePoint(l.from.lat, l.from.lon, l.to.lat, l.to.lon, f) : { lat: null, lon: null };
      return { tz: l.to.tz, place: null, inFlight: true, leg: l, lat: pos.lat, lon: pos.lon, phase: 'FLIGHT' };
    }
    if (t >= l.arrUtc) cur = { tz: l.to.tz, place: l.to, lat: l.to.lat, lon: l.to.lon, phase: l.group === 'RETURN' ? 'RETURN' : 'STAY' };
  }
  const lay = it.layovers.find(x => t >= x.start && t < x.end);
  if (lay) return { ...cur, inFlight: false, layover: lay, phase: 'LAYOVER' };
  if (it.isRoundTrip && t >= it.lastArr) cur.phase = 'POST';
  return { ...cur, inFlight: false };
}
/** Représentation d'un instant dans les 4 référentiels demandés (le 4ᵉ — heure biologique — est ajouté par le moteur). */
function timeFrames(it, t) {
  const loc = locationAt(it, t);
  return {
    utc: utcIso(t), local: isoLocal(t, loc.tz), localTz: loc.tz,
    home: isoLocal(t, it.homeTz), homeTz: it.homeTz,
    destination: isoLocal(t, it.destTz), destinationTz: it.destTz,
  };
}
/** Classement vol de nuit / vol de jour selon le chevauchement avec la nuit habituelle (heure du domicile) ou la nuit locale de départ. */
function classifyFlight(leg, homeTz, bedH = 23, wakeH = 7) {
  let nightH = 0;
  for (let t = leg.depUtc; t < leg.arrUtc; t += 15 * MS_MIN) {
    const p = localParts(t, leg.from.tz); const h = p.h + p.mi / 60;
    const inNight = bedH > wakeH ? (h >= bedH || h < wakeH) : (h >= bedH && h < wakeH);
    if (inNight) nightH += 0.25;
  }
  return nightH >= Math.min(3, leg.durationH / 2) ? 'NIGHT' : 'DAY';
}
for (const k of Object.keys(__req('src/itinerary/tz.js'))) if (k !== 'default' && !(k in exports)) Object.defineProperty(exports, k, { enumerable: true, get: () => __req('src/itinerary/tz.js')[k] });
Object.defineProperty(exports, 'AIRPORT_COORDS', { enumerable: true, get: () => AIRPORT_COORDS });
Object.defineProperty(exports, 'crossesDateLine', { enumerable: true, get: () => crossesDateLine });
Object.defineProperty(exports, 'greatCirclePoint', { enumerable: true, get: () => greatCirclePoint });
Object.defineProperty(exports, 'buildItinerary', { enumerable: true, get: () => buildItinerary });
Object.defineProperty(exports, 'locationAt', { enumerable: true, get: () => locationAt });
Object.defineProperty(exports, 'timeFrames', { enumerable: true, get: () => timeFrames });
Object.defineProperty(exports, 'classifyFlight', { enumerable: true, get: () => classifyFlight });
},
'src/itinerary/airports.js': function (exports, __req) {
const AIRPORT_COORDS = {
  CDG: [49.01, 2.55], ORY: [48.72, 2.38], BVA: [49.45, 2.11], LYS: [45.73, 5.08], NCE: [43.66, 7.21], MRS: [43.44, 5.22],
  TLS: [43.63, 1.37], BOD: [44.83, -0.72], NTE: [47.15, -1.61], MPL: [43.58, 3.96], BSL: [47.59, 7.53], SXB: [48.54, 7.63],
  LIL: [50.56, 3.09], AJA: [41.92, 8.80], RUN: [-20.89, 55.51], FDF: [14.59, -61.00], PTP: [16.27, -61.53], CAY: [4.82, -52.36],
  PPT: [-17.55, -149.61], NOU: [-22.01, 166.21], DZA: [-12.80, 45.28], LHR: [51.47, -0.45], LGW: [51.15, -0.19], DUB: [53.42, -6.27],
  AMS: [52.31, 4.76], BRU: [50.90, 4.48], GVA: [46.24, 6.11], ZRH: [47.46, 8.55], FRA: [50.04, 8.56], MUC: [48.35, 11.79],
  BER: [52.36, 13.50], VIE: [48.11, 16.57], CPH: [55.62, 12.65], OSL: [60.19, 11.10], ARN: [59.65, 17.93], HEL: [60.32, 24.96],
  MAD: [40.49, -3.57], BCN: [41.30, 2.08], LIS: [38.77, -9.13], FCO: [41.80, 12.25], MXP: [45.63, 8.72], ATH: [37.94, 23.94],
  IST: [41.26, 28.74], WAW: [52.17, 20.97], PRG: [50.10, 14.26], BUD: [47.44, 19.26], KEF: [63.99, -22.62], TLV: [32.01, 34.89],
  CAI: [30.12, 31.41], CMN: [33.37, -7.59], RAK: [31.61, -8.04], ALG: [36.69, 3.22], TUN: [36.85, 10.23], DSS: [14.67, -17.07],
  ABJ: [5.26, -3.93], LOS: [6.58, 3.32], NBO: [-1.32, 36.93], ADD: [8.98, 38.80], JNB: [-26.14, 28.24], CPT: [-33.97, 18.60],
  MRU: [-20.43, 57.68], SEZ: [-4.67, 55.52], TNR: [-18.80, 47.48], DXB: [25.25, 55.36], AUH: [24.43, 54.65], DOH: [25.27, 51.61],
  RUH: [24.96, 46.70], JED: [21.68, 39.16], MCT: [23.59, 58.28], DEL: [28.56, 77.10], BOM: [19.09, 72.87], MLE: [4.19, 73.53],
  CMB: [7.18, 79.88], BKK: [13.69, 100.75], SGN: [10.82, 106.65], SIN: [1.36, 103.99], KUL: [2.75, 101.71], CGK: [-6.13, 106.66],
  DPS: [-8.75, 115.17], HKG: [22.31, 113.92], PEK: [40.08, 116.60], PVG: [31.14, 121.81], TPE: [25.08, 121.23], ICN: [37.46, 126.44],
  HND: [35.55, 139.78], NRT: [35.77, 140.39], KIX: [34.43, 135.24], MNL: [14.51, 121.02], SYD: [-33.95, 151.18], MEL: [-37.67, 144.84],
  BNE: [-27.38, 153.12], PER: [-31.94, 115.97], AKL: [-37.01, 174.79], JFK: [40.64, -73.78], EWR: [40.69, -74.17], BOS: [42.37, -71.01],
  IAD: [38.95, -77.46], MIA: [25.80, -80.29], ATL: [33.64, -84.43], ORD: [41.98, -87.90], DFW: [32.90, -97.04], IAH: [29.99, -95.34],
  DEN: [39.86, -104.67], PHX: [33.43, -112.01], LAS: [36.08, -115.15], LAX: [33.94, -118.41], SFO: [37.62, -122.38], SEA: [47.45, -122.31],
  HNL: [21.32, -157.92], YUL: [45.47, -73.74], YYZ: [43.68, -79.63], YVR: [49.19, -123.18], MEX: [19.44, -99.07], CUN: [21.04, -86.87],
  PUJ: [18.57, -68.36], HAV: [22.99, -82.41], BOG: [4.70, -74.15], LIM: [-12.02, -77.11], GRU: [-23.43, -46.47], GIG: [-22.81, -43.25],
  EZE: [-34.82, -58.54], SCL: [-33.39, -70.79],
};
Object.defineProperty(exports, 'AIRPORT_COORDS', { enumerable: true, get: () => AIRPORT_COORDS });
},
'src/optimizer/index.js': function (exports, __req) {
const { MS_H, MS_MIN, MS_D, LIGHT_REC, INTERVENTION, STRATEGY, MODE, wrap12, wrap24, clamp } = __req('src/constants.js');
const { offsetMin, localClockHours } = __req('src/itinerary/tz.js');
const { locationAt } = __req('src/itinerary/index.js');
const { modelParams, createInitialState, simulate, cloneState, biologicalTime, bodyOffset, snapshot, SIM_DT_H } = __req('src/circadian/index.js');
const { classifyLight, luxFor, directionFromResidual } = __req('src/light/index.js');
const { calculateMelatoninEffect, bestMelatoninTiming } = __req('src/melatonin/index.js');
const { blockedIntervals, subtractIntervals, isDaylight, PRACTICALITY_DEFAULTS } = __req('src/practicality/index.js');
const { screenMelatonin } = __req('src/safety/index.js');
const OPTIMIZER_DEFAULTS = Object.freeze({
  sleepShiftCandidatesH: [-2.5, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5],
  lightModes: ['ADVANCE', 'DELAY', 'HOLD'],
  preShiftRateH: 1, preShiftMaxH: 3,
  shortTripThresholdH: 96, shortTripMinShiftH: 3,
  antidromicMinShiftH: 8,
  minWakeH: 10, maxWakeH: 22,
  weights: { residual: 1.0, residualSq: 0.12, align: 0.5, social: 0.6, wake: 0.15, lost: 0.9, event: 0.02, eventWake: 0.4 },
  alignToleranceH: 1.5,
  settleResidualH: 0.35,
  maxDaysAfterLastArrival: 14,
  eventLookaheadH: 22,
  eventWakeSlackH: 2, // éveil prolongé toléré (h) pour tenir jusqu'à la fin d'un événement
  holdThresholdH: 0.5,
  melatoninMaxDaysAfterArrival: 5,
});
const DT_MS = SIM_DT_H * MS_H;
function buildEnv(it, T0, T1, ctx) {
  const n = Math.ceil((T1 - T0) / DT_MS) + 2;
  const env = { T0, n, inFlight: new Uint8Array(n), sunUp: new Uint8Array(n), windowDay: new Uint8Array(n), layover: new Uint8Array(n), event: new Uint8Array(n), tz: new Array(n) };
  for (let i = 0; i < n; i++) {
    const t = T0 + i * DT_MS, loc = locationAt(it, t);
    env.tz[i] = loc.tz; env.inFlight[i] = loc.inFlight ? 1 : 0; env.layover[i] = loc.layover ? 1 : 0;
    const day = isDaylight(loc.lat, loc.lon, t, localClockHours(t, loc.tz));
    env.sunUp[i] = day ? 1 : 0; env.windowDay[i] = loc.inFlight && day ? 1 : 0;
    if ((it.events || []).some(e => t >= e.start && t < e.end)) env.event[i] = 1;
  }
  env.idx = t => clamp(Math.floor((t - T0) / DT_MS), 0, n - 1);
  env.hasLightBox = !!ctx.hasLightBox;
  return env;
}
function envLux(env, rec, i) {
  const inFlight = env.inFlight[i] === 1, sunUp = env.sunUp[i] === 1;
  let lux = luxFor(rec, { inFlight, sunUp, windowDaylight: env.windowDay[i] === 1 });
  if (!inFlight && rec === LIGHT_REC.SEEK_BRIGHT_LIGHT && !sunUp && !env.hasLightBox) lux = 500; // pièce très éclairée
  if (env.layover[i] === 1) lux = Math.min(lux, 1000);
  return lux;
}
function defaultLux(env, t) { return envLux(env, LIGHT_REC.NORMAL_LIGHT, env.idx(t)); }
function intervalIndex(list) {
  const arr = [...list].sort((x, y) => x.a - y.a);
  let k = 0;
  return t => {
    if (!arr.length) return null;
    if (k >= arr.length || arr[k].a > t) {
      let lo = 0, hi = arr.length - 1, r = -1;
      while (lo <= hi) { const m = (lo + hi) >> 1; if (arr[m].a <= t) { r = m; lo = m + 1; } else hi = m - 1; }
      k = Math.max(0, r);
    }
    while (k + 1 < arr.length && arr[k + 1].a <= t) k++;
    for (let j = k; j >= Math.max(0, k - 3); j--) if (t >= arr[j].a && t < arr[j].b) return arr[j];
    return null;
  };
}
function makeBehavior(env, sleeps, lights, jumps = []) {
  const sl = intervalIndex(sleeps), li = intervalIndex(lights);
  return {
    asleepAt: t => sl(t) !== null,
    luxAt: t => { const l = li(t); return l ? l.lux : defaultLux(env, t); },
    phaseJumps: jumps,
  };
}
function makeTarget(it, strategy, { preDays = 0, direction = 0, preRateH = 1, preMaxH = 3 } = {}) {
  const homeOff = t => offsetMin(it.homeTz, t) / 60;
  const home0 = homeOff(it.firstDep);
  const arr = it.stay.start;
  const destOffAtArr = offsetMin(it.destTz, arr) / 60;
  let D = wrap12(destOffAtArr - home0);
  if (direction !== 0 && Math.sign(direction) !== Math.sign(D) && Math.abs(D) > 0.5) D = D - Math.sign(D) * 24; // sens antidromique
  const stayShift = strategy === STRATEGY.FULL_ADAPTATION ? D : strategy === STRATEGY.PARTIAL_ADAPTATION ? D / 2 : 0;
  const destDst = t => strategy === STRATEGY.HOME_TIME_MAINTENANCE ? homeOff(t) - home0 : offsetMin(it.destTz, t) / 60 - destOffAtArr;
  const retDep = it.isRoundTrip ? it.returnLegs[0].depUtc : Infinity;
  const target = {
    D, stayShift, returnK: null,
    stayAt: t => home0 + stayShift + destDst(t),
    at(t) {
      if (t >= retDep) {
        const fo = offsetMin(it.finalTz, t) / 60;
        const k = this.returnK ?? Math.round((this.stayAt(retDep) - fo) / 24);
        return fo + 24 * k;
      }
      if (t < it.firstDep) {
        const startPre = it.firstDep - preDays * MS_D;
        if (preDays <= 0 || t < startPre || strategy === STRATEGY.HOME_TIME_MAINTENANCE) return homeOff(t);
        const days = (t - startPre) / MS_D;
        return homeOff(t) + Math.sign(stayShift) * Math.min(Math.abs(stayShift), preRateH * days, preMaxH, preDays * preRateH);
      }
      return this.stayAt(t);
    },
    onReturnDeparture(bo) { if (it.isRoundTrip) this.returnK = Math.round((bo - offsetMin(it.finalTz, retDep) / 60) / 24); },
  };
  return target;
}
function perStepLights(env, fromT, toT, bt0, t0, direction, sleepStart) {
  const out = [];
  for (let t = fromT; t < toT; t += DT_MS) {
    const i = env.idx(t);
    const bt = wrap24(bt0 + (t - t0) / MS_H);
    if (env.event[i] === 1) { out.push({ a: t, b: t + DT_MS, rec: LIGHT_REC.NORMAL_LIGHT, lux: 500, inFlight: false, event: true }); continue; }
    const rec = classifyLight(bt, direction, { awake: true, hoursToSleep: (sleepStart - t) / MS_H });
    out.push({ a: t, b: t + DT_MS, rec, lux: envLux(env, rec, i), inFlight: env.inFlight[i] === 1 });
  }
  return out;
}
function sleepPieces(a, b, blocked, minChunkH) {
  return subtractIntervals(a, b, blocked).filter(p => p.b - p.a >= minChunkH * MS_H);
}
function initialState(ctx) {
  if (!ctx._init) ctx._init = createInitialState(ctx.profile, ctx.it.homeTz, ctx.T0, ctx.mp);
  return cloneState(ctx._init);
}
/**
 * Exécute une planification complète pour une stratégie et un sens donnés.
 * @returns {{sleeps, lights, jumps, cycles, cost, state, T0, T1}}
 */
function runPlanner(ctx, strategy, direction) {
  const { profile, it, prefs, mp, env, O } = ctx;
  const target = makeTarget(it, strategy, { preDays: prefs.preDays, direction, preRateH: O.preShiftRateH, preMaxH: O.preShiftMaxH });
  const blocked = blockedIntervals(it, { blockedWindows: prefs.blockedWindows }, PRACTICALITY_DEFAULTS);
  const W = O.weights;
  const optMidBio = wrap12(profile.midsleepH - profile.estimatedCircadianNadir.hours);
  const Ds = profile.timeInBedH;
  const events = it.events || [];
  const melScreen = ctx.melatoninScreen;
  const retDep = it.isRoundTrip ? it.returnLegs[0].depUtc : Infinity;
  const eventBlocks = blocked.filter(b => b.why === 'EVENT');
  const sleeps = [...(ctx.history ? ctx.history.sleeps : [])];
  const lights = [...(ctx.history ? ctx.history.lights : [])];
  const jumps = [...(ctx.history ? ctx.history.jumps : [])];
  const melDecisions = [];
  const cycles = [];
  const state = initialState(ctx);
  let prevSleepStart = ctx.T0 - wrap24(localClockHours(ctx.T0, it.homeTz) - profile.usualBedtimeH) * MS_H;
  if (!ctx.history) sleeps.push({ a: prevSleepStart, b: ctx.T0, kind: 'SLEEP', planned: false });
  let tw = ctx.T0;
  let awakeSince = ctx.T0;
  if (ctx.history && ctx.now > ctx.T0) {
    simulate(state, ctx.now, makeBehavior(env, sleeps, lights, jumps), mp);
    tw = ctx.now;
    const lastSleep = [...sleeps].filter(s => s.kind === 'SLEEP' && s.a < ctx.now).sort((x, y) => y.a - x.a)[0];
    if (lastSleep) { prevSleepStart = lastSleep.a; awakeSince = Math.min(lastSleep.b, ctx.now); } else awakeSince = ctx.now;
    if (state.t >= retDep) target.onReturnDeparture(bodyOffset(state));
  }
  let returnHooked = state.t >= retDep, settled = 0, totalCost = 0;
  const hardEnd = ctx.T1;
  for (let guard = 0; guard < 40 && tw < hardEnd; guard++) {
    const bt0 = biologicalTime(state, mp.osc);
    const baseStart = prevSleepStart + 24 * MS_H;
    const cands = new Set(O.sleepShiftCandidatesH.map(s => baseStart + s * MS_H));
    const bedTarget = t => { const clk = wrap24(t / MS_H + target.at(t)); return t + wrap12(profile.usualBedtimeH - clk) * MS_H; };
    cands.add(bedTarget(baseStart));
    for (const b of eventBlocks) if (b.b > tw && b.b - tw < 24 * MS_H) { cands.add(b.b + 0.5 * MS_H); cands.add(b.b + 1 * MS_H); }
    const bodyBed = baseStart + wrap12((optMidBio - Ds / 2) - wrap24(bt0 + (baseStart - tw) / MS_H)) * MS_H; cands.add(bodyBed);
    const r0 = target.at(tw) - bodyOffset(state);
    const lightModes = r0 > 1.5 ? ['ADVANCE', 'HOLD'] : r0 < -1.5 ? ['DELAY', 'HOLD'] : O.lightModes;
    let best = null;
    const evalOne = (ss, lm, allowLong) => {
      if (ss < tw + 0.25 * MS_H) return null; // pas de sommeil dans le passé
      const wakeH = (ss - awakeSince) / MS_H;
      if (wakeH < 1) return null;
      if (!allowLong && (wakeH < O.minWakeH || wakeH > O.maxWakeH)) return null;
      if (eventBlocks.some(b => ss < b.b && ss + Ds * MS_H > b.a)) return null;
      const pieces = sleepPieces(ss, ss + Ds * MS_H, blocked, PRACTICALITY_DEFAULTS.minSleepChunkH);
      if (!pieces.length) return null;
      const firstA = pieces[0].a, lastB = pieces[pieces.length - 1].b;
      if (!allowLong) for (const b of eventBlocks) {
        if (b.a > lastB && b.a < lastB + O.maxWakeH * MS_H && (b.b + 0.5 * MS_H - lastB) > (O.maxWakeH + O.eventWakeSlackH) * MS_H) return null;
      }
      const lt = perStepLights(env, tw, firstA, bt0, tw, lm, firstA);
      const s = cloneState(state);
      const beh = makeBehavior(env, pieces, lt, jumps);
      const tEval = lastB + 2 * MS_H;
      let tSim = tEval;
      for (const ev of events) { const m = (ev.start + ev.end) / 2; if (m > lastB && m < lastB + O.eventLookaheadH * MS_H) tSim = Math.max(tSim, m + DT_MS); }
      let evCost = 0; const evSeen = new Set();
      let midBio = null, rEval = null; const mid = (firstA + lastB) / 2;
      simulate(s, tSim, beh, mp, st => {
        if (midBio == null && st.t >= mid) midBio = biologicalTime(st, mp.osc);
        if (rEval == null && st.t >= tEval) rEval = target.at(tEval) - bodyOffset(st);
        if (events.length) for (const ev of events) {
          if (!evSeen.has(ev.id) && st.t >= (ev.start + ev.end) / 2 && st.t - DT_MS < (ev.start + ev.end) / 2) {
            evSeen.add(ev.id);
            const sn = snapshot(st, mp, null, null);
            const a = sn.predictedAlertness ?? 0;
            evCost += W.event * Math.max(0, 85 - a) ** 2;
            if (st.asleep) evCost += 50;
          }
        }
      });
      if (midBio == null) midBio = wrap24(bt0 + (mid - tw) / MS_H);
      const r = rEval ?? target.at(tEval) - bodyOffset(s);
      const slept = pieces.reduce((x, p) => x + (p.b - p.a), 0) / MS_H;
      const alignDev = Math.max(0, Math.abs(wrap12(midBio - optMidBio)) - O.alignToleranceH);
      const socialDev = Math.abs(wrap12(wrap24(mid / MS_H + target.at(mid)) - profile.midsleepH));
      const socialW = prefs.mode === MODE.PERFORM ? W.social * 0.5 : W.social;
      const wakePen = Math.max(0, wakeH - 18) ** 2 + 0.5 * Math.max(0, 12 - wakeH) ** 2;
      const cost = W.residual * Math.abs(r) + W.residualSq * r * r + W.align * alignDev ** 2 + socialW * socialDev ** 2
        + W.wake * wakePen + W.lost * Math.max(0, Ds - slept) + evCost;
      return { ss, lm, pieces, lt, cost, r, s, midBio };
    };
    for (const ss of cands) for (const lm of lightModes) {
      const c = evalOne(ss, lm, false);
      if (c && (!best || c.cost < best.cost)) best = c;
    }
    if (!best) for (const b of eventBlocks) if (b.b > tw && b.b - tw < 30 * MS_H) for (const lm of lightModes) {
      const c = evalOne(b.b + 0.5 * MS_H, lm, true); if (c && (!best || c.cost < best.cost)) best = c;
    }
    if (!best) for (let h = O.minWakeH; h <= 30 && !best; h += 1) for (const lm of lightModes) {
      const c = evalOne(tw + h * MS_H, lm, true); if (c && (!best || c.cost < best.cost)) best = c;
    }
    if (!best) break;
    let jump = null;
    if (melScreen && melScreen.allowed && best.lm === 'ADVANCE' && Math.abs(best.r) > 1) {
      const firstA = best.pieces[0].a;
      const daysAfterArr = (firstA - it.stay.start) / MS_D;
      const inWindow = firstA < it.firstDep ? prefs.preDays > 0 && firstA > it.firstDep - prefs.preDays * MS_D : daysAfterArr <= O.melatoninMaxDaysAfterArrival;
      if (inWindow) {
        const bm = bestMelatoninTiming({ windowStart: Math.max(tw + 6 * MS_H, firstA - 5 * MS_H), windowEnd: firstA, sleepStart: firstA, direction: 'ADVANCE', dose: melScreen.doseMg, bioTimeAt: t => wrap24(bt0 + (t - tw) / MS_H) });
        if (bm && !blocked.some(b => b.why === 'BOARDING' && bm.t >= b.a && bm.t < b.b)) {
          jump = { t: bm.t, h: bm.effect.circadianPhaseShifting.phaseShiftH, effect: bm.effect, dose: melScreen.doseMg };
        }
      }
    }
    for (const p of best.pieces) sleeps.push({ a: p.a, b: p.b, kind: 'SLEEP', planned: true });
    for (const l of best.lt) lights.push(l);
    if (jump) { jumps.push({ t: jump.t, h: jump.h }); melDecisions.push(jump); }
    const wakeAt = best.pieces[best.pieces.length - 1].b;
    simulate(state, wakeAt, makeBehavior(env, sleeps.slice(-best.pieces.length - 1), best.lt, jumps), mp);
    if (!returnHooked && state.t >= retDep) { target.onReturnDeparture(bodyOffset(state)); returnHooked = true; }
    const rNow = target.at(state.t) - bodyOffset(state);
    cycles.push({ wakePrev: tw, sleepStart: best.pieces[0].a, wake: wakeAt, lightMode: best.lm, residualAfterH: +rNow.toFixed(2), cost: +best.cost.toFixed(3) });
    totalCost += best.cost;
    prevSleepStart = best.pieces[0].a;
    tw = wakeAt; awakeSince = wakeAt;
    if (tw > it.lastArr + 1.5 * MS_D && Math.abs(rNow) < O.settleResidualH) settled++; else settled = 0;
    if (settled >= 2 || tw > it.lastArr + O.maxDaysAfterLastArrival * MS_D) break;
  }
  return { strategy, direction, target, sleeps, lights, jumps, melDecisions, cycles, cost: totalCost, end: tw };
}
function traceRun(ctx, run, extraSleeps = [], stepMin = 15) {
  const { profile, it, mp, env } = ctx;
  const state = initialState(ctx);
  const sleeps = [...run.sleeps, ...extraSleeps].sort((a, b) => a.a - b.a);
  const beh = makeBehavior(env, sleeps, run.lights, run.jumps);
  const tEnd = Math.min(ctx.T1, run.end + 18 * MS_H);
  const trace = [];
  let next = ctx.T0, retHooked = false;
  const retDep = it.isRoundTrip ? it.returnLegs[0].depUtc : Infinity;
  const record = st => {
    if (st.t + 1 < next) return;
    next += stepMin * MS_MIN;
    const loc = locationAt(it, st.t);
    const sn = snapshot(st, mp, run.target.at(st.t), loc.tz);
    sn.localTz = loc.tz; sn.inFlight = loc.inFlight;
    trace.push(sn);
  };
  record(state);
  simulate(state, tEnd, beh, mp, st => { if (!retHooked && st.t >= retDep) { retHooked = true; } record(st); });
  return { trace, sleeps };
}
function scoreRun(ctx, run, trace) {
  const { it, prefs } = ctx;
  const imp = [];
  if (it.events.length) for (const e of it.events) imp.push({ a: e.start - 1 * MS_H, b: e.end });
  else {
    const end = Math.min(it.stay.end, it.stay.start + 7 * MS_D);
    for (let t = it.stay.start; t < end; t += 30 * MS_MIN) { const h = localClockHours(t, it.destTz); if (h >= 9 && h < 21) imp.push({ a: t, b: t + 30 * MS_MIN }); }
  }
  let mis = 0, alertDef = 0, n = 0, asleepDuring = 0, evA = 0, evN = 0;
  for (const p of trace) if (imp.some(w => p.t >= w.a && p.t < w.b)) {
    n++; mis += Math.abs(p.residualToLocalH ?? 0);
    if (p.asleep) asleepDuring++; else alertDef += Math.max(0, 70 - (p.predictedAlertness ?? 0));
  }
  for (const e of it.events) for (const p of trace) if (p.t >= e.start && p.t < e.end) { evN++; evA += p.asleep ? 0 : (p.predictedAlertness ?? 0); }
  const post = trace.filter(p => it.isRoundTrip ? p.t >= it.lastArr : false);
  const postBurden = post.reduce((x, p) => x + Math.abs(p.residualToLocalH ?? 0), 0) * 0.25 / 24; // h·jours
  const m = {
    meanMisalignmentDuringImportantH: n ? +(mis / n).toFixed(2) : 0,
    meanAlertnessDeficit: n ? +(alertDef / n).toFixed(1) : 0,
    asleepDuringImportantPct: n ? Math.round(100 * asleepDuring / n) : 0,
    postReturnBurdenHourDays: +postBurden.toFixed(2),
    meanAlertnessDuringEvents: evN ? Math.round(evA / evN) : null,
  };
  const perfLike = prefs.mode === MODE.PERFORM || (it.isRoundTrip && it.stay.durationH < ctx.O.shortTripThresholdH);
  const score = (perfLike ? 0.35 : 1.0) * m.meanMisalignmentDuringImportantH + (perfLike ? 0.12 : 0.05) * m.meanAlertnessDeficit
    + 0.1 * m.asleepDuringImportantPct + (perfLike ? (prefs.mode === MODE.PERFORM && evN ? 0.3 : 0.6) : 0.05) * m.postReturnBurdenHourDays
    + (prefs.mode === MODE.PERFORM && evN ? 0.25 * Math.max(0, 85 - m.meanAlertnessDuringEvents) : 0);
  return { score: +score.toFixed(3), metrics: m };
}
function prepareContext(profile, it, prefs, overrides = {}) {
  const O = { ...OPTIMIZER_DEFAULTS, ...(overrides.optimizer || {}), weights: { ...OPTIMIZER_DEFAULTS.weights, ...((overrides.optimizer || {}).weights || {}) } };
  const mp = modelParams(profile, overrides);
  const preDays = clamp(Math.round(prefs.preDays || 0), 0, 3);
  const dep = it.firstDep;
  let T0 = dep - (Math.max(preDays, 1) + 1) * MS_D;
  const h = localClockHours(T0, it.homeTz);
  T0 = T0 + wrap12(profile.usualWakeTimeH - h) * MS_H;
  if (prefs.planStart) T0 = prefs.planStart;
  const T1 = it.lastArr + (OPTIMIZER_DEFAULTS.maxDaysAfterLastArrival + 1) * MS_D;
  const env = buildEnv(it, T0, T1, prefs);
  const melatoninScreen = screenMelatonin(prefs.medical ?? null, profile, prefs.melatonin || {});
  return { profile, it, prefs: { ...prefs, preDays }, O, mp, env, T0, T1, melatoninScreen };
}
/** Choisit stratégie + sens et renvoie le meilleur run avec la comparaison. */
function optimize(ctx) {
  const { it, prefs, O } = ctx;
  const shift = it.shiftOutHours;
  const forced = prefs.strategy && prefs.strategy !== 'AUTO' ? prefs.strategy : null;
  const shortTrip = it.isRoundTrip && it.stay.durationH < O.shortTripThresholdH && Math.abs(shift) >= O.shortTripMinShiftH;
  let strategies = forced ? [forced] : (shortTrip || prefs.mode === MODE.PERFORM) && Math.abs(shift) >= 1 ? [STRATEGY.FULL_ADAPTATION, STRATEGY.PARTIAL_ADAPTATION, STRATEGY.HOME_TIME_MAINTENANCE] : [STRATEGY.FULL_ADAPTATION];
  const dirs = Math.abs(shift) >= O.antidromicMinShiftH && !prefs.direction ? [Math.sign(shift), -Math.sign(shift)] : [prefs.direction || 0];
  const results = [];
  for (const st of strategies) for (const d of (st === STRATEGY.HOME_TIME_MAINTENANCE ? [0] : dirs)) {
    const run = runPlanner(ctx, st, d);
    const { trace } = traceRun(ctx, run, [], 30);
    const sc = scoreRun(ctx, run, trace);
    results.push({ run, score: sc.score, metrics: sc.metrics });
  }
  results.sort((a, b) => a.score - b.score);
  let chosen = results[0];
  if (shortTrip && !forced && prefs.mode !== MODE.PERFORM) {
    const near = results.filter(r => r.score <= chosen.score * 1.03 + 1e-9);
    chosen = near.reduce((x, y) => (Math.abs(y.run.target.stayShift) < Math.abs(x.run.target.stayShift) ? y : x), chosen);
  }
  const comparison = results.map(r => ({ strategy: r.run.strategy, direction: r.run.target.D > 0 ? 'ADVANCE' : r.run.target.D < 0 ? 'DELAY' : 'NONE', targetShiftH: +r.run.target.D.toFixed(2), score: r.score, metrics: r.metrics, chosen: r === chosen }));
  return { chosen: chosen.run, comparison, shortTrip, forced: !!forced };
}
Object.defineProperty(exports, 'makeBehavior', { enumerable: true, get: () => makeBehavior });
Object.defineProperty(exports, 'buildEnv', { enumerable: true, get: () => buildEnv });
Object.defineProperty(exports, 'perStepLights', { enumerable: true, get: () => perStepLights });
Object.defineProperty(exports, 'directionFromResidual', { enumerable: true, get: () => directionFromResidual });
Object.defineProperty(exports, 'calculateMelatoninEffect', { enumerable: true, get: () => calculateMelatoninEffect });
Object.defineProperty(exports, 'OPTIMIZER_DEFAULTS', { enumerable: true, get: () => OPTIMIZER_DEFAULTS });
Object.defineProperty(exports, 'makeTarget', { enumerable: true, get: () => makeTarget });
Object.defineProperty(exports, 'runPlanner', { enumerable: true, get: () => runPlanner });
Object.defineProperty(exports, 'traceRun', { enumerable: true, get: () => traceRun });
Object.defineProperty(exports, 'scoreRun', { enumerable: true, get: () => scoreRun });
Object.defineProperty(exports, 'prepareContext', { enumerable: true, get: () => prepareContext });
Object.defineProperty(exports, 'optimize', { enumerable: true, get: () => optimize });
},
'src/circadian/index.js': function (exports, __req) {
const { MS_H, MS_MIN, wrap24, wrap12, clamp } = __req('src/constants.js');
const { OSC_DEFAULTS, stepOscillator, hoursSinceCbtMin, rotatePhase, amplitude } = __req('src/circadian/oscillator.js');
const { SLEEP_DEFAULTS, updateSleepPressure, predictAlertness } = __req('src/sleep/index.js');
const { localClockHours, offsetMin } = __req('src/itinerary/tz.js');
const JUMP_SPREAD_H = 3; // étalement de l'effet de phase de la mélatonine
const SIM_DT_H = 0.1; // pas d'intégration (6 min)
function modelParams(profile, overrides = {}) {
  return {
    osc: { ...OSC_DEFAULTS, tauX: profile.model.tauH, lightSensitivity: profile.model.lightSensitivity, ...(overrides.osc || {}) },
    sleep: { ...SLEEP_DEFAULTS, ...(overrides.sleep || {}) },
  };
}
/** Éclairement « habituel » à domicile (pour l'entraînement initial), selon l'heure locale. */
function habitualLux(h, bed, wake) {
  const asleep = wrap24(h - bed) < wrap24(wake - bed);
  if (asleep) return 0;
  if (wrap24(h - wake) < 1) return 200;
  if (h >= 8 && h < 18) return 400;
  return 80;
}
/**
 * Crée l'état initial : l'oscillateur est entraîné 40 jours sur les horaires habituels au domicile,
 * puis recalé pour que son nadir coïncide avec le nadir ESTIMÉ du profil (hypothèse, pas une mesure).
 */
function createInitialState(profile, homeTz, t0, mp) {
  const P = mp.osc, bed = profile.usualBedtimeH, wake = profile.usualWakeTimeH;
  const s = { x: -0.5, xc: -0.5, n: 0, psi: 0 };
  let S = 0.3;
  const days = 40, dt = SIM_DT_H;
  const off0 = offsetMin(homeTz, t0) / 60;
  const h0 = localClockHours(t0, homeTz);
  for (let i = -Math.round(days * 24 / dt); i < 0; i++) {
    const h = wrap24(h0 + i * dt);
    const I = habitualLux(h, bed, wake);
    stepOscillator(s, I, dt, P);
    S = updateSleepPressure(S, I === 0 && wrap24(h - bed) < wrap24(wake - bed), dt, mp.sleep);
  }
  const implied = wrap24(h0 - hoursSinceCbtMin(s, P));
  rotatePhase(s, wrap12(implied - profile.estimatedCircadianNadir.hours));
  const asleep = wrap24(h0 - bed) < wrap24(wake - bed);
  const state = {
    t: t0, x: s.x, xc: s.xc, n: s.n, psi: 0, S, asleep,
    lastWake: asleep ? t0 - wrap24(h0 - bed) * MS_H : t0 - wrap24(h0 - wake) * MS_H,
    nadirClockH: profile.estimatedCircadianNadir.hours, homeTz, homeOff0: off0,
  };
  state.bodyOffset0 = off0 + wrap12(bodyClockHome(state, P) - h0);
  state.psi0 = 0; state.tH0 = t0 / MS_H;
  return state;
}
function cloneState(s) { return { ...s }; }
/** Temps biologique : heures depuis le dernier nadir (CBTmin) estimé, ∈ [0,24). */
function biologicalTime(state, P) { return hoursSinceCbtMin(state, P); }
/** Heure « du corps », exprimée dans l'heure du domicile d'origine (ex. « Paris 03:20 »). */
function bodyClockHome(state, P) { return wrap24(state.nadirClockH + hoursSinceCbtMin(state, P)); }
/** Décalage déroulé (h) de l'horloge biologique par rapport à l'UTC. Continu : permet de suivre avance/retard > 12 h. */
function bodyOffset(state) { return state.bodyOffset0 + (state.psi - state.psi0) - (state.t / MS_H - state.tH0); }
/**
 * Avance la simulation jusqu'à t1.
 * @param {object} state modifié en place
 * @param {number} t1 ms UTC
 * @param {{luxAt:(t:number)=>number, asleepAt:(t:number)=>boolean, phaseJumps?:Array<{t:number,h:number}>}} behavior
 * @param {object} mp paramètres (modelParams)
 * @param {(state:object)=>void} [onStep] appelé après chaque pas
 */
function simulate(state, t1, behavior, mp, onStep) {
  const dtMs = SIM_DT_H * MS_H;
  const jumps = behavior.phaseJumps || [];
  while (state.t + 1 < t1) {
    const dtH = Math.min(SIM_DT_H, (t1 - state.t) / MS_H);
    const tm = state.t + dtH * MS_H / 2;
    const asleep = behavior.asleepAt(tm);
    const I = asleep ? 0 : behavior.luxAt(tm);
    stepOscillator(state, I, dtH, mp.osc);
    state.S = updateSleepPressure(state.S, asleep, dtH, mp.sleep);
    if (state.asleep && !asleep) state.lastWake = state.t + dtH * MS_H;
    state.asleep = asleep; state.lux = I;
    const tPrev = state.t; state.t += dtH * MS_H;
    for (const j of jumps) {
      const a = j.t, b = j.t + JUMP_SPREAD_H * MS_H;
      const ov = Math.min(b, state.t) - Math.max(a, tPrev);
      if (ov > 0) rotatePhase(state, j.h * ov / (b - a));
    }
    if (onStep) onStep(state);
    if (dtMs <= 0) break;
  }
  return state;
}
/** Instantané CircadianState documenté. */
function snapshot(state, mp, targetOffsetH, localTz) {
  const P = mp.osc;
  const bt = biologicalTime(state, P);
  const bo = bodyOffset(state);
  const hsw = (state.t - state.lastWake) / MS_H;
  const pred = predictAlertness({ S: state.S, bioTime: bt, hoursSinceWake: hsw, asleep: state.asleep }, mp.sleep);
  const localOff = localTz ? offsetMin(localTz, state.t) / 60 : null;
  const residualLocal = localOff == null ? null : wrap12(localOff - bo);
  return {
    t: state.t,
    biologicalPhase: +(bt / 24).toFixed(4),          // fraction de cycle depuis CBTmin (0 = nadir)
    biologicalTime: +bt.toFixed(3),                   // heures depuis CBTmin
    bodyClockHome: +bodyClockHome(state, P).toFixed(3),
    bodyOffsetH: +bo.toFixed(3),
    residualPhaseDifference: targetOffsetH == null ? null : +(targetOffsetH - bo).toFixed(3), // >0 : l'horloge doit avancer
    residualToLocalH: residualLocal == null ? null : +residualLocal.toFixed(3),
    sleepPressure: pred.sleepPressure,
    circadianWakeDrive: pred.circadianWakeDrive,
    predictedAlertness: state.asleep ? null : pred.predictedAlertness,
    predictedSleepiness: state.asleep ? null : pred.predictedSleepiness,
    sleepPropensity: pred.sleepPropensity,
    amplitude: +amplitude(state).toFixed(3),
    asleep: !!state.asleep,
    lux: state.lux ?? 0,
  };
}
Object.defineProperty(exports, 'OSC_DEFAULTS', { enumerable: true, get: () => OSC_DEFAULTS });
Object.defineProperty(exports, 'stepOscillator', { enumerable: true, get: () => stepOscillator });
Object.defineProperty(exports, 'hoursSinceCbtMin', { enumerable: true, get: () => hoursSinceCbtMin });
Object.defineProperty(exports, 'rotatePhase', { enumerable: true, get: () => rotatePhase });
Object.defineProperty(exports, 'wrap24', { enumerable: true, get: () => wrap24 });
Object.defineProperty(exports, 'wrap12', { enumerable: true, get: () => wrap12 });
Object.defineProperty(exports, 'clamp', { enumerable: true, get: () => clamp });
Object.defineProperty(exports, 'MS_MIN', { enumerable: true, get: () => MS_MIN });
Object.defineProperty(exports, 'JUMP_SPREAD_H', { enumerable: true, get: () => JUMP_SPREAD_H });
Object.defineProperty(exports, 'SIM_DT_H', { enumerable: true, get: () => SIM_DT_H });
Object.defineProperty(exports, 'modelParams', { enumerable: true, get: () => modelParams });
Object.defineProperty(exports, 'createInitialState', { enumerable: true, get: () => createInitialState });
Object.defineProperty(exports, 'cloneState', { enumerable: true, get: () => cloneState });
Object.defineProperty(exports, 'biologicalTime', { enumerable: true, get: () => biologicalTime });
Object.defineProperty(exports, 'bodyClockHome', { enumerable: true, get: () => bodyClockHome });
Object.defineProperty(exports, 'bodyOffset', { enumerable: true, get: () => bodyOffset });
Object.defineProperty(exports, 'simulate', { enumerable: true, get: () => simulate });
Object.defineProperty(exports, 'snapshot', { enumerable: true, get: () => snapshot });
},
'src/circadian/oscillator.js': function (exports, __req) {
const { wrap24 } = __req('src/constants.js');
const OSC_DEFAULTS = Object.freeze({
  mu: 0.23, q: 1 / 3, k: 0.55, tauX: 24.2,
  alpha0: 0.05, beta: 0.013 /* min^-1 */, G: 19.875, p: 0.5, I0: 9500,
  cbtOffsetH: -0.10,
  lightSensitivity: 1,
});
/** dérivées ; t en heures, I en lux (0 si yeux fermés) */
function deriv(x, xc, n, I, P, out) {
  const alpha = I > 0 ? P.alpha0 * (P.p === 0.5 ? Math.sqrt(I / P.I0) : Math.pow(I / P.I0, P.p)) : 0;
  const Bhat = P.G * (1 - n) * alpha * P.lightSensitivity;
  const B = Bhat * (1 - 0.4 * x) * (1 - 0.4 * xc);
  const w = Math.PI / 12;
  const x3 = x * x * x, x7 = x3 * x3 * x;
  out[0] = w * (xc + P.mu * (x / 3 + (4 / 3) * x3 - (256 / 105) * x7) + B);
  out[1] = w * (P.q * B * xc - x * ((24 / (0.99729 * P.tauX)) ** 2 + P.k * B));
  out[2] = 60 * (alpha * (1 - n) - P.beta * n);
}
const k1 = [0, 0, 0], k2 = [0, 0, 0], k3 = [0, 0, 0], k4 = [0, 0, 0];
/** Un pas RK4 de dt heures, lumière constante I sur le pas. Modifie s en place. */
function stepOscillator(s, I, dt, P) {
  const { x, xc, n } = s;
  deriv(x, xc, n, I, P, k1);
  deriv(x + dt / 2 * k1[0], xc + dt / 2 * k1[1], n + dt / 2 * k1[2], I, P, k2);
  deriv(x + dt / 2 * k2[0], xc + dt / 2 * k2[1], n + dt / 2 * k2[2], I, P, k3);
  deriv(x + dt * k3[0], xc + dt * k3[1], n + dt * k3[2], I, P, k4);
  const th0 = Math.atan2(xc, x);
  s.x = x + dt / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
  s.xc = xc + dt / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
  s.n = n + dt / 6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
  let d = th0 - Math.atan2(s.xc, s.x);
  if (d > Math.PI) d -= 2 * Math.PI; else if (d < -Math.PI) d += 2 * Math.PI;
  s.psi += d * 12 / Math.PI;
}
/** Heures écoulées depuis le dernier CBTmin estimé par le modèle, dans [0,24). */
function hoursSinceCbtMin(s, P) {
  const th = Math.atan2(s.xc, s.x);
  let a = Math.PI - th; a = ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return wrap24(a * 12 / Math.PI - P.cbtOffsetH);
}
function amplitude(s) { return Math.hypot(s.x, s.xc); }
/** Fait tourner l'état de `hours` heures circadiennes (sans changer l'amplitude). hours>0 = avance de phase. */
function rotatePhase(s, hours) {
  const r = Math.hypot(s.x, s.xc), th = Math.atan2(s.xc, s.x) - hours * Math.PI / 12;
  s.x = r * Math.cos(th); s.xc = r * Math.sin(th); s.psi += hours;
}
Object.defineProperty(exports, 'OSC_DEFAULTS', { enumerable: true, get: () => OSC_DEFAULTS });
Object.defineProperty(exports, 'stepOscillator', { enumerable: true, get: () => stepOscillator });
Object.defineProperty(exports, 'hoursSinceCbtMin', { enumerable: true, get: () => hoursSinceCbtMin });
Object.defineProperty(exports, 'amplitude', { enumerable: true, get: () => amplitude });
Object.defineProperty(exports, 'rotatePhase', { enumerable: true, get: () => rotatePhase });
},
'src/sleep/index.js': function (exports, __req) {
const { clamp } = __req('src/constants.js');
const SLEEP_DEFAULTS = Object.freeze({
  tauRiseH: 18.2,   // montée de S pendant l'éveil
  tauDecayH: 4.2,   // décroissance de S pendant le sommeil
  cPeak1H: 13.0, cAmp1: 0.85, cPeak2H: 15.5, cAmp2: 0.2,
  wC: 2.2, wS: 8.0, sRef: 0.35, bias: 1.4, // calibré : ~80 en soirée, ~30 au coucher habituel, <40 après 30 h d'éveil
  inertiaPts: 25, inertiaTauH: 0.35,
});
/** Mise à jour de la pression homéostatique S ∈ [0,1] sur dt heures. */
function updateSleepPressure(S, asleep, dt, P = SLEEP_DEFAULTS) {
  return asleep ? S * Math.exp(-dt / P.tauDecayH) : 1 - (1 - S) * Math.exp(-dt / P.tauRiseH);
}
/** Pulsion circadienne d'éveil ∈ ≈[-1,1] selon le temps biologique (h depuis CBTmin). */
function circadianWakeDrive(bioTime, P = SLEEP_DEFAULTS) {
  const w = Math.PI / 12;
  return P.cAmp1 * Math.cos(w * (bioTime - P.cPeak1H)) + P.cAmp2 * Math.cos(2 * w * (bioTime - P.cPeak2H));
}
/**
 * Prédictions instantanées.
 * @returns {{sleepPressure:number, circadianWakeDrive:number, predictedAlertness:number, predictedSleepiness:number, sleepPropensity:number}}
 *  predictedAlertness ∈ [0,100] ; predictedSleepiness : estimation sur l'échelle de Karolinska (1 = très éveillé, 9 = très somnolent).
 */
function predictAlertness({ S, bioTime, hoursSinceWake = 99, asleep = false }, P = SLEEP_DEFAULTS) {
  const C = circadianWakeDrive(bioTime, P);
  const z = P.wC * C - P.wS * (S - P.sRef) + P.bias;
  let a = 100 / (1 + Math.exp(-z));
  if (!asleep && hoursSinceWake < 3) a -= P.inertiaPts * Math.exp(-hoursSinceWake / P.inertiaTauH);
  a = clamp(a, 0, 100);
  return {
    sleepPressure: Math.round(S * 100),
    circadianWakeDrive: +C.toFixed(3),
    predictedAlertness: Math.round(a),
    predictedSleepiness: +(1 + 8 * (1 - a / 100)).toFixed(1),
    sleepPropensity: +clamp(0.5 + 0.45 * (-C) + 0.9 * (S - 0.45), 0, 1).toFixed(3),
  };
}
Object.defineProperty(exports, 'SLEEP_DEFAULTS', { enumerable: true, get: () => SLEEP_DEFAULTS });
Object.defineProperty(exports, 'updateSleepPressure', { enumerable: true, get: () => updateSleepPressure });
Object.defineProperty(exports, 'circadianWakeDrive', { enumerable: true, get: () => circadianWakeDrive });
Object.defineProperty(exports, 'predictAlertness', { enumerable: true, get: () => predictAlertness });
},
'src/light/index.js': function (exports, __req) {
const { LIGHT_REC, circGauss, clamp, wrap12 } = __req('src/constants.js');
const { circadianWakeDrive } = __req('src/sleep/index.js');
const LIGHT_DEFAULTS = Object.freeze({
  advPeakH: 2.6, delPeakH: -4.4, lobeSigmaH: 2.6,
  advMaxH: 1.34, delMaxH: 1.48, dayTailH: 0.12,   // amplitudes pour 6,7 h à ~10 000 lux (référence)
  refDurationH: 6.7, refLux: 10000, luxHalfK: 40,
  alertEC50: 100,
  lux: {
    SEEK_BRIGHT_LIGHT: 3000, SEEK_DAYLIGHT: 1000, NORMAL_LIGHT_DAY: 250, NORMAL_LIGHT_NIGHT: 80,
    DIM_LIGHT: 20, AVOID_BRIGHT_LIGHT: 40, DARKNESS: 0,
    FLIGHT_BRIGHT: 300, FLIGHT_BRIGHT_WINDOW: 1500, FLIGHT_NORMAL: 80, FLIGHT_DARK: 5,
  },
  strongThr: 0.45, mildThr: 0.2,
});
/** PRC normalisée (sans unité, ≈[-1,1]) au temps biologique t (h depuis CBTmin). >0 = avance. */
function lightPRCShape(t, P = LIGHT_DEFAULTS) {
  const v = P.advMaxH * circGauss(t, P.advPeakH, P.lobeSigmaH) - P.delMaxH * circGauss(t, P.delPeakH, P.lobeSigmaH) + P.dayTailH;
  return v / P.delMaxH;
}
/** Réponse à l'intensité (0-1), quasi logarithmique, relative à 10 000 lux. */
function intensityResponse(lux, P = LIGHT_DEFAULTS) {
  if (!(lux > 0)) return 0;
  return Math.log10(1 + lux / P.luxHalfK) / Math.log10(1 + P.refLux / P.luxHalfK);
}
/** Réponse à la durée (0-1+), non linéaire : les premières minutes comptent le plus. */
function durationResponse(h, P = LIGHT_DEFAULTS) {
  if (!(h > 0)) return 0;
  return h <= P.refDurationH ? Math.sqrt(h / P.refDurationH) : 1 + 0.15 * Math.log(h / P.refDurationH);
}
/**
 * Effet estimé d'une exposition lumineuse.
 * @param {number} biologicalTime heures depuis le CBTmin estimé au DÉBUT de l'exposition
 * @param {number} illuminance lux au niveau de l'œil
 * @param {number} duration heures
 * @param {number} spectrumFactor efficacité mélanopique relative (1 = lumière du jour ; >1 enrichie en bleu ; <1 chaude)
 * @returns {{phaseShiftH:number, phaseAdvance:number, phaseDelay:number, neutralEffect:boolean, alertingEffect:number, zone:string}}
 */
function calculateLightEffect(biologicalTime, illuminance, duration, spectrumFactor = 1, P = LIGHT_DEFAULTS) {
  const center = biologicalTime + duration / 2;
  let g = 0, n = 0;
  for (let t = biologicalTime; t <= biologicalTime + duration + 1e-9; t += Math.max(0.1, duration / 20)) { g += lightPRCShape(t, P); n++; }
  g = n ? g / n : lightPRCShape(center, P);
  const I = illuminance * (spectrumFactor > 0 ? spectrumFactor : 1);
  const shift = g * P.delMaxH * intensityResponse(I, P) * durationResponse(duration, P);
  const night = circadianWakeDrive(wrap12(center)) < 0 ? 1 : 0.5;
  const alerting = clamp(I / (I + P.alertEC50) * night, 0, 1);
  const neutral = Math.abs(shift) < 0.08;
  return {
    phaseShiftH: +shift.toFixed(3),
    phaseAdvance: shift > 0 ? +shift.toFixed(3) : 0,
    phaseDelay: shift < 0 ? +(-shift).toFixed(3) : 0,
    neutralEffect: neutral,
    alertingEffect: +alerting.toFixed(3),
    zone: neutral ? 'DEAD_ZONE' : shift > 0 ? 'ADVANCE_ZONE' : 'DELAY_ZONE',
  };
}
/**
 * Classe la lumière souhaitable à un instant, selon le temps biologique et la direction voulue.
 * @param {number} bioTime heures depuis CBTmin
 * @param {'ADVANCE'|'DELAY'|'HOLD'} direction
 * @param {{awake?:boolean, hoursToSleep?:number}} ctx
 */
function classifyLight(bioTime, direction, ctx = {}, P = LIGHT_DEFAULTS) {
  if (ctx.awake === false) return LIGHT_REC.DARKNESS;
  const e = lightPRCShape(bioTime, P);
  let rec;
  if (direction === 'ADVANCE' || direction === 'DELAY') {
    const v = (direction === 'ADVANCE' ? 1 : -1) * e;
    rec = v >= P.strongThr ? LIGHT_REC.SEEK_BRIGHT_LIGHT : v >= P.mildThr ? LIGHT_REC.SEEK_DAYLIGHT
      : v <= -P.strongThr ? LIGHT_REC.AVOID_BRIGHT_LIGHT : v <= -P.mildThr ? LIGHT_REC.DIM_LIGHT : LIGHT_REC.NORMAL_LIGHT;
  } else {
    const t = wrap12(bioTime);
    rec = (t >= 1.5 && t <= 6) ? LIGHT_REC.SEEK_DAYLIGHT : e <= -P.strongThr ? LIGHT_REC.DIM_LIGHT : LIGHT_REC.NORMAL_LIGHT;
  }
  const h = ctx.hoursToSleep;
  if (h != null && h >= 0) {
    if (h < 0.5 && rec !== LIGHT_REC.AVOID_BRIGHT_LIGHT) rec = LIGHT_REC.DIM_LIGHT;
    else if (h < 1 && direction !== 'DELAY' && (rec === LIGHT_REC.NORMAL_LIGHT || rec === LIGHT_REC.SEEK_DAYLIGHT)) rec = LIGHT_REC.DIM_LIGHT;
  }
  return rec;
}
/** Lux simulés pour une recommandation, selon le contexte (vol, soleil levé). */
function luxFor(rec, { inFlight = false, sunUp = true, windowDaylight = false } = {}, P = LIGHT_DEFAULTS) {
  const L = P.lux;
  if (rec === LIGHT_REC.DARKNESS) return 0;
  if (inFlight) {
    if (rec === LIGHT_REC.SEEK_BRIGHT_LIGHT || rec === LIGHT_REC.SEEK_DAYLIGHT) return windowDaylight ? L.FLIGHT_BRIGHT_WINDOW : L.FLIGHT_BRIGHT;
    if (rec === LIGHT_REC.NORMAL_LIGHT) return L.FLIGHT_NORMAL;
    return L.FLIGHT_DARK;
  }
  switch (rec) {
    case LIGHT_REC.SEEK_BRIGHT_LIGHT: return L.SEEK_BRIGHT_LIGHT;       // dehors de jour, ou lampe de luminothérapie
    case LIGHT_REC.SEEK_DAYLIGHT: return sunUp ? L.SEEK_DAYLIGHT : L.NORMAL_LIGHT_DAY;
    case LIGHT_REC.NORMAL_LIGHT: return sunUp ? L.NORMAL_LIGHT_DAY : L.NORMAL_LIGHT_NIGHT;
    case LIGHT_REC.DIM_LIGHT: return L.DIM_LIGHT;
    case LIGHT_REC.AVOID_BRIGHT_LIGHT: return L.AVOID_BRIGHT_LIGHT;
    default: return L.NORMAL_LIGHT_DAY;
  }
}
/** Direction souhaitée à partir du résidu (h, >0 = il faut avancer). */
function directionFromResidual(residualH, holdThresholdH = 0.5) {
  if (residualH > holdThresholdH) return 'ADVANCE';
  if (residualH < -holdThresholdH) return 'DELAY';
  return 'HOLD';
}
Object.defineProperty(exports, 'LIGHT_DEFAULTS', { enumerable: true, get: () => LIGHT_DEFAULTS });
Object.defineProperty(exports, 'lightPRCShape', { enumerable: true, get: () => lightPRCShape });
Object.defineProperty(exports, 'intensityResponse', { enumerable: true, get: () => intensityResponse });
Object.defineProperty(exports, 'durationResponse', { enumerable: true, get: () => durationResponse });
Object.defineProperty(exports, 'calculateLightEffect', { enumerable: true, get: () => calculateLightEffect });
Object.defineProperty(exports, 'classifyLight', { enumerable: true, get: () => classifyLight });
Object.defineProperty(exports, 'luxFor', { enumerable: true, get: () => luxFor });
Object.defineProperty(exports, 'directionFromResidual', { enumerable: true, get: () => directionFromResidual });
},
'src/melatonin/index.js': function (exports, __req) {
const { circGauss, clamp, wrap12 } = __req('src/constants.js');
const MELATONIN_DEFAULTS = Object.freeze({
  dlmoToNadirH: 7.0,            // pour convertir temps biologique (depuis CBTmin) -> temps relatif au DLMO
  advPeakAt3mgH: -5.0,          // pic d'avance ≈ 5 h avant le DLMO pour 3 mg
  advPeakAt05mgH: -3.0,         // ≈ 2-4 h avant le DLMO pour 0,5 mg
  delPeakH: +10.0,              // retard maximal ≈ matin biologique
  advSigmaH: 2.8, delSigmaH: 3.0,
  advMaxPerDoseH: 0.5, delMaxPerDoseH: 0.35, // ordre de grandeur par prise quotidienne (h)
  endogenousOnH: 0, endogenousOffH: 10, // fenêtre de sécrétion endogène relative au DLMO (h)
});
function advPeakFor(dose, P) {
  const f = clamp((Math.log10(dose) - Math.log10(0.5)) / (Math.log10(3) - Math.log10(0.5)), 0, 1);
  return P.advPeakAt05mgH + f * (P.advPeakAt3mgH - P.advPeakAt05mgH);
}
function doseResponse(dose) { return clamp(dose / (dose + 0.15), 0, 1) / (3 / 3.15); }
/** PRC de la mélatonine (h, >0 = avance) pour une prise à tDLMO heures du DLMO (négatif = avant). */
function melatoninPRC(tRelDLMO, dose = 0.5, P = MELATONIN_DEFAULTS) {
  const a = P.advMaxPerDoseH * circGauss(tRelDLMO, advPeakFor(dose, P), P.advSigmaH);
  const d = P.delMaxPerDoseH * circGauss(tRelDLMO, P.delPeakH, P.delSigmaH);
  return clamp(doseResponse(dose), 0, 1.05) * (a - d);
}
/**
 * @param {number} biologicalTime heures depuis le CBTmin estimé au moment de la prise
 * @param {number} dose mg
 * @param {{formulation?:'IR'|'PR'}|string} timing libération immédiate (IR) ou prolongée (PR)
 */
function calculateMelatoninEffect(biologicalTime, dose, timing = 'IR', P = MELATONIN_DEFAULTS) {
  const formulation = typeof timing === 'string' ? timing : (timing && timing.formulation) || 'IR';
  const rel = wrap12(biologicalTime + P.dlmoToNadirH);
  const shift = dose > 0 ? melatoninPRC(rel, dose, P) : 0;
  const endogenousHigh = rel >= P.endogenousOnH && rel <= P.endogenousOffH;
  const hyp = dose > 0 ? clamp((0.35 + 0.25 * Math.log10(1 + dose * 4)) * (endogenousHigh ? 0.45 : 1), 0, 1) : 0;
  const durationH = dose > 0 ? 1.5 + 1.3 * Math.log(1 + dose) + (formulation === 'PR' ? 3 : 0) : 0;
  return {
    relativeToDLMOH: +rel.toFixed(2),
    circadianPhaseShifting: {
      phaseShiftH: +shift.toFixed(3),
      direction: Math.abs(shift) < 0.05 ? 'NEUTRAL' : shift > 0 ? 'ADVANCE' : 'DELAY',
    },
    sleepPromotingEffect: {
      hypnoticEffect: +hyp.toFixed(3),     // 0-1, effet soporifique aigu relatif
      onsetMin: formulation === 'PR' ? 60 : 30,
      durationH: +durationH.toFixed(2),    // durée approximative de l'effet sédatif
    },
  };
}
/**
 * Cherche l'heure de prise (dans une fenêtre d'éveil) qui produit le déplacement voulu avec peu de sédation
 * pendant l'éveil. Retourne null si aucun horaire n'apporte d'effet utile.
 * @param {(t:number)=>number} bioTimeAt fonction ms UTC -> temps biologique
 */
function bestMelatoninTiming({ windowStart, windowEnd, sleepStart, direction, dose = 0.5, bioTimeAt }, P = MELATONIN_DEFAULTS) {
  if (direction !== 'ADVANCE') return null; // la mélatonine n'est proposée que pour avancer l'horloge (cf. doc)
  let best = null;
  for (let t = windowStart; t <= windowEnd; t += 15 * 60e3) {
    const eff = calculateMelatoninEffect(bioTimeAt(t), dose, 'IR', P);
    const hBeforeSleep = (sleepStart - t) / 3600e3;
    const sedationPenalty = Math.max(0, hBeforeSleep - 1) * eff.sleepPromotingEffect.hypnoticEffect * 0.08;
    const score = eff.circadianPhaseShifting.phaseShiftH - sedationPenalty;
    if (!best || score > best.score) best = { t, score, effect: eff };
  }
  return best && best.effect.circadianPhaseShifting.phaseShiftH > 0.08 ? best : null;
}
Object.defineProperty(exports, 'MELATONIN_DEFAULTS', { enumerable: true, get: () => MELATONIN_DEFAULTS });
Object.defineProperty(exports, 'melatoninPRC', { enumerable: true, get: () => melatoninPRC });
Object.defineProperty(exports, 'calculateMelatoninEffect', { enumerable: true, get: () => calculateMelatoninEffect });
Object.defineProperty(exports, 'bestMelatoninTiming', { enumerable: true, get: () => bestMelatoninTiming });
},
'src/practicality/index.js': function (exports, __req) {
const { MS_H, MS_MIN, LIGHT_REC, INTERVENTION } = __req('src/constants.js');
const { locationAt } = __req('src/itinerary/index.js');
const PRACTICALITY_DEFAULTS = Object.freeze({
  airportLeadH: 2.5,        // arrivée à l'aéroport avant un vol (depuis le domicile / l'hôtel)
  connectionLeadH: 1.0,     // être à la porte avant un vol de correspondance
  boardingSettleH: 0.5,     // premières 30 min de vol : embarquement, décollage
  descentH: 0.75,           // dernières 45 min : descente, atterrissage
  postArrivalH: 1.5,        // débarquement, douane, trajet
  minSleepChunkH: 1.5,
  minLayoverSleepH: 8,      // on ne programme un vrai sommeil en escale que si elle dure au moins 8 h
  earliestReasonableBedH: 19, latestReasonableWakeH: 11,
});
function solarElevation(lat, lon, ms) {
  const d = ms / 86400000 + 2440587.5 - 2451545.0; // jours depuis J2000
  const g = (357.529 + 0.98560028 * d) * Math.PI / 180;
  const q = 280.459 + 0.98564736 * d;
  const L = (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * Math.PI / 180;
  const e = (23.439 - 0.00000036 * d) * Math.PI / 180;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const gmst = ((18.697374558 + 24.06570982441908 * d) % 24 + 24) % 24;
  const lst = (gmst * 15 + lon) * Math.PI / 180;
  const ha = lst - ra, phi = lat * Math.PI / 180;
  const el = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(ha));
  return el * 180 / Math.PI;
}
/** Lumière du jour exploitable (soleil > 0°). Sans coordonnées : hypothèse prudente 07:00-19:00 locale. */
function isDaylight(lat, lon, ms, fallbackLocalHour) {
  if (lat == null || lon == null) return fallbackLocalHour != null ? fallbackLocalHour >= 7 && fallbackLocalHour < 19 : true;
  return solarElevation(lat, lon, ms) > 0;
}
/** Intervalles pendant lesquels dormir (ou faire la sieste) est impossible. */
function blockedIntervals(it, ctx = {}, P = PRACTICALITY_DEFAULTS) {
  const out = [];
  it.legs.forEach((l, i) => {
    const prev = it.legs[i - 1];
    const connecting = prev && l.depUtc - prev.arrUtc < 24 * MS_H && prev.group === l.group;
    out.push({ a: l.depUtc - (connecting ? P.connectionLeadH : P.airportLeadH) * MS_H, b: l.depUtc + P.boardingSettleH * MS_H, why: 'BOARDING' });
    out.push({ a: l.arrUtc - P.descentH * MS_H, b: l.arrUtc + (it.legs[i + 1] && it.legs[i + 1].depUtc - l.arrUtc < 24 * MS_H ? 0.25 : P.postArrivalH) * MS_H, why: 'ARRIVAL' });
  });
  for (const lay of it.layovers) {
    if (lay.durationH < P.minLayoverSleepH) out.push({ a: lay.start, b: lay.end, why: 'LAYOVER' });
  }
  for (const w of ctx.blockedWindows || []) out.push({ a: w.start, b: w.end, why: w.label || 'USER' });
  for (const ev of it.events || []) out.push({ a: ev.start - (P.eventBufferBeforeH ?? 1.5) * MS_H, b: ev.end + (P.eventBufferAfterH ?? 0.5) * MS_H, why: 'EVENT' });
  return out.sort((x, y) => x.a - y.a);
}
function subtractIntervals(a, b, cuts) {
  let parts = [{ a, b }];
  for (const c of cuts) {
    const nx = [];
    for (const p of parts) {
      if (c.b <= p.a || c.a >= p.b) { nx.push(p); continue; }
      if (c.a > p.a) nx.push({ a: p.a, b: c.a });
      if (c.b < p.b) nx.push({ a: c.b, b: p.b });
    }
    parts = nx;
  }
  return parts;
}
/**
 * Faisabilité d'une recommandation.
 * @param {{type:string, start:number, end:number, recommendation?:string}} event
 * @param {object} it itinéraire normalisé
 * @param {{now?:number, hasLightBox?:boolean, blockedWindows?:Array}} userContext
 * @returns {{feasible:boolean, reason?:string, setting?:string, alternative?:object, adjusted?:{start:number,end:number}}}
 */
function isRecommendationFeasible(event, it, userContext = {}, P = PRACTICALITY_DEFAULTS) {
  const { type, start, end } = event;
  const mid = (start + end) / 2;
  const loc = locationAt(it, mid);
  const blocked = blockedIntervals(it, userContext, P);
  const overlaps = (a, b) => blocked.find(x => x.a < b && x.b > a);
  const inEvent = (it.events || []).find(e => start < e.end && end > e.start && mid >= e.start - 0.25 * MS_H && mid < e.end);
  if (inEvent && [INTERVENTION.LIGHT, INTERVENTION.LIGHT_AVOIDANCE, INTERVENTION.WIND_DOWN, INTERVENTION.EXERCISE, INTERVENTION.MEAL, INTERVENTION.MELATONIN_OPTIONAL].includes(type)) return { feasible: false, reason: 'EVENT' };
  if (type === INTERVENTION.LIGHT) {
    if (loc.inFlight) {
      const sunUp = isDaylight(loc.lat, loc.lon, mid);
      return { feasible: true, setting: sunUp ? 'CABIN_WINDOW' : 'CABIN', alternative: sunUp ? { hint: 'WINDOW_SHADE_OPEN' } : { hint: 'CABIN_OR_SCREEN_LIGHT' } };
    }
    const sunUpStart = isDaylight(loc.lat, loc.lon, start), sunUpEnd = isDaylight(loc.lat, loc.lon, end);
    if (sunUpStart && sunUpEnd) return { feasible: true, setting: 'OUTDOOR' };
    if (sunUpStart !== sunUpEnd || isDaylight(loc.lat, loc.lon, mid)) return { feasible: true, setting: 'OUTDOOR_PARTIAL', alternative: { hint: userContext.hasLightBox ? 'LIGHT_BOX' : 'LIGHT_BOX_OR_BRIGHT_ROOM', when: sunUpStart ? 'AFTER_SUNSET' : 'BEFORE_SUNRISE' } };
    if (userContext.hasLightBox) return { feasible: true, setting: 'LIGHT_BOX', alternative: { hint: 'LIGHT_BOX' } };
    return { feasible: true, setting: 'INDOOR_BRIGHT', alternative: { hint: 'LIGHT_BOX_OR_BRIGHT_ROOM' }, reason: 'NO_DAYLIGHT' };
  }
  if (type === INTERVENTION.LIGHT_AVOIDANCE) {
    if (loc.inFlight) return { feasible: true, setting: 'EYE_MASK' };
    return { feasible: true, setting: isDaylight(loc.lat, loc.lon, mid) ? 'SUNGLASSES' : 'DIM_INDOOR' };
  }
  if (type === INTERVENTION.NAP) {
    if (loc.layover) return { feasible: false, reason: 'CONNECTION' };
    const b = overlaps(start, end); if (b) return { feasible: false, reason: b.why };
    return { feasible: true, setting: loc.inFlight ? 'IN_FLIGHT' : 'BED' };
  }
  if (type === INTERVENTION.SLEEP) {
    const parts = subtractIntervals(start, end, blocked).filter(p => p.b - p.a >= P.minSleepChunkH * MS_H);
    if (!parts.length) return { feasible: false, reason: 'NO_SLEEP_OPPORTUNITY' };
    const best = parts.reduce((x, y) => (y.b - y.a > x.b - x.a ? y : x));
    const changed = best.a !== start || best.b !== end;
    return { feasible: true, adjusted: changed ? { start: best.a, end: best.b } : undefined, setting: loc.inFlight ? 'IN_FLIGHT' : 'BED' };
  }
  if (type === INTERVENTION.EXERCISE) {
    if (loc.inFlight) return { feasible: true, setting: 'CABIN_STRETCH', alternative: { hint: 'CABIN_STRETCH' } };
    { const b = overlaps(start, end); if (b) return { feasible: false, reason: b.why === 'EVENT' ? 'EVENT' : 'TRAVEL' }; }
    return { feasible: true, setting: isDaylight(loc.lat, loc.lon, mid) ? 'OUTDOOR_WALK' : 'INDOOR' };
  }
  if (type === INTERVENTION.MEAL) return { feasible: true, setting: loc.inFlight ? 'CABIN_SERVICE' : 'NORMAL' };
  if (type === INTERVENTION.MELATONIN_OPTIONAL || type === INTERVENTION.CAFFEINE) {
    const b = blocked.find(x => x.a <= start && x.b > start && x.why === 'BOARDING');
    return b ? { feasible: true, setting: 'CARRY_ON' } : { feasible: true };
  }
  return { feasible: true };
}
Object.defineProperty(exports, 'LIGHT_REC', { enumerable: true, get: () => LIGHT_REC });
Object.defineProperty(exports, 'MS_MIN', { enumerable: true, get: () => MS_MIN });
Object.defineProperty(exports, 'PRACTICALITY_DEFAULTS', { enumerable: true, get: () => PRACTICALITY_DEFAULTS });
Object.defineProperty(exports, 'solarElevation', { enumerable: true, get: () => solarElevation });
Object.defineProperty(exports, 'isDaylight', { enumerable: true, get: () => isDaylight });
Object.defineProperty(exports, 'blockedIntervals', { enumerable: true, get: () => blockedIntervals });
Object.defineProperty(exports, 'subtractIntervals', { enumerable: true, get: () => subtractIntervals });
Object.defineProperty(exports, 'isRecommendationFeasible', { enumerable: true, get: () => isRecommendationFeasible });
},
'src/safety/index.js': function (exports, __req) {
const MELATONIN_CONTRAINDICATIONS = Object.freeze({
  pregnant: 'Grossesse',
  breastfeeding: 'Allaitement',
  epilepsy: 'Épilepsie',
  autoimmune: 'Maladie auto-immune ou inflammatoire',
  anticoagulant: 'Traitement anticoagulant (dont AVK)',
  immunosuppressant: 'Traitement immunosuppresseur',
  fluvoxamine: 'Fluvoxamine ou autre inhibiteur puissant du CYP1A2',
  hepaticImpairment: 'Insuffisance hépatique',
  sedatives: 'Traitement sédatif, hypnotique ou consommation d’alcool associée',
  otherContraindication: 'Autre contre-indication signalée',
});
/**
 * @param {object|null} medical réponses au questionnaire de sécurité (null = non rempli)
 * @param {object} profile CircadianProfile
 * @param {{enabled?:boolean, physicianApproved?:boolean, doseMg?:number}} pref préférence mélatonine
 */
function screenMelatonin(medical, profile, pref = {}) {
  const reasons = [], warnings = [];
  if (!pref || !pref.enabled) return { allowed: false, reasons: [{ code: 'NOT_REQUESTED' }], warnings, requiresMedicalAdvice: true };
  if (!medical) return { allowed: false, reasons: [{ code: 'SCREENING_REQUIRED', message: 'Questionnaire de sécurité non rempli.' }], warnings, requiresMedicalAdvice: true };
  if (profile && profile.age != null && profile.age < 18) reasons.push({ code: 'MINOR', message: 'Moins de 18 ans.' });
  for (const [k, label] of Object.entries(MELATONIN_CONTRAINDICATIONS)) if (medical[k]) reasons.push({ code: k.toUpperCase(), message: label });
  let doseMg = 0.5;
  if (pref.physicianApproved && Number.isFinite(+pref.doseMg) && +pref.doseMg > 0) doseMg = Math.min(+pref.doseMg, 5);
  if (doseMg > 1) warnings.push({ code: 'DOSE_ABOVE_LOW', message: 'Au-delà de 1 mg, la somnolence résiduelle augmente sans gain de recalage démontré.' });
  warnings.push({ code: 'NO_DRIVING', message: 'Pas de conduite ni d’activité à risque dans les heures suivant la prise.' });
  return {
    allowed: reasons.length === 0, reasons, warnings, doseMg,
    requiresMedicalAdvice: !pref.physicianApproved,
    label: pref.physicianApproved ? `Mélatonine ${doseMg} mg (dose validée par votre médecin)` : 'Mélatonine faible dose, uniquement après avis médical',
  };
}
function screenCaffeine(profile, medical = {}) {
  if (!profile || profile.caffeineUse === 'none') return { allowed: false, reason: 'NO_CAFFEINE_USER' };
  if (medical && (medical.pregnant || medical.arrhythmia || medical.caffeineIntolerance)) return { allowed: false, reason: 'MEDICAL' };
  return { allowed: true, cutoffBeforeSleepH: profile.caffeineUse === 'high' || profile.sleepQuality === 'poor' ? 8 : 6, maxServingsPerDay: profile.caffeineUse === 'high' ? 4 : 3 };
}
/** Avertissements génériques ajoutés à tout plan. */
function globalSafetyNotes({ itinerary, trace }) {
  const notes = [
    { code: 'NOT_MEDICAL_ADVICE', message: 'Plan d’information générale ; il ne remplace pas une consultation.' },
    { code: 'NO_HYPNOTICS', message: 'Fuseo ne recommande jamais de somnifère ; ils ne recalent pas l’horloge.' },
    { code: 'ALCOHOL', message: 'Pas d’alcool pour dormir, en particulier en vol.' },
  ];
  if (itinerary && trace) for (const l of itinerary.legs) {
    const low = trace.find(p => p.t >= l.arrUtc && p.t <= l.arrUtc + 6 * 3600e3 && !p.asleep && p.predictedAlertness < 40);
    if (low) { notes.push({ code: 'DROWSY_DRIVING', legId: l.id, message: `Vigilance prédite basse après l’arrivée du vol ${l.id} : évitez de conduire.` }); break; }
  }
  return notes;
}
Object.defineProperty(exports, 'MELATONIN_CONTRAINDICATIONS', { enumerable: true, get: () => MELATONIN_CONTRAINDICATIONS });
Object.defineProperty(exports, 'screenMelatonin', { enumerable: true, get: () => screenMelatonin });
Object.defineProperty(exports, 'screenCaffeine', { enumerable: true, get: () => screenCaffeine });
Object.defineProperty(exports, 'globalSafetyNotes', { enumerable: true, get: () => globalSafetyNotes });
},
'src/scoring/index.js': function (exports, __req) {
const { MS_H, wrap12, clamp } = __req('src/constants.js');
const { hhmm, hoursToHHMM } = __req('src/itinerary/tz.js');
function formatDuration(h) {
  const a = Math.abs(h); let H = Math.floor(a), M = Math.round((a - H) * 60);
  if (M === 60) { H++; M = 0; }
  return `${H}h${String(M).padStart(2, '0')}`;
}
/**
 * Pourcentage d'adaptation vers un fuseau de référence.
 * @param {number} residualH écart résiduel actuel (h)
 * @param {number} initialH écart total à rattraper (h)
 */
function adaptationPercentage(residualH, initialH) {
  if (Math.abs(initialH) < 0.5) return 100;
  return Math.round(clamp(100 * (1 - Math.abs(residualH) / Math.abs(initialH)), 0, 100));
}
/**
 * Confiance (0-100) : part du profil (estimation, jamais mesure) + dégradation avec le temps (adhésion supposée,
 * erreurs de modèle cumulées). Rétablie partiellement par les observations saisies (recalcul).
 */
function confidenceAt(profile, t, planStart, observationsCount = 0) {
  const days = Math.max(0, (t - planStart) / (24 * MS_H));
  const base = profile.confidenceScore;                   // 0,25-0,8
  const decay = Math.pow(0.96, days);
  const obsBoost = Math.min(0.1, observationsCount * 0.02);
  const score = Math.round(100 * clamp(base * decay + obsBoost, 0.1, 0.85));
  const uncertaintyH = +(profile.estimatedDLMO.uncertaintyH + 0.12 * days).toFixed(1);
  return { score, level: score >= 60 ? 'GOOD' : score >= 40 ? 'MODERATE' : 'LOW', uncertaintyH };
}
/**
 * Tableau de bord d'adaptation à l'instant t (à partir d'un point de trace).
 * @param {object} point point de trace du moteur
 * @param {{homeTz,homeCity,localTz,localCity,initialShiftH,profile,planStart,observationsCount}} ctx
 */
function adaptationDashboard(point, ctx) {
  const residual = point.residualToLocalH ?? 0;
  const conf = confidenceAt(ctx.profile, point.t, ctx.planStart, ctx.observationsCount || 0);
  return {
    t: point.t,
    bodyClock: { city: ctx.homeCity, tz: ctx.homeTz, time: hoursToHHMM(point.bodyClockHome), isEstimate: true },
    localClock: { city: ctx.localCity, tz: ctx.localTz, time: hhmm(point.t, ctx.localTz) },
    estimatedResidualJetLag: { hours: +Math.abs(residual).toFixed(2), label: formatDuration(residual), direction: Math.abs(residual) < 0.25 ? 'ALIGNED' : residual > 0 ? 'BODY_BEHIND' : 'BODY_AHEAD' },
    adaptation: adaptationPercentage(residual, ctx.initialShiftH),
    alertness: point.predictedAlertness, sleepPressure: point.sleepPressure,
    confidence: conf,
  };
}
/** Désalignement moyen (h) pendant des fenêtres données. */
function meanMisalignment(trace, windows, key = 'residualToLocalH') {
  let s = 0, n = 0;
  for (const p of trace) if (windows.some(w => p.t >= w.a && p.t < w.b) && p[key] != null) { s += Math.abs(p[key]); n++; }
  return n ? s / n : 0;
}
Object.defineProperty(exports, 'wrap12', { enumerable: true, get: () => wrap12 });
Object.defineProperty(exports, 'formatDuration', { enumerable: true, get: () => formatDuration });
Object.defineProperty(exports, 'adaptationPercentage', { enumerable: true, get: () => adaptationPercentage });
Object.defineProperty(exports, 'confidenceAt', { enumerable: true, get: () => confidenceAt });
Object.defineProperty(exports, 'adaptationDashboard', { enumerable: true, get: () => adaptationDashboard });
Object.defineProperty(exports, 'meanMisalignment', { enumerable: true, get: () => meanMisalignment });
}
  };
  const __cache = {};
  function __req(id) {
    if (__cache[id]) return __cache[id];
    const exports = (__cache[id] = {});
    __defs[id](exports, __req);
    return exports;
  }
  const api = __req('src/index.js');
  global.FuseoEngine = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
