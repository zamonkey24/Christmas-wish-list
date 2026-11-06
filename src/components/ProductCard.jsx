import React, { useState } from 'react';
import { ExternalLink, Plus, Check } from 'lucide-react';
import { addProductToWishlist } from '../utils/addToWishlist';

// One product with its photo, price, link and an "Add to my wishlist" button.
export default function ProductCard({ product, listId, compact = false }) {
  const [state, setState] = useState('idle'); // idle | adding | added | already | error
  const add = async () => {
    setState('adding');
    try { setState((await addProductToWishlist(listId, product)) ? 'added' : 'already'); } catch { setState('error'); }
  };
  const done = state === 'added' || state === 'already';
  const label = { idle: 'Add to my wishlist', adding: 'Adding…', added: 'Added', already: 'Already on your list', error: 'Try again' }[state];

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: compact ? 'row' : 'column', overflow: 'hidden', gap: compact ? '12px' : 0, padding: compact ? '10px' : 0 }}>
      <div style={{ position: 'relative', flexShrink: 0, width: compact ? '84px' : '100%', height: compact ? '84px' : '170px', background: '#fff', borderRadius: compact ? '10px' : 0, overflow: 'hidden' }}>
        <img src={product.image} alt={product.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
        {!compact && <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-color)', padding: '3px 10px', borderRadius: '6px', fontWeight: 800, fontSize: '0.9rem' }}>${product.price}</div>}
      </div>
      <div style={{ padding: compact ? 0 : '16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: 0 }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: '#a5b4fc', fontWeight: 700, textTransform: 'uppercase' }}>{product.category}{compact ? ` · $${product.price}` : ''}</div>
          <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: compact ? '0.88rem' : '0.98rem', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{product.title}</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', flexWrap: 'wrap' }}>
          <button onClick={add} disabled={state === 'adding' || done} className="festive-btn-primary" style={{ padding: compact ? '6px 10px' : '8px 12px', fontSize: '0.8rem', flex: 1, opacity: done ? 0.85 : 1 }}>
            {done ? <Check style={{ width: '14px', height: '14px' }} /> : <Plus style={{ width: '14px', height: '14px' }} />} {label}
          </button>
          <a href={product.url} target="_blank" rel="noopener noreferrer" className="festive-btn-secondary" style={{ padding: compact ? '6px 10px' : '8px 12px', fontSize: '0.8rem', textDecoration: 'none' }} title={`View on ${product.site || 'the store'}`}>
            <ExternalLink style={{ width: '14px', height: '14px' }} /> View
          </a>
        </div>
      </div>
    </div>
  );
}
