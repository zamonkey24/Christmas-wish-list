# GiftBloom (festive-gift-quiz): read this first

> NOTE: everything below the "Older notes" line describes the pre-accounts, single-wishlist app (shared /api/state, DATA_VERSION, knownIds, admin password). That design is REPLACED by the architecture here.

## Current architecture (accounts + invite links) - committed locally, NOT pushed
Live site: https://giftbloom.netlify.app (Netlify, auto-deploys from GitHub zamonkey24/Christmas-wish-list `main`).

**Deploy problem found:** the live site was stuck on commit 0b005ec; commits 81b262a and 1ee05b6 built fine from a clean clone (verified) but Netlify never deployed them. Most likely Netlify's monthly build/deploy credits ran out (every push = a production deploy) or auto-deploy is paused. Ask the owner to check Netlify > Deploys. BATCH changes: push rarely.

**Backend** (Netlify Function `netlify/functions/api.mjs`, path /api/*, logic in `netlify/lib/api.mjs`, link reader in `netlify/lib/preview.mjs`; storage = Netlify Blobs store "giftbloom", strong consistency):
- Accounts: email/username + password (scrypt hashed), HttpOnly cookie session `gb_session` (400 days), login lockout after 8 fails/15 min, JSON-only writes (CSRF). No password reset / email (owner told).
- Each account owns exactly one wishlist (`lists/<id>`: items, trash, theme, ownerName, inviteCode). Invite code => `invites/<code>`. People who open an invite link join (saved in `users/<id>.joined`) and can then open it without the code. Visitors with a code but no account can view + claim. Only the owner can PUT (server strips claim fields and junk).
- Claims live in their own blob `claims/<listId>` (optimistic concurrency with onlyIfNew/onlyIfMatch) so owner edits never wipe claims and two simultaneous claims can't both win. Unclaim: owner, or the signed-in person who claimed.
- `POST /api/preview {url}` (signed-in only): reads a product page (SSRF-guarded: no private IPs/odd ports, redirects re-checked) and returns title/photo/price (Amazon `hiRes`/price selectors, Open Graph, JSON-LD). Amazon may block Netlify's servers sometimes: the UI then lets the user type name + price.
- `GET /api/health` proves storage works (visit it after deploy). `GET /api/legacy` + `POST /api/import-legacy {setupCode:"01015"}`: one-time move of the ORIGINAL wishlist (old blob store "wishlist", key "wishlist-state", 20 items at version 11, with claims) into the importing account. SECURITY NOTE: "01015" is the old public admin password, so whoever signs up first and knows it could take the original list. The owner must sign up and import right after the deploy; after import the flag `legacy/imported` blocks everyone.
- Old `/api/state` function was deleted.

**Frontend**: `src/App.jsx` = shell (auth, tabs "My Wishlist" / "Shared with me", invite handling via `?invite=CODE`, pending invite saved in localStorage until sign-in, theme + snowfall). `src/ListView.jsx` = one wishlist (loads/polls every 15s; owner edits auto-save with the race-proof logic from before; claims go straight to the API). New components: AuthScreen, AccountBar, SharedWithMe, AddGiftByLink (paste a link -> name/photo/price, auto tags via utils/inferGift), InvitePanel (copy/share/rotate link, in the editor), ClaimActions, LegacyImport. `src/utils/migrate.js` adds starter items (`addedIn`) to an imported old list. New accounts start with an EMPTY list. The old admin password lock was removed (ownership = account).

**Tests** (all passing): `node tools/test/api.test.mjs` (39 server tests incl. permissions, invites, claim races, link parsing on real Amazon pages saved in /tmp), `node tools/test/utils.test.mjs`, and a real-browser end-to-end `tools/test/e2e-browser.mjs` against `tools/test/e2e-server.mjs` (needs puppeteer-core; run flow: build, start e2e-server, run). Cannot test against real Netlify Blobs locally: after deploy check /api/health shows {"ok":true,"storage":true}.

**Rules for future changes**: starter items in src/data/initialWishlist.js only matter for importing the original list (`addedIn`). Keep owner-only writes server-side. Batch pushes (Netlify credits).


## Local development (committed locally, NOT pushed)
`npm run dev` also runs the real accounts API (tools/dev/file-store.mjs, wired in vite.config.js as a dev-only plugin) and saves to `.local-data/` (gitignored), so local accounts and wishlists survive restarts. Local data is separate from the live site; "Import original wishlist" does not work locally (the original list lives in Netlify). Netlify deploys are PAUSED (out of credits) as of 2026-11-04 - owner decided to keep working locally and push once when it un-pauses. Commit b8cf701 (accounts) WAS pushed to GitHub but cannot deploy while paused.


## Home page, auth pages, Classic theme, password reset, emails (committed locally, NOT pushed) - 2026-11-04
- **Classic theme** (id `classic`, calm indigo/slate, no particles, BloomLogo) is the default for the home page, account screens and NEW wishlists; Christmas/Birthday remain per-wishlist choices (admin picker lists all 3). The shell (src/App.jsx) uses Classic unless a wishlist is open; ListView resets it on unmount. index.html has `data-theme="classic"`.
- **Public home = LandingPage** (feature dashboard). Top bar (AccountBar) has **Log In** and **Sign Up** top-right; they open the separate page `AuthScreen` at `#/login` / `#/signup` (also `#/forgot`, and `/?reset=TOKEN`). Logged in (owner asked for this): NO dashboard/Home. People land straight on their own wishlist (the quiz, as before accounts); tabs are My Wishlist | Shared with me, plus an Account page (name, email preference, owner announcement tool). The logo goes to My Wishlist when logged in and to the features page when logged out. LandingPage is for logged-out visitors only.
- **Passwords**: minimum **4 characters** (a 4-digit PIN works; note this is weak, login lockout is 8 tries/15 min). Signup requires a real **email** (it is the login).
- **Forgot password**: `POST /api/auth/forgot` (always the same answer, 3/hour per email) emails a one-hour single-use link `/?reset=TOKEN`; `POST /api/auth/reset` sets the password, bumps `tokenVersion` (signs other sessions out) and logs in. `GET /api/config` says whether email is set up; the forgot page warns if not.
- **Emails** (netlify/lib/mailer.mjs + emails.mjs): sent through **Resend** only when Netlify env vars are set: `RESEND_API_KEY`, `EMAIL_FROM` (e.g. `GiftBloom <hello@yourdomain.com>`; Resend needs a verified domain to send to other people). Optional: `SITE_URL`. For announcements: `ADMIN_EMAILS` (comma list; those accounts get the "Send an update" tool) and `MAIL_ADDRESS` (mailing address printed in every promo email, required by anti-spam law). Without these the site still works; forgot-password and announcements say email is not set up.
- **Promotional email is OPT-IN** (unchecked checkbox at signup + toggle on the Account page), every promo email has an unsubscribe link (`/?unsubscribe=TOKEN`, no login) and List-Unsubscribe headers; announcements go only to opted-in people (max 300 per send). A welcome email is sent at signup. Owner chose "email everyone who signs up"; opt-in was used instead because sending marketing to people who did not agree is not allowed in many places.
- **Local dev**: `npm run dev` (vite.config.js plugin) runs the real API with file storage in .local-data/. Emails are NOT sent locally: they appear at http://localhost:5173/__outbox (reset links etc.). Every local account is treated as owner/admin (set ADMIN_EMAILS to limit).
- Tests: `node tools/test/api.test.mjs` (57), `node tools/test/utils.test.mjs`, browser e2e `tools/test/e2e-browser.mjs` (+ e2e-server.mjs) all pass. Netlify is still PAUSED (credits): push once when the owner un-pauses.

---- Older notes (pre-accounts, now obsolete) ----
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

## Fix: new gifts not appearing (committed locally, NOT pushed)
Cause: migrate() treated every current default id as 'already offered' whenever the saved shared state had no knownIds, so new defaults were seen as deleted and the 20-item list was saved back at the new version (stuck). Now each NEW default item carries addedIn: <DATA_VERSION when added> (src/data/initialWishlist.js) and migrate(items, savedVersion) adds missing defaults only if addedIn > savedVersion; knownIds is no longer used for migration. RULE for future batches: bump DATA_VERSION AND set addedIn: <new version> on every new default item. This batch: DATA_VERSION 13, the 8 new items have addedIn 13 (so a server stuck at v12 with 20 items heals). Tested with a mock /api/state in headless Chrome: stuck/legacy/bad-shape servers all end at 28 items; deleted defaults stay deleted.
