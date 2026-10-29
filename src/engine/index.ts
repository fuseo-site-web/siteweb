/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck — typage interne progressif (PLAN §5.1.3) : les types publics sont dans ./types.ts

import {
  MS_H,
  MS_MIN,
  MS_D,
  LIGHT_REC,
  INTERVENTION,
  CATEGORY_OF,
  STRATEGY,
  MODE,
  wrap24,
  wrap12,
  clamp,
} from './constants';
import { buildCircadianProfile } from './profile';
import { buildItinerary, timeFrames, locationAt, classifyFlight } from './itinerary';
import { hhmm, isoLocal, hoursToHHMM, localParts, utcIso } from './itinerary/tz';
import { prepareContext, optimize, traceRun } from './optimizer';
import { calculateLightEffect } from './light';
import { isRecommendationFeasible } from './practicality';
import { screenCaffeine, globalSafetyNotes } from './safety';
import { adaptationDashboard, confidenceAt, adaptationPercentage, formatDuration } from './scoring';

const ENGINE_VERSION = '2.0.0';
function traceAt(trace, t) {
  if (!trace.length) return null;
  let lo = 0,
    hi = trace.length - 1;
  while (lo < hi) {
    const m = (lo + hi + 1) >> 1;
    if (trace[m].t <= t) lo = m;
    else hi = m - 1;
  }
  return trace[lo];
}
function mergeLights(lights) {
  const out = [];
  for (const l of [...lights].sort((x, y) => x.a - y.a)) {
    const last = out[out.length - 1];
    if (
      last &&
      last.rec === l.rec &&
      last.inFlight === l.inFlight &&
      Math.abs(last.b - l.a) < 1000
    ) {
      last.b = l.b;
      last.luxSum += l.lux * (l.b - l.a);
    } else
      out.push({ a: l.a, b: l.b, rec: l.rec, inFlight: l.inFlight, luxSum: l.lux * (l.b - l.a) });
  }
  return out.map((x) => ({
    a: x.a,
    b: x.b,
    rec: x.rec,
    inFlight: x.inFlight,
    lux: Math.round(x.luxSum / Math.max(1, x.b - x.a)),
  }));
}
function buildInterventions(ctx, run, trace, sleepsAll) {
  const { profile, it, prefs } = ctx;
  const list = [];
  let n = 0;
  const cityOf = (tz) =>
    tz === it.homeTz
      ? it.home.city
      : tz === it.destTz
        ? it.dest.city
        : tz === it.finalTz
          ? it.final.city
          : tz.split('/').pop().replace(/_/g, ' ');
  const add = (type, start, end, extra = {}) => {
    const p = traceAt(trace, start);
    const fr = timeFrames(it, start);
    const feas = isRecommendationFeasible(
      { type, start, end, recommendation: extra.recommendation },
      it,
      { hasLightBox: prefs.hasLightBox, blockedWindows: prefs.blockedWindows },
    );
    list.push({
      id: `${type}-${++n}`,
      type,
      category: CATEGORY_OF[type],
      start,
      end,
      startUtc: utcIso(start),
      endUtc: utcIso(end),
      durationMin: Math.round((end - start) / MS_MIN),
      frames: {
        ...fr,
        bodyClock: p ? hoursToHHMM(p.bodyClockHome) : null,
        bodyClockCity: it.home.city,
        localCity: cityOf(fr.localTz),
      },
      localTime: hhmm(start, fr.localTz),
      localTz: fr.localTz,
      inFlight: locationAt(it, (start + end) / 2).inFlight,
      feasible: feas.feasible,
      setting: feas.setting || null,
      alternative: feas.alternative || null,
      feasibilityReason: feas.reason || null,
      biologicalTime: p ? p.biologicalTime : null,
      ...extra,
    });
  };
  const planned = sleepsAll
    .filter((s) => s.kind !== 'NAP' && s.b > ctx.T0 + 1)
    .sort((a, b) => a.a - b.a);
  const episodes = [];
  for (const s of planned) {
    const last = episodes[episodes.length - 1];
    if (last && s.a - last.b < 3 * MS_H) last.b = s.b;
    else episodes.push({ a: s.a, b: s.b });
  }
  for (const s of planned)
    if (s.a >= ctx.T0)
      add(INTERVENTION.SLEEP, s.a, s.b, { priority: 1, rationale: { code: 'SLEEP_WINDOW' } });
  for (const e of episodes)
    if (e.b > ctx.T0 && e.b < run.end + 1) add(INTERVENTION.WAKE, e.b, e.b, { priority: 1 });
  for (const e of episodes)
    if (e.a > ctx.T0 + MS_H) {
      let a = e.a - MS_H;
      for (const ev of it.events || []) if (ev.start < e.a && ev.end > a) a = Math.max(a, ev.end);
      if (e.a - a >= 15 * MS_MIN)
        add(INTERVENTION.WIND_DOWN, a, e.a, { priority: 3, recommendation: LIGHT_REC.DIM_LIGHT });
    }
  const cyc = run.cycles;
  const lightModeAt = (t) => {
    const c = cyc.find((c) => t >= c.wakePrev && t < c.wake);
    return c ? c.lightMode : 'HOLD';
  };
  for (const w of mergeLights(run.lights)) {
    if (w.b - w.a < 20 * MS_MIN) continue;
    const dir = lightModeAt(w.a);
    const p = traceAt(trace, w.a);
    const eff = p ? calculateLightEffect(p.biologicalTime, w.lux, (w.b - w.a) / MS_H, 1) : null;
    const nearSleep = episodes.some(
      (e) => e.a >= w.a && e.a - w.b < 1 * MS_H && e.a - w.a <= 1.05 * MS_H,
    );
    if (w.rec === LIGHT_REC.SEEK_BRIGHT_LIGHT || w.rec === LIGHT_REC.SEEK_DAYLIGHT) {
      add(INTERVENTION.LIGHT, w.a, w.b, {
        recommendation: w.rec,
        priority: w.rec === LIGHT_REC.SEEK_BRIGHT_LIGHT ? 1 : 2,
        rationale: {
          code: dir === 'HOLD' ? 'STABILIZE' : dir,
          expectedPhaseShiftH: eff ? eff.phaseShiftH : null,
          zone: eff ? eff.zone : null,
        },
      });
    } else if (
      w.rec === LIGHT_REC.AVOID_BRIGHT_LIGHT ||
      (w.rec === LIGHT_REC.DIM_LIGHT && !nearSleep)
    ) {
      add(INTERVENTION.LIGHT_AVOIDANCE, w.a, w.b, {
        recommendation: w.rec,
        priority: w.rec === LIGHT_REC.AVOID_BRIGHT_LIGHT ? 1 : 2,
        rationale: {
          code: dir,
          wouldShiftIfBrightH: p
            ? calculateLightEffect(p.biologicalTime, 3000, (w.b - w.a) / MS_H, 1).phaseShiftH
            : null,
        },
      });
    }
  }
  for (const m of run.melDecisions)
    add(INTERVENTION.MELATONIN_OPTIONAL, m.t, m.t, {
      priority: 2,
      optional: true,
      requiresMedicalAdvice: ctx.melatoninScreen.requiresMedicalAdvice,
      doseLabel: ctx.melatoninScreen.label,
      doseMg: m.dose,
      rationale: {
        code: 'ADVANCE',
        expectedPhaseShiftH: m.effect.circadianPhaseShifting.phaseShiftH,
        hypnoticEffect: m.effect.sleepPromotingEffect.hypnoticEffect,
        sedationDurationH: m.effect.sleepPromotingEffect.durationH,
      },
    });
  const caf =
    prefs.caffeine === false ? { allowed: false } : screenCaffeine(profile, prefs.medical || {});
  const wakeEpisodes = [];
  for (let i = 0; i + 1 < episodes.length; i++)
    wakeEpisodes.push({ a: episodes[i].b, b: episodes[i + 1].a });
  for (const w of wakeEpisodes) {
    const len = (w.b - w.a) / MS_H;
    if (len < 6 || w.b < ctx.T0) continue;
    const mode = lightModeAt(w.a + MS_H);
    if (caf.allowed) {
      const perfEv =
        prefs.mode === MODE.PERFORM
          ? it.events.find((ev) => ev.start > w.a && ev.start < w.b)
          : null;
      const cutoff = perfEv
        ? Math.max(w.b - caf.cutoffBeforeSleepH * MS_H, perfEv.start)
        : w.b - caf.cutoffBeforeSleepH * MS_H;
      if (cutoff > w.a + MS_H) {
        add(INTERVENTION.CAFFEINE_CUTOFF, cutoff, cutoff, { priority: 2 });
        const dip = trace.find(
          (p) =>
            p.t >= w.a + 0.75 * MS_H &&
            p.t < cutoff - 0.5 * MS_H &&
            !p.asleep &&
            p.predictedAlertness != null &&
            p.predictedAlertness < 50,
        );
        if (dip && !(perfEv && dip.t > perfEv.start - 3 * MS_H))
          add(INTERVENTION.CAFFEINE, dip.t, dip.t, {
            priority: 3,
            optional: true,
            rationale: {
              code: 'LOW_PREDICTED_ALERTNESS',
              predictedAlertness: dip.predictedAlertness,
            },
          });
      }
      for (const ev of it.events)
        if (ev.start > w.a && ev.start < w.b) {
          const t = ev.start - 45 * MS_MIN;
          if (t > w.a + 0.5 * MS_H && t <= cutoff)
            add(INTERVENTION.CAFFEINE, t, t, {
              priority: 2,
              optional: true,
              rationale: {
                code: 'PRE_EVENT',
                eventId: ev.id,
                tradeOff: perfEv ? 'MAY_DELAY_SLEEP_ONSET' : null,
              },
            });
        }
    }
    const inF = (t) => locationAt(it, t).inFlight;
    add(INTERVENTION.MEAL, w.a + 0.5 * MS_H, w.a + 0.5 * MS_H, {
      priority: 3,
      meal: 'BREAKFAST',
      setting: inF(w.a + 0.5 * MS_H) ? 'CABIN_SERVICE' : null,
    });
    if (len >= 10)
      add(INTERVENTION.MEAL, w.a + len * 0.42 * MS_H, w.a + len * 0.42 * MS_H, {
        priority: 3,
        meal: 'LUNCH',
      });
    if (len >= 8)
      add(INTERVENTION.MEAL, w.b - 3 * MS_H, w.b - 3 * MS_H, { priority: 3, meal: 'DINNER' });
    if (mode === 'ADVANCE' || mode === 'DELAY') {
      const s = mode === 'ADVANCE' ? w.a + 1.5 * MS_H : w.b - 5 * MS_H;
      if (s > w.a && s + 0.5 * MS_H < w.b - 2 * MS_H) {
        const f = isRecommendationFeasible(
          { type: INTERVENTION.EXERCISE, start: s, end: s + 30 * MS_MIN },
          it,
          {},
        );
        if (f.feasible)
          add(INTERVENTION.EXERCISE, s, s + 30 * MS_MIN, {
            priority: 3,
            rationale: { code: mode },
          });
      }
    }
  }
  for (const s of sleepsAll.filter((s) => s.kind === 'NAP'))
    add(INTERVENTION.NAP, s.a, s.b, {
      priority: 3,
      optional: true,
      rationale: { code: s.reason || 'LOW_PREDICTED_ALERTNESS' },
    });
  for (const l of it.legs) {
    for (let t = l.depUtc + MS_H; t < l.arrUtc - 0.5 * MS_H; t += 2 * MS_H) {
      if (!sleepsAll.some((s) => t >= s.a && t < s.b))
        add(INTERVENTION.HYDRATION, t, t, { priority: 3 });
    }
  }
  return list
    .filter((x) => x.feasible !== false || x.type === INTERVENTION.SLEEP)
    .sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));
}
function planNaps(ctx, run, trace) {
  const { profile, it, prefs } = ctx;
  const naps = [];
  const sleeps = run.sleeps.filter((s) => s.kind !== 'NAP').sort((a, b) => a.a - b.a);
  for (let i = 0; i + 1 < sleeps.length; i++) {
    const a = sleeps[i].b,
      b = sleeps[i + 1].a;
    if ((b - a) / MS_H < 8 || b < ctx.T0) continue;
    const thr = profile.napHabit === 'never' ? 25 : 35;
    const dip = trace.find(
      (p) =>
        p.t >= a + 1.5 * MS_H &&
        p.t <= b - 6 * MS_H &&
        !p.asleep &&
        p.predictedAlertness != null &&
        p.predictedAlertness < thr,
    );
    if (dip) {
      const nap = {
        a: dip.t,
        b: dip.t + 20 * MS_MIN,
        kind: 'NAP',
        reason: 'LOW_PREDICTED_ALERTNESS',
      };
      if (
        isRecommendationFeasible({ type: INTERVENTION.NAP, start: nap.a, end: nap.b }, it, prefs)
          .feasible
      )
        naps.push(nap);
    }
  }
  if (prefs.mode === MODE.PERFORM)
    for (const ev of it.events) {
      const p = traceAt(trace, ev.start);
      if (!p || (p.predictedAlertness ?? 100) >= 70) continue;
      const alertAt = (extra) => {
        const tr = traceRun(ctx, run, [...naps, ...extra], 30).trace;
        const q = traceAt(tr, ev.start + 15 * MS_MIN);
        return q && !q.asleep ? (q.predictedAlertness ?? 0) : 0;
      };
      let best = { gain: 0 };
      const base = alertAt([]);
      for (const [durMin, endLead] of [
        [20, 2],
        [20, 3],
        [90, 2],
        [90, 3.5],
        [90, 5],
      ]) {
        const b = ev.start - endLead * MS_H,
          a = b - durMin * MS_MIN;
        const nap = { a, b, kind: 'NAP', reason: 'PRE_EVENT', durationMin: durMin };
        if (sleeps.some((s) => a < s.b + 2 * MS_H && b > s.a - 2 * MS_H)) continue;
        if (
          !isRecommendationFeasible({ type: INTERVENTION.NAP, start: a, end: b }, it, prefs)
            .feasible
        )
          continue;
        const gain = alertAt([nap]) - base - (durMin > 30 ? 2 : 0); // légère préférence pour la sieste courte
        if (gain > best.gain) best = { gain, nap };
      }
      if (best.nap) naps.push({ ...best.nap, expectedGain: best.gain });
    }
  return naps;
}
function applyObservations(behavior, observations = [], now = Infinity) {
  let sleeps = behavior.sleeps
    .filter((s) => s.a < now)
    .map((s) => ({ ...s, b: Math.min(s.b, now) }));
  let lights = behavior.lights
    .filter((l) => l.a < now)
    .map((l) => ({ ...l, b: Math.min(l.b, now) }));
  let jumps = behavior.jumps.filter((j) => j.t < now);
  for (const o of observations) {
    const a = o.start ?? o.at,
      b = o.end ?? o.at;
    switch (o.type) {
      case 'SLEEP':
      case 'UNPLANNED_SLEEP':
      case 'NAP':
        if (o.type === 'SLEEP')
          sleeps = sleeps.filter((s) => !(s.a < b && s.b > a && s.kind !== 'NAP'));
        sleeps.push({ a, b, kind: o.type === 'NAP' ? 'NAP' : 'SLEEP', observed: true });
        break;
      case 'WOKE_EARLY':
        sleeps = sleeps.map((s) => (o.at > s.a && o.at < s.b ? { ...s, b: o.at } : s));
        break;
      case 'NO_SLEEP':
        sleeps = sleeps.flatMap((s) =>
          s.a < b && s.b > a
            ? [s.a < a ? { ...s, b: a } : null, s.b > b ? { ...s, a: b } : null].filter(Boolean)
            : [s],
        );
        break;
      case 'LIGHT_MISSED':
        lights = lights.filter(
          (l) =>
            !(
              l.a < b &&
              l.b > a &&
              (l.rec === LIGHT_REC.SEEK_BRIGHT_LIGHT || l.rec === LIGHT_REC.SEEK_DAYLIGHT)
            ),
        );
        break;
      case 'LIGHT_TAKEN':
        lights.push({ a, b, rec: LIGHT_REC.SEEK_BRIGHT_LIGHT, lux: o.lux ?? 3000, observed: true });
        break;
      case 'AVOIDANCE_MISSED':
        lights = lights.filter(
          (l) =>
            !(
              l.a < b &&
              l.b > a &&
              (l.rec === LIGHT_REC.AVOID_BRIGHT_LIGHT || l.rec === LIGHT_REC.DIM_LIGHT)
            ),
        );
        lights.push({ a, b, rec: LIGHT_REC.NORMAL_LIGHT, lux: o.lux ?? 1000, observed: true });
        break;
      case 'MELATONIN_SKIPPED':
        jumps = jumps.filter((j) => Math.abs(j.t - (o.at ?? j.t)) > 2 * MS_H);
        break;
      case 'MELATONIN_TAKEN':
        if (Number.isFinite(o.phaseShiftH)) jumps.push({ t: o.at, h: o.phaseShiftH });
        break;
      default:
        break;
    }
  }
  const byA = (x, y) => x.a - y.a;
  return {
    sleeps: sleeps.filter((s) => s.b > s.a).sort(byA),
    lights: lights.sort(byA),
    jumps: jumps.sort((x, y) => x.t - y.t),
  };
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
  const { profile, errors: pe } = buildCircadianProfile({
    ...profileInput,
    timezone: profileInput.timezone,
  });
  const it = buildItinerary(itineraryInput);
  const errors = [...pe, ...(it.ok ? [] : it.errors)];
  if (errors.length)
    return { ok: false, version: ENGINE_VERSION, errors, warnings: it.warnings || [] };
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
    p.adaptationPercentage = adaptationPercentage(
      p.residualToLocalH ?? 0,
      p.t < it.stay.start
        ? initialShift
        : p.t >= (it.isRoundTrip ? it.returnLegs[0].depUtc : Infinity)
          ? it.shiftBackHours
          : initialShift,
    );
  }
  const dashCtx = (t) => {
    const loc = locationAt(it, t);
    const ref =
      t >= (it.isRoundTrip ? it.returnLegs[0].depUtc : Infinity) ? it.shiftBackHours : initialShift;
    return {
      homeTz: it.homeTz,
      homeCity: it.home.city,
      localTz: loc.tz,
      localCity: loc.place ? loc.place.city : loc.leg ? loc.leg.to.city : it.dest.city,
      initialShiftH: ref,
      profile,
      planStart: ctx.T0,
      observationsCount: (prefs.observations || []).length,
    };
  };
  const dash = (t) => {
    const p = traceAt(trace, t);
    return p ? adaptationDashboard(p, dashCtx(t)) : null;
  };
  const days = [];
  const tEnd = trace.length ? trace[trace.length - 1].t : ctx.T0;
  let cur = ctx.T0;
  while (cur < tEnd && days.length < 40) {
    const loc = locationAt(it, cur);
    const tz = loc.tz;
    const p = localParts(cur, tz);
    const noon = (() => {
      const lp = localParts(cur, tz);
      let t = cur;
      for (let k = 0; k < 48 && localParts(t, tz).h !== 12; k++) t += 30 * MS_MIN;
      return t;
    })();
    const dateKey = `${p.y}-${String(p.mo).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
    let next = cur + MS_H;
    while (next < tEnd + MS_D) {
      const q = localParts(next, locationAt(it, next).tz);
      if (q.d !== p.d) break;
      next += 30 * MS_MIN;
    }
    const items = interventions.filter((x) => x.start >= cur && x.start < next).map((x) => x.id);
    const pEnd = traceAt(trace, next - 1);
    days.push({
      date: dateKey,
      tz,
      start: cur,
      end: next,
      interventionIds: items,
      dashboardNoon: dash(noon),
      residualEndH: pEnd ? pEnd.residualToLocalH : null,
      adaptationEnd: pEnd ? pEnd.adaptationPercentage : null,
      phase: loc.phase,
    });
    cur = next;
  }
  const legs = it.legs.map((l) => ({
    id: l.id,
    group: l.group,
    from: l.from,
    to: l.to,
    flightNumber: l.flightNumber,
    departure: {
      ...timeFrames(it, l.depUtc),
      bodyClock: traceAt(trace, l.depUtc)
        ? hoursToHHMM(traceAt(trace, l.depUtc).bodyClockHome)
        : null,
      localAtOrigin: isoLocal(l.depUtc, l.from.tz),
    },
    arrival: {
      ...timeFrames(it, l.arrUtc),
      bodyClock: traceAt(trace, l.arrUtc)
        ? hoursToHHMM(traceAt(trace, l.arrUtc).bodyClockHome)
        : null,
      localAtDestination: isoLocal(l.arrUtc, l.to.tz),
    },
    durationH: +l.durationH.toFixed(2),
    type: classifyFlight(l, it.homeTz, profile.usualBedtimeH, profile.usualWakeTimeH),
    crossesDateLine: l.crossesDateLine,
    localDateChangeDays: l.localDateChangeDays,
    tzShiftHours: l.tzShiftHours,
  }));
  const chosenCmp = opt.comparison.find((c) => c.chosen);
  const result = {
    ok: true,
    version: ENGINE_VERSION,
    generatedAt: new Date().toISOString(),
    computeMs: 0,
    warnings: it.warnings,
    profile,
    itinerary: {
      homeTz: it.homeTz,
      destTz: it.destTz,
      finalTz: it.finalTz,
      home: it.home,
      destination: it.dest,
      final: it.final,
      isRoundTrip: it.isRoundTrip,
      shiftOutHours: it.shiftOutHours,
      shiftBackHours: it.shiftBackHours,
      crossesDateLine: it.crossesDateLine,
      legs,
      layovers: it.layovers.map((l) => ({ ...l, place: l.place })),
      stay: {
        ...it.stay,
        end: Number.isFinite(it.stay.end) ? it.stay.end : null,
        durationH: Number.isFinite(it.stay.durationH) ? +it.stay.durationH.toFixed(1) : null,
      },
      events: it.events,
    },
    strategy: {
      mode: prefs.mode,
      chosen: run.strategy,
      direction: chosenCmp.direction,
      targetShiftH: chosenCmp.targetShiftH,
      shortTrip: opt.shortTrip,
      forced: opt.forced,
      comparison: opt.comparison,
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
      caffeine:
        prefs.caffeine === false
          ? { allowed: false, reason: 'USER_DISABLED' }
          : screenCaffeine(profile, prefs.medical || {}),
      notes: globalSafetyNotes({ itinerary: it, trace }),
    },
    behavior: {
      sleeps: sleeps.map((s) => ({ a: s.a, b: s.b, kind: s.kind })),
      lights: mergeLights(run.lights),
      jumps: run.jumps,
    },
    meta: {
      planStart: ctx.T0,
      planEnd: tEnd,
      observationsCount: (prefs.observations || []).length,
      inputs: {
        profile: profileInput,
        itinerary: itineraryInput,
        preferences: { ...preferences, previousBehavior: undefined },
      },
      confidenceAtArrival: confidenceAt(
        profile,
        it.stay.start,
        ctx.T0,
        (prefs.observations || []).length,
      ),
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
  if (!previousPlan || !previousPlan.ok)
    throw new Error('recalculatePlan : plan précédent invalide.');
  const inp = previousPlan.meta.inputs;
  const now = Number.isFinite(changes.now) ? changes.now : Date.now();
  const itineraryInput =
    changes.itinerary ||
    (changes.events ? { ...inp.itinerary, events: changes.events } : inp.itinerary);
  const observations = [...(inp.preferences.observations || []), ...(changes.observations || [])];
  const prefs = {
    ...inp.preferences,
    ...(changes.preferences || {}),
    now,
    observations,
    previousBehavior: previousPlan.behavior,
    planStart: previousPlan.meta.planStart,
  };
  const plan = generateCircadianPlan(changes.profile || inp.profile, itineraryInput, prefs);
  if (plan.ok) plan.meta.recalculatedFrom = previousPlan.generatedAt;
  return plan;
}

export {
  buildCircadianProfile,
  buildItinerary,
  calculateLightEffect,
  ENGINE_VERSION,
  applyObservations,
  generateCircadianPlan,
  recalculatePlan,
};
export { parseLocal, localToUtc, offsetMin, hhmm, isoLocal, hoursToHHMM } from './itinerary/tz';
export { locationAt, timeFrames, classifyFlight } from './itinerary';
export { calculateMelatoninEffect, melatoninPRC } from './melatonin';
export { predictAlertness, circadianWakeDrive, updateSleepPressure } from './sleep';
export { classifyLight, lightPRCShape } from './light';
export { isRecommendationFeasible, solarElevation } from './practicality';
export { screenMelatonin, screenCaffeine } from './safety';
export { adaptationDashboard, adaptationPercentage, formatDuration } from './scoring';
export * from './constants';
