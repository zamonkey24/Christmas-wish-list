// Accounts, wishlists, invite links and claims. Storage is injected so this runs on Netlify Blobs in
// production and on an in-memory store in tests.
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { fetchProduct } from './preview.mjs';
import { createMailer } from './mailer.mjs';
import { welcomeEmail, resetEmail, promoEmail } from './emails.mjs';
import { starterCatalog, ideaCatalog, searchProducts, makeProduct, productIdOf, titleMatch } from './catalog.mjs';
import { createBloom } from './bloom.mjs';
import { inferGift } from '../../src/utils/inferGift.js';

const scrypt = promisify(crypto.scrypt);

const COOKIE = 'gb_session';
const SESSION_DAYS = 400;
const THEMES = ['classic', 'christmas', 'birthday'];
const MIN_PASSWORD = 4;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RESET_MINUTES = 60;
const MAX_CAMPAIGN = 300;
const MAX_COMMUNITY = 2000;
const BLOOM_PER_DAY = 40;
const UPGRADE_PER_DAY = 25;
const MAX_BODY = 1_000_000;
const MAX_ITEMS = 300;
const LEGACY_SETUP_CODE = '01015'; // the old owner password; lets the original wishlist be imported once
const CLAIM_FIELDS = ['claimed', 'claimedBy', 'claimedNote', 'claimedByMe'];

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers }
  });

const rand = (bytes) => crypto.randomBytes(bytes).toString('hex');
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const inviteCode = () => {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  return Array.from(crypto.randomBytes(10), b => alphabet[b % alphabet.length]).join('');
};

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const safeUrl = (v, allowRelative = false) => {
  const s = str(v, 2000);
  if (!s) return '';
  if (allowRelative && s.startsWith('/') && !s.startsWith('//')) return s;
  try {
    const u = new URL(s);
    return ['http:', 'https:'].includes(u.protocol) ? u.toString() : '';
  } catch { return ''; }
};

function cleanItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = str(raw.id, 60);
  const title = str(raw.title, 200);
  const price = Math.round(Number(raw.price));
  if (!id || !title || !Number.isFinite(price) || price < 0 || price > 100000) return null;
  const item = {
    id,
    title,
    price,
    category: str(raw.category, 60) || 'Everyday Essentials',
    closenessRequired: ['casual', 'friend', 'close'].includes(raw.closenessRequired) ? raw.closenessRequired : 'casual',
    priority: str(raw.priority, 40) || 'High Wish ❤️',
    imageUrl: safeUrl(raw.imageUrl, true),
    url: safeUrl(raw.url),
    description: str(raw.description, 600),
    tags: Array.isArray(raw.tags) ? raw.tags.map(t => str(t, 30).toLowerCase()).filter(Boolean).slice(0, 12) : []
  };
  const mustGet = str(raw.mustGet, 120);
  if (mustGet) item.mustGet = mustGet;
  if (Number.isFinite(raw.addedIn)) item.addedIn = raw.addedIn;
  if (raw.estimated === true) item.estimated = true; // price is an estimate (a gift idea, not a verified listing)
  if (Number.isFinite(raw.deletedAt)) item.deletedAt = raw.deletedAt;
  return item;
}

function cleanItems(arr, limit) {
  if (!Array.isArray(arr) || arr.length > limit) throw new HttpError(400, 'Too many items.');
  const seen = new Set();
  const out = [];
  for (const raw of arr) {
    const it = cleanItem(raw);
    if (!it) throw new HttpError(400, 'One of the gifts is missing a name or price.');
    if (seen.has(it.id)) continue;
    seen.add(it.id);
    out.push(it);
  }
  return out;
}

export function createApi({ store, legacyStore = null, fetchProductImpl = fetchProduct, now = () => Date.now(), mailer = createMailer(), env = {}, bloomClient = null }) {
  const adminEmails = String(env.ADMIN_EMAILS || '').toLowerCase().split(',').map(x => x.trim()).filter(Boolean);
  const isAdmin = (u) => Boolean(u && (adminEmails.includes(u.login) || adminEmails.includes('*'))); // '*' is for local testing only
  const siteUrlOf = (req) => (env.SITE_URL || new URL(req.url).origin).replace(/\/$/, '');
  const getJSON = (key) => store.get(key, { type: 'json' });

  // ---------- catalog
  // Products people add by link (our server read the page, so name/photo/price are real) join the shared catalog.
  async function addToCommunity(info) {
    const product = makeProduct(info);
    if (!product) return;
    for (let attempt = 0; attempt < 4; attempt++) {
      const cur = await store.getWithMetadata('catalog/community', { type: 'json' });
      const items = cur?.data?.items ? [...cur.data.items] : [];
      const i = items.findIndex(p => p.id === product.id);
      if (i >= 0) items[i] = { ...items[i], price: product.price, image: product.image, title: product.title };
      else items.unshift(product);
      const body = { items: items.slice(0, MAX_COMMUNITY) };
      const res = cur ? await store.setJSON('catalog/community', body, { onlyIfMatch: cur.etag }) : await store.setJSON('catalog/community', body, { onlyIfNew: true });
      if (res?.modified !== false) return;
    }
  }
  // Attach a real listing (photo, price, link) to a gift idea. First match wins so nobody can overwrite a good one.
  async function attachListing(idea, info, by) {
    const entry = { image: info.image, url: info.url, price: Math.round(info.price), site: info.site || new URL(info.url).hostname.replace(/^www\./, ''), upgradedBy: by || 'auto', upgradedAt: now() };
    for (let attempt = 0; attempt < 4; attempt++) {
      const cur = await store.getWithMetadata('catalog/upgrades', { type: 'json' });
      const map = cur?.data ? { ...cur.data } : {};
      if (map[idea.id]) return false;
      map[idea.id] = entry;
      const res = cur ? await store.setJSON('catalog/upgrades', map, { onlyIfMatch: cur.etag }) : await store.setJSON('catalog/upgrades', map, { onlyIfNew: true });
      if (res?.modified !== false) return true;
    }
    return false;
  }
  // Someone added a real product by link: if it is one of our ideas, the idea gets its real photo for everyone.
  async function autoUpgrade(info) {
    if (!info?.title || !info.image || !(info.price > 0) || !info.url) return;
    const hit = ideaCatalog().find(i => titleMatch(i.title, info.title) >= 0.85 && info.price >= i.price * 0.4 && info.price <= i.price * 2.5);
    if (hit) await attachListing(hit, info, 'auto');
  }
  async function allProducts() {
    const community = (await getJSON('catalog/community'))?.items || [];
    const starters = starterCatalog();
    const seen = new Set(starters.map(p => p.id));
    const upgrades = (await getJSON('catalog/upgrades')) || {};
    // An idea that someone has matched to a real listing becomes a verified product with a real photo and price.
    const ideas = ideaCatalog().map(i => (upgrades[i.id] ? { ...i, ...upgrades[i.id], estimated: false, kind: 'listing', photo: undefined, upgraded: true } : i));
    return [...starters, ...community.filter(p => !seen.has(p.id)), ...ideas];
  }
  // What Bloom's tools may see: this person's own wishlist and the wishlists shared with them (nobody else's).
  async function bloomContext(user, focusListId) {
    const mine = user?.myListId ? await getJSON(`lists/${user.myListId}`) : null;
    const lists = [];
    for (const j of (user?.joined || []).slice(0, 10)) {
      const l = await getJSON(`lists/${j.listId}`);
      if (!l) continue;
      const claims = await claimsOf(l.id);
      lists.push({
        listId: l.id,
        ownerName: l.ownerName,
        items: l.items.slice(0, 80).map(i => ({ id: i.id, title: i.title, price: i.price, category: i.category, image: i.imageUrl, url: i.url, estimated: i.estimated, claimed: Boolean(claims[i.id]) }))
      });
    }
    return { myItems: mine?.items || [], lists, focus: focusListId ? lists.find(l => l.listId === focusListId) || null : null };
  }
  const bloom = createBloom({ getCatalog: allProducts, getContext: bloomContext, client: bloomClient, model: env.BLOOM_MODEL || undefined, effort: env.BLOOM_EFFORT || undefined, deadlineMs: Number(env.BLOOM_DEADLINE_MS) || undefined });

  // ---------- passwords & sessions
  async function hashPassword(password, saltHex) {
    const buf = await scrypt(password, Buffer.from(saltHex, 'hex'), 64, { N: 16384, r: 8, p: 1 });
    return buf.toString('hex');
  }

  const cookieHeader = (req, token, maxAge) => {
    const secure = new URL(req.url).protocol === 'https:' ? '; Secure' : '';
    return `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`;
  };

  const readCookie = (req) => {
    const raw = req.headers.get('cookie') || '';
    for (const part of raw.split(';')) {
      const [k, ...v] = part.trim().split('=');
      if (k === COOKIE) return v.join('=');
    }
    return null;
  };

  async function getSession(req) {
    const token = readCookie(req);
    if (!token || token.length < 20) return null;
    const s = await getJSON(`sessions/${sha256(token)}`);
    if (!s || now() - s.createdAt > SESSION_DAYS * 86400000) return null;
    const user = await getJSON(`users/${s.userId}`);
    if (!user || (s.tv ?? 0) !== (user.tokenVersion ?? 0)) return null;
    return { user, tokenHash: sha256(token) };
  }

  const requireUser = async (req) => {
    const s = await getSession(req);
    if (!s) throw new HttpError(401, 'Please sign in.');
    return s.user;
  };

  async function startSession(req, user) {
    const token = rand(32);
    await store.setJSON(`sessions/${sha256(token)}`, { userId: user.id, createdAt: now(), tv: user.tokenVersion ?? 0 });
    return cookieHeader(req, token, SESSION_DAYS * 86400);
  }

  const publicUser = (u) => ({ id: u.id, name: u.name, login: u.login });

  // Failed-attempt limiter (per key) so passwords cannot be guessed endlessly.
  async function checkRate(key) {
    const r = await getJSON(`rate/${key}`);
    if (r && r.fails >= 8 && now() - r.first < 15 * 60000) throw new HttpError(429, 'Too many tries. Please wait a few minutes.');
  }
  async function noteFail(key) {
    const r = await getJSON(`rate/${key}`);
    const fresh = !r || now() - r.first >= 15 * 60000;
    await store.setJSON(`rate/${key}`, { fails: fresh ? 1 : r.fails + 1, first: fresh ? now() : r.first });
  }
  const clearRate = (key) => store.delete(`rate/${key}`);
  // Counts every call; refuses once `max` calls happen inside `windowMs`.
  async function hit(key, max, windowMs) {
    const r = await getJSON(`rate/${key}`);
    const fresh = !r || now() - r.first >= windowMs;
    const count = fresh ? 1 : r.fails + 1;
    await store.setJSON(`rate/${key}`, { fails: count, first: fresh ? now() : r.first });
    if (count > max) throw new HttpError(429, 'Too many requests. Please try again later.');
  }

  // ---------- lists
  async function newList(user) {
    const id = `l_${rand(6)}`;
    const code = inviteCode();
    const list = {
      id, ownerId: user.id, ownerName: user.name, items: [], trash: [], theme: 'classic',
      inviteCode: code, legacyVersion: null, createdAt: now(), updatedAt: now()
    };
    await store.setJSON(`lists/${id}`, list);
    await store.setJSON(`invites/${code}`, { listId: id });
    return list;
  }

  async function claimsOf(listId) {
    return (await getJSON(`claims/${listId}`)) || {};
  }

  async function updateClaims(listId, mutate) {
    const key = `claims/${listId}`;
    for (let attempt = 0; attempt < 6; attempt++) {
      const cur = await store.getWithMetadata(key, { type: 'json' });
      const map = cur?.data ? { ...cur.data } : {};
      const out = mutate(map);
      const res = cur
        ? await store.setJSON(key, map, { onlyIfMatch: cur.etag })
        : await store.setJSON(key, map, { onlyIfNew: true });
      if (res?.modified !== false) return out;
    }
    throw new HttpError(409, 'Busy, please try again.');
  }

  const stripClaims = (item) => {
    const copy = { ...item };
    for (const f of CLAIM_FIELDS) delete copy[f];
    return copy;
  };

  function viewOf(list, claims, { isOwner, userId }) {
    const items = list.items.map(it => {
      const c = claims[it.id];
      return c
        ? { ...it, claimed: true, claimedBy: c.claimedBy, claimedNote: c.note || '', claimedByMe: Boolean(userId && c.userId === userId) }
        : { ...it, claimed: false, claimedBy: '', claimedNote: '', claimedByMe: false };
    });
    const view = {
      id: list.id,
      ownerName: list.ownerName,
      theme: list.theme,
      items,
      isOwner,
      updatedAt: list.updatedAt
    };
    if (isOwner) {
      view.trash = list.trash || [];
      view.inviteCode = list.inviteCode;
      view.legacyVersion = list.legacyVersion ?? null;
    }
    return view;
  }

  // Owner, someone who joined with the invite link before, or a visitor holding the current invite code.
  async function accessList(req, listId, { ownerOnly = false } = {}) {
    const list = await getJSON(`lists/${listId}`);
    if (!list) throw new HttpError(404, 'That wishlist was not found.');
    const session = await getSession(req);
    const user = session?.user || null;
    const isOwner = Boolean(user && user.id === list.ownerId);
    if (isOwner) return { list, user, isOwner };
    if (ownerOnly) throw new HttpError(403, 'Only the owner can do that.');
    const code = req.headers.get('x-invite-code');
    const member = Boolean(user && (user.joined || []).some(j => j.listId === listId));
    if (!member && code !== list.inviteCode) throw new HttpError(403, 'You need an invite link for this wishlist.');
    return { list, user, isOwner: false };
  }

  const readBody = async (req) => {
    const type = req.headers.get('content-type') || '';
    if (!type.includes('application/json')) throw new HttpError(415, 'Expected JSON.');
    const text = await req.text();
    if (text.length > MAX_BODY) throw new HttpError(413, 'That is too large.');
    try { return JSON.parse(text || '{}'); } catch { throw new HttpError(400, 'Bad request.'); }
  };

  // ---------- route handlers
  async function signup(req) {
    const b = await readBody(req);
    const name = str(b.name, 40);
    const email = str(b.email ?? b.login, 120).toLowerCase();
    const password = typeof b.password === 'string' ? b.password : '';
    if (!name) throw new HttpError(400, 'Please enter your name.');
    if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Please enter a real email address.');
    if (password.length < MIN_PASSWORD || password.length > 200) throw new HttpError(400, `Your password needs at least ${MIN_PASSWORD} characters.`);

    const id = `u_${rand(6)}`;
    const claimed = await store.setJSON(`logins/${email}`, { userId: id }, { onlyIfNew: true });
    if (claimed?.modified === false) throw new HttpError(409, 'There is already an account with that email. Try logging in.');

    const salt = rand(16);
    const unsubToken = rand(16);
    const user = {
      id, login: email, name, salt, hash: await hashPassword(password, salt), joined: [], myListId: null, createdAt: now(),
      tokenVersion: 0, marketingOptIn: b.marketingOptIn === true, unsubToken
    };
    const list = await newList(user);
    user.myListId = list.id;
    await store.setJSON(`users/${id}`, user);
    await store.setJSON(`unsubs/${unsubToken}`, { userId: id });
    const setCookie = await startSession(req, user);
    // A welcome note is nice to have, but signing up must never fail because email did.
    const welcome = welcomeEmail({ name, siteUrl: siteUrlOf(req) });
    mailer.send({ to: email, ...welcome }).catch(() => {});
    return json(await meBody(user), 200, { 'set-cookie': setCookie });
  }

  async function login(req) {
    const b = await readBody(req);
    const loginName = str(b.email ?? b.login, 120).toLowerCase();
    const password = typeof b.password === 'string' ? b.password : '';
    await checkRate(`login/${loginName}`);
    const idx = loginName ? await getJSON(`logins/${loginName}`) : null;
    const user = idx ? await getJSON(`users/${idx.userId}`) : null;
    const given = user ? await hashPassword(password, user.salt) : null;
    const ok = Boolean(user && given && crypto.timingSafeEqual(Buffer.from(given, 'hex'), Buffer.from(user.hash, 'hex')));
    if (!ok) {
      await noteFail(`login/${loginName}`);
      throw new HttpError(401, 'Wrong email/username or password.');
    }
    await clearRate(`login/${loginName}`);
    const setCookie = await startSession(req, user);
    return json(await meBody(user), 200, { 'set-cookie': setCookie });
  }

  async function logout(req) {
    const s = await getSession(req);
    if (s) await store.delete(`sessions/${s.tokenHash}`);
    return json({ ok: true }, 200, { 'set-cookie': cookieHeader(req, '', 0) });
  }

  async function meBody(user) {
    const joined = [];
    for (const j of user.joined || []) {
      const l = await getJSON(`lists/${j.listId}`);
      if (l) joined.push({ listId: j.listId, ownerName: l.ownerName, theme: l.theme, addedAt: j.addedAt });
    }
    const mine = user.myListId ? await getJSON(`lists/${user.myListId}`) : null;
    return { user: publicUser(user), myListId: user.myListId, myTheme: mine?.theme || 'classic', joined, marketingOptIn: Boolean(user.marketingOptIn), isAdmin: isAdmin(user) };
  }

  async function me(req) {
    const s = await getSession(req);
    if (!s) return json({ user: null });
    return json(await meBody(s.user));
  }

  async function inviteInfo(code) {
    const inv = await getJSON(`invites/${code}`);
    const list = inv ? await getJSON(`lists/${inv.listId}`) : null;
    if (!list || list.inviteCode !== code) throw new HttpError(404, 'That invite link is not valid anymore.');
    return json({ listId: list.id, ownerName: list.ownerName, theme: list.theme });
  }

  async function join(req) {
    const user = await requireUser(req);
    const b = await readBody(req);
    const code = str(b.code, 40);
    const inv = await getJSON(`invites/${code}`);
    const list = inv ? await getJSON(`lists/${inv.listId}`) : null;
    if (!list || list.inviteCode !== code) throw new HttpError(404, 'That invite link is not valid anymore.');
    if (list.ownerId === user.id) return json({ listId: list.id, own: true });
    if (!(user.joined || []).some(j => j.listId === list.id)) {
      const fresh = await getJSON(`users/${user.id}`);
      fresh.joined = [...(fresh.joined || []), { listId: list.id, addedAt: now() }];
      await store.setJSON(`users/${user.id}`, fresh);
    }
    return json({ listId: list.id, ownerName: list.ownerName });
  }

  async function leave(req) {
    const user = await requireUser(req);
    const b = await readBody(req);
    const fresh = await getJSON(`users/${user.id}`);
    fresh.joined = (fresh.joined || []).filter(j => j.listId !== b.listId);
    await store.setJSON(`users/${user.id}`, fresh);
    return json({ ok: true });
  }

  async function getList(req, listId) {
    const { list, user, isOwner } = await accessList(req, listId);
    return json(viewOf(list, await claimsOf(listId), { isOwner, userId: user?.id }));
  }

  async function putList(req, listId) {
    const { list } = await accessList(req, listId, { ownerOnly: true });
    const b = await readBody(req);
    const items = cleanItems((b.items || []).map(stripClaims), MAX_ITEMS);
    const trash = cleanItems(b.trash || [], 100);
    const next = {
      ...list,
      items,
      trash,
      ownerName: str(b.ownerName, 40) || list.ownerName,
      theme: THEMES.includes(b.theme) ? b.theme : list.theme,
      legacyVersion: b.legacyVersion === null ? null : list.legacyVersion ?? null,
      updatedAt: Math.max(now(), (list.updatedAt || 0) + 1)
    };
    await store.setJSON(`lists/${listId}`, next);
    return json({ ok: true, updatedAt: next.updatedAt });
  }

  async function claim(req, listId) {
    const { list, user } = await accessList(req, listId);
    const b = await readBody(req);
    const itemId = str(b.itemId, 60);
    if (!list.items.some(i => i.id === itemId)) throw new HttpError(404, 'That gift is no longer on the list.');
    const claimedBy = str(b.name, 40) || user?.name || '';
    if (!claimedBy) throw new HttpError(400, 'Please enter your name.');
    await updateClaims(listId, (map) => {
      if (map[itemId]) throw new HttpError(409, 'Someone just claimed that gift.');
      map[itemId] = { claimedBy, note: str(b.note, 300), userId: user?.id || null, at: now() };
    });
    return json(viewOf(list, await claimsOf(listId), { isOwner: user?.id === list.ownerId, userId: user?.id }));
  }

  async function unclaim(req, listId) {
    const { list, user, isOwner } = await accessList(req, listId);
    const b = await readBody(req);
    const itemId = str(b.itemId, 60);
    await updateClaims(listId, (map) => {
      const c = map[itemId];
      if (!c) return;
      if (!isOwner && !(user && c.userId === user.id)) throw new HttpError(403, 'Only the list owner or the person who claimed it can unclaim.');
      delete map[itemId];
    });
    return json(viewOf(list, await claimsOf(listId), { isOwner, userId: user?.id }));
  }

  async function resetClaims(req, listId) {
    const { list, user } = await accessList(req, listId, { ownerOnly: true });
    await updateClaims(listId, (map) => { for (const k of Object.keys(map)) delete map[k]; });
    return json(viewOf(list, {}, { isOwner: true, userId: user.id }));
  }

  async function rotateInvite(req, listId) {
    const { list } = await accessList(req, listId, { ownerOnly: true });
    const code = inviteCode();
    await store.setJSON(`invites/${code}`, { listId });
    await store.delete(`invites/${list.inviteCode}`);
    await store.setJSON(`lists/${listId}`, { ...list, inviteCode: code });
    return json({ inviteCode: code });
  }

  async function config() {
    return json({ emailEnabled: mailer.enabled });
  }

  async function forgot(req) {
    const b = await readBody(req);
    const email = str(b.email, 120).toLowerCase();
    if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Please enter the email you signed up with.');
    await hit(`forgot/${email}`, 3, 60 * 60000);
    const idx = await getJSON(`logins/${email}`);
    const user = idx ? await getJSON(`users/${idx.userId}`) : null;
    // Same answer whether or not the email has an account, so nobody can use this to find out who has one.
    if (user && mailer.enabled) {
      const token = rand(32);
      await store.setJSON(`resets/${sha256(token)}`, { userId: user.id, exp: now() + RESET_MINUTES * 60000 });
      const link = `${siteUrlOf(req)}/?reset=${token}`;
      await mailer.send({ to: user.login, ...resetEmail({ name: user.name, link }) });
    }
    return json({ ok: true, emailEnabled: mailer.enabled });
  }

  async function reset(req) {
    const b = await readBody(req);
    const token = str(b.token, 100);
    const password = typeof b.password === 'string' ? b.password : '';
    if (password.length < MIN_PASSWORD || password.length > 200) throw new HttpError(400, `Your password needs at least ${MIN_PASSWORD} characters.`);
    const r = token ? await getJSON(`resets/${sha256(token)}`) : null;
    if (!r || r.exp < now()) throw new HttpError(400, 'That reset link has expired. Ask for a new one.');
    const user = await getJSON(`users/${r.userId}`);
    if (!user) throw new HttpError(400, 'That reset link has expired. Ask for a new one.');
    user.salt = rand(16);
    user.hash = await hashPassword(password, user.salt);
    user.tokenVersion = (user.tokenVersion ?? 0) + 1; // signs the old sessions out
    await store.setJSON(`users/${user.id}`, user);
    await store.delete(`resets/${sha256(token)}`);
    await clearRate(`login/${user.login}`);
    const setCookie = await startSession(req, user);
    return json(await meBody(user), 200, { 'set-cookie': setCookie });
  }

  async function setPreferences(req) {
    const user = await requireUser(req);
    const b = await readBody(req);
    const fresh = await getJSON(`users/${user.id}`);
    if (typeof b.marketingOptIn === 'boolean') {
      fresh.marketingOptIn = b.marketingOptIn;
      if (!fresh.unsubToken) {
        fresh.unsubToken = rand(16);
        await store.setJSON(`unsubs/${fresh.unsubToken}`, { userId: fresh.id });
      }
    }
    const name = str(b.name, 40);
    if (name) fresh.name = name;
    await store.setJSON(`users/${fresh.id}`, fresh);
    return json(await meBody(fresh));
  }

  async function unsubscribe(req) {
    const b = await readBody(req);
    const token = str(b.token, 60);
    const idx = token ? await getJSON(`unsubs/${token}`) : null;
    const user = idx ? await getJSON(`users/${idx.userId}`) : null;
    if (!user) throw new HttpError(404, 'That unsubscribe link is not valid.');
    user.marketingOptIn = false;
    await store.setJSON(`users/${user.id}`, user);
    return json({ ok: true });
  }

  async function subscribers() {
    const { blobs } = await store.list({ prefix: 'users/' });
    const out = [];
    for (const { key } of blobs) {
      const u = await getJSON(key);
      if (u?.marketingOptIn && u.unsubToken) out.push(u);
    }
    return out;
  }

  async function requireAdmin(req) {
    const user = await requireUser(req);
    if (!isAdmin(user)) throw new HttpError(403, 'Only the site owner can do that.');
    return user;
  }

  async function adminStats(req) {
    await requireAdmin(req);
    return json({ subscribers: (await subscribers()).length, emailEnabled: mailer.enabled, addressSet: Boolean(env.MAIL_ADDRESS) });
  }

  async function campaign(req) {
    const admin = await requireAdmin(req);
    const b = await readBody(req);
    const subject = str(b.subject, 120);
    const message = str(b.message, 5000);
    if (!subject || !message) throw new HttpError(400, 'Add a subject and a message first.');
    if (!mailer.enabled) throw new HttpError(400, 'Email is not set up on this site yet.');
    if (!env.MAIL_ADDRESS) throw new HttpError(400, 'Set MAIL_ADDRESS (a mailing address shown at the bottom of every promotional email) before sending.');
    const siteUrl = siteUrlOf(req);
    const makeFor = (u) => promoEmail({ name: u.name, subject, message, siteUrl, address: env.MAIL_ADDRESS, unsubscribeUrl: `${siteUrl}/?unsubscribe=${u.unsubToken}` });

    if (b.testOnly) {
      const a = (await getJSON(`users/${admin.id}`)) || admin;
      if (!a.unsubToken) { a.unsubToken = rand(16); await store.setJSON(`users/${a.id}`, a); await store.setJSON(`unsubs/${a.unsubToken}`, { userId: a.id }); }
      const r = await mailer.send({ to: a.login, ...makeFor(a) });
      if (!r.ok) throw new HttpError(502, r.reason);
      return json({ sent: 1, failed: 0, total: 1, test: true });
    }
    const list = await subscribers();
    if (list.length > MAX_CAMPAIGN) throw new HttpError(400, `That is more than ${MAX_CAMPAIGN} people for one send.`);
    let sent = 0, failed = 0;
    for (let i = 0; i < list.length; i += 10) {
      const results = await Promise.all(list.slice(i, i + 10).map(u => mailer.send({ to: u.login, ...makeFor(u) })));
      results.forEach(r => (r.ok ? sent++ : failed++));
    }
    return json({ sent, failed, total: list.length });
  }

  async function preview(req) {
    await requireUser(req);
    const b = await readBody(req);
    const url = str(b.url, 2000);
    if (!url) throw new HttpError(400, 'Paste a product link first.');
    try {
      const info = await fetchProductImpl(url);
      addToCommunity(info).catch(() => {}); // sharing it with the catalog must never get in the way
      autoUpgrade(info).catch(() => {});
      return json(info);
    } catch (e) {
      throw new HttpError(422, e.message || 'Could not read that link.');
    }
  }

  async function catalogSearch(req) {
    await requireUser(req);
    const q = new URL(req.url).searchParams;
    const num = (k, d) => (q.get(k) !== null && q.get(k) !== '' && Number.isFinite(Number(q.get(k))) ? Number(q.get(k)) : d);
    return json(searchProducts(await allProducts(), {
      q: (q.get('q') || '').slice(0, 100),
      category: q.get('category') || '',
      age: q.get('age') || '',
      min: num('min', 0),
      max: num('max', Infinity),
      sort: q.get('sort') || 'relevance',
      photos: q.get('photos') === '1',
      page: num('page', 1),
      limit: num('limit', 24)
    }));
  }

  // Puts one gift at the top of a wishlist (skipping duplicates). Returns { added, count, updatedAt, item }.
  async function insertItem(listId, raw) {
    const list = await getJSON(`lists/${listId}`);
    if (!list) throw new HttpError(404, 'Wishlist not found.');
    const item = cleanItem({ ...raw, id: raw?.id || `g_${now()}` });
    if (!item) throw new HttpError(400, 'That gift is missing a name or price.');
    const key = (u) => (u ? productIdOf(u) : null);
    const dupe = list.items.find(i => i.id === item.id || (item.url && key(i.url) === key(item.url)));
    if (dupe) return { added: false, count: list.items.length, item: dupe };
    if (list.items.length >= MAX_ITEMS) throw new HttpError(400, 'Your wishlist is full.');
    list.items = [item, ...list.items];
    list.updatedAt = Math.max(now(), (list.updatedAt || 0) + 1);
    await store.setJSON(`lists/${listId}`, list);
    return { added: true, count: list.items.length, updatedAt: list.updatedAt, item };
  }

  async function addListItem(req, listId) {
    await accessList(req, listId, { ownerOnly: true });
    const b = await readBody(req);
    const { added, count, updatedAt } = await insertItem(listId, b.item);
    return json(added ? { added, count, updatedAt } : { added, count });
  }

  // Links pasted into the Bloom chat: read each page, then save the gift (name, photo, price) to the person's own wishlist.
  const URL_RE = /https?:\/\/[^\s<>"')]+/gi;
  async function addLinks(user, urls) {
    const out = [];
    for (const url of urls) {
      try {
        const info = await fetchProductImpl(url);
        addToCommunity(info).catch(() => {});
        autoUpgrade(info).catch(() => {});
        if (!info?.title) throw new Error('That page did not show a product name.');
        if (!(info.price > 0)) { out.push({ url, ok: false, title: info.title, image: info.image || '', error: 'I could not read a price on that page. Add it with the Add gift button and type the price.' }); continue; }
        const meta = inferGift(info.title, info.price);
        const r = await insertItem(user.myListId, {
          id: `g_${now()}_${out.length}`, title: info.title, price: info.price, category: meta.category, closenessRequired: meta.closenessRequired,
          priority: 'High Wish ❤️', imageUrl: info.image || '', url: info.url || url, description: info.site ? `From ${info.site}.` : 'Added from a link.', tags: meta.tags
        });
        out.push({ url, ok: true, added: r.added, title: r.item.title, price: r.item.price, image: r.item.imageUrl || '', site: info.site || '' });
      } catch (e) {
        out.push({ url, ok: false, error: e.message || 'Could not open that link.' });
      }
    }
    return out;
  }

  // ---------- Secret Santa
  // A group has a join code. The organizer draws once (everyone gets exactly one person, never themselves, in one big circle).
  // Each member can only ever see who THEY drew; the draw is never shown to anyone else, not even the organizer.
  const SANTA_MAX = 30;
  const santaCode = () => inviteCode().slice(0, 6).toUpperCase();
  async function santaIds(userId) { return (await getJSON(`santa-user/${userId}`)) || []; }
  async function santaAdd(userId, id) {
    const ids = await santaIds(userId);
    if (!ids.includes(id)) await store.setJSON(`santa-user/${userId}`, [...ids, id]);
  }
  async function santaGet(id) {
    const g = await getJSON(`santa/${str(id, 40)}`);
    if (!g) throw new HttpError(404, 'That Secret Santa group was not found.');
    return g;
  }
  function santaView(g, user) {
    const mine = g.assignments?.[user.id];
    const receiver = mine ? g.members.find(m => m.userId === mine) : null;
    return {
      id: g.id, name: g.name, budget: g.budget, date: g.date, code: g.code, drawn: Boolean(g.drawnAt),
      isOrganizer: g.organizerId === user.id,
      canDraw: g.organizerId === user.id && !g.drawnAt && g.members.length >= 3,
      members: g.members.map(m => ({ name: m.name, you: m.userId === user.id, organizer: m.userId === g.organizerId })),
      ...(receiver ? { youGive: { name: receiver.name, listId: receiver.listId } } : {})
    };
  }
  async function santaCreate(req) {
    const user = await requireUser(req);
    const b = await readBody(req);
    const name = str(b.name, 50);
    if (!name) throw new HttpError(400, 'Give your Secret Santa group a name.');
    const budget = Math.round(Number(b.budget));
    if ((await santaIds(user.id)).length >= 20) throw new HttpError(400, 'You are in a lot of groups already.');
    const g = {
      id: `s_${rand(6)}`, name, budget: Number.isFinite(budget) && budget > 0 && budget <= 10000 ? budget : 0, date: str(b.date, 30),
      code: santaCode(), organizerId: user.id, createdAt: now(), drawnAt: null, assignments: null,
      members: [{ userId: user.id, name: user.name, listId: user.myListId }]
    };
    await store.setJSON(`santa/${g.id}`, g);
    await store.setJSON(`santa-codes/${g.code}`, { id: g.id });
    await santaAdd(user.id, g.id);
    return json(santaView(g, user));
  }
  async function santaMine(req) {
    const user = await requireUser(req);
    const groups = [];
    for (const id of await santaIds(user.id)) {
      const g = await getJSON(`santa/${id}`);
      if (g && g.members.some(m => m.userId === user.id)) groups.push({ id: g.id, name: g.name, members: g.members.length, drawn: Boolean(g.drawnAt), budget: g.budget, date: g.date });
    }
    return json({ groups });
  }
  async function santaJoin(req) {
    const user = await requireUser(req);
    const b = await readBody(req);
    await hit(`santa-join/${user.id}`, 30, 3600000);
    const code = str(b.code, 20).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const ref = code ? await getJSON(`santa-codes/${code}`) : null;
    const g = ref ? await getJSON(`santa/${ref.id}`) : null;
    if (!g) throw new HttpError(404, 'That Secret Santa code was not found. Check it and try again.');
    if (!g.members.some(m => m.userId === user.id)) {
      if (g.drawnAt) throw new HttpError(409, 'Names were already drawn for that group, so no one new can join.');
      if (g.members.length >= SANTA_MAX) throw new HttpError(400, 'That group is full.');
      g.members.push({ userId: user.id, name: user.name, listId: user.myListId });
      await store.setJSON(`santa/${g.id}`, g);
    }
    await santaAdd(user.id, g.id);
    return json(santaView(g, user));
  }
  async function santaShow(req, id) {
    const user = await requireUser(req);
    const g = await santaGet(id);
    if (!g.members.some(m => m.userId === user.id)) throw new HttpError(403, 'You are not in that group.');
    return json(santaView(g, user));
  }
  async function santaDraw(req, id) {
    const user = await requireUser(req);
    const g = await santaGet(id);
    if (g.organizerId !== user.id) throw new HttpError(403, 'Only the organizer can draw names.');
    if (g.drawnAt) throw new HttpError(409, 'Names were already drawn.');
    if (g.members.length < 3) throw new HttpError(400, 'You need at least 3 people to draw names.');
    // Shuffle (Fisher-Yates with secure randomness), then each person gives to the next one around the circle.
    const order = g.members.map(m => m.userId);
    for (let i = order.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [order[i], order[j]] = [order[j], order[i]]; }
    const assignments = {};
    order.forEach((giver, i) => { assignments[giver] = order[(i + 1) % order.length]; });
    g.assignments = assignments; g.drawnAt = now();
    await store.setJSON(`santa/${g.id}`, g);
    // Each giver can now open the wishlist of the person they drew.
    for (const [giver, receiver] of Object.entries(assignments)) {
      const listId = g.members.find(m => m.userId === receiver).listId;
      const u = await getJSON(`users/${giver}`);
      if (u && !(u.joined || []).some(j => j.listId === listId)) {
        u.joined = [...(u.joined || []), { listId, addedAt: now(), santa: g.id }];
        await store.setJSON(`users/${giver}`, u);
      }
    }
    return json(santaView(g, user));
  }
  async function santaLeave(req, id) {
    const user = await requireUser(req);
    const g = await santaGet(id);
    if (g.organizerId === user.id) throw new HttpError(400, 'The organizer can delete the group instead of leaving it.');
    if (g.drawnAt) throw new HttpError(409, 'Names were already drawn, so you cannot leave now.');
    g.members = g.members.filter(m => m.userId !== user.id);
    await store.setJSON(`santa/${g.id}`, g);
    await store.setJSON(`santa-user/${user.id}`, (await santaIds(user.id)).filter(x => x !== g.id));
    return json({ ok: true });
  }
  async function santaDelete(req, id) {
    const user = await requireUser(req);
    const g = await santaGet(id);
    if (g.organizerId !== user.id) throw new HttpError(403, 'Only the organizer can delete the group.');
    for (const m of g.members) await store.setJSON(`santa-user/${m.userId}`, (await santaIds(m.userId)).filter(x => x !== g.id));
    await store.delete(`santa/${g.id}`);
    await store.delete(`santa-codes/${g.code}`);
    return json({ ok: true });
  }

  async function bloomChat(req) {
    const user = await requireUser(req);
    const b = await readBody(req);
    const raw = (Array.isArray(b.messages) ? b.messages : []).filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim());
    const messages = raw.map(m => ({ role: m.role, content: m.content.trim().slice(0, 800) })).slice(-12);
    if (!messages.length || messages[messages.length - 1].role !== 'user') throw new HttpError(400, 'Tell Bloom what you are looking for.');
    const shown = (Array.isArray(b.shown) ? b.shown : []).filter(x => typeof x === 'string').map(x => x.slice(0, 80)).slice(-60);
    const focusListId = typeof b.focusListId === 'string' ? b.focusListId.slice(0, 40) : '';
    await hit(`bloom/${user.id}`, BLOOM_PER_DAY, 24 * 3600000);

    // Product links in the message are added to the person's wishlist with their real name, photo and price.
    const fullText = String(raw[raw.length - 1].content).slice(0, 4000);
    const urls = [...new Set((fullText.match(URL_RE) || []).map(u => u.replace(/[.,;!?]+$/, '')))].slice(0, 3);
    if (!urls.length) return json(await bloom.answer({ messages, shown, focusListId }, user));

    const linked = await addLinks(user, urls);
    const names = (xs) => xs.map(x => `“${x.title.length > 60 ? x.title.slice(0, 57) + '…' : x.title}” ($${x.price})`).join(', ');
    const parts = [];
    const added = linked.filter(x => x.ok && x.added), dupes = linked.filter(x => x.ok && !x.added), bad = linked.filter(x => !x.ok);
    if (added.length) parts.push(`Done! I added ${names(added)} to your wishlist, with the photo and price.`);
    if (dupes.length) parts.push(`${names(dupes)} ${dupes.length > 1 ? 'are' : 'is'} already on your wishlist.`);
    if (bad.length) parts.push(bad.length === 1 && !added.length && !dupes.length ? `I couldn't add that one: ${bad[0].error}` : `I couldn't read ${bad.length} of the links: ${bad[0].error}`);
    let reply = parts.join(' ');
    let picks = [], followUps = [];
    const rest = fullText.replace(URL_RE, ' ').replace(/\s+/g, ' ').trim();
    if (rest.split(' ').filter(w => w.length > 1).length >= 3) {
      const msgs = [...messages.slice(0, -1), { role: 'user', content: rest.slice(0, 800) }];
      const r = await bloom.answer({ messages: msgs, shown, focusListId }, user);
      reply = `${reply}\n\n${r.reply}`; picks = r.picks || []; followUps = r.followUps || [];
    }
    if (!followUps.length) followUps = ['Find gifts for someone', 'Paste another link'];
    return json({ reply, picks, followUps, linked, mode: 'links' });
  }

  async function upgradeIdea(req) {
    const user = await requireUser(req);
    const b = await readBody(req);
    const idea = ideaCatalog().find(i => i.id === b.ideaId);
    if (!idea) throw new HttpError(404, 'That gift idea was not found.');
    const upgrades = (await getJSON('catalog/upgrades')) || {};
    if (upgrades[idea.id]) throw new HttpError(409, 'That gift already has a real listing.');
    await hit(`upgrade/${user.id}`, UPGRADE_PER_DAY, 24 * 3600000);
    const url = str(b.url, 2000);
    if (!url) throw new HttpError(400, 'Paste the product link first.');
    let info;
    try { info = await fetchProductImpl(url); } catch (e) { throw new HttpError(422, e.message || 'Could not read that link.'); }
    if (!info?.title || !info.image || !(info.price > 0)) throw new HttpError(422, 'That page did not show a name, photo and price. Try the product page on Amazon.');
    if (titleMatch(idea.title, info.title) < 0.6) throw new HttpError(422, `That does not look like “${idea.title}”. Paste the link for that exact product.`);
    if (!(await attachListing(idea, info, user.id))) throw new HttpError(409, 'That gift already has a real listing.');
    addToCommunity(info).catch(() => {});
    return json((await allProducts()).find(p => p.id === idea.id));
  }

  async function legacyAvailable(req) {
    await requireUser(req);
    if (!legacyStore || (await getJSON('legacy/imported'))) return json({ available: false });
    const old = await legacyStore.get('wishlist-state', { type: 'json' });
    return json({ available: Boolean(old && Array.isArray(old.items) && old.items.length) });
  }

  async function importLegacy(req) {
    const user = await requireUser(req);
    const b = await readBody(req);
    await checkRate(`legacy/${user.id}`);
    if (b.setupCode !== LEGACY_SETUP_CODE) {
      await noteFail(`legacy/${user.id}`);
      throw new HttpError(403, 'That setup code is not right.');
    }
    if (!legacyStore) throw new HttpError(404, 'There is no original wishlist to import.');
    if (await getJSON('legacy/imported')) throw new HttpError(409, 'The original wishlist was already imported.');
    const old = await legacyStore.get('wishlist-state', { type: 'json' });
    if (!old || !Array.isArray(old.items)) throw new HttpError(404, 'There is no original wishlist to import.');

    const claims = {};
    for (const it of old.items) {
      if (it.claimed) claims[it.id] = { claimedBy: str(it.claimedBy, 40) || 'Someone', note: str(it.claimedNote, 300), userId: null, at: now() };
    }
    const list = await getJSON(`lists/${user.myListId}`);
    const next = {
      ...list,
      items: cleanItems(old.items.map(stripClaims), MAX_ITEMS),
      trash: cleanItems(Array.isArray(old.trash) ? old.trash : [], 100),
      theme: THEMES.includes(old.theme) ? old.theme : 'christmas',
      ownerName: str(old.ownerName, 40) || list.ownerName,
      legacyVersion: Number.isFinite(old.version) ? old.version : 0,
      updatedAt: now()
    };
    await store.setJSON(`lists/${list.id}`, next);
    await store.setJSON(`claims/${list.id}`, claims);
    await store.setJSON('legacy/imported', { userId: user.id, at: now() });
    await clearRate(`legacy/${user.id}`);
    return json(viewOf(next, claims, { isOwner: true, userId: user.id }));
  }

  // ---------- router
  async function handle(req) {
    try {
      const url = new URL(req.url);
      const path = url.pathname.replace(/^\/api\/?/, '').replace(/\/$/, '');
      const seg = path.split('/');
      const m = req.method;

      if (path === 'health' && m === 'GET') {
        // Proves the storage behind accounts is reachable (visit /api/health after a deploy).
        const stamp = now();
        await store.setJSON('health/ping', { stamp });
        const back = await getJSON('health/ping');
        return json({ ok: true, storage: back?.stamp === stamp });
      }
      if (path === 'auth/signup' && m === 'POST') return await signup(req);
      if (path === 'auth/login' && m === 'POST') return await login(req);
      if (path === 'auth/logout' && m === 'POST') return await logout(req);
      if (path === 'auth/forgot' && m === 'POST') return await forgot(req);
      if (path === 'auth/reset' && m === 'POST') return await reset(req);
      if (path === 'config' && m === 'GET') return await config();
      if (path === 'account/preferences' && m === 'POST') return await setPreferences(req);
      if (path === 'unsubscribe' && m === 'POST') return await unsubscribe(req);
      if (path === 'admin/stats' && m === 'GET') return await adminStats(req);
      if (path === 'admin/campaign' && m === 'POST') return await campaign(req);
      if (path === 'me' && m === 'GET') return await me(req);
      if (seg[0] === 'invite' && seg.length === 2 && m === 'GET') return await inviteInfo(seg[1]);
      if (path === 'join' && m === 'POST') return await join(req);
      if (path === 'leave' && m === 'POST') return await leave(req);
      if (path === 'preview' && m === 'POST') return await preview(req);
      if (path === 'catalog' && m === 'GET') return await catalogSearch(req);
      if (path === 'bloom' && m === 'POST') return await bloomChat(req);
      if (path === 'catalog/upgrade' && m === 'POST') return await upgradeIdea(req);
      if (path === 'santa' && m === 'GET') return await santaMine(req);
      if (path === 'santa' && m === 'POST') return await santaCreate(req);
      if (path === 'santa/join' && m === 'POST') return await santaJoin(req);
      if (seg[0] === 'santa' && seg.length >= 2) {
        if (seg.length === 2 && m === 'GET') return await santaShow(req, seg[1]);
        if (seg.length === 2 && m === 'DELETE') return await santaDelete(req, seg[1]);
        if (seg[2] === 'draw' && m === 'POST') return await santaDraw(req, seg[1]);
        if (seg[2] === 'leave' && m === 'POST') return await santaLeave(req, seg[1]);
      }
      if (path === 'legacy' && m === 'GET') return await legacyAvailable(req);
      if (path === 'import-legacy' && m === 'POST') return await importLegacy(req);
      if (seg[0] === 'lists' && seg.length >= 2) {
        const id = seg[1];
        if (seg.length === 2 && m === 'GET') return await getList(req, id);
        if (seg.length === 2 && m === 'PUT') return await putList(req, id);
        if (seg[2] === 'items' && m === 'POST') return await addListItem(req, id);
        if (seg[2] === 'claim' && m === 'POST') return await claim(req, id);
        if (seg[2] === 'unclaim' && m === 'POST') return await unclaim(req, id);
        if (seg[2] === 'reset-claims' && m === 'POST') return await resetClaims(req, id);
        if (seg[2] === 'invite' && seg[3] === 'rotate' && m === 'POST') return await rotateInvite(req, id);
      }
      throw new HttpError(404, 'Not found.');
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      console.error('api error', e);
      return json({ error: 'Something went wrong. Please try again.' }, 500);
    }
  }

  return { handle };
}
