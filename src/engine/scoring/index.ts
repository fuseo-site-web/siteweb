/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck — typage interne progressif (PLAN §5.1.3) : les types publics sont dans ./types.ts

import { MS_H, wrap12, clamp } from '../constants';
import { hhmm, hoursToHHMM } from '../itinerary/tz';

function formatDuration(h) {
  const a = Math.abs(h);
  let H = Math.floor(a),
    M = Math.round((a - H) * 60);
  if (M === 60) {
    H++;
    M = 0;
  }
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
  const base = profile.confidenceScore; // 0,25-0,8
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
    bodyClock: {
      city: ctx.homeCity,
      tz: ctx.homeTz,
      time: hoursToHHMM(point.bodyClockHome),
      isEstimate: true,
    },
    localClock: { city: ctx.localCity, tz: ctx.localTz, time: hhmm(point.t, ctx.localTz) },
    estimatedResidualJetLag: {
      hours: +Math.abs(residual).toFixed(2),
      label: formatDuration(residual),
      direction:
        Math.abs(residual) < 0.25 ? 'ALIGNED' : residual > 0 ? 'BODY_BEHIND' : 'BODY_AHEAD',
    },
    adaptation: adaptationPercentage(residual, ctx.initialShiftH),
    alertness: point.predictedAlertness,
    sleepPressure: point.sleepPressure,
    confidence: conf,
  };
}
/** Désalignement moyen (h) pendant des fenêtres données. */
function meanMisalignment(trace, windows, key = 'residualToLocalH') {
  let s = 0,
    n = 0;
  for (const p of trace)
    if (windows.some((w) => p.t >= w.a && p.t < w.b) && p[key] != null) {
      s += Math.abs(p[key]);
      n++;
    }
  return n ? s / n : 0;
}

export {
  wrap12,
  formatDuration,
  adaptationPercentage,
  confidenceAt,
  adaptationDashboard,
  meanMisalignment,
};
