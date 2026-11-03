import { afterAll, describe, expect, it } from 'vitest';
import { generateCircadianPlan } from '@/engine';
import { cases } from './cases.mjs';

const BUDGET_MS = 2000;
const plans = cases.filter((x) => x.kind === 'plan');

// Un test par plan : le budget porte sur un plan, et chaque test a son propre délai (5 s par défaut),
// de sorte que la durée totale du fichier ne puisse pas faire échouer le test sur un runner lent.
describe('benchmark moteur — budget < 2 s par plan (PLAN §5.1.6)', () => {
  const timings: Array<[string, number]> = [];

  it.each(plans.map((c) => [c.id, c] as const))('%s calcule son plan dans le budget', (_id, c) => {
    const t0 = performance.now();
    generateCircadianPlan(c.profile, c.itinerary, c.preferences);
    const ms = performance.now() - t0;
    timings.push([c.id, ms]);
    expect(ms, c.id).toBeLessThan(BUDGET_MS);
  });

  afterAll(() => {
    if (!timings.length) return;
    timings.sort((a, b) => b[1] - a[1]);
    const total = timings.reduce((s, [, t]) => s + t, 0);
    console.log(
      `plans: ${timings.length} · moyenne ${(total / timings.length).toFixed(0)} ms · pire ${timings[0]![0]} ${timings[0]![1].toFixed(0)} ms`,
    );
  });
});
