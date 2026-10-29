/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck — typage interne progressif (PLAN §5.1.3) : les types publics sont dans ./types.ts

import { wrap24, clamp } from '../constants';
import { hoursToHHMM, isValidTz } from '../itinerary/tz';

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
  const bed = parseClock(input.usualBedtime),
    wake = parseClock(input.usualWakeTime);
  if (!Number.isFinite(bed) || !Number.isFinite(wake))
    errors.push({
      code: 'SLEEP_TIMES',
      message: 'Indiquez vos heures habituelles de coucher et de lever.',
    });
  const span = Number.isFinite(bed) && Number.isFinite(wake) ? wrap24(wake - bed) : NaN;
  let sleepDuration =
    Number.isFinite(+input.sleepDuration) && +input.sleepDuration > 0 ? +input.sleepDuration : span;
  if (Number.isFinite(span) && (span < 4 || span > 12))
    errors.push({
      code: 'SLEEP_SPAN',
      message: 'La durée entre coucher et lever doit être comprise entre 4 et 12 heures.',
    });
  sleepDuration = clamp(sleepDuration || 8, 4, 12);
  const chronotype = ['morning', 'intermediate', 'evening'].includes(input.chronotype)
    ? input.chronotype
    : 'unknown';
  const age = Number.isFinite(+input.age) && +input.age > 0 ? Math.round(+input.age) : null;
  if (input.timezone && !isValidTz(input.timezone))
    errors.push({ code: 'BAD_TZ', message: 'Fuseau horaire du domicile invalide.' });
  if (errors.length) return { profile: null, errors };
  let midsleep = wrap24(bed + span / 2),
    usedFreeDays = false;
  const fb = parseClock(input.freeDayBedtime),
    fw = parseClock(input.freeDayWakeTime);
  if (Number.isFinite(fb) && Number.isFinite(fw)) {
    const sdf = wrap24(fw - fb);
    const msf = wrap24(fb + sdf / 2);
    midsleep = wrap24(msf - Math.max(0, sdf - span) / 2);
    usedFreeDays = true;
  }
  const P = PROFILE_DEFAULTS;
  let dlmo = wrap24(midsleep - P.dlmoToMidsleepH + P.chronotypePhaseAngleAdjH[chronotype]);
  if (age != null && age >= 65) dlmo = wrap24(dlmo - 0.5); // phase plus précoce rapportée chez le sujet âgé (hypothèse modélisée)
  const nadir = wrap24(dlmo + P.dlmoToNadirH);
  let conf = 0.5;
  if (chronotype !== 'unknown') conf += 0.08;
  if (usedFreeDays) conf += 0.1;
  if (age != null) conf += 0.04;
  if (input.sleepQuality === 'good') conf += 0.05;
  else if (input.sleepQuality === 'poor') conf -= 0.08;
  if (chronotype === 'morning' && midsleep > 4.5 && midsleep < 12) conf -= 0.08;
  if (chronotype === 'evening' && (midsleep < 3 || midsleep > 20)) conf -= 0.08;
  if (Math.abs(sleepDuration - span) > 1) conf -= 0.05;
  conf = clamp(conf, 0.25, 0.8);
  const dlmoUncertaintyH = +(2.2 - 1.8 * conf).toFixed(2); // ≈ ±0,8 à ±1,7 h
  const profile = {
    usualBedtime: hoursToHHMM(bed),
    usualWakeTime: hoursToHHMM(wake),
    usualBedtimeH: bed,
    usualWakeTimeH: wake,
    sleepDuration: +sleepDuration.toFixed(2),
    timeInBedH: +span.toFixed(2),
    chronotype,
    age,
    napHabit: ['never', 'sometimes', 'often'].includes(input.napHabit)
      ? input.napHabit
      : 'sometimes',
    sleepQuality: ['good', 'fair', 'poor'].includes(input.sleepQuality)
      ? input.sleepQuality
      : 'fair',
    caffeineUse: ['none', 'low', 'moderate', 'high'].includes(input.caffeineUse)
      ? input.caffeineUse
      : 'low',
    melatoninPreference: ['yes', 'no', 'ask'].includes(input.melatoninPreference)
      ? input.melatoninPreference
      : 'no',
    timezone: input.timezone || null,
    midsleepH: +midsleep.toFixed(2),
    estimatedDLMO: {
      clock: hoursToHHMM(dlmo),
      hours: +dlmo.toFixed(2),
      isEstimate: true,
      uncertaintyH: dlmoUncertaintyH,
      method: usedFreeDays ? 'MSF_SC' : 'MIDSLEEP',
    },
    estimatedCircadianNadir: {
      clock: hoursToHHMM(nadir),
      hours: +nadir.toFixed(2),
      isEstimate: true,
      uncertaintyH: dlmoUncertaintyH,
    },
    confidenceScore: +conf.toFixed(2),
    model: {
      tauH: P.tauByChronotype[chronotype],
      lightSensitivity: age != null && age >= 60 ? 0.85 : 1,
      shortSleeper: sleepDuration < 6.5,
      longSleeper: sleepDuration > 9,
    },
    disclaimer:
      'DLMO et nadir circadien estimés à partir des horaires déclarés ; ce ne sont pas des mesures biologiques.',
  };
  return { profile, errors: [] };
}

export { PROFILE_DEFAULTS, parseClock, buildCircadianProfile };
