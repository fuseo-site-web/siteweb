/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck — typage interne progressif (PLAN §5.1.3) : les types publics sont dans ./types.ts

import { MS_H, MS_MIN, MS_D, wrap12 } from '../constants';
import { parseLocal, offsetMin, isValidTz, isoLocal, utcIso, localParts } from './tz';
import { AIRPORT_COORDS } from './airports';

const MAX_FLIGHT_H = 22;
function normPlace(p) {
  if (!p) return null;
  const code = p.code ? String(p.code).toUpperCase() : null;
  const c = code && AIRPORT_COORDS[code];
  return {
    code,
    tz: p.tz,
    city: p.city || code || p.tz,
    lat: p.lat ?? (c ? c[0] : null),
    lon: p.lon ?? (c ? c[1] : null),
  };
}
function toUtcField(v, tz, errs, label) {
  if (typeof v === 'number') return { utc: v, gap: false, ambiguous: false };
  const r = parseLocal(v, tz);
  if (!r) errs.push({ code: 'BAD_DATETIME', message: `${label} : date/heure invalide.` });
  return r;
}
/** Vrai si l'arc (grand cercle simplifié en longitude) traverse l'antiméridien. */
function crossesDateLine(lon1, lon2) {
  if (lon1 == null || lon2 == null) return false;
  return Math.abs(lon1 - lon2) > 180;
}
/** Position approximative sur le grand cercle entre deux points, fraction f ∈ [0,1]. */
function greatCirclePoint(lat1, lon1, lat2, lon2, f) {
  const r = Math.PI / 180;
  const φ1 = lat1 * r,
    λ1 = lon1 * r,
    φ2 = lat2 * r,
    λ2 = lon2 * r;
  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((φ2 - φ1) / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2,
      ),
    );
  if (d < 1e-9) return { lat: lat1, lon: lon1 };
  const A = Math.sin((1 - f) * d) / Math.sin(d),
    B = Math.sin(f * d) / Math.sin(d);
  const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
  const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
  const z = A * Math.sin(φ1) + B * Math.sin(φ2);
  return { lat: Math.atan2(z, Math.hypot(x, y)) / r, lon: Math.atan2(y, x) / r };
}
/**
 * Construit l'itinéraire normalisé.
 * @param {object} input { homeTz?, outbound:[leg], return?:[leg], events?:[{label, local, tz, durationMin, importance}] }
 *   leg = { from:{code,tz,city,lat,lon}, to:{...}, departure:"YYYY-MM-DDTHH:mm" (heure locale départ) | ms UTC,
 *           arrival:"YYYY-MM-DDTHH:mm" (heure locale arrivée) | ms UTC, flightNumber? }
 */
function buildItinerary(input) {
  const errors = [],
    warnings = [];
  const groups = [
    ['OUTBOUND', input.outbound || input.legs || []],
    ['RETURN', input.return || []],
  ];
  const legs = [];
  for (const [group, list] of groups) {
    list.forEach((raw, i) => {
      const from = normPlace(raw.from),
        to = normPlace(raw.to);
      const label = `${group === 'OUTBOUND' ? 'Aller' : 'Retour'} ${i + 1}`;
      if (!from || !to || !isValidTz(from.tz) || !isValidTz(to.tz)) {
        errors.push({ code: 'BAD_TZ', message: `${label} : fuseau horaire IANA invalide.` });
        return;
      }
      const dep = toUtcField(raw.departure, from.tz, errors, label),
        arr = toUtcField(raw.arrival, to.tz, errors, label);
      if (!dep || !arr) return;
      if (dep.gap || arr.gap)
        warnings.push({
          code: 'DST_GAP',
          message: `${label} : une heure saisie n'existe pas (passage à l'heure d'été) ; elle a été décalée.`,
        });
      if (dep.ambiguous || arr.ambiguous)
        warnings.push({
          code: 'DST_AMBIGUOUS',
          message: `${label} : heure ambiguë (retour à l'heure d'hiver) ; la première occurrence a été retenue.`,
        });
      const durationH = (arr.utc - dep.utc) / MS_H;
      if (durationH <= 0) {
        errors.push({
          code: 'ARRIVAL_BEFORE_DEPARTURE',
          message: `${label} : l'arrivée tombe avant le départ une fois les fuseaux pris en compte.`,
        });
        return;
      }
      if (durationH > MAX_FLIGHT_H) {
        errors.push({
          code: 'FLIGHT_TOO_LONG',
          message: `${label} : plus de ${MAX_FLIGHT_H} h de vol, vérifiez les dates.`,
        });
        return;
      }
      const depL = localParts(dep.utc, from.tz),
        arrL = localParts(arr.utc, to.tz);
      const localDateChangeDays = Math.round(
        (Date.UTC(arrL.y, arrL.mo - 1, arrL.d) - Date.UTC(depL.y, depL.mo - 1, depL.d)) / MS_D,
      );
      legs.push({
        id: `${group[0]}${i + 1}`,
        group,
        index: i,
        flightNumber: raw.flightNumber || null,
        from,
        to,
        depUtc: dep.utc,
        arrUtc: arr.utc,
        durationH,
        tzShiftHours: (offsetMin(to.tz, arr.utc) - offsetMin(from.tz, dep.utc)) / 60,
        crossesDateLine: crossesDateLine(from.lon, to.lon),
        localDateChangeDays,
      });
    });
  }
  if (errors.length) return { ok: false, errors, warnings };
  if (!legs.length)
    return { ok: false, errors: [{ code: 'NO_FLIGHT', message: 'Aucun vol.' }], warnings };
  legs.sort((a, b) => a.depUtc - b.depUtc);
  for (let i = 1; i < legs.length; i++) {
    if (legs[i].depUtc < legs[i - 1].arrUtc)
      errors.push({
        code: 'OVERLAP',
        message: `Le vol ${legs[i].id} part avant l'arrivée du vol précédent.`,
      });
    else if (legs[i].from.tz !== legs[i - 1].to.tz && legs[i].from.code !== legs[i - 1].to.code)
      warnings.push({
        code: 'DISCONTINUITY',
        message: `Le vol ${legs[i].id} ne part pas de l'aéroport d'arrivée du vol précédent.`,
      });
  }
  if (errors.length) return { ok: false, errors, warnings };
  const out = legs.filter((l) => l.group === 'OUTBOUND'),
    ret = legs.filter((l) => l.group === 'RETURN');
  const homeTz = input.homeTz && isValidTz(input.homeTz) ? input.homeTz : legs[0].from.tz;
  const home = legs[0].from;
  const dest = out[out.length - 1].to;
  const final = ret.length ? ret[ret.length - 1].to : dest;
  const layovers = [];
  for (const g of [out, ret])
    for (let i = 1; i < g.length; i++) {
      layovers.push({
        place: g[i - 1].to,
        tz: g[i - 1].to.tz,
        start: g[i - 1].arrUtc,
        end: g[i].depUtc,
        durationH: (g[i].depUtc - g[i - 1].arrUtc) / MS_H,
        group: g[i].group,
      });
    }
  const stay = ret.length
    ? {
        place: dest,
        tz: dest.tz,
        start: out[out.length - 1].arrUtc,
        end: ret[0].depUtc,
        durationH: (ret[0].depUtc - out[out.length - 1].arrUtc) / MS_H,
      }
    : {
        place: dest,
        tz: dest.tz,
        start: out[out.length - 1].arrUtc,
        end: Infinity,
        durationH: Infinity,
      };
  if (stay.durationH < 0)
    return {
      ok: false,
      errors: [{ code: 'NEGATIVE_STAY', message: 'Le retour part avant l’arrivée à destination.' }],
      warnings,
    };
  const firstDep = legs[0].depUtc,
    lastArr = legs[legs.length - 1].arrUtc;
  const shiftOutHours = wrap12((offsetMin(dest.tz, stay.start) - offsetMin(homeTz, firstDep)) / 60);
  const shiftBackHours = ret.length
    ? wrap12((offsetMin(final.tz, lastArr) - offsetMin(dest.tz, ret[0].depUtc)) / 60)
    : 0;
  const events = (input.events || [])
    .map((e, i) => {
      const tz = e.tz || dest.tz;
      const r = typeof e.local === 'number' ? { utc: e.local } : parseLocal(e.local, tz);
      if (!r) {
        warnings.push({
          code: 'BAD_EVENT',
          message: `Événement « ${e.label || i + 1} » : date invalide, ignoré.`,
        });
        return null;
      }
      return {
        id: e.id || `EV${i + 1}`,
        label: e.label || 'Événement',
        tz,
        start: r.utc,
        end: r.utc + (e.durationMin ?? 120) * MS_MIN,
        importance: e.importance || 'critical',
      };
    })
    .filter(Boolean);
  const it = {
    ok: true,
    errors,
    warnings,
    homeTz,
    home,
    dest,
    destTz: dest.tz,
    final,
    finalTz: final.tz,
    legs,
    outbound: out,
    returnLegs: ret,
    layovers,
    stay,
    events,
    isRoundTrip: ret.length > 0,
    firstDep,
    lastArr,
    shiftOutHours,
    shiftBackHours,
    crossesDateLine: legs.some((l) => l.crossesDateLine),
  };
  it.locationAt = (t) => locationAt(it, t);
  return it;
}
/** Où est le voyageur à l'instant t ? {tz, place, inFlight, leg, layover, lat, lon, phase} */
function locationAt(it, t) {
  if (t < it.firstDep)
    return {
      tz: it.homeTz,
      place: it.home,
      inFlight: false,
      phase: 'PRE',
      lat: it.home.lat,
      lon: it.home.lon,
    };
  let cur = { tz: it.homeTz, place: it.home, phase: 'PRE' };
  for (const l of it.legs) {
    if (t >= l.depUtc && t < l.arrUtc) {
      const f = (t - l.depUtc) / (l.arrUtc - l.depUtc);
      const pos =
        l.from.lat != null && l.to.lat != null
          ? greatCirclePoint(l.from.lat, l.from.lon, l.to.lat, l.to.lon, f)
          : { lat: null, lon: null };
      return {
        tz: l.to.tz,
        place: null,
        inFlight: true,
        leg: l,
        lat: pos.lat,
        lon: pos.lon,
        phase: 'FLIGHT',
      };
    }
    if (t >= l.arrUtc)
      cur = {
        tz: l.to.tz,
        place: l.to,
        lat: l.to.lat,
        lon: l.to.lon,
        phase: l.group === 'RETURN' ? 'RETURN' : 'STAY',
      };
  }
  const lay = it.layovers.find((x) => t >= x.start && t < x.end);
  if (lay) return { ...cur, inFlight: false, layover: lay, phase: 'LAYOVER' };
  if (it.isRoundTrip && t >= it.lastArr) cur.phase = 'POST';
  return { ...cur, inFlight: false };
}
/** Représentation d'un instant dans les 4 référentiels demandés (le 4ᵉ — heure biologique — est ajouté par le moteur). */
function timeFrames(it, t) {
  const loc = locationAt(it, t);
  return {
    utc: utcIso(t),
    local: isoLocal(t, loc.tz),
    localTz: loc.tz,
    home: isoLocal(t, it.homeTz),
    homeTz: it.homeTz,
    destination: isoLocal(t, it.destTz),
    destinationTz: it.destTz,
  };
}
/** Classement vol de nuit / vol de jour selon le chevauchement avec la nuit habituelle (heure du domicile) ou la nuit locale de départ. */
function classifyFlight(leg, homeTz, bedH = 23, wakeH = 7) {
  let nightH = 0;
  for (let t = leg.depUtc; t < leg.arrUtc; t += 15 * MS_MIN) {
    const p = localParts(t, leg.from.tz);
    const h = p.h + p.mi / 60;
    const inNight = bedH > wakeH ? h >= bedH || h < wakeH : h >= bedH && h < wakeH;
    if (inNight) nightH += 0.25;
  }
  return nightH >= Math.min(3, leg.durationH / 2) ? 'NIGHT' : 'DAY';
}

export {
  AIRPORT_COORDS,
  crossesDateLine,
  greatCirclePoint,
  buildItinerary,
  locationAt,
  timeFrames,
  classifyFlight,
};
export * from './tz';
