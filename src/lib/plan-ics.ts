import type { DayItem, PlanResponse } from '@/lib/plan-view';

/** Recommandations qui méritent une alerte sur le téléphone (au moment indiqué). */
const ALERT = new Set([
  'wake',
  'sleep',
  'sleepf',
  'seek',
  'avoid',
  'nap',
  'caf',
  'alc',
  'smoke',
  'sportcut',
  'breakfast1',
]);
/** Durée par défaut (min) d'une consigne ponctuelle (heure limite, repas) dans l'agenda. */
const POINT_MIN = 15;

const stamp = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
/** Échappement RFC 5545 (texte). */
const esc = (s: string) =>
  s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Plie les lignes à 75 octets (RFC 5545 §3.1), sans couper un caractère UTF-8. */
function fold(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let cur = '';
  for (const ch of line) {
    const limit = parts.length ? 74 : 75;
    if (enc.encode(cur + ch).length > limit) {
      parts.push(cur);
      cur = ch;
    } else cur += ch;
  }
  parts.push(cur);
  return parts.join('\r\n ');
}

/**
 * Fichier agenda (.ics) des recommandations horaires : un événement par consigne, en heure UTC
 * (le téléphone l'affiche dans le fuseau où il se trouve), avec une alerte sur les consignes clés.
 */
export function buildPlanIcs({
  plan,
  labelFor,
  title,
  now = new Date(),
}: {
  plan: PlanResponse;
  labelFor: (it: DayItem) => string;
  title: string;
  now?: Date;
}): string {
  const dtstamp = stamp(now.toISOString());
  const seed = `${plan.home}-${plan.destination}-${plan.days[0]?.date ?? ''}`
    .normalize('NFD')
    .replace(/[^\w-]/g, '')
    .toLowerCase();
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Fuseo//Plan anti-jet lag//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(title)}`,
  ];
  let n = 0;
  for (const d of plan.days)
    for (const it of d.list) {
      if (!it.iso) continue;
      const start = it.iso;
      const end = it.isoEnd ?? new Date(Date.parse(start) + POINT_MIN * 60_000).toISOString();
      const label = labelFor(it);
      const when = it.end ? `${it.at}–${it.end}` : it.at;
      lines.push(
        'BEGIN:VEVENT',
        `UID:${seed}-${++n}@fuseo.net`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART:${stamp(start)}`,
        `DTEND:${stamp(end)}`,
        `SUMMARY:${esc(`Fuseo · ${label}`)}`,
        `DESCRIPTION:${esc(`${label} (${when}, heure locale du plan). ${title}.`)}`,
        // Les consignes n'occupent pas l'agenda : elles ne bloquent pas les autres rendez-vous.
        `TRANSP:${it.t === 'flight' ? 'OPAQUE' : 'TRANSPARENT'}`,
        `CATEGORIES:Fuseo`,
      );
      if (ALERT.has(it.t))
        lines.push(
          'BEGIN:VALARM',
          'ACTION:DISPLAY',
          'TRIGGER:PT0M',
          `DESCRIPTION:${esc(label)}`,
          'END:VALARM',
        );
      lines.push('END:VEVENT');
    }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
