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
  STRATEGY,
  MODE,
  wrap24,
  wrap12,
  clamp,
  gauss,
  circGauss,
};
