import React from 'react';
import { useTheme } from '../ThemeContext';

export default function AccountBar({ user, tab, sharedCount, onTab, onSignOut, onSignIn }) {
  const theme = useTheme();
  const tabBtn = (id, label) => (
    <button
      key={id}
      onClick={() => onTab(id)}
      style={{
        background: tab === id ? 'rgba(251, 191, 36, 0.18)' : 'transparent',
        border: tab === id ? '1px solid rgba(251, 191, 36, 0.6)' : '1px solid transparent',
        color: tab === id ? '#fbbf24' : '#e2e8f0',
        padding: '6px 14px', borderRadius: '9999px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem'
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 60, height: 'var(--accountbar-h)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'nowrap', padding: '0 16px', background: 'var(--header-bg)', borderBottom: '1px solid var(--header-border)', backdropFilter: 'blur(12px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
        <span style={{ display: 'inline-flex' }}><theme.Logo size={22} /></span>
        <strong className="gold-gradient-text accountbar-brand" style={{ fontSize: '1rem' }}>GiftBloom</strong>
        {user && (
          <nav className="accountbar-tabs" style={{ display: 'flex', gap: '4px', marginLeft: '10px' }}>
            {tabBtn('mine', <><span className="lbl-long">🎁 My Wishlist</span><span className="lbl-short">🎁 Mine</span></>)}
            {tabBtn('shared', <><span className="lbl-long">{`👥 Shared with me${sharedCount ? ` (${sharedCount})` : ''}`}</span><span className="lbl-short">{`👥 Shared${sharedCount ? ` (${sharedCount})` : ''}`}</span></>)}
          </nav>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        {user ? (
          <>
            <span className="accountbar-name" style={{ color: '#cbd5e1', fontSize: '0.82rem', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</span>
            <button onClick={onSignOut} className="festive-btn-secondary" style={{ padding: '5px 12px', fontSize: '0.78rem' }}>Sign out</button>
          </>
        ) : (
          <button onClick={onSignIn} className="festive-btn-primary" style={{ padding: '6px 14px', fontSize: '0.82rem' }}>Sign in to save this wishlist</button>
        )}
      </div>
    </div>
  );
}
