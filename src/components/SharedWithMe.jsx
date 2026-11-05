import React, { useState } from 'react';
import { Users, Trash2 } from 'lucide-react';
import { api, extractInviteCode } from '../api';
import { THEMES } from '../ThemeContext';
import { Notice, inputStyle } from './ui';

export default function SharedWithMe({ joined, onOpen, onChanged }) {
  const [link, setLink] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const join = async (e) => {
    e.preventDefault();
    const code = extractInviteCode(link);
    if (!code) { setError('Paste the invite link someone sent you.'); return; }
    setBusy(true); setError('');
    try {
      const r = await api('POST', 'join', { code });
      setLink('');
      await onChanged();
      if (r.listId && !r.own) onOpen({ listId: r.listId });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const leave = async (l) => {
    if (!window.confirm(`Remove ${l.ownerName}'s wishlist from your account? You can add it again with their invite link.`)) return;
    try { await api('POST', 'leave', { listId: l.listId }); await onChanged(); } catch (err) { setError(err.message); }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 20px 60px' }}>
      <div className="glass-card" style={{ padding: '24px', marginBottom: '22px' }}>
        <h2 style={{ fontSize: '1.6rem', margin: '0 0 6px' }} className="gold-gradient-text">Wishlists shared with me 👥</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.92rem', margin: 0 }}>
          Every wishlist you’ve been invited to is saved here, so you never need the link again.
        </p>
      </div>

      {joined.length === 0 ? (
        <div className="glass-card" style={{ padding: '40px 24px', textAlign: 'center', color: '#94a3b8', marginBottom: '22px' }}>
          <Users style={{ width: '42px', height: '42px', color: '#64748b', margin: '0 auto 10px' }} />
          <div style={{ color: '#e2e8f0', fontWeight: 700, marginBottom: '4px' }}>Nothing here yet</div>
          Open an invite link from a friend, or paste it below, and their wishlist will show up here.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px', marginBottom: '22px' }}>
          {joined.map(l => {
            const t = THEMES[l.theme] || THEMES.classic;
            return (
              <div key={l.listId} className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: 'var(--logo-bg)', border: '2px solid #fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><t.Logo size={28} /></div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.ownerName}’s wishlist</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>{t.name} edition</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => onOpen({ listId: l.listId })} className="festive-btn-primary" style={{ flex: 1, padding: '9px' }}>Open wishlist</button>
                  <button onClick={() => leave(l)} className="festive-btn-secondary" style={{ padding: '9px 12px', color: '#f43f5e' }} title="Remove from my account"><Trash2 style={{ width: '16px', height: '16px' }} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <form onSubmit={join} className="glass-card" style={{ padding: '20px' }}>
        <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: '8px' }}>Got an invite link?</div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Paste the invite link here" style={{ ...inputStyle, flex: '1 1 260px' }} />
          <button type="submit" disabled={busy} className="festive-btn-primary" style={{ padding: '11px 20px' }}>{busy ? 'Adding…' : 'Add wishlist'}</button>
        </div>
        {error && <div style={{ marginTop: '12px' }}><Notice tone="error">{error}</Notice></div>}
      </form>
    </div>
  );
}
