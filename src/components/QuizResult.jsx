import React, { useState } from 'react';
import { Sparkles, Gift, ExternalLink, CheckCircle2, RotateCcw, Award, Maximize2, X, Lock, Undo2 } from 'lucide-react';
import confetti from 'canvas-confetti';

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=800&q=80";

export default function QuizResult({ quizAnswers, wishlistItems, onClaimItem, onUnclaimItem, onRetakeQuiz, ownerName, adminPassword }) {
  const [claimingItem, setClaimingItem] = useState(null);
  const [claimerName, setClaimerName] = useState('');
  const [claimNote, setClaimNote] = useState('');
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // Claim Details / Unclaim Modal states
  const [showClaimDetailsModal, setShowClaimDetailsModal] = useState(false);
  const [claimDetailsItem, setClaimDetailsItem] = useState(null);
  const [unclaimPasswordInput, setUnclaimPasswordInput] = useState('');
  const [unclaimPasswordError, setUnclaimPasswordError] = useState(false);
  const [showUnclaimConfirm, setShowUnclaimConfirm] = useState(false);

  const { relationship, budget, categoryVibe, strategy } = quizAnswers;

  // Filter items by relationship tier
  const eligibleItems = wishlistItems.filter(item => {
    if (relationship === 'casual' && item.closenessRequired !== 'casual') return false;
    if (relationship === 'friend' && item.closenessRequired === 'close') return false;
    if (categoryVibe !== 'all' && item.category !== categoryVibe) return false;
    return true;
  });

  // Calculate recommendation bundle or solo item
  const getRecommendations = () => {
    const activeList = eligibleItems.length > 0 ? eligibleItems : wishlistItems;

    // If strategy is combo (bundle of 2-3 items)
    if (strategy === 'combo' && activeList.length >= 2) {
      let bestCombo = [];
      let bestDiff = Infinity;

      for (let i = 0; i < activeList.length; i++) {
        for (let j = i + 1; j < activeList.length; j++) {
          const pairSum = activeList[i].price + activeList[j].price;
          const diff = Math.abs(budget - pairSum);
          if (diff < bestDiff && pairSum <= budget * 1.25) {
            bestDiff = diff;
            bestCombo = [activeList[i], activeList[j]];
          }
          for (let k = j + 1; k < activeList.length; k++) {
            const trioSum = pairSum + activeList[k].price;
            const trioDiff = Math.abs(budget - trioSum);
            if (trioDiff < bestDiff && trioSum <= budget * 1.3) {
              bestDiff = trioDiff;
              bestCombo = [activeList[i], activeList[j], activeList[k]];
            }
          }
        }
      }

      if (bestCombo.length > 0) {
        return { type: 'bundle', items: bestCombo };
      }
    }

    // Default to Solo Flagship Item closest to budget
    const sortedByBudgetFit = [...activeList].sort((a, b) => {
      const diffA = Math.abs(budget - a.price);
      const diffB = Math.abs(budget - b.price);
      return diffA - diffB;
    });

    const primaryItem = sortedByBudgetFit[0] || wishlistItems[0];
    return { type: 'solo', items: [primaryItem] };
  };

  const recommendation = getRecommendations();
  const recommendedItems = recommendation.items;
  const totalPrice = recommendedItems.reduce((acc, curr) => acc + curr.price, 0);

  // Runner-up suggestions
  const runnerUps = wishlistItems.filter(item => !recommendedItems.find(r => r.id === item.id)).slice(0, 3);

  const handleOpenClaimModal = (item) => {
    setClaimingItem(item);
    setShowClaimModal(true);
  };

  const handleConfirmClaim = () => {
    if (!claimerName.trim()) return;
    
    confetti({
      particleCount: 120,
      spread: 80,
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
    <div style={{ maxWidth: '960px', margin: '40px auto', padding: '0 20px' }}>
      
      {/* Banner Result Title */}
      <div className="glass-card animate-fade-in" style={{ padding: '36px', textAlign: 'center', marginBottom: '32px', background: 'radial-gradient(circle at center, rgba(225, 29, 72, 0.18) 0%, rgba(15, 23, 42, 0.85) 100%)' }}>
        <div style={{ inlineSize: 'fit-content', margin: '0 auto 16px', padding: '8px 16px', background: 'rgba(251, 191, 36, 0.15)', border: '1px solid rgba(251, 191, 36, 0.3)', borderRadius: '9999px', display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#fbbf24', fontSize: '0.85rem', fontWeight: 700 }}>
          <Sparkles style={{ width: '16px', height: '16px' }} />
          SANTA'S GIFT MATCH ENGINE
        </div>

        <h2 style={{ fontSize: '2.2rem', marginBottom: '12px' }} className="gold-gradient-text">
          {recommendation.type === 'bundle' 
            ? `Curated ${recommendedItems.length}-Item Christmas Gift Bundle!`
            : `Your Top Matched Christmas Gift!`
          }
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '1rem', maxWidth: '600px', margin: '0 auto 20px' }}>
          Based on your target budget of <strong>${budget}</strong> and preference for {categoryVibe === 'all' ? 'any vibe' : categoryVibe}, here is what {ownerName || "I"} would love most!
        </p>

        {/* Total Cost Badge */}
        <div className="glass-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', padding: '10px 24px' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Total Cost:</span>
          <strong style={{ color: '#10b981', fontSize: '1.4rem' }}>${totalPrice}</strong>
          <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '6px', background: Math.abs(budget - totalPrice) <= 15 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(251, 191, 36, 0.2)', color: Math.abs(budget - totalPrice) <= 15 ? '#10b981' : '#fbbf24' }}>
            {Math.abs(budget - totalPrice) <= 10 ? '✨ Direct Match' : `${totalPrice > budget ? '+$' + (totalPrice - budget) : '-$' + (budget - totalPrice)} target`}
          </span>
        </div>
      </div>

      {/* Recommended Items Cards with Actual Photos */}
      <div style={{ display: 'grid', gridTemplateColumns: recommendedItems.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(290px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        {recommendedItems.map(item => (
          <div key={item.id} className="glass-card animate-fade-in" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
            
            {/* Real Product Image Container */}
            <div 
              style={{ height: '260px', overflow: 'hidden', position: 'relative', background: '#090e1a', cursor: 'pointer' }}
              onClick={() => setPreviewImage(item)}
              title="Click to view full photo"
            >
              <img 
                src={item.imageUrl} 
                alt={item.title} 
                onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMAGE; }}
                style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
              />
              
              {/* Badges */}
              <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', padding: '4px 10px', borderRadius: '8px', color: '#fbbf24', fontSize: '0.8rem', fontWeight: 700, border: '1px solid rgba(251, 191, 36, 0.3)' }}>
                {item.priority}
              </div>

              <div style={{ position: 'absolute', top: '12px', right: '12px', background: '#e11d48', color: '#fff', padding: '4px 12px', borderRadius: '8px', fontSize: '1rem', fontWeight: 800, boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                ${item.price}
              </div>

              <div style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', color: '#fff', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Maximize2 style={{ width: '12px', height: '12px' }} />
                View Photo
              </div>
            </div>

            {/* Content Body */}
            <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#10b981', fontWeight: 700 }}>
                  {item.category}
                </span>
                <h3 style={{ fontSize: '1.3rem', marginTop: '6px', marginBottom: '10px', color: '#f8fafc', lineHeight: 1.3 }}>
                  {item.title}
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '20px', lineHeight: 1.5 }}>
                  {item.description}
                </p>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                {item.claimed ? (
                  <button
                    onClick={() => handleOpenClaimDetails(item)}
                    style={{ 
                      padding: '12px', 
                      background: 'rgba(16, 185, 129, 0.15)', 
                      border: '1px solid rgba(16, 185, 129, 0.3)', 
                      borderRadius: '12px', 
                      color: '#10b981', 
                      textAlign: 'center', 
                      fontSize: '0.9rem', 
                      fontWeight: 700, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    title="Click to see who claimed this & manage"
                  >
                    <CheckCircle2 style={{ width: '18px', height: '18px' }} />
                    ✅ Claimed — Click for Details
                  </button>
                ) : (
                  <button 
                    onClick={() => handleOpenClaimModal(item)}
                    className="festive-btn-primary"
                    style={{ width: '100%' }}
                  >
                    <Gift style={{ width: '18px', height: '18px' }} />
                    Claim & Reserve This Gift!
                  </button>
                )}

                <a 
                  href={item.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="festive-btn-secondary"
                  style={{ width: '100%', textDecoration: 'none' }}
                >
                  <ExternalLink style={{ width: '16px', height: '16px' }} />
                  View Store / Product Link
                </a>

                {/* Photo Disclaimer Note */}
                <div style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center', marginTop: '4px', fontStyle: 'italic' }}>
                  ℹ️ Note: Display photos are previews. Click 'View Store Link' above for exact Amazon listing photos!
                </div>
              </div>

            </div>

          </div>
        ))}
      </div>

      {/* Runner Up Options Section */}
      {runnerUps.length > 0 && (
        <div style={{ marginTop: '40px', paddingTop: '30px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <h3 style={{ fontSize: '1.3rem', marginBottom: '16px', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award style={{ width: '20px', height: '20px', color: '#fbbf24' }} />
            Other Alternate Wishlist Gifts You Can Pick
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '14px' }}>
            {runnerUps.map(item => (
              <div key={item.id} className="glass-card" style={{ padding: '16px', display: 'flex', gap: '14px', alignItems: 'center' }}>
                <img 
                  src={item.imageUrl} 
                  alt={item.title} 
                  onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMAGE; }}
                  style={{ width: '64px', height: '64px', borderRadius: '10px', objectFit: 'cover' }} 
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ fontSize: '0.95rem', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
                    {item.title}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <span style={{ color: '#fbbf24', fontWeight: 700, fontSize: '0.85rem' }}>${item.price}</span>
                    <span style={{ color: '#64748b', fontSize: '0.75rem' }}>• {item.category}</span>
                  </div>
                </div>
                {item.claimed ? (
                  <button 
                    onClick={() => handleOpenClaimDetails(item)}
                    style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', padding: '6px' }}
                    title="Click to see claim details"
                  >
                    <CheckCircle2 style={{ width: '20px', height: '20px' }} />
                  </button>
                ) : (
                  <button 
                    onClick={() => handleOpenClaimModal(item)}
                    style={{ background: 'none', border: 'none', color: '#fbbf24', cursor: 'pointer', padding: '6px' }}
                    title="Claim item"
                  >
                    <Gift style={{ width: '20px', height: '20px' }} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Retake Quiz Footer CTA */}
      <div style={{ textAlign: 'center', marginTop: '40px' }}>
        <button onClick={onRetakeQuiz} className="festive-btn-secondary">
          <RotateCcw style={{ width: '16px', height: '16px' }} />
          Retake Quiz with Different Budget or Vibe
        </button>
      </div>

      {/* Photo Lightbox Modal */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        >
          <div style={{ position: 'relative', maxWidth: '700px', width: '100%', textCenter: 'center' }}>
            <button 
              onClick={() => setPreviewImage(null)}
              style={{ position: 'absolute', top: '-40px', right: '0', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
            >
              <X style={{ width: '28px', height: '28px' }} />
            </button>
            <img 
              src={previewImage.imageUrl} 
              alt={previewImage.title}
              onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMAGE; }}
              style={{ width: '100%', maxHeight: '75vh', objectFit: 'contain', borderRadius: '16px', border: '2px solid rgba(251, 191, 36, 0.4)' }}
            />
            <div style={{ marginTop: '12px', textAlign: 'center', color: '#f8fafc', fontWeight: 700, fontSize: '1.2rem' }}>
              {previewImage.title} (${previewImage.price})
            </div>
          </div>
        </div>
      )}

      {/* Claim Modal */}
      {showClaimModal && claimingItem && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '460px', padding: '28px', background: '#0f172a', border: '1px solid rgba(251, 191, 36, 0.4)' }}>
            
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Gift style={{ width: '28px', height: '28px' }} />
              </div>
              <h3 style={{ fontSize: '1.4rem', color: '#f8fafc', marginBottom: '6px' }}>
                Reserve "{claimingItem.title}"
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                Marking this item as claimed ensures nobody else picks up the same gift!
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>
                  Your Name *
                </label>
                <input 
                  type="text"
                  placeholder="e.g. Aunt Sarah or Cousin Leo 🎅"
                  value={claimerName}
                  onChange={(e) => setClaimerName(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff', fontSize: '0.95rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>
                  Optional Note / Warm Holiday Message
                </label>
                <textarea 
                  rows={3}
                  placeholder="e.g. Got this for you! Merry Christmas!"
                  value={claimNote}
                  onChange={(e) => setClaimNote(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff', fontSize: '0.9rem', outline: 'none', resize: 'none' }}
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
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '460px', padding: '28px', background: '#0f172a', border: '1px solid rgba(16, 185, 129, 0.4)', position: 'relative' }}>
            
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
