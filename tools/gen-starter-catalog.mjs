// Builds netlify/lib/starter-catalog.json from the verified starter gifts (src/data/initialWishlist.js).
// Run: node tools/gen-starter-catalog.mjs
import fs from 'node:fs';
import { DEFAULT_WISHLIST } from '../src/data/initialWishlist.js';
import { categoryOf, productIdOf } from '../netlify/lib/catalog.mjs';

const items = DEFAULT_WISHLIST.map(i => ({
  id: productIdOf(i.url),
  title: i.title,
  price: i.price,
  image: i.imageUrl,
  url: i.url,
  site: new URL(i.url).hostname.replace(/^www\./, ''),
  category: categoryOf(i.tags || []),
  tags: i.tags || [],
  starter: true
}));
fs.writeFileSync(new URL('../netlify/lib/starter-catalog.json', import.meta.url), JSON.stringify(items, null, 1) + '\n');
console.log(`wrote ${items.length} starter products`);
