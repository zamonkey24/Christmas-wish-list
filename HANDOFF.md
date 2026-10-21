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
