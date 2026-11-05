import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Field, Notice, inputStyle } from './ui';

const MIN_PASSWORD = 4;

// The separate page for Log In, Sign Up, Forgot password and Choose a new password.
export default function AuthScreen({ mode, invite, resetToken, onAuthed, onNavigate, onBack, onOpenAnonymously }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [marketing, setMarketing] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState(null);
  const [emailEnabled, setEmailEnabled] = useState(true);

  useEffect(() => {
    setError(''); setSentTo(null);
    if (mode === 'forgot') api('GET', 'config').then(c => setEmailEnabled(Boolean(c.emailEnabled))).catch(() => {});
  }, [mode]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'signup') onAuthed(await api('POST', 'auth/signup', { name, email, password, marketingOptIn: marketing }), 'signup');
      else if (mode === 'login') onAuthed(await api('POST', 'auth/login', { email, password }), 'login');
      else if (mode === 'reset') onAuthed(await api('POST', 'auth/reset', { token: resetToken, password }), 'login');
      else if (mode === 'forgot') {
        const r = await api('POST', 'auth/forgot', { email });
        setEmailEnabled(Boolean(r.emailEnabled));
        setSentTo(email);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const titles = { signup: 'Create your account', login: 'Welcome back', forgot: 'Forgot your password?', reset: 'Choose a new password' };
  const subtitles = {
    signup: 'Free, and it takes about a minute.',
    login: 'Log in to your wishlists.',
    forgot: 'Enter your email and we will send you a link to choose a new one.',
    reset: 'Pick something you will remember.'
  };
  const pwHint = `At least ${MIN_PASSWORD} characters. A ${MIN_PASSWORD}-digit PIN works.`;
  const link = (label, to) => (
    <button type="button" onClick={() => onNavigate(to)} style={{ background: 'none', border: 'none', color: '#a5b4fc', cursor: 'pointer', fontWeight: 700, padding: 0, textDecoration: 'underline' }}>{label}</button>
  );

  return (
    <main style={{ flex: 1, position: 'relative', zIndex: 10 }}>
      <div style={{ maxWidth: '440px', margin: '0 auto', padding: '40px 20px 60px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', marginBottom: '14px', fontSize: '0.9rem' }}>← Back to home</button>

        <div className="glass-card animate-fade-in" style={{ padding: '28px' }}>
          <h1 style={{ fontSize: '1.6rem', margin: '0 0 4px' }} className="gold-gradient-text">{titles[mode]}</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.92rem', margin: '0 0 20px' }}>{subtitles[mode]}</p>

          {invite && mode !== 'forgot' && mode !== 'reset' && (
            <div style={{ marginBottom: '16px' }}>
              <Notice>🎁 <strong>{invite.ownerName}</strong> invited you to their wishlist. {mode === 'signup' ? 'Sign up' : 'Log in'} and it will be saved for you.</Notice>
            </div>
          )}

          {mode === 'forgot' && !emailEnabled && (
            <div style={{ marginBottom: '16px' }}>
              <Notice tone="error">Email is not set up on this site yet, so reset links cannot be sent. Ask the site owner to reset it.</Notice>
            </div>
          )}

          {sentTo ? (
            <div>
              <Notice>📬 If <strong>{sentTo}</strong> has a GiftBloom account, a reset link is on its way. It works for one hour. Check your spam folder too.</Notice>
              {import.meta.env.DEV && <p style={{ marginTop: '12px', fontSize: '0.85rem' }}><a href="/__outbox" target="_blank" rel="noopener noreferrer" style={{ color: '#a5b4fc' }}>Local testing: open the dev outbox</a></p>}
              <p style={{ marginTop: '16px', textAlign: 'center', fontSize: '0.9rem' }}>{link('Back to log in', 'login')}</p>
            </div>
          ) : (
            <form onSubmit={submit}>
              {mode === 'signup' && (
                <Field label="Your name" hint="Your wishlist will be titled with it, like “Arav’s wishlist”.">
                  <input required value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="given-name" style={inputStyle} placeholder="e.g. Arav" />
                </Field>
              )}
              {mode !== 'reset' && (
                <Field label="Email">
                  <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoCapitalize="none" style={inputStyle} placeholder="you@example.com" />
                </Field>
              )}
              {mode !== 'forgot' && (
                <Field label={mode === 'reset' ? 'New password' : 'Password'} hint={mode === 'login' ? '' : pwHint}>
                  <div style={{ position: 'relative' }}>
                    <input required type={showPw ? 'text' : 'password'} minLength={mode === 'login' ? undefined : MIN_PASSWORD} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} style={{ ...inputStyle, paddingRight: '64px' }} placeholder="••••" />
                    <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.78rem' }}>{showPw ? 'Hide' : 'Show'}</button>
                  </div>
                </Field>
              )}

              {mode === 'login' && (
                <div style={{ textAlign: 'right', margin: '-6px 0 14px', fontSize: '0.85rem' }}>{link('Forgot password?', 'forgot')}</div>
              )}

              {mode === 'signup' && (
                <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', margin: '4px 0 16px', color: '#cbd5e1', fontSize: '0.85rem', lineHeight: 1.4, cursor: 'pointer' }}>
                  <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} style={{ marginTop: '3px', width: '16px', height: '16px' }} />
                  <span>Email me gift ideas and GiftBloom updates. <span style={{ color: '#94a3b8' }}>Optional. You can unsubscribe any time.</span></span>
                </label>
              )}

              {error && <div style={{ marginBottom: '12px' }}><Notice tone="error">{error}</Notice></div>}

              <button type="submit" disabled={busy || (mode === 'forgot' && !emailEnabled)} className="festive-btn-primary" style={{ width: '100%', padding: '13px' }}>
                {busy ? 'One moment…' : { signup: 'Create my account', login: 'Log In', forgot: 'Send reset link', reset: 'Save new password' }[mode]}
              </button>
            </form>
          )}

          {!sentTo && (
            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem', margin: '18px 0 0' }}>
              {mode === 'signup' && <>Already have an account? {link('Log In', 'login')}</>}
              {mode === 'login' && <>New here? {link('Sign Up', 'signup')}</>}
              {(mode === 'forgot' || mode === 'reset') && <>Remembered it? {link('Log In', 'login')}</>}
            </p>
          )}

          {mode === 'signup' && (
            <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.75rem', margin: '14px 0 0', lineHeight: 1.4 }}>
              We use your email for your account and password resets. We only send updates if you tick the box above.
            </p>
          )}

          {invite && onOpenAnonymously && (mode === 'signup' || mode === 'login') && (
            <button type="button" onClick={onOpenAnonymously} className="festive-btn-secondary" style={{ width: '100%', marginTop: '14px' }}>
              Just look at {invite.ownerName}’s wishlist for now
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
