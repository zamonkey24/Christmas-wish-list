// The product catalog: a starter set plus every product people add by link (read by our own server, so the
// name, photo and price are real). Search, filter, sort and paginate happen here.
import crypto from 'node:crypto';
import fs from 'node:fs';
import { inferGift } from '../../src/utils/inferGift.js';

export const CATEGORIES = ['Fragrance', 'Hair care', 'Skincare & body', 'Tech & gadgets', 'Bikes & outdoors', 'Fun & games', 'Gift cards', 'Everyday'];

export const categoryOf = (tags = []) => {
  if (tags.includes('giftcard')) return 'Gift cards';
  if (tags.includes('fragrance')) return 'Fragrance';
  if (tags.includes('hair')) return 'Hair care';
  if (tags.includes('skin')) return 'Skincare & body';
  if (tags.includes('outdoors')) return 'Bikes & outdoors';
  if (tags.includes('tech')) return 'Tech & gadgets';
  if (tags.includes('fun')) return 'Fun & games';
  return 'Everyday';
};

// One id per product: the Amazon ASIN when there is one, otherwise a hash of the link.
export function productIdOf(url) {
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
    if (m) return `az_${m[1].toUpperCase()}`;
    return `p_${crypto.createHash('sha1').update(u.hostname + u.pathname).digest('hex').slice(0, 12)}`;
  } catch {
    return `p_${crypto.createHash('sha1').update(String(url)).digest('hex').slice(0, 12)}`;
  }
}

let starter = null;
export function starterCatalog() {
  if (!starter) {
    try { starter = JSON.parse(fs.readFileSync(new URL('./starter-catalog.json', import.meta.url), 'utf8')); } catch { starter = []; }
  }
  return starter;
}

// Turns something a visitor's server fetch found into a catalog entry (or null if it is not complete enough).
export function makeProduct({ title, image, price, url, site }) {
  if (!title || !image || !(price > 0) || !url) return null;
  const meta = inferGift(title, price);
  return {
    id: productIdOf(url),
    title: String(title).slice(0, 200),
    price: Math.round(price),
    image: String(image).slice(0, 2000),
    url: String(url).slice(0, 2000),
    site: String(site || new URL(url).hostname.replace(/^www\./, '')).slice(0, 80),
    category: categoryOf(meta.tags),
    tags: meta.tags,
    addedAt: Date.now()
  };
}

// Extra words people use for the same thing.
const SYNONYMS = {
  cologne: ['fragrance', 'perfume', 'parfum', 'toilette'],
  perfume: ['fragrance', 'cologne', 'parfum', 'toilette'],
  fragrance: ['cologne', 'perfume', 'parfum', 'toilette'],
  smell: ['fragrance', 'cologne', 'scent'],
  hair: ['curl', 'shampoo', 'gel', 'mousse', 'styling'],
  curly: ['curl', 'hair'],
  skin: ['skincare', 'face', 'moisturizer', 'lotion', 'sunscreen'],
  skincare: ['skin', 'face', 'moisturizer'],
  bike: ['bicycle', 'cycling', 'pedal'],
  tech: ['gadget', 'wireless', 'electronic'],
  drone: ['fpv', 'quadcopter'],
  toy: ['game', 'fun'],
  giftcard: ['gift', 'card', 'egift']
};
const STOP = new Set(['what', 'no', 'not', 'do', 'does', 'did', 'have', 'has', 'had', 'know', 'think', 'can', 'could', 'would', 'should', 'will', 'how', 'when', 'where', 'which', 'there', 'this', 'these', 'those', 'so', 'if', 'but', 'am', 'im', 'ive', 'dont', 'idk', 'a', 'an', 'the', 'for', 'and', 'or', 'with', 'to', 'of', 'in', 'on', 'my', 'me', 'i', 'under', 'over', 'around', 'about', 'some', 'something', 'any', 'good', 'best', 'gift', 'gifts', 'idea', 'ideas',
  'who', 'that', 'is', 'are', 'was', 'be', 'it', 'its', 'he', 'she', 'they', 'him', 'her', 'them', 'his', 'hers', 'their', 'we', 'you', 'your', 'our', 'at', 'as', 'by', 'from', 'up', 'down', 'than', 'too', 'very', 'really', 'just', 'please', 'help', 'need', 'needs', 'want', 'wants', 'like', 'likes', 'love', 'loves', 'into', 'enjoy', 'enjoys',
  'buy', 'get', 'find', 'looking', 'look', 'show', 'give', 'got', 'one', 'cheaper', 'cheap', 'expensive', 'more', 'less', 'budget', 'price', 'much', 'hello', 'hi', 'hey', 'thanks', 'thank',
  'brother', 'sister', 'mom', 'mother', 'dad', 'father', 'friend', 'friends', 'cousin', 'aunt', 'uncle', 'grandma', 'grandpa', 'son', 'daughter', 'wife', 'husband', 'boyfriend', 'girlfriend', 'teacher', 'boss', 'kid', 'teen', 'boy', 'girl', 'man', 'woman', 'year', 'old', 'birthday', 'christmas', 'holiday', 'present', 'presents']);

export const tokenize = (q = '') => String(q).toLowerCase().replace(/[^a-z0-9$ ]+/g, ' ').split(/\s+/).filter(t => t && !STOP.has(t) && !/^\$?\d+$/.test(t));

const haystack = (p) => `${p.title} ${p.category} ${(p.tags || []).join(' ')} ${p.site}`.toLowerCase();

function score(p, tokens) {
  if (!tokens.length) return 1;
  const h = haystack(p);
  const title = p.title.toLowerCase();
  let s = 0;
  for (const t of tokens) {
    const hits = [t, ...(SYNONYMS[t] || [])];
    let best = 0;
    hits.forEach((w, i) => {
      if (!h.includes(w)) return;
      const weight = (title.includes(w) ? 3 : 1) * (i === 0 ? 1 : 0.6);
      best = Math.max(best, weight);
    });
    if (!best) return 0; // every word has to match something
    s += best;
  }
  return s;
}

export function searchProducts(all, { q = '', category = '', min = 0, max = Infinity, sort = 'relevance', page = 1, limit = 24 } = {}) {
  const tokens = tokenize(q);
  const base = all
    .map(p => ({ p, s: score(p, tokens) }))
    .filter(x => x.s > 0 && x.p.price >= min && x.p.price <= max);
  const counts = {};
  base.forEach(({ p }) => { counts[p.category] = (counts[p.category] || 0) + 1; });
  const filtered = category ? base.filter(x => x.p.category === category) : base;
  const cmp = {
    'price-asc': (a, b) => a.p.price - b.p.price,
    'price-desc': (a, b) => b.p.price - a.p.price,
    newest: (a, b) => (b.p.addedAt || 0) - (a.p.addedAt || 0),
    relevance: (a, b) => b.s - a.s || (b.p.starter ? 1 : 0) - (a.p.starter ? 1 : 0)
  }[sort] || null;
  filtered.sort(cmp || ((a, b) => b.s - a.s));
  const total = filtered.length;
  const size = Math.min(Math.max(Number(limit) || 24, 1), 60);
  const pages = Math.max(1, Math.ceil(total / size));
  const pg = Math.min(Math.max(Number(page) || 1, 1), pages);
  return { items: filtered.slice((pg - 1) * size, pg * size).map(x => x.p), total, page: pg, pages, categories: counts };
}
