import React, { useState } from 'react';
import { Search, Filter, ExternalLink, Gift, CheckCircle2, Sparkles, Lock, KeyRound, X, Undo2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import ProductLink from './ProductLink';

export default function WishlistGallery({ wishlistItems, onClaimItem, onUnclaimItem, ownerName, adminPassword }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [claimFilter, setClaimFilter] = useState('all'); // all, available, claimed
  const [sortBy, setSortBy] = useState('priority'); // priority, price-asc, price-desc

  // Claim Modal states
  const [claimingItem, setClaimingItem] = useState(null);
  const [claimerName, setClaimerName] = useState('');
  const [claimNote, setClaimNote] = useState('');
  const [showClaimModal, setShowClaimModal] = useState(false);

  // Claim Details / Unclaim Modal states
  const [showClaimDetailsModal, setShowClaimDetailsModal] = useState(false);
  const [claimDetailsItem, setClaimDetailsItem] = useState(null);
  const [unclaimPasswordInput, setUnclaimPasswordInput] = useState('');
  const [unclaimPasswordError, setUnclaimPasswordError] = useState(false);
  const [showUnclaimConfirm, setShowUnclaimConfirm] = useState(false);

  const categories = ['All', 'Family', 'Tech & Gadgets', 'Cozy & Home', 'Fun & Games', 'Experiences & Activities', 'Creative & Books', 'Everyday Essentials'];

  const filteredItems = wishlistItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesClaim = claimFilter === 'all' 
      ? true 
      : claimFilter === 'available' ? !item.claimed : item.claimed;

    return matchesSearch && matchesCategory && matchesClaim;
  }).sort((a, b) => {
    if (sortBy === 'price-asc') return a.price - b.price;
    if (sortBy === 'price-desc') return b.price - a.price;
    // Priority order fallback
    return a.id.localeCompare(b.id);
  });

  const handleOpenClaimModal = (item) => {
    setClaimingItem(item);
    setShowClaimModal(true);
  };

  const handleConfirmClaim = () => {
    if (!claimerName.trim()) return;

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    onClaimItem(claimingItem.id, claimerName.trim(), claimNote.trim());
    setShowClaimModal(false);
    setClaimerName('');
    setClaimNote('');
  };

  const handleOpenClaimDetails = (item) => {
    setClaimDetailsItem(item);
    setShowClaimDetailsModal(true);
    setUnclaimPasswordInput('');
    setUnclaimPasswordError(false);
    setShowUnclaimConfirm(false);
  };

  const handleUnclaimWithPassword = () => {
    if (unclaimPasswordInput === adminPassword) {
      onUnclaimItem(claimDetailsItem.id);
      setShowClaimDetailsModal(false);
      setUnclaimPasswordInput('');
      setUnclaimPasswordError(false);
      setShowUnclaimConfirm(false);
    } else {
      setUnclaimPasswordError(true);
    }
  };

  return (
    <div style={{ maxWidth: '1140px', margin: '30px auto', padding: '0 20px' }}>
      
      {/* Title & Stats */}
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '2rem', marginBottom: '6px' }} className="gold-gradient-text">
            {ownerName || "My"} Full Christmas Wishlist 🎁
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '8px' }}>
            Browse all requested items, filter by budget or category, or claim a gift directly!
          </p>
          <div className="glass-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', fontSize: '0.8rem', color: '#fbbf24', background: 'rgba(251, 191, 36, 0.1)', borderColor: 'rgba(251, 191, 36, 0.25)' }}>
            ℹ️ <strong>Photo Disclaimer:</strong> Website photos are illustrative previews. Click 'View Product Link' to view exact Amazon listing photos!
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-card" style={{ padding: '20px', marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Top Controls: Search & Selects */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          
          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: '#64748b' }} />
            <input 
              type="text"
              placeholder="Search gifts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '10px 14px 10px 42px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
            />
          </div>

          {/* Sort Select */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ padding: '10px 14px', borderRadius: '12px', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#fff', fontSize: '0.9rem', outline: 'none', cursor: 'pointer' }}
          >
            <option value="priority">Sort by Priority 🌟</option>
            <option value="price-asc">Price: Low to High ($)</option>
            <option value="price-desc">Price: High to Low ($$$)</option>
          </select>

          {/* Status Filter */}
          <div style={{ display: 'flex', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.05)', padding: '3px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'available', label: 'Available 🎁' },
              { id: 'claimed', label: 'Claimed ✔️' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setClaimFilter(f.id)}
                style={{
                  flex: 1,
                  padding: '6px 12px',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: claimFilter === f.id ? '#fbbf24' : 'transparent',
                  color: claimFilter === f.id ? '#0f172a' : '#94a3b8'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className="glass-pill"
              style={{
                padding: '6px 14px',
                fontSize: '0.8rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                background: selectedCategory === cat ? 'rgba(251, 191, 36, 0.2)' : undefined,
                color: selectedCategory === cat ? '#fbbf24' : '#cbd5e1',
                borderColor: selectedCategory === cat ? '#fbbf24' : undefined
              }}
            >
              {cat}
            </button>
          ))}
        </div>

      </div>

      {/* Wishlist Cards Grid */}
      {filteredItems.length === 0 ? (
        <div className="glass-card" style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
          <Gift style={{ width: '48px', height: '48px', color: '#64748b', margin: '0 auto 12px' }} />
          <h3 style={{ color: '#e2e8f0', marginBottom: '4px' }}>No gifts match your current filter</h3>
          <p style={{ fontSize: '0.9rem' }}>Try searching another term or resetting your category filter!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '22px' }}>
          {filteredItems.map(item => (
            <div 
              key={item.id} 
              className="glass-card animate-fade-in" 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                overflow: 'hidden',
                opacity: item.claimed ? 0.75 : 1
              }}
            >
              <div style={{ height: '180px', position: 'relative', overflow: 'hidden' }}>
                <img 
                  src={item.imageUrl} 
                  alt={item.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
                <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(6px)', padding: '3px 8px', borderRadius: '6px', color: '#fbbf24', fontSize: '0.75rem', fontWeight: 700 }}>
                  {item.priority}
                </div>
                <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#e11d48', color: '#fff', padding: '3px 10px', borderRadius: '6px', fontWeight: 800, fontSize: '0.9rem' }}>
                  ${item.price}
                </div>
              </div>

              <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700, textTransform: 'uppercase' }}>
                    {item.category}
                  </span>
                  <h3 style={{ fontSize: '1.1rem', margin: '6px 0 8px', color: '#f8fafc', lineHeight: 1.3 }}>
                    {item.title}
                  </h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '16px', lineHeight: 1.4 }}>
                    {item.description}
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {item.claimed ? (
                    <button
                      onClick={() => handleOpenClaimDetails(item)}
                      style={{ 
                        padding: '8px 12px', 
                        background: 'rgba(16, 185, 129, 0.15)', 
                        border: '1px solid rgba(16, 185, 129, 0.3)', 
                        borderRadius: '10px', 
                        color: '#10b981', 
                        textAlign: 'center', 
                        fontSize: '0.85rem', 
                        fontWeight: 700, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      title="Click to see who claimed this & manage"
                    >
                      <CheckCircle2 style={{ width: '16px', height: '16px' }} />
                      ✅ Claimed — Click for Details
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenClaimModal(item)}
                      className="festive-btn-primary"
                      style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                    >
                      <Gift style={{ width: '16px', height: '16px' }} />
                      Claim Gift
                    </button>
                  )}
                  <ProductLink
                    item={item}
                    className="festive-btn-secondary"
                    style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                    iconSize="14px"
                  >
                    View Product Link
                  </ProductLink>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}

      {/* Claim Modal */}
      {showClaimModal && claimingItem && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '440px', padding: '28px', background: '#0f172a', border: '1px solid rgba(251, 191, 36, 0.4)' }}>
            
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.3rem', color: '#f8fafc', marginBottom: '6px' }}>
                Claim "{claimingItem.title}"
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                Enter your name so the gift owner knows this item is reserved!
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>
                  Your Name *
                </label>
                <input 
                  type="text"
                  placeholder="e.g. Uncle Bob or Cousin Jane"
                  value={claimerName}
                  onChange={(e) => setClaimerName(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>
                  Optional Note
                </label>
                <textarea 
                  rows={3}
                  placeholder="e.g. Excited to get this for you!"
                  value={claimNote}
                  onChange={(e) => setClaimNote(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff', fontSize: '0.85rem', outline: 'none', resize: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setShowClaimModal(false)}
                className="festive-btn-secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmClaim}
                disabled={!claimerName.trim()}
                className="festive-btn-primary"
                style={{ flex: 1, opacity: !claimerName.trim() ? 0.5 : 1 }}
              >
                Confirm Claim 🎉
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Claim Details / Unclaim Modal */}
      {showClaimDetailsModal && claimDetailsItem && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '460px', padding: '28px', background: '#0f172a', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
            
            {/* Close button */}
            <button
              onClick={() => setShowClaimDetailsModal(false)}
              style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <X style={{ width: '20px', height: '20px' }} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <CheckCircle2 style={{ width: '28px', height: '28px' }} />
              </div>
              <h3 style={{ fontSize: '1.3rem', color: '#f8fafc', marginBottom: '4px' }}>
                Claim Details
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                "{claimDetailsItem.title}"
              </p>
            </div>

            {/* Claim Info Card */}
            <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Claimed By:</span>
                <span style={{ color: '#10b981', fontWeight: 700, fontSize: '1rem' }}>
                  {claimDetailsItem.claimedBy || 'Secret Santa'}
                </span>
              </div>
              {claimDetailsItem.claimedNote && (
                <div style={{ marginTop: '8px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Note:</span>
                  <p style={{ color: '#cbd5e1', fontSize: '0.9rem', marginTop: '4px', fontStyle: 'italic', lineHeight: 1.4 }}>
                    "{claimDetailsItem.claimedNote}"
                  </p>
                </div>
              )}
            </div>

            {/* Unclaim Section */}
            {!showUnclaimConfirm ? (
              <div style={{ textAlign: 'center' }}>
                <button 
                  onClick={() => setShowUnclaimConfirm(true)}
                  style={{ 
                    background: 'rgba(225, 29, 72, 0.12)', 
                    border: '1px solid rgba(225, 29, 72, 0.3)', 
                    borderRadius: '10px', 
                    padding: '10px 20px', 
                    color: '#fb7185', 
                    fontWeight: 600, 
                    fontSize: '0.85rem', 
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Undo2 style={{ width: '14px', height: '14px' }} />
                  Unclaim This Item
                </button>
                <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '8px' }}>
                  🔒 Requires owner password to unclaim
                </p>
              </div>
            ) : (
              <div style={{ background: 'rgba(225, 29, 72, 0.08)', border: '1px solid rgba(225, 29, 72, 0.25)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Lock style={{ width: '16px', height: '16px', color: '#fb7185' }} />
                  <span style={{ color: '#fb7185', fontWeight: 700, fontSize: '0.9rem' }}>Enter Owner Password to Unclaim</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="password"
                    placeholder="Password..."
                    value={unclaimPasswordInput}
                    onChange={(e) => { setUnclaimPasswordInput(e.target.value); setUnclaimPasswordError(false); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleUnclaimWithPassword(); }}
                    style={{ 
                      flex: 1, 
                      padding: '10px 14px', 
                      borderRadius: '10px', 
                      background: 'rgba(255, 255, 255, 0.05)', 
                      border: unclaimPasswordError ? '2px solid #e11d48' : '1px solid rgba(255, 255, 255, 0.15)', 
                      color: '#fff', 
                      fontSize: '0.9rem', 
                      outline: 'none',
                      textAlign: 'center',
                      letterSpacing: '0.15em'
                    }}
                  />
                  <button 
                    onClick={handleUnclaimWithPassword}
                    style={{ 
                      padding: '10px 16px', 
                      borderRadius: '10px', 
                      background: '#e11d48', 
                      border: 'none', 
                      color: '#fff', 
                      fontWeight: 700, 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.85rem'
                    }}
                  >
                    <Undo2 style={{ width: '14px', height: '14px' }} />
                    Unclaim
                  </button>
                </div>
                {unclaimPasswordError && (
                  <p style={{ color: '#e11d48', fontSize: '0.8rem', fontWeight: 600, marginTop: '8px' }}>
                    ❌ Wrong password!
                  </p>
                )}
                <button 
                  onClick={() => { setShowUnclaimConfirm(false); setUnclaimPasswordInput(''); setUnclaimPasswordError(false); }}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem', marginTop: '8px' }}
                >
                  ← Cancel
                </button>
              </div>
            )}

            {/* Close Modal Button */}
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button 
                onClick={() => setShowClaimDetailsModal(false)}
                className="festive-btn-secondary"
                style={{ fontSize: '0.85rem' }}
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
