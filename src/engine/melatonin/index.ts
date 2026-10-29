/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck — typage interne progressif (PLAN §5.1.3) : les types publics sont dans ./types.ts

import { circGauss, clamp, wrap12 } from '../constants';

const MELATONIN_DEFAULTS = Object.freeze({
  dlmoToNadirH: 7.0, // pour convertir temps biologique (depuis CBTmin) -> temps relatif au DLMO
  advPeakAt3mgH: -5.0, // pic d'avance ≈ 5 h avant le DLMO pour 3 mg
  advPeakAt05mgH: -3.0, // ≈ 2-4 h avant le DLMO pour 0,5 mg
  delPeakH: +10.0, // retard maximal ≈ matin biologique
  advSigmaH: 2.8,
  delSigmaH: 3.0,
  advMaxPerDoseH: 0.5,
  delMaxPerDoseH: 0.35, // ordre de grandeur par prise quotidienne (h)
  endogenousOnH: 0,
  endogenousOffH: 10, // fenêtre de sécrétion endogène relative au DLMO (h)
});
function advPeakFor(dose, P) {
  const f = clamp((Math.log10(dose) - Math.log10(0.5)) / (Math.log10(3) - Math.log10(0.5)), 0, 1);
  return P.advPeakAt05mgH + f * (P.advPeakAt3mgH - P.advPeakAt05mgH);
}
function doseResponse(dose) {
  return clamp(dose / (dose + 0.15), 0, 1) / (3 / 3.15);
}
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
  const hyp =
    dose > 0
      ? clamp((0.35 + 0.25 * Math.log10(1 + dose * 4)) * (endogenousHigh ? 0.45 : 1), 0, 1)
      : 0;
  const durationH = dose > 0 ? 1.5 + 1.3 * Math.log(1 + dose) + (formulation === 'PR' ? 3 : 0) : 0;
  return {
    relativeToDLMOH: +rel.toFixed(2),
    circadianPhaseShifting: {
      phaseShiftH: +shift.toFixed(3),
      direction: Math.abs(shift) < 0.05 ? 'NEUTRAL' : shift > 0 ? 'ADVANCE' : 'DELAY',
    },
    sleepPromotingEffect: {
      hypnoticEffect: +hyp.toFixed(3), // 0-1, effet soporifique aigu relatif
      onsetMin: formulation === 'PR' ? 60 : 30,
      durationH: +durationH.toFixed(2), // durée approximative de l'effet sédatif
    },
  };
}
/**
 * Cherche l'heure de prise (dans une fenêtre d'éveil) qui produit le déplacement voulu avec peu de sédation
 * pendant l'éveil. Retourne null si aucun horaire n'apporte d'effet utile.
 * @param {(t:number)=>number} bioTimeAt fonction ms UTC -> temps biologique
 */
function bestMelatoninTiming(
  { windowStart, windowEnd, sleepStart, direction, dose = 0.5, bioTimeAt },
  P = MELATONIN_DEFAULTS,
) {
  if (direction !== 'ADVANCE') return null; // la mélatonine n'est proposée que pour avancer l'horloge (cf. doc)
  let best = null;
  for (let t = windowStart; t <= windowEnd; t += 15 * 60e3) {
    const eff = calculateMelatoninEffect(bioTimeAt(t), dose, 'IR', P);
    const hBeforeSleep = (sleepStart - t) / 3600e3;
    const sedationPenalty =
      Math.max(0, hBeforeSleep - 1) * eff.sleepPromotingEffect.hypnoticEffect * 0.08;
    const score = eff.circadianPhaseShifting.phaseShiftH - sedationPenalty;
    if (!best || score > best.score) best = { t, score, effect: eff };
  }
  return best && best.effect.circadianPhaseShifting.phaseShiftH > 0.08 ? best : null;
}

export { MELATONIN_DEFAULTS, melatoninPRC, calculateMelatoninEffect, bestMelatoninTiming };
