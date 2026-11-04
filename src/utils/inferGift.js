// Guesses the quiz settings for a gift added from just a link: its tags, category and which relationship tier it suits.
const TAG_WORDS = {
  hair: ['hair', 'curl', 'shampoo', 'conditioner', 'pomade', 'gel', 'mousse', 'scalp', 'comb', 'brush', 'diffuser'],
  skin: ['skin', 'face', 'facial', 'moisturizer', 'lotion', 'sunscreen', 'spf', 'serum', 'cleanser', 'body wash', 'deodorant', 'lip', 'eye cream', 'cream'],
  fragrance: ['cologne', 'perfume', 'parfum', 'eau de', 'fragrance', 'toilette', 'scent'],
  outdoors: ['bike', 'bicycle', 'cycling', 'camping', 'hiking', 'fishing', 'pedal', 'helmet', 'outdoor', 'drone', 'skate', 'surf'],
  tech: ['headphone', 'earbud', 'charger', 'speaker', 'camera', 'drone', 'gaming', 'controller', 'keyboard', 'mouse', 'laptop', 'phone', 'watch', 'lights', 'led', 'usb', 'bluetooth', 'wireless'],
  fun: ['toy', 'game', 'lego', 'puzzle', 'plush', 'inflatable', 'card game', 'board game', 'nerf', 'poster'],
  giftcard: ['gift card', 'egift', 'e-gift']
};

export function inferGift(title = '', price = 0) {
  const t = title.toLowerCase();
  const tags = Object.entries(TAG_WORDS).filter(([, words]) => words.some(w => t.includes(w))).map(([tag]) => tag);
  if (price >= 90) tags.push('luxury');
  if (!tags.length) tags.push('practical');
  let category = 'Everyday Essentials';
  if (tags.includes('tech') || tags.includes('outdoors')) category = 'Tech & Gadgets';
  else if (tags.includes('fun')) category = 'Fun & Games';
  const closenessRequired = price >= 150 ? 'close' : price >= 70 ? 'friend' : 'casual';
  return { tags: [...new Set(tags)], category, closenessRequired };
}
