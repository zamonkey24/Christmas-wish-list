// The emails GiftBloom sends. Plain, readable, and every promotional one carries an unsubscribe link and address.
const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const wrap = (inner, footer = '') => `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;padding:28px" cellpadding="0" cellspacing="0"><tr><td>
<div style="font-size:22px;font-weight:800;color:#4f46e5;margin-bottom:14px">GiftBloom</div>
${inner}
</td></tr></table>
<div style="max-width:520px;color:#64748b;font-size:12px;line-height:1.5;margin-top:14px">${footer}</div>
</td></tr></table></body></html>`;

const button = (href, label) => `<p style="margin:22px 0"><a href="${esc(href)}" style="background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px;display:inline-block">${esc(label)}</a></p>`;

export function welcomeEmail({ name, siteUrl }) {
  return {
    subject: 'Welcome to GiftBloom 🎁',
    html: wrap(`<p style="font-size:16px">Hi ${esc(name)},</p>
<p>Your account is ready. Make a wishlist, paste in links to the things you want, and share one link so friends and family can take the quiz and pick the perfect gift.</p>${button(siteUrl, 'Open GiftBloom')}`, 'You are getting this because you created a GiftBloom account.'),
    text: `Hi ${name},\n\nYour GiftBloom account is ready. Make a wishlist, paste in links to the things you want, and share one link so friends and family can pick the perfect gift.\n\n${siteUrl}\n`
  };
}

export function resetEmail({ name, link }) {
  return {
    subject: 'Reset your GiftBloom password',
    html: wrap(`<p style="font-size:16px">Hi ${esc(name)},</p>
<p>Someone (hopefully you) asked to reset the password for this GiftBloom account. This link works for one hour:</p>${button(link, 'Choose a new password')}
<p style="color:#64748b;font-size:13px">If you did not ask for this, you can ignore this email. Your password has not changed.</p>`, 'This is a security email about your GiftBloom account.'),
    text: `Hi ${name},\n\nReset your GiftBloom password (link works for one hour):\n${link}\n\nIf you did not ask for this, ignore this email.\n`
  };
}

export function promoEmail({ name, subject, message, unsubscribeUrl, address, siteUrl }) {
  const body = esc(message).replace(/\n/g, '<br>');
  return {
    subject,
    html: wrap(`<p style="font-size:16px">Hi ${esc(name)},</p><div style="font-size:15px;line-height:1.55">${body}</div>${button(siteUrl, 'Open GiftBloom')}`,
      `You are getting this because you chose to receive GiftBloom updates.<br>${esc(address)}<br><a href="${esc(unsubscribeUrl)}" style="color:#64748b">Unsubscribe</a>`),
    text: `Hi ${name},\n\n${message}\n\n${siteUrl}\n\n--\nYou are getting this because you chose to receive GiftBloom updates.\n${address}\nUnsubscribe: ${unsubscribeUrl}\n`,
    headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }
  };
}
