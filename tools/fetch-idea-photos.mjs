// Finds a real, freely licensed photo for each gift idea whose exact product has a Wikidata entry with a Wikimedia Commons image.
// Only CC0 / CC BY / CC BY-SA / public domain photos are kept, and the credit is saved so it can be shown on the site.
// Polite and resumable (results are cached in tools/.photo-cache.json). Run: node tools/fetch-idea-photos.mjs
// Output: public/ideas/photos/<id>.<ext>, public/ideas/photo-credits.json, netlify/lib/idea-photos.mjs
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import IDEAS from '../netlify/lib/ideas-data.mjs';

const UA = 'GiftBloomPhotoFinder/1.0 (https://giftbloom.netlify.app/; low-volume lookup of freely licensed product photos)';
const CACHE = new URL('./.photo-cache.json', import.meta.url);
const OUT_DIR = new URL('../public/ideas/photos/', import.meta.url);
const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const save = () => fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1));

const PACE_MS = 1300; // one request about every 1.3 seconds: slow on purpose, Wikimedia asks bots to be gentle
async function api(base, params, tries = 5) {
  const url = `${base}?${new URLSearchParams({ format: 'json', ...params })}`;
  for (let i = 0; i < tries; i++) {
    await sleep(PACE_MS);
    try {
      const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json' } });
      if (res.status === 429 || res.status === 503) {
        const wait = Number(res.headers.get('retry-after')) || 20 * (i + 1);
        console.log(`  rate limited, waiting ${wait}s`);
        await sleep(wait * 1000);
        continue;
      }
      const text = await res.text();
      if (res.ok && text.trim().startsWith('{')) return JSON.parse(text);
    } catch { /* retry */ }
  }
  return null;
}
const WD = 'https://www.wikidata.org/w/api.php';
const COMMONS = 'https://commons.wikimedia.org/w/api.php';

const BRANDS = new Set(['apple', 'sony', 'samsung', 'nintendo', 'microsoft', 'google', 'amazon', 'logitech', 'razer', 'lego', 'nike', 'adidas', 'jbl', 'bose', 'dji', 'canon', 'fujifilm', 'casio', 'garmin', 'fitbit', 'dyson', 'yeti', 'meta', 'valve', 'anker', 'beats', 'hasbro', 'mattel', 'crayola']);
const GENERIC = new Set(['console', 'printer', 'headphones', 'headphone', 'earbuds', 'speaker', 'controller', 'headset', 'mouse', 'keyboard', 'watch', 'camera', 'drone', 'tablet', 'laptop', 'hoodie', 'sneakers', 'shoes', 'game', 'games', 'card', 'gift', 'set', 'pack', 'kit', 'edition', 'model', 'wireless', 'bluetooth', 'portable', 'digital', 'original', 'classic', 'new', 'the', 'and', 'for', 'with', 'by', 'of', 'in', 'a', 'an', 'gaming', 'smart', 'mini', 'video', 'handheld', 'noise', 'cancelling', 'noise-cancelling', 'action', 'instant', 'cube', 'puzzle', 'board', 'book', 'books', 'box', 'starter', 'complete', 'series', 'volume', 'vol']);
const core = (s) => s.toLowerCase()
  .replace(/\([^)]*\)/g, ' ')
  .replace(/\$\s?\d+/g, ' ')
  .replace(/\b\d+(\.\d+)?\s?(oz|fl oz|inch|in|gb|tb|mah|ft|kg|lb|pc|pcs|piece|pieces|count|ct|x\d+)\b/g, ' ')
  .replace(/\b\d+x\d+\b/g, ' ')
  .replace(/['’]s\b/g, '')
  .replace(/[^a-z0-9 ]+/g, ' ')
  .split(/\s+/).filter(t => t && !GENERIC.has(t) && !BRANDS.has(t));
function similarity(a, b) {
  const A = new Set(core(a)), B = new Set(core(b));
  if (!A.size || !B.size) return 0;
  const inter = [...A].filter(t => B.has(t)).length;
  return inter / Math.max(A.size, B.size);
}

// Plain everyday things ("Yoga mat", "Satin pillowcase") have no Wikidata entry, so do not waste requests on them.
const worthLooking = (title) => {
  const words = title.replace(/\([^)]*\)/g, ' ').split(/\s+/).filter(Boolean);
  const proper = words.slice(1).some(w => /^[A-Z0-9][A-Za-z0-9'’.\-]*$/.test(w) && !/^(Set|Pack|Kit|Box|Game|Card|Cards|Book|Edition|Series|Volume|Vol\.?|The|And|For|With|Of)$/.test(w));
  return proper || /[A-Z].*[A-Z]/.test(words[0] || '') || /['’]/.test(words[0] || '');
};

const queriesFor = (title) => {
  const clean = title.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  const words = clean.split(' ');
  // The full name, then the name without everyday words ("console", "Digital Edition", sizes), keeping brands and model names.
  const model = words.filter(w => !GENERIC.has(w.toLowerCase()) && !/^\$?\d+(\.\d+)?(oz|inch|gb|tb|mah|ft|kg|lb|pc|pcs)?$/i.test(w) || /^\d{1,2}$/.test(w)).join(' ');
  return [...new Set([clean, model])].filter(q => q.split(' ').length >= 1).slice(0, 2);
};

const OK_LICENSE = /^(cc0|cc[- ]by(?!-nc)(?!.*\bnc\b)(?!.*\bnd\b)|cc by-sa|public domain|pd)/i;
const licenseOk = (name = '') => OK_LICENSE.test(name) && !/\b(nc|nd)\b/i.test(name) && !/gfdl$/i.test(name.trim());
const stripHtml = (s = '') => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/\s+/g, ' ').trim();

async function findFor(idea) {
  const seen = new Set();
  for (const q of queriesFor(idea.title)) {
    const s = await api(WD, { action: 'wbsearchentities', search: q, language: 'en', limit: '6' });
    const cands = (s?.search || []).filter(c => !seen.has(c.id) && similarity(idea.title, c.label || '') >= 0.8);
    cands.forEach(c => seen.add(c.id));
    if (!cands.length) continue;
    const ents = await api(WD, { action: 'wbgetentities', ids: cands.map(c => c.id).join('|'), props: 'claims', languages: 'en' });
    for (const c of cands) {
      const file = ents?.entities?.[c.id]?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
      if (!file) continue;
      const info = await api(COMMONS, { action: 'query', titles: `File:${file}`, prop: 'imageinfo', iiprop: 'url|mime|extmetadata', iiurlwidth: '640' });
        const page = Object.values(info?.query?.pages || {})[0]?.imageinfo?.[0];
      if (!page || !/^image\/(jpeg|png)$/.test(page.mime)) continue;
      const meta = page.extmetadata || {};
      const license = meta.LicenseShortName?.value || '';
      if (!licenseOk(license)) continue;
      return {
        url: page.thumburl,
        ext: page.mime === 'image/png' ? 'png' : 'jpg',
        credit: stripHtml(meta.Artist?.value || 'Unknown author').slice(0, 120),
        license,
        source: page.descriptionurl,
        matched: c.label
      };
    }
  }
  return null;
}

const only = process.argv[2]; // optional: a name fragment, for testing
let done = 0;
for (const idea of IDEAS) {
  if (only && !idea.title.toLowerCase().includes(only.toLowerCase())) continue;
  if (cache[idea.id] === undefined) {
    cache[idea.id] = worthLooking(idea.title) ? await findFor(idea) : null;
    if (++done % 10 === 0) { save(); process.stdout.write(`  ${done} looked up...\n`); }
  }
}
save();

// Download the photos that matched and write the credits + module.
fs.mkdirSync(OUT_DIR, { recursive: true });
const photos = {};
for (const idea of IDEAS) {
  const hit = cache[idea.id];
  if (!hit) continue;
  const file = `${idea.id}.${hit.ext}`;
  const dest = new URL(file, OUT_DIR);
  if (!fs.existsSync(dest)) {
    let ok = false;
    for (let i = 0; i < 3 && !ok; i++) {
      try {
        const res = await fetch(hit.url, { headers: { 'user-agent': UA } });
        if (res.ok) { fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer())); ok = true; }
      } catch { /* retry */ }
      if (!ok) await sleep(1500);
    }
    if (!ok) continue;
    try { execFileSync('sips', ['-Z', '600', dest.pathname], { stdio: 'ignore' }); } catch { /* sips is macOS only; the 640px thumbnail is fine */ }
    await sleep(PACE_MS);
  }
  photos[idea.id] = { image: `/ideas/photos/${file}`, credit: hit.credit, license: hit.license, source: hit.source };
}
fs.writeFileSync(new URL('../netlify/lib/idea-photos.mjs', import.meta.url), `// GENERATED by tools/fetch-idea-photos.mjs - free-licensed photos from Wikimedia Commons, with credits.\nexport default ${JSON.stringify(photos, null, 1)};\n`);
const credits = IDEAS.filter(i => photos[i.id]).map(i => ({ title: i.title, ...photos[i.id] }));
fs.writeFileSync(new URL('../public/ideas/photo-credits.json', import.meta.url), JSON.stringify(credits));
console.log(`photos for ${Object.keys(photos).length} of ${IDEAS.length} ideas`);
