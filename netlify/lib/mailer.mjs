// Sends email through Resend (https://resend.com) when RESEND_API_KEY and EMAIL_FROM are set in Netlify's
// environment variables. In local development an `outbox` function can stand in so nothing is really sent.
export function createMailer({ env = {}, fetchImpl = fetch, outbox = null } = {}) {
  const key = env.RESEND_API_KEY;
  const from = env.EMAIL_FROM; // e.g. GiftBloom <hello@yourdomain.com>
  const enabled = Boolean(outbox || (key && from));

  async function send({ to, subject, html, text, headers }) {
    if (outbox) {
      await outbox({ to, subject, html, text, headers, at: Date.now() });
      return { ok: true };
    }
    if (!(key && from)) return { ok: false, reason: 'Email is not set up on this site yet.' };
    try {
      const res = await fetchImpl('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
        body: JSON.stringify({ from, to: [to], subject, html, text, ...(headers ? { headers } : {}) })
      });
      if (!res.ok) return { ok: false, reason: `The email service said no (${res.status}).` };
      return { ok: true };
    } catch {
      return { ok: false, reason: 'Could not reach the email service.' };
    }
  }

  return { enabled, send };
}
