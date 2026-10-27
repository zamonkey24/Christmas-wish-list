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
Bug: choosing the "Family & Outings" vibe hard-filtered by item.category, leaving only the $22 duck regardless of a $110 budget. Rewrite: src/utils/recommend.js scores items (budget fit first; solo gift must use >=60% of budget, bundles >=75%; interests/style break ties; claimed items skipped). Quiz is now 5 steps: relationship, budget, interests (multi-select), gift style, packaging. Items have `tags` (hair, skin, fragrance, outdoors, tech, fun, giftcard, practical, luxury); items without tags fall back to category mapping. Admin form has no tags field yet. DATA_VERSION 7, key v18. Verified with node simulation: $110/friend/solo -> cologne.
Quiz never recommends over the budget (owner's request); no 'flexible budget' question.

## Admin rework (committed locally, NOT pushed)
Admin list is now a catalog-style card grid (search, category pills, Edit / link / Delete buttons). Delete opens an in-page confirmation and moves the item to "Recently Deleted" (kept 30 days; Restore, Delete forever, Empty). Trash is shared across devices via the same /api/state (field `trash`, server keeps max 100). Editing an item now keeps its claim status and tags (it used to reset them). Admin form has a "Quiz tags" field. Smoke-tested by server-rendering AdminWishlist with esbuild; not clicked through in a browser.

## Themes: birthday + christmas (committed locally, NOT pushed)
src/ThemeContext.jsx defines THEMES (copy, logos as SVG components, favicon, page title, particle style). Theme is chosen in Admin ("Site Background & Theme"), saved in localStorage and shared via /api/state (`theme` field, default christmas; server validates). CSS variables in src/index.css: christmas = deep green/black with strong red + green glows, red buttons, snowfall; birthday (`:root[data-theme="birthday"]`) = white marble (inline SVG feTurbulence background) with gold veins, dark charcoal cards with gold borders, gold buttons, drifting gold sparkles. Cards stay dark in both themes so existing inline light-text styles keep working; anything placed directly on the marble must sit inside a .glass-card. Preview on one device only: ?theme=birthday or ?theme=christmas, and &view=gallery. Header subtitle fixed to "5 questions".

## Theme polish (committed locally, NOT pushed)
Birthday background is now a pre-rendered image public/marble.jpg (2000x1200, ~280KB; generated from an SVG feTurbulence/displacement recipe rendered in headless Chrome: grey veins, fine veins, gold veins with glow, cloudy base, grain). Christmas: red page background, deep-green cards, green primary buttons (Next Question etc.), maroon header/footer with gold border.

## Christmas scene background (committed locally, NOT pushed)
Christmas theme background is now an illustrated room: white walls with wainscoting, window with snowy night + moon + little lit house, white flocked tree with lights/ornaments/star in the corner, presents on a red rug, wreath, garland. Image: public/christmas-room.jpg (2400x1350, ~370KB). Source generators in tools/: christmas-room-gen.py (writes room.svg; render with headless Chrome `--force-device-scale-factor=1.25 --window-size=1920,1080 --screenshot`, then `sips -s format jpeg -s formatOptions 82`) and marble.svg (birthday marble). CSS: --page-bg-image and --page-bg-pos in src/index.css (christmas: center bottom). Cards stay dark green so text stays readable over the light room. Earlier red-background version was replaced.

## Real marble photo (committed locally, NOT pushed)
Birthday background is now a real photo: "Calacatta Gold QUADRA.jpg" by Irvanderss, Wikimedia Commons, CC BY-SA 4.0 (https://commons.wikimedia.org/wiki/File:Calacatta_Gold_QUADRA.jpg). Cropped to the slab face (1770x870) and retouched to remove warehouse-light reflections (tools/marble-retouch.py, Pillow+numpy). Attribution line is shown in the footer in the birthday theme (src/App.jsx) - keep it, the license requires credit. Unsplash/Pexels block scripted downloads, so Wikimedia Commons API was used. The earlier generated marble SVG recipe is still in tools/marble.svg (unused).

## Two more colognes (committed locally, NOT pushed)
Lattafa Maahir Legacy EDP 3.4 oz $26.95 (B0BTPBZD1M, pack of 1 note) and Cremo Cologne Spice & Black Vanilla 3.4 fl oz $21.26 (B079C2P64T; page has many scents, pop-up says which). Prices read from the Amazon listings at add time. DATA_VERSION 8, key v19.

## Quiz fixes (committed locally, NOT pushed)
1) Float bug: totals showed e.g. 207.20999999999998 and "-$42.79000000000002 target". Now sums are rounded to cents (recommend.js `sum`/`cents`) and shown via `formatPrice`; badge says "$X under budget". 2) Distant friend + $250 + bundle fell back to a lone gift card: casual-tier items can't reach the budget. getRecommendation now escalates tiers (casual -> +friend -> +close; friend -> +close) until the result uses enough of the budget, shows a note when widened, and shows a note if a bundle couldn't be built (fellBack). Gift cards get a -2.5 score penalty unless the "gift card is fine" interest is picked. MIN_BUNDLE_SHARE lowered to 0.7. Tested 252 combos: never over budget.

## Fill It Up + Armani (committed locally, NOT pushed)
New packaging option "Fill It Up" (strategy 'fill'): knapsack over cents in src/utils/recommend.js picks up to 10 gifts (big and small) totalling as close to the budget as possible, never over, skipping gift cards unless "gift card is fine" is picked; result page shows a note. Added Armani Beauty Stronger With You Intensely EDP 1.7 fl oz $89.25 (B0DBRGYTDB; other sizes on Amazon: 3.4 oz $110.49 B0DBRSBNRZ, 5 oz $127.49 B0DNNGY673), tier 'friend'. DATA_VERSION 9, key v20.

## Le Male (pushed with Fill It Up)
Added Jean Paul Gaultier Le Male EDT 2.5 oz $105 (B0743HLFH5; 4.2 oz $132 B001BAG38G, 6.8 oz $172 B000XE0N2I), tier 'friend'. DATA_VERSION 10, key v21.

## Whole-dollar prices (committed locally, NOT pushed)
Owner wants prices rounded to whole dollars: Lattafa 27, Cremo 21, Armani 89 (was 26.95/21.26/89.25); formatPrice() rounds; Admin saves Math.round(price). DATA_VERSION 11, key v22.

## Theme flip-back bug + rotating ties (committed locally, NOT pushed)
Bug: switching theme sometimes reverted after a few seconds. Causes fixed: (1) client race in src/App.jsx: the push effect's cleanup reset `pending` while a PUT was in flight, so a poll could apply the old server copy and then save it back. Sync now uses refs (saveTimer, saving, writeSeq, lastWriteAt, `latest`) and ignores any server read that raced a local change/save or is older than our last save, and never overwrites unsaved local changes. (2) netlify/functions/state.mjs now reads/writes with consistency:"strong" (Blobs default is eventually consistent) and keeps stored theme/trash/knownIds when an out-of-date page PUTs without them (previously theme reset to christmas). Simulated in /tmp (not committed) against a laggy/stale fake server.
Ties: when several gifts score exactly the same (e.g. $18 Curl Mousse / Curl Cream / Deodorant) the quiz rotates through them each time it is taken (rotation counter in localStorage `festive_gift_quiz_rotation_v1`, passed in quizAnswers.rotation; recommend.js pickTied). Owner declined an extra hair-goal question.

## 'Highly wanted' badges (committed locally, NOT pushed)
Quiz step 3: hair, skin and fragrance interests (INTERESTS[].hot in src/utils/recommend.js) show a gold '🔥 Highly wanted' badge next to the label. ?step=N preview param added to Quiz (like ?theme= and ?view=gallery).

## 8 more gifts (committed locally, NOT pushed)
Dior Sauvage EDT 3.4oz $131 (B000RO0NOW), Versace Dylan Blue EDT 3.4oz $56 (B01JG5V0E4), Azzaro The Most Wanted 3-piece Discovery Set $43 (B0G5B5GD4T), Lattafa Asad $27 (B0B8TQ7YRW), Lattafa Khamrah $35 (B0B92Y18GT), Armaf Club de Nuit Intense Man EDT 3.6oz $31 (B07XFSH553, third-party seller), Supergoop Unseen Sunscreen 0.68oz $19 (B0DPNKSQ9C), Ulta Beauty $25 gift card (B0H4FWYHYL). Prices rounded to whole dollars from the Amazon listing prices at add time. Skipped: Bleu de Chanel (real EDT not found on Amazon search) and drone batteries (APEX VR70 battery compatibility with the APEX kit could not be confirmed). 28 items total. DATA_VERSION 12, key v23.
