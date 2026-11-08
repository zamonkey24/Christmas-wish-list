// The product catalog: a starter set plus every product people add by link (read by our own server, so the
// name, photo and price are real). Search, filter, sort and paginate happen here.
import { inferGift } from '../../src/utils/inferGift.js';

import { categoryOf, productIdOf } from './product-utils.mjs';
import STARTER from './starter-catalog.mjs';
import IDEAS from './ideas-data.mjs';

export { categoryOf, productIdOf };

export const starterCatalog = () => STARTER;
export const ideaCatalog = () => IDEAS;

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
  skin: ['skincare', 'facial', 'moisturizer', 'lotion', 'sunscreen'],
  skincare: ['skin', 'facial', 'moisturizer', 'cleanser', 'sunscreen'],
  bike: ['bicycle', 'cycling', 'pedal'],
  tech: ['gadget', 'wireless', 'electronic'],
  drone: ['fpv', 'quadcopter'],
  toy: ['game', 'fun'],
  giftcard: ['gift', 'card', 'egift']
};
const STOP = new Set(['thing', 'things', 'stuff', 'making', 'make', 'makes', 'nephew', 'niece', 'granddaughter', 'grandson', 'grandkids', 'grandchild', 'grandchildren', 'coworker', 'neighbor', 'teen', 'teens', 'teenager', 'teenagers', 'tween', 'tweens', 'kids', 'toddler', 'child', 'children', 'college', 'student', 'students', 'adult', 'adults', 'senior', 'seniors', 'retired', 'grandparent', 'grandparents', 'young', 'what', 'no', 'not', 'do', 'does', 'did', 'have', 'has', 'had', 'know', 'think', 'can', 'could', 'would', 'should', 'will', 'how', 'when', 'where', 'which', 'there', 'this', 'these', 'those', 'so', 'if', 'but', 'am', 'im', 'ive', 'dont', 'idk', 'a', 'an', 'the', 'for', 'and', 'or', 'with', 'to', 'of', 'in', 'on', 'my', 'me', 'i', 'under', 'over', 'around', 'about', 'some', 'something', 'any', 'good', 'best', 'gift', 'gifts', 'idea', 'ideas',
  'who', 'that', 'is', 'are', 'was', 'be', 'it', 'its', 'he', 'she', 'they', 'him', 'her', 'them', 'his', 'hers', 'their', 'we', 'you', 'your', 'our', 'at', 'as', 'by', 'from', 'up', 'down', 'than', 'too', 'very', 'really', 'just', 'please', 'help', 'need', 'needs', 'want', 'wants', 'like', 'likes', 'love', 'loves', 'into', 'enjoy', 'enjoys',
  'buy', 'get', 'find', 'looking', 'look', 'show', 'give', 'got', 'one', 'cheaper', 'cheap', 'expensive', 'more', 'less', 'budget', 'price', 'much', 'hello', 'hi', 'hey', 'thanks', 'thank',
  'brother', 'sister', 'mom', 'mother', 'dad', 'father', 'friend', 'friends', 'cousin', 'aunt', 'uncle', 'grandma', 'grandpa', 'son', 'daughter', 'wife', 'husband', 'boyfriend', 'girlfriend', 'teacher', 'boss', 'kid', 'teen', 'boy', 'girl', 'man', 'woman', 'year', 'old', 'birthday', 'christmas', 'holiday', 'present', 'presents']);

// Plain stemming so "puzzles", "printing" and "grills" still find "puzzle", "printer" and "grill".
const stem = (t) => (t.length > 6 && t.endsWith('ing') ? t.slice(0, -3) : t.length > 3 && t.endsWith('ies') ? `${t.slice(0, -3)}y` : t.length > 3 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t);

export const tokenize = (q = '') => [...new Set(String(q).toLowerCase().replace(/[^a-z0-9$ ]+/g, ' ').split(/\s+/).filter(t => t && !STOP.has(t) && !/^\$?\d+$/.test(t)).map(stem))];

const haystack = (p) => `${p.title} ${p.category} ${(p.tags || []).join(' ')} ${p.site}`.toLowerCase();

const starts = new Map();
// Whole-word match (with plural and -er/-ing endings): "print" finds "printer", "wash" does not find "washable", "face" does not find "interface".
const hasWord = (text, w) => {
  let re = starts.get(w);
  if (!re) { re = new RegExp(`(^|[^a-z0-9])${w.replace(/[^a-z0-9]/g, '\\$&')}(s|es|er|ers|ing|ed)?($|[^a-z0-9])`); starts.set(w, re); }
  return re.test(text);
};

function score(p, tokens) {
  if (!tokens.length) return 1;
  const h = haystack(p);
  const title = p.title.toLowerCase();
  let s = 0;
  for (const t of tokens) {
    const hits = [t, ...(SYNONYMS[t] || [])];
    let best = 0;
    hits.forEach((w, i) => {
      if (!hasWord(h, w)) return;
      const weight = (hasWord(title, w) ? 3 : 1) * (i === 0 ? 1 : 0.6);
      best = Math.max(best, weight);
    });
    if (!best) return 0; // every word has to match something
    s += best;
  }
  return s;
}

// How well does a real product title describe an idea? Every distinctive word of the idea (numbers and model names
// included, so "AirPods 4" does not match "AirPods Pro 2") must appear in the other title.
const MATCH_STOP = new Set(['the', 'and', 'for', 'with', 'by', 'of', 'a', 'an', 'in', 'on', 'to', 'new', 'pack', 'set', 'oz', 'fl', 'inch']);
const matchTokens = (s) => new Set(String(s).toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/['’]s\b/g, '').replace(/[^a-z0-9]+/g, ' ').split(' ').filter(t => t && !MATCH_STOP.has(t)).map(t => (t.length > 3 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t)));
const EDITION = new Set(['mini', 'pro', 'max', 'plus', 'ultra', 'lite', 'xl', 'se', 'air', 'slim', 'digital', 'kids', 'junior']);
export function titleMatch(ideaTitle, otherTitle) {
  const a = matchTokens(ideaTitle), b = matchTokens(otherTitle);
  if (a.size < 2) return 0;
  const base = [...a].filter(t => b.has(t)).length / a.size;
  // A different model is a different product: a missing number ("4" vs "Pro 2") or an extra/missing edition word fails the match.
  const missingNumber = [...a].some(t => /\d/.test(t) && !b.has(t));
  const edition = (x, y) => [...x].some(t => EDITION.has(t) && !y.has(t));
  return missingNumber || edition(a, b) || edition(b, a) ? Math.min(base, 0.5) : base;
}

export const AGE_GROUPS = ['kids', 'tweens', 'teens', 'young-adults', 'adults', 'seniors'];
const forAge = (p, age) => !age || !p.ages || p.ages.includes(age); // products without ages suit everyone
const trust = (p) => (p.starter ? 3 : p.kind === 'idea' ? 1 : 2); // verified products first, ideas last
const specific = (p, age) => (age && p.ages?.includes(age) ? 1 : 0); // made for this age beats "suits everyone"

export function searchProducts(all, { q = '', category = '', age = '', min = 0, max = Infinity, sort = 'relevance', page = 1, limit = 24 } = {}) {
  const tokens = tokenize(q);
  const base = all
    .map(p => ({ p, s: score(p, tokens) }))
    .filter(x => x.s > 0 && x.p.price >= min && x.p.price <= max);
  // Chip counts: categories reflect the chosen age; age counts reflect the chosen category.
  const counts = {};
  base.forEach(({ p }) => { if (forAge(p, age)) counts[p.category] = (counts[p.category] || 0) + 1; });
  const ageCounts = {};
  base.forEach(({ p }) => {
    if (category && p.category !== category) return;
    AGE_GROUPS.forEach(g => { if (forAge(p, g)) ageCounts[g] = (ageCounts[g] || 0) + 1; });
  });
  let filtered = base.filter(x => forAge(x.p, age));
  if (category) filtered = filtered.filter(x => x.p.category === category);
  const cmp = {
    'price-asc': (a, b) => a.p.price - b.p.price,
    'price-desc': (a, b) => b.p.price - a.p.price,
    newest: (a, b) => (b.p.addedAt || 0) - (a.p.addedAt || 0),
    relevance: (a, b) => b.s - a.s || specific(b.p, age) - specific(a.p, age) || trust(b.p) - trust(a.p)
  }[sort] || ((a, b) => b.s - a.s || specific(b.p, age) - specific(a.p, age) || trust(b.p) - trust(a.p));
  filtered.sort(cmp);
  const total = filtered.length;
  const size = Math.min(Math.max(Number(limit) || 24, 1), 60);
  const pages = Math.max(1, Math.ceil(total / size));
  const pg = Math.min(Math.max(Number(page) || 1, 1), pages);
  return { items: filtered.slice((pg - 1) * size, pg * size).map(x => x.p), total, page: pg, pages, categories: counts, ages: ageCounts };
}
