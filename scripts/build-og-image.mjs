// Image de partage par défaut (réseaux sociaux, messageries, aperçus) : public/images/og-fuseo.jpg, 1200×630.
// Usage : node scripts/build-og-image.mjs
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const logo = readFileSync(join(process.cwd(), 'public/images/email/fuseo-logo.png')).toString(
  'base64',
);
const stars = Array.from({ length: 46 }, (_, i) => {
  const x = (i * 193) % 1200;
  const y = (i * 97) % 630;
  const r = 1 + (i % 3);
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${0.2 + (i % 5) * 0.12}"/>`;
}).join('');

const html = `<!doctype html><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0}body{width:1200px;height:630px;font-family:Montserrat,'Helvetica Neue',Arial,sans-serif;color:#fff;
background:radial-gradient(700px 420px at 88% -10%,rgba(60,192,240,.34),transparent 65%),radial-gradient(520px 300px at 0% 110%,rgba(255,200,87,.2),transparent 70%),linear-gradient(160deg,#0b2f55,#061426);
position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:center;padding:0 90px}
svg{position:absolute;inset:0}h1{font-size:68px;line-height:1.06;letter-spacing:-2px;font-weight:800;max-width:860px;margin-top:34px}
h1 b{color:#ffc857}p{margin-top:22px;font-size:28px;font-weight:600;color:#cfe3f4;max-width:820px;line-height:1.35}
img{height:84px;width:auto;align-self:flex-start;position:relative}</style>
<svg width="1200" height="630">${stars}<path d="M560 560C700 560 760 380 900 420S1080 520 1200 330" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="3" stroke-dasharray="9 13"/>
<g transform="translate(1086 322) rotate(-16)" fill="#ffc857"><path d="M0 0l34 12-34 12 6-12z"/></g></svg>
<img src="data:image/png;base64,${logo}" alt="">
<h1>Arrivez à l'heure. <b>Votre corps aussi.</b></h1>
<p>Plan anti-jet lag personnalisé, conçu par des spécialistes du sommeil.</p>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: 'load' });
await page.screenshot({ path: 'public/images/og-fuseo.jpg', type: 'jpeg', quality: 86 });
await browser.close();
console.log('public/images/og-fuseo.jpg');
