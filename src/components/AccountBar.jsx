import React from 'react';
import { useTheme } from '../ThemeContext';

// Top bar on every screen: signed out = Log In / Sign Up on the right; signed in = tabs + account.
export default function AccountBar({ user, tab, sharedCount, authMode, onTab, onSignOut, onLogIn, onSignUp }) {
  const theme = useTheme();
  const tabBtn = (id, long, short) => (
    <button
      key={id}
      onClick={() => onTab(id)}
      style={{
        background: tab === id ? 'rgba(165, 180, 252, 0.16)' : 'transparent',
        border: tab === id ? '1px solid rgba(165, 180, 252, 0.55)' : '1px solid transparent',
        color: tab === id ? '#fbbf24' : '#e2e8f0',
        padding: '6px 14px', borderRadius: '9999px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap'
      }}
    >
      <span className="lbl-long">{long}</span>
      <span className="lbl-short">{short}</span>
    </button>
  );

  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 60, height: 'var(--accountbar-h)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'nowrap', padding: '0 16px', background: 'var(--header-bg)', borderBottom: '1px solid var(--header-border)', backdropFilter: 'blur(12px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
        <button onClick={() => onTab('home')} aria-label="GiftBloom home" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <span style={{ display: 'inline-flex' }}><theme.Logo size={24} /></span>
          <strong className="gold-gradient-text accountbar-brand" style={{ fontSize: '1.02rem' }}>GiftBloom</strong>
        </button>
        {user && (
          <nav className="accountbar-tabs" style={{ display: 'flex', gap: '4px', marginLeft: '10px' }}>
            {tabBtn('home', '🏠 Home', '🏠')}
            {tabBtn('mine', '🎁 My Wishlist', '🎁 Mine')}
            {tabBtn('shared', `👥 Shared with me${sharedCount ? ` (${sharedCount})` : ''}`, `👥${sharedCount ? ` ${sharedCount}` : ''}`)}
          </nav>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {user ? (
          <>
            <button onClick={() => onTab('account')} className="festive-btn-secondary" style={{ padding: '5px 12px', fontSize: '0.8rem', background: tab === 'account' ? 'rgba(165, 180, 252, 0.16)' : undefined }}>
              <span className="accountbar-name" style={{ maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</span>
              <span className="lbl-short">⚙️</span><span className="lbl-long">⚙️</span>
            </button>
            <button onClick={onSignOut} className="festive-btn-secondary" style={{ padding: '5px 12px', fontSize: '0.78rem' }}>Sign out</button>
          </>
        ) : (
          <>
            <button onClick={onLogIn} className={authMode === 'login' ? 'festive-btn-primary' : 'festive-btn-secondary'} style={{ padding: '7px 16px', fontSize: '0.85rem' }}>Log In</button>
            <button onClick={onSignUp} className={authMode === 'login' ? 'festive-btn-secondary' : 'festive-btn-primary'} style={{ padding: '7px 16px', fontSize: '0.85rem' }}>Sign Up</button>
          </>
        )}
      </div>
    </div>
  );
}
