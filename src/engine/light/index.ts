/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck — typage interne progressif (PLAN §5.1.3) : les types publics sont dans ./types.ts

import { LIGHT_REC, circGauss, clamp, wrap12 } from '../constants';
import { circadianWakeDrive } from '../sleep';

const LIGHT_DEFAULTS = Object.freeze({
  advPeakH: 2.6,
  delPeakH: -4.4,
  lobeSigmaH: 2.6,
  advMaxH: 1.34,
  delMaxH: 1.48,
  dayTailH: 0.12, // amplitudes pour 6,7 h à ~10 000 lux (référence)
  refDurationH: 6.7,
  refLux: 10000,
  luxHalfK: 40,
  alertEC50: 100,
  lux: {
    SEEK_BRIGHT_LIGHT: 3000,
    SEEK_DAYLIGHT: 1000,
    NORMAL_LIGHT_DAY: 250,
    NORMAL_LIGHT_NIGHT: 80,
    DIM_LIGHT: 20,
    AVOID_BRIGHT_LIGHT: 40,
    DARKNESS: 0,
    FLIGHT_BRIGHT: 300,
    FLIGHT_BRIGHT_WINDOW: 1500,
    FLIGHT_NORMAL: 80,
    FLIGHT_DARK: 5,
  },
  strongThr: 0.45,
  mildThr: 0.2,
});
/** PRC normalisée (sans unité, ≈[-1,1]) au temps biologique t (h depuis CBTmin). >0 = avance. */
function lightPRCShape(t, P = LIGHT_DEFAULTS) {
  const v =
    P.advMaxH * circGauss(t, P.advPeakH, P.lobeSigmaH) -
    P.delMaxH * circGauss(t, P.delPeakH, P.lobeSigmaH) +
    P.dayTailH;
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
  return h <= P.refDurationH
    ? Math.sqrt(h / P.refDurationH)
    : 1 + 0.15 * Math.log(h / P.refDurationH);
}
/**
 * Effet estimé d'une exposition lumineuse.
 * @param {number} biologicalTime heures depuis le CBTmin estimé au DÉBUT de l'exposition
 * @param {number} illuminance lux au niveau de l'œil
 * @param {number} duration heures
 * @param {number} spectrumFactor efficacité mélanopique relative (1 = lumière du jour ; >1 enrichie en bleu ; <1 chaude)
 * @returns {{phaseShiftH:number, phaseAdvance:number, phaseDelay:number, neutralEffect:boolean, alertingEffect:number, zone:string}}
 */
function calculateLightEffect(
  biologicalTime,
  illuminance,
  duration,
  spectrumFactor = 1,
  P = LIGHT_DEFAULTS,
) {
  const center = biologicalTime + duration / 2;
  let g = 0,
    n = 0;
  for (
    let t = biologicalTime;
    t <= biologicalTime + duration + 1e-9;
    t += Math.max(0.1, duration / 20)
  ) {
    g += lightPRCShape(t, P);
    n++;
  }
  g = n ? g / n : lightPRCShape(center, P);
  const I = illuminance * (spectrumFactor > 0 ? spectrumFactor : 1);
  const shift = g * P.delMaxH * intensityResponse(I, P) * durationResponse(duration, P);
  const night = circadianWakeDrive(wrap12(center)) < 0 ? 1 : 0.5;
  const alerting = clamp((I / (I + P.alertEC50)) * night, 0, 1);
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
    rec =
      v >= P.strongThr
        ? LIGHT_REC.SEEK_BRIGHT_LIGHT
        : v >= P.mildThr
          ? LIGHT_REC.SEEK_DAYLIGHT
          : v <= -P.strongThr
            ? LIGHT_REC.AVOID_BRIGHT_LIGHT
            : v <= -P.mildThr
              ? LIGHT_REC.DIM_LIGHT
              : LIGHT_REC.NORMAL_LIGHT;
  } else {
    const t = wrap12(bioTime);
    rec =
      t >= 1.5 && t <= 6
        ? LIGHT_REC.SEEK_DAYLIGHT
        : e <= -P.strongThr
          ? LIGHT_REC.DIM_LIGHT
          : LIGHT_REC.NORMAL_LIGHT;
  }
  const h = ctx.hoursToSleep;
  if (h != null && h >= 0) {
    if (h < 0.5 && rec !== LIGHT_REC.AVOID_BRIGHT_LIGHT) rec = LIGHT_REC.DIM_LIGHT;
    else if (
      h < 1 &&
      direction !== 'DELAY' &&
      (rec === LIGHT_REC.NORMAL_LIGHT || rec === LIGHT_REC.SEEK_DAYLIGHT)
    )
      rec = LIGHT_REC.DIM_LIGHT;
  }
  return rec;
}
/** Lux simulés pour une recommandation, selon le contexte (vol, soleil levé). */
function luxFor(
  rec,
  { inFlight = false, sunUp = true, windowDaylight = false } = {},
  P = LIGHT_DEFAULTS,
) {
  const L = P.lux;
  if (rec === LIGHT_REC.DARKNESS) return 0;
  if (inFlight) {
    if (rec === LIGHT_REC.SEEK_BRIGHT_LIGHT || rec === LIGHT_REC.SEEK_DAYLIGHT)
      return windowDaylight ? L.FLIGHT_BRIGHT_WINDOW : L.FLIGHT_BRIGHT;
    if (rec === LIGHT_REC.NORMAL_LIGHT) return L.FLIGHT_NORMAL;
    return L.FLIGHT_DARK;
  }
  switch (rec) {
    case LIGHT_REC.SEEK_BRIGHT_LIGHT:
      return L.SEEK_BRIGHT_LIGHT; // dehors de jour, ou lampe de luminothérapie
    case LIGHT_REC.SEEK_DAYLIGHT:
      return sunUp ? L.SEEK_DAYLIGHT : L.NORMAL_LIGHT_DAY;
    case LIGHT_REC.NORMAL_LIGHT:
      return sunUp ? L.NORMAL_LIGHT_DAY : L.NORMAL_LIGHT_NIGHT;
    case LIGHT_REC.DIM_LIGHT:
      return L.DIM_LIGHT;
    case LIGHT_REC.AVOID_BRIGHT_LIGHT:
      return L.AVOID_BRIGHT_LIGHT;
    default:
      return L.NORMAL_LIGHT_DAY;
  }
}
/** Direction souhaitée à partir du résidu (h, >0 = il faut avancer). */
function directionFromResidual(residualH, holdThresholdH = 0.5) {
  if (residualH > holdThresholdH) return 'ADVANCE';
  if (residualH < -holdThresholdH) return 'DELAY';
  return 'HOLD';
}

export {
  LIGHT_DEFAULTS,
  lightPRCShape,
  intensityResponse,
  durationResponse,
  calculateLightEffect,
  classifyLight,
  luxFor,
  directionFromResidual,
};
