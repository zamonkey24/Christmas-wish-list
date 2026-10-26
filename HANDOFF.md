# Handoff: festive-gift-quiz (Christmas wishlist site, React+Vite, GitHub zamonkey24/Christmas-wish-list, Netlify auto-deploy)

Data: src/data/initialWishlist.js. Images: public/products/*.jpg (real Amazon photos, resized 600px).
Wishlist is cached in each browser's localStorage; bump WISHLIST_STORAGE_KEY in src/App.jsx (currently v11) whenever default items change.

## Done & pushed (commit 597c369)
Removed earbuds + Anker power bank; prices: duck 22, lotion 25 (AMBER scent note), drone 159, strobes 14, pedals 17 (WHITE note), BASED gel 20, mousse 18. Real photos for all.

## Done & pushed (latest)
Added BASED Daily Skincare Duo ($36, B0FCW6W4PY; face wash + moisturizer) and BASED Body Wash Coconut ($30, B0DPY6WBB1, "get COCONUT scent" note), with real Amazon photos; prices verified on Amazon. Storage key now v11.

## Open items
- Gel ($20) is the brand-site price; Amazon price not confirmed (hidden on page).
- Owner to confirm drone (APEX FPV kit w/ goggles, $159) and strobes (4-pack w/ remote, $14) are the intended products.
- Owner only brainstormed more BASED ideas (curl cream, leave-in, shampoo/conditioner, etc.); none requested yet.
- Ask owner before every push.

## Cross-device sync (committed locally, NOT pushed, untested on Netlify)
Problem: wishlist/claims lived only in each browser's localStorage. Fix: netlify/functions/state.mjs (GET/PUT /api/state, stored in Netlify Blobs, store "wishlist", key "wishlist-state"); src/App.jsx pulls every 15s + on tab focus, pushes 400ms after any change (last write wins). If the server is empty, the first visitor's current list seeds it. If the function fails (e.g. local `npm run dev`), the app falls back to localStorage. netlify.toml added. @netlify/blobs added to package.json.
Caveats: no auth on PUT (guests must be able to claim); after first deploy, default-list edits in code no longer reach users - edit via the Admin page or clear the blob. Not run locally (local Node 18 too old for netlify-cli); verify after deploy: change something on one device, see it on another within ~15s.

## Latest (committed locally, NOT pushed)
- Added BASED Curl Cream ($18, B0DTXR6NSB, verified on Amazon) with real photo.
- New optional item field `mustGet` (lotion "AMBER scent", pedals "WHITE one", body wash "COCONUT scent"): src/components/ProductLink.jsx shows a "Please get ..." pop-up with Cancel / "Got it" (opens the Amazon link). Used in WishlistGallery and QuizResult; Admin form has a field for it.
- DATA_VERSION in src/App.jsx: when DEFAULT_WISHLIST changes, bump it so the shared list merges the new defaults (keeps claims + admin-added items with ids like g_<digits>). Server function stores `version`.
- Known issue (pre-existing): editing an item in Admin resets its claim status (AdminWishlist handleSaveItem hardcodes claimed:false).

## Added all remaining BASED products (committed locally, NOT pushed)
Hair Elixir 25, Curl Refresh Spray 18.99, Leave-In 18, Under Eye Elixir 28, Facial Cleanser 20, Facial Moisturizer 20, Deodorant 18 (Santal Sandalwood - scent is a guess; other listings: Bergamot Vanilla B0DSYV8LVQ, Guava Nectar B0DSYP494S). All prices verified on Amazon listings. Lotion now links the Amber listing (B0H6R9W7LX). User excluded: texture powder, sea salt spray, clay, pomade, shampoo, conditioner, skin revival spray (and bundles containing them). Tallow Moisturizer is sold out on brand site / not found on Amazon - skipped. DATA_VERSION 3, storage key v14.

## Update (committed locally, NOT pushed)
Removed again at owner's request: Daily Facial Cleanser, Daily Facial Moisturizer, Leave-In Conditioner, Curl Refresh Spray (cleanser+moisturizer are already covered by the Daily Skincare Duo). Added BASED Multi-Active Skin Elixir ($40, 1 bottle, https://based.com/products/skin-elixir, not on Amazon; "Please get 1 BOTTLE" pop-up). DATA_VERSION 4, key v15. Other BASED non-bundle products not added: Scalp Scrubber $20, White Face Towel $20, Toiletry Bag $50 (owner hasn't asked). Deodorant is now Bergamot Vanilla (B0DSYV8LVQ), confirmed by owner; owner declined scrubber, towel, bag. DATA_VERSION 5, key v16.

## Cologne (committed locally, NOT pushed)
Added Jean Paul Gaultier Le Beau EDT 2.5 oz, $110 (Amazon price verified; $104.50 w/ Subscribe & Save), B07TK11FQN, 'Please get 2.5 oz bottle' pop-up. closenessRequired 'friend'. DATA_VERSION 6, key v17.

## Fix: deleted items coming back (committed locally, NOT pushed)
Cause: bumping DATA_VERSION ran migrate(), which re-added every DEFAULT_WISHLIST item missing from the shared list, including ones the owner deleted. Now the shared state stores `knownIds` (default ids already offered); migrate only adds defaults not in knownIds. State saved before this fix has no knownIds, so it is treated as "everything missing was deleted on purpose". Did not bump DATA_VERSION. If the drone is still present on the server, owner must delete it once more after deploy.

## Quiz rework (committed locally, NOT pushed)
Bug: choosing the "Family & Outings" vibe hard-filtered by item.category, leaving only the $22 duck regardless of a $110 budget. Rewrite: src/utils/recommend.js scores items (budget fit first; solo gift must use >=60% of budget, bundles >=75%; interests/style break ties; claimed items skipped). Quiz is now 6 steps: relationship, budget, budget firmness (strict / up to +15%), interests (multi-select), gift style, packaging. Items have `tags` (hair, skin, fragrance, outdoors, tech, fun, giftcard, practical, luxury); items without tags fall back to category mapping. Admin form has no tags field yet. DATA_VERSION 7, key v18. Verified with node simulation: $110/friend/solo -> cologne.
