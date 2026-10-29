// Extrait le bundle du prototype (tests/golden/legacy/engine.v2.0.0.js) en modules ES dans src/engine/.
// Conversion mécanique : la logique de calcul n'est pas modifiée (parité vérifiée par tests/golden).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'tests/golden/legacy/engine.v2.0.0.js'), 'utf8');

const header = `/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck — typage interne progressif (PLAN §5.1.3) : les types publics sont dans ./types.ts
`;

const defRe = /^'(src\/[^']+)': function \(exports, __req\) \{\n/gm;
const defs = [...src.matchAll(defRe)];
const endMarker = src.indexOf('\n  };\n  const __cache');

const target = (id) => 'src/engine/' + id.replace(/^src\//, '').replace(/\.js$/, '');
const toFile = (id) => (id === 'src/index.js' ? 'src/engine/index.ts' : target(id) + '.ts');
const importPath = (fromId, toId) => {
  const fromDir = posix.dirname(toFile(fromId));
  let toPath = toFile(toId).replace(/\.ts$/, '');
  if (toPath.endsWith('/index')) toPath = toPath.slice(0, -'/index'.length);
  let rel = posix.relative(fromDir, toPath);
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
};

for (const [i, m] of defs.entries()) {
  const id = m[1];
  const start = m.index + m[0].length;
  const end = i + 1 < defs.length ? defs[i + 1].index : endMarker;
  let body = src.slice(start, end).trimEnd().replace(/\},?$/, '');

  const reexports = [];
  const names = [];
  // Object.defineProperty(exports, 'x', { enumerable: true, get: () => x });
  body = body.replace(
    /^Object\.defineProperty\(exports, '([^']+)', \{ enumerable: true, get: \(\) => (__req\('([^']+)'\)\['[^']+'\]|[A-Za-z0-9_$]+) \}\);\n?/gm,
    (_all, name, expr, from) => {
      if (from) reexports.push({ name, from });
      else names.push(name);
      return '';
    },
  );
  // Réexport global des constantes (index.js)
  let starFrom = null;
  body = body.replace(
    /^for \(const k of Object\.keys\(__req\('([^']+)'\)\)\).*\n?/gm,
    (_all, from) => {
      starFrom = from;
      return '';
    },
  );
  // const { a, b: c } = __req('src/x.js');
  const imports = [];
  body = body.replace(/^const \{([^}]+)\} = __req\('([^']+)'\);\n?/gm, (_all, list, from) => {
    const spec = list
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.replace(/\s*:\s*/, ' as '))
      .join(', ');
    imports.push(`import { ${spec} } from '${importPath(id, from)}';`);
    return '';
  });
  if (/__req\(/.test(body)) throw new Error(`${id}: __req restant`);

  const out = [header, ...imports, '', body.trim(), ''];
  if (names.length) out.push(`export { ${names.join(', ')} };`);
  const grouped = new Map();
  for (const r of reexports) grouped.set(r.from, [...(grouped.get(r.from) ?? []), r.name]);
  for (const [from, list] of grouped)
    out.push(`export { ${list.join(', ')} } from '${importPath(id, from)}';`);
  if (starFrom) out.push(`export * from '${importPath(id, starFrom)}';`);

  const file = join(root, toFile(id));
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, out.join('\n') + '\n');
  console.log(
    toFile(id).padEnd(36),
    `${imports.length} imports, ${names.length + reexports.length} exports`,
  );
}
