import React, { useState, useEffect, useCallback } from 'react';
import AccountBar from './components/AccountBar';
import AuthScreen from './components/AuthScreen';
import SharedWithMe from './components/SharedWithMe';
import Snowfall from './components/Snowfall';
import { Notice, Spinner } from './components/ui';
import ListView from './ListView';
import { THEMES, ThemeContext } from './ThemeContext';
import { api } from './api';

const PENDING_INVITE_KEY = 'giftbloom_pending_invite';
const THEME_STORAGE_KEY = 'festive_gift_quiz_theme_v1';

const safeGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const safeSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* storage unavailable */ } };

export default function App() {
  const [boot, setBoot] = useState('loading');
  const [me, setMe] = useState(null);       // { user, myListId, joined } when signed in
  const [tab, setTab] = useState('mine');   // mine | shared
  const [open, setOpen] = useState(null);   // a wishlist opened from "Shared with me" or an invite: { listId, code? }
  const [invite, setInvite] = useState(null); // an invite waiting for the visitor to sign in: { code, listId, ownerName }
  const [authMode, setAuthMode] = useState(null); // null | 'signup' | 'login'
  const [notice, setNotice] = useState('');

  // ?theme=birthday|christmas previews a look on this device only.
  const previewTheme = new URLSearchParams(window.location.search).get('theme');
  const [theme, setTheme] = useState(() => {
    if (THEMES[previewTheme]) return previewTheme;
    const saved = safeGet(THEME_STORAGE_KEY);
    return THEMES[saved] ? saved : 'christmas';
  });
  const themeConfig = THEMES[theme];

  const changeTheme = useCallback((t) => {
    if (!THEMES[t]) return;
    setTheme(t);
    if (!THEMES[previewTheme]) safeSet(THEME_STORAGE_KEY, t);
  }, [previewTheme]);

  useEffect(() => {
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
  }, [theme, themeConfig]);

  const refreshMe = useCallback(async () => {
    const body = await api('GET', 'me');
    setMe(body.user ? body : null);
    return body.user ? body : null;
  }, []);

  // An invite link: signed-in people get it saved to their account right away; others are asked to sign in.
  const handleInvite = useCallback(async (code, signedIn) => {
    try {
      const info = await api('GET', `invite/${code}`);
      if (signedIn) {
        const j = await api('POST', 'join', { code });
        safeSet(PENDING_INVITE_KEY, null);
        await refreshMe();
        if (j.own) { setTab('mine'); setOpen(null); } else { setTab('shared'); setOpen({ listId: j.listId }); }
        setInvite(null);
      } else {
        setInvite({ code, ...info });
      }
    } catch (e) {
      safeSet(PENDING_INVITE_KEY, null);
      setInvite(null);
      setNotice(e.status === 404 ? 'That invite link is not valid anymore. Ask for a new one.' : e.message);
    }
  }, [refreshMe]);

  useEffect(() => {
    (async () => {
      const url = new URL(window.location.href);
      let code = url.searchParams.get('invite');
      if (code) {
        safeSet(PENDING_INVITE_KEY, code);
        url.searchParams.delete('invite');
        window.history.replaceState(null, '', url.pathname + url.search + url.hash);
      } else {
        code = safeGet(PENDING_INVITE_KEY);
      }
      let signedIn = null;
      try { signedIn = await refreshMe(); } catch { /* offline: show sign in */ }
      if (code) await handleInvite(code, Boolean(signedIn));
      setBoot('ready');
    })();
  }, [refreshMe, handleInvite]);

  const onAuthed = async (meBody) => {
    setMe(meBody);
    setAuthMode(null);
    setTab('mine');
    const code = safeGet(PENDING_INVITE_KEY);
    if (code) { setOpen(null); await handleInvite(code, true); }
  };

  const signOut = async () => {
    try { await api('POST', 'auth/logout', {}); } catch { /* ignore */ }
    setMe(null);
    setOpen(null);
    setInvite(null);
    setTab('mine');
  };

  const goTab = (t) => { setTab(t); setOpen(null); };

  const shell = (children, { bar = true } = {}) => (
    <ThemeContext.Provider value={themeConfig}>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', '--accountbar-h': bar ? '46px' : '0px' }}>
        <Snowfall variant={themeConfig.particles} />
        {bar && (
          <AccountBar
            user={me?.user}
            tab={open && tab === 'mine' ? 'shared' : tab}
            sharedCount={me?.joined?.length || 0}
            onTab={goTab}
            onSignOut={signOut}
            onSignIn={() => setAuthMode('signup')}
          />
        )}
        {notice && (
          <div style={{ position: 'relative', zIndex: 20, maxWidth: '760px', width: '100%', margin: '14px auto 0', padding: '0 20px' }}>
            <Notice onClose={() => setNotice('')}>{notice}</Notice>
          </div>
        )}
        {children}
      </div>
    </ThemeContext.Provider>
  );

  if (boot === 'loading') return shell(<Spinner />, { bar: false });

  // Someone looking at a wishlist from an invite link without an account
  if (!me && open) {
    return shell(
      authMode
        ? <main style={{ flex: 1, position: 'relative', zIndex: 10 }}><AuthScreen initialMode={authMode} invite={invite} onAuthed={onAuthed} onCancel={() => setAuthMode(null)} /></main>
        : <ListView key={open.listId} listId={open.listId} code={open.code} onTheme={changeTheme} />
    );
  }

  if (!me) {
    return shell(
      <main style={{ flex: 1, position: 'relative', zIndex: 10 }}>
        <AuthScreen
          initialMode="signup"
          invite={invite}
          onAuthed={onAuthed}
          onOpenAnonymously={invite ? () => setOpen({ listId: invite.listId, code: invite.code }) : undefined}
        />
      </main>,
      { bar: false }
    );
  }

  // Signed in
  if (open) return shell(<ListView key={open.listId} listId={open.listId} code={open.code} onTheme={changeTheme} />);

  if (tab === 'shared') {
    return shell(
      <main style={{ flex: 1, position: 'relative', zIndex: 10 }}>
        <SharedWithMe joined={me.joined || []} onOpen={(l) => setOpen(l)} onChanged={refreshMe} />
      </main>
    );
  }

  return shell(<ListView key={me.myListId} listId={me.myListId} onTheme={changeTheme} />);
}
