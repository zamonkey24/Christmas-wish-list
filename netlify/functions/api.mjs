import { getStore } from "@netlify/blobs";
import { createApi } from "../lib/api.mjs";
import { createMailer } from "../lib/mailer.mjs";

// One store for accounts, wishlists, invites and claims. Strong consistency so a read right after a write is current.
export default async (req) => {
  const store = getStore({ name: "giftbloom", consistency: "strong" });
  const legacyStore = getStore({ name: "wishlist", consistency: "strong" }); // the original single wishlist
  const env = process.env; // RESEND_API_KEY, EMAIL_FROM, ADMIN_EMAILS, MAIL_ADDRESS, SITE_URL (all optional)
  return createApi({ store, legacyStore, env, mailer: createMailer({ env }) }).handle(req);
};

export const config = { path: "/api/*" };
