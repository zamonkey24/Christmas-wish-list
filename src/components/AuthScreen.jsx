import React, { useState } from 'react';
import { api } from '../api';
import { Field, Notice, inputStyle } from './ui';
import { useTheme } from '../ThemeContext';

export default function AuthScreen({ initialMode = 'signup', invite, onAuthed, onOpenAnonymously, onCancel }) {
  const theme = useTheme();
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const me = mode === 'signup'
        ? await api('POST', 'auth/signup', { name, login, password })
        : await api('POST', 'auth/login', { login, password });
      onAuthed(me);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: '460px', margin: '0 auto', padding: '48px 20px 60px' }}>
      <div className="glass-card" style={{ textAlign: 'center', padding: '22px 22px 20px', marginBottom: '18px' }}>
        <div style={{ display: 'inline-flex', width: '64px', height: '64px', borderRadius: '20px', background: 'var(--logo-bg)', border: '2px solid #fbbf24', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--logo-shadow)' }}>
          <theme.Logo size={38} />
        </div>
        <h1 style={{ fontSize: '2rem', margin: '14px 0 6px' }} className="gold-gradient-text">GiftBloom</h1>
        <p style={{ color: '#cbd5e1', fontSize: '0.98rem', lineHeight: 1.5, margin: 0 }}>
          Make your own wishlist, share it with one link, and let a quick quiz help friends and family pick the perfect gift.
        </p>
      </div>

      <div className="glass-card animate-fade-in" style={{ padding: '26px' }}>
        {invite && (
          <div style={{ marginBottom: '18px' }}>
            <Notice>🎁 <strong>{invite.ownerName}</strong> invited you to their wishlist. {mode === 'signup' ? 'Create an account' : 'Sign in'} and it will be saved for you.</Notice>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
          {[['signup', 'Create account'], ['login', 'Sign in']].map(([id, label]) => (
            <button key={id} type="button" onClick={() => { setMode(id); setError(''); }} className={mode === id ? 'festive-btn-primary' : 'festive-btn-secondary'} style={{ flex: 1, padding: '10px' }}>
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={submit}>
          {mode === 'signup' && (
            <Field label="Your name" hint="This is how your wishlist will be titled, like “Arav’s wishlist”.">
              <input required value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="given-name" style={inputStyle} placeholder="e.g. Arav" />
            </Field>
          )}
          <Field label="Email or username">
            <input required value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" autoCapitalize="none" style={inputStyle} placeholder="you@example.com" />
          </Field>
          <Field label="Password" hint={mode === 'signup' ? 'At least 6 characters. There is no password reset yet, so pick one you will remember.' : ''}>
            <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} style={inputStyle} placeholder="••••••" />
          </Field>
          {error && <div style={{ marginBottom: '12px' }}><Notice tone="error">{error}</Notice></div>}
          <button type="submit" disabled={busy} className="festive-btn-primary" style={{ width: '100%', padding: '13px' }}>
            {busy ? 'One moment…' : mode === 'signup' ? 'Create my account' : 'Sign in'}
          </button>
        </form>

        {invite && onOpenAnonymously && (
          <button type="button" onClick={onOpenAnonymously} className="festive-btn-secondary" style={{ width: '100%', marginTop: '12px' }}>
            Just look at {invite.ownerName}’s wishlist for now
          </button>
        )}
        {onCancel && (
          <button type="button" onClick={onCancel} style={{ marginTop: '12px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', width: '100%' }}>← Back</button>
        )}
      </div>
    </div>
  );
}
