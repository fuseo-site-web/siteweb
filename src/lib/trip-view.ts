import { parseFlight, type Airline } from '@/lib/airlines';
import { cityName, getAirport } from '@/lib/airports';
import type { PlanInput } from '@/lib/plan-schema';

export type TripStatus = 'upcoming' | 'ongoing' | 'past';

export interface TicketView {
  id: string;
  ref: string;
  from: { code: string; city: string };
  to: { code: string; city: string };
  departLocal: string; // YYYY-MM-DDTHH:mm (heure locale de l'aéroport)
  arriveLocal: string;
  returnLeg: { from: string; to: string; departLocal: string } | null;
  airline: Airline | null;
  flight: string | null;
  stops: number;
  /** Décalage horaire aller (heures, signé : positif = vers l'est). */
  shiftHours: number;
  /** Fuseaux traversés sur l'ensemble du voyage (aller + retour). */
  zonesCrossed: number;
  status: TripStatus;
  /** Jours avant le départ (0 = aujourd'hui) ; négatif si déjà parti. */
  daysUntil: number;
}

/** Décalage UTC (en minutes) d'un fuseau à un instant donné. */
function offsetMinutes(tz: string, localIso: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    timeZoneName: 'longOffset',
  }).formatToParts(new Date(`${localIso}:00Z`));
  const m = /GMT([+-])(\d{2}):?(\d{2})?/.exec(
    parts.find((p) => p.type === 'timeZoneName')?.value ?? '',
  );
  if (!m) return 0;
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}

const dayNumber = (isoDate: string) => Math.floor(Date.parse(`${isoDate}T00:00:00Z`) / 864e5);

export function buildTicket(
  id: string,
  input: PlanInput,
  locale: string,
  now = new Date(),
): TicketView {
  const out = input.outbound;
  const first = out[0]!;
  const last = out.at(-1)!;
  const ret = input.return[0];
  const point = (code: string) => {
    const a = getAirport(code);
    return { code, city: a ? cityName(a, locale) : code };
  };
  const tzOf = (code: string) => getAirport(code)?.tz ?? 'UTC';
  const shiftMin =
    offsetMinutes(tzOf(last.to), last.arrival) - offsetMinutes(tzOf(first.from), first.departure);
  const shiftHours = Math.round((shiftMin / 60) * 2) / 2;

  const flight = out.map((l) => parseFlight(l.flightNumber)).find(Boolean) ?? null;
  const today = dayNumber(now.toISOString().slice(0, 10));
  const startDay = dayNumber(first.departure.slice(0, 10));
  const endDay = Math.max(
    ...[...out, ...input.return].map((l) => dayNumber(l.arrival.slice(0, 10))),
  );
  const status: TripStatus = endDay < today ? 'past' : startDay <= today ? 'ongoing' : 'upcoming';

  return {
    id,
    ref: `FU-${id.replaceAll('-', '').slice(0, 6).toUpperCase()}`,
    from: point(first.from),
    to: point(last.to),
    departLocal: first.departure,
    arriveLocal: last.arrival,
    returnLeg: ret
      ? { from: ret.from, to: input.return.at(-1)!.to, departLocal: ret.departure }
      : null,
    airline: flight?.airline ?? null,
    flight: flight?.display ?? null,
    stops: out.length - 1,
    shiftHours,
    zonesCrossed: Math.round(Math.abs(shiftHours)) * (input.return.length ? 2 : 1),
    status,
    daysUntil: startDay - today,
  };
}

/** À venir : le plus proche d'abord ; passés : le plus récent d'abord. Un voyage en cours reste dans « à venir ». */
export function splitTickets(tickets: TicketView[]) {
  const upcoming = tickets
    .filter((t) => t.status !== 'past')
    .sort((a, b) => a.departLocal.localeCompare(b.departLocal));
  const past = tickets
    .filter((t) => t.status === 'past')
    .sort((a, b) => b.departLocal.localeCompare(a.departLocal));
  return { upcoming, past };
}
