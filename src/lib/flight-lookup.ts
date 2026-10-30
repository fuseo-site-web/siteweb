/** Recherche de vol par numéro : choix du vol le plus pertinent et reconstitution des horaires (pur, testable). */

export interface ProviderFlight {
  flight_date: string;
  departure: { iata: string | null; scheduled: string | null };
  arrival: { iata: string | null; scheduled: string | null };
}

export interface FlightMatch {
  from: string;
  to: string;
  depDate: string;
  depTime: string;
  arrDate: string;
  arrTime: string;
  /** Horaires reconstitués d'après un vol récent (la date demandée est hors de la fenêtre du fournisseur). */
  approx: boolean;
}

const DAY = 86_400_000;
const ymd = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const ms = (d: string) => Date.parse(`${d}T00:00:00Z`);
export const addDays = (d: string, n: number) => ymd(ms(d) + n * DAY);
const diffDays = (a: string, b: string) => Math.round((ms(a) - ms(b)) / DAY);

type Complete = Required<{ [K in keyof ProviderFlight]: ProviderFlight[K] }> & {
  departure: { iata: string; scheduled: string };
  arrival: { iata: string; scheduled: string };
};

const complete = (f: ProviderFlight): f is Complete =>
  !!(f.departure.iata && f.arrival.iata && f.departure.scheduled && f.arrival.scheduled);

// Le fournisseur donne l'heure locale de l'aéroport avec un suffixe de fuseau trompeur : on ne garde que date et heure.
const dateOf = (iso: string) => iso.slice(0, 10);
const timeOf = (iso: string) => iso.slice(11, 16);

/**
 * - date demandée présente dans les données : vol exact ;
 * - sinon : on reprend les horaires du vol le plus proche (les vols réguliers se répètent) en les décalant à la date demandée ;
 * - sans date : le prochain vol à venir (ou le plus récent).
 */
export function pickFlight(
  flights: ProviderFlight[],
  requestedDate: string | undefined,
  today: string,
): FlightMatch | null {
  const list = flights.filter(complete);
  if (!list.length) return null;
  const byProximity = (target: string) =>
    [...list].sort(
      (a, b) =>
        Math.abs(diffDays(dateOf(a.departure.scheduled), target)) -
        Math.abs(diffDays(dateOf(b.departure.scheduled), target)),
    );

  const target = requestedDate ?? today;
  const exact = list.find((f) => dateOf(f.departure.scheduled) === target);
  const upcoming = [...list]
    .filter((f) => dateOf(f.departure.scheduled) >= today)
    .sort((a, b) => a.departure.scheduled.localeCompare(b.departure.scheduled))[0];
  const base =
    exact ?? (requestedDate ? byProximity(target)[0]! : (upcoming ?? byProximity(today)[0]!));
  const baseDep = dateOf(base.departure.scheduled);
  const approx = !!requestedDate && !exact;
  const depDate = requestedDate ?? baseDep;
  const span = diffDays(dateOf(base.arrival.scheduled), baseDep);
  return {
    from: base.departure.iata,
    to: base.arrival.iata,
    depDate,
    depTime: timeOf(base.departure.scheduled),
    arrDate: addDays(depDate, span),
    arrTime: timeOf(base.arrival.scheduled),
    approx,
  };
}

/** Décalage (minutes) d'un fuseau IANA par rapport à UTC à l'instant `ms`. */
export function tzOffsetMin(tz: string, ms: number): number {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(ms));
  const g = (t: string) => Number(p.find((x) => x.type === t)!.value);
  return Math.round(
    (Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second')) - ms) /
      60_000,
  );
}

/** Instant UTC d'une date et d'une heure locales dans un fuseau (deux passes pour tenir compte des changements d'heure). */
export function localToUtc(date: string, time: string, tz: string): number {
  const guess = Date.parse(`${date}T${time}:00Z`);
  const first = guess - tzOffsetMin(tz, guess) * 60_000;
  return guess - tzOffsetMin(tz, first) * 60_000;
}

/** Durée réelle du vol et décalage horaire entre les deux aéroports (positif vers l'est). */
export function flightFacts(
  m: Pick<FlightMatch, 'depDate' | 'depTime' | 'arrDate' | 'arrTime'>,
  fromTz: string,
  toTz: string,
): { durationMin: number; shiftHours: number } {
  const dep = localToUtc(m.depDate, m.depTime, fromTz);
  const arr = localToUtc(m.arrDate, m.arrTime, toTz);
  return {
    durationMin: Math.round((arr - dep) / 60_000),
    shiftHours: (tzOffsetMin(toTz, arr) - tzOffsetMin(fromTz, dep)) / 60,
  };
}
