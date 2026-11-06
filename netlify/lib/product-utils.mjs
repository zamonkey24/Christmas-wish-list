// Small helpers shared by the catalog and the data generators.
import crypto from 'node:crypto';

export const slugify = (s) => String(s).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

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

