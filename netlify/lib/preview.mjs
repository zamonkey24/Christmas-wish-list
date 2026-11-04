// Reads a product page and pulls out a name, photo and price, so a gift can be added from just a link.
import dns from 'node:dns/promises';
import net from 'node:net';

const MAX_BYTES = 3_000_000;
const TIMEOUT_MS = 9000;
const MAX_REDIRECTS = 4;
const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
export const decodeEntities = (s = '') =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const v = ip.toLowerCase();
  return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe8') || v.startsWith('fe9') || v.startsWith('fea') || v.startsWith('feb') || v.startsWith('::ffff:');
}

// Only public web pages: refuses localhost, private networks and odd ports.
export async function assertPublicUrl(raw, lookup = (h) => dns.lookup(h, { all: true })) {
  let u;
  try { u = new URL(raw); } catch { throw new Error('That does not look like a link.'); }
  if (!['http:', 'https:'].includes(u.protocol)) throw new Error('Only web links (http/https) are supported.');
  if (u.port && !['80', '443'].includes(u.port)) throw new Error('That link is not supported.');
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (!host || host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) throw new Error('That link is not supported.');
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new Error('That link is not supported.');
    return u;
  }
  let addrs;
  try { addrs = await lookup(host); } catch { throw new Error('Could not find that website.'); }
  if (!addrs.length || addrs.some(a => isPrivateIp(a.address))) throw new Error('That link is not supported.');
  return u;
}

// Amazon links come with huge tracking strings; keep just the product.
export function cleanProductUrl(raw) {
  let u;
  try { u = new URL(raw); } catch { return raw; }
  if (/(^|\.)amazon\.[a-z.]+$/i.test(u.hostname) || u.hostname === 'a.co' || u.hostname === 'amzn.to') {
    const m = u.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})/i);
    if (m) {
      const clean = new URL(`https://${u.hostname.replace(/^smile\./, 'www.')}/dp/${m[1].toUpperCase()}`);
      for (const k of ['th', 'psc']) if (u.searchParams.has(k)) clean.searchParams.set(k, u.searchParams.get(k));
      return clean.toString();
    }
  }
  return raw;
}

const metaContent = (html, key) => {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*>`, 'i');
  const tag = html.match(re)?.[0];
  if (!tag) return null;
  const c = tag.match(/content=["']([^"']*)["']/i);
  return c ? decodeEntities(c[1]).trim() : null;
};

function jsonLdProduct(html) {
  const out = [];
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(m[1]);
      const stack = Array.isArray(data) ? [...data] : [data];
      while (stack.length) {
        const n = stack.pop();
        if (!n || typeof n !== 'object') continue;
        if (Array.isArray(n['@graph'])) stack.push(...n['@graph']);
        const t = [].concat(n['@type'] || []);
        if (t.includes('Product')) out.push(n);
      }
    } catch { /* ignore bad JSON-LD */ }
  }
  return out[0] || null;
}

const toPrice = (v) => {
  if (v == null) return null;
  const n = Number(String(v).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
};

export function shortenTitle(t) {
  let s = decodeEntities(t || '').replace(/\s+/g, ' ').trim();
  s = s.replace(/^Amazon(\.com)?\s*:\s*/i, '');
  // Amazon appends " : Category"
  const lastColon = s.lastIndexOf(' : ');
  if (lastColon > 20) s = s.slice(0, lastColon);
  // Product pages stuff the title with marketing text after separators
  const bar = s.indexOf(' | ');
  if (bar > 15) s = s.slice(0, bar);
  if (s.length > 90) {
    const cut = Math.max(s.lastIndexOf(' - ', 90), s.lastIndexOf(', ', 90), s.lastIndexOf(' – ', 90));
    s = cut > 30 ? s.slice(0, cut) : s.slice(0, 88).replace(/\s+\S*$/, '') + '…';
  }
  return s.trim();
}

export function parseProductPage(html, finalUrl) {
  const host = (() => { try { return new URL(finalUrl).hostname; } catch { return ''; } })();
  const isAmazon = /amazon\./i.test(host);
  const ld = jsonLdProduct(html);

  let title = metaContent(html, 'og:title') || metaContent(html, 'twitter:title') || ld?.name || null;
  if (!title) title = decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').trim() || null;

  let image = null;
  if (isAmazon) {
    image = html.match(/"hiRes":"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)/)?.[1]
      || html.match(/data-old-hires="(https:\/\/[^"]+)"/)?.[1]
      || null;
  }
  if (!image) image = metaContent(html, 'og:image') || metaContent(html, 'twitter:image') || null;
  if (!image && ld?.image) image = [].concat(ld.image).map(i => (typeof i === 'string' ? i : i?.url)).find(Boolean) || null;
  if (image) { try { image = new URL(image, finalUrl).toString(); } catch { image = null; } }

  let price = null;
  if (isAmazon) {
    const pay = html.match(/apex-pricetopay-value[\s\S]{0,300}?a-offscreen">\s*\$?\s*([0-9][0-9,]*\.?[0-9]*)/);
    const any = html.match(/class="a-offscreen">\s*\$\s*([0-9][0-9,]*\.?[0-9]*)/);
    price = toPrice((pay || any)?.[1]);
  }
  if (price == null) price = toPrice(metaContent(html, 'product:price:amount') || metaContent(html, 'og:price:amount'));
  if (price == null && ld?.offers) {
    const o = [].concat(ld.offers)[0] || {};
    price = toPrice(o.price ?? o.lowPrice ?? o.priceSpecification?.price);
  }

  return {
    title: title ? shortenTitle(title) : null,
    image,
    price,
    site: metaContent(html, 'og:site_name') || host.replace(/^www\./, '') || null
  };
}

async function readLimited(res) {
  const reader = res.body?.getReader?.();
  if (!reader) return (await res.text()).slice(0, MAX_BYTES);
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    chunks.push(value);
    if (total > MAX_BYTES) { try { await reader.cancel(); } catch { /* ignore */ } break; }
  }
  return new TextDecoder('utf-8').decode(Buffer.concat(chunks.map(c => Buffer.from(c))));
}

export async function fetchProduct(rawUrl, { fetchImpl = fetch, lookup } = {}) {
  let current = cleanProductUrl(rawUrl.trim());
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const u = await assertPublicUrl(current, lookup);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    let res;
    try {
      res = await fetchImpl(u.toString(), {
        redirect: 'manual',
        signal: ctrl.signal,
        headers: { 'user-agent': BROWSER_UA, 'accept-language': 'en-US,en;q=0.9', accept: 'text/html,application/xhtml+xml' }
      });
    } catch {
      throw new Error('Could not open that link.');
    } finally {
      clearTimeout(timer);
    }
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const loc = res.headers.get('location');
      if (!loc) throw new Error('Could not open that link.');
      current = cleanProductUrl(new URL(loc, u).toString());
      continue;
    }
    if (!res.ok) throw new Error(`That site would not let us read the page (${res.status}).`);
    const html = await readLimited(res);
    const info = parseProductPage(html, u.toString());
    return { ...info, url: cleanProductUrl(u.toString()) };
  }
  throw new Error('That link redirects too many times.');
}
