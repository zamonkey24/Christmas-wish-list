import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { api } from '../api';
import { Notice, inputStyle } from './ui';
import ProductCard from './ProductCard';

const SORTS = [['relevance', 'Best match'], ['price-asc', 'Price: low to high'], ['price-desc', 'Price: high to low'], ['newest', 'Newest']];
const BUDGETS = [['', 'Any price'], ['25', 'Under $25'], ['50', 'Under $50'], ['100', 'Under $100'], ['200', 'Under $200']];

// Browse and search every product in GiftBloom's catalog. It keeps loading as you scroll.
export default function CatalogPage({ listId, onOpenBloom }) {
  const [input, setInput] = useState('');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('relevance');
  const [max, setMax] = useState('');
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ total: 0, pages: 1, categories: {} });
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const gen = useRef(0); // ignores answers to searches that were replaced by newer ones
  const sentinel = useRef(null);

  useEffect(() => { const t = setTimeout(() => setQ(input.trim()), 300); return () => clearTimeout(t); }, [input]);

  const load = useCallback(async (nextPage, replace) => {
    const my = ++gen.current;
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ page: String(nextPage), limit: '24', sort });
      if (q) params.set('q', q);
      if (category) params.set('category', category);
      if (max) params.set('max', max);
      const r = await api('GET', `catalog?${params}`);
      if (my !== gen.current) return;
      setItems(prev => (replace ? r.items : [...prev, ...r.items.filter(n => !prev.some(p => p.id === n.id))]));
      setMeta({ total: r.total, pages: r.pages, categories: r.categories });
      setPage(r.page);
    } catch (e) {
      if (my === gen.current) setError(e.message);
    } finally {
      if (my === gen.current) setLoading(false);
    }
  }, [q, category, sort, max]);

  // A new search, filter or sort starts again from the top.
  useEffect(() => { load(1, true); }, [load]);

  const more = page < meta.pages;
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !more || loading) return undefined;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) load(page + 1, false); }, { rootMargin: '600px' });
    io.observe(el);
    return () => io.disconnect();
  }, [more, loading, page, load]);

  const chip = (value, label, count) => (
    <button key={value || 'all'} onClick={() => setCategory(value)} className="glass-pill"
      style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer', color: category === value ? '#fbbf24' : '#cbd5e1', background: category === value ? 'rgba(165, 180, 252, 0.18)' : undefined, borderColor: category === value ? '#a5b4fc' : undefined }}>
      {label}{count !== undefined ? ` (${count})` : ''}
    </button>
  );
  const totalAll = Object.values(meta.categories).reduce((a, b) => a + b, 0);

  return (
    <main style={{ flex: 1, position: 'relative', zIndex: 10 }}>
      <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '28px 20px 80px' }}>
        <div className="glass-card" style={{ padding: '22px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14px', flexWrap: 'wrap', marginBottom: '14px' }}>
            <div>
              <h1 style={{ fontSize: '1.6rem', margin: '0 0 4px' }} className="gold-gradient-text">Gift Catalog 🛍️</h1>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>Browse gifts with their photo, price and link, and add any of them to your wishlist in one tap.</p>
            </div>
            <button onClick={onOpenBloom} className="festive-btn-primary" style={{ padding: '10px 18px' }}><Sparkles style={{ width: '16px', height: '16px' }} /> Ask Bloom AI</button>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '2 1 260px' }}>
              <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#64748b' }} />
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Search gifts… (try cologne, curly hair, bike)" aria-label="Search the catalog" style={{ ...inputStyle, paddingLeft: '36px' }} />
            </div>
            <select value={max} onChange={(e) => setMax(e.target.value)} aria-label="Price" style={{ ...inputStyle, flex: '1 1 130px', background: '#0f172a' }}>{BUDGETS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort" style={{ ...inputStyle, flex: '1 1 160px', background: '#0f172a' }}>{SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </div>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingTop: '14px' }}>
            {chip('', 'All', totalAll)}
            {Object.entries(meta.categories).sort((a, b) => b[1] - a[1]).map(([c, n]) => chip(c, c, n))}
          </div>
        </div>

        {error && <div style={{ marginBottom: '16px' }}><Notice tone="error">{error}</Notice></div>}

        <div style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 4px 12px' }}>{loading && !items.length ? 'Searching…' : `${meta.total} ${meta.total === 1 ? 'gift' : 'gifts'}${q ? ` for “${q}”` : ''}`}</div>

        {!loading && !items.length && !error ? (
          <div className="glass-card" style={{ padding: '44px 20px', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: '2rem', marginBottom: '6px' }}>🔎</div>
            <div style={{ color: '#e2e8f0', fontWeight: 700, marginBottom: '4px' }}>Nothing matches yet</div>
            Try a different word or a higher price, or ask Bloom AI for ideas.
            <div><button onClick={onOpenBloom} className="festive-btn-primary" style={{ marginTop: '14px', padding: '9px 18px' }}><Sparkles style={{ width: '15px', height: '15px' }} /> Ask Bloom AI</button></div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '18px' }}>
            {items.map(p => <ProductCard key={p.id} product={p} listId={listId} />)}
          </div>
        )}

        <div ref={sentinel} style={{ height: '1px' }} />
        {loading && items.length > 0 && <div style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>Loading more…</div>}
        {more && !loading && <div style={{ textAlign: 'center', padding: '20px' }}><button onClick={() => load(page + 1, false)} className="festive-btn-secondary">Load more</button></div>}
        {!more && items.length > 0 && <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.85rem', padding: '28px' }}>You’ve seen everything for now. Add a gift by link on your wishlist and it shows up here for everyone.</div>}
      </div>
    </main>
  );
}
