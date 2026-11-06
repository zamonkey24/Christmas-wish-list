import { api } from '../api';
import { inferGift } from './inferGift';

// Adds a catalog product to the signed-in person's own wishlist. Returns true if it was new, false if already there.
export async function addProductToWishlist(listId, product) {
  const meta = inferGift(product.title, product.price);
  const item = {
    id: `g_${Date.now()}`,
    title: product.title,
    price: product.price,
    category: meta.category,
    closenessRequired: meta.closenessRequired,
    priority: 'High Wish ❤️',
    imageUrl: product.image,
    url: product.url,
    description: product.estimated
      ? 'A gift idea from the catalog. The price is an estimate; the link searches Amazon for it.'
      : product.site ? `From ${product.site}.` : 'Added from the catalog.',
    tags: product.tags?.length ? product.tags : meta.tags,
    ...(product.estimated ? { estimated: true } : {})
  };
  const r = await api('POST', `lists/${listId}/items`, { item });
  window.dispatchEvent(new Event('giftbloom:list-changed')); // an open wishlist screen refreshes itself
  return r.added;
}
