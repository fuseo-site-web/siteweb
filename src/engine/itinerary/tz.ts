/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck — typage interne progressif (PLAN §5.1.3) : les types publics sont dans ./types.ts

import { MS_MIN, MS_H } from '../constants';

const tzCache = new Map();
function tzFmt(tz) {
  let f = tzCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    tzCache.set(tz, f);
  }
  return f;
}
function isValidTz(tz) {
  try {
    tzFmt(tz);
    return true;
  } catch {
    return false;
  }
}
function rawParts(ms, tz) {
  const o = {};
  for (const p of tzFmt(tz).formatToParts(new Date(ms))) o[p.type] = p.value;
  return { y: +o.year, mo: +o.month, d: +o.day, h: +o.hour % 24, mi: +o.minute, s: +o.second };
}
const offCache = new Map();
const Q = 15 * MS_MIN;
/** Décalage UTC (minutes) du fuseau `tz` à l'instant `ms`. Gère le DST. */
function offsetMin(tz, ms) {
  const bucket = Math.floor(ms / Q);
  const key = tz + '|' + bucket;
  let v = offCache.get(key);
  if (v === undefined) {
    const t = bucket * Q;
    const p = rawParts(t, tz);
    v = Math.round((Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - t) / MS_MIN);
    if (offCache.size > 200000) offCache.clear();
    offCache.set(key, v);
  }
  return v;
}
function localParts(ms, tz) {
  const d = new Date(ms + offsetMin(tz, ms) * MS_MIN);
  return {
    y: d.getUTCFullYear(),
    mo: d.getUTCMonth() + 1,
    d: d.getUTCDate(),
    h: d.getUTCHours(),
    mi: d.getUTCMinutes(),
    s: d.getUTCSeconds(),
  };
}
/**
 * Heure locale -> UTC.
 * Heure inexistante (saut vers l'heure d'été) : projetée après le saut, flag `gap`.
 * Heure ambiguë (retour à l'heure d'hiver) : première occurrence, flag `ambiguous`.
 */
function localToUtc(y, mo, d, h, mi, tz) {
  const nd = new Date(Date.UTC(y, mo - 1, d));
  y = nd.getUTCFullYear();
  mo = nd.getUTCMonth() + 1;
  d = nd.getUTCDate();
  const g = Date.UTC(y, mo - 1, d, h, mi);
  const o1 = offsetMin(tz, g - 14 * MS_H),
    o2 = offsetMin(tz, g + 14 * MS_H);
  const c1 = g - o1 * MS_MIN,
    c2 = g - o2 * MS_MIN;
  const ok = (c) => {
    const p = localParts(c, tz);
    return p.y === y && p.mo === mo && p.d === d && p.h === h && p.mi === mi;
  };
  const v1 = ok(c1),
    v2 = ok(c2);
  if (v1 && v2 && c1 !== c2) return { utc: Math.min(c1, c2), ambiguous: true, gap: false };
  if (v1) return { utc: c1, ambiguous: false, gap: false };
  if (v2) return { utc: c2, ambiguous: false, gap: false };
  return { utc: Math.max(c1, c2), ambiguous: false, gap: true };
}
/** "2026-10-12T19:30" (heure locale de `tz`) -> {utc, gap, ambiguous} | null */
function parseLocal(str, tz) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(String(str || ''));
  if (!m) return null;
  return localToUtc(+m[1], +m[2], +m[3], +m[4], +m[5], tz);
}
const pad2 = (n) => String(n).padStart(2, '0');
function hhmm(ms, tz) {
  const p = localParts(ms, tz);
  return `${pad2(p.h)}:${pad2(p.mi)}`;
}
function isoLocal(ms, tz) {
  const p = localParts(ms, tz);
  return `${p.y}-${pad2(p.mo)}-${pad2(p.d)}T${pad2(p.h)}:${pad2(p.mi)}`;
}
function localClockHours(ms, tz) {
  const p = localParts(ms, tz);
  return p.h + p.mi / 60 + p.s / 3600;
}
function hoursToHHMM(h) {
  const x = ((h % 24) + 24) % 24;
  let H = Math.floor(x),
    M = Math.round((x - H) * 60);
  if (M === 60) {
    H = (H + 1) % 24;
    M = 0;
  }
  return `${pad2(H)}:${pad2(M)}`;
}
function utcIso(ms) {
  return new Date(ms).toISOString();
}
/** Prochain instant (>= ms) où l'horloge locale de tz indique hh:mm. */
function nextLocalClock(ms, tz, hours) {
  const p = localParts(ms, tz);
  const H = Math.floor(hours),
    Mi = Math.round((hours - H) * 60);
  for (let k = 0; k < 3; k++) {
    const c = localToUtc(p.y, p.mo, p.d + k, H, Mi, tz).utc;
    if (c >= ms) return c;
  }
  return ms;
}

export {
  isValidTz,
  offsetMin,
  localParts,
  localToUtc,
  parseLocal,
  hhmm,
  isoLocal,
  localClockHours,
  hoursToHHMM,
  utcIso,
  nextLocalClock,
};
