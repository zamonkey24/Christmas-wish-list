import React, { useEffect, useState } from 'react';
import { Mail, Send } from 'lucide-react';
import { api } from '../api';
import { Field, Notice, inputStyle } from './ui';

export default function AccountPage({ me, onChanged, onSignOut }) {
  const [name, setName] = useState(me.user.name);
  const [marketing, setMarketing] = useState(Boolean(me.marketingOptIn));
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      await api('POST', 'account/preferences', { name, marketingOptIn: marketing });
      await onChanged();
      setMsg({ ok: true, text: 'Saved.' });
    } catch (err) { setMsg({ ok: false, text: err.message }); } finally { setBusy(false); }
  };

  return (
    <main style={{ flex: 1, position: 'relative', zIndex: 10 }}>
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '36px 20px 60px', display: 'grid', gap: '20px' }}>
        <form onSubmit={save} className="glass-card" style={{ padding: '26px' }}>
          <h1 style={{ fontSize: '1.5rem', margin: '0 0 18px' }} className="gold-gradient-text">Your account</h1>
          <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required style={inputStyle} /></Field>
          <Field label="Email"><input value={me.user.login} readOnly style={{ ...inputStyle, opacity: 0.7 }} /></Field>
          <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', margin: '4px 0 18px', color: '#cbd5e1', fontSize: '0.9rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} style={{ marginTop: '3px', width: '16px', height: '16px' }} />
            <span>Email me gift ideas and GiftBloom updates <span style={{ color: '#94a3b8' }}>(you can turn this off any time, or use the unsubscribe link in any email)</span></span>
          </label>
          {msg && <div style={{ marginBottom: '12px' }}><Notice tone={msg.ok ? 'info' : 'error'}>{msg.text}</Notice></div>}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button type="submit" disabled={busy} className="festive-btn-primary" style={{ padding: '11px 22px' }}>{busy ? 'Saving…' : 'Save'}</button>
            <button type="button" onClick={onSignOut} className="festive-btn-secondary" style={{ padding: '11px 22px' }}>Sign out</button>
          </div>
        </form>
        {me.isAdmin && <Announcements />}
      </div>
    </main>
  );
}

// Owner only: send an update to the people who chose to receive them.
function Announcements() {
  const [stats, setStats] = useState(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => { api('GET', 'admin/stats').then(setStats).catch(() => {}); }, []);

  const send = async (testOnly) => {
    setBusy(true); setResult(null); setConfirming(false);
    try {
      const r = await api('POST', 'admin/campaign', { subject, message, testOnly });
      setResult({ ok: true, text: testOnly ? 'Test email sent to you.' : `Sent to ${r.sent} ${r.sent === 1 ? 'person' : 'people'}${r.failed ? `, ${r.failed} failed` : ''}.` });
    } catch (err) { setResult({ ok: false, text: err.message }); } finally { setBusy(false); }
  };

  return (
    <section className="glass-card" style={{ padding: '26px' }}>
      <h2 style={{ fontSize: '1.2rem', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}><Mail style={{ width: '20px', height: '20px' }} /> Send an update</h2>
      <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: '0 0 14px' }}>
        {stats ? `${stats.subscribers} ${stats.subscribers === 1 ? 'person has' : 'people have'} chosen to get updates.` : 'Loading…'} Only they get it, and every email has an unsubscribe link.
      </p>
      {stats && !stats.emailEnabled && <div style={{ marginBottom: '12px' }}><Notice tone="error">Email is not set up on this site yet (see the setup notes), so nothing can be sent.</Notice></div>}
      {stats && stats.emailEnabled && !stats.addressSet && <div style={{ marginBottom: '12px' }}><Notice tone="error">Add a MAIL_ADDRESS setting first. Promotional email must show a mailing address.</Notice></div>}
      <Field label="Subject"><input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} style={inputStyle} placeholder="e.g. New: add gifts from a link" /></Field>
      <Field label="Message"><textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} maxLength={5000} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Write your update…" /></Field>
      {result && <div style={{ marginBottom: '12px' }}><Notice tone={result.ok ? 'info' : 'error'}>{result.text}</Notice></div>}
      {!confirming ? (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => send(true)} disabled={busy || !subject || !message} className="festive-btn-secondary" style={{ padding: '10px 18px' }}>Send a test to me</button>
          <button onClick={() => setConfirming(true)} disabled={busy || !subject || !message || !stats?.subscribers} className="festive-btn-primary" style={{ padding: '10px 18px' }}><Send style={{ width: '15px', height: '15px' }} /> Send to everyone who opted in</button>
        </div>
      ) : (
        <div style={{ background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.4)', borderRadius: '12px', padding: '14px' }}>
          <div style={{ fontWeight: 700, marginBottom: '10px' }}>Send “{subject}” to {stats?.subscribers} {stats?.subscribers === 1 ? 'person' : 'people'}? This can’t be undone.</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setConfirming(false)} className="festive-btn-secondary" style={{ padding: '8px 16px' }}>Cancel</button>
            <button onClick={() => send(false)} disabled={busy} className="festive-btn-primary" style={{ padding: '8px 16px' }}>{busy ? 'Sending…' : 'Yes, send it'}</button>
          </div>
        </div>
      )}
    </section>
  );
}
