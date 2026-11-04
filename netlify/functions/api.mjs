import { getStore } from "@netlify/blobs";
import { createApi } from "../lib/api.mjs";

// One store for accounts, wishlists, invites and claims. Strong consistency so a read right after a write is current.
export default async (req) => {
  const store = getStore({ name: "giftbloom", consistency: "strong" });
  const legacyStore = getStore({ name: "wishlist", consistency: "strong" }); // the original single wishlist
  return createApi({ store, legacyStore }).handle(req);
};

export const config = { path: "/api/*" };
