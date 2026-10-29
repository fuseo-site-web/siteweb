/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck — typage interne progressif (PLAN §5.1.3) : les types publics sont dans ./types.ts

import {
  MS_H,
  MS_MIN,
  MS_D,
  LIGHT_REC,
  INTERVENTION,
  STRATEGY,
  MODE,
  wrap12,
  wrap24,
  clamp,
} from '../constants';
import { offsetMin, localClockHours } from '../itinerary/tz';
import { locationAt } from '../itinerary';
import {
  modelParams,
  createInitialState,
  simulate,
  cloneState,
  biologicalTime,
  bodyOffset,
  snapshot,
  SIM_DT_H,
} from '../circadian';
import { classifyLight, luxFor, directionFromResidual } from '../light';
import { calculateMelatoninEffect, bestMelatoninTiming } from '../melatonin';
import {
  blockedIntervals,
  subtractIntervals,
  isDaylight,
  PRACTICALITY_DEFAULTS,
} from '../practicality';
import { screenMelatonin } from '../safety';

const OPTIMIZER_DEFAULTS = Object.freeze({
  sleepShiftCandidatesH: [-2.5, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5],
  lightModes: ['ADVANCE', 'DELAY', 'HOLD'],
  preShiftRateH: 1,
  preShiftMaxH: 3,
  shortTripThresholdH: 96,
  shortTripMinShiftH: 3,
  antidromicMinShiftH: 8,
  minWakeH: 10,
  maxWakeH: 22,
  weights: {
    residual: 1.0,
    residualSq: 0.12,
    align: 0.5,
    social: 0.6,
    wake: 0.15,
    lost: 0.9,
    event: 0.02,
    eventWake: 0.4,
  },
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
  const env = {
    T0,
    n,
    inFlight: new Uint8Array(n),
    sunUp: new Uint8Array(n),
    windowDay: new Uint8Array(n),
    layover: new Uint8Array(n),
    event: new Uint8Array(n),
    tz: new Array(n),
  };
  for (let i = 0; i < n; i++) {
    const t = T0 + i * DT_MS,
      loc = locationAt(it, t);
    env.tz[i] = loc.tz;
    env.inFlight[i] = loc.inFlight ? 1 : 0;
    env.layover[i] = loc.layover ? 1 : 0;
    const day = isDaylight(loc.lat, loc.lon, t, localClockHours(t, loc.tz));
    env.sunUp[i] = day ? 1 : 0;
    env.windowDay[i] = loc.inFlight && day ? 1 : 0;
    if ((it.events || []).some((e) => t >= e.start && t < e.end)) env.event[i] = 1;
  }
  env.idx = (t) => clamp(Math.floor((t - T0) / DT_MS), 0, n - 1);
  env.hasLightBox = !!ctx.hasLightBox;
  return env;
}
function envLux(env, rec, i) {
  const inFlight = env.inFlight[i] === 1,
    sunUp = env.sunUp[i] === 1;
  let lux = luxFor(rec, { inFlight, sunUp, windowDaylight: env.windowDay[i] === 1 });
  if (!inFlight && rec === LIGHT_REC.SEEK_BRIGHT_LIGHT && !sunUp && !env.hasLightBox) lux = 500; // pièce très éclairée
  if (env.layover[i] === 1) lux = Math.min(lux, 1000);
  return lux;
}
function defaultLux(env, t) {
  return envLux(env, LIGHT_REC.NORMAL_LIGHT, env.idx(t));
}
function intervalIndex(list) {
  const arr = [...list].sort((x, y) => x.a - y.a);
  let k = 0;
  return (t) => {
    if (!arr.length) return null;
    if (k >= arr.length || arr[k].a > t) {
      let lo = 0,
        hi = arr.length - 1,
        r = -1;
      while (lo <= hi) {
        const m = (lo + hi) >> 1;
        if (arr[m].a <= t) {
          r = m;
          lo = m + 1;
        } else hi = m - 1;
      }
      k = Math.max(0, r);
    }
    while (k + 1 < arr.length && arr[k + 1].a <= t) k++;
    for (let j = k; j >= Math.max(0, k - 3); j--) if (t >= arr[j].a && t < arr[j].b) return arr[j];
    return null;
  };
}
function makeBehavior(env, sleeps, lights, jumps = []) {
  const sl = intervalIndex(sleeps),
    li = intervalIndex(lights);
  return {
    asleepAt: (t) => sl(t) !== null,
    luxAt: (t) => {
      const l = li(t);
      return l ? l.lux : defaultLux(env, t);
    },
    phaseJumps: jumps,
  };
}
function makeTarget(it, strategy, { preDays = 0, direction = 0, preRateH = 1, preMaxH = 3 } = {}) {
  const homeOff = (t) => offsetMin(it.homeTz, t) / 60;
  const home0 = homeOff(it.firstDep);
  const arr = it.stay.start;
  const destOffAtArr = offsetMin(it.destTz, arr) / 60;
  let D = wrap12(destOffAtArr - home0);
  if (direction !== 0 && Math.sign(direction) !== Math.sign(D) && Math.abs(D) > 0.5)
    D = D - Math.sign(D) * 24; // sens antidromique
  const stayShift =
    strategy === STRATEGY.FULL_ADAPTATION
      ? D
      : strategy === STRATEGY.PARTIAL_ADAPTATION
        ? D / 2
        : 0;
  const destDst = (t) =>
    strategy === STRATEGY.HOME_TIME_MAINTENANCE
      ? homeOff(t) - home0
      : offsetMin(it.destTz, t) / 60 - destOffAtArr;
  const retDep = it.isRoundTrip ? it.returnLegs[0].depUtc : Infinity;
  const target = {
    D,
    stayShift,
    returnK: null,
    stayAt: (t) => home0 + stayShift + destDst(t),
    at(t) {
      if (t >= retDep) {
        const fo = offsetMin(it.finalTz, t) / 60;
        const k = this.returnK ?? Math.round((this.stayAt(retDep) - fo) / 24);
        return fo + 24 * k;
      }
      if (t < it.firstDep) {
        const startPre = it.firstDep - preDays * MS_D;
        if (preDays <= 0 || t < startPre || strategy === STRATEGY.HOME_TIME_MAINTENANCE)
          return homeOff(t);
        const days = (t - startPre) / MS_D;
        return (
          homeOff(t) +
          Math.sign(stayShift) *
            Math.min(Math.abs(stayShift), preRateH * days, preMaxH, preDays * preRateH)
        );
      }
      return this.stayAt(t);
    },
    onReturnDeparture(bo) {
      if (it.isRoundTrip) this.returnK = Math.round((bo - offsetMin(it.finalTz, retDep) / 60) / 24);
    },
  };
  return target;
}
function perStepLights(env, fromT, toT, bt0, t0, direction, sleepStart) {
  const out = [];
  for (let t = fromT; t < toT; t += DT_MS) {
    const i = env.idx(t);
    const bt = wrap24(bt0 + (t - t0) / MS_H);
    if (env.event[i] === 1) {
      out.push({
        a: t,
        b: t + DT_MS,
        rec: LIGHT_REC.NORMAL_LIGHT,
        lux: 500,
        inFlight: false,
        event: true,
      });
      continue;
    }
    const rec = classifyLight(bt, direction, {
      awake: true,
      hoursToSleep: (sleepStart - t) / MS_H,
    });
    out.push({
      a: t,
      b: t + DT_MS,
      rec,
      lux: envLux(env, rec, i),
      inFlight: env.inFlight[i] === 1,
    });
  }
  return out;
}
function sleepPieces(a, b, blocked, minChunkH) {
  return subtractIntervals(a, b, blocked).filter((p) => p.b - p.a >= minChunkH * MS_H);
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
  const target = makeTarget(it, strategy, {
    preDays: prefs.preDays,
    direction,
    preRateH: O.preShiftRateH,
    preMaxH: O.preShiftMaxH,
  });
  const blocked = blockedIntervals(
    it,
    { blockedWindows: prefs.blockedWindows },
    PRACTICALITY_DEFAULTS,
  );
  const W = O.weights;
  const optMidBio = wrap12(profile.midsleepH - profile.estimatedCircadianNadir.hours);
  const Ds = profile.timeInBedH;
  const events = it.events || [];
  const melScreen = ctx.melatoninScreen;
  const retDep = it.isRoundTrip ? it.returnLegs[0].depUtc : Infinity;
  const eventBlocks = blocked.filter((b) => b.why === 'EVENT');
  const sleeps = [...(ctx.history ? ctx.history.sleeps : [])];
  const lights = [...(ctx.history ? ctx.history.lights : [])];
  const jumps = [...(ctx.history ? ctx.history.jumps : [])];
  const melDecisions = [];
  const cycles = [];
  const state = initialState(ctx);
  let prevSleepStart =
    ctx.T0 - wrap24(localClockHours(ctx.T0, it.homeTz) - profile.usualBedtimeH) * MS_H;
  if (!ctx.history) sleeps.push({ a: prevSleepStart, b: ctx.T0, kind: 'SLEEP', planned: false });
  let tw = ctx.T0;
  let awakeSince = ctx.T0;
  if (ctx.history && ctx.now > ctx.T0) {
    simulate(state, ctx.now, makeBehavior(env, sleeps, lights, jumps), mp);
    tw = ctx.now;
    const lastSleep = [...sleeps]
      .filter((s) => s.kind === 'SLEEP' && s.a < ctx.now)
      .sort((x, y) => y.a - x.a)[0];
    if (lastSleep) {
      prevSleepStart = lastSleep.a;
      awakeSince = Math.min(lastSleep.b, ctx.now);
    } else awakeSince = ctx.now;
    if (state.t >= retDep) target.onReturnDeparture(bodyOffset(state));
  }
  let returnHooked = state.t >= retDep,
    settled = 0,
    totalCost = 0;
  const hardEnd = ctx.T1;
  for (let guard = 0; guard < 40 && tw < hardEnd; guard++) {
    const bt0 = biologicalTime(state, mp.osc);
    const baseStart = prevSleepStart + 24 * MS_H;
    const cands = new Set(O.sleepShiftCandidatesH.map((s) => baseStart + s * MS_H));
    const bedTarget = (t) => {
      const clk = wrap24(t / MS_H + target.at(t));
      return t + wrap12(profile.usualBedtimeH - clk) * MS_H;
    };
    cands.add(bedTarget(baseStart));
    for (const b of eventBlocks)
      if (b.b > tw && b.b - tw < 24 * MS_H) {
        cands.add(b.b + 0.5 * MS_H);
        cands.add(b.b + 1 * MS_H);
      }
    const bodyBed =
      baseStart + wrap12(optMidBio - Ds / 2 - wrap24(bt0 + (baseStart - tw) / MS_H)) * MS_H;
    cands.add(bodyBed);
    const r0 = target.at(tw) - bodyOffset(state);
    const lightModes =
      r0 > 1.5 ? ['ADVANCE', 'HOLD'] : r0 < -1.5 ? ['DELAY', 'HOLD'] : O.lightModes;
    let best = null;
    const evalOne = (ss, lm, allowLong) => {
      if (ss < tw + 0.25 * MS_H) return null; // pas de sommeil dans le passé
      const wakeH = (ss - awakeSince) / MS_H;
      if (wakeH < 1) return null;
      if (!allowLong && (wakeH < O.minWakeH || wakeH > O.maxWakeH)) return null;
      if (eventBlocks.some((b) => ss < b.b && ss + Ds * MS_H > b.a)) return null;
      const pieces = sleepPieces(ss, ss + Ds * MS_H, blocked, PRACTICALITY_DEFAULTS.minSleepChunkH);
      if (!pieces.length) return null;
      const firstA = pieces[0].a,
        lastB = pieces[pieces.length - 1].b;
      if (!allowLong)
        for (const b of eventBlocks) {
          if (
            b.a > lastB &&
            b.a < lastB + O.maxWakeH * MS_H &&
            b.b + 0.5 * MS_H - lastB > (O.maxWakeH + O.eventWakeSlackH) * MS_H
          )
            return null;
        }
      const lt = perStepLights(env, tw, firstA, bt0, tw, lm, firstA);
      const s = cloneState(state);
      const beh = makeBehavior(env, pieces, lt, jumps);
      const tEval = lastB + 2 * MS_H;
      let tSim = tEval;
      for (const ev of events) {
        const m = (ev.start + ev.end) / 2;
        if (m > lastB && m < lastB + O.eventLookaheadH * MS_H) tSim = Math.max(tSim, m + DT_MS);
      }
      let evCost = 0;
      const evSeen = new Set();
      let midBio = null,
        rEval = null;
      const mid = (firstA + lastB) / 2;
      simulate(s, tSim, beh, mp, (st) => {
        if (midBio == null && st.t >= mid) midBio = biologicalTime(st, mp.osc);
        if (rEval == null && st.t >= tEval) rEval = target.at(tEval) - bodyOffset(st);
        if (events.length)
          for (const ev of events) {
            if (
              !evSeen.has(ev.id) &&
              st.t >= (ev.start + ev.end) / 2 &&
              st.t - DT_MS < (ev.start + ev.end) / 2
            ) {
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
      const cost =
        W.residual * Math.abs(r) +
        W.residualSq * r * r +
        W.align * alignDev ** 2 +
        socialW * socialDev ** 2 +
        W.wake * wakePen +
        W.lost * Math.max(0, Ds - slept) +
        evCost;
      return { ss, lm, pieces, lt, cost, r, s, midBio };
    };
    for (const ss of cands)
      for (const lm of lightModes) {
        const c = evalOne(ss, lm, false);
        if (c && (!best || c.cost < best.cost)) best = c;
      }
    if (!best)
      for (const b of eventBlocks)
        if (b.b > tw && b.b - tw < 30 * MS_H)
          for (const lm of lightModes) {
            const c = evalOne(b.b + 0.5 * MS_H, lm, true);
            if (c && (!best || c.cost < best.cost)) best = c;
          }
    if (!best)
      for (let h = O.minWakeH; h <= 30 && !best; h += 1)
        for (const lm of lightModes) {
          const c = evalOne(tw + h * MS_H, lm, true);
          if (c && (!best || c.cost < best.cost)) best = c;
        }
    if (!best) break;
    let jump = null;
    if (melScreen && melScreen.allowed && best.lm === 'ADVANCE' && Math.abs(best.r) > 1) {
      const firstA = best.pieces[0].a;
      const daysAfterArr = (firstA - it.stay.start) / MS_D;
      const inWindow =
        firstA < it.firstDep
          ? prefs.preDays > 0 && firstA > it.firstDep - prefs.preDays * MS_D
          : daysAfterArr <= O.melatoninMaxDaysAfterArrival;
      if (inWindow) {
        const bm = bestMelatoninTiming({
          windowStart: Math.max(tw + 6 * MS_H, firstA - 5 * MS_H),
          windowEnd: firstA,
          sleepStart: firstA,
          direction: 'ADVANCE',
          dose: melScreen.doseMg,
          bioTimeAt: (t) => wrap24(bt0 + (t - tw) / MS_H),
        });
        if (bm && !blocked.some((b) => b.why === 'BOARDING' && bm.t >= b.a && bm.t < b.b)) {
          jump = {
            t: bm.t,
            h: bm.effect.circadianPhaseShifting.phaseShiftH,
            effect: bm.effect,
            dose: melScreen.doseMg,
          };
        }
      }
    }
    for (const p of best.pieces) sleeps.push({ a: p.a, b: p.b, kind: 'SLEEP', planned: true });
    for (const l of best.lt) lights.push(l);
    if (jump) {
      jumps.push({ t: jump.t, h: jump.h });
      melDecisions.push(jump);
    }
    const wakeAt = best.pieces[best.pieces.length - 1].b;
    simulate(
      state,
      wakeAt,
      makeBehavior(env, sleeps.slice(-best.pieces.length - 1), best.lt, jumps),
      mp,
    );
    if (!returnHooked && state.t >= retDep) {
      target.onReturnDeparture(bodyOffset(state));
      returnHooked = true;
    }
    const rNow = target.at(state.t) - bodyOffset(state);
    cycles.push({
      wakePrev: tw,
      sleepStart: best.pieces[0].a,
      wake: wakeAt,
      lightMode: best.lm,
      residualAfterH: +rNow.toFixed(2),
      cost: +best.cost.toFixed(3),
    });
    totalCost += best.cost;
    prevSleepStart = best.pieces[0].a;
    tw = wakeAt;
    awakeSince = wakeAt;
    if (tw > it.lastArr + 1.5 * MS_D && Math.abs(rNow) < O.settleResidualH) settled++;
    else settled = 0;
    if (settled >= 2 || tw > it.lastArr + O.maxDaysAfterLastArrival * MS_D) break;
  }
  return {
    strategy,
    direction,
    target,
    sleeps,
    lights,
    jumps,
    melDecisions,
    cycles,
    cost: totalCost,
    end: tw,
  };
}
function traceRun(ctx, run, extraSleeps = [], stepMin = 15) {
  const { profile, it, mp, env } = ctx;
  const state = initialState(ctx);
  const sleeps = [...run.sleeps, ...extraSleeps].sort((a, b) => a.a - b.a);
  const beh = makeBehavior(env, sleeps, run.lights, run.jumps);
  const tEnd = Math.min(ctx.T1, run.end + 18 * MS_H);
  const trace = [];
  let next = ctx.T0,
    retHooked = false;
  const retDep = it.isRoundTrip ? it.returnLegs[0].depUtc : Infinity;
  const record = (st) => {
    if (st.t + 1 < next) return;
    next += stepMin * MS_MIN;
    const loc = locationAt(it, st.t);
    const sn = snapshot(st, mp, run.target.at(st.t), loc.tz);
    sn.localTz = loc.tz;
    sn.inFlight = loc.inFlight;
    trace.push(sn);
  };
  record(state);
  simulate(state, tEnd, beh, mp, (st) => {
    if (!retHooked && st.t >= retDep) {
      retHooked = true;
    }
    record(st);
  });
  return { trace, sleeps };
}
function scoreRun(ctx, run, trace) {
  const { it, prefs } = ctx;
  const imp = [];
  if (it.events.length) for (const e of it.events) imp.push({ a: e.start - 1 * MS_H, b: e.end });
  else {
    const end = Math.min(it.stay.end, it.stay.start + 7 * MS_D);
    for (let t = it.stay.start; t < end; t += 30 * MS_MIN) {
      const h = localClockHours(t, it.destTz);
      if (h >= 9 && h < 21) imp.push({ a: t, b: t + 30 * MS_MIN });
    }
  }
  let mis = 0,
    alertDef = 0,
    n = 0,
    asleepDuring = 0,
    evA = 0,
    evN = 0;
  for (const p of trace)
    if (imp.some((w) => p.t >= w.a && p.t < w.b)) {
      n++;
      mis += Math.abs(p.residualToLocalH ?? 0);
      if (p.asleep) asleepDuring++;
      else alertDef += Math.max(0, 70 - (p.predictedAlertness ?? 0));
    }
  for (const e of it.events)
    for (const p of trace)
      if (p.t >= e.start && p.t < e.end) {
        evN++;
        evA += p.asleep ? 0 : (p.predictedAlertness ?? 0);
      }
  const post = trace.filter((p) => (it.isRoundTrip ? p.t >= it.lastArr : false));
  const postBurden = (post.reduce((x, p) => x + Math.abs(p.residualToLocalH ?? 0), 0) * 0.25) / 24; // h·jours
  const m = {
    meanMisalignmentDuringImportantH: n ? +(mis / n).toFixed(2) : 0,
    meanAlertnessDeficit: n ? +(alertDef / n).toFixed(1) : 0,
    asleepDuringImportantPct: n ? Math.round((100 * asleepDuring) / n) : 0,
    postReturnBurdenHourDays: +postBurden.toFixed(2),
    meanAlertnessDuringEvents: evN ? Math.round(evA / evN) : null,
  };
  const perfLike =
    prefs.mode === MODE.PERFORM ||
    (it.isRoundTrip && it.stay.durationH < ctx.O.shortTripThresholdH);
  const score =
    (perfLike ? 0.35 : 1.0) * m.meanMisalignmentDuringImportantH +
    (perfLike ? 0.12 : 0.05) * m.meanAlertnessDeficit +
    0.1 * m.asleepDuringImportantPct +
    (perfLike ? (prefs.mode === MODE.PERFORM && evN ? 0.3 : 0.6) : 0.05) *
      m.postReturnBurdenHourDays +
    (prefs.mode === MODE.PERFORM && evN ? 0.25 * Math.max(0, 85 - m.meanAlertnessDuringEvents) : 0);
  return { score: +score.toFixed(3), metrics: m };
}
function prepareContext(profile, it, prefs, overrides = {}) {
  const O = {
    ...OPTIMIZER_DEFAULTS,
    ...(overrides.optimizer || {}),
    weights: { ...OPTIMIZER_DEFAULTS.weights, ...((overrides.optimizer || {}).weights || {}) },
  };
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
  const shortTrip =
    it.isRoundTrip &&
    it.stay.durationH < O.shortTripThresholdH &&
    Math.abs(shift) >= O.shortTripMinShiftH;
  let strategies = forced
    ? [forced]
    : (shortTrip || prefs.mode === MODE.PERFORM) && Math.abs(shift) >= 1
      ? [STRATEGY.FULL_ADAPTATION, STRATEGY.PARTIAL_ADAPTATION, STRATEGY.HOME_TIME_MAINTENANCE]
      : [STRATEGY.FULL_ADAPTATION];
  const dirs =
    Math.abs(shift) >= O.antidromicMinShiftH && !prefs.direction
      ? [Math.sign(shift), -Math.sign(shift)]
      : [prefs.direction || 0];
  const results = [];
  for (const st of strategies)
    for (const d of st === STRATEGY.HOME_TIME_MAINTENANCE ? [0] : dirs) {
      const run = runPlanner(ctx, st, d);
      const { trace } = traceRun(ctx, run, [], 30);
      const sc = scoreRun(ctx, run, trace);
      results.push({ run, score: sc.score, metrics: sc.metrics });
    }
  results.sort((a, b) => a.score - b.score);
  let chosen = results[0];
  if (shortTrip && !forced && prefs.mode !== MODE.PERFORM) {
    const near = results.filter((r) => r.score <= chosen.score * 1.03 + 1e-9);
    chosen = near.reduce(
      (x, y) => (Math.abs(y.run.target.stayShift) < Math.abs(x.run.target.stayShift) ? y : x),
      chosen,
    );
  }
  const comparison = results.map((r) => ({
    strategy: r.run.strategy,
    direction: r.run.target.D > 0 ? 'ADVANCE' : r.run.target.D < 0 ? 'DELAY' : 'NONE',
    targetShiftH: +r.run.target.D.toFixed(2),
    score: r.score,
    metrics: r.metrics,
    chosen: r === chosen,
  }));
  return { chosen: chosen.run, comparison, shortTrip, forced: !!forced };
}

export {
  makeBehavior,
  buildEnv,
  perStepLights,
  directionFromResidual,
  calculateMelatoninEffect,
  OPTIMIZER_DEFAULTS,
  makeTarget,
  runPlanner,
  traceRun,
  scoreRun,
  prepareContext,
  optimize,
};
