// Extrait la base d'aéroports du prototype (code, nom, ville, fuseau IANA) avec noms de ville EN/ES du dictionnaire.
// Usage : node scripts/build-airports.cjs "<chemin vers index.html du prototype>"
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(process.argv[2], 'utf8');
const dictStart = html.indexOf('window.__I18N_DICT=');
let depth = 0;
let i = html.indexOf('{', dictStart);
const s = i;
for (; i < html.length; i++) {
  const c = html[i];
  if (c === '"') {
    i++;
    while (html[i] !== '"') {
      if (html[i] === '\\') i++;
      i++;
    }
    continue;
  }
  if (c === '{') depth++;
  if (c === '}' && --depth === 0) break;
}
const dict = JSON.parse(html.slice(s, i + 1));
const raw = html.match(/const RAW = `([^`]+)`/)[1];
const airports = raw.split('\n').map((l) => {
  const [code, name, city, tz] = l.split('|');
  const d = dict[city];
  return { code, name, city, cityEn: d ? d[0] : city, cityEs: d ? d[1] : city, tz };
});
fs.writeFileSync(path.join(__dirname, '../src/data/airports.json'), JSON.stringify(airports));
console.log(airports.length, 'aéroports');
