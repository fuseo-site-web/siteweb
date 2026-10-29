// Génère les illustrations d'articles du blog (1200×675, charte Fuseo : nuit, ciel, ambre) en JPEG dans public/images/blog/.
// Usage : node scripts/build-blog-covers.mjs   (nécessite Playwright et lucide-react, déjà dans le projet)
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as L from 'lucide-react';
import { chromium } from '@playwright/test';

const out = join(import.meta.dirname, '..', 'public', 'images', 'blog');
mkdirSync(out, { recursive: true });

const icon = (name, size, color = '#fff', sw = 1.6) =>
  renderToStaticMarkup(createElement(L[name], { size, color, strokeWidth: sw }));

// id d'article → habillage (dégradé, halo, icône principale, icônes satellites, motif).
const COVERS = {
  'jet-lag-est-ouest': {
    g: ['#061426', '#0b2f55', '#1d5d9b'],
    glow: ['#ffc857', 0.78, 0.2],
    main: 'Globe',
    sats: ['Plane', 'Compass', 'Sunrise'],
    motif: 'stars',
  },
  'lumiere-horloge-biologique': {
    g: ['#0b2f55', '#1d5d9b', '#f0a94a'],
    glow: ['#ffe6a6', 0.5, 0.78],
    main: 'Sun',
    sats: ['Eye', 'Clock', 'Sunrise'],
    motif: 'rays',
  },
  'melatonine-jet-lag': {
    g: ['#150f33', '#1b2a6b', '#0b2f55'],
    glow: ['#b9c6f0', 0.8, 0.22],
    main: 'Moon',
    sats: ['Pill', 'Sparkles', 'BedDouble'],
    motif: 'stars',
  },
  'dormir-en-avion': {
    g: ['#061426', '#0b2f55', '#2f5f9e'],
    glow: ['#3cc0f0', 0.84, 0.22],
    main: 'Plane',
    sats: ['Moon', 'BedDouble', 'Headphones'],
    motif: 'clouds',
  },
  'cafeine-sieste-premier-jour': {
    g: ['#0b2f55', '#1d5d9b', '#3cc0f0'],
    glow: ['#ffc857', 0.25, 0.75],
    main: 'Coffee',
    sats: ['Clock', 'BedDouble', 'Zap'],
    motif: 'hills',
  },
  'preparer-horloge-avant-depart': {
    g: ['#061426', '#0b2f55', '#1d5d9b'],
    glow: ['#ffc857', 0.8, 0.8],
    main: 'AlarmClock',
    sats: ['Luggage', 'CalendarCheck', 'Plane'],
    motif: 'stars',
  },
};

function rng(seed) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function scene(id, c) {
  const r = rng([...id].reduce((a, ch) => a + ch.charCodeAt(0), 7));
  const stars = Array.from(
    { length: 46 },
    () =>
      `<i style="left:${r() * 100}%;top:${r() * 70}%;opacity:${0.25 + r() * 0.6};width:${1 + r() * 2.6}px;height:${1 + r() * 2.6}px"></i>`,
  ).join('');
  const motif =
    c.motif === 'rays'
      ? `<div class="rays"></div>`
      : c.motif === 'clouds'
        ? `<div class="cloud" style="left:6%;top:62%;width:380px"></div><div class="cloud" style="left:58%;top:70%;width:460px"></div><div class="cloud" style="left:30%;top:80%;width:300px"></div>`
        : '';
  const sats = c.sats
    .map((n, i) => {
      const pos = [
        ['14%', '22%'],
        ['82%', '66%'],
        ['20%', '74%'],
      ][i];
      return `<div class="chip" style="left:${pos[0]};top:${pos[1]}">${icon(n, 34, '#fff', 1.8)}</div>`;
    })
    .join('');
  return `<!doctype html><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0}
  body{width:1200px;height:675px;overflow:hidden;position:relative;font-family:sans-serif;
    background:radial-gradient(900px 520px at ${c.glow[1] * 100}% ${c.glow[2] * 100}%, ${c.glow[0]}55, transparent 62%),linear-gradient(160deg,${c.g[0]},${c.g[1]} 55%,${c.g[2]})}
  i{position:absolute;border-radius:50%;background:#fff}
  .orb{position:absolute;left:${c.glow[1] * 100}%;top:${c.glow[2] * 100}%;width:190px;height:190px;margin:-95px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fff,${c.glow[0]} 55%,${c.glow[0]}00 72%);opacity:.9;filter:blur(1px)}
  .ring{position:absolute;left:50%;top:48%;width:430px;height:430px;margin:-215px;border:2px dashed rgba(255,255,255,.28);border-radius:50%}
  .ring2{position:absolute;left:50%;top:48%;width:560px;height:560px;margin:-280px;border:1.5px solid rgba(255,255,255,.12);border-radius:50%}
  .core{position:absolute;left:50%;top:48%;width:270px;height:270px;margin:-135px;border-radius:50%;display:grid;place-items:center;
    background:linear-gradient(145deg,rgba(255,255,255,.22),rgba(255,255,255,.06));border:2px solid rgba(255,255,255,.35);box-shadow:0 30px 80px rgba(0,0,0,.35),inset 0 0 50px rgba(255,255,255,.12)}
  .chip{position:absolute;width:86px;height:86px;margin:-43px;border-radius:26px;display:grid;place-items:center;background:rgba(255,255,255,.12);border:1.5px solid rgba(255,255,255,.3);backdrop-filter:blur(6px);box-shadow:0 14px 40px rgba(0,0,0,.3)}
  .rays{position:absolute;left:${c.glow[1] * 100}%;top:${c.glow[2] * 100}%;width:1400px;height:1400px;margin:-700px;background:repeating-conic-gradient(from 0deg,rgba(255,236,170,.16) 0 4deg,transparent 4deg 14deg);mask:radial-gradient(circle,#000 8%,transparent 62%)}
  .cloud{position:absolute;height:70px;border-radius:70px;background:rgba(255,255,255,.16);box-shadow:60px -26px 0 -6px rgba(255,255,255,.13),-50px -14px 0 -10px rgba(255,255,255,.1)}
  .wave{position:absolute;left:0;right:0;bottom:0;height:190px}
  </style>
  ${stars}<div class="orb"></div>${motif}<div class="ring2"></div><div class="ring"></div>
  <div class="core">${icon(c.main, 150, '#fff', 1.4)}</div>${sats}
  <svg class="wave" viewBox="0 0 1200 190" preserveAspectRatio="none"><path d="M0 120C200 60 360 170 600 120S1000 60 1200 110V190H0Z" fill="rgba(6,20,38,.55)"/><path d="M0 150C220 110 420 190 650 150S1020 110 1200 150V190H0Z" fill="rgba(6,20,38,.8)"/></svg>`;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 675 } });
for (const [id, c] of Object.entries(COVERS)) {
  await page.setContent(scene(id, c));
  await page.screenshot({ path: join(out, `${id}.jpg`), type: 'jpeg', quality: 82 });
  console.log('✓', id);
}
await browser.close();
