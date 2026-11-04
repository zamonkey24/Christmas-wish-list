import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { createApi } from './netlify/lib/api.mjs'
import { createFileStore } from './tools/dev/file-store.mjs'

// `npm run dev` also runs the real accounts API locally (same code as the Netlify function),
// saving to .local-data/ so local accounts and wishlists survive restarts. Local data is separate from the live site.
function localApi() {
  return {
    name: 'giftbloom-local-api',
    apply: 'serve',
    configureServer(server) {
      const store = createFileStore(path.resolve('.local-data/giftbloom.json'))
      const legacyStore = createFileStore(path.resolve('.local-data/legacy.json'))
      const api = createApi({ store, legacyStore })
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()
        const chunks = []
        for await (const c of req) chunks.push(c)
        const url = new URL(req.url, `http://${req.headers.host}`)
        const request = new Request(url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks) })
        const r = await api.handle(request)
        const headers = {}
        r.headers.forEach((v, k) => { headers[k] = v })
        if (r.headers.getSetCookie) headers['set-cookie'] = r.headers.getSetCookie()
        res.writeHead(r.status, headers)
        res.end(Buffer.from(await r.arrayBuffer()))
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localApi()],
})
