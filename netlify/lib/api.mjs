// Accounts, wishlists, invite links and claims. Storage is injected so this runs on Netlify Blobs in
// production and on an in-memory store in tests.
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { fetchProduct } from './preview.mjs';
import { createMailer } from './mailer.mjs';
import { welcomeEmail, resetEmail, promoEmail } from './emails.mjs';
import { starterCatalog, ideaCatalog, searchProducts, makeProduct, productIdOf } from './catalog.mjs';
import { createBloom } from './bloom.mjs';

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
  async function allProducts() {
    const community = (await getJSON('catalog/community'))?.items || [];
    const starters = starterCatalog();
    const seen = new Set(starters.map(p => p.id));
    return [...starters, ...community.filter(p => !seen.has(p.id)), ...ideaCatalog()];
  }
  const bloom = createBloom({ getCatalog: allProducts, client: bloomClient, model: env.BLOOM_MODEL || undefined });

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
      page: num('page', 1),
      limit: num('limit', 24)
    }));
  }

  async function addListItem(req, listId) {
    const { list } = await accessList(req, listId, { ownerOnly: true });
    const b = await readBody(req);
    const item = cleanItem({ ...b.item, id: b.item?.id || `g_${now()}` });
    if (!item) throw new HttpError(400, 'That gift is missing a name or price.');
    const key = (u) => (u ? productIdOf(u) : null);
    const dupe = list.items.find(i => i.id === item.id || (item.url && key(i.url) === key(item.url)));
    if (dupe) return json({ added: false, count: list.items.length });
    if (list.items.length >= MAX_ITEMS) throw new HttpError(400, 'Your wishlist is full.');
    const fresh = await getJSON(`lists/${listId}`);
    fresh.items = [item, ...fresh.items];
    fresh.updatedAt = Math.max(now(), (fresh.updatedAt || 0) + 1);
    await store.setJSON(`lists/${listId}`, fresh);
    return json({ added: true, count: fresh.items.length, updatedAt: fresh.updatedAt });
  }

  async function bloomChat(req) {
    const user = await requireUser(req);
    const b = await readBody(req);
    const messages = (Array.isArray(b.messages) ? b.messages : [])
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .map(m => ({ role: m.role, content: m.content.trim().slice(0, 800) }))
      .slice(-12);
    if (!messages.length || messages[messages.length - 1].role !== 'user') throw new HttpError(400, 'Tell Bloom what you are looking for.');
    await hit(`bloom/${user.id}`, BLOOM_PER_DAY, 24 * 3600000);
    return json(await bloom.answer(messages));
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
