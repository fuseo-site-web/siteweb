// Fige les sorties du moteur du prototype dans tests/golden/snapshots/. À relancer seulement si les cas changent.
import { createRequire } from 'node:module';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { cases } from './cases.mjs';

const require = createRequire(import.meta.url);
const { loadLegacyEngine, normalize } = require('./run-legacy.cjs');
const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, 'snapshots');
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const E = loadLegacyEngine();
const plans = new Map();
let total = 0;

for (const c of cases) {
  const result =
    c.kind === 'plan'
      ? E.generateCircadianPlan(c.profile, c.itinerary, c.preferences)
      : E.recalculatePlan(plans.get(c.from), c.changes);
  plans.set(c.id, result);
  const out = normalize(result);
  const json = JSON.stringify(out);
  writeFileSync(join(outDir, `${c.id}.json.gz`), gzipSync(json, { level: 9 }));
  total += json.length;
  const info = out.ok
    ? `ok  jours=${out.days.length} interventions=${out.interventions.length} stratégie=${out.strategy.chosen} trace=${out.trace.length}`
    : `erreurs=${out.errors.map((e) => e.code).join(',')}`;
  console.log(c.id.padEnd(38), info, `${(json.length / 1024).toFixed(0)} Ko`);
}
console.log(`\n${cases.length} cas, ${(total / 1024 / 1024).toFixed(1)} Mo au total`);
