// Signale à IndexNow (Bing, Yandex, etc.) les pages indexables du plan du site. À lancer après la mise en ligne :
//   node scripts/indexnow.mjs
const host = 'fuseo.net';
const key = '0fda496fde6c411d0929797bd816dba2';

const sitemap = await (await fetch(`https://${host}/sitemap.xml`)).text();
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host, key, keyLocation: `https://${host}/${key}.txt`, urlList }),
});
console.log(`${urlList.length} adresses envoyées : HTTP ${res.status}`);
if (!res.ok) process.exit(1);
