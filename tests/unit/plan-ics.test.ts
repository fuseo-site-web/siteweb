import { describe, expect, it } from 'vitest';
import { buildPlanIcs } from '@/lib/plan-ics';
import type { PlanInput } from '@/lib/plan-schema';
import { runPlan, type PlanResponse } from '@/lib/plan-view';

const input: PlanInput = {
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
    { from: 'CDG', to: 'HND', departure: '2027-03-10T19:30', arrival: '2027-03-11T15:25' },
  ],
  return: [],
  preDays: 1,
  strategy: 'AUTO',
  lamp: false,
  coffee: true,
};

describe('export agenda (.ics)', () => {
  const plan = runPlan(input, 'fr', { full: true }) as PlanResponse;
  const ics = buildPlanIcs({
    plan,
    labelFor: (it) => `Consigne ${it.t}, test; virgule`,
    title: 'Plan Fuseo Paris → Tokyo',
    now: new Date('2027-01-01T00:00:00Z'),
  });
  const lines = ics.split('\r\n');

  it('produit un calendrier valide avec un événement par consigne datée', () => {
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
    const events = ics.match(/BEGIN:VEVENT/g)?.length ?? 0;
    const items = plan.days.reduce((n, d) => n + d.list.filter((i) => i.iso).length, 0);
    expect(events).toBe(items);
    expect(events).toBeGreaterThan(10);
  });

  it('heures en UTC, fin après le début, identifiants uniques', () => {
    const starts = [...ics.matchAll(/DTSTART:(\d{8}T\d{6}Z)/g)].map((m) => m[1]);
    const ends = [...ics.matchAll(/DTEND:(\d{8}T\d{6}Z)/g)].map((m) => m[1]);
    expect(starts.length).toBe(ends.length);
    starts.forEach((s, i) => expect(ends[i]! > s!).toBe(true));
    const uids = [...ics.matchAll(/UID:(.+)/g)].map((m) => m[1]);
    expect(new Set(uids).size).toBe(uids.length);
  });

  it('échappe le texte, plie les lignes longues et met une alerte sur les consignes clés', () => {
    expect(ics).toContain('test\; virgule');
    for (const l of lines) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75);
    expect(ics).toContain('BEGIN:VALARM');
  });
});
