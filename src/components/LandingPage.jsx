import React from 'react';
import { Link2, Sparkles, Share2, Users, Gift, Palette, Smartphone, Lock, ArrowRight, Plus, Search, Bot } from 'lucide-react';
import { THEMES } from '../ThemeContext';

const FEATURES = [
  { icon: Link2, title: 'Add gifts from a link', text: 'Paste a link to anything you want. GiftBloom finds the name, photo and price for you.' },
  { icon: Search, title: 'A gift catalog', text: 'Search and scroll through gifts with their photo, price and link, then add any of them to your wishlist in one tap.' },
  { icon: Bot, title: 'Bloom AI', text: 'Tell Bloom who the gift is for and your budget. It suggests real gifts from the catalog.' },
  { icon: Sparkles, title: 'A quiz that picks the gift', text: 'Five quick questions about budget and taste match friends and family to the right gift, never over budget.' },
  { icon: Share2, title: 'One invite link', text: 'Send a single link. It opens your wishlist, and it is saved to their account so they never need it again.' },
  { icon: Users, title: 'Shared with me', text: 'Every wishlist you are invited to lives in one tab, like “Arav’s wishlist”, with its own quiz and gifts.' },
  { icon: Gift, title: 'No double gifts', text: 'Claim a gift so nobody else buys the same thing. The owner can see what has been taken.' },
  { icon: Palette, title: 'Make it yours', text: 'Pick a look for your wishlist: Classic, Birthday or Christmas. Switch any time.' },
  { icon: Smartphone, title: 'Works on any phone', text: 'Open it on a phone, tablet or computer. Your changes save automatically.' },
  { icon: Lock, title: 'Private by invite', text: 'Only people with your link can open your wishlist. You can make a new link whenever you like.' }
];

const STEPS = [
  ['1', 'Make your wishlist', 'Create an account and paste in links to the things you want.'],
  ['2', 'Share your link', 'Send your invite link to friends and family.'],
  ['3', 'They take the quiz', 'It picks gifts that fit their budget, and they claim one.']
];

const card = { padding: '22px' };

// The public home page, for visitors who are not logged in.
export default function LandingPage({ onSignUp, onLogIn }) {
  return (
    <main style={{ flex: 1, position: 'relative', zIndex: 10 }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 20px 70px' }}>

        {/* Hero / welcome */}
        <section className="glass-card animate-fade-in" style={{ padding: '44px 32px', textAlign: 'center', marginBottom: '26px' }}>
            <>
              <h1 style={{ fontSize: 'clamp(2rem, 6vw, 3.2rem)', lineHeight: 1.1, margin: '0 auto 14px', maxWidth: '760px' }} className="gold-gradient-text">
                A wishlist your friends can actually shop from
              </h1>
              <p style={{ color: '#cbd5e1', fontSize: '1.1rem', maxWidth: '620px', margin: '0 auto 26px', lineHeight: 1.55 }}>
                Make your own wishlist, share one link, and let a quick quiz help friends and family pick the perfect gift.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button onClick={onSignUp} className="festive-btn-primary" style={{ padding: '14px 28px', fontSize: '1rem' }}>Get started free <ArrowRight style={{ width: '18px', height: '18px' }} /></button>
                <button onClick={onLogIn} className="festive-btn-secondary" style={{ padding: '14px 28px', fontSize: '1rem' }}>Log In</button>
              </div>
            </>
        </section>

        {/* Dashboard of features */}
        <h2 style={{ fontSize: '1.3rem', margin: '34px 4px 14px', color: '#e2e8f0' }}>What you get</h2>
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="glass-card" style={card}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(129, 140, 248, 0.16)', color: '#a5b4fc', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                <Icon style={{ width: '22px', height: '22px' }} />
              </div>
              <h3 style={{ fontSize: '1.05rem', margin: '0 0 6px', color: '#f8fafc' }}>{title}</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>{text}</p>
            </div>
          ))}
        </section>

        {/* How it works */}
        <h2 style={{ fontSize: '1.3rem', margin: '40px 4px 14px', color: '#e2e8f0' }}>How it works</h2>
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {STEPS.map(([n, title, text]) => (
            <div key={n} className="glass-card" style={{ ...card, display: 'flex', gap: '14px' }}>
              <div style={{ flexShrink: 0, width: '36px', height: '36px', borderRadius: '50%', background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-color)', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</div>
              <div>
                <h3 style={{ fontSize: '1.02rem', margin: '0 0 4px', color: '#f8fafc' }}>{title}</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>{text}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Looks */}
        <h2 style={{ fontSize: '1.3rem', margin: '40px 4px 14px', color: '#e2e8f0' }}>Pick a look</h2>
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {Object.values(THEMES).map(t => (
            <div key={t.id} className="glass-card" style={{ ...card, display: 'flex', gap: '14px', alignItems: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: t.id === 'birthday' ? 'linear-gradient(135deg,#fffef9,#efe5c8)' : t.id === 'christmas' ? 'linear-gradient(135deg,#dc2626,#166534)' : 'linear-gradient(135deg,#1e293b,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.2)' }}><t.Logo size={30} /></div>
              <div>
                <div style={{ fontWeight: 800, color: '#f8fafc' }}>{t.name}</div>
                <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{t.blurb}</div>
              </div>
            </div>
          ))}
        </section>

        {(
          <section className="glass-card" style={{ padding: '30px', textAlign: 'center', marginTop: '34px' }}>
            <h2 style={{ fontSize: '1.5rem', margin: '0 0 8px' }} className="gold-gradient-text">Ready to make yours?</h2>
            <p style={{ color: '#94a3b8', margin: '0 0 18px' }}>It takes about a minute.</p>
            <button onClick={onSignUp} className="festive-btn-primary" style={{ padding: '13px 26px' }}><Plus style={{ width: '18px', height: '18px' }} /> Create my wishlist</button>
          </section>
        )}
      </div>
      <footer style={{ padding: '22px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'var(--footer-bg)' }}>
        <strong>GiftBloom</strong> • Wishlists made easy
      </footer>
    </main>
  );
}
