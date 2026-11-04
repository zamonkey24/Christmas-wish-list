import React, { useState } from 'react';
import { Link2, Plus, Sparkles } from 'lucide-react';
import { api } from '../api';
import { inferGift } from '../utils/inferGift';
import { Field, Notice, inputStyle } from './ui';

const PRIORITIES = ['Must Have 🌟', 'High Wish ❤️', 'Fun Gift 🎁'];

// Paste a product link; the site reads the page to fill in the name, photo and price.
export default function AddGiftByLink({ onAddItem, onManual }) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState(null);

  const find = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    setBusy(true);
    setError('');
    try {
      const p = await api('POST', 'preview', { url: url.trim() });
      setDraft({ url: p.url || url.trim(), title: p.title || '', image: p.image || '', price: p.price ?? '', site: p.site, priority: PRIORITIES[1], mustGet: '', auto: true });
    } catch (err) {
      // Some stores block automatic reading: let them finish by hand without losing the link.
      setError(`${err.message} You can still add it: type the name and price below.`);
      setDraft({ url: url.trim(), title: '', image: '', price: '', site: '', priority: PRIORITIES[1], mustGet: '', auto: false });
    } finally {
      setBusy(false);
    }
  };

  const set = (k) => (e) => setDraft(d => ({ ...d, [k]: e.target.value }));

  const add = (e) => {
    e.preventDefault();
    const price = Math.round(Number(draft.price));
    if (!draft.title.trim() || !(price > 0)) { setError('Please check the name and price.'); return; }
    const meta = inferGift(draft.title, price);
    onAddItem({
      id: `g_${Date.now()}`,
      title: draft.title.trim(),
      price,
      category: meta.category,
      closenessRequired: meta.closenessRequired,
      priority: draft.priority,
      imageUrl: draft.image.trim(),
      url: draft.url,
      description: draft.site ? `From ${draft.site}.` : 'Added from a link.',
      tags: meta.tags,
      mustGet: draft.mustGet.trim()
    });
    setDraft(null);
    setUrl('');
    setError('');
  };

  return (
    <div className="glass-card" style={{ padding: '22px', marginBottom: '28px', border: '1px solid rgba(251, 191, 36, 0.35)' }}>
      <h3 style={{ fontSize: '1.15rem', color: '#fbbf24', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Sparkles style={{ width: '18px', height: '18px' }} /> Add a gift
      </h3>
      <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: '0 0 14px' }}>Paste a link to the product. We’ll find the name, photo and price for you.</p>

      {!draft && (
        <form onSubmit={find} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 280px' }}>
            <Link2 style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#64748b' }} />
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.amazon.com/…" aria-label="Product link" style={{ ...inputStyle, paddingLeft: '36px' }} />
          </div>
          <button type="submit" disabled={busy || !url.trim()} className="festive-btn-primary" style={{ padding: '11px 22px' }}>{busy ? 'Reading the page…' : 'Find gift'}</button>
        </form>
      )}

      {error && !draft && <div style={{ marginTop: '12px' }}><Notice tone="error">{error}</Notice></div>}

      {draft && (
        <form onSubmit={add}>
          {error && <div style={{ marginBottom: '14px' }}><Notice tone={draft.auto ? 'error' : 'info'}>{error}</Notice></div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 170px) 1fr', gap: '18px', alignItems: 'start' }}>
            <div style={{ aspectRatio: '1', borderRadius: '14px', overflow: 'hidden', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.8rem', textAlign: 'center' }}>
              {draft.image ? <img src={draft.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#fff' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : 'No photo found'}
            </div>
            <div>
              <Field label="Name"><input required value={draft.title} onChange={set('title')} maxLength={200} style={inputStyle} /></Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Field label="Price ($)" hint={draft.auto && draft.price ? 'Found on the page' : 'Whole dollars'}>
                  <input required type="number" min="1" step="1" value={draft.price} onChange={set('price')} style={inputStyle} />
                </Field>
                <Field label="How much do you want it?">
                  <select value={draft.priority} onChange={set('priority')} style={{ ...inputStyle, background: '#0f172a' }}>{PRIORITIES.map(p => <option key={p}>{p}</option>)}</select>
                </Field>
              </div>
              <Field label="Please get… (optional)" hint="A color, size or scent people must pick. They’ll see a reminder before the link opens.">
                <input value={draft.mustGet} onChange={set('mustGet')} maxLength={120} placeholder="e.g. the white one" style={inputStyle} />
              </Field>
              {!draft.image && (
                <Field label="Photo link (optional)"><input value={draft.image} onChange={set('image')} placeholder="https://…jpg" style={inputStyle} /></Field>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
            <button type="button" onClick={() => { setDraft(null); setError(''); }} className="festive-btn-secondary">Cancel</button>
            <button type="submit" className="festive-btn-primary"><Plus style={{ width: '16px', height: '16px' }} /> Add to my wishlist</button>
          </div>
        </form>
      )}

      {!draft && (
        <button type="button" onClick={onManual} style={{ marginTop: '12px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.82rem', textDecoration: 'underline', padding: 0 }}>
          or fill in all the details yourself
        </button>
      )}
    </div>
  );
}
