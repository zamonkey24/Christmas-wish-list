// Bloom AI's built-in brain, used when no AI key is set (and as the safety net if the AI call fails).
// It understands ages, budgets, hobbies, follow-ups ("cheaper", "something else") and explains each pick.
import { searchProducts, tokenize } from './catalog.mjs';

export const MAX_PICKS = 4;
const AGE_LABEL = { kids: 'kids', tweens: 'tweens', teens: 'teens', 'young-adults': 'young adults', adults: 'adults', seniors: 'people 50+' };

// ---------- who is it for?
export function ageFrom(text) {
  const t = ` ${text.toLowerCase()} `;
  const num = t.match(/\b(\d{1,2})\s*(?:-|\s)?(?:year|yr|yo)/) || t.match(/\b(?:age|aged|turning|turns)\s*(\d{1,2})\b/);
  if (num) {
    const n = Number(num[1]);
    if (n <= 9) return 'kids';
    if (n <= 12) return 'tweens';
    if (n <= 17) return 'teens';
    if (n <= 25) return 'young-adults';
    if (n <= 49) return 'adults';
    return 'seniors';
  }
  if (/\b(grandma|grandpa|grandmother|grandfather|grandparents?|retired|retirement|senior|seniors|elderly|great[- ]aunt)\b/.test(t)) return 'seniors';
  if (/\b(tween|tweens|middle school)\b/.test(t)) return 'tweens';
  if (/\b(teen|teens|teenage|teenaged|teenager|teenagers|high school|highschooler)\b/.test(t)) return 'teens';
  if (/\b(toddler|little kid|young child|preschool|kindergarten)\b/.test(t) || /\b(kid|kids|child|children|son|daughter|nephew|niece|grandson|granddaughter)\b/.test(t)) return 'kids';
  if (/\b(college|university|dorm|grad student|young adult|20s|twenties|first apartment|girlfriend|boyfriend)\b/.test(t)) return 'young-adults';
  if (/\b(adult|dad|mom|father|mother|husband|wife|boss|coworker|30s|40s|thirties|forties)\b/.test(t)) return 'adults';
  return '';
}

// ---------- what do they like? (hobby words -> catalog searches)
const INTERESTS = [
  { label: 'gaming', words: ['gamer', 'gaming', 'video game', 'videogame', 'games', 'fortnite', 'minecraft', 'roblox', 'xbox', 'playstation', 'nintendo', 'esports'], queries: ['gaming', 'controller', 'console', 'headset'] },
  { label: '3D printing & making', words: ['3d print', '3d-print', 'maker', 'tinker', 'electronics', 'robot', 'robotics', 'coding', 'programming', 'arduino', 'engineer', 'engineering', 'stem'], queries: ['3d printer', 'arduino', 'raspberry', 'robot'] },
  { label: 'science', words: ['science', 'space', 'astronomy', 'stars', 'chemistry', 'experiments'], queries: ['science', 'telescope', 'microscope', 'experiment'] },
  { label: 'anime & manga', words: ['anime', 'manga', 'otaku'], queries: ['manga', 'anime'] },
  { label: 'reading', words: ['reader', 'reading', 'books', 'bookworm', 'novel', 'novels'], queries: ['book', 'kindle'] },
  { label: 'music', words: ['music', 'guitar', 'piano', 'band', 'singer', 'singing', 'drummer', 'dj', 'instrument', 'vinyl', 'records'], queries: ['guitar', 'keyboard', 'record player', 'ukulele', 'microphone'] },
  { label: 'headphones & audio', words: ['headphones', 'earbuds', 'speaker', 'podcast', 'airpods'], queries: ['headphones', 'earbuds', 'speaker'] },
  { label: 'art & crafts', words: ['art', 'artist', 'drawing', 'painting', 'crafts', 'crafty', 'sketch', 'creative', 'diy'], queries: ['art', 'markers', 'paint', 'sketchbook', 'craft'] },
  { label: 'sports', words: ['sports', 'basketball', 'soccer', 'football', 'athlete', 'athletic', 'tennis', 'baseball', 'swimming', 'volleyball'], queries: ['basketball', 'soccer', 'football', 'sports'] },
  { label: 'skating & scooters', words: ['skate', 'skateboard', 'skating', 'scooter', 'roller'], queries: ['skateboard', 'skates', 'scooter'] },
  { label: 'biking', words: ['bike', 'bikes', 'biking', 'cycling', 'cyclist', 'bicycle'], queries: ['bike', 'helmet', 'bike light'] },
  { label: 'the outdoors', words: ['outdoors', 'camping', 'hiking', 'hiker', 'fishing', 'nature', 'adventure', 'grilling', 'bbq', 'barbecue', 'grill'], queries: ['camping', 'hiking', 'grill', 'outdoor'] },
  { label: 'fitness', words: ['fitness', 'gym', 'workout', 'workouts', 'running', 'runner', 'yoga', 'lifting', 'exercise', 'training'], queries: ['yoga', 'fitness', 'resistance', 'running', 'massager'] },
  { label: 'cooking & coffee', words: ['cooking', 'cook', 'chef', 'baking', 'baker', 'kitchen', 'foodie', 'coffee', 'espresso', 'tea', 'grilling'], queries: ['kitchen', 'coffee', 'cooking', 'knife', 'tea'] },
  { label: 'skincare', words: ['skincare', 'skin care', 'glowing', 'acne', 'moisturizer', 'sunscreen', 'face wash', 'facial'], queries: ['skincare', 'cleanser', 'sunscreen', 'moisturizer'] },
  { label: 'makeup & beauty', words: ['makeup', 'beauty', 'lipstick', 'mascara', 'cosmetics', 'blush'], queries: ['makeup', 'lip', 'mascara', 'blush'] },
  { label: 'hair', words: ['hair', 'curly', 'curls', 'haircare', 'hairstyle', 'styling'], queries: ['hair', 'curl', 'styling'] },
  { label: 'fragrance', words: ['cologne', 'perfume', 'fragrance', 'smell good', 'smells good', 'scent'], queries: ['cologne', 'perfume', 'fragrance'] },
  { label: 'fashion & shoes', words: ['fashion', 'sneakers', 'sneakerhead', 'shoes', 'clothes', 'clothing', 'style', 'stylish', 'outfit', 'hoodie', 'streetwear'], queries: ['sneakers', 'hoodie', 'shoes', 'jacket'] },
  { label: 'photography', words: ['photo', 'photos', 'photography', 'camera', 'vlog', 'youtube', 'tiktok', 'content creator', 'streamer', 'streaming'], queries: ['camera', 'instant', 'tripod', 'microphone', 'ring light'] },
  { label: 'tech', words: ['tech', 'gadget', 'gadgets', 'techie', 'electronics', 'smart home', 'phone'], queries: ['gadget', 'wireless', 'charger', 'smart'] },
  { label: 'board games & puzzles', words: ['board game', 'board games', 'puzzle', 'puzzles', 'card games', 'tabletop', 'strategy games', 'dnd', 'd&d'], queries: ['board game', 'puzzle', 'card game', 'dungeons'] },
  { label: 'collecting', words: ['collect', 'collector', 'collecting', 'pokemon', 'pokémon', 'lego', 'figures', 'funko'], queries: ['pokémon', 'lego', 'funko', 'collectible'] },
  { label: 'cozy & relaxing', words: ['cozy', 'relax', 'relaxing', 'self care', 'self-care', 'spa', 'sleep', 'comfy', 'calm', 'stress'], queries: ['blanket', 'candle', 'massager', 'sleep', 'bath'] },
  { label: 'travel', words: ['travel', 'traveler', 'traveling', 'trip', 'vacation', 'backpacking'], queries: ['travel', 'backpack', 'luggage'] },
  { label: 'room decor', words: ['room', 'decor', 'aesthetic', 'dorm room', 'bedroom', 'led lights'], queries: ['lights', 'lamp', 'decor', 'poster'] },
  { label: 'school & study', words: ['school', 'study', 'studying', 'homework', 'student', 'college', 'notebook'], queries: ['notebook', 'planner', 'calculator', 'pens', 'backpack'] },
  { label: 'gardening', words: ['garden', 'gardening', 'plants', 'birds', 'bird watching', 'birdwatching'], queries: ['garden', 'bird', 'plant'] },
  { label: 'little kids play', words: ['toys', 'toy', 'play', 'playing', 'pretend'], queries: ['toy', 'playset', 'lego', 'doll'] },
  { label: 'gift cards', words: ['gift card', 'gift cards', 'giftcard'], queries: ['gift card'] }
];

const money = (t) => {
  const under = t.match(/(?:under|below|less than|max(?:imum)?|up to|at most|no more than|within)\s*\$?\s*(\d{1,5})/i);
  if (under) return { max: Number(under[1]) };
  const between = t.match(/\$?\s*(\d{1,5})\s*(?:-|to|and)\s*\$?\s*(\d{1,5})/i);
  if (between) return { min: Number(between[1]), max: Number(between[2]) };
  const around = t.match(/(?:around|about|roughly|budget(?: of| is)?)\s*\$?\s*(\d{1,5})/i) || t.match(/\$\s*(\d{1,5})/);
  if (around) { const n = Number(around[1]); return { min: Math.round(n * 0.6), max: Math.round(n * 1.15), around: n }; }
  return {};
};

const has = (t, re) => re.test(` ${t.toLowerCase()} `);

// Reads the whole chat: the newest message wins for the budget, older ones keep supplying interests.
export function parseIntent(messages) {
  const users = messages.filter(m => m.role === 'user').map(m => m.content);
  const userText = users.join(' ').slice(-1500);
  const last = users[users.length - 1] || '';
  const newest = money(last);
  const budget = Object.keys(newest).length ? newest : money(userText);
  const lower = userText.toLowerCase();
  const interests = INTERESTS.filter(i => i.words.some(w => lower.includes(w)));
  const wantsLast = last.toLowerCase();
  return {
    ...budget,
    age: ageFrom(last) || ageFrom(userText),
    interests,
    tokens: tokenize(`${userText}`).slice(0, 10),
    // what the latest message asks for relative to what was shown before
    cheaper: /\b(cheaper|less expensive|lower|smaller budget|too (?:much|expensive|pricey)|budget[- ]friendly|affordable|save)\b/.test(wantsLast),
    pricier: /\b(more expensive|pricier|splurge|treat|nicer|better quality|higher budget|go bigger|upgrade)\b/.test(wantsLast),
    another: /\b(something else|something different|another|different|other ideas|more ideas|more options|show more|else|again)\b/.test(wantsLast) || /^\s*more\b/.test(wantsLast),
    similar: /\b(more like|similar|like that|like the first|like those)\b/.test(wantsLast),
    why: /\b(why|explain|how come)\b/.test(wantsLast),
    outsideList: /\b(catalog|ideas|not on (?:their|his|her|the) list|other than (?:their|his|her|the) (?:list|wishlist)|outside)\b/.test(wantsLast),
    surprise: /\b(surprise me|anything|you choose|your choice|no idea|dont know|don't know)\b/.test(wantsLast),
    luxury: /\b(special|luxury|premium|splurge|big gift|main gift)\b/.test(lower)
  };
}

// ---------- ranking
const norm = (s) => s.toLowerCase();
function interestHits(p, intent) {
  const h = `${p.title} ${p.category} ${(p.tags || []).join(' ')}`.toLowerCase();
  let hits = 0;
  const matched = [];
  for (const it of intent.interests) {
    if (it.queries.some(q => searchProducts([p], { q }).total > 0) || it.words.some(w => h.includes(w))) { hits++; matched.push(it.label); }
  }
  return { hits, matched };
}
const tokenHits = (p, intent) => intent.tokens.filter(t => searchProducts([p], { q: t }).total > 0).length;

export function candidatePool(catalog, intent, { exclude = new Set() } = {}) {
  const seen = new Map();
  const range = { min: intent.min || 0, max: intent.max ?? Infinity };
  const add = (r) => r.items.forEach(p => { if (!exclude.has(p.id) && !seen.has(p.id)) seen.set(p.id, p); });
  const ages = intent.age ? [intent.age, ''] : [''];
  for (const age of ages) {
    const queries = [...intent.interests.flatMap(i => i.queries), intent.tokens.join(' '), ...intent.tokens].filter(Boolean);
    for (const q of [...new Set(queries)]) add(searchProducts(catalog, { q, age, ...range, limit: 20 }));
    if (!queries.length) add(searchProducts(catalog, { age, ...range, limit: 60 }));
    if (seen.size >= 12) break;
  }
  if (seen.size < 6) add(searchProducts(catalog, { ...range, limit: 20 }));
  return [...seen.values()];
}

function budgetLine(p, intent) {
  const price = `${p.estimated ? '~' : ''}$${p.price}`;
  if (intent.around) return `${price}, close to your $${intent.around}`;
  if (intent.max) return `${price}, under $${intent.max}`;
  return price;
}

export function rank(pool, intent, { shownPrices = [] } = {}) {
  const target = intent.around || (intent.max ? (intent.min ? (intent.min + intent.max) / 2 : intent.max * 0.85) : null);
  return pool
    .map(p => {
      const { hits, matched } = interestHits(p, intent);
      const tok = tokenHits(p, intent);
      const fit = target ? 1 - Math.min(1, Math.abs(p.price - target) / Math.max(target, 1)) : 0;
      const ageFit = intent.age && p.ages?.includes(intent.age) ? 1 : 0;
      const trust = p.starter || (p.kind !== 'idea' && !p.estimated) ? 0.6 : 0;
      const lux = intent.luxury ? Math.min(1, p.price / 200) * 0.8 : 0;
      const score = hits * 3 + tok * 1.2 + ageFit + fit * 1.5 + trust + lux;
      return { p, score, matched, tok, fit, ageFit };
    })
    .sort((a, b) => b.score - a.score);
}

// Keeps the picks varied: at most two of the same kind unless they asked for that kind.
function diversify(ranked, limit) {
  const out = [];
  const perCat = {};
  for (const r of ranked) {
    if ((perCat[r.p.category] || 0) >= 2 && ranked.length > limit * 2) continue;
    out.push(r);
    perCat[r.p.category] = (perCat[r.p.category] || 0) + 1;
    if (out.length === limit) break;
  }
  return out.length >= Math.min(limit, ranked.length) ? out : ranked.slice(0, limit);
}

function whyFor(r, intent) {
  const bits = [];
  if (r.matched.length) bits.push(`matches ${r.matched.slice(0, 2).join(' and ')}`);
  else if (r.tok) bits.push('matches what you described');
  if (r.ageFit) bits.push(`popular with ${AGE_LABEL[intent.age]}`);
  bits.push(budgetLine(r.p, intent));
  if (!r.p.estimated && r.p.kind !== 'idea') bits.push('verified listing');
  const s = bits.join(' · ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const FOLLOW_UPS = ['Show cheaper options', 'Something different', 'Something more special'];

// ---------- the answer
// catalog: all products; shown: ids already suggested in this chat; focus: { listId, ownerName, items:[{id,title,price,category,claimed,image,url}] } or null
// Friendly chat that is not a gift search: greetings, thanks, "what can you do?".
const START = ['Gift for a teen under $50', 'Something for my mom', 'Tech gadgets under $100'];
function smallTalk(text) {
  const t = String(text).toLowerCase().replace(/[^a-z' ]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return null;
  if (/^(hi|hello|hey|hiya|yo|sup|howdy|good (morning|afternoon|evening)|hey bloom|hi bloom)( there| bloom)?$/.test(t)) {
    return { reply: "Hi! I'm Bloom, your gift-finding buddy. Tell me who you're shopping for, or paste a product link and I'll add it to your wishlist with the photo and price.", picks: [], followUps: START };
  }
  if (/^(thanks|thank you|thx|ty|thanks bloom|cool|awesome|great|nice|perfect|love it|ok|okay)( so much| a lot)?$/.test(t)) {
    return { reply: "You're welcome! Want more ideas, or have a link you'd like me to add?", picks: [], followUps: ['Show cheaper options', 'Something different', 'Paste a link'] };
  }
  if (/^(help|help me|what can you do|what do you do|who are you|how does this work|how do you work|what are you|how can you help)$/.test(t)) {
    return { reply: "I can find gift ideas from age, interests and budget, suggest things people on shared wishlists still want, and add any product link you paste to your wishlist with its name, photo and price. You can also talk to me with the mic button.", picks: [], followUps: START };
  }
  if (/^(how are you|how are you doing|how's it going|whats up|what's up)$/.test(t)) {
    return { reply: "Doing great, thanks for asking! Who are we finding a gift for?", picks: [], followUps: START };
  }
  return null;
}

export function liteAnswer({ catalog, messages, shown = [], focus = null }) {
  const small = smallTalk(messages[messages.length - 1]?.content || '');
  if (small) return small;
  const intent = parseIntent(messages);
  const exclude = new Set(shown);
  const byId = new Map(catalog.map(p => [p.id, p]));
  const shownProducts = shown.map(id => byId.get(id)).filter(Boolean);
  const avgShown = shownProducts.length ? shownProducts.reduce((s, p) => s + p.price, 0) / shownProducts.length : 0;

  // "cheaper" / "more special" move the budget relative to what was just shown.
  if (intent.cheaper) {
    const base = intent.max || avgShown || 60;
    intent.max = Math.max(5, Math.round(base * 0.65));
    intent.min = 0; delete intent.around;
  } else if (intent.pricier && (intent.max || avgShown)) {
    const base = intent.max || avgShown;
    intent.min = Math.round(base * 0.9);
    intent.max = Math.round(base * 2);
    intent.luxury = true; delete intent.around;
  }

  // Looking at someone's wishlist: suggest what they actually asked for first.
  if (focus && focus.items?.length && !intent.outsideList) {
    const open = focus.items.filter(i => !i.claimed && !exclude.has(`${focus.listId}:${i.id}`));
    const pool = open.filter(i => (!intent.max || i.price <= intent.max) && (!intent.min || i.price >= intent.min * 0.5));
    const ranked = rank(pool.map(i => ({ ...i, image: i.image || i.imageUrl })), intent).slice(0, MAX_PICKS);
    if (ranked.length) {
      const picks = ranked.map(r => ({
        source: 'wishlist', listId: focus.listId, ownerName: focus.ownerName, id: r.p.id, title: r.p.title, price: r.p.price,
        image: r.p.image, url: r.p.url, category: r.p.category, estimated: Boolean(r.p.estimated),
        why: `On ${focus.ownerName}'s wishlist and still available · ${budgetLine(r.p, intent)}`
      }));
      return { reply: `These are things ${focus.ownerName} actually wants that nobody has claimed yet${intent.max ? `, under $${intent.max}` : ''}. Claiming one tells everyone it's covered.`, picks, followUps: ['Show cheaper options', 'Ideas that are not on their list'] };
    }
    if (open.length === 0) {
      return { reply: `Everything on ${focus.ownerName}'s wishlist has been claimed. Want ideas from the catalog instead?`, picks: [], followUps: ['Show me ideas from the catalog'] };
    }
  }

  const known = intent.interests.length || intent.tokens.length || intent.age || intent.max;
  const ask = !known;
  const pool = candidatePool(catalog, intent, { exclude });
  let ranked = rank(pool, intent);
  // Only show things that match something they said, when they said something.
  if (intent.interests.length || intent.tokens.length) {
    const matching = ranked.filter(r => r.matched.length || r.tok);
    ranked = matching;
  }
  if (intent.age) {
    const fits = ranked.filter(r => !r.p.ages || r.p.ages.includes(intent.age));
    if (fits.length >= 2) ranked = fits;
  }
  let chosen = diversify(ranked, MAX_PICKS);

  if (!chosen.length) {
    if (intent.age || intent.max) {
      const retry = rank(candidatePool(catalog, { ...intent, interests: [], tokens: [] }, { exclude }), intent);
      chosen = diversify(retry, MAX_PICKS);
      if (chosen.length) {
        return { reply: `I couldn't find that exactly, so here is a mix of popular ideas${intent.age ? ` for ${AGE_LABEL[intent.age]}` : ''}${intent.max ? ` under $${intent.max}` : ''}. Tell me more about what they like and I'll narrow it down.`, picks: chosen.map(r => ({ ...r.p, source: 'catalog', why: whyFor(r, intent) })), followUps: FOLLOW_UPS };
      }
    }
    return { reply: shown.length ? "That's everything I have for that. Try a different interest or a bigger budget." : `I couldn't find anything for that${intent.max ? ` under $${intent.max}` : ''}. Try a different word (like “cologne”, “3D printer”, “hair” or “bike”) or a bigger budget.`, picks: [], followUps: ['Gift for a teen under $50', 'Tech gadgets under $100'] };
  }

  const picks = chosen.map(r => ({ ...r.p, source: 'catalog', why: whyFor(r, intent) }));
  const hasEstimates = picks.some(p => p.estimated || p.kind === 'idea');
  const likes = intent.interests.slice(0, 2).map(i => i.label).join(' and ');
  let lead;
  if (ask) lead = "Tell me who it's for (their age), what they like and a budget, and I'll narrow it down. Here is a mix to start with";
  else if (intent.cheaper) lead = `Here are some lower-priced options`;
  else if (intent.pricier) lead = `Here are some more special picks`;
  else if (intent.another) lead = `Here are some different ideas`;
  else lead = `Here ${picks.length === 1 ? 'is 1 idea' : `are ${picks.length} ideas`}${likes ? ` for someone into ${likes}` : intent.tokens.length ? ` for “${intent.tokens.slice(0, 3).join(' ')}”` : ''}`;
  const where = `${intent.age ? ` (${AGE_LABEL[intent.age]})` : ''}${intent.around ? ` around $${intent.around}` : intent.max ? ` under $${intent.max}` : ''}`;
  return {
    reply: `${lead}${ask ? '' : where}.${hasEstimates ? ' Prices marked ~ are estimates.' : ''}`,
    picks,
    followUps: ask ? ['Gift for a teen under $50', 'Something for my mom', 'Tech gadgets under $100'] : FOLLOW_UPS
  };
}
