// Second pass after tools/fetch-idea-photos.mjs: for ideas that still have no photo, search Wikimedia Commons for a freely
// licensed photo of that product (or, for everyday things like "Yoga mat", of that kind of thing). Those are marked
// "example: true" so the site can say "Example photo". Branded products must match every name word or are skipped.
// Resumable (tools/.example-cache.json). Run AFTER fetch-idea-photos.mjs: node tools/fetch-example-photos.mjs
// It adds to netlify/lib/idea-photos.mjs and public/ideas/photo-credits.json (re-running fetch-idea-photos.mjs drops them).
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import IDEAS from '../netlify/lib/ideas-data.mjs';

const UA = 'GiftBloomPhotoFinder/1.0 (https://giftbloom.netlify.app/; low-volume lookup of freely licensed product photos)';
const CACHE = new URL('./.example-cache.json', import.meta.url);
const OUT_DIR = new URL('../public/ideas/photos/', import.meta.url);
const PHOTOS_MJS = new URL('../netlify/lib/idea-photos.mjs', import.meta.url);
const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};
const existing = (await import(PHOTOS_MJS.href)).default;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const PACE_MS = 1300;
const COMMONS = 'https://commons.wikimedia.org/w/api.php';

async function api(params, tries = 5) {
  const url = `${COMMONS}?${new URLSearchParams({ format: 'json', ...params })}`;
  for (let i = 0; i < tries; i++) {
    await sleep(PACE_MS);
    try {
      const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json' } });
      if (res.status === 429 || res.status === 503) { const w = Number(res.headers.get('retry-after')) || 20 * (i + 1); console.log(`  rate limited, waiting ${w}s`); await sleep(w * 1000); continue; }
      const text = await res.text();
      if (res.ok && text.trim().startsWith('{')) return JSON.parse(text);
    } catch { /* retry */ }
  }
  return null;
}

const STOP = new Set(['the', 'and', 'for', 'with', 'by', 'of', 'in', 'a', 'an', 'to', 'set', 'pack', 'kit', 'classic', 'new', 'mini', 'portable', 'wireless', 'digital', 'smart', 'original', 'premium', 'deluxe', 'edition', 'inch', 'oz']);
const words = (s) => String(s).toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/['’]s\b/g, '').replace(/[^a-z0-9]+/g, ' ').split(/\s+/)
  .filter(t => t && !STOP.has(t) && !/^\d+(oz|inch|gb|tb|mah|ft|kg|lb|pc|pcs)?$/.test(t))
  .map(t => (t.length > 3 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t));
const branded = (title) => {
  const w = title.replace(/\([^)]*\)/g, ' ').split(/\s+/).filter(Boolean);
  return w.slice(1).some(x => /^[A-Z0-9][A-Za-z0-9'’.\-]*$/.test(x) && !/^(Set|Pack|Kit|Box|Game|Card|Cards|Book|Edition|Series|Volume|The|And|For|With|Of)$/.test(x)) || /[A-Z].*[A-Z]/.test(w[0] || '') || /['’]/.test(w[0] || '');
};

const OK_LICENSE = /^(cc0|cc[- ]by(?!-nc)|cc by-sa|public domain|pd)/i;
const licenseOk = (n = '') => OK_LICENSE.test(n) && !/\b(nc|nd)\b/i.test(n);
const strip = (s = '') => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/\s+/g, ' ').trim();

async function search(q, need, strict) {
  const r = await api({ action: 'query', generator: 'search', gsrsearch: `${q} filetype:bitmap`, gsrnamespace: '6', gsrlimit: '8', prop: 'imageinfo', iiprop: 'url|mime|size|extmetadata', iiurlwidth: '640' });
  const pages = Object.values(r?.query?.pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
  for (const pg of pages) {
    const ii = pg.imageinfo?.[0];
    if (!ii || !/^image\/(jpeg|png)$/.test(ii.mime) || ii.width < 350 || ii.height < 250) continue;
    const meta = ii.extmetadata || {};
    if (!licenseOk(meta.LicenseShortName?.value)) continue;
    const name = pg.title.replace(/^File:/, '').replace(/\.[a-z]+$/i, '');
    const hay = new Set(words(`${name} ${strip(meta.ObjectName?.value)}`));
    const hit = need.filter(t => hay.has(t)).length / need.length;
    if (hit < (strict ? 1 : 0.99)) continue; // every important word of the name must be in the file's title
    if (/logo|diagram|screenshot|icon|map of|poster|cover art|flag of|\bsvg\b/i.test(name)) continue;
    return { url: ii.thumburl, ext: ii.mime === 'image/png' ? 'png' : 'jpg', credit: strip(meta.Artist?.value || 'Unknown author').slice(0, 120), license: meta.LicenseShortName.value, source: ii.descriptionurl, matched: name };
  }
  return null;
}

async function findFor(idea) {
  const need = words(idea.title);
  if (!need.length) return null;
  const isBrand = branded(idea.title);
  const clean = idea.title.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  let hit = await search(clean, need, isBrand);
  // everyday things: a photo of that kind of thing is fine as an example, so try the plain noun phrase too
  if (!hit && !isBrand && need.length > 2) { const tail = need.slice(-2); hit = await search(tail.join(' '), tail, false); }
  return hit;
}

// The matcher is loose, so a person looked at every result: only the titles in this list were judged to show the right kind of product.
const approved = new Set(JSON.parse(fs.readFileSync(new URL('./example-photo-approved.json', import.meta.url), 'utf8')));
let done = 0;
const only = process.argv[2];
const todo = IDEAS.filter(i => (!existing[i.id] || existing[i.id].example) && (!only || i.title.toLowerCase().includes(only.toLowerCase())));
console.log(`${todo.length} ideas still without a photo`);
for (const idea of todo) {
  if (cache[idea.id] === undefined) {
    cache[idea.id] = await findFor(idea);
    if (++done % 10 === 0) { fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1)); console.log(`  ${done} looked up...`); }
  }
}
fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1));

fs.mkdirSync(OUT_DIR, { recursive: true });
const photos = Object.fromEntries(Object.entries(existing).filter(([, v]) => !v.example));
for (const idea of todo) {
  const hit = cache[idea.id];
  if (!hit || !approved.has(idea.title)) continue;
  const file = `${idea.id}.${hit.ext}`;
  const dest = new URL(file, OUT_DIR);
  if (!fs.existsSync(dest)) {
    let ok = false;
    for (let i = 0; i < 3 && !ok; i++) {
      try { const res = await fetch(hit.url, { headers: { 'user-agent': UA } }); if (res.ok) { fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer())); ok = true; } } catch { /* retry */ }
      if (!ok) await sleep(1500);
    }
    if (!ok) continue;
    try { execFileSync('sips', ['-Z', '600', dest.pathname], { stdio: 'ignore' }); } catch { /* macOS only */ }
    await sleep(PACE_MS);
  }
  photos[idea.id] = { image: `/ideas/photos/${file}`, credit: hit.credit, license: hit.license, source: hit.source, example: true };
}
fs.writeFileSync(PHOTOS_MJS, `// GENERATED by tools/fetch-idea-photos.mjs + tools/fetch-example-photos.mjs - free-licensed photos from Wikimedia Commons, with credits.\nexport default ${JSON.stringify(photos, null, 1)};\n`);
fs.writeFileSync(new URL('../public/ideas/photo-credits.json', import.meta.url), JSON.stringify(IDEAS.filter(i => photos[i.id]).map(i => ({ title: i.title, ...photos[i.id] }))));
console.log(`photos for ${Object.keys(photos).length} of ${IDEAS.length} ideas (${Object.values(photos).filter(p => p.example).length} are example photos)`);
