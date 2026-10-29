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

export function runPlan(
  input: PlanInput,
  locale: string,
): PlanResponse | { ok: false; codes: string[] } {
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
      hasLightBox: input.lamp,
    },
  ) as unknown as EngineResult;

  if (!result.ok) return { ok: false, codes: (result.errors ?? []).map((e) => e.code) };

  const byId = new Map(result.interventions.map((i) => [i.id, i]));
  const firstDep = Math.min(...result.itinerary.legs.map((l) => Date.parse(l.departure.utc)));
  const free = result.days.slice(0, FREE_DAYS);
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
    const list: Array<DayItem & { ms: number }> = [];
    const frac = (ms: number) => +((ms - d.start) / len).toFixed(4);
    const at = (x: Intervention) => x.frames.local.slice(11, 16);
    const endAt = (x: Intervention) => (x.end > x.start ? hhmm(x.end, x.localTz) : null);

    for (const x of items) {
      const span = { a: Math.max(0, frac(x.start)), b: Math.min(1, frac(x.end)) };
      switch (x.type) {
        case 'SLEEP':
          segs.push({ t: 'sleep', ...span });
          list.push({ t: x.inFlight ? 'sleepf' : 'sleep', at: at(x), end: endAt(x), ms: x.start });
          break;
        case 'WAKE':
          list.push({ t: 'wake', at: at(x), end: null, ms: x.start });
          break;
        case 'WIND_DOWN':
          segs.push({ t: 'wind', ...span });
          list.push({ t: 'wind', at: at(x), end: endAt(x), ms: x.start });
          break;
        case 'LIGHT':
          if (x.rationale?.code === 'ADVANCE' || x.rationale?.code === 'DELAY') {
            segs.push({ t: 'seek', ...span });
            list.push({ t: 'seek', at: at(x), end: endAt(x), ms: x.start });
          }
          break;
        case 'LIGHT_AVOIDANCE':
          segs.push({ t: 'avoid', ...span });
          list.push({ t: 'avoid', at: at(x), end: endAt(x), ms: x.start });
          break;
        case 'NAP':
          segs.push({ t: 'nap', ...span });
          list.push({ t: 'nap', at: at(x), end: endAt(x), n: x.durationMin, ms: x.start });
          break;
        case 'CAFFEINE_CUTOFF':
          marks.push({ t: 'caf', a: frac(x.start) });
          list.push({ t: 'caf', at: at(x), end: null, ms: x.start });
          break;
        case 'CAFFEINE':
          marks.push({ t: 'cafok', a: frac(x.start) });
          list.push({ t: 'cafok', at: at(x), end: null, ms: x.start });
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
    for (let i = list.length - 1; i > 0; i--) {
      const prev = list[i - 1]!;
      const cur = list[i]!;
      if (prev.t === cur.t && prev.end && prev.end === cur.at) {
        prev.end = cur.end;
        list.splice(i, 1);
      }
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
      list: list.map(({ ms: _ms, ...rest }) => rest),
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
    totalDays: result.days.length,
    lockedDays: Math.max(0, result.days.length - FREE_DAYS),
    arrival: result.dashboard.atArrival,
    days,
  };
}
