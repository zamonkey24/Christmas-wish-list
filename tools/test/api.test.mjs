import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createApi } from '../../netlify/lib/api.mjs';
import { parseProductPage, cleanProductUrl, shortenTitle, assertPublicUrl } from '../../netlify/lib/preview.mjs';
import { createMemoryStore } from './memory-store.mjs';

let passed = 0;
const test = async (name, fn) => { try { await fn(); passed++; console.log('  ok  ', name); } catch (e) { console.log('  FAIL', name, '\n      ', e.message); process.exitCode = 1; } };

const store = createMemoryStore();
let clockOffset = 0;
const sent = []; // every email the site tried to send
const mailer = { enabled: true, send: async (m) => { if (m.to.startsWith('broken@')) return { ok: false, reason: 'boom' }; sent.push(m); return { ok: true }; } };
const legacyStore = createMemoryStore();
const previews = [];
const api = createApi({
  store, legacyStore, mailer, now: () => Date.now() + clockOffset,
  env: { ADMIN_EMAILS: 'arav@example.com', MAIL_ADDRESS: '1 Example St, Springfield', SITE_URL: 'https://giftbloom.test' },
  fetchProductImpl: async (url) => { previews.push(url); if (url.includes('bad')) throw new Error('Could not open that link.'); return { title: 'Test Gift', image: 'https://img.example/x.jpg', price: 42, site: 'example.com', url }; }
});

// tiny cookie-jar client
const client = () => {
  let cookie = '';
  return async (method, path, body, headers = {}) => {
    const res = await api.handle(new Request(`https://site.test/api/${path}`, {
      method, headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}), ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined
    }));
    const sc = res.headers.get('set-cookie');
    if (sc) cookie = sc.split(';')[0].endsWith('=') ? '' : sc.split(';')[0];
    return { status: res.status, body: await res.json(), setCookie: sc };
  };
};

const item = (id, price = 20, extra = {}) => ({ id, title: `Gift ${id}`, price, category: 'Everyday Essentials', closenessRequired: 'casual', priority: 'High Wish ❤️', imageUrl: '/products/x.jpg', url: 'https://example.com/p', description: 'd', tags: ['hair'], ...extra });

await test('health check proves storage works', async () => {
  const r = await client()('GET', 'health'); assert.equal(r.status, 200); assert.equal(r.body.storage, true);
});
console.log('accounts');
const arav = client(), sam = client(), anon = client();
let aravMe, samMe;
await test('signup creates account, list and session cookie', async () => {
  const r = await arav('POST', 'auth/signup', { name: 'Arav', login: 'Arav@Example.com', password: 'secret1' });
  assert.equal(r.status, 200); assert.ok(r.body.myListId?.startsWith('l_')); assert.match(r.setCookie, /HttpOnly/); assert.match(r.setCookie, /Secure/);
  aravMe = r.body;
});
await test('duplicate login is rejected (case-insensitive)', async () => {
  const r = await client()('POST', 'auth/signup', { name: 'X', login: 'arav@example.com', password: 'secret1' });
  assert.equal(r.status, 409);
});
await test('weak password / bad login rejected', async () => {
  assert.equal((await client()('POST', 'auth/signup', { name: 'X', login: 'ok@x.com', password: '123' })).status, 400);
  assert.equal((await client()('POST', 'auth/signup', { name: 'X', login: 'a b', password: 'secret1' })).status, 400);
  assert.equal((await client()('POST', 'auth/signup', { name: 'X', login: 'justausername', password: 'secret1' })).status, 400);
});
await test('a 4-digit password is enough', async () => {
  const c = client(); const r = await c('POST', 'auth/signup', { name: 'Pin', email: 'pin@example.com', password: '4321' });
  assert.equal(r.status, 200);
  const c2 = client(); assert.equal((await c2('POST', 'auth/login', { email: 'pin@example.com', password: '4321' })).status, 200);
});
await test('/me knows the signed-in user and nobody else', async () => {
  assert.equal((await arav('GET', 'me')).body.user.name, 'Arav');
  assert.equal((await anon('GET', 'me')).body.user, null);
});
await test('password is stored hashed, never plain', async () => {
  const u = [...store.data.entries()].find(([k]) => k.startsWith('users/'))[1].value;
  assert.ok(u.hash && u.salt && !JSON.stringify(u).includes('secret1'));
});
await test('login: wrong password fails, right one works and sets a cookie', async () => {
  const c = client();
  assert.equal((await c('POST', 'auth/login', { login: 'arav@example.com', password: 'nope' })).status, 401);
  const ok = await c('POST', 'auth/login', { login: 'ARAV@example.com', password: 'secret1' });
  assert.equal(ok.status, 200); assert.ok(ok.setCookie);
  assert.equal((await c('GET', 'me')).body.user.name, 'Arav');
});
await test('too many wrong passwords locks the account for a while', async () => {
  const c = client();
  for (let i = 0; i < 8; i++) await c('POST', 'auth/login', { login: 'arav@example.com', password: 'bad' + i });
  assert.equal((await c('POST', 'auth/login', { login: 'arav@example.com', password: 'secret1' })).status, 429);
  await store.delete('rate/login/arav@example.com');
});
await test('logout ends the session', async () => {
  const c = client(); await c('POST', 'auth/login', { login: 'arav@example.com', password: 'secret1' });
  await c('POST', 'auth/logout', {});
  assert.equal((await c('GET', 'me')).body.user, null);
});
await test('JSON content type is required for writes (CSRF guard)', async () => {
  const res = await api.handle(new Request('https://site.test/api/auth/login', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: '{}' }));
  assert.equal(res.status, 415);
});

console.log('my wishlist');
const listId = aravMe.myListId;
await test('owner saves items and reads them back', async () => {
  const put = await arav('PUT', `lists/${listId}`, { items: [item('a', 25), item('b', 40, { mustGet: 'white one' })], ownerName: 'Arav', theme: 'birthday', trash: [] });
  assert.equal(put.status, 200);
  const got = await arav('GET', `lists/${listId}`);
  assert.equal(got.body.items.length, 2); assert.equal(got.body.theme, 'birthday'); assert.equal(got.body.isOwner, true); assert.ok(got.body.inviteCode);
  assert.equal(got.body.items[1].mustGet, 'white one');
});
await test('strangers cannot read a wishlist without an invite', async () => {
  assert.equal((await anon('GET', `lists/${listId}`)).status, 403);
  assert.equal((await anon('GET', `lists/${listId}`, undefined, { 'x-invite-code': 'wrongcode' })).status, 403);
});
await test('strangers cannot edit a wishlist, even with the invite code', async () => {
  const code = (await arav('GET', `lists/${listId}`)).body.inviteCode;
  const r = await anon('PUT', `lists/${listId}`, { items: [], ownerName: 'hax' }, { 'x-invite-code': code });
  assert.equal(r.status, 403);
});
await test('bad data is rejected, junk fields and scripts are stripped', async () => {
  assert.equal((await arav('PUT', `lists/${listId}`, { items: [{ id: 'x', title: '', price: 5 }] })).status, 400);
  await arav('PUT', `lists/${listId}`, { items: [item('a', 25, { imageUrl: 'javascript:alert(1)', url: 'javascript:alert(2)', claimed: true, claimedBy: 'evil' }), item('b', 40)], ownerName: 'Arav', theme: 'birthday', trash: [] });
  const g = (await arav('GET', `lists/${listId}`)).body.items[0];
  assert.equal(g.imageUrl, ''); assert.equal(g.url, ''); assert.equal(g.claimed, false);
});

console.log('invite links');
const code = (await arav('GET', `lists/${listId}`)).body.inviteCode;
await test('invite info is public and shows the owner name', async () => {
  const r = await anon('GET', `invite/${code}`);
  assert.equal(r.status, 200); assert.equal(r.body.ownerName, 'Arav'); assert.equal(r.body.listId, listId);
  assert.equal((await anon('GET', 'invite/nope')).status, 404);
});
await test('anyone with the code can view (and claim) without an account', async () => {
  const r = await anon('GET', `lists/${listId}`, undefined, { 'x-invite-code': code });
  assert.equal(r.status, 200); assert.equal(r.body.isOwner, false); assert.equal(r.body.trash, undefined); assert.equal(r.body.inviteCode, undefined);
});
await test('joining saves the wishlist on the account', async () => {
  samMe = (await sam('POST', 'auth/signup', { name: 'Sam', login: 'sam@example.com', password: 'hunter22' })).body;
  assert.equal(samMe.joined.length, 0);
  const j = await sam('POST', 'join', { code });
  assert.equal(j.status, 200); assert.equal(j.body.listId, listId);
  const me = (await sam('GET', 'me')).body;
  assert.equal(me.joined.length, 1); assert.equal(me.joined[0].ownerName, 'Arav'); assert.equal(me.joined[0].listId, listId);
});
await test('joining twice does not duplicate; joining your own list is a no-op', async () => {
  await sam('POST', 'join', { code });
  assert.equal((await sam('GET', 'me')).body.joined.length, 1);
  assert.equal((await arav('POST', 'join', { code })).body.own, true);
});
await test('a member can open the list later without the code', async () => {
  const r = await sam('GET', `lists/${listId}`);
  assert.equal(r.status, 200);
});
await test('joining needs an account', async () => {
  assert.equal((await anon('POST', 'join', { code })).status, 401);
});
await test('leaving removes it from the account', async () => {
  const sam2 = client(); await sam2('POST', 'auth/login', { login: 'sam@example.com', password: 'hunter22' });
  await sam2('POST', 'leave', { listId });
  assert.equal((await sam2('GET', 'me')).body.joined.length, 0);
  await sam2('POST', 'join', { code });
});
await test('a signed-in member sees up-to-date owner name', async () => {
  await arav('PUT', `lists/${listId}`, { items: [item('a', 25), item('b', 40)], ownerName: 'Arav P', theme: 'birthday', trash: [] });
  assert.equal((await sam('GET', 'me')).body.joined[0].ownerName, 'Arav P');
  await arav('PUT', `lists/${listId}`, { items: [item('a', 25), item('b', 40)], ownerName: 'Arav', theme: 'birthday', trash: [] });
});

console.log('claims');
await test('guest claims a gift; everyone sees it; double-claim is blocked', async () => {
  const r = await anon('POST', `lists/${listId}/claim`, { itemId: 'a', name: 'Aunt Sarah', note: 'Happy birthday!' }, { 'x-invite-code': code });
  assert.equal(r.status, 200);
  const view = (await sam('GET', `lists/${listId}`)).body.items.find(i => i.id === 'a');
  assert.equal(view.claimed, true); assert.equal(view.claimedBy, 'Aunt Sarah'); assert.equal(view.claimedNote, 'Happy birthday!');
  const again = await sam('POST', `lists/${listId}/claim`, { itemId: 'a', name: 'Sam' });
  assert.equal(again.status, 409);
});
await test('two people claiming at the same instant: exactly one wins', async () => {
  const results = await Promise.all(['Ann', 'Bo', 'Cy', 'Di'].map(n => anon('POST', `lists/${listId}/claim`, { itemId: 'b', name: n }, { 'x-invite-code': code })));
  assert.equal(results.filter(r => r.status === 200).length, 1);
  assert.equal(results.filter(r => r.status === 409).length, 3);
  const winner = (await arav('GET', `lists/${listId}`)).body.items.find(i => i.id === 'b').claimedBy;
  assert.ok(['Ann', 'Bo', 'Cy', 'Di'].includes(winner));
  await arav('POST', `lists/${listId}/unclaim`, { itemId: 'b' });
});
await test('only the owner or the claimer can unclaim', async () => {
  assert.equal((await anon('POST', `lists/${listId}/unclaim`, { itemId: 'a' }, { 'x-invite-code': code })).status, 403);
  await sam('POST', `lists/${listId}/claim`, { itemId: 'b', name: 'Sam' });
  const mine = (await sam('GET', `lists/${listId}`)).body.items.find(i => i.id === 'b');
  assert.equal(mine.claimedByMe, true);
  assert.equal((await sam('POST', `lists/${listId}/unclaim`, { itemId: 'a' })).status, 403);
  assert.equal((await sam('POST', `lists/${listId}/unclaim`, { itemId: 'b' })).status, 200);
  assert.equal((await arav('POST', `lists/${listId}/unclaim`, { itemId: 'a' })).status, 200);
});
await test('owner edits never wipe claims made in the meantime', async () => {
  await anon('POST', `lists/${listId}/claim`, { itemId: 'a', name: 'Guest' }, { 'x-invite-code': code });
  await arav('PUT', `lists/${listId}`, { items: [item('a', 30), item('b', 40), item('c', 10)], ownerName: 'Arav', theme: 'birthday', trash: [] });
  const items = (await arav('GET', `lists/${listId}`)).body.items;
  assert.equal(items.find(i => i.id === 'a').claimedBy, 'Guest'); assert.equal(items.find(i => i.id === 'a').price, 30);
});
await test('claiming a gift that is not on the list fails; owner can reset all claims', async () => {
  assert.equal((await anon('POST', `lists/${listId}/claim`, { itemId: 'zzz', name: 'x' }, { 'x-invite-code': code })).status, 404);
  assert.equal((await sam('POST', `lists/${listId}/reset-claims`, {})).status, 403);
  await arav('POST', `lists/${listId}/reset-claims`, {});
  assert.ok((await arav('GET', `lists/${listId}`)).body.items.every(i => !i.claimed));
});
await test('rotating the invite code stops new joins but members keep access', async () => {
  const r = await arav('POST', `lists/${listId}/invite/rotate`, {});
  assert.notEqual(r.body.inviteCode, code);
  assert.equal((await anon('GET', `invite/${code}`)).status, 404);
  assert.equal((await anon('GET', `lists/${listId}`, undefined, { 'x-invite-code': code })).status, 403);
  assert.equal((await sam('GET', `lists/${listId}`)).status, 200);
  assert.equal((await anon('GET', `invite/${r.body.inviteCode}`)).status, 200);
});

console.log('add a gift from a link');
await test('preview needs sign-in; returns name, photo and price', async () => {
  assert.equal((await anon('POST', 'preview', { url: 'https://example.com/p' })).status, 401);
  const r = await sam('POST', 'preview', { url: 'https://example.com/p' });
  assert.equal(r.status, 200); assert.equal(r.body.title, 'Test Gift'); assert.equal(r.body.price, 42);
  assert.equal((await sam('POST', 'preview', { url: 'https://bad.example/x' })).status, 422);
  assert.equal((await sam('POST', 'preview', {})).status, 400);
});

console.log('every account has its own list');
await test('Sam has a separate empty wishlist that Arav cannot edit', async () => {
  const mine = (await sam('GET', 'me')).body.myListId;
  assert.notEqual(mine, listId);
  const g = await sam('GET', `lists/${mine}`);
  assert.equal(g.body.items.length, 0); assert.equal(g.body.isOwner, true);
  assert.equal((await arav('PUT', `lists/${mine}`, { items: [item('z')] })).status, 403);
  assert.equal((await sam('PUT', `lists/${mine}`, { items: [item('z', 15)], ownerName: 'Sam', theme: 'christmas', trash: [] })).status, 200);
  assert.equal((await arav('GET', `lists/${listId}`)).body.items.length, 3);
});

console.log('original wishlist import');
await test('availability check: only signed-in people, and only until it is imported', async () => {
  assert.equal((await anon('GET', 'legacy')).status, 401);
  const fresh = client(); await fresh('POST', 'auth/signup', { name: 'F', login: 'fresh1@example.com', password: 'freshpw1' });
  await legacyStore.setJSON('wishlist-state', { items: [item('o1', 99)], ownerName: 'Arav', version: 11 });
  assert.equal((await fresh('GET', 'legacy')).body.available, true);
});
await test('wrong setup code is refused; right code imports items, trash, claims, theme once', async () => {
  const u = client(); const me = (await u('POST', 'auth/signup', { name: 'Owner', login: 'owner@example.com', password: 'ownerpw1' })).body;
  await legacyStore.setJSON('wishlist-state', { items: [item('o1', 99, { claimed: true, claimedBy: 'Gran', claimedNote: 'love' }), item('o2', 12)], ownerName: 'Arav', version: 11, theme: 'birthday', trash: [{ ...item('t1', 5), deletedAt: 1 }], knownIds: ['o1'] });
  assert.equal((await u('POST', 'import-legacy', { setupCode: '0000' })).status, 403);
  const ok = await u('POST', 'import-legacy', { setupCode: '01015' });
  assert.equal(ok.status, 200);
  const g = (await u('GET', `lists/${me.myListId}`)).body;
  assert.equal(g.items.length, 2); assert.equal(g.theme, 'birthday'); assert.equal(g.trash.length, 1); assert.equal(g.legacyVersion, 11);
  assert.equal(g.items[0].claimedBy, 'Gran');
  assert.equal((await sam('POST', 'import-legacy', { setupCode: '01015' })).status, 409);
  assert.equal((await u('GET', 'legacy')).body.available, false);
});

console.log('link reading');
const amazonHtml = (f) => fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
await test('cleanProductUrl trims Amazon tracking junk', () => {
  assert.equal(cleanProductUrl('https://www.amazon.com/Some-Long-Name/dp/B0DBRGYTDB/ref=sr_1_5?crid=1&dib=zzz&th=1'), 'https://www.amazon.com/dp/B0DBRGYTDB?th=1');
  assert.equal(cleanProductUrl('https://example.com/a?b=1'), 'https://example.com/a?b=1');
});
await test('shortenTitle cleans long marketing titles', () => {
  assert.equal(shortenTitle('Amazon.com : BASED Curl Gel - Maximum Hold &amp; Definition Without Flakes - Scrunches Out Soft with Irish Sea Moss : Beauty &amp; Personal Care'), 'BASED Curl Gel - Maximum Hold & Definition Without Flakes');
  assert.ok(shortenTitle('x'.repeat(300)).length <= 90);
});
for (const [file, expect] of [['/tmp/B0DBRGYTDB.html', { title: /Armani Beauty Stronger With You Intensely/, price: 89 }], ['/tmp/B0GF4QKYRV.html', { title: /BASED Curl Gel/, price: 20 }], ['/tmp/B079C2P64T.html', { title: /Cremo Cologne/, price: null }]]) {
  const html = amazonHtml(file);
  if (!html) { console.log('  skip ', file, '(no saved page)'); continue; }
  await test(`parses a real Amazon page: ${file.split('/').pop()}`, () => {
    const p = parseProductPage(html, 'https://www.amazon.com/dp/X');
    assert.match(p.title, expect.title); if (expect.price) assert.equal(p.price, expect.price); else assert.ok(Number.isInteger(p.price) && p.price > 5 && p.price < 60, 'price ' + p.price); assert.match(p.image, /^https:\/\/m\.media-amazon\.com\/images\/I\//);
  });
}
await test('parses Open Graph + JSON-LD pages from other stores', () => {
  const html = `<html><head><meta property="og:title" content="Cool Sneakers &amp; Co"><meta property="og:image" content="/img/s.jpg"><meta property="og:site_name" content="ShoeShop"><script type="application/ld+json">{"@type":"Product","name":"Cool Sneakers","offers":{"@type":"Offer","price":"89.99"}}</script></head></html>`;
  const p = parseProductPage(html, 'https://shoeshop.com/p/1');
  assert.equal(p.title, 'Cool Sneakers & Co'); assert.equal(p.image, 'https://shoeshop.com/img/s.jpg'); assert.equal(p.price, 90); assert.equal(p.site, 'ShoeShop');
});
await test('private / local addresses are refused (no snooping on the server network)', async () => {
  for (const bad of ['http://localhost/x', 'http://127.0.0.1/', 'http://10.0.0.5/', 'http://192.168.1.1/', 'http://169.254.169.254/latest/meta-data', 'file:///etc/passwd', 'ftp://a.com', 'http://[::1]/', 'https://example.com:8080/']) {
    await assert.rejects(() => assertPublicUrl(bad, async () => [{ address: '93.184.216.34' }]), undefined, bad);
  }
  await assert.rejects(() => assertPublicUrl('https://sneaky.example/', async () => [{ address: '10.1.2.3' }]));
  await assertPublicUrl('https://example.com/', async () => [{ address: '93.184.216.34' }]);
});


console.log('forgot password');
const resetLink = () => { const m = sent.filter(x => x.subject.includes('Reset')).pop(); return m ? m.text.match(/reset=([a-f0-9]+)/)?.[1] : null; };
await test('config says email is available', async () => { assert.equal((await anon('GET', 'config')).body.emailEnabled, true); });
await test('forgot: same answer for real and unknown emails, and the email goes only to the real one', async () => {
  const before = sent.length;
  const real = await anon('POST', 'auth/forgot', { email: 'sam@example.com' });
  const fake = await anon('POST', 'auth/forgot', { email: 'nobody@example.com' });
  assert.equal(real.status, 200); assert.equal(fake.status, 200); assert.deepEqual(real.body, fake.body);
  assert.equal(sent.length, before + 1); assert.equal(sent[sent.length - 1].to, 'sam@example.com');
  assert.match(sent[sent.length - 1].text, /https:\/\/giftbloom\.test\/\?reset=[a-f0-9]{64}/);
});
await test('forgot: asking over and over is limited', async () => {
  for (let i = 0; i < 2; i++) await anon('POST', 'auth/forgot', { email: 'sam@example.com' });
  assert.equal((await anon('POST', 'auth/forgot', { email: 'sam@example.com' })).status, 429);
  await store.delete('rate/forgot/sam@example.com');
});
await test('reset: bad token and short password are refused', async () => {
  assert.equal((await anon('POST', 'auth/reset', { token: 'nope', password: 'newpass1' })).status, 400);
  await anon('POST', 'auth/forgot', { email: 'sam@example.com' });
  assert.equal((await anon('POST', 'auth/reset', { token: resetLink(), password: '12' })).status, 400);
});
await test('reset: sets the new password, signs in, signs old sessions out, link works once', async () => {
  const oldSam = client(); await oldSam('POST', 'auth/login', { email: 'sam@example.com', password: 'hunter22' });
  await anon('POST', 'auth/forgot', { email: 'sam@example.com' });
  const token = resetLink();
  const c = client();
  const r = await c('POST', 'auth/reset', { token, password: '9876' });
  assert.equal(r.status, 200); assert.equal(r.body.user.name, 'Sam');
  assert.equal((await c('GET', 'me')).body.user.name, 'Sam');
  assert.equal((await client()('POST', 'auth/login', { email: 'sam@example.com', password: 'hunter22' })).status, 401);
  assert.equal((await client()('POST', 'auth/login', { email: 'sam@example.com', password: '9876' })).status, 200);
  assert.equal((await oldSam('GET', 'me')).body.user, null);
  assert.equal((await anon('POST', 'auth/reset', { token, password: 'again11' })).status, 400);
});
await test('reset: the link expires after an hour', async () => {
  await anon('POST', 'auth/forgot', { email: 'arav@example.com' });
  const token = resetLink();
  clockOffset = 61 * 60000;
  assert.equal((await anon('POST', 'auth/reset', { token, password: 'late1234' })).status, 400);
  clockOffset = 0;
});
await test('reset also clears a login lockout', async () => {
  await store.setJSON('rate/login/arav@example.com', { fails: 8, first: Date.now() });
  await anon('POST', 'auth/forgot', { email: 'arav@example.com' });
  assert.equal((await client()('POST', 'auth/reset', { token: resetLink(), password: 'secret1' })).status, 200);
  assert.equal((await client()('POST', 'auth/login', { email: 'arav@example.com', password: 'secret1' })).status, 200);
});
await test('without an email service the answer says so instead of pretending', async () => {
  const noMail = createApi({ store, mailer: { enabled: false, send: async () => ({ ok: false }) } });
  const res = await noMail.handle(new Request('https://site.test/api/auth/forgot', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'sam@example.com' }) }));
  assert.equal((await res.json()).emailEnabled, false);
});

console.log('emails');
await arav('POST', 'auth/login', { email: 'arav@example.com', password: 'secret1' });
await sam('POST', 'auth/login', { email: 'sam@example.com', password: '9876' });
await test('signing up sends a welcome email, and a broken mail service never blocks signing up', async () => {
  const before = sent.length;
  const r = await client()('POST', 'auth/signup', { name: 'Wen', email: 'wen@example.com', password: '1234' });
  assert.equal(r.status, 200);
  await new Promise(r => setTimeout(r, 20));
  assert.ok(sent.slice(before).some(m => m.to === 'wen@example.com' && m.subject.includes('Welcome')));
  assert.equal((await client()('POST', 'auth/signup', { name: 'Brk', email: 'broken@example.com', password: '1234' })).status, 200);
});
await test('promotional emails are opt-in: off unless the box is ticked', async () => {
  assert.equal((await arav('GET', 'me')).body.marketingOptIn, false);
  const yes = client(); const r = await yes('POST', 'auth/signup', { name: 'Yes', email: 'yes@example.com', password: '1234', marketingOptIn: true });
  assert.equal(r.body.marketingOptIn, true);
});
await test('people can change their email preference and name', async () => {
  const r = await sam('POST', 'account/preferences', { marketingOptIn: true, name: 'Sammy' });
  assert.equal(r.body.marketingOptIn, true); assert.equal(r.body.user.name, 'Sammy');
  assert.equal((await anon('POST', 'account/preferences', { marketingOptIn: true })).status, 401);
});
await test('campaign: only the owner (ADMIN_EMAILS) can send or see counts', async () => {
  assert.equal((await sam('GET', 'admin/stats')).status, 403);
  assert.equal((await sam('POST', 'admin/campaign', { subject: 's', message: 'm' })).status, 403);
  assert.equal((await anon('GET', 'admin/stats')).status, 401);
  const stats = (await arav('GET', 'admin/stats')).body;
  assert.equal(stats.subscribers, 2); assert.equal(stats.emailEnabled, true); assert.equal(stats.addressSet, true);
  assert.equal((await arav('GET', 'me')).body.isAdmin, true); assert.equal((await sam('GET', 'me')).body.isAdmin, false);
});
await test('campaign: a test send goes only to the owner and carries unsubscribe + address', async () => {
  const before = sent.length;
  const r = await arav('POST', 'admin/campaign', { subject: 'Hello!', message: 'New gifts added.\nCheck them out.', testOnly: true });
  assert.equal(r.status, 200); assert.equal(r.body.sent, 1);
  const m = sent[sent.length - 1]; assert.equal(sent.length, before + 1); assert.equal(m.to, 'arav@example.com');
  assert.match(m.text, /Unsubscribe: https:\/\/giftbloom\.test\/\?unsubscribe=[a-f0-9]{32}/); assert.match(m.text, /1 Example St, Springfield/);
  assert.match(m.headers['List-Unsubscribe'], /unsubscribe=/);
});
await test('campaign: goes to opted-in people only, never to everyone', async () => {
  const before = sent.length;
  const r = await arav('POST', 'admin/campaign', { subject: 'Big news', message: 'Hi all' });
  assert.equal(r.body.total, 2); assert.equal(r.body.sent, 2);
  const to = sent.slice(before).map(m => m.to).sort();
  assert.deepEqual(to, ['sam@example.com', 'yes@example.com']);
});
await test('campaign: refuses without subject/message or without a mailing address', async () => {
  assert.equal((await arav('POST', 'admin/campaign', { subject: '', message: 'x' })).status, 400);
  const noAddr = createApi({ store, mailer, env: { ADMIN_EMAILS: 'arav@example.com' } });
  const c = client(); const login = await noAddr.handle(new Request('https://site.test/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'arav@example.com', password: 'secret1' }) }));
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const res = await noAddr.handle(new Request('https://site.test/api/admin/campaign', { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ subject: 's', message: 'm' }) }));
  assert.equal(res.status, 400); assert.match((await res.json()).error, /MAIL_ADDRESS/);
});
await test('unsubscribe link works without logging in, and stops future sends', async () => {
  const m = sent.filter(x => x.to === 'yes@example.com' && x.text.includes('Unsubscribe:')).pop();
  const token = m.text.match(/unsubscribe=([a-f0-9]+)/)[1];
  assert.equal((await anon('POST', 'unsubscribe', { token: 'nope' })).status, 404);
  assert.equal((await anon('POST', 'unsubscribe', { token })).status, 200);
  const before = sent.length;
  const r = await arav('POST', 'admin/campaign', { subject: 'Again', message: 'x' });
  assert.equal(r.body.total, 1); assert.ok(!sent.slice(before).some(x => x.to === 'yes@example.com'));
});
await test('emails escape names (no HTML injection)', async () => {
  const before = sent.length;
  await client()('POST', 'auth/signup', { name: '<b>Hax</b>', email: 'hax@example.com', password: '1234' });
  await new Promise(r => setTimeout(r, 20));
  const m = sent.slice(before).find(x => x.to === 'hax@example.com'); assert.ok(!m.html.includes('<b>Hax</b>')); assert.ok(m.html.includes('&lt;b&gt;Hax'));
});

console.log(`\n${passed} passed${process.exitCode ? ', SOME FAILED' : ''}`);
