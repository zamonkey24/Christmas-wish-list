import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Quiz from './components/Quiz';
import QuizResult from './components/QuizResult';
import WishlistGallery from './components/WishlistGallery';
import AdminWishlist from './components/AdminWishlist';
import Snowfall from './components/Snowfall';
import { DEFAULT_WISHLIST } from './data/initialWishlist';

const WISHLIST_STORAGE_KEY = 'festive_gift_quiz_items_v7';
const OWNER_NAME_STORAGE_KEY = 'festive_gift_quiz_owner_v1';

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

  const [currentView, setCurrentView] = useState('quiz'); // 'quiz' | 'result' | 'gallery' | 'admin'
  const [quizAnswers, setQuizAnswers] = useState(null);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlistItems));
  }, [wishlistItems]);

  useEffect(() => {
    localStorage.setItem(OWNER_NAME_STORAGE_KEY, ownerName);
  }, [ownerName]);

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
      {/* Festive Snow Effect Canvas */}
      <Snowfall />

      {/* App Header */}
      <Header 
        currentView={currentView}
        setCurrentView={setCurrentView}
        wishlistItems={wishlistItems}
        ownerName={ownerName}
      />

      {/* Main View Router */}
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
            onRetakeQuiz={() => setCurrentView('quiz')}
            ownerName={ownerName}
          />
        )}

        {currentView === 'gallery' && (
          <WishlistGallery 
            wishlistItems={wishlistItems}
            onClaimItem={handleClaimItem}
            ownerName={ownerName}
          />
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

      {/* Footer */}
      <footer style={{ position: 'relative', zIndex: 10, padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', background: 'rgba(9, 14, 26, 0.9)' }}>
        <p style={{ margin: 0 }}>
          🎄 <strong>{ownerName}'s Personalized Christmas Wishlist Quiz</strong> • Built with React & Vite
        </p>
      </footer>
    </div>
  );
}
