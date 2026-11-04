import { DEFAULT_WISHLIST } from '../data/initialWishlist.js';

// Used once, when the original (pre-accounts) wishlist is imported: bring it up to date with the starter items
// added after the version it was saved at. Starter items missing from an older list were deleted on purpose.
export function migrateDefaults(items, savedVersion) {
  const byId = new Map(items.map(i => [i.id, i]));
  const merged = [];
  DEFAULT_WISHLIST.forEach(def => {
    const old = byId.get(def.id);
    if (old) merged.push({ ...def });
    else if ((def.addedIn ?? 0) > savedVersion) merged.push(def);
  });
  const custom = items.filter(i => !DEFAULT_WISHLIST.some(d => d.id === i.id));
  return [...custom, ...merged];
}
