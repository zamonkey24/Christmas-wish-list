import React, { useState } from 'react';
import { Copy, Check, Share2, RefreshCw } from 'lucide-react';
import { inviteLink } from '../api';
import { inputStyle } from './ui';

export default function InvitePanel({ inviteCode, ownerName, onRotate }) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!inviteCode) return null;
  const link = inviteLink(inviteCode);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const el = document.getElementById('invite-link-input');
      el?.select();
      document.execCommand?.('copy');
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: `${ownerName}'s wishlist`, text: `Here's my wishlist! Take the quiz to find a gift:`, url: link }); return; } catch { /* cancelled */ }
    }
    copy();
  };

  const rotate = async () => {
    if (!window.confirm('Make a new invite link? The old link will stop working for new people. Anyone who already saved your wishlist keeps access.')) return;
    setBusy(true);
    try { await onRotate(); } finally { setBusy(false); }
  };

  return (
    <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
      <div style={{ fontSize: '0.9rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '4px' }}>Invite people to your wishlist</div>
      <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: '0 0 10px' }}>
        Send this link. When they open it, your wishlist is saved under “Shared with me” on their account, so they never need the link again.
      </p>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <input id="invite-link-input" readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Invite link" style={{ ...inputStyle, flex: '1 1 260px', fontSize: '0.85rem' }} />
        <button onClick={copy} className="festive-btn-primary" style={{ padding: '10px 16px' }}>
          {copied ? <><Check style={{ width: '16px', height: '16px' }} /> Copied!</> : <><Copy style={{ width: '16px', height: '16px' }} /> Copy link</>}
        </button>
        {typeof navigator !== 'undefined' && navigator.share && (
          <button onClick={share} className="festive-btn-secondary" style={{ padding: '10px 16px' }}><Share2 style={{ width: '16px', height: '16px' }} /> Share</button>
        )}
      </div>
      <button onClick={rotate} disabled={busy} style={{ marginTop: '10px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: 0 }}>
        <RefreshCw style={{ width: '13px', height: '13px' }} /> Make a new link
      </button>
    </div>
  );
}
