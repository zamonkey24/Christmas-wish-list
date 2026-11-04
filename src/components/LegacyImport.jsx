import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Notice, inputStyle } from './ui';

// Shown only while the original (pre-accounts) wishlist is still waiting to be claimed.
export default function LegacyImport({ onImported, compact = false }) {
  const [available, setAvailable] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    api('GET', 'legacy').then(r => { if (live) setAvailable(Boolean(r.available)); }).catch(() => {});
    return () => { live = false; };
  }, []);

  if (!available) return null;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const view = await api('POST', 'import-legacy', { setupCode: code });
      setAvailable(false);
      onImported(view);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="glass-card" style={{ padding: '18px', marginTop: compact ? 0 : '18px', marginBottom: compact ? '24px' : 0, border: '1px solid rgba(16, 185, 129, 0.4)', textAlign: 'left' }}>
      <div style={{ fontWeight: 800, color: '#6ee7b7', marginBottom: '4px' }}>📦 The original wishlist is waiting for you</div>
      <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 10px' }}>
        The wishlist that existed before accounts (all its gifts, photos and who claimed what) can be moved into this account once. It replaces the gifts in this list.
      </p>
      {!showForm ? (
        <button className="festive-btn-primary" style={{ padding: '9px 18px' }} onClick={() => setShowForm(true)}>Import it</button>
      ) : (
        <form onSubmit={submit} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input type="password" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="Original owner password" aria-label="Original owner password" style={{ ...inputStyle, flex: '1 1 200px' }} />
          <button type="submit" disabled={busy} className="festive-btn-primary" style={{ padding: '10px 18px' }}>{busy ? 'Importing…' : 'Import'}</button>
        </form>
      )}
      {error && <div style={{ marginTop: '10px' }}><Notice tone="error">{error}</Notice></div>}
    </div>
  );
}
