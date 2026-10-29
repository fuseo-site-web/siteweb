/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck — typage interne progressif (PLAN §5.1.3) : les types publics sont dans ./types.ts

import { clamp } from '../constants';

const SLEEP_DEFAULTS = Object.freeze({
  tauRiseH: 18.2, // montée de S pendant l'éveil
  tauDecayH: 4.2, // décroissance de S pendant le sommeil
  cPeak1H: 13.0,
  cAmp1: 0.85,
  cPeak2H: 15.5,
  cAmp2: 0.2,
  wC: 2.2,
  wS: 8.0,
  sRef: 0.35,
  bias: 1.4, // calibré : ~80 en soirée, ~30 au coucher habituel, <40 après 30 h d'éveil
  inertiaPts: 25,
  inertiaTauH: 0.35,
});
/** Mise à jour de la pression homéostatique S ∈ [0,1] sur dt heures. */
function updateSleepPressure(S, asleep, dt, P = SLEEP_DEFAULTS) {
  return asleep ? S * Math.exp(-dt / P.tauDecayH) : 1 - (1 - S) * Math.exp(-dt / P.tauRiseH);
}
/** Pulsion circadienne d'éveil ∈ ≈[-1,1] selon le temps biologique (h depuis CBTmin). */
function circadianWakeDrive(bioTime, P = SLEEP_DEFAULTS) {
  const w = Math.PI / 12;
  return (
    P.cAmp1 * Math.cos(w * (bioTime - P.cPeak1H)) +
    P.cAmp2 * Math.cos(2 * w * (bioTime - P.cPeak2H))
  );
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
    sleepPropensity: +clamp(0.5 + 0.45 * -C + 0.9 * (S - 0.45), 0, 1).toFixed(3),
  };
}

export { SLEEP_DEFAULTS, updateSleepPressure, circadianWakeDrive, predictAlertness };
