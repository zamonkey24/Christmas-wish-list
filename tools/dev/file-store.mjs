// Local stand-in for Netlify Blobs that keeps its data in a JSON file, so accounts and wishlists survive restarts.
import fs from 'node:fs';
import path from 'node:path';

export function createFileStore(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let data = {};
  try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* first run */ }
  let n = Date.now();
  const save = () => fs.writeFileSync(file, JSON.stringify(data));
  const clone = (v) => JSON.parse(JSON.stringify(v));
  return {
    async get(key) { return data[key] ? clone(data[key].value) : null; },
    async getWithMetadata(key) { return data[key] ? { data: clone(data[key].value), etag: data[key].etag, metadata: {} } : null; },
    async setJSON(key, value, opts = {}) {
      const cur = data[key];
      if (opts.onlyIfNew && cur) return { modified: false };
      if (opts.onlyIfMatch && (!cur || cur.etag !== opts.onlyIfMatch)) return { modified: false };
      const etag = `e${++n}`;
      data[key] = { value: clone(value), etag };
      save();
      return { modified: true, etag };
    },
    async delete(key) { delete data[key]; save(); },
    async list({ prefix = '' } = {}) { return { blobs: Object.keys(data).filter(k => k.startsWith(prefix)).map(key => ({ key })) }; }
  };
}
