/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck — typage interne progressif (PLAN §5.1.3) : les types publics sont dans ./types.ts

import { MS_H, MS_MIN, LIGHT_REC, INTERVENTION } from '../constants';
import { locationAt } from '../itinerary';

const PRACTICALITY_DEFAULTS = Object.freeze({
  airportLeadH: 2.5, // arrivée à l'aéroport avant un vol (depuis le domicile / l'hôtel)
  connectionLeadH: 1.0, // être à la porte avant un vol de correspondance
  boardingSettleH: 0.5, // premières 30 min de vol : embarquement, décollage
  descentH: 0.75, // dernières 45 min : descente, atterrissage
  postArrivalH: 1.5, // débarquement, douane, trajet
  minSleepChunkH: 1.5,
  minLayoverSleepH: 8, // on ne programme un vrai sommeil en escale que si elle dure au moins 8 h
  earliestReasonableBedH: 19,
  latestReasonableWakeH: 11,
});
function solarElevation(lat, lon, ms) {
  const d = ms / 86400000 + 2440587.5 - 2451545.0; // jours depuis J2000
  const g = ((357.529 + 0.98560028 * d) * Math.PI) / 180;
  const q = 280.459 + 0.98564736 * d;
  const L = ((q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * Math.PI) / 180;
  const e = ((23.439 - 0.00000036 * d) * Math.PI) / 180;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const gmst = (((18.697374558 + 24.06570982441908 * d) % 24) + 24) % 24;
  const lst = ((gmst * 15 + lon) * Math.PI) / 180;
  const ha = lst - ra,
    phi = (lat * Math.PI) / 180;
  const el = Math.asin(
    Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(ha),
  );
  return (el * 180) / Math.PI;
}
/** Lumière du jour exploitable (soleil > 0°). Sans coordonnées : hypothèse prudente 07:00-19:00 locale. */
function isDaylight(lat, lon, ms, fallbackLocalHour) {
  if (lat == null || lon == null)
    return fallbackLocalHour != null ? fallbackLocalHour >= 7 && fallbackLocalHour < 19 : true;
  return solarElevation(lat, lon, ms) > 0;
}
/** Intervalles pendant lesquels dormir (ou faire la sieste) est impossible. */
function blockedIntervals(it, ctx = {}, P = PRACTICALITY_DEFAULTS) {
  const out = [];
  it.legs.forEach((l, i) => {
    const prev = it.legs[i - 1];
    const connecting = prev && l.depUtc - prev.arrUtc < 24 * MS_H && prev.group === l.group;
    out.push({
      a: l.depUtc - (connecting ? P.connectionLeadH : P.airportLeadH) * MS_H,
      b: l.depUtc + P.boardingSettleH * MS_H,
      why: 'BOARDING',
    });
    out.push({
      a: l.arrUtc - P.descentH * MS_H,
      b:
        l.arrUtc +
        (it.legs[i + 1] && it.legs[i + 1].depUtc - l.arrUtc < 24 * MS_H ? 0.25 : P.postArrivalH) *
          MS_H,
      why: 'ARRIVAL',
    });
  });
  for (const lay of it.layovers) {
    if (lay.durationH < P.minLayoverSleepH) out.push({ a: lay.start, b: lay.end, why: 'LAYOVER' });
  }
  for (const w of ctx.blockedWindows || [])
    out.push({ a: w.start, b: w.end, why: w.label || 'USER' });
  for (const ev of it.events || [])
    out.push({
      a: ev.start - (P.eventBufferBeforeH ?? 1.5) * MS_H,
      b: ev.end + (P.eventBufferAfterH ?? 0.5) * MS_H,
      why: 'EVENT',
    });
  return out.sort((x, y) => x.a - y.a);
}
function subtractIntervals(a, b, cuts) {
  let parts = [{ a, b }];
  for (const c of cuts) {
    const nx = [];
    for (const p of parts) {
      if (c.b <= p.a || c.a >= p.b) {
        nx.push(p);
        continue;
      }
      if (c.a > p.a) nx.push({ a: p.a, b: c.a });
      if (c.b < p.b) nx.push({ a: c.b, b: p.b });
    }
    parts = nx;
  }
  return parts;
}
/**
 * Faisabilité d'une recommandation.
 * @param {{type:string, start:number, end:number, recommendation?:string}} event
 * @param {object} it itinéraire normalisé
 * @param {{now?:number, hasLightBox?:boolean, blockedWindows?:Array}} userContext
 * @returns {{feasible:boolean, reason?:string, setting?:string, alternative?:object, adjusted?:{start:number,end:number}}}
 */
function isRecommendationFeasible(event, it, userContext = {}, P = PRACTICALITY_DEFAULTS) {
  const { type, start, end } = event;
  const mid = (start + end) / 2;
  const loc = locationAt(it, mid);
  const blocked = blockedIntervals(it, userContext, P);
  const overlaps = (a, b) => blocked.find((x) => x.a < b && x.b > a);
  const inEvent = (it.events || []).find(
    (e) => start < e.end && end > e.start && mid >= e.start - 0.25 * MS_H && mid < e.end,
  );
  if (
    inEvent &&
    [
      INTERVENTION.LIGHT,
      INTERVENTION.LIGHT_AVOIDANCE,
      INTERVENTION.WIND_DOWN,
      INTERVENTION.EXERCISE,
      INTERVENTION.MEAL,
      INTERVENTION.MELATONIN_OPTIONAL,
    ].includes(type)
  )
    return { feasible: false, reason: 'EVENT' };
  if (type === INTERVENTION.LIGHT) {
    if (loc.inFlight) {
      const sunUp = isDaylight(loc.lat, loc.lon, mid);
      return {
        feasible: true,
        setting: sunUp ? 'CABIN_WINDOW' : 'CABIN',
        alternative: sunUp ? { hint: 'WINDOW_SHADE_OPEN' } : { hint: 'CABIN_OR_SCREEN_LIGHT' },
      };
    }
    const sunUpStart = isDaylight(loc.lat, loc.lon, start),
      sunUpEnd = isDaylight(loc.lat, loc.lon, end);
    if (sunUpStart && sunUpEnd) return { feasible: true, setting: 'OUTDOOR' };
    if (sunUpStart !== sunUpEnd || isDaylight(loc.lat, loc.lon, mid))
      return {
        feasible: true,
        setting: 'OUTDOOR_PARTIAL',
        alternative: {
          hint: userContext.hasLightBox ? 'LIGHT_BOX' : 'LIGHT_BOX_OR_BRIGHT_ROOM',
          when: sunUpStart ? 'AFTER_SUNSET' : 'BEFORE_SUNRISE',
        },
      };
    if (userContext.hasLightBox)
      return { feasible: true, setting: 'LIGHT_BOX', alternative: { hint: 'LIGHT_BOX' } };
    return {
      feasible: true,
      setting: 'INDOOR_BRIGHT',
      alternative: { hint: 'LIGHT_BOX_OR_BRIGHT_ROOM' },
      reason: 'NO_DAYLIGHT',
    };
  }
  if (type === INTERVENTION.LIGHT_AVOIDANCE) {
    if (loc.inFlight) return { feasible: true, setting: 'EYE_MASK' };
    return {
      feasible: true,
      setting: isDaylight(loc.lat, loc.lon, mid) ? 'SUNGLASSES' : 'DIM_INDOOR',
    };
  }
  if (type === INTERVENTION.NAP) {
    if (loc.layover) return { feasible: false, reason: 'CONNECTION' };
    const b = overlaps(start, end);
    if (b) return { feasible: false, reason: b.why };
    return { feasible: true, setting: loc.inFlight ? 'IN_FLIGHT' : 'BED' };
  }
  if (type === INTERVENTION.SLEEP) {
    const parts = subtractIntervals(start, end, blocked).filter(
      (p) => p.b - p.a >= P.minSleepChunkH * MS_H,
    );
    if (!parts.length) return { feasible: false, reason: 'NO_SLEEP_OPPORTUNITY' };
    const best = parts.reduce((x, y) => (y.b - y.a > x.b - x.a ? y : x));
    const changed = best.a !== start || best.b !== end;
    return {
      feasible: true,
      adjusted: changed ? { start: best.a, end: best.b } : undefined,
      setting: loc.inFlight ? 'IN_FLIGHT' : 'BED',
    };
  }
  if (type === INTERVENTION.EXERCISE) {
    if (loc.inFlight)
      return { feasible: true, setting: 'CABIN_STRETCH', alternative: { hint: 'CABIN_STRETCH' } };
    {
      const b = overlaps(start, end);
      if (b) return { feasible: false, reason: b.why === 'EVENT' ? 'EVENT' : 'TRAVEL' };
    }
    return {
      feasible: true,
      setting: isDaylight(loc.lat, loc.lon, mid) ? 'OUTDOOR_WALK' : 'INDOOR',
    };
  }
  if (type === INTERVENTION.MEAL)
    return { feasible: true, setting: loc.inFlight ? 'CABIN_SERVICE' : 'NORMAL' };
  if (type === INTERVENTION.MELATONIN_OPTIONAL || type === INTERVENTION.CAFFEINE) {
    const b = blocked.find((x) => x.a <= start && x.b > start && x.why === 'BOARDING');
    return b ? { feasible: true, setting: 'CARRY_ON' } : { feasible: true };
  }
  return { feasible: true };
}

export {
  LIGHT_REC,
  MS_MIN,
  PRACTICALITY_DEFAULTS,
  solarElevation,
  isDaylight,
  blockedIntervals,
  subtractIntervals,
  isRecommendationFeasible,
};
