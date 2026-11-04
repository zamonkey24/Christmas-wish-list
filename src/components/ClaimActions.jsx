import React, { useState } from 'react';
import { Undo2 } from 'lucide-react';

// Unclaim controls inside the "who claimed this" pop-up: owner or the person who claimed it.
export default function ClaimActions({ canUnclaim, onUnclaim, onDone }) {
  const [confirming, setConfirming] = useState(false);
  if (!canUnclaim) {
    return (
      <p style={{ color: '#64748b', fontSize: '0.78rem', textAlign: 'center', margin: '4px 0 0' }}>
        🔒 Only the wishlist owner, or the person who claimed this while signed in, can unclaim it.
      </p>
    );
  }
  if (!confirming) {
    return (
      <div style={{ textAlign: 'center' }}>
        <button onClick={() => setConfirming(true)} style={{ padding: '10px 18px', borderRadius: '10px', background: 'rgba(225, 29, 72, 0.12)', border: '1px solid rgba(225, 29, 72, 0.4)', color: '#fb7185', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Undo2 style={{ width: '14px', height: '14px' }} /> Unclaim This Item
        </button>
      </div>
    );
  }
  return (
    <div style={{ background: 'rgba(225, 29, 72, 0.08)', border: '1px solid rgba(225, 29, 72, 0.25)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
      <div style={{ color: '#fecdd3', fontWeight: 700, fontSize: '0.9rem', marginBottom: '10px' }}>Make this gift available again?</div>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
        <button onClick={() => setConfirming(false)} className="festive-btn-secondary" style={{ padding: '8px 16px' }}>Cancel</button>
        <button onClick={async () => { await onUnclaim(); onDone?.(); }} style={{ padding: '8px 16px', borderRadius: '10px', background: '#e11d48', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Yes, unclaim</button>
      </div>
    </div>
  );
}
