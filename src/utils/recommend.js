// Gift matching for the quiz. Budget fit comes first; interests and style break ties.

export const INTERESTS = [
  { id: 'hair', label: '💇 Hair care & styling' },
  { id: 'skin', label: '🧴 Skincare & body care' },
  { id: 'fragrance', label: '🌲 Cologne & fragrance' },
  { id: 'outdoors', label: '🚲 Bikes & outdoors' },
  { id: 'tech', label: '⚡ Tech & gadgets' },
  { id: 'fun', label: '🎉 Fun, games & family stuff' },
  { id: 'giftcard', label: '💳 A gift card is fine' }
];

export const STYLES = [
  { id: 'any', label: '🎲 No preference', desc: 'Anything that fits.' },
  { id: 'practical', label: '🧼 Practical', desc: 'Something to use every day.' },
  { id: 'luxury', label: '💎 A special treat', desc: 'Something nicer than usual.' },
  { id: 'fun', label: '🎮 Fun & exciting', desc: 'Something to play with or show off.' }
];

const CATEGORY_TAGS = {
  'Tech & Gadgets': ['tech'],
  'Family': ['fun'],
  'Fun & Games': ['fun'],
  'Everyday Essentials': ['practical']
};

const tagsOf = (item) => (Array.isArray(item.tags) && item.tags.length ? item.tags : CATEGORY_TAGS[item.category] || []);

const interestScore = (item, interests) => {
  if (!interests.length) return 0;
  const tags = tagsOf(item);
  return interests.some(i => tags.includes(i)) ? 1 : 0;
};

const styleScore = (item, style) => (style && style !== 'any' && tagsOf(item).includes(style) ? 1 : 0);

// 1 when the total hits the budget, falling off as it moves away from it.
const fit = (total, budget) => Math.max(0, 1 - Math.abs(budget - total) / budget);

export const formatPrice = (n) => {
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? String(r) : r.toFixed(2);
};

const cents = (n) => Math.round(n * 100) / 100;
const sum = (items) => cents(items.reduce((s, i) => s + i.price, 0));

const MIN_SOLO_SHARE = 0.6; // a flagship gift should use most of the budget
const MIN_BUNDLE_SHARE = 0.7;

const TIERS = { casual: ['casual'], friend: ['casual', 'friend'], close: ['casual', 'friend', 'close'] };
const TIER_STEPS = { casual: ['casual', 'friend', 'close'], friend: ['friend', 'close'], close: ['close'] };

export function getRecommendation(items, { relationship, budget, interests = [], style = 'any', strategy }) {
  const cap = budget; // never recommend more than the budget
  const wantsGiftCard = interests.includes('giftcard');

  const itemScore = (item) => {
    let score = interestScore(item, interests) * 2.5 + styleScore(item, style) + (item.priority?.startsWith('Must') ? 0.2 : 0);
    // Gift cards are an easy way to hit any budget, so only suggest them when asked for.
    if (!wantsGiftCard && tagsOf(item).includes('giftcard')) score -= 2.5;
    return score;
  };

  const run = (pool) => {
    const affordable = pool.filter(i => i.price <= cap);

    const solo = () => {
      let candidates = affordable.filter(i => i.price >= budget * MIN_SOLO_SHARE);
      if (!candidates.length) {
        // Nothing close to the budget: take the most expensive things that fit.
        candidates = [...affordable].sort((a, b) => b.price - a.price).slice(0, 3);
      }
      if (!candidates.length) candidates = [[...pool].sort((a, b) => a.price - b.price)[0]];
      const value = (i) => itemScore(i) + fit(i.price, budget) * 3;
      const best = [...candidates].sort((a, b) => value(b) - value(a))[0];
      return { type: 'solo', items: [best], score: value(best) };
    };

    const bundle = () => {
      let best = null;
      const consider = (group) => {
        const total = sum(group);
        if (total > cap || total < budget * MIN_BUNDLE_SHARE) return;
        const score = group.reduce((s, i) => s + itemScore(i), 0) / group.length + fit(total, budget) * 3;
        if (!best || score > best.score) best = { type: 'bundle', items: group, score };
      };
      for (let i = 0; i < affordable.length; i++) {
        for (let j = i + 1; j < affordable.length; j++) {
          consider([affordable[i], affordable[j]]);
          for (let k = j + 1; k < affordable.length; k++) consider([affordable[i], affordable[j], affordable[k]]);
        }
      }
      return best;
    };

    let result;
    let fellBack = false;
    if (strategy === 'combo') {
      result = bundle();
      if (!result) { result = solo(); fellBack = true; }
    } else if (strategy === 'solo') {
      result = solo();
    } else {
      const s = solo();
      const b = bundle();
      result = b && b.score > s.score ? b : s;
    }
    const total = sum(result.items);
    const share = result.type === 'bundle' ? MIN_BUNDLE_SHARE : MIN_SOLO_SHARE;
    return { ...result, total, fellBack, satisfied: total >= budget * share, pool, affordable };
  };

  // Try the person's own tier first; if that can't use the budget, bring in the next tiers up.
  let result;
  let widened = false;
  const steps = TIER_STEPS[relationship] || TIER_STEPS.close;
  for (let level = 0; level < steps.length; level++) {
    const allowed = TIERS[steps[level]];
    const byTier = items.filter(i => allowed.includes(i.closenessRequired || 'casual'));
    const open = byTier.filter(i => !i.claimed);
    const pool = open.length ? open : byTier.length ? byTier : items;
    result = run(pool);
    widened = level > 0;
    if (result.satisfied) break;
  }

  const chosen = new Set(result.items.map(i => i.id));
  const value = (i) => itemScore(i) + fit(i.price, budget) * 3;
  const runnerUps = result.pool
    .filter(i => !chosen.has(i.id) && i.price <= cap)
    .sort((a, b) => value(b) - value(a))
    .slice(0, 3);

  return {
    type: result.type,
    items: result.items,
    total: result.total,
    runnerUps,
    underBudget: !result.satisfied,
    widened: widened && result.satisfied,
    fellBack: result.fellBack
  };
}
