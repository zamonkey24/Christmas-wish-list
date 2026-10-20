# Handoff: festive-gift-quiz (Christmas wishlist site, React+Vite, GitHub zamonkey24/Christmas-wish-list, Netlify auto-deploy)

Data: src/data/initialWishlist.js. Images: public/products/*.jpg (real Amazon photos, resized 600px).
Wishlist is cached in each browser's localStorage; bump WISHLIST_STORAGE_KEY in src/App.jsx (currently v11) whenever default items change.

## Done & pushed (commit 597c369)
Removed earbuds + Anker power bank; prices: duck 22, lotion 25 (AMBER scent note), drone 159, strobes 14, pedals 17 (WHITE note), BASED gel 20, mousse 18. Real photos for all.

## Done locally, NOT pushed
Added BASED Moisturizer ($36, B0FCW6W4PY) and BASED Body Wash ($30, B0DPY6WBB1, "get COCONUT scent" note); key bumped to v11.

## TODO
- public/products/based_moisturizer.jpg and based_bodywash.jpg are PLACEHOLDER copies of lotion.jpg. Replace with real photos: fetch each Amazon page, take first "hiRes" image URL (grep '"hiRes":"...'), download, `sips -Z 600`. Amazon was unreachable on this network (eero cert error) when this was written.
- Confirm body wash listing offers a coconut scent, and verify moisturizer/body wash titles & prices on Amazon.
- Verify gel ($20, brand-site price) on live Amazon; drone link is an APEX FPV kit, strobes link is 4-pack remote strobes - owner to confirm.
- Then commit + push (ask owner first).
