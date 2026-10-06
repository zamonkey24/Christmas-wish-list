import React from 'react';
import { Sparkles, Gift, Settings, List, HeartHandshake } from 'lucide-react';

export default function Header({ currentView, setCurrentView, wishlistItems, ownerName }) {
  const claimedCount = wishlistItems.filter(i => i.claimed).length;

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 50, padding: '16px 24px', backdropFilter: 'blur(12px)', background: 'rgba(9, 14, 26, 0.85)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        
        {/* Brand */}
        <div 
          onClick={() => setCurrentView('quiz')} 
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
        >
          <div 
            style={{ 
              width: '46px', 
              height: '46px', 
              borderRadius: '16px', 
              background: 'linear-gradient(135deg, #e11d48, #be123c)', 
              border: '2px solid #fbbf24',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '1.6rem',
              boxShadow: '0 4px 14px rgba(225, 29, 72, 0.5), 0 0 10px rgba(251, 191, 36, 0.3)',
              position: 'relative'
            }}
            title="Santa's Secret Wishlist"
          >
            🎁
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }} className="gold-gradient-text">
                {ownerName ? `${ownerName}'s Christmas Quiz` : "My Holiday Wishlist Quiz"}
              </h1>
              <span className="glass-pill" style={{ padding: '2px 8px', fontSize: '0.7rem', color: '#fbbf24', fontWeight: 600 }}>
                2026 Edition ❄️
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
              Answer 4 questions to discover the perfect gift!
            </p>
          </div>
        </div>

        {/* Navigation Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          
          <button
            onClick={() => setCurrentView('quiz')}
            className={currentView === 'quiz' ? 'festive-btn-primary' : 'festive-btn-secondary'}
            style={{ padding: '8px 16px', fontSize: '0.9rem' }}
          >
            <Sparkles style={{ width: '16px', height: '16px' }} />
            Take Quiz
          </button>

          <button
            onClick={() => setCurrentView('gallery')}
            className={currentView === 'gallery' ? 'festive-btn-primary' : 'festive-btn-secondary'}
            style={{ padding: '8px 16px', fontSize: '0.9rem' }}
          >
            <List style={{ width: '16px', height: '16px' }} />
            All Gifts ({wishlistItems.length})
          </button>

          <button
            onClick={() => setCurrentView('admin')}
            className={currentView === 'admin' ? 'festive-btn-primary' : 'festive-btn-secondary'}
            style={{ padding: '8px 16px', fontSize: '0.9rem', borderColor: currentView === 'admin' ? '#fbbf24' : undefined }}
          >
            <Settings style={{ width: '16px', height: '16px' }} />
            Edit Wishlist
          </button>

          {/* Claimed Stat Badge */}
          <div className="glass-pill" style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#e2e8f0' }}>
            <HeartHandshake style={{ width: '16px', height: '16px', color: '#10b981' }} />
            <span><strong>{claimedCount}</strong> Claimed</span>
          </div>

        </div>
      </div>
    </header>
  );
}
