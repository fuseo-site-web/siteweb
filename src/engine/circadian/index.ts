/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck — typage interne progressif (PLAN §5.1.3) : les types publics sont dans ./types.ts

import { MS_H, MS_MIN, wrap24, wrap12, clamp } from '../constants';
import {
  OSC_DEFAULTS,
  stepOscillator,
  hoursSinceCbtMin,
  rotatePhase,
  amplitude,
} from './oscillator';
import { SLEEP_DEFAULTS, updateSleepPressure, predictAlertness } from '../sleep';
import { localClockHours, offsetMin } from '../itinerary/tz';

const JUMP_SPREAD_H = 3; // étalement de l'effet de phase de la mélatonine
const SIM_DT_H = 0.1; // pas d'intégration (6 min)
function modelParams(profile, overrides = {}) {
  return {
    osc: {
      ...OSC_DEFAULTS,
      tauX: profile.model.tauH,
      lightSensitivity: profile.model.lightSensitivity,
      ...(overrides.osc || {}),
    },
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
  const P = mp.osc,
    bed = profile.usualBedtimeH,
    wake = profile.usualWakeTimeH;
  const s = { x: -0.5, xc: -0.5, n: 0, psi: 0 };
  let S = 0.3;
  const days = 40,
    dt = SIM_DT_H;
  const off0 = offsetMin(homeTz, t0) / 60;
  const h0 = localClockHours(t0, homeTz);
  for (let i = -Math.round((days * 24) / dt); i < 0; i++) {
    const h = wrap24(h0 + i * dt);
    const I = habitualLux(h, bed, wake);
    stepOscillator(s, I, dt, P);
    S = updateSleepPressure(S, I === 0 && wrap24(h - bed) < wrap24(wake - bed), dt, mp.sleep);
  }
  const implied = wrap24(h0 - hoursSinceCbtMin(s, P));
  rotatePhase(s, wrap12(implied - profile.estimatedCircadianNadir.hours));
  const asleep = wrap24(h0 - bed) < wrap24(wake - bed);
  const state = {
    t: t0,
    x: s.x,
    xc: s.xc,
    n: s.n,
    psi: 0,
    S,
    asleep,
    lastWake: asleep ? t0 - wrap24(h0 - bed) * MS_H : t0 - wrap24(h0 - wake) * MS_H,
    nadirClockH: profile.estimatedCircadianNadir.hours,
    homeTz,
    homeOff0: off0,
  };
  state.bodyOffset0 = off0 + wrap12(bodyClockHome(state, P) - h0);
  state.psi0 = 0;
  state.tH0 = t0 / MS_H;
  return state;
}
function cloneState(s) {
  return { ...s };
}
/** Temps biologique : heures depuis le dernier nadir (CBTmin) estimé, ∈ [0,24). */
function biologicalTime(state, P) {
  return hoursSinceCbtMin(state, P);
}
/** Heure « du corps », exprimée dans l'heure du domicile d'origine (ex. « Paris 03:20 »). */
function bodyClockHome(state, P) {
  return wrap24(state.nadirClockH + hoursSinceCbtMin(state, P));
}
/** Décalage déroulé (h) de l'horloge biologique par rapport à l'UTC. Continu : permet de suivre avance/retard > 12 h. */
function bodyOffset(state) {
  return state.bodyOffset0 + (state.psi - state.psi0) - (state.t / MS_H - state.tH0);
}
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
    const tm = state.t + (dtH * MS_H) / 2;
    const asleep = behavior.asleepAt(tm);
    const I = asleep ? 0 : behavior.luxAt(tm);
    stepOscillator(state, I, dtH, mp.osc);
    state.S = updateSleepPressure(state.S, asleep, dtH, mp.sleep);
    if (state.asleep && !asleep) state.lastWake = state.t + dtH * MS_H;
    state.asleep = asleep;
    state.lux = I;
    const tPrev = state.t;
    state.t += dtH * MS_H;
    for (const j of jumps) {
      const a = j.t,
        b = j.t + JUMP_SPREAD_H * MS_H;
      const ov = Math.min(b, state.t) - Math.max(a, tPrev);
      if (ov > 0) rotatePhase(state, (j.h * ov) / (b - a));
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
  const pred = predictAlertness(
    { S: state.S, bioTime: bt, hoursSinceWake: hsw, asleep: state.asleep },
    mp.sleep,
  );
  const localOff = localTz ? offsetMin(localTz, state.t) / 60 : null;
  const residualLocal = localOff == null ? null : wrap12(localOff - bo);
  return {
    t: state.t,
    biologicalPhase: +(bt / 24).toFixed(4), // fraction de cycle depuis CBTmin (0 = nadir)
    biologicalTime: +bt.toFixed(3), // heures depuis CBTmin
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

export {
  OSC_DEFAULTS,
  stepOscillator,
  hoursSinceCbtMin,
  rotatePhase,
  wrap24,
  wrap12,
  clamp,
  MS_MIN,
  JUMP_SPREAD_H,
  SIM_DT_H,
  modelParams,
  createInitialState,
  cloneState,
  biologicalTime,
  bodyClockHome,
  bodyOffset,
  simulate,
  snapshot,
};
