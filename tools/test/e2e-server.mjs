// Local stand-in for Netlify: serves dist/ and runs the real API code against in-memory storage.
// Usage: node tools/test/e2e-server.mjs [port]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApi } from '../../netlify/lib/api.mjs';
import { parseProductPage } from '../../netlify/lib/preview.mjs';
import { createMemoryStore } from './memory-store.mjs';
import { DEFAULT_WISHLIST } from '../../src/data/initialWishlist.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../dist');
const port = Number(process.argv[2] || 4300);
const store = createMemoryStore();
const legacyStore = createMemoryStore();
// the original single wishlist as it is on the live site today: 20 starter items at version 11, one gift claimed
const old = DEFAULT_WISHLIST.slice(0, 20).map(i => ({ ...i, claimed: false, claimedBy: '', claimedNote: '' }));
old[0] = { ...old[0], claimed: true, claimedBy: 'Grandma', claimedNote: 'Happy birthday!' };
await legacyStore.setJSON('wishlist-state', { items: old, ownerName: 'Arav', version: 11, theme: 'birthday', trash: [] });

const fixture = process.env.FIXTURE || '/tmp/B0DBRGYTDB.html';
const fetchProductImpl = async (url) => {
  if (url.includes('shop.test/armani')) return { ...parseProductPage(fs.readFileSync(fixture, 'utf8'), 'https://www.amazon.com/dp/B0DBRGYTDB'), url: 'https://www.amazon.com/dp/B0DBRGYTDB?th=1' };
  if (url.includes('shop.test/nophoto')) return { title: 'Mystery Candle Set', image: null, price: null, site: 'shop.test', url };
  throw new Error('That site would not let us read the page (503).');
};
const api = createApi({ store, legacyStore, fetchProductImpl });

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.png': 'image/png' };
http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  if (url.pathname.startsWith('/api/')) {
    const chunks = []; for await (const c of req) chunks.push(c);
    const request = new Request(url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks) });
    const r = await api.handle(request);
    const headers = {}; r.headers.forEach((v, k) => { headers[k] = v; });
    if (r.headers.getSetCookie) headers['set-cookie'] = r.headers.getSetCookie();
    res.writeHead(r.status, headers); return res.end(Buffer.from(await r.arrayBuffer()));
  }
  let f = path.join(root, decodeURIComponent(url.pathname));
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(root, 'index.html');
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
}).listen(port, () => console.log(`e2e server on http://localhost:${port}`));
