import { describe, expect, it } from 'vitest';
import type { PlanInput } from '@/lib/plan-schema';
import { runPlan, type DayItem, type PlanResponse } from '@/lib/plan-view';

const base: PlanInput = {
  profile: {
    bed: '23:00',
    wake: '07:00',
    chronotype: 'intermediate',
    age: 40,
    caffeineUse: 'moderate',
    napHabit: 'sometimes',
    sleepQuality: 'good',
  },
  outbound: [
    { from: 'CDG', to: 'JFK', departure: '2027-03-10T10:30', arrival: '2027-03-10T12:45' },
  ],
  return: [{ from: 'JFK', to: 'CDG', departure: '2027-03-17T18:00', arrival: '2027-03-18T07:20' }],
  preDays: 0,
  strategy: 'AUTO',
  lamp: false,
  coffee: true,
};

const plan = (extra: Partial<PlanInput> = {}) => {
  const p = runPlan({ ...base, ...extra }, 'fr', { full: true });
  if (!p.ok) throw new Error('plan');
  return p as PlanResponse;
};
const items = (p: PlanResponse, t: string) =>
  p.days.flatMap((d) => d.list.filter((i) => i.t === t));
const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));
/** Écart (min) entre une heure limite et le coucher qui la suit dans la même journée. */
function gapsToSleep(p: PlanResponse, t: string) {
  const gaps: number[] = [];
  for (const d of p.days) {
    const list = d.list as DayItem[];
    list.forEach((it, i) => {
      if (it.t !== t) return;
      const sleep = list.slice(i + 1).find((x) => x.t === 'sleep');
      if (sleep) gaps.push((minutes(sleep.at) - minutes(it.at) + 1440) % 1440);
    });
  }
  return gaps;
}

describe('hygiène de vie : alcool, tabac, sport', () => {
  it('par défaut : heure limite pour l’alcool et conseils sport, rien sur le tabac', () => {
    const p = plan();
    expect(items(p, 'alc').length).toBeGreaterThan(0);
    expect(items(p, 'sportcut').length).toBeGreaterThan(0);
    expect(items(p, 'smoke')).toHaveLength(0);
  });

  it('dernier verre 4 h avant le coucher, et « pas d’alcool » les jours de vol', () => {
    const p = plan();
    for (const g of gapsToSleep(p, 'alc')) expect(g).toBe(240);
    const flightDays = p.days.filter((d) => d.kind === 'flight');
    expect(flightDays.length).toBeGreaterThan(0);
    for (const d of flightDays) expect(d.list.some((i) => i.t === 'alc')).toBe(false);
    expect(items(p, 'alcno').length).toBeGreaterThan(0);
  });

  it('fumeur : dernière cigarette 2 h avant le coucher ; sport intense terminé 2 h avant', () => {
    const p = plan({ smoker: true });
    expect(items(p, 'smoke').length).toBeGreaterThan(0);
    for (const g of gapsToSleep(p, 'smoke')) expect(g).toBe(120);
    for (const g of gapsToSleep(p, 'sportcut')) expect(g).toBe(120);
  });

  it('options désactivées : aucun conseil alcool, sport ni tabac', () => {
    const p = plan({ alcohol: false, sport: false, smoker: false });
    for (const t of ['alc', 'alcno', 'smoke', 'sport', 'sportcut'])
      expect(items(p, t)).toHaveLength(0);
  });

  it('un voyage enregistré avant ces options garde les valeurs par défaut', () => {
    const p = plan({ alcohol: undefined, sport: undefined, smoker: undefined });
    expect(items(p, 'alc').length).toBeGreaterThan(0);
    expect(items(p, 'smoke')).toHaveLength(0);
  });

  it('grossesse : pas d’alcool du tout, pas de café « coup de pouce », dernier café 10 h avant le coucher', () => {
    const p = plan({ health: { pregnant: true } });
    expect(items(p, 'alc')).toHaveLength(0);
    expect(items(p, 'alcnone').length).toBeGreaterThan(0);
    expect(items(p, 'cafok')).toHaveLength(0);
    for (const g of gapsToSleep(p, 'caf')) expect(g).toBe(600);
    expect(p.advice).toContain('pregnant');
  });

  it('apnée du sommeil : dernier verre 6 h avant le coucher', () => {
    const p = plan({ health: { sleepApnea: true } });
    for (const g of gapsToSleep(p, 'alc')) expect(g).toBe(360);
    expect(p.advice).toContain('apnea');
  });

  it('âge et pilule : heure limite du café avancée (50 ans : +1 h ; pilule : +2 h)', () => {
    const young = gapsToSleep(plan({ health: {} }), 'caf');
    const fifty = gapsToSleep(plan({ profile: { ...base.profile, age: 55 }, health: {} }), 'caf');
    const pill = gapsToSleep(plan({ health: { oralContraceptive: true } }), 'caf');
    expect(young.length).toBeGreaterThan(0);
    for (const g of young) expect(g).toBe(360);
    for (const g of fifty) expect(g).toBe(420);
    for (const g of pill) expect(g).toBe(480);
  });

  it('conseils personnalisés : mineur, senior, fumeur', () => {
    expect(plan({ profile: { ...base.profile, age: 16 } }).advice).toContain('minor');
    expect(plan({ profile: { ...base.profile, age: 70 } }).advice).toContain('senior');
    expect(plan({ smoker: true }).advice).toContain('smoker');
    expect(plan().advice).toEqual([]);
  });

  it('le plan s’arrête au dernier jour utile : pas de journée vide (ou « réveil » seul) après l’adaptation', () => {
    for (const preDays of [0, 2]) {
      const p = runPlan(
        {
          ...base,
          preDays,
          outbound: [
            { from: 'CDG', to: 'JFK', departure: '2027-03-03T08:30', arrival: '2027-03-03T10:55' },
          ],
          return: [],
        },
        'fr',
        { full: true },
      ) as PlanResponse;
      const last = p.days[p.days.length - 1]!;
      expect(last.list.some((i) => i.t !== 'wake')).toBe(true);
      expect(p.totalDays).toBe(p.days.length);
    }
  });
});
