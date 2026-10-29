// Extrait du prototype le contenu des pages (science, méthode, articles de blog) en blocs structurés,
// avec les traductions EN/ES de son dictionnaire. À relancer si le prototype change.
// Usage : node scripts/build-pages-content.cjs "<chemin vers index.html du prototype>"
const fs = require('node:fs');
const path = require('node:path');
const cheerio = require('cheerio');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(process.argv[2], 'utf8');

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
const dict = readDict(html);
const stats = { ok: 0, fallback: 0, missing: new Set() };

function translate(text, li) {
  if (li < 0) return text;
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t) return text;
  const hit = dict[t] ?? dict[t + '.'];
  if (hit) {
    stats.ok++;
    return hit[li].replace(/\.$/, t.endsWith('.') ? '.' : '');
  }
  const parts = t.split(/(?<=[.!?])\s+(?=\S)/);
  if (parts.length > 1) {
    const out = parts.map((p) => dict[p] ?? dict[p.replace(/\.$/, '')] ?? null);
    if (out.every(Boolean)) {
      stats.ok++;
      return out.map((d) => d[li]).join(' ');
    }
  }
  if (/^[\d\s.,:;–—·%()/+×≈→-]+$/.test(t) || !/[A-Za-zÀ-ÿ]{3}/.test(t)) return text;
  stats.fallback++;
  stats.missing.add(t.slice(0, 80));
  return text;
}

const INLINE = new Set(['b', 'strong', 'i', 'em', 'sup']);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function inline($, el, li) {
  let out = '';
  $(el)
    .contents()
    .each((_, n) => {
      if (n.type === 'text') {
        const raw = n.data;
        const lead = /^\s/.test(raw) ? ' ' : '';
        const trail = /\s$/.test(raw) ? ' ' : '';
        const body = raw.trim();
        out += body
          ? lead + esc(translate(body, li)) + trail
          : raw.includes('\n') || raw.includes(' ')
            ? ' '
            : '';
      } else if (n.type === 'tag') {
        if (n.name === 'br') out += ' ';
        else if (INLINE.has(n.name))
          out += `<${n.name === 'strong' ? 'b' : n.name}>${inline($, n, li)}</${n.name === 'strong' ? 'b' : n.name}>`;
        else out += inline($, n, li);
      }
    });
  return out.replace(/\s+/g, ' ');
}
const plain = (s) =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();

const SKIP_COMMON =
  'script,style,svg,button,form,nav,.toc,.btns,.art-cta,.keep,.mt-badges,.num,.takeoff,.why-art,figure,.tp-wrap,.tp-leg,.tp-note,.mt-fig,.scn,.east,.btn-lg,.art-by,.art-lead,.refs-h,.refs-mini';
let SKIP = SKIP_COMMON + ',.refs-list';
const CARD =
  '.card,.myth,.risk,.symp > div,.mt-stats > div,.mt-flow > li,.levers > div,.cards3 > div,.mt-checks > div';

function cardOf($, el, li) {
  const e = $(el);
  const kicker = e.find('.n,.mt-n').first();
  const titleEl = e.find('h3,b,.m').first();
  const title = titleEl.length ? inline($, titleEl, li) : '';
  const texts = [];
  e.find('p,span,li').each((_, n) => {
    const cls = $(n).attr('class') || '';
    if (/mt-n|mt-ref|^n$|opt|ic/.test(cls)) return;
    if ($(n).find('p,span,li').length) return;
    if (titleEl.length && (n === titleEl[0] || $(n).closest(titleEl).length)) return;
    const t = inline($, n, li);
    if (plain(t)) texts.push(t);
  });
  const ref = e.find('.mt-ref').first();
  return {
    type: 'card',
    kicker: kicker.length ? plain(inline($, kicker, li)) : undefined,
    title,
    text: texts,
    ref: ref.length ? inline($, ref, li) : undefined,
  };
}

function walk($, el, li, out) {
  $(el)
    .children()
    .each((_, c) => {
      const $c = $(c);
      if ($c.is(SKIP)) return;
      const tag = c.name;
      if ($c.is(CARD)) return void out.push(cardOf($, c, li));
      if (/^h[1-3]$/.test(tag)) {
        const t = inline($, c, li);
        if (plain(t)) out.push({ type: 'h', level: Number(tag[1]), text: t });
      } else if (tag === 'p') {
        const t = inline($, c, li);
        if (plain(t)) out.push({ type: 'p', text: t });
      } else if (tag === 'ul' || tag === 'ol') {
        const items = $c
          .children('li')
          .map((_, l) => inline($, l, li))
          .get()
          .filter((x) => plain(x));
        if (items.length) out.push({ type: 'list', ordered: tag === 'ol', items });
      } else walk($, c, li, out);
    });
}

// Regroupe les cartes consécutives.
function group(blocks) {
  const out = [];
  for (const b of blocks) {
    if (b.type === 'card') {
      const last = out[out.length - 1];
      if (last && last.type === 'cards') last.items.push(b);
      else out.push({ type: 'cards', items: [b] });
    } else out.push(b);
  }
  return out;
}

const $ = cheerio.load(html);
const LANGS = ['fr', 'en', 'es'];
const slugify = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&amp;/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70)
    .replace(/-+$/, '');

function pageOf(sel, li) {
  SKIP = SKIP_COMMON; // les listes de références font partie du contenu des pages (sources)
  const sec = $(sel);
  const hero = sec.find('.why-hero').first();
  const title = plain(inline($, sec.find('h1').first(), li));
  const lead = hero.length ? plain(inline($, hero.find('.inner > p').first(), li)) : '';
  const body = [];
  walk($, sec, li, body);
  // le héros est traité à part
  const cleaned = body.filter(
    (b) => !(b.type === 'h' && b.level === 1) && !(b.type === 'p' && plain(b.text) === lead),
  );
  return { title, lead, blocks: group(cleaned) };
}

const ARTICLES = [
  ['jet-lag-est-ouest', 'p-blog-jet-lag-est-ouest'],
  ['lumiere-horloge-biologique', 'p-blog-lumiere-horloge-biologique'],
  ['melatonine-jet-lag', 'p-blog-melatonine-jet-lag'],
  ['dormir-en-avion', 'p-blog-dormir-en-avion'],
  ['cafeine-sieste-premier-jour', 'p-blog-cafeine-sieste-premier-jour'],
  ['preparer-horloge-avant-depart', 'p-blog-preparer-horloge-avant-depart'],
];

function article(id, secId, li) {
  SKIP = SKIP_COMMON + ',.refs-list';
  const sec = $('#' + secId);
  const body = [];
  walk($, sec.find('article > .inner').first(), li, body);
  const title = plain(inline($, sec.find('h1.art-t'), li));
  const lead = plain(inline($, sec.find('.art-lead'), li));
  const tagRaw = plain(inline($, sec.find('.btag').first(), li));
  const [tag, readTime] = tagRaw.split(' · ');
  const keep = sec.find('.keep').first();
  const refs = sec
    .find('.refs-list li')
    .map((_, l) => plain(inline($, l, li)))
    .get();
  const cards = $('#p-blog .bcard-in')
    .filter((_, b) => $(b).attr('data-go') === 'blog-' + id)
    .first();
  return {
    id,
    title,
    lead,
    tag: tag ?? '',
    readTime: readTime ?? '',
    byline: plain(inline($, sec.find('.art-by'), li)),
    excerpt: plain(inline($, cards.find('p').first(), li)) || lead,
    keepLabel: keep.length ? plain(inline($, keep.find('b'), li)) : '',
    keep: keep.length ? inline($, keep.find('p'), li) : '',
    refs,
    refsTitle: plain(inline($, sec.find('.refs-h'), li)),
    blocks: group(
      body.filter(
        (b) =>
          !(b.type === 'h' && b.level === 1) &&
          !(
            b.type === 'h' &&
            b.level === 2 &&
            plain(b.text) === plain(inline($, sec.find('.refs-h'), li))
          ),
      ),
    ),
  };
}

LANGS.forEach((lang, i) => {
  const li = i === 0 ? -1 : i - 1;
  const dir = path.join(root, 'src/content/pages', lang);
  fs.mkdirSync(dir, { recursive: true });
  const science = pageOf('#p-pourquoi', li);
  const pages = {
    science,
    method: pageOf('#p-methode', li),
    mentions: pageOf('#p-mentions', li),
    cgv: pageOf('#p-cgv', li),
    privacy: pageOf('#p-confidentialite', li),
    sources: pageOf('#p-sources', li),
    transparency: pageOf('#p-transparence', li),
    gear: pageOf('#p-equipement', li),
    pro: pageOf('#p-pro', li),
  };
  for (const [name, pg] of Object.entries(pages))
    fs.writeFileSync(path.join(dir, name + '.json'), JSON.stringify(pg, null, 1));
  const method = pages.method;
  const posts = ARTICLES.map(([id, secId]) => {
    const a = article(id, secId, li);
    return { ...a, slug: slugify(a.title) };
  });
  fs.writeFileSync(path.join(dir, 'blog.json'), JSON.stringify(posts, null, 1));
  console.log(
    lang,
    '·',
    science.blocks.length,
    'blocs science ·',
    method.blocks.length,
    'blocs méthode ·',
    posts.map((p) => p.slug).join(' | '),
  );
});
console.log(`traductions : ${stats.ok} exactes, ${stats.fallback} en repli français`);
if (stats.missing.size) console.log([...stats.missing].slice(0, 12).join('\n'));
