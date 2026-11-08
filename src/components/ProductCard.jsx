import React, { useState } from 'react';
import { ExternalLink, Plus, Check, Camera } from 'lucide-react';
import { addProductToWishlist } from '../utils/addToWishlist';
import { api } from '../api';
import { inputStyle } from './ui';

// One product with its photo, price, link and an "Add to my wishlist" button.
// Ideas without a photo can be matched to a real listing by pasting its link.
export default function ProductCard({ product, listId, compact = false, why = '', onUpgraded, onOpenList }) {
  const [state, setState] = useState('idle'); // idle | adding | added | already | error
  const [fixing, setFixing] = useState(false);
  const [link, setLink] = useState('');
  const [fixError, setFixError] = useState('');
  const [fixBusy, setFixBusy] = useState(false);

  const fromList = product.source === 'wishlist';
  const idea = product.estimated === true;
  const noPhoto = idea && !product.hasPhoto;
  const price = `${idea ? '~' : ''}$${product.price}`;
  const done = state === 'added' || state === 'already';
  const label = { idle: 'Add to my wishlist', adding: 'Adding…', added: 'Added', already: 'Already on your list', error: 'Try again' }[state];

  const add = async () => {
    setState('adding');
    try { setState((await addProductToWishlist(listId, product)) ? 'added' : 'already'); } catch { setState('error'); }
  };

  const useListing = async (e) => {
    e.preventDefault();
    setFixBusy(true); setFixError('');
    try {
      const upgraded = await api('POST', 'catalog/upgrade', { ideaId: product.id, url: link });
      setFixing(false);
      onUpgraded?.(upgraded);
    } catch (err) { setFixError(err.message); } finally { setFixBusy(false); }
  };

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: compact ? 'row' : 'column', overflow: 'hidden', gap: compact ? '12px' : 0, padding: compact ? '10px' : 0 }}>
      <div style={{ position: 'relative', flexShrink: 0, width: compact ? '84px' : '100%', height: compact ? '84px' : '170px', background: '#fff', borderRadius: compact ? '10px' : 0, overflow: 'hidden' }}>
        {product.image
          ? <img src={product.image} alt={product.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: noPhoto ? 'cover' : 'contain' }} onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', background: '#1e293b' }}>🎁</div>}
        {!compact && <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-color)', padding: '3px 10px', borderRadius: '6px', fontWeight: 800, fontSize: '0.9rem' }}>{price}</div>}
        {!compact && fromList && <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(16,185,129,0.92)', color: '#fff', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.7rem' }}>🎁 {product.ownerName}'s list</div>}
        {!compact && !fromList && idea && <div title="A gift idea: the price is an estimate and the link searches Amazon" style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(15,23,42,0.85)', color: '#fbbf24', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.7rem' }}>💡 Idea</div>}
        {!compact && noPhoto && <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(15,23,42,0.75)', color: '#cbd5e1', padding: '2px 7px', borderRadius: '6px', fontSize: '0.65rem' }}>no photo yet</div>}
      </div>
      <div style={{ padding: compact ? 0 : '16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: 0 }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: '#a5b4fc', fontWeight: 700, textTransform: 'uppercase' }}>{product.category}{compact ? ` · ${price}` : ''}{compact && idea ? ' · idea' : ''}</div>
          <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: compact ? '0.88rem' : '0.98rem', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{product.title}</div>
          {why && <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px', lineHeight: 1.35 }}>{why}</div>}
          {!compact && product.hasPhoto && product.photo && (
            <a href={product.photo.source} target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: '0.65rem', color: '#64748b', marginTop: '4px', textDecoration: 'none' }} title={`Photo: ${product.photo.credit} (${product.photo.license}) via Wikimedia Commons`}>
              📷 {product.photo.credit.length > 26 ? `${product.photo.credit.slice(0, 26)}…` : product.photo.credit} · {product.photo.license}
            </a>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', flexWrap: 'wrap' }}>
          {fromList ? (
            <button onClick={() => onOpenList?.(product.listId)} className="festive-btn-primary" style={{ padding: compact ? '6px 10px' : '8px 12px', fontSize: '0.8rem', flex: 1 }}>
              <Check style={{ width: '14px', height: '14px' }} /> Open list to claim
            </button>
          ) : (
            <button onClick={add} disabled={state === 'adding' || done} className="festive-btn-primary" style={{ padding: compact ? '6px 10px' : '8px 12px', fontSize: '0.8rem', flex: 1, opacity: done ? 0.85 : 1 }}>
              {done ? <Check style={{ width: '14px', height: '14px' }} /> : <Plus style={{ width: '14px', height: '14px' }} />} {label}
            </button>
          )}
          {product.url && (
            <a href={product.url} target="_blank" rel="noopener noreferrer" className="festive-btn-secondary" style={{ padding: compact ? '6px 10px' : '8px 12px', fontSize: '0.8rem', textDecoration: 'none' }} title={`View on ${product.site || 'the store'}`}>
              <ExternalLink style={{ width: '14px', height: '14px' }} /> {idea ? 'Find on Amazon' : 'View'}
            </a>
          )}
        </div>
        {noPhoto && !compact && !fromList && (
          fixing ? (
            <form onSubmit={useListing} style={{ display: 'grid', gap: '6px' }}>
              <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Paste the Amazon link for this exact product" aria-label="Real product link" style={{ ...inputStyle, padding: '8px 10px', fontSize: '0.78rem' }} />
              <div style={{ display: 'flex', gap: '6px' }}>
                <button type="submit" disabled={fixBusy || !link.trim()} className="festive-btn-primary" style={{ padding: '6px 10px', fontSize: '0.75rem', flex: 1 }}>{fixBusy ? 'Checking…' : 'Use this listing'}</button>
                <button type="button" onClick={() => { setFixing(false); setFixError(''); }} className="festive-btn-secondary" style={{ padding: '6px 10px', fontSize: '0.75rem' }}>Cancel</button>
              </div>
              {fixError && <div style={{ color: '#fda4af', fontSize: '0.72rem' }}>{fixError}</div>}
            </form>
          ) : (
            <button onClick={() => setFixing(true)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.72rem', textAlign: 'left', padding: 0, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <Camera style={{ width: '12px', height: '12px' }} /> Add the real photo (paste the listing link)
            </button>
          )
        )}
      </div>
    </div>
  );
}
