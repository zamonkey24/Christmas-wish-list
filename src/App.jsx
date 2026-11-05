import React, { useState, useEffect, useCallback } from 'react';
import AccountBar from './components/AccountBar';
import AccountPage from './components/AccountPage';
import AuthScreen from './components/AuthScreen';
import InviteLanding from './components/InviteLanding';
import LandingPage from './components/LandingPage';
import SharedWithMe from './components/SharedWithMe';
import Snowfall from './components/Snowfall';
import { Notice, Spinner } from './components/ui';
import ListView from './ListView';
import { THEMES, ThemeContext } from './ThemeContext';
import { api } from './api';

const PENDING_INVITE_KEY = 'giftbloom_pending_invite';
const AUTH_ROUTES = ['login', 'signup', 'forgot', 'reset'];

const safeGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const safeSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* storage unavailable */ } };
const routeFromHash = () => {
  const r = window.location.hash.replace(/^#\/?/, '');
  return ['login', 'signup', 'forgot'].includes(r) ? r : 'home';
};

export default function App() {
  const [boot, setBoot] = useState('loading');
  const [me, setMe] = useState(null);         // { user, myListId, joined, marketingOptIn, isAdmin } when logged in
  const [tab, setTab] = useState('home');     // home | mine | shared | account (logged in)
  const [open, setOpen] = useState(null);     // a wishlist opened from "Shared with me" or an invite: { listId, code? }
  const [invite, setInvite] = useState(null); // an invite waiting for the visitor to log in: { code, listId, ownerName }
  const [route, setRoute] = useState(routeFromHash); // home | login | signup | forgot | reset (logged out)
  const [resetToken, setResetToken] = useState(null);
  const [message, setMessage] = useState(null); // a simple full-page message, e.g. after unsubscribing
  const [notice, setNotice] = useState('');

  // The home page and account screens use the calm Classic look; an open wishlist uses its own theme.
  // ?theme=birthday|christmas|classic previews a look on this device only.
  const previewTheme = new URLSearchParams(window.location.search).get('theme');
  const [theme, setTheme] = useState(THEMES[previewTheme] ? previewTheme : 'classic');
  const themeConfig = THEMES[theme];
  const changeTheme = useCallback((t) => { if (THEMES[t] && !THEMES[previewTheme]) setTheme(t); }, [previewTheme]);

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

  // Log In / Sign Up live on their own page, reachable with the browser's back button.
  const navigate = useCallback((r) => {
    const url = window.location.pathname + window.location.search + (r === 'home' || r === 'reset' ? '' : `#/${r}`);
    window.history.pushState(null, '', url);
    setRoute(r);
    window.scrollTo(0, 0);
  }, []);
  useEffect(() => {
    const onPop = () => setRoute(prev => (prev === 'reset' ? prev : routeFromHash()));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const refreshMe = useCallback(async () => {
    const body = await api('GET', 'me');
    setMe(body.user ? body : null);
    return body.user ? body : null;
  }, []);

  // An invite link: logged-in people get it saved to their account right away; others are asked to log in or sign up.
  const handleInvite = useCallback(async (code, loggedIn) => {
    try {
      const info = await api('GET', `invite/${code}`);
      if (loggedIn) {
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
      const take = (k) => { const v = url.searchParams.get(k); if (v) url.searchParams.delete(k); return v; };
      const reset = take('reset');
      const unsubscribe = take('unsubscribe');
      let code = take('invite');
      if (reset || unsubscribe || code) window.history.replaceState(null, '', url.pathname + url.search + url.hash);
      if (code) safeSet(PENDING_INVITE_KEY, code); else code = safeGet(PENDING_INVITE_KEY);

      if (unsubscribe) {
        try {
          await api('POST', 'unsubscribe', { token: unsubscribe });
          setMessage({ title: 'You are unsubscribed', text: 'You will not get any more updates from GiftBloom. Your account and wishlists are not affected.' });
        } catch (e) {
          setMessage({ title: 'That link did not work', text: e.message });
        }
      }
      if (reset) { setResetToken(reset); setRoute('reset'); }

      let loggedIn = null;
      try { loggedIn = await refreshMe(); } catch { /* offline: show the home page */ }
      if (code && !reset) await handleInvite(code, Boolean(loggedIn));
      setBoot('ready');
    })();
  }, [refreshMe, handleInvite]);

  const onAuthed = async (meBody, kind) => {
    setMe(meBody);
    setResetToken(null);
    setMessage(null);
    navigate('home');
    setTab(kind === 'signup' ? 'mine' : 'home');
    const code = safeGet(PENDING_INVITE_KEY);
    if (code) { setOpen(null); await handleInvite(code, true); }
  };

  const signOut = async () => {
    try { await api('POST', 'auth/logout', {}); } catch { /* ignore */ }
    setMe(null);
    setOpen(null);
    setInvite(null);
    setTab('home');
    setTheme('classic');
    navigate('home');
  };

  const goTab = (t) => { setTab(t); setOpen(null); setMessage(null); if (!me) navigate('home'); };

  const shell = (children) => (
    <ThemeContext.Provider value={themeConfig}>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', '--accountbar-h': '46px' }}>
        <Snowfall variant={themeConfig.particles} />
        <AccountBar
          user={me?.user}
          tab={open ? 'shared' : tab}
          sharedCount={me?.joined?.length || 0}
          authMode={AUTH_ROUTES.includes(route) ? route : null}
          onTab={goTab}
          onSignOut={signOut}
          onLogIn={() => navigate('login')}
          onSignUp={() => navigate('signup')}
        />
        {notice && (
          <div style={{ position: 'relative', zIndex: 20, maxWidth: '760px', width: '100%', margin: '14px auto 0', padding: '0 20px' }}>
            <Notice onClose={() => setNotice('')}>{notice}</Notice>
          </div>
        )}
        {children}
      </div>
    </ThemeContext.Provider>
  );

  if (boot === 'loading') return shell(<Spinner />);

  if (message) {
    return shell(
      <main style={{ flex: 1, position: 'relative', zIndex: 10 }}>
        <div style={{ maxWidth: '480px', margin: '60px auto', padding: '0 20px' }}>
          <div className="glass-card" style={{ padding: '32px', textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.5rem', margin: '0 0 8px' }} className="gold-gradient-text">{message.title}</h1>
            <p style={{ color: '#94a3b8', margin: '0 0 20px' }}>{message.text}</p>
            <button className="festive-btn-primary" onClick={() => setMessage(null)}>Go to GiftBloom</button>
          </div>
        </div>
      </main>
    );
  }

  // A password-reset link always opens the reset page, even if someone is already logged in.
  if (route === 'reset' && resetToken) {
    return shell(
      <AuthScreen mode="reset" resetToken={resetToken} onAuthed={onAuthed} onNavigate={navigate} onBack={() => { setResetToken(null); navigate('home'); }} />
    );
  }

  // ----- logged out
  if (!me) {
    if (AUTH_ROUTES.includes(route)) {
      return shell(
        <AuthScreen
          mode={route}
          invite={invite}
          resetToken={resetToken}
          onAuthed={onAuthed}
          onNavigate={navigate}
          onBack={() => { setResetToken(null); navigate('home'); }}
          onOpenAnonymously={invite ? () => { setOpen({ listId: invite.listId, code: invite.code }); navigate('home'); } : undefined}
        />
      );
    }
    if (open) return shell(<ListView key={open.listId} listId={open.listId} code={open.code} onTheme={changeTheme} />);
    if (invite) {
      return shell(
        <InviteLanding
          invite={invite}
          onSignUp={() => navigate('signup')}
          onLogIn={() => navigate('login')}
          onLook={() => setOpen({ listId: invite.listId, code: invite.code })}
        />
      );
    }
    return shell(<LandingPage onSignUp={() => navigate('signup')} onLogIn={() => navigate('login')} />);
  }

  // ----- logged in
  if (open) return shell(<ListView key={open.listId} listId={open.listId} code={open.code} onTheme={changeTheme} />);
  if (tab === 'mine') return shell(<ListView key={me.myListId} listId={me.myListId} onTheme={changeTheme} />);
  if (tab === 'shared') {
    return shell(
      <main style={{ flex: 1, position: 'relative', zIndex: 10 }}>
        <SharedWithMe joined={me.joined || []} onOpen={(l) => setOpen(l)} onChanged={refreshMe} />
      </main>
    );
  }
  if (tab === 'account') return shell(<AccountPage me={me} onChanged={refreshMe} onSignOut={signOut} />);

  return shell(
    <LandingPage user={me.user} sharedCount={me.joined?.length || 0} onOpenMine={() => setTab('mine')} onOpenShared={() => setTab('shared')} />
  );
}
