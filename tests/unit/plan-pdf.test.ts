import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import fr from '../../messages/fr.json';
import { buildPlanPdf } from '@/lib/pdf/plan-pdf';
import type { PlanInput } from '@/lib/plan-schema';
import { runPlan } from '@/lib/plan-view';

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
  return: [{ from: 'HND', to: 'CDG', departure: '2027-03-20T10:30', arrival: '2027-03-20T16:35' }],
  preDays: 2,
  strategy: 'AUTO',
  lamp: false,
  coffee: true,
};

const translator =
  (messages: Record<string, string>) =>
  (key: string, values: Record<string, string | number> = {}) =>
    (messages[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => String(values[k] ?? ''));

describe('PDF du plan', () => {
  for (const [locale, messages] of [
    ['fr', fr.planner],
    ['en', en.planner],
  ] as const) {
    it(`produit un PDF valide en ${locale}, sans caractère non supporté`, async () => {
      const plan = runPlan(input, locale);
      if (!plan.ok) throw new Error('plan');
      const pdf = await buildPlanPdf({
        plan,
        t: translator(messages as unknown as Record<string, string>),
        locale,
        generatedAt: new Date('2027-01-01T10:00:00Z'),
      });
      expect(Buffer.from(pdf.slice(0, 5)).toString()).toBe('%PDF-');
      expect(pdf.length).toBeGreaterThan(8_000);
      // Les jours payants ne sortent pas : le PDF ne contient que les jours gratuits.
      expect(plan.days.length).toBeLessThanOrEqual(3);
      expect(plan.lockedDays).toBeGreaterThan(0);
    });
  }
});
