import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import * as engine from '@/engine';
import { cases } from './cases.mjs';

const require = createRequire(import.meta.url);
const { loadLegacyEngine, normalize } = require('./run-legacy.cjs') as {
  loadLegacyEngine: () => Engine;
  normalize: (plan: unknown) => unknown;
};

interface Engine {
  generateCircadianPlan: (p: unknown, i: unknown, pr: unknown) => unknown;
  recalculatePlan: (plan: unknown, changes: unknown) => unknown;
}

const snapshot = (id: string): unknown =>
  JSON.parse(gunzipSync(readFileSync(join(__dirname, 'snapshots', `${id}.json.gz`))).toString());

function runAll(e: Engine): Map<string, unknown> {
  const plans = new Map<string, unknown>();
  for (const c of cases) {
    const result =
      c.kind === 'plan'
        ? e.generateCircadianPlan(c.profile, c.itinerary, c.preferences)
        : e.recalculatePlan(plans.get(c.from as string), c.changes);
    plans.set(c.id, result);
  }
  return plans;
}

describe('golden master — parité exacte avec le moteur du prototype v2.0.0', () => {
  const legacy = runAll(loadLegacyEngine());
  const current = runAll(engine as unknown as Engine);

  describe.each(cases.map((c) => c.id))('%s', (id) => {
    it('le moteur du prototype reproduit son snapshot (déterminisme)', () => {
      expect(normalize(legacy.get(id))).toEqual(snapshot(id));
    });
    it('le moteur TypeScript est identique au snapshot', () => {
      expect(normalize(current.get(id))).toEqual(snapshot(id));
    });
  });
});
