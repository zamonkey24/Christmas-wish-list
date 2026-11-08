import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, X, Send, RotateCcw, Mic, Volume2, VolumeX } from 'lucide-react';
import { api } from '../api';
import ProductCard from './ProductCard';

const STORE_KEY = 'giftbloom_bloom_chat';
const INTRO = { role: 'assistant', content: "Hi, I'm Bloom AI ✨ Tell me who you're shopping for, what they like and a budget, and I'll find gifts. You can also paste a product link and I'll add it to your wishlist with the photo and price." };
const VOICE_KEY = 'giftbloom_bloom_voice';
const Recognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;
const speak = (t) => { try { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(String(t).replace(/\s+/g, ' ').slice(0, 400)); u.rate = 1.02; window.speechSynthesis.speak(u); } catch { /* voice unavailable */ } };
const IDEAS = ['Gift for a 14 year old who loves 3D printing, under $300', 'Cologne for my dad under $60', 'My grandma likes puzzles and tea', 'Something for a college student, around $40'];

const load = () => { try { const v = JSON.parse(sessionStorage.getItem(STORE_KEY)); return Array.isArray(v) && v.length ? v : [INTRO]; } catch { return [INTRO]; } };

// The Bloom AI chat panel: describe a gift and it answers with real catalog products you can add in one tap.
export default function BloomAI({ open, onClose, listId, focusListId = '', onOpenList }) {
  const [messages, setMessages] = useState(load);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState(null);
  const end = useRef(null);
  const rec = useRef(null);
  const [listening, setListening] = useState(false);
  const [voice, setVoice] = useState(() => { try { return localStorage.getItem(VOICE_KEY) === '1'; } catch { return false; } });
  const toggleVoice = () => { const v = !voice; setVoice(v); try { localStorage.setItem(VOICE_KEY, v ? '1' : '0'); } catch { /* ignore */ } if (!v && canSpeak) window.speechSynthesis.cancel(); };
  const listen = () => {
    if (!Recognition) return;
    if (listening) { rec.current?.stop(); return; }
    if (canSpeak) window.speechSynthesis.cancel();
    const r = new Recognition(); r.lang = 'en-US'; r.interimResults = false; r.maxAlternatives = 1;
    r.onresult = (e) => { const said = e.results[0]?.[0]?.transcript; if (said) send(said); };
    r.onend = () => setListening(false); r.onerror = () => setListening(false);
    rec.current = r; setListening(true);
    try { r.start(); } catch { setListening(false); }
  };
  useEffect(() => { if (!open && canSpeak) window.speechSynthesis.cancel(); }, [open]);

  useEffect(() => { try { sessionStorage.setItem(STORE_KEY, JSON.stringify(messages.slice(-30))); } catch { /* storage unavailable */ } }, [messages]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [messages, busy, open]);

  const send = async (raw) => {
    const content = (raw ?? text).trim();
    if (!content || busy) return;
    const next = [...messages, { role: 'user', content }];
    setMessages(next); setText(''); setBusy(true);
    try {
      const history = next.filter(m => m !== INTRO).map(({ role, content: c }) => ({ role, content: c }));
      // Everything already suggested in this chat, so "something different" really is different.
      const shown = next.flatMap(m => (m.picks || []).map(p => (p.source === 'wishlist' ? `${p.listId}:${p.id}` : p.id)));
      const r = await api('POST', 'bloom', { messages: history, shown, focusListId });
      setMode(r.mode);
      setMessages(m => [...m, { role: 'assistant', content: r.reply, picks: r.picks || [], followUps: r.followUps || [], linked: r.linked || [] }]);
      if (voice && canSpeak) speak(r.reply);
      if (r.linked?.some(x => x.added)) window.dispatchEvent(new Event('giftbloom:list-changed')); // an open wishlist refreshes itself
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
          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{mode === 'claude' ? 'AI mode: searches the catalog and reads wishlists' : mode === 'lite' ? 'Built-in mode: understands ages, hobbies and budgets' : 'Your gift-finding helper'}</div>
        </div>
        {canSpeak && <button onClick={toggleVoice} title={voice ? 'Voice replies on' : 'Voice replies off'} aria-label="Toggle spoken replies" aria-pressed={voice} style={{ background: 'none', border: 'none', color: voice ? '#a5b4fc' : '#94a3b8', cursor: 'pointer' }}>{voice ? <Volume2 style={{ width: '18px', height: '18px' }} /> : <VolumeX style={{ width: '18px', height: '18px' }} />}</button>}
        <button onClick={() => { setMessages([INTRO]); setMode(null); }} title="Start over" aria-label="Start over" style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><RotateCcw style={{ width: '17px', height: '17px' }} /></button>
        <button onClick={onClose} title="Close" aria-label="Close Bloom AI" style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X style={{ width: '20px', height: '20px' }} /></button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.map((m, i) => (
          <React.Fragment key={i}>
            <div style={bubble(m)}>{m.content}</div>
            {m.linked?.length > 0 && (
              <div style={{ display: 'grid', gap: '8px', alignSelf: 'stretch' }}>
                {m.linked.map((x, k) => (
                  <div key={k} className="glass-card" style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '8px', borderRadius: '12px' }}>
                    {x.image ? <img src={x.image} alt="" style={{ width: '52px', height: '52px', objectFit: 'cover', borderRadius: '8px', background: '#fff' }} /> : <div style={{ width: '52px', height: '52px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)' }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: '#f1f5f9', fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.title || x.url}</div>
                      <div style={{ fontSize: '0.78rem', color: x.ok ? '#86efac' : '#fca5a5' }}>{x.ok ? `${x.added ? '✓ Added' : 'Already on your list'} · $${x.price}` : 'Could not add'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {m.picks?.length > 0 && (
              <div style={{ display: 'grid', gap: '10px', alignSelf: 'stretch' }}>
                {m.picks.map(p => <ProductCard key={`${p.listId || ''}${p.id}`} product={p} listId={listId} why={p.why} compact onOpenList={(id) => { onOpenList?.(id); onClose(); }} />)}
              </div>
            )}
            {i === messages.length - 1 && !busy && m.followUps?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {m.followUps.map(f => <button key={f} onClick={() => send(f)} className="glass-pill" style={{ padding: '6px 12px', fontSize: '0.78rem', color: '#cbd5e1', cursor: 'pointer' }}>{f}</button>)}
              </div>
            )}
          </React.Fragment>
        ))}
        {messages.length === 1 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {IDEAS.map(i => <button key={i} onClick={() => send(i)} className="glass-pill" style={{ padding: '7px 12px', fontSize: '0.8rem', color: '#cbd5e1', cursor: 'pointer' }}>{i}</button>)}
          </div>
        )}
        {busy && <div style={{ ...bubble({ role: 'assistant' }), color: '#94a3b8' }}>Bloom is thinking…</div>}
        <div ref={end} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(); }} style={{ display: 'flex', gap: '8px', padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Who is it for? Or paste a product link…" aria-label="Message Bloom AI" maxLength={800} autoFocus
          style={{ flex: 1, padding: '11px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.18)', color: '#fff', outline: 'none', fontSize: '0.92rem' }} />
        {Recognition && <button type="button" onClick={listen} aria-label={listening ? 'Stop listening' : 'Talk to Bloom'} title="Talk to Bloom" className="glass-pill" style={{ padding: '10px 12px', cursor: 'pointer', color: listening ? '#fca5a5' : '#cbd5e1', borderColor: listening ? '#fca5a5' : undefined }}><Mic style={{ width: '17px', height: '17px' }} /></button>}
        <button type="submit" disabled={busy || !text.trim()} className="festive-btn-primary" style={{ padding: '10px 14px' }} aria-label="Send"><Send style={{ width: '17px', height: '17px' }} /></button>
      </form>
    </div>
  );
}
