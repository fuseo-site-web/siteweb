import { describe, expect, it } from 'vitest';
import { generateCircadianPlan } from '@/engine';
import { cases } from './cases.mjs';

const BUDGET_MS = 2000;

describe('benchmark moteur — budget < 2 s par plan (PLAN §5.1.6)', () => {
  it('calcule chaque plan dans le budget', () => {
    const timings: Array<[string, number]> = [];
    for (const c of cases.filter((x) => x.kind === 'plan')) {
      const t0 = performance.now();
      generateCircadianPlan(c.profile, c.itinerary, c.preferences);
      timings.push([c.id, performance.now() - t0]);
    }
    timings.sort((a, b) => b[1] - a[1]);
    const total = timings.reduce((s, [, t]) => s + t, 0);
    console.log(
      `plans: ${timings.length} · moyenne ${(total / timings.length).toFixed(0)} ms · pire ${timings[0]![0]} ${timings[0]![1].toFixed(0)} ms`,
    );
    for (const [id, ms] of timings) expect(ms, id).toBeLessThan(BUDGET_MS);
  });
});
