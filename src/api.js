export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

// Talks to the Netlify function. `code` is an invite code, sent so people without an account can view a shared list.
export async function api(method, path, body, code) {
  let res;
  try {
    res = await fetch(`/api/${path}`, {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(code ? { 'x-invite-code': code } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new ApiError('Could not reach the server. Check your internet and try again.', 0);
  }
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) throw new ApiError(data?.error || 'Something went wrong. Please try again.', res.status);
  return data;
}

// Accepts a full invite link or just the code.
export function extractInviteCode(text) {
  const t = (text || '').trim();
  if (!t) return '';
  try {
    const u = new URL(t);
    return u.searchParams.get('invite') || '';
  } catch {
    return /^[a-z0-9]{6,40}$/i.test(t) ? t : '';
  }
}

export const inviteLink = (code) => `${window.location.origin}/?invite=${code}`;
