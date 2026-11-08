import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { Notice, Spinner, inputStyle } from './ui';

// Secret Santa: make a group, share the code, draw names once, and everybody sees only the person they drew.
export default function SecretSanta({ initialCode = '', onConsumed, onOpenList, onChanged }) {
  const [groups, setGroups] = useState(null);
  const [current, setCurrent] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: '', budget: '', date: '' });
  const [code, setCode] = useState(initialCode);
  const [revealed, setRevealed] = useState(false);

  const load = useCallback(async () => {
    try { setGroups((await api('GET', 'santa')).groups); } catch (e) { setError(e.message); setGroups([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const run = async (fn) => {
    setBusy(true); setError('');
    try { await fn(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const open = (id) => run(async () => { setRevealed(false); setCurrent(await api('GET', `santa/${id}`)); });
  const create = (e) => { e.preventDefault(); run(async () => { const g = await api('POST', 'santa', { name: form.name, budget: Number(form.budget) || 0, date: form.date }); setForm({ name: '', budget: '', date: '' }); setRevealed(false); setCurrent(g); load(); }); };
  const join = (e) => { e?.preventDefault(); onConsumed?.(); run(async () => { const g = await api('POST', 'santa/join', { code }); setCode(''); setRevealed(false); setCurrent(g); load(); }); };
  const draw = () => {
    if (!window.confirm('Draw names now? Nobody new can join afterward, and the draw cannot be redone.')) return;
    run(async () => { setCurrent(await api('POST', `santa/${current.id}/draw`)); await onChanged?.(); load(); });
  };
  const leave = () => { if (window.confirm('Leave this group?')) run(async () => { await api('POST', `santa/${current.id}/leave`, {}); setCurrent(null); load(); }); };
  const remove = () => { if (window.confirm('Delete this group for everyone?')) run(async () => { await api('DELETE', `santa/${current.id}`); setCurrent(null); load(); }); };

  useEffect(() => { if (initialCode) join(); /* eslint-disable-next-line */ }, []);

  const shareLink = current ? `${window.location.origin}/?santa=${current.code}` : '';
  const card = { padding: '22px', marginBottom: '18px' };

  if (groups === null) return <Spinner />;

  return (
    <main style={{ flex: 1, position: 'relative', zIndex: 10 }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '32px 20px 60px' }}>
        <div className="glass-card" style={card}>
          <h2 style={{ fontSize: '1.6rem', margin: '0 0 6px' }} className="gold-gradient-text">🎅 Secret Santa</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.92rem', margin: 0 }}>
            Make a group, share the code, then draw names. Everyone sees only the person they drew, and can open that person's wishlist to pick a gift.
          </p>
        </div>
        {error && <div style={{ marginBottom: '14px' }}><Notice tone="error" onClose={() => setError('')}>{error}</Notice></div>}

        {current ? (
          <div className="glass-card" style={card}>
            <button onClick={() => setCurrent(null)} className="festive-btn-secondary" style={{ padding: '4px 12px', fontSize: '0.8rem', marginBottom: '12px' }}>← All groups</button>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.3rem', color: '#f8fafc' }}>{current.name}</h3>
            <div style={{ color: '#94a3b8', fontSize: '0.88rem', marginBottom: '14px' }}>
              {current.budget ? `Budget about $${current.budget}` : 'No budget set'}{current.date ? ` · Gifts on ${current.date}` : ''}
            </div>

            {current.drawn ? (
              <div style={{ padding: '18px', borderRadius: '14px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.4)', textAlign: 'center', marginBottom: '16px' }}>
                {revealed && current.youGive ? (
                  <>
                    <div style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>You are Secret Santa for</div>
                    <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#fbbf24', margin: '4px 0 12px' }}>🎁 {current.youGive.name}</div>
                    <button className="festive-btn-primary" onClick={() => onOpenList(current.youGive.listId)}>See {current.youGive.name}'s wishlist</button>
                    <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '10px' }}>Keep it secret! Claiming a gift there tells other givers it is covered.</div>
                  </>
                ) : (
                  <>
                    <div style={{ color: '#cbd5e1', marginBottom: '10px' }}>Names are drawn. Make sure nobody is looking over your shoulder!</div>
                    <button className="festive-btn-primary" onClick={() => setRevealed(true)}>Reveal who I got</button>
                  </>
                )}
              </div>
            ) : (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '8px' }}>Share this code (or link) so people can join:</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <strong style={{ fontSize: '1.4rem', letterSpacing: '0.12em', color: '#fbbf24' }}>{current.code}</strong>
                  <button className="festive-btn-secondary" style={{ padding: '5px 12px', fontSize: '0.8rem' }} onClick={() => navigator.clipboard?.writeText(shareLink).then(() => setError(''), () => {})}>Copy invite link</button>
                </div>
              </div>
            )}

            <div style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '6px' }}>{current.members.length} {current.members.length === 1 ? 'person' : 'people'} in this group</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '18px' }}>
              {current.members.map((m, i) => <span key={i} className="glass-pill" style={{ padding: '5px 12px', fontSize: '0.85rem', color: '#e2e8f0' }}>{m.name}{m.you ? ' (you)' : ''}{m.organizer ? ' ⭐' : ''}</span>)}
            </div>

            {!current.drawn && current.isOrganizer && (
              <button className="festive-btn-primary" disabled={busy || !current.canDraw} onClick={draw}>{current.canDraw ? '🎲 Draw names' : 'Need at least 3 people to draw'}</button>
            )}
            {!current.drawn && !current.isOrganizer && <button className="festive-btn-secondary" onClick={leave} disabled={busy}>Leave group</button>}
            {current.isOrganizer && <button className="festive-btn-secondary" onClick={remove} disabled={busy} style={{ marginLeft: current.drawn ? 0 : '10px' }}>Delete group</button>}
          </div>
        ) : (
          <>
            {groups.length > 0 && (
              <div className="glass-card" style={card}>
                <h3 style={{ margin: '0 0 12px', color: '#f8fafc' }}>Your groups</h3>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {groups.map(g => (
                    <button key={g.id} onClick={() => open(g.id)} className="glass-pill" style={{ padding: '12px 16px', textAlign: 'left', cursor: 'pointer', color: '#e2e8f0', display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                      <strong>{g.name}</strong>
                      <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{g.members} {g.members === 1 ? 'person' : 'people'} · {g.drawn ? 'names drawn' : 'waiting to draw'}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={create} className="glass-card" style={card}>
              <h3 style={{ margin: '0 0 12px', color: '#f8fafc' }}>Start a group</h3>
              <div style={{ display: 'grid', gap: '10px' }}>
                <input style={inputStyle} placeholder="Group name (like Family Christmas)" aria-label="Group name" value={form.name} maxLength={50} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <input style={{ ...inputStyle, flex: 1, minWidth: '140px' }} placeholder="Budget $ (optional)" aria-label="Budget" inputMode="numeric" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value.replace(/[^0-9]/g, '') })} />
                  <input style={{ ...inputStyle, flex: 1, minWidth: '140px' }} placeholder="Gift date (optional)" aria-label="Gift date" value={form.date} maxLength={30} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div><button className="festive-btn-primary" disabled={busy || !form.name.trim()}>Create group</button></div>
              </div>
            </form>

            <form onSubmit={join} className="glass-card" style={card}>
              <h3 style={{ margin: '0 0 12px', color: '#f8fafc' }}>Join with a code</h3>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <input style={{ ...inputStyle, flex: 1, minWidth: '160px', textTransform: 'uppercase' }} placeholder="6-letter code" aria-label="Secret Santa code" value={code} maxLength={20} onChange={(e) => setCode(e.target.value)} />
                <button className="festive-btn-primary" disabled={busy || !code.trim()}>Join</button>
              </div>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
