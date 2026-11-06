import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { createApi } from './netlify/lib/api.mjs'
import { createMailer } from './netlify/lib/mailer.mjs'
import { makeClient } from './netlify/lib/bloom.mjs'
import { createFileStore } from './tools/dev/file-store.mjs'

const escapeHtml = (s = '') => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

// `npm run dev` also runs the real accounts API locally (same code as the Netlify function), saving to .local-data/
// so local accounts and wishlists survive restarts. Local data is separate from the live site.
// Emails are never really sent locally: they are saved to .local-data/outbox.json and shown at /__outbox.
// Every local account can use the "Send an update" tool (set ADMIN_EMAILS=you@example.com to limit it).
function localApi() {
  return {
    name: 'giftbloom-local-api',
    apply: 'serve',
    configureServer(server) {
      const store = createFileStore(path.resolve('.local-data/giftbloom.json'))
      const legacyStore = createFileStore(path.resolve('.local-data/legacy.json'))
      const outboxFile = path.resolve('.local-data/outbox.json')
      const readOutbox = () => { try { return JSON.parse(fs.readFileSync(outboxFile, 'utf8')) } catch { return [] } }
      const outbox = async (mail) => {
        fs.mkdirSync(path.dirname(outboxFile), { recursive: true })
        fs.writeFileSync(outboxFile, JSON.stringify([mail, ...readOutbox()].slice(0, 100)))
        console.log(`\n[local email] to ${mail.to}: ${mail.subject}`)
      }
      const env = { ADMIN_EMAILS: process.env.ADMIN_EMAILS || '*', MAIL_ADDRESS: process.env.MAIL_ADDRESS || '123 Example Street, Your City (local test)' }
      // Bloom AI uses its built-in matcher locally unless you start the server with ANTHROPIC_API_KEY=... npm run dev
      const api = createApi({ store, legacyStore, env: { ...env, BLOOM_MODEL: process.env.BLOOM_MODEL }, mailer: createMailer({ outbox }), bloomClient: makeClient(process.env) })

      server.middlewares.use('/__outbox', (req, res) => {
        const mails = readOutbox()
        const linkify = (t) => escapeHtml(t).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>')
        res.setHeader('content-type', 'text/html; charset=utf-8')
        res.end(`<!doctype html><meta charset="utf-8"><title>Local outbox</title><body style="font-family:system-ui;max-width:720px;margin:30px auto;padding:0 16px">
          <h1>Local outbox</h1><p>Emails the site would have sent. Nothing leaves your computer.</p>
          ${mails.length ? mails.map(m => `<div style="border:1px solid #ddd;border-radius:10px;padding:14px;margin:12px 0"><b>${escapeHtml(m.subject)}</b><br><small>to ${escapeHtml(m.to)} &middot; ${new Date(m.at).toLocaleString()}</small><pre style="white-space:pre-wrap;font:inherit;margin:10px 0 0">${linkify(m.text)}</pre></div>`).join('') : '<p>No emails yet.</p>'}`)
      })

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
