// In-memory stand-in for a Netlify Blobs store (same methods the API uses).
export function createMemoryStore() {
  const data = new Map(); // key -> { value, etag }
  let n = 0;
  return {
    data,
    async get(key) { const e = data.get(key); return e ? structuredClone(e.value) : null; },
    async getWithMetadata(key) { const e = data.get(key); return e ? { data: structuredClone(e.value), etag: e.etag, metadata: {} } : null; },
    async setJSON(key, value, opts = {}) {
      const cur = data.get(key);
      if (opts.onlyIfNew && cur) return { modified: false };
      if (opts.onlyIfMatch && (!cur || cur.etag !== opts.onlyIfMatch)) return { modified: false };
      const etag = `e${++n}`;
      data.set(key, { value: structuredClone(value), etag });
      return { modified: true, etag };
    },
    async delete(key) { data.delete(key); },
    async list({ prefix = '' } = {}) { return { blobs: [...data.keys()].filter(k => k.startsWith(prefix)).map(key => ({ key })) }; }
  };
}
