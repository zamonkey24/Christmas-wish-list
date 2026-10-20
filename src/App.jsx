import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Quiz from './components/Quiz';
import QuizResult from './components/QuizResult';
import WishlistGallery from './components/WishlistGallery';
import AdminWishlist from './components/AdminWishlist';
import Snowfall from './components/Snowfall';
import { DEFAULT_WISHLIST } from './data/initialWishlist';
import { Lock, KeyRound } from 'lucide-react';

const WISHLIST_STORAGE_KEY = 'festive_gift_quiz_items_v9';
const OWNER_NAME_STORAGE_KEY = 'festive_gift_quiz_owner_v1';
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

  const [ownerName, setOwnerName] = useState(() => {
    return localStorage.getItem(OWNER_NAME_STORAGE_KEY) || 'Arav';
  });

  const [currentView, setCurrentView] = useState('quiz');
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
    setQuizAnswers(answers);
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
    setWishlistItems(prev => prev.filter(item => item.id !== id));
  };

  const handleResetClaims = () => {
    if (window.confirm("Are you sure you want to reset all claimed gifts to available?")) {
      setWishlistItems(prev => prev.map(item => ({ ...item, claimed: false, claimedBy: '', claimedNote: '' })));
    }
  };

  const handleRestoreDefaults = () => {
    if (window.confirm("Reset wishlist to your exact 7 curated items?")) {
      setWishlistItems(DEFAULT_WISHLIST);
    }
  };

  const handleImportWishlist = (importedData) => {
    setWishlistItems(importedData);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <Snowfall />

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
            onResetClaims={handleResetClaims}
            onRestoreDefaults={handleRestoreDefaults}
            onImportWishlist={handleImportWishlist}
            ownerName={ownerName}
            onUpdateOwnerName={setOwnerName}
          />
        )}
      </main>

      <footer style={{ position: 'relative', zIndex: 10, padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', background: 'rgba(9, 14, 26, 0.9)' }}>
        <p style={{ margin: 0 }}>
          🎄 <strong>{ownerName}'s Personalized Christmas Wishlist Quiz</strong> • Built with React & Vite
        </p>
      </footer>
    </div>
  );
}
