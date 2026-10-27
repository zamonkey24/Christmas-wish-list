import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import Quiz from './components/Quiz';
import QuizResult from './components/QuizResult';
import WishlistGallery from './components/WishlistGallery';
import AdminWishlist from './components/AdminWishlist';
import Snowfall from './components/Snowfall';
import { THEMES, ThemeContext } from './ThemeContext';
import { DEFAULT_WISHLIST } from './data/initialWishlist';
import { Lock, KeyRound } from 'lucide-react';

const WISHLIST_STORAGE_KEY = 'festive_gift_quiz_items_v24';
const OWNER_NAME_STORAGE_KEY = 'festive_gift_quiz_owner_v1';
const TRASH_STORAGE_KEY = 'festive_gift_quiz_trash_v1';
const ROTATION_STORAGE_KEY = 'festive_gift_quiz_rotation_v1';
const THEME_STORAGE_KEY = 'festive_gift_quiz_theme_v1';
const TRASH_DAYS = 30;
// Bump when DEFAULT_WISHLIST changes: merges new defaults into the shared list, keeping claims and admin-added items.
const DATA_VERSION = 13;
const SYNC_URL = '/api/state';
const POLL_MS = 15000;
const ADMIN_PASSWORD = '01015';

export default function App() {
  const [wishlistItems, setWishlistItems] = useState(() => {
    const saved = localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) { /* fallback */ }
    }
    return DEFAULT_WISHLIST;
  });

  const [trash, setTrash] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(TRASH_STORAGE_KEY));
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) { return []; }
  });

  // ?theme=birthday|christmas previews a look on this device only (not saved or shared).
  const previewTheme = new URLSearchParams(window.location.search).get('theme');
  const [theme, setTheme] = useState(() => {
    if (THEMES[previewTheme]) return previewTheme;
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return THEMES[saved] ? saved : 'christmas';
  });
  const themeConfig = THEMES[theme];

  const [ownerName, setOwnerName] = useState(() => {
    return localStorage.getItem(OWNER_NAME_STORAGE_KEY) || 'Arav';
  });

  const [currentView, setCurrentView] = useState(() => (new URLSearchParams(window.location.search).get('view') === 'gallery' ? 'gallery' : 'quiz'));
  const [quizAnswers, setQuizAnswers] = useState(null);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlistItems));
  }, [wishlistItems]);

  useEffect(() => {
    localStorage.setItem(OWNER_NAME_STORAGE_KEY, ownerName);
  }, [ownerName]);

  useEffect(() => {
    localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(trash));
  }, [trash]);

  useEffect(() => {
    if (!THEMES[previewTheme]) localStorage.setItem(THEME_STORAGE_KEY, theme);
    document.documentElement.dataset.theme = theme;
    document.title = themeConfig.pageTitle;
    let icon = document.querySelector("link[rel='icon']");
    if (!icon) {
      icon = document.createElement('link');
      icon.rel = 'icon';
      document.head.appendChild(icon);
    }
    icon.type = 'image/svg+xml';
    icon.href = themeConfig.favicon;
    document.querySelector("meta[name='description']")?.setAttribute('content', themeConfig.description);
  }, [theme, themeConfig, previewTheme]);

  // Shared state across devices (Netlify Function + Blobs). LocalStorage above is the offline fallback.
  const lastServer = useRef(null);
  const synced = useRef(false);

  // Default item ids already offered to the shared list; deleted ones must not come back on a version bump.
  const knownIds = useRef([]);
  const defaultIds = DEFAULT_WISHLIST.map(i => i.id);

  const serialize = (items, name, version, known, deleted, themeId) => JSON.stringify({ items, ownerName: name, version, knownIds: known, trash: deleted ?? [], theme: themeId });

  // When DATA_VERSION goes up, refresh default items and add the ones introduced after the saved version
  // (`addedIn` on an item in initialWishlist.js). Defaults missing from an older list were deleted on purpose.
  // When adding new default items: bump DATA_VERSION and give each new item addedIn: <the new version>.
  const migrate = (items, savedVersion) => {
    const byId = new Map(items.map(i => [i.id, i]));
    const merged = [];
    DEFAULT_WISHLIST.forEach(def => {
      const old = byId.get(def.id);
      if (old) merged.push({ ...def, claimed: old.claimed, claimedBy: old.claimedBy, claimedNote: old.claimedNote });
      else if ((def.addedIn ?? 0) > savedVersion) merged.push(def);
    });
    const adminAdded = items.filter(i => /^g_\d+$/.test(i.id));
    return [...adminAdded, ...merged];
  };

  const applyServerState = (state) => {
    const version = state.version ?? 0;
    lastServer.current = serialize(state.items, state.ownerName, version, state.knownIds, state.trash, state.theme);
    if (version < DATA_VERSION) {
      setWishlistItems(migrate(state.items, version));
      knownIds.current = defaultIds;
    } else {
      setWishlistItems(state.items);
      // Older saved state has no record: everything missing from the list was deleted on purpose.
      knownIds.current = state.knownIds ?? defaultIds;
    }
    setOwnerName(state.ownerName);
    setTrash(Array.isArray(state.trash) ? state.trash : []);
    if (THEMES[state.theme] && !THEMES[previewTheme]) setTheme(state.theme);
  };

  // Latest local state, readable from timers and fetch callbacks.
  const latest = useRef({});
  latest.current = { wishlistItems, ownerName, trash, theme };
  const localBody = () => {
    const l = latest.current;
    return serialize(l.wishlistItems, l.ownerName, DATA_VERSION, knownIds.current.length ? knownIds.current : defaultIds, l.trash, l.theme);
  };

  const saveTimer = useRef(null); // a local change is waiting to be saved
  const saving = useRef(false);   // a save request is in flight
  const lastWriteAt = useRef(0);  // server timestamp of our newest save; older copies are stale
  const writeSeq = useRef(0);     // bumps around every save, so stale reads can be recognised

  useEffect(() => {
    const pull = async () => {
      if (saveTimer.current || saving.current) return;
      const seq = writeSeq.current;
      try {
        const res = await fetch(SYNC_URL, { cache: 'no-store' });
        if (!res.ok) return;
        const state = await res.json();
        // Ignore a read that raced with a local change or save: it could be older than what we just did.
        if (saveTimer.current || saving.current || seq !== writeSeq.current) return;
        if (state?.updatedAt && state.updatedAt < lastWriteAt.current) return; // older than our own save
        const unsavedLocal = lastServer.current !== null && localBody() !== lastServer.current;
        if (state && Array.isArray(state.items) && !unsavedLocal) {
          if (serialize(state.items, state.ownerName, state.version ?? 0, state.knownIds, state.trash, state.theme) !== lastServer.current) {
            applyServerState(state);
          }
        }
        synced.current = true;
        // Server empty: the push effect below seeds it with the current list.
        setSyncTick(t => t + 1);
      } catch (e) { /* offline or local dev: keep local copy */ }
    };
    pull();
    const timer = setInterval(pull, POLL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') pull(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      clearTimeout(saveTimer.current);
    };
  }, []);

  const [syncTick, setSyncTick] = useState(0);

  useEffect(() => {
    if (!synced.current) return;
    if (localBody() === lastServer.current) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      saveTimer.current = null;
      const body = localBody(); // newest state at the moment of saving
      if (body === lastServer.current) return;
      saving.current = true;
      writeSeq.current++;
      let ok = false;
      try {
        const res = await fetch(SYNC_URL, { method: 'PUT', headers: { 'content-type': 'application/json' }, body });
        ok = res.ok;
        if (ok) {
          lastServer.current = body;
          const saved = await res.json().catch(() => null);
          if (saved?.updatedAt) lastWriteAt.current = saved.updatedAt;
        }
      } catch (e) { /* retried below */ }
      saving.current = false;
      writeSeq.current++;
      // Re-check: anything changed during the save gets saved next; a failed save is retried shortly.
      if (ok) setSyncTick(t => t + 1);
      else setTimeout(() => setSyncTick(t => t + 1), 5000);
    }, 400);
  }, [wishlistItems, ownerName, trash, theme, syncTick]);

  // Handle admin view: require password
  const handleSetView = (view) => {
    if (view === 'admin' && !adminUnlocked) {
      setCurrentView('admin_locked');
      setPasswordInput('');
      setPasswordError(false);
    } else {
      setCurrentView(view);
    }
  };

  const handlePasswordSubmit = () => {
    if (passwordInput === ADMIN_PASSWORD) {
      setAdminUnlocked(true);
      setCurrentView('admin');
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  // Handlers
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

  const handleClaimItem = (id, claimerName, note) => {
    setWishlistItems(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          claimed: true,
          claimedBy: claimerName,
          claimedNote: note
        };
      }
      return item;
    }));
  };

  const handleUnclaimItem = (id) => {
    setWishlistItems(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          claimed: false,
          claimedBy: '',
          claimedNote: ''
        };
      }
      return item;
    }));
  };

  const handleAddItem = (newItem) => {
    setWishlistItems(prev => [newItem, ...prev]);
  };

  const handleUpdateItem = (updatedItem) => {
    setWishlistItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
  };

  const handleDeleteItem = (id) => {
    const item = wishlistItems.find(i => i.id === id);
    if (!item) return;
    const cutoff = Date.now() - TRASH_DAYS * 24 * 60 * 60 * 1000;
    setWishlistItems(prev => prev.filter(i => i.id !== id));
    setTrash(prev => [{ ...item, deletedAt: Date.now() }, ...prev.filter(t => t.id !== id && (t.deletedAt ?? 0) > cutoff)]);
  };

  const handleRestoreItem = (id) => {
    const item = trash.find(t => t.id === id);
    if (!item) return;
    const { deletedAt, ...restored } = item; // eslint-disable-line no-unused-vars
    setWishlistItems(prev => [restored, ...prev.filter(i => i.id !== id)]);
    setTrash(prev => prev.filter(t => t.id !== id));
  };

  const handlePurgeItem = (id) => setTrash(prev => prev.filter(t => t.id !== id));

  const handleEmptyTrash = () => setTrash([]);

  const handleResetClaims = () => {
    if (window.confirm("Are you sure you want to reset all claimed gifts to available?")) {
      setWishlistItems(prev => prev.map(item => ({ ...item, claimed: false, claimedBy: '', claimedNote: '' })));
    }
  };

  const handleRestoreDefaults = () => {
    if (window.confirm("Reset the wishlist to the default items? Items you added will be removed.")) {
      setWishlistItems(DEFAULT_WISHLIST);
    }
  };

  const handleImportWishlist = (importedData) => {
    setWishlistItems(importedData);
  };

  return (
    <ThemeContext.Provider value={themeConfig}>
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <Snowfall variant={themeConfig.particles} />

      <Header 
        currentView={currentView}
        setCurrentView={handleSetView}
        wishlistItems={wishlistItems}
        ownerName={ownerName}
      />

      <main style={{ flex: 1, position: 'relative', zIndex: 10, paddingBottom: '60px' }}>
        {currentView === 'quiz' && (
          <Quiz 
            onCompleteQuiz={handleCompleteQuiz}
            ownerName={ownerName}
          />
        )}

        {currentView === 'result' && quizAnswers && (
          <QuizResult 
            quizAnswers={quizAnswers}
            wishlistItems={wishlistItems}
            onClaimItem={handleClaimItem}
            onUnclaimItem={handleUnclaimItem}
            onRetakeQuiz={() => setCurrentView('quiz')}
            ownerName={ownerName}
            adminPassword={ADMIN_PASSWORD}
          />
        )}

        {currentView === 'gallery' && (
          <WishlistGallery 
            wishlistItems={wishlistItems}
            onClaimItem={handleClaimItem}
            onUnclaimItem={handleUnclaimItem}
            ownerName={ownerName}
            adminPassword={ADMIN_PASSWORD}
          />
        )}

        {/* Password Lock Screen for Admin */}
        {currentView === 'admin_locked' && (
          <div style={{ maxWidth: '420px', margin: '80px auto', padding: '0 20px' }}>
            <div className="glass-card animate-fade-in" style={{ padding: '40px', textAlign: 'center', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Lock style={{ width: '32px', height: '32px' }} />
              </div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }} className="gold-gradient-text">
                Admin Access Required 🔒
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '24px' }}>
                Enter the owner password to edit the wishlist.
              </p>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                <input 
                  type="password"
                  placeholder="Enter password..."
                  value={passwordInput}
                  onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handlePasswordSubmit(); }}
                  style={{ 
                    flex: 1, 
                    padding: '12px 16px', 
                    borderRadius: '12px', 
                    background: 'rgba(255, 255, 255, 0.05)', 
                    border: passwordError ? '2px solid #e11d48' : '1px solid rgba(255, 255, 255, 0.15)', 
                    color: '#fff', 
                    fontSize: '1rem', 
                    outline: 'none',
                    textAlign: 'center',
                    letterSpacing: '0.2em'
                  }}
                />
                <button onClick={handlePasswordSubmit} className="festive-btn-primary" style={{ padding: '12px 20px' }}>
                  <KeyRound style={{ width: '18px', height: '18px' }} />
                  Unlock
                </button>
              </div>

              {passwordError && (
                <p style={{ color: '#e11d48', fontSize: '0.85rem', fontWeight: 600 }}>
                  ❌ Wrong password. Try again!
                </p>
              )}

              <button 
                onClick={() => setCurrentView('quiz')} 
                className="festive-btn-secondary" 
                style={{ marginTop: '12px', fontSize: '0.85rem' }}
              >
                ← Back to Quiz
              </button>
            </div>
          </div>
        )}

        {currentView === 'admin' && (
          <AdminWishlist 
            wishlistItems={wishlistItems}
            onAddItem={handleAddItem}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            trash={trash}
            trashDays={TRASH_DAYS}
            onRestoreItem={handleRestoreItem}
            onPurgeItem={handlePurgeItem}
            onEmptyTrash={handleEmptyTrash}
            onResetClaims={handleResetClaims}
            onRestoreDefaults={handleRestoreDefaults}
            onImportWishlist={handleImportWishlist}
            ownerName={ownerName}
            onUpdateOwnerName={setOwnerName}
            theme={theme}
            onChangeTheme={setTheme}
          />
        )}
      </main>

      <footer style={{ position: 'relative', zIndex: 10, padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', background: 'var(--footer-bg)' }}>
        <p style={{ margin: 0 }}>
          {themeConfig.emoji} <strong>{ownerName}'s {themeConfig.footer}</strong> • Built with React & Vite
        </p>
        {theme === 'birthday' && (
          <p style={{ margin: '6px 0 0', fontSize: '0.75rem', opacity: 0.8 }}>
            Marble photo: <a href="https://commons.wikimedia.org/wiki/File:Calacatta_Gold_QUADRA.jpg" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>Calacatta Gold</a> by Irvanderss,{' '}
            <a href="https://creativecommons.org/licenses/by-sa/4.0" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>CC BY-SA 4.0</a> (cropped and retouched)
          </p>
        )}
      </footer>
    </div>
    </ThemeContext.Provider>
  );
}
