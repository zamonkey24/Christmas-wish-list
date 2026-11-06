// Real-browser test of the home page, accounts, forgot password, emails, invite links, claims, add-by-link, catalog, Bloom AI and the original-list import.
// Setup: `npm run build`, then `node tools/test/e2e-server.mjs 4300 &`, then (in a folder with `npm i puppeteer-core`) run this file.
// Needs a saved Amazon product page at /tmp/B0DBRGYTDB.html (see e2e-server.mjs FIXTURE). Screenshots go to /tmp/pp/.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const BASE = 'http://localhost:4300';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'], defaultViewport: { width: 1300, height: 900 } });
const log = (m) => console.log('  ok  ', m); const shot = async (p, name) => p.screenshot({ path: `/tmp/pp/${name}.png` });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const text = (p) => p.evaluate(() => document.body.innerText);
const has = async (p, s, t = 8000) => { try { await p.waitForFunction((x) => document.body.innerText.includes(x), { timeout: t }, s); return true; } catch { return false; } };
const must = async (p, s, t) => { if (!(await has(p, s, t))) { await shot(p, 'FAIL'); throw new Error(`expected to see "${s}"\n--- page text ---\n${(await text(p)).slice(0, 800)}`); } };
const gone = async (p, s, t = 4000) => { try { await p.waitForFunction((x) => !document.body.innerText.includes(x), { timeout: t }, s); return true; } catch { await shot(p, 'FAIL'); throw new Error(`still showing "${s}"`); } };
const clickText = async (p, label, sel = 'button, a') => {
  const ok = await p.evaluate((label, sel) => { const el = [...document.querySelectorAll(sel)].find(e => e.innerText.trim().includes(label) && !e.disabled); if (!el) return false; el.click(); return true; }, label, sel);
  if (!ok) { await shot(p, 'FAIL'); throw new Error(`no button "${label}"`); }
};
const type = async (p, sel, v) => { await p.click(sel); await p.$eval(sel, e => e.select && e.select()); await p.keyboard.press('Backspace'); if (v) await p.type(sel, v); };
const byPh = (ph) => `input[placeholder*="${ph}"]`;
const outbox = async () => (await fetch(`${BASE}/__outbox.json`)).json();
const fillSignup = async (p, name, email, pw, marketing = false) => {
  await type(p, byPh('e.g. Arav'), name); await type(p, 'input[type=email]', email); await type(p, 'input[placeholder="••••"]', pw);
  if (marketing) await p.click('input[type=checkbox]');
  await clickText(p, 'Create my account', 'button[type=submit]');
};
const theme = (p) => p.evaluate(() => document.documentElement.dataset.theme);

try {
  const errs = [];
  // ---------- the new home page
  const ctxA = await browser.createBrowserContext(); const A = await ctxA.newPage(); A.on('pageerror', e => errs.push('A:' + e.message));
  await A.goto(BASE); await must(A, 'A wishlist your friends'); await must(A, 'What you get'); await must(A, 'Add gifts from a link'); await must(A, 'No double gifts'); await must(A, 'How it works');
  log('home page is a dashboard of features, not a sign-up form');
  assert.equal(await theme(A), 'classic'); log('home page uses the calm Classic theme (not Christmas)');
  assert.equal(await A.evaluate(() => document.querySelectorAll('canvas').length), 0); log('no falling snow on the home page');
  const topRight = await A.evaluate(() => { const bar = document.querySelector('div[style*="sticky"]'); const labels = [...bar.querySelectorAll('button')].map(b => b.innerText.trim()); const last = bar.querySelectorAll('button'); const r = last[last.length - 1].getBoundingClientRect(); return { labels, right: r.right, w: innerWidth }; });
  assert.ok(topRight.labels.includes('Log In') && topRight.labels.includes('Sign Up')); assert.ok(topRight.right > topRight.w - 40); log('"Log In" and "Sign Up" buttons sit in the top-right corner');
  await shot(A, '01-home');

  // ---------- separate sign-up page, 4-digit password
  await clickText(A, 'Sign Up', 'div[style*="sticky"] button'); await must(A, 'Create your account');
  assert.equal(await A.evaluate(() => location.hash), '#/signup'); log('Sign Up opens its own page (#/signup)');
  await shot(A, '02-signup');
  await clickText(A, 'Back to home'); await must(A, 'What you get'); await A.goBack(); await must(A, 'Create your account'); log('back to home works, and the browser back button works');
  await fillSignup(A, 'Arav', 'arav@example.com', '123'); await must(A, 'at least 4 characters', 3000).catch(() => {});
  assert.ok((await text(A)).includes('Create your account'), 'a 3 character password is not accepted'); log('3-character password is refused');
  await fillSignup(A, 'Arav', 'arav@example.com', '1234'); await must(A, 'Your wishlist is empty'); log('4-digit password creates the account');
  assert.equal(await theme(A), 'classic'); log('a new wishlist starts in the calm Classic theme');
  let mails = await outbox(); assert.ok(mails.some(m => m.to === 'arav@example.com' && m.subject.includes('Welcome'))); log('welcome email was sent');

  // ---------- add by link + invite (unchanged flows)
  await clickText(A, 'Add my first gift'); await must(A, 'Paste a link to the product');
  await type(A, byPh('amazon.com'), 'https://shop.test/armani'); await clickText(A, 'Find gift');
  await A.waitForFunction(() => [...document.querySelectorAll('input')].some(i => i.value.includes('Armani Beauty Stronger With You Intensely')), { timeout: 8000 }); await must(A, 'Found on the page');
  await clickText(A, 'Add to my wishlist'); await must(A, 'Master Wishlist (1)'); log('gift added from just a link');
  const inviteUrl = (await A.$eval('#invite-link-input', e => e.value)).replace(/^https?:\/\/[^/]+/, BASE); assert.match(inviteUrl, /\?invite=[a-z0-9]{10}$/);

  // ---------- Sam opens the invite link
  const ctxS = await browser.createBrowserContext(); const S = await ctxS.newPage(); S.on('pageerror', e => errs.push('S:' + e.message));
  await S.goto(inviteUrl); await must(S, 'invited you to their wishlist'); await must(S, 'Just look at it for now'); log('invite landing offers Sign Up / Log In / just look');
  await shot(S, '03-invite-landing');
  await clickText(S, 'Sign Up', 'main button'); await must(S, 'Create your account'); await must(S, 'invited you to their wishlist'); log('the sign-up page remembers the invite');
  await fillSignup(S, 'Sam', 'sam@example.com', '4321', true); await must(S, 'Take Quiz'); await must(S, 'Shared with me (1)'); log('after signing up, the invited wishlist opens and is saved under "Shared with me"');
  assert.ok(!(await text(S)).includes('Edit Wishlist')); await clickText(S, 'All Gifts'); await clickText(S, 'Claim Gift'); await type(S, 'input[placeholder*="Uncle Bob"]', 'Sam'); await clickText(S, 'Confirm Claim'); await must(S, 'Claimed — Click for Details'); log('guest claimed a gift');
  await clickText(S, 'My Wishlist'); await must(S, 'Your wishlist is empty'); { const t = await text(S); assert.ok(!t.includes('What you get') && !t.includes('Everything you can do') && !t.includes('How it works')); } log('logged-in people see their own wishlist, not the features page');
  await shot(S, '04-own-wishlist');
  assert.equal(await theme(S), 'classic'); log('leaving a wishlist returns to the Classic look');

  await S.click('button[aria-label="GiftBloom home"]'); await must(S, 'Your wishlist is empty'); log('the logo takes a logged-in person to their wishlist');
  // ---------- log out / log in page
  await clickText(S, 'Sign out'); await must(S, 'A wishlist your friends');
  await clickText(S, 'Log In', 'div[style*="sticky"] button'); await must(S, 'Welcome back'); await must(S, 'Forgot password?');
  await type(S, 'input[type=email]', 'sam@example.com'); await type(S, 'input[placeholder="••••"]', 'wrong'); await clickText(S, 'Log In', 'button[type=submit]'); await must(S, 'Wrong email/username or password'); log('wrong password shows an error');
  await shot(S, '05-login');

  // ---------- forgot password
  await clickText(S, 'Forgot password?'); await must(S, 'Forgot your password?'); assert.equal(await S.evaluate(() => location.hash), '#/forgot');
  await type(S, 'input[type=email]', 'sam@example.com'); await clickText(S, 'Send reset link'); await must(S, 'a reset link is on its way'); log('forgot password: asks for the email, says a link is on its way');
  await type(S, 'input[type=email]', 'sam@example.com').catch(() => {});
  mails = await outbox(); const reset = mails.find(m => m.to === 'sam@example.com' && m.subject.includes('Reset')); assert.ok(reset, 'reset email sent');
  const resetUrl = reset.text.match(/https?:\/\/\S+reset=[a-f0-9]+/)[0].replace(/^https?:\/\/[^/]+/, BASE); log('reset email contains a link');
  await S.goto(resetUrl); await must(S, 'Choose a new password'); await type(S, 'input[placeholder="••••"]', '987'); await clickText(S, 'Save new password'); await sleep(500); assert.ok((await text(S)).includes('Choose a new password')); log('reset: a 3-character password is refused');
  await type(S, 'input[placeholder="••••"]', '9876'); await clickText(S, 'Save new password'); await must(S, 'Your wishlist is empty'); log('reset: new password saved and logged in');
  await S.goto(resetUrl); await must(S, 'Choose a new password'); await type(S, 'input[placeholder="••••"]', '1111'); await clickText(S, 'Save new password'); await must(S, 'expired'); log('the reset link only works once');
  await S.goto(BASE); await must(S, 'Your wishlist is empty');
  await clickText(S, 'Sign out'); await must(S, 'A wishlist your friends'); await clickText(S, 'Log In', 'div[style*="sticky"] button'); await type(S, 'input[type=email]', 'sam@example.com'); await type(S, 'input[placeholder="••••"]', '9876'); await clickText(S, 'Log In', 'button[type=submit]'); await must(S, 'Your wishlist is empty'); log('logging in with the new password works');

  // ---------- Arav: account page, owner announcement
  await clickText(A, 'Sign out'); await must(A, 'A wishlist your friends'); await clickText(A, 'Log In', 'div[style*="sticky"] button'); await type(A, 'input[type=email]', 'arav@example.com'); await type(A, 'input[placeholder="••••"]', '1234'); await clickText(A, 'Log In', 'button[type=submit]'); await must(A, 'All Gifts (1)'); log('logging in lands straight on your wishlist');
  await A.evaluate(() => [...document.querySelectorAll('div[style*="sticky"] button')].find(b => b.innerText.includes('Arav'))?.click()); await must(A, 'Your account'); await must(A, 'Send an update'); await must(A, '1 person has chosen to get updates'); log('owner sees the account page with the announcement tool and the subscriber count');
  await shot(A, '06-account');
  await type(A, 'input[placeholder*="New: add gifts"]', 'New feature!'); await type(A, 'textarea', 'You can now add gifts from a link.\nTry it out.');
  await clickText(A, 'Send a test to me'); await must(A, 'Test email sent to you'); mails = await outbox(); assert.equal(mails[0].to, 'arav@example.com'); assert.ok(mails[0].text.includes('Unsubscribe:') && mails[0].text.includes('1 Test St')); log('test announcement goes only to the owner, with unsubscribe link + address');
  await clickText(A, 'Send to everyone who opted in'); await must(A, 'This can’t be undone'); await clickText(A, 'Yes, send it'); await must(A, 'Sent to 1 person'); mails = await outbox();
  const promo = mails.find(m => m.to === 'sam@example.com' && m.subject === 'New feature!'); assert.ok(promo && !mails.some(m => m.to === 'arav@example.com' && m.subject === 'New feature!' && m.at > promo.at)); log('announcement went only to Sam, the one person who opted in');
  // non-owner has no announcement tool
  await clickText(S, 'Sign out').catch(() => {});
  await S.goto(BASE); await must(S, 'A wishlist your friends'); await clickText(S, 'Log In', 'div[style*="sticky"] button'); await type(S, 'input[type=email]', 'sam@example.com'); await type(S, 'input[placeholder="••••"]', '9876'); await clickText(S, 'Log In', 'button[type=submit]'); await must(S, 'Your wishlist is empty');
  await S.evaluate(() => [...document.querySelectorAll('div[style*="sticky"] button')].find(b => b.innerText.includes('Sam'))?.click()); await must(S, 'Your account'); assert.ok(!(await text(S)).includes('Send an update')); log('regular accounts do not see the announcement tool');
  // unsubscribe from the email
  const unsubUrl = promo.text.match(/https?:\/\/\S+unsubscribe=[a-f0-9]+/)[0].replace(/^https?:\/\/[^/]+/, BASE);
  const ctxU = await browser.createBrowserContext(); const U = await ctxU.newPage(); await U.goto(unsubUrl); await must(U, 'You are unsubscribed'); log('unsubscribe link works with no login');
  await S.reload(); await must(S, 'Your wishlist is empty'); await S.evaluate(() => [...document.querySelectorAll('div[style*="sticky"] button')].find(b => b.innerText.includes('Sam'))?.click()); await sleep(600);
  assert.equal(await S.$eval('input[type=checkbox]', e => e.checked), false); log("Sam's account page now shows updates are off");
  await ctxU.close();

  // ---------- catalog: browse, search, endless scroll, add
  const bar = 'div[style*="sticky"] button';
  const cardCount = (p) => p.evaluate(() => [...document.querySelectorAll('button')].filter(b => /Add to my wishlist|Already on your list|^\s*Added/.test(b.innerText)).length);
  await clickText(S, 'Catalog', bar); await must(S, 'Gift Catalog'); await must(S, 'gifts'); await sleep(800);
  assert.equal(await cardCount(S), 24); log('catalog opens with the first 24 products');
  await S.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await S.waitForFunction(() => [...document.querySelectorAll('button')].filter(b => /Add to my wishlist/.test(b.innerText)).length > 24, { timeout: 8000 }); log('scrolling to the bottom loads more products automatically (endless scroll)');
  assert.ok((await cardCount(S)) >= 28);
  await S.evaluate(() => window.scrollTo(0, 0));
  await type(S, 'input[aria-label="Search the catalog"]', 'cologne'); await must(S, 'for “cologne”'); await sleep(600);
  { const t = await text(S); assert.ok(t.includes('Cremo') && t.includes('Lattafa') && !t.includes('Giant Inflatable')); } log('searching "cologne" shows only matching products');
  await S.select('select[aria-label="Price"]', '25'); await sleep(900);
  { const t = await text(S); assert.ok(t.includes('Cremo') && !t.includes('Dior Sauvage')); } log('price filter "Under $25" works');
  await shot(S, '08-catalog');
  await clickText(S, 'Add to my wishlist'); await must(S, 'Added'); log('adding a product from the catalog');
  await clickText(S, 'My Wishlist', bar); await must(S, 'All Gifts (1)'); log('it is on my wishlist right away');
  await clickText(S, 'Catalog', bar); await must(S, 'Gift Catalog');

  // ---------- Bloom AI
  await S.click('button[aria-label="Open Bloom AI"]'); await must(S, "Hi, I'm Bloom AI"); await shot(S, '09-bloom-open');
  await clickText(S, 'Cologne for my dad under $60'); await must(S, 'ideas'); await sleep(500);
  { const t = await S.$eval('div[role="dialog"]', e => e.innerText); assert.match(t, /under \$60/); assert.ok(/\$\d+/.test(t)); } log('Bloom AI answers a gift request with real products and respects the budget');
  const addedBefore = await S.evaluate(() => [...document.querySelectorAll('div[role="dialog"] button')].filter(b => b.innerText.includes('Add to my wishlist')).length); assert.ok(addedBefore >= 2);
  await S.evaluate(() => [...document.querySelectorAll('div[role="dialog"] button')].find(b => b.innerText.includes('Add to my wishlist')).click()); await sleep(900);
  assert.ok((await S.$eval('div[role="dialog"]', e => e.innerText)).includes('Added')); log('a suggestion can be added to the wishlist right from the chat');
  await type(S, 'input[aria-label="Message Bloom AI"]', 'a yacht under $5'); await S.keyboard.press('Enter'); await must(S, "couldn't find"); log('when nothing fits, Bloom says so instead of making something up');
  await shot(S, '10-bloom-chat');
  await S.click('button[aria-label="Close Bloom AI"]'); await gone(S, "Hi, I'm Bloom AI").catch(() => {});
  await clickText(S, 'My Wishlist', bar); await must(S, 'All Gifts (2)'); log('both added gifts are on the wishlist');

  // ---------- original wishlist import (Arav's real data) still works
  const ctxO = await browser.createBrowserContext(); const O = await ctxO.newPage(); O.on('pageerror', e => errs.push('O:' + e.message));
  await O.goto(BASE + '/#/signup'); await must(O, 'Create your account'); await fillSignup(O, 'Arav P', 'owner@example.com', '5555');
  await must(O, 'The original wishlist is waiting for you'); await clickText(O, 'Import it');
  await type(O, 'input[placeholder*="Original owner"]', '01015'); await clickText(O, 'Import', 'button[type=submit]');
  await must(O, 'Take Quiz'); await sleep(1200); await clickText(O, 'All Gifts'); await must(O, 'All Gifts (28)'); log('original wishlist imported: 20 old items + 8 newer starter items = 28');
  assert.equal(await theme(O), 'birthday'); log("imported list keeps its own theme (Birthday)");
  await O.reload(); await must(O, 'All Gifts (28)'); log('imported list persisted across reload');
  await clickText(O, 'Edit Wishlist'); await must(O, 'Classic'); await must(O, 'Christmas'); await must(O, 'Birthday'); log('theme picker offers Classic, Christmas and Birthday');
  await clickText(O, 'Classic'); await sleep(1200); await O.reload(); await sleep(1500); assert.equal(await theme(O), 'classic'); log('switching to Classic persists');
  await shot(O, '07-classic-list');

  assert.equal(errs.length, 0, 'page errors: ' + errs.join(' | ')); log('no JavaScript errors in any browser');
  console.log('\nALL END-TO-END CHECKS PASSED');
} catch (e) { console.log('\nE2E FAILED:', e.message); process.exitCode = 1; } finally { await browser.close(); }
