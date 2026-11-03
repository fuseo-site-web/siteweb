/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck — typage interne progressif (PLAN §5.1.3) : les types publics sont dans ./types.ts

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
  LIGHT: 'LIGHT',
  LIGHT_AVOIDANCE: 'LIGHT_AVOIDANCE',
  SLEEP: 'SLEEP',
  NAP: 'NAP',
  WAKE: 'WAKE',
  CAFFEINE: 'CAFFEINE',
  CAFFEINE_CUTOFF: 'CAFFEINE_CUTOFF',
  MELATONIN_OPTIONAL: 'MELATONIN_OPTIONAL',
  MEAL: 'MEAL',
  HYDRATION: 'HYDRATION',
  EXERCISE: 'EXERCISE',
  WIND_DOWN: 'WIND_DOWN',
  ALCOHOL_CUTOFF: 'ALCOHOL_CUTOFF',
  NICOTINE_CUTOFF: 'NICOTINE_CUTOFF',
  EXERCISE_CUTOFF: 'EXERCISE_CUTOFF',
});
const CATEGORY_OF = Object.freeze({
  LIGHT: 'CIRCADIAN',
  LIGHT_AVOIDANCE: 'CIRCADIAN',
  MELATONIN_OPTIONAL: 'CIRCADIAN',
  SLEEP: 'SCHEDULE',
  WAKE: 'SCHEDULE',
  WIND_DOWN: 'SCHEDULE',
  CAFFEINE: 'SYMPTOMATIC',
  CAFFEINE_CUTOFF: 'SYMPTOMATIC',
  NAP: 'SYMPTOMATIC',
  MEAL: 'SYMPTOMATIC',
  HYDRATION: 'SYMPTOMATIC',
  EXERCISE: 'SYMPTOMATIC',
  ALCOHOL_CUTOFF: 'SYMPTOMATIC',
  NICOTINE_CUTOFF: 'SYMPTOMATIC',
  EXERCISE_CUTOFF: 'SYMPTOMATIC',
});
/**
 * Hygiène du sommeil : heures limites avant le coucher prévu (h). Valeurs prudentes, issues de :
 * - alcool : Ebrahim et al., Alcohol Clin Exp Res 2013 (sommeil fragmenté en 2e partie de nuit, REM réduit) ;
 *   élimination ≈ 1 verre standard par heure → 4 h couvrent 2 à 3 verres ; les recommandations d'hygiène
 *   du sommeil (AASM, NHS) conseillent d'éviter l'alcool dans les heures précédant le coucher ;
 * - nicotine : Jaehne et al., Sleep Med Rev 2009 (latence d'endormissement allongée, sommeil plus léger) ;
 *   demi-vie de la nicotine ≈ 2 h (Benowitz, Handb Exp Pharmacol 2009) ;
 * - sport intense : Stutz et al., Sports Med 2019 (méta-analyse : le sport du soir ne nuit pas au sommeil,
 *   sauf exercice intense terminé moins d'1 h avant le coucher) → marge de 2 h, l'heure de coucher étant
 *   elle-même incertaine en voyage.
 * Le moment conseillé pour l'activité physique suit la courbe de réponse de phase à l'exercice
 * (Youngstedt et al., J Physiol 2019 : matin et début d'après-midi avancent l'horloge, soir la retardent).
 */
const LIFESTYLE = Object.freeze({
  alcoholCutoffBeforeSleepH: 4,
  nicotineCutoffBeforeSleepH: 2,
  vigorousExerciseCutoffBeforeSleepH: 2,
});
const STRATEGY = Object.freeze({
  FULL_ADAPTATION: 'FULL_ADAPTATION',
  PARTIAL_ADAPTATION: 'PARTIAL_ADAPTATION',
  HOME_TIME_MAINTENANCE: 'HOME_TIME_MAINTENANCE',
});
const MODE = Object.freeze({ ADAPT: 'ADAPT', PERFORM: 'PERFORM' });
const wrap24 = (h) => ((h % 24) + 24) % 24;
const wrap12 = (h) => {
  let x = wrap24(h);
  if (x > 12) x -= 24;
  return x;
};
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const gauss = (x, mu, s) => Math.exp(-((x - mu) ** 2) / (2 * s * s));
/** Gaussienne circulaire sur 24 h. */
const circGauss = (x, mu, s) => gauss(wrap12(x - mu), 0, s);

export {
  MS_MIN,
  MS_H,
  MS_D,
  LIGHT_REC,
  INTERVENTION,
  CATEGORY_OF,
  LIFESTYLE,
  STRATEGY,
  MODE,
  wrap24,
  wrap12,
  clamp,
  gauss,
  circGauss,
};
