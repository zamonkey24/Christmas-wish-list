import React, { useState, useEffect, useRef, useMemo } from 'react';
import Header from './components/Header';
import Quiz from './components/Quiz';
import QuizResult from './components/QuizResult';
import WishlistGallery from './components/WishlistGallery';
import AdminWishlist from './components/AdminWishlist';
import { Notice, Spinner } from './components/ui';
import { useTheme } from './ThemeContext';
import { api } from './api';
import { migrateDefaults } from './utils/migrate';
import LegacyImport from './components/LegacyImport';
import { Gift } from 'lucide-react';

const ROTATION_STORAGE_KEY = 'festive_gift_quiz_rotation_v1';
const TRASH_DAYS = 30;
const POLL_MS = 15000;

const CLAIM_KEYS = ['claimed', 'claimedBy', 'claimedNote', 'claimedByMe'];
const splitClaims = (items) => {
  const claims = {};
  const base = items.map(i => {
    if (i.claimed) claims[i.id] = { claimedBy: i.claimedBy, claimedNote: i.claimedNote, claimedByMe: i.claimedByMe };
    const copy = { ...i };
    CLAIM_KEYS.forEach(k => delete copy[k]);
    return copy;
  });
  return { base, claims };
};

// One wishlist: its quiz, gallery and (for the owner) the editor. The owner's changes save automatically;
// everyone sees claims and edits within seconds.
export default function ListView({ listId, code, onTheme }) {
  const theme = useTheme();
  const [phase, setPhase] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [items, setItems] = useState([]);
  const [claims, setClaims] = useState({});
  const [trash, setTrash] = useState([]);
  const [ownerName, setOwnerName] = useState('');
  const [listTheme, setListTheme] = useState('christmas');
  const [inviteCode, setInviteCode] = useState(null);
  const [legacyVersion, setLegacyVersion] = useState(null);
  const [currentView, setCurrentView] = useState('quiz');
  const [quizAnswers, setQuizAnswers] = useState(null);
  const [banner, setBanner] = useState('');
  const [syncTick, setSyncTick] = useState(0);

  // Sync bookkeeping (refs so timers and fetch callbacks always see the newest values)
  const latest = useRef({});
  latest.current = { items, ownerName, theme: listTheme, trash, legacyVersion };
  const contentOf = (l) => JSON.stringify({ items: l.items, ownerName: l.ownerName, theme: l.theme, trash: l.trash, legacyVersion: l.legacyVersion });
  const lastServer = useRef(null); // content the server has, as last read or saved
  const saveTimer = useRef(null);  // a local change is waiting to be saved
  const saving = useRef(false);    // a save request is in flight
  const writeSeq = useRef(0);      // bumps around saves so reads that raced one can be ignored
  const lastWriteAt = useRef(0);   // server time of our newest save; older copies are stale
  const ready = useRef(false);

  useEffect(() => { onTheme?.(listTheme); }, [listTheme]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => onTheme?.('classic'), []); // leaving a wishlist returns to the calm Classic look // eslint-disable-line react-hooks/exhaustive-deps

  const applyClaims = (view) => setClaims(splitClaims(view.items).claims);

  const applyView = (view, { force = false } = {}) => {
    if (force) { lastServer.current = null; clearTimeout(saveTimer.current); saveTimer.current = null; }
    const { base, claims: cm } = splitClaims(view.items);
    setClaims(cm);
    setIsOwner(view.isOwner);
    setInviteCode(view.inviteCode ?? null);
    const incoming = { items: base, ownerName: view.ownerName, theme: view.theme, trash: view.trash ?? [], legacyVersion: view.legacyVersion ?? null };
    // Never overwrite edits the owner has made but not saved yet.
    const unsaved = view.isOwner && lastServer.current !== null && contentOf(latest.current) !== lastServer.current;
    if (!unsaved) {
      lastServer.current = contentOf(incoming);
      let local = incoming;
      if (view.isOwner && incoming.legacyVersion !== null) {
        // The original wishlist was just imported: add the starter items added since it was last saved.
        local = { ...incoming, items: migrateDefaults(incoming.items, incoming.legacyVersion), legacyVersion: null };
      }
      setItems(local.items);
      setOwnerName(local.ownerName);
      setListTheme(local.theme);
      setTrash(local.trash);
      setLegacyVersion(local.legacyVersion);
    }
    ready.current = true;
    setPhase('ready');
    setSyncTick(t => t + 1);
  };

  const load = async (first = false) => {
    if (saveTimer.current || saving.current) return;
    const seq = writeSeq.current;
    try {
      const view = await api('GET', `lists/${listId}`, undefined, code);
      if (saveTimer.current || saving.current || seq !== writeSeq.current) return;
      if (view.updatedAt && view.updatedAt < lastWriteAt.current) return;
      applyView(view);
    } catch (e) {
      if (first) { setError(e.message); setPhase('error'); }
    }
  };

  useEffect(() => {
    load(true);
    const timer = setInterval(() => load(false), POLL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') load(false); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      clearTimeout(saveTimer.current);
    };
  }, [listId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Something else (the catalog, Bloom AI) added a gift: pick it up now instead of waiting for the next check.
  useEffect(() => {
    const refresh = () => load(false);
    window.addEventListener('giftbloom:list-changed', refresh);
    return () => window.removeEventListener('giftbloom:list-changed', refresh);
  }, [listId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Leaving this screen (for example to the catalog) must not lose an edit that has not been saved yet.
  useEffect(() => () => {
    if (saveTimer.current && ready.current && latest.current.items) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
      api('PUT', `lists/${listId}`, JSON.parse(contentOf(latest.current))).catch(() => {});
    }
  }, [listId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Owner: save changes shortly after they are made.
  useEffect(() => {
    if (!ready.current || !isOwner) return;
    if (contentOf(latest.current) === lastServer.current) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      saveTimer.current = null;
      const body = contentOf(latest.current); // newest state at the moment of saving
      if (body === lastServer.current) return;
      saving.current = true;
      writeSeq.current++;
      let ok = false;
      try {
        const saved = await api('PUT', `lists/${listId}`, JSON.parse(body));
        ok = true;
        lastServer.current = body;
        if (saved?.updatedAt) lastWriteAt.current = saved.updatedAt;
      } catch (e) {
        if (e.status === 403 || e.status === 401) setBanner('You were signed out, so your latest changes were not saved. Please sign in again.');
      }
      saving.current = false;
      writeSeq.current++;
      if (ok) setSyncTick(t => t + 1);
      else setTimeout(() => setSyncTick(t => t + 1), 5000);
    }, 400);
  }, [items, ownerName, listTheme, trash, legacyVersion, isOwner, syncTick]); // eslint-disable-line react-hooks/exhaustive-deps

  // Claims go straight to the server (anyone with access can claim), then everyone's view refreshes.
  const guarded = async (fn) => {
    try { applyClaims(await fn()); } catch (e) { setBanner(e.message); load(false); }
  };
  const handleClaimItem = (id, name, note) => guarded(() => api('POST', `lists/${listId}/claim`, { itemId: id, name, note }, code));
  const handleUnclaimItem = (id) => guarded(() => api('POST', `lists/${listId}/unclaim`, { itemId: id }, code));
  const handleResetClaims = () => {
    if (window.confirm('Are you sure you want to reset all claimed gifts to available?')) guarded(() => api('POST', `lists/${listId}/reset-claims`, {}));
  };

  // Owner edits
  const handleAddItem = (item) => setItems(prev => [item, ...prev]);
  const handleUpdateItem = (item) => setItems(prev => prev.map(i => (i.id === item.id ? item : i)));
  const handleDeleteItem = (id) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const cutoff = Date.now() - TRASH_DAYS * 24 * 60 * 60 * 1000;
    setItems(prev => prev.filter(i => i.id !== id));
    setTrash(prev => [{ ...item, deletedAt: Date.now() }, ...prev.filter(t => t.id !== id && (t.deletedAt ?? 0) > cutoff)]);
  };
  const handleRestoreItem = (id) => {
    const item = trash.find(t => t.id === id);
    if (!item) return;
    const { deletedAt, ...restored } = item; // eslint-disable-line no-unused-vars
    setItems(prev => [restored, ...prev.filter(i => i.id !== id)]);
    setTrash(prev => prev.filter(t => t.id !== id));
  };
  const handlePurgeItem = (id) => setTrash(prev => prev.filter(t => t.id !== id));
  const handleEmptyTrash = () => setTrash([]);
  const handleImportWishlist = (imported) => setItems(imported.map(({ claimed, claimedBy, claimedNote, claimedByMe, ...rest }) => rest)); // eslint-disable-line no-unused-vars
  const handleRotateInvite = async () => {
    const r = await api('POST', `lists/${listId}/invite/rotate`, {});
    setInviteCode(r.inviteCode);
  };

  const handleCompleteQuiz = (answers) => {
    // Ties between equally good gifts rotate each time the quiz is taken.
    let rotation = 0;
    try {
      rotation = (Number(localStorage.getItem(ROTATION_STORAGE_KEY)) || 0) + 1;
      localStorage.setItem(ROTATION_STORAGE_KEY, String(rotation));
    } catch (e) { /* storage unavailable: no rotation */ }
    setQuizAnswers({ ...answers, rotation });
    setCurrentView('result');
  };

  const itemsWithClaims = useMemo(() => items.map(i => {
    const c = claims[i.id];
    return c
      ? { ...i, claimed: true, claimedBy: c.claimedBy, claimedNote: c.claimedNote, claimedByMe: c.claimedByMe }
      : { ...i, claimed: false, claimedBy: '', claimedNote: '', claimedByMe: false };
  }), [items, claims]);

  const canUnclaim = (item) => isOwner || Boolean(item.claimedByMe);

  if (phase === 'loading') return <Spinner label="Opening wishlist…" />;
  if (phase === 'error') {
    return (
      <div style={{ maxWidth: '520px', margin: '60px auto', padding: '0 20px' }}>
        <div className="glass-card" style={{ padding: '30px', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '8px' }}>We couldn’t open that wishlist</h2>
          <p style={{ color: '#94a3b8', marginBottom: '16px' }}>{error}</p>
          <button className="festive-btn-primary" onClick={() => window.location.assign('/')}>Go home</button>
        </div>
      </div>
    );
  }

  const empty = items.length === 0;
  const view = !isOwner && currentView === 'admin' ? 'quiz' : currentView;

  return (
    <>
      <Header currentView={view} setCurrentView={setCurrentView} wishlistItems={itemsWithClaims} ownerName={ownerName} isOwner={isOwner} />

      <main style={{ flex: 1, position: 'relative', zIndex: 10, paddingBottom: '60px' }}>
        {banner && (
          <div style={{ maxWidth: '1000px', margin: '16px auto 0', padding: '0 20px' }}>
            <Notice tone="error" onClose={() => setBanner('')}>{banner}</Notice>
          </div>
        )}

        {empty && view !== 'admin' && (
          <div style={{ maxWidth: '560px', margin: '60px auto', padding: '0 20px' }}>
            <div className="glass-card animate-fade-in" style={{ padding: '36px', textAlign: 'center' }}>
              <Gift style={{ width: '48px', height: '48px', color: '#fbbf24', margin: '0 auto 12px' }} />
              <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }} className="gold-gradient-text">
                {isOwner ? 'Your wishlist is empty' : `${ownerName}’s wishlist is empty so far`}
              </h2>
              <p style={{ color: '#94a3b8', marginBottom: '20px' }}>
                {isOwner ? 'Paste a link to the first thing you want. We’ll fill in the name, photo and price.' : 'Check back soon. They haven’t added any gifts yet.'}
              </p>
              {isOwner && <button className="festive-btn-primary" onClick={() => setCurrentView('admin')}>Add my first gift</button>}
              {isOwner && <LegacyImport onImported={(v) => applyView(v, { force: true })} />}
            </div>
          </div>
        )}

        {!empty && view === 'quiz' && <Quiz onCompleteQuiz={handleCompleteQuiz} ownerName={ownerName} />}

        {!empty && view === 'result' && quizAnswers && (
          <QuizResult
            quizAnswers={quizAnswers}
            wishlistItems={itemsWithClaims}
            onClaimItem={handleClaimItem}
            onUnclaimItem={handleUnclaimItem}
            onRetakeQuiz={() => setCurrentView('quiz')}
            ownerName={ownerName}
            canUnclaim={canUnclaim}
          />
        )}

        {!empty && view === 'gallery' && (
          <WishlistGallery
            wishlistItems={itemsWithClaims}
            onClaimItem={handleClaimItem}
            onUnclaimItem={handleUnclaimItem}
            ownerName={ownerName}
            canUnclaim={canUnclaim}
          />
        )}

        {view === 'admin' && isOwner && (
          <AdminWishlist
            wishlistItems={itemsWithClaims}
            onAddItem={handleAddItem}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            trash={trash}
            trashDays={TRASH_DAYS}
            onRestoreItem={handleRestoreItem}
            onPurgeItem={handlePurgeItem}
            onEmptyTrash={handleEmptyTrash}
            onResetClaims={handleResetClaims}
            onImportWishlist={handleImportWishlist}
            ownerName={ownerName}
            onUpdateOwnerName={setOwnerName}
            theme={listTheme}
            onChangeTheme={setListTheme}
            inviteCode={inviteCode}
            onRotateInvite={handleRotateInvite}
            legacyImport={<LegacyImport compact onImported={(v) => applyView(v, { force: true })} />}
          />
        )}
      </main>

      <footer style={{ position: 'relative', zIndex: 10, padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', background: 'var(--footer-bg)' }}>
        <p style={{ margin: 0 }}>
          {theme.emoji} <strong>{ownerName}'s {theme.footer}</strong> • Made with GiftBloom
        </p>
        {theme.id === 'birthday' && (
          <p style={{ margin: '6px 0 0', fontSize: '0.75rem', opacity: 0.8 }}>
            Marble photo: <a href="https://commons.wikimedia.org/wiki/File:Calacatta_Gold_QUADRA.jpg" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>Calacatta Gold</a> by Irvanderss,{' '}
            <a href="https://creativecommons.org/licenses/by-sa/4.0" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>CC BY-SA 4.0</a> (cropped and retouched)
          </p>
        )}
      </footer>
    </>
  );
}
