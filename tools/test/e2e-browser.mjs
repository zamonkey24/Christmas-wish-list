// Real-browser test of accounts, invite links, claims, add-by-link and the original-list import.
// Setup: `npm run build`, then `node tools/test/e2e-server.mjs 4300 &`, then (in a folder with `npm i puppeteer-core`) run this file.
// Needs a saved Amazon product page at /tmp/B0DBRGYTDB.html (see e2e-server.mjs FIXTURE). Screenshots go to /tmp/pp/.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const BASE = 'http://localhost:4300';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'], defaultViewport: { width: 1300, height: 900 } });
let n = 0; const log = (m) => console.log('  ok  ', m); const shot = async (p, name) => p.screenshot({ path: `/tmp/pp/${name}.png` });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const text = (p) => p.evaluate(() => document.body.innerText);
const has = async (p, s, t = 8000) => { try { await p.waitForFunction((x) => document.body.innerText.includes(x), { timeout: t }, s); return true; } catch { return false; } };
const must = async (p, s, t) => { if (!(await has(p, s, t))) { await shot(p, 'FAIL'); throw new Error(`expected to see "${s}"\n--- page text ---\n${(await text(p)).slice(0, 700)}`); } };
const clickText = async (p, label, sel = 'button, a') => {
  const ok = await p.evaluate((label, sel) => { const el = [...document.querySelectorAll(sel)].find(e => e.innerText.trim().includes(label) && !e.disabled); if (!el) return false; el.click(); return true; }, label, sel);
  if (!ok) { await shot(p, 'FAIL'); throw new Error(`no button "${label}"`); }
};
const type = async (p, sel, v) => { await p.click(sel); await p.$eval(sel, e => e.select && e.select()); await p.keyboard.press('Backspace'); if (v) await p.type(sel, v); };
const byPlaceholder = (ph) => `input[placeholder*="${ph}"]`;

try {
  // ---------- Arav: sign up
  const ctxA = await browser.createBrowserContext(); const A = await ctxA.newPage();
  const errs = []; A.on('pageerror', e => errs.push(e.message));
  await A.goto(BASE); await must(A, 'Make your own wishlist'); log('landing shows the sign-up screen');
  await shot(A, '01-landing');
  await type(A, byPlaceholder('e.g. Arav'), 'Arav'); await type(A, byPlaceholder('you@example.com'), 'arav@example.com'); await type(A, 'input[type=password]', 'secret1');
  await clickText(A, 'Create my account'); await must(A, 'Your wishlist is empty'); log('account created, lands on an empty My Wishlist');
  await must(A, 'My Wishlist'); await must(A, 'Sign out');

  // ---------- add by link
  await clickText(A, 'Add my first gift'); await must(A, 'Paste a link to the product');
  await shot(A, '02-admin');
  await type(A, byPlaceholder('amazon.com'), 'https://shop.test/armani'); await clickText(A, 'Find gift');
  await A.waitForFunction(() => [...document.querySelectorAll('input')].some(i => i.value.includes('Armani Beauty Stronger With You Intensely')), { timeout: 8000 }); await must(A, 'Found on the page'); log('link -> name, photo and price found automatically');
  const price = await A.$eval('input[type=number]', e => e.value); assert.equal(price, '89');
  const hasImg = await A.$eval('img[src^="https://m.media-amazon.com"]', e => e.src).catch(() => null); assert.ok(hasImg, 'photo shown'); log('photo preview shown');
  await shot(A, '03-preview');
  await clickText(A, 'Add to my wishlist'); await must(A, 'Master Wishlist (1)'); log('gift added from just a link');
  // a link the site cannot read: still addable by hand
  await type(A, byPlaceholder('amazon.com'), 'https://shop.test/blocked'); await clickText(A, 'Find gift');
  await must(A, 'You can still add it'); await type(A, 'input[maxlength="200"]', 'Candle set'); await type(A, 'input[type=number]', '25'); await clickText(A, 'Add to my wishlist');
  await must(A, 'Master Wishlist (2)'); log('blocked store: add by hand works');
  await type(A, byPlaceholder('amazon.com'), 'https://shop.test/nophoto'); await clickText(A, 'Find gift'); await must(A, 'No photo found');
  await type(A, 'input[type=number]', '18'); await clickText(A, 'Add to my wishlist'); await must(A, 'Master Wishlist (3)'); log('no photo found: still addable');

  // ---------- invite link
  const inviteUrl = await A.$eval('#invite-link-input', e => e.value); assert.match(inviteUrl, /\/\?invite=[a-z0-9]{10}$/); log('invite link shown: ' + inviteUrl);
  await shot(A, '04-invite');

  // ---------- Sam: opens the invite link signed out, signs up, list saved
  const ctxS = await browser.createBrowserContext(); const S = await ctxS.newPage(); S.on('pageerror', e => errs.push('S:' + e.message));
  await S.goto(inviteUrl.replace('https://', 'http://').replace(/^https?:\/\/[^/]+/, BASE)); await must(S, 'invited you to their wishlist'); log('invite landing greets the visitor by the owner name');
  await shot(S, '05-invite-landing');
  await type(S, byPlaceholder('e.g. Arav'), 'Sam'); await type(S, byPlaceholder('you@example.com'), 'sam'); await type(S, 'input[type=password]', 'hunter22');
  await clickText(S, 'Create my account'); await must(S, 'Take Quiz'); await must(S, 'Arav'); log('after signing up, the invited wishlist opens');
  assert.ok((await text(S)).includes('Shared with me (1)')); log('and it is saved under "Shared with me"');
  assert.ok(!(await text(S)).includes('Edit Wishlist')); log('guests do not see the editor');
  await shot(S, '06-sam-list');
  await clickText(S, 'All Gifts'); await must(S, 'Armani Beauty'); await clickText(S, 'Claim Gift'); await must(S, 'Enter your name');
  await type(S, 'input[placeholder*="Uncle Bob"]', 'Sam'); await clickText(S, 'Confirm Claim'); await must(S, 'Claimed — Click for Details');
  log('guest claimed a gift');

  // ---------- Arav sees the claim, can unclaim
  await A.reload(); await must(A, 'All Gifts (3)'); log('owner list persisted across reload (saved on the server)');
  await clickText(A, 'All Gifts'); await must(A, 'Claimed — Click for Details'); log('owner sees the claim');
  await clickText(A, 'Claimed — Click for Details'); await must(A, 'Sam'); await clickText(A, 'Unclaim This Item'); await clickText(A, 'Yes, unclaim'); await sleep(600);
  assert.ok(!(await text(A)).includes('Claimed — Click for Details')); log('owner can unclaim without a password');

  // ---------- Sam signs out and back in: wishlist still there
  await clickText(S, 'Sign out'); await must(S, 'Make your own wishlist');
  await type(S, 'button + button', '').catch(() => {});
  await clickText(S, 'Sign in', 'button'); await type(S, byPlaceholder('you@example.com'), 'sam'); await type(S, 'input[type=password]', 'hunter22'); await clickText(S, 'Sign in', 'button[type=submit]');
  await must(S, 'My Wishlist'); await clickText(S, 'Shared with me'); await must(S, 'Arav’s wishlist'); log('after signing back in, the shared wishlist is still on the account');
  await shot(S, '07-shared-tab');
  await clickText(S, 'Open wishlist'); await must(S, 'Take Quiz'); log('clicking it opens the wishlist, quiz and all');

  // ---------- Sam's own wishlist is separate
  await clickText(S, 'My Wishlist'); await must(S, 'Your wishlist is empty'); log("Sam's own wishlist is separate and empty");

  // ---------- anonymous visitor can look, then is nudged to sign in
  const ctxG = await browser.createBrowserContext(); const G = await ctxG.newPage();
  await G.goto(inviteUrl.replace(/^https?:\/\/[^/]+/, BASE)); await must(G, 'invited you'); await clickText(G, 'Just look at'); await must(G, 'Take Quiz'); await must(G, 'Sign in to save this wishlist'); log('visitors without an account can look and are offered to sign in');
  await ctxG.close();

  // ---------- quiz works on the new list
  await clickText(S, 'Shared with me'); await clickText(S, 'Open wishlist'); await must(S, 'Take Quiz');
  await clickText(S, 'Next Question'); await clickText(S, 'Next Question'); await clickText(S, 'Next Question'); await clickText(S, 'Next Question'); await clickText(S, 'Generate');
  await must(S, 'Total Cost'); log('the quiz runs on a shared wishlist'); await shot(S, '08-quiz-result');

  // ---------- original wishlist import (Arav's real data)
  const ctxO = await browser.createBrowserContext(); const O = await ctxO.newPage(); O.on('pageerror', e => errs.push('O:' + e.message));
  await O.goto(BASE); await type(O, byPlaceholder('e.g. Arav'), 'Arav P'); await type(O, byPlaceholder('you@example.com'), 'owner@example.com'); await type(O, 'input[type=password]', 'ownerpw1');
  await clickText(O, 'Create my account'); await must(O, 'The original wishlist is waiting for you'); await clickText(O, 'Import it');
  await type(O, 'input[placeholder*="Original owner"]', 'wrong'); await clickText(O, 'Import', 'button[type=submit]'); await must(O, 'not right'); log('wrong setup code is refused');
  await type(O, 'input[placeholder*="Original owner"]', '01015'); await clickText(O, 'Import', 'button[type=submit]');
  await must(O, 'Take Quiz'); await sleep(1200); await clickText(O, 'All Gifts'); await must(O, 'All Gifts (28)'); log('original wishlist imported: 20 old items + 8 newer starter items = 28');
  await must(O, 'Dior Sauvage'); await must(O, 'Claimed'); log('new starter items present, and the old claim (Grandma) carried over');
  await shot(O, '09-imported');
  await O.reload(); await must(O, 'All Gifts (28)'); log('imported list persisted across reload');
  await clickText(O, 'Edit Wishlist'); await must(O, 'Master Wishlist (28)'); await clickText(O, 'Birthday'); await sleep(1200); await O.reload(); await must(O, 'Birthday Edition'); log('theme change persisted');

  assert.equal(errs.length, 0, 'page errors: ' + errs.join(' | ')); log('no JavaScript errors in any browser');
  console.log('\nALL END-TO-END CHECKS PASSED');
} catch (e) { console.log('\nE2E FAILED:', e.message); process.exitCode = 1; } finally { await browser.close(); }
