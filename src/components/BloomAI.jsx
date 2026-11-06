import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, X, Send, RotateCcw } from 'lucide-react';
import { api } from '../api';
import ProductCard from './ProductCard';

const STORE_KEY = 'giftbloom_bloom_chat';
const INTRO = { role: 'assistant', content: "Hi, I'm Bloom AI ✨ Tell me who you're shopping for, what they like and a budget, and I'll find gifts from the catalog." };
const IDEAS = ['Cologne for my dad under $60', 'Something for curly hair', 'A bike gift under $30', 'Skincare for my mom around $40'];

const load = () => { try { const v = JSON.parse(sessionStorage.getItem(STORE_KEY)); return Array.isArray(v) && v.length ? v : [INTRO]; } catch { return [INTRO]; } };

// The Bloom AI chat panel: describe a gift and it answers with real catalog products you can add in one tap.
export default function BloomAI({ open, onClose, listId }) {
  const [messages, setMessages] = useState(load);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState(null);
  const end = useRef(null);

  useEffect(() => { try { sessionStorage.setItem(STORE_KEY, JSON.stringify(messages.slice(-30))); } catch { /* storage unavailable */ } }, [messages]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [messages, busy, open]);

  const send = async (raw) => {
    const content = (raw ?? text).trim();
    if (!content || busy) return;
    const next = [...messages, { role: 'user', content }];
    setMessages(next); setText(''); setBusy(true);
    try {
      const history = next.filter(m => m !== INTRO).map(({ role, content: c }) => ({ role, content: c }));
      const r = await api('POST', 'bloom', { messages: history });
      setMode(r.mode);
      setMessages(m => [...m, { role: 'assistant', content: r.reply, picks: r.picks || [] }]);
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', content: e.status === 429 ? "You've asked me a lot today. Try again tomorrow, or browse the catalog meanwhile." : `Sorry, something went wrong: ${e.message}` }]);
    } finally { setBusy(false); }
  };

  if (!open) return null;
  const bubble = (m) => ({ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '92%', background: m.role === 'user' ? 'var(--btn-primary-bg)' : 'rgba(255,255,255,0.07)', color: m.role === 'user' ? 'var(--btn-primary-color)' : '#e2e8f0', padding: '10px 14px', borderRadius: '14px', fontSize: '0.92rem', lineHeight: 1.45, whiteSpace: 'pre-wrap' });

  return (
    <div role="dialog" aria-label="Bloom AI" style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(430px, 100vw)', zIndex: 130, display: 'flex', flexDirection: 'column', background: '#0b1220', borderLeft: '1px solid rgba(165,180,252,0.35)', boxShadow: '-12px 0 40px rgba(0,0,0,0.5)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Sparkles style={{ width: '18px', height: '18px' }} /></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, color: '#f8fafc' }}>Bloom AI</div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{mode === 'claude' ? 'Smart gift finder' : mode === 'lite' ? 'Simple mode: matches your words and budget' : 'Your gift-finding helper'}</div>
        </div>
        <button onClick={() => { setMessages([INTRO]); setMode(null); }} title="Start over" aria-label="Start over" style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><RotateCcw style={{ width: '17px', height: '17px' }} /></button>
        <button onClick={onClose} title="Close" aria-label="Close Bloom AI" style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X style={{ width: '20px', height: '20px' }} /></button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.map((m, i) => (
          <React.Fragment key={i}>
            <div style={bubble(m)}>{m.content}</div>
            {m.picks?.length > 0 && (
              <div style={{ display: 'grid', gap: '10px', alignSelf: 'stretch' }}>
                {m.picks.map(p => <ProductCard key={p.id} product={p} listId={listId} compact />)}
              </div>
            )}
          </React.Fragment>
        ))}
        {messages.length === 1 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {IDEAS.map(i => <button key={i} onClick={() => send(i)} className="glass-pill" style={{ padding: '7px 12px', fontSize: '0.8rem', color: '#cbd5e1', cursor: 'pointer' }}>{i}</button>)}
          </div>
        )}
        {busy && <div style={{ ...bubble({ role: 'assistant' }), color: '#94a3b8' }}>Bloom is looking…</div>}
        <div ref={end} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(); }} style={{ display: 'flex', gap: '8px', padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Who is it for, and what do they like?" aria-label="Message Bloom AI" maxLength={600} autoFocus
          style={{ flex: 1, padding: '11px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.18)', color: '#fff', outline: 'none', fontSize: '0.92rem' }} />
        <button type="submit" disabled={busy || !text.trim()} className="festive-btn-primary" style={{ padding: '10px 14px' }} aria-label="Send"><Send style={{ width: '17px', height: '17px' }} /></button>
      </form>
    </div>
  );
}
