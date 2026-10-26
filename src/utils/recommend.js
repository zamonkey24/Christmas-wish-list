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

const MIN_SOLO_SHARE = 0.6; // a flagship gift should use most of the budget
const MIN_BUNDLE_SHARE = 0.75;

export function getRecommendation(items, { relationship, budget, interests = [], style = 'any', strategy }) {
  const cap = budget; // never recommend more than the budget
  const byTier = items.filter(item => {
    if (relationship === 'casual' && item.closenessRequired !== 'casual') return false;
    if (relationship === 'friend' && item.closenessRequired === 'close') return false;
    return true;
  });
  const open = byTier.filter(i => !i.claimed);
  const pool = open.length ? open : byTier.length ? byTier : items;

  const itemScore = (item) => interestScore(item, interests) * 2.5 + styleScore(item, style) + (item.priority?.startsWith('Must') ? 0.2 : 0);

  const solo = () => {
    const affordable = pool.filter(i => i.price <= cap);
    let candidates = affordable.filter(i => i.price >= budget * MIN_SOLO_SHARE);
    if (!candidates.length) {
      // Nothing close to the budget: take the most expensive things that fit.
      candidates = [...affordable].sort((a, b) => b.price - a.price).slice(0, 3);
    }
    if (!candidates.length) candidates = [[...pool].sort((a, b) => a.price - b.price)[0]];
    const best = [...candidates].sort((a, b) => (itemScore(b) + fit(b.price, budget) * 3) - (itemScore(a) + fit(a.price, budget) * 3))[0];
    return { type: 'solo', items: [best], score: itemScore(best) + fit(best.price, budget) * 3 };
  };

  const bundle = () => {
    const affordable = pool.filter(i => i.price <= cap);
    let best = null;
    const consider = (group) => {
      const total = group.reduce((s, i) => s + i.price, 0);
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
  if (strategy === 'combo') {
    result = bundle() || solo();
  } else if (strategy === 'solo') {
    result = solo();
  } else {
    const s = solo();
    const b = bundle();
    result = b && b.score > s.score ? b : s;
  }

  const chosen = new Set(result.items.map(i => i.id));
  const runnerUps = pool
    .filter(i => !chosen.has(i.id) && i.price <= cap)
    .sort((a, b) => (itemScore(b) + fit(b.price, budget) * 3) - (itemScore(a) + fit(a.price, budget) * 3))
    .slice(0, 3);

  const total = result.items.reduce((s, i) => s + i.price, 0);
  return { ...result, total, runnerUps, underBudget: total < budget * MIN_SOLO_SHARE };
}
