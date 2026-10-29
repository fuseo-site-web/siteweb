// Génère les messages de la page d'accueil (textes FR du prototype + traductions EN/ES de son dictionnaire)
// et l'extrait de plan Paris → Tokyo calculé par le moteur. À relancer si le contenu change.
// Usage : node scripts/build-home-content.cjs "<chemin vers index.html du prototype>"
const fs = require('node:fs');
const path = require('node:path');
const { loadLegacyEngine, normalize } = require('../tests/golden/run-legacy.cjs');

const root = path.join(__dirname, '..');
const proto = fs.readFileSync(process.argv[2], 'utf8');

function readDict(h) {
  const i = h.indexOf('window.__I18N_DICT=');
  const s = h.indexOf('{', i);
  let depth = 0;
  let e = s;
  for (; e < h.length; e++) {
    const c = h[e];
    if (c === '"') {
      e++;
      while (h[e] !== '"') {
        if (h[e] === '\\') e++;
        e++;
      }
      continue;
    }
    if (c === '{') depth++;
    if (c === '}' && --depth === 0) break;
  }
  return JSON.parse(h.slice(s, e + 1));
}
const dict = readDict(proto);

// [clé, texte français exact du prototype, {en, es} si absent du dictionnaire]
const spec = [
  ['nav.home', 'Fuseo, accueil'],
  ['nav.menu', 'Menu principal'],
  ['nav.method', 'Notre méthode'],
  ['nav.science', 'La science'],
  ['nav.audience', 'Pour qui ?'],
  ['nav.cta', 'Créer mon plan'],
  ['nav.language', 'Langue'],
  ['nav.skip', 'Aller au contenu', { en: 'Skip to content', es: 'Ir al contenido' }],
  ['hero.title', "Arrivez à l'heure. Votre corps aussi."],
  [
    'hero.lead',
    "Entrez vos horaires de vol. Fuseo calcule quand dormir, rechercher la lumière, l'éviter, faire une sieste et arrêter la caféine pour aider votre horloge biologique à s'adapter au fuseau d'arrivée.",
  ],
  ['hero.cta', 'Créer mon plan anti-jet lag'],
  ['hero.example', 'Voir un exemple'],
  ['hero.point1', 'Plan personnalisé'],
  ['hero.point2', 'Sans abonnement'],
  ['hero.pointFrom', 'À partir de'],
  ['hero.endorse', "Conçu par des spécialistes du sommeil de l'Institut Médical du Sommeil, Paris"],
  ['clocks.title', "Paris → Tokyo, le lendemain de l'arrivée"],
  ['clocks.big', "Votre corps vit encore à l'heure de Paris, avec 7 heures de retard"],
  ['clocks.local', 'À Tokyo, il est…'],
  ['clocks.night', 'Nuit'],
  ['clocks.day', 'Journée'],
  ['clocks.body', "Votre corps croit qu'il est…"],
  ['clocks.e1a', 'De 6 h à 14 h à Tokyo'],
  ['clocks.e1b', '(zone encadrée), votre corps est en pleine nuit : somnolence et coups de barre.'],
  ['clocks.e2a', 'À 23 h à Tokyo'],
  ['clocks.e2b', ", votre corps se croit en fin d'après-midi : impossible de s'endormir."],
  ['clocks.e3b', 'place la lumière et le sommeil pour réduire cet écart jour après jour.'],
  ['scene.title', 'Votre plan commence avant même le décollage.'],
  ['press.title', 'Ils parlent de nous'],
  ['preview.title', 'Voici ce que vous recevez'],
  ['preview.sub', "Un extrait réel d'un plan Fuseo, calculé pour un Paris → Tokyo en octobre."],
  ['preview.sleep', 'Coucher 23 h · lever 7 h'],
  [
    'preview.note',
    'Chaque horaire est calculé selon votre trajet, vos heures habituelles de sommeil et le sens du décalage horaire.',
  ],
  ['preview.cta', 'Calculer mon propre plan'],
  ['preview.eve', 'Veille du départ'],
  ['preview.flight', 'Jour du vol'],
  ['preview.first', 'Premier jour à Tokyo'],
  ['preview.sleepItem', 'Dormir'],
  ['preview.seek', 'Lumière vive'],
  ['preview.avoid', 'Éviter la lumière vive'],
  ['preview.caf', 'Dernier café ou thé'],
  ['preview.flightItem', 'Vol'],
  ['steps.title', 'Trois étapes'],
  ['steps.s1.t', 'Votre sommeil'],
  ['steps.s1.p', 'Indiquez vos horaires habituels de coucher et de lever.'],
  ['steps.s2.t', 'Votre voyage'],
  ['steps.s2.p', 'Ajoutez vos vols, escales et votre retour.'],
  ['steps.s3.t', 'Votre protocole'],
  ['steps.s3.p', 'Fuseo calcule votre stratégie sommeil, lumière, siestes et caféine.'],
  ['steps.bed', 'Je me couche vers'],
  ['steps.wake', 'Je me lève vers'],
  ['steps.paris', 'Paris'],
  ['steps.tokyo', 'Tokyo'],
  ['steps.note', 'Aucun compte nécessaire pour commencer.'],
  ['science.title', 'La chronobiologie appliquée à votre voyage'],
  [
    'science.p1',
    "La lumière est le principal synchroniseur de l'horloge biologique. Selon l'heure biologique à laquelle elle est reçue, elle avance ou retarde cette horloge.",
  ],
  [
    'science.p2',
    "C'est pourquoi s'exposer à la lumière au mauvais moment peut ralentir l'adaptation au nouveau fuseau. Fuseo utilise votre trajet, le sens du voyage et vos horaires habituels de sommeil pour déterminer les fenêtres pertinentes.",
  ],
  ['science.prcTitle', 'Même lumière, effet opposé selon le moment'],
  ['science.delayLabel', 'Soir biologique'],
  ['science.delayText', "retarde l'horloge (utile vers l'ouest)"],
  ['science.advanceLabel', 'Matin biologique'],
  ['science.advanceText', "avance l'horloge (utile vers l'est)"],
  [
    'science.prcNote',
    "Le « matin biologique » suit votre horloge interne, pas l'heure locale : juste après un long vol, il peut tomber en pleine après-midi.",
  ],
  ['audience.title', 'Pour qui ?'],
  ['audience.sub', "Fuseo s'adapte au motif de votre voyage et à sa durée."],
  ['audience.a1.t', "Voyageurs d'affaires"],
  ['audience.a1.p', 'Être en forme pour la réunion, pas trois jours après.'],
  ['audience.a2.t', 'Pilotes et navigants'],
  ['audience.a2.p', 'Des rotations répétées, une vigilance qui ne se négocie pas.'],
  ['audience.a3.t', 'Sportifs'],
  ['audience.a3.p', 'Arriver en compétition avec une horloge déjà recalée.'],
  ['audience.a4.t', 'Vacances en famille'],
  ['audience.a4.p', 'Profiter dès les premiers jours sur place.'],
  [
    'footer.disclaimer',
    "Fuseo fournit des informations et conseils généraux relatifs au sommeil et à la chronobiologie du voyage. Le service ne constitue pas une consultation médicale, ne pose pas de diagnostic et ne remplace pas l'avis d'un professionnel de santé. Il s'adresse aux adultes en bonne santé. En cas de grossesse, de maladie chronique, de trouble bipolaire, de maladie des yeux ou de traitement en cours, demandez l'avis de votre médecin avant de suivre un plan.",
  ],
];
// Textes absents du dictionnaire (prix du prototype : 8,90 €, formaté par langue).
const extra = { 'hero.price': ['8,90 €', '€8.90', '8,90 €'] };

const extraSpec = require('./messages-extra.cjs');
spec.push(...extraSpec, ...require('./messages-planner.cjs'), ...require('./messages-account.cjs'), ...require('./messages-site.cjs'));
const out = { fr: {}, en: {}, es: {} };
const set = (lang, key, v) => {
  const parts = key.split('.');
  let o = out[lang];
  parts.slice(0, -1).forEach((p) => (o = o[p] ??= {}));
  o[parts.at(-1)] = v;
};
const missing = [];
for (const [key, fr, manual] of spec) {
  const d = dict[fr] ?? dict[fr.replace(/\.$/, '')] ?? (manual && [manual.en, manual.es]);
  if (!d) missing.push(`${key}: ${fr}`);
  set('fr', key, fr);
  set('en', key, d ? d[0] : fr);
  set('es', key, d ? d[1] : fr);
}
for (const [key, [fr, en, es]] of Object.entries(extra)) {
  set('fr', key, fr);
  set('en', key, en);
  set('es', key, es);
}
if (missing.length) {
  console.error(
    'Absents du dictionnaire du prototype (repli en français) :\n' + missing.join('\n'),
  );
}

for (const lang of ['fr', 'en', 'es']) {
  const file = path.join(root, 'messages', `${lang}.json`);
  const cur = JSON.parse(fs.readFileSync(file, 'utf8'));
  // Les clés meta et brand sont conservées ; home/nav/... sont régénérées.
  const keep = { meta: cur.meta, brand: cur.brand };
  fs.writeFileSync(file, JSON.stringify({ ...keep, ...out[lang] }, null, 2) + '\n');
}
console.log(`messages : ${spec.length} textes × 3 langues`);

// ---- Extrait de plan : Paris → Tokyo, octobre (exemple du prototype), calculé par le moteur ----
const E = loadLegacyEngine();
const leg = (f, t, dep, arr) => ({ from: f, to: t, departure: dep, arrival: arr });
const CDG = { code: 'CDG', tz: 'Europe/Paris', city: 'Paris' };
const HND = { code: 'HND', tz: 'Asia/Tokyo', city: 'Tokyo' };
const plan = normalize(
  E.generateCircadianPlan(
    {
      usualBedtime: '23:00',
      usualWakeTime: '07:00',
      chronotype: 'intermediate',
      napHabit: 'sometimes',
      sleepQuality: 'good',
      caffeineUse: 'moderate',
      timezone: 'Europe/Paris',
    },
    {
      outbound: [leg(CDG, HND, '2026-10-12T19:30', '2026-10-13T15:25')],
      return: [leg(HND, CDG, '2026-10-22T10:30', '2026-10-22T16:35')],
    },
    { preDays: 2 },
  ),
);
if (!plan.ok) throw new Error('plan invalide');

const byId = new Map(plan.interventions.map((i) => [i.id, i]));
const firstDep = Date.UTC(2026, 9, 12, 17, 30);
const arrOut = Date.UTC(2026, 9, 13, 6, 25);
const hhmm = (ms, tz) =>
  new Intl.DateTimeFormat('fr-FR', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(ms));
const dayOf = (pred) => plan.days.find(pred);
const picks = [
  ['eve', dayOf((d) => d.end <= firstDep && d.end > firstDep - 24 * 36e5 * 1)],
  ['flight', dayOf((d) => d.start <= firstDep && d.end > firstDep)],
  ['first', dayOf((d) => d.start >= arrOut)],
];
const KEEP = { SLEEP: 'sleep', LIGHT: 'seek', LIGHT_AVOIDANCE: 'avoid', CAFFEINE_CUTOFF: 'caf' };
const days = picks.map(([key, d]) => {
  if (!d) throw new Error('jour introuvable : ' + key);
  const len = d.end - d.start;
  const items = d.interventionIds
    .map((id) => byId.get(id))
    .filter(
      (x) =>
        KEEP[x.type] &&
        (x.type !== 'LIGHT' || x.rationale.code === 'ADVANCE' || x.rationale.code === 'DELAY'),
    );
  const segs = items
    .filter((x) => x.end > x.start)
    .map((x) => ({
      t: KEEP[x.type],
      a: +(Math.max(0, x.start - d.start) / len).toFixed(4),
      b: +(Math.min(len, x.end - d.start) / len).toFixed(4),
    }));
  const marks = items
    .filter((x) => x.end === x.start)
    .map((x) => ({ t: KEEP[x.type], a: +((x.start - d.start) / len).toFixed(4) }));
  const flights = plan.itinerary.legs.filter(
    (l) => Date.parse(l.departure.utc) < d.end && Date.parse(l.arrival.utc) > d.start,
  );
  for (const f of flights)
    segs.push({
      t: 'flight',
      a: +(Math.max(0, Date.parse(f.departure.utc) - d.start) / len).toFixed(4),
      b: +(Math.min(len, Date.parse(f.arrival.utc) - d.start) / len).toFixed(4),
    });
  segs.sort((p, q) => p.a - q.a);
  for (let i = segs.length - 1; i > 0; i--) {
    const p = segs[i - 1];
    const q = segs[i];
    if (p.t === q.t && q.a - p.b < 0.004) {
      p.b = q.b;
      segs.splice(i, 1);
    }
  }
  const list = items
    .map((x) => ({
      t: KEEP[x.type],
      at: hhmm(x.start, d.tz),
      end: x.end > x.start ? hhmm(x.end, d.tz) : null,
      ms: x.start,
    }))
    .sort((p, q) => p.ms - q.ms)
    .map(({ ms, ...r }) => r)
    .filter((r, i, a) => !(i > 0 && a[i - 1].t === r.t && a[i - 1].end === r.at));
  for (let i = list.length - 1; i > 0; i--)
    if (list[i - 1].t === list[i].t && list[i - 1].end === list[i].at) {
      list[i - 1].end = list[i].end;
      list.splice(i, 1);
    }
  for (const f of flights)
    list.push({
      t: 'flight',
      at: hhmm(Date.parse(f.departure.utc), 'Europe/Paris'),
      end: hhmm(Date.parse(f.arrival.utc), 'Asia/Tokyo'),
    });
  const startH = +(
    (Number(hhmm(d.start, d.tz).slice(0, 2)) * 60 + Number(hhmm(d.start, d.tz).slice(3))) /
    60
  ).toFixed(3);
  return {
    key,
    date: d.date,
    tz: d.tz,
    startH,
    lenH: +(len / 36e5).toFixed(3),
    segs,
    marks,
    list: list.slice(0, 6),
  };
});
fs.mkdirSync(path.join(root, 'src/content'), { recursive: true });
fs.writeFileSync(
  path.join(root, 'src/content/home-preview.json'),
  JSON.stringify({ engineVersion: plan.version, days }, null, 2) + '\n',
);
console.log(
  'aperçu :',
  days.map((d) => `${d.key} ${d.date} (${d.segs.length} segments)`).join(' · '),
);
