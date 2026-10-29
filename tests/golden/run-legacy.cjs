// Exécute le moteur du prototype (v2.0.0, intact) dans Node et renvoie les résultats normalisés.
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function loadLegacyEngine() {
  const code = fs.readFileSync(path.join(__dirname, 'legacy', 'engine.v2.0.0.js'), 'utf8');
  const ctx = { console };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return ctx.FuseoEngine;
}

// Champs dépendant de l'horloge : exclus de la comparaison.
function normalize(plan) {
  const copy = JSON.parse(JSON.stringify(plan));
  delete copy.generatedAt;
  delete copy.computeMs;
  if (copy.meta) delete copy.meta.recalculatedFrom;
  return copy;
}

module.exports = { loadLegacyEngine, normalize };
