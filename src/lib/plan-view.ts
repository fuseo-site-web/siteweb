import { generateCircadianPlan } from '@/engine';
import { cityName, getAirport } from '@/lib/airports';
import type { LegInput, PlanInput } from '@/lib/plan-schema';

export const FREE_DAYS = 3;

interface Frames {
  local: string;
}
interface Intervention {
  type: string;
  start: number;
  end: number;
  endUtc: string;
  durationMin: number;
  inFlight: boolean;
  feasible?: boolean;
  localTz: string;
  frames: Frames;
  rationale?: { code?: string };
  meal?: 'BREAKFAST' | 'LUNCH' | 'DINNER';
}
interface Dashboard {
  t: number;
  bodyClock: { city: string; time: string };
  localClock: { city: string; time: string };
  estimatedResidualJetLag: { hours: number; label: string; direction: string };
  adaptation: number;
  alertness: number | null;
}
interface EngineDay {
  date: string;
  tz: string;
  start: number;
  end: number;
  interventionIds: string[];
  dashboardNoon: Dashboard | null;
}
interface EngineLeg {
  id: string;
  from: { code: string };
  to: { code: string };
  group: string;
  departure: { utc: string };
  arrival: { utc: string };
}
export interface EngineResult {
  ok: boolean;
  errors?: Array<{ code: string }>;
  interventions: Array<Intervention & { id: string }>;
  days: EngineDay[];
  itinerary: {
    homeTz: string;
    destTz: string;
    home: { code: string; city: string };
    destination: { code: string; city: string };
    shiftOutHours: number;
    isRoundTrip: boolean;
    legs: EngineLeg[];
  };
  strategy: { chosen: string; direction: string; targetShiftH: number };
  dashboard: { atArrival: Dashboard | null };
  safety: { notes: Array<{ code: string }> };
}

export interface DayItem {
  t: string;
  at: string;
  end: string | null;
  iso?: string;
  isoEnd?: string;
  n?: number;
  from?: string;
  to?: string;
}
export interface DayView {
  key: string;
  date: string;
  tz: string;
  startH: number;
  lenH: number;
  kind: 'before' | 'flight' | 'stay';
  segs: Array<{ t: string; a: number; b: number }>;
  marks: Array<{ t: string; a: number }>;
  list: DayItem[];
  noon: Dashboard | null;
}
export interface PlanResponse {
  ok: true;
  home: string;
  destination: string;
  shiftHours: number;
  direction: string;
  strategy: string;
  targetShiftH: number;
  totalDays: number;
  lockedDays: number;
  arrival: Dashboard | null;
  /** Conseils liés à l'âge, au mode de vie et à la santé (codes traduits à l'affichage). */
  advice: string[];
  days: DayView[];
}

const hhmm = (ms: number, tz: string) =>
  new Intl.DateTimeFormat('fr-FR', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(ms));

function toEngineLegs(legs: LegInput[]) {
  return legs.map((l) => {
    const f = getAirport(l.from);
    const t = getAirport(l.to);
    if (!f || !t) throw new Error('unknown_airport');
    return {
      from: { code: f.code, tz: f.tz, city: f.city },
      to: { code: t.code, tz: t.tz, city: t.city },
      departure: l.departure,
      arrival: l.arrival,
      ...(l.flightNumber ? { flightNumber: l.flightNumber } : {}),
    };
  });
}

/** Conseils personnalisés, du plus important au moins important. */
export function adviceFor(input: PlanInput): string[] {
  const h = input.health ?? {};
  const age = input.profile.age ?? null;
  const out: string[] = [];
  if (h.pregnant) out.push('pregnant');
  if (age != null && age < 18) out.push('minor');
  if (h.heartCondition) out.push('heart');
  if (h.sleepApnea) out.push('apnea');
  if (h.bipolar) out.push('bipolar');
  if (h.eyeCondition) out.push('eye');
  if (h.oralContraceptive) out.push('pill');
  if (age != null && age >= 65) out.push('senior');
  else if (age != null && age >= 50) out.push('fifty');
  if (input.smoker) out.push('smoker');
  return out;
}

export function runPlan(
  input: PlanInput,
  locale: string,
  { full = false }: { full?: boolean } = {},
): PlanResponse | { ok: false; codes: string[] } {
  const health = input.health ?? {};
  const outbound = toEngineLegs(input.outbound);
  const ret = toEngineLegs(input.return);
  const home = outbound[0]!.from;
  const result = generateCircadianPlan(
    {
      usualBedtime: input.profile.bed,
      usualWakeTime: input.profile.wake,
      chronotype: input.profile.chronotype,
      age: input.profile.age ?? null,
      napHabit: input.profile.napHabit,
      caffeineUse: input.profile.caffeineUse,
      sleepQuality: input.profile.sleepQuality,
      melatoninPreference: 'no',
      timezone: home.tz,
    },
    { outbound, ...(ret.length ? { return: ret } : {}) },
    {
      mode: 'ADAPT',
      strategy: input.strategy,
      preDays: input.preDays,
      caffeine: input.coffee,
      // Trouble bipolaire, maladie des yeux ou médicament photosensibilisant : pas de lampe sans avis médical.
      hasLightBox: input.lamp && !health.bipolar && !health.eyeCondition,
      health,
      alcohol: input.alcohol ?? true,
      exercise: input.sport ?? true,
      smoker: input.smoker ?? false,
    },
  ) as unknown as EngineResult;

  if (!result.ok) return { ok: false, codes: (result.errors ?? []).map((e) => e.code) };

  const byId = new Map(result.interventions.map((i) => [i.id, i]));
  const firstDep = Math.min(...result.itinerary.legs.map((l) => Date.parse(l.departure.utc)));
  // Arrivée à destination (dernier vol aller) : le premier petit-déjeuner qui suit est mis en avant.
  const arrivalMs = Math.max(
    ...result.itinerary.legs
      .filter((l) => l.group !== 'RETURN')
      .map((l) => Date.parse(l.arrival.utc)),
  );
  // Forfait payant, testeur ou admin : tout le plan ; sinon les premiers jours seulement.
  // Une fois l'horloge recalée, le moteur ne donne plus de consigne : les dernières journées ne contiendraient
  // qu'un réveil (ou rien). On les retire ; le plan s'arrête au dernier jour utile (« adaptation terminée »).
  const useful = (d: EngineDay) =>
    d.interventionIds.some((id) => {
      const x = byId.get(id);
      return !!x && x.feasible !== false && x.type !== 'WAKE';
    });
  let last = result.days.length - 1;
  while (last > 0 && !useful(result.days[last]!)) last--;
  const planDays = result.days.slice(0, last + 1);
  const free = full ? planDays : planDays.slice(0, FREE_DAYS);
  const cityOf = (code: string) => {
    const a = getAirport(code);
    return a ? cityName(a, locale) : code;
  };

  const days: DayView[] = free.map((d) => {
    const len = d.end - d.start;
    const items = d.interventionIds
      .map((id) => byId.get(id))
      .filter((x): x is Intervention & { id: string } => !!x && x.feasible !== false);

    const segs: DayView['segs'] = [];
    const marks: DayView['marks'] = [];
    const list: Array<DayItem & { ms: number; endMs?: number }> = [];
    const frac = (ms: number) => +((ms - d.start) / len).toFixed(4);
    const at = (x: Intervention) => x.frames.local.slice(11, 16);
    const endAt = (x: Intervention) => (x.end > x.start ? hhmm(x.end, x.localTz) : null);

    for (const x of items) {
      const span = { a: Math.max(0, frac(x.start)), b: Math.min(1, frac(x.end)) };
      switch (x.type) {
        case 'SLEEP':
          segs.push({ t: 'sleep', ...span });
          list.push({
            t: x.inFlight ? 'sleepf' : 'sleep',
            at: at(x),
            end: endAt(x),
            endMs: x.end,
            ms: x.start,
          });
          break;
        case 'WAKE':
          list.push({ t: 'wake', at: at(x), end: null, ms: x.start });
          break;
        case 'WIND_DOWN':
          segs.push({ t: 'wind', ...span });
          list.push({ t: 'wind', at: at(x), end: endAt(x), endMs: x.end, ms: x.start });
          break;
        case 'LIGHT':
          if (x.rationale?.code === 'ADVANCE' || x.rationale?.code === 'DELAY') {
            segs.push({ t: 'seek', ...span });
            list.push({ t: 'seek', at: at(x), end: endAt(x), endMs: x.end, ms: x.start });
          }
          break;
        case 'LIGHT_AVOIDANCE':
          segs.push({ t: 'avoid', ...span });
          list.push({ t: 'avoid', at: at(x), end: endAt(x), endMs: x.end, ms: x.start });
          break;
        case 'NAP':
          segs.push({ t: 'nap', ...span });
          list.push({
            t: 'nap',
            at: at(x),
            end: endAt(x),
            endMs: x.end,
            n: x.durationMin,
            ms: x.start,
          });
          break;
        case 'CAFFEINE_CUTOFF':
          marks.push({ t: 'caf', a: frac(x.start) });
          list.push({ t: 'caf', at: at(x), end: null, ms: x.start });
          break;
        case 'CAFFEINE':
          marks.push({ t: 'cafok', a: frac(x.start) });
          list.push({ t: 'cafok', at: at(x), end: null, ms: x.start });
          break;
        case 'ALCOHOL_CUTOFF':
          if (x.rationale?.code === 'FLIGHT_DAY') {
            list.push({ t: 'alcno', at: at(x), end: null, ms: x.start });
          } else if (x.rationale?.code === 'PREGNANCY' || x.rationale?.code === 'MINOR') {
            list.push({ t: 'alcnone', at: at(x), end: null, ms: x.start });
          } else {
            marks.push({ t: 'alc', a: frac(x.start) });
            list.push({ t: 'alc', at: at(x), end: null, ms: x.start });
          }
          break;
        case 'NICOTINE_CUTOFF':
          marks.push({ t: 'smoke', a: frac(x.start) });
          list.push({ t: 'smoke', at: at(x), end: null, ms: x.start });
          break;
        case 'EXERCISE':
          // Moment conseillé (courbe de réponse de phase à l'exercice), seulement si le voyageur veut ces conseils.
          if ((input.sport ?? true) && !x.inFlight)
            list.push({ t: 'sport', at: at(x), end: endAt(x), endMs: x.end, ms: x.start });
          break;
        case 'MEAL': {
          // Repas calés sur l'heure locale visée (synchroniseur des horloges périphériques, Wehrens 2017).
          if (!(input.meals ?? true)) break;
          // Le nom suit l'heure locale : un repas de midi décalé à 16 h devient un « repas » neutre.
          const h = Number(at(x).slice(0, 2));
          const t = x.inFlight
            ? 'mealf'
            : x.meal === 'BREAKFAST'
              ? x.start >= arrivalMs && x.start < arrivalMs + 30 * 36e5
                ? 'breakfast1'
                : h >= 5 && h < 11
                  ? 'breakfast'
                  : 'meal1'
              : x.meal === 'LUNCH'
                ? h >= 11 && h < 15
                  ? 'lunch'
                  : 'meal'
                : 'dinner';
          list.push({ t, at: at(x), end: null, ms: x.start });
          break;
        }
        case 'EXERCISE_CUTOFF':
          marks.push({ t: 'sportcut', a: frac(x.start) });
          list.push({ t: 'sportcut', at: at(x), end: null, ms: x.start });
          break;
      }
    }
    for (const leg of result.itinerary.legs) {
      const dep = Date.parse(leg.departure.utc);
      const arr = Date.parse(leg.arrival.utc);
      if (dep < d.end && arr > d.start) {
        segs.push({ t: 'flight', a: Math.max(0, frac(dep)), b: Math.min(1, frac(arr)) });
        list.push({
          t: 'flight',
          at: hhmm(dep, getAirport(leg.from.code)?.tz ?? d.tz),
          end: hhmm(arr, getAirport(leg.to.code)?.tz ?? d.tz),
          from: cityOf(leg.from.code),
          to: cityOf(leg.to.code),
          ms: dep,
          endMs: arr,
        });
      }
    }
    segs.sort((p, q) => p.a - q.a);
    for (let i = segs.length - 1; i > 0; i--) {
      const p = segs[i - 1]!;
      const q = segs[i]!;
      if (p.t === q.t && q.a - p.b < 0.004) {
        p.b = q.b;
        segs.splice(i, 1);
      }
    }
    list.sort((p, q) => p.ms - q.ms);
    // Fusionne les créneaux contigus de même type (ex. lumière 07:00–09:54 puis 09:54–11:36),
    // même si une consigne ponctuelle (repas, sport…) s'intercale entre les deux.
    const lastOfType = new Map<string, (typeof list)[number]>();
    for (let i = 0; i < list.length; i++) {
      const cur = list[i]!;
      const prev = lastOfType.get(cur.t);
      if (prev && prev.end && prev.endMs === cur.ms) {
        prev.end = cur.end;
        prev.endMs = cur.endMs;
        list.splice(i--, 1);
        continue;
      }
      if (cur.end) lastOfType.set(cur.t, cur);
    }
    const clock = hhmm(d.start, d.tz);
    const hasFlight = result.itinerary.legs.some(
      (l) => Date.parse(l.departure.utc) < d.end && Date.parse(l.arrival.utc) > d.start,
    );
    return {
      key: d.date,
      date: d.date,
      tz: d.tz,
      startH: +(Number(clock.slice(0, 2)) + Number(clock.slice(3)) / 60).toFixed(3),
      lenH: +(len / 36e5).toFixed(3),
      kind: hasFlight ? 'flight' : d.end <= firstDep ? 'before' : 'stay',
      segs,
      marks,
      // Heures absolues (UTC) : export vers l'agenda du téléphone.
      list: list.map(({ ms, endMs, ...rest }) => ({
        ...rest,
        iso: new Date(ms).toISOString(),
        ...(endMs && endMs > ms ? { isoEnd: new Date(endMs).toISOString() } : {}),
      })),
      noon: d.dashboardNoon,
    };
  });

  return {
    ok: true,
    home: cityOf(result.itinerary.home.code),
    destination: cityOf(result.itinerary.destination.code),
    shiftHours: result.itinerary.shiftOutHours,
    direction: result.strategy.direction,
    strategy: result.strategy.chosen,
    targetShiftH: result.strategy.targetShiftH,
    totalDays: planDays.length,
    lockedDays: full ? 0 : Math.max(0, planDays.length - FREE_DAYS),
    arrival: result.dashboard.atArrival,
    advice: adviceFor(input),
    days,
  };
}
