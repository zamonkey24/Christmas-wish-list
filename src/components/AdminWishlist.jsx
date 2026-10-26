import React, { useState } from 'react';
import { useTheme, THEMES } from '../ThemeContext';
import { Plus, Trash2, Edit2, Download, Upload, RefreshCw, CheckCircle2, User, Gift, Save, Search, Undo2, ExternalLink } from 'lucide-react';

const timeAgo = (ts) => {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

export default function AdminWishlist({ 
  wishlistItems, 
  onAddItem, 
  onUpdateItem, 
  onDeleteItem, 
  trash = [],
  trashDays = 30,
  onRestoreItem,
  onPurgeItem,
  onEmptyTrash,
  onResetClaims, 
  onRestoreDefaults,
  onImportWishlist, 
  ownerName, 
  onUpdateOwnerName,
  theme: themeId,
  onChangeTheme
}) {
  const theme = useTheme();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [tempOwnerName, setTempOwnerName] = useState(ownerName || '');

  // Form State
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Tech & Gadgets');
  const [priority, setPriority] = useState('High Wish ❤️');
  const [closenessRequired, setClosenessRequired] = useState('casual');
  const [url, setUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [mustGet, setMustGet] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [confirm, setConfirm] = useState(null); // { kind: 'delete' | 'purge' | 'empty', item? }
  const [showTrash, setShowTrash] = useState(false);

  const resetForm = () => {
    setTitle('');
    setPrice('');
    setCategory('Tech & Gadgets');
    setPriority('High Wish ❤️');
    setClosenessRequired('casual');
    setUrl('');
    setImageUrl('');
    setDescription('');
    setMustGet('');
    setTagsText('');
    setEditingItemId(null);
    setShowAddForm(false);
  };

  const handleSaveItem = (e) => {
    e.preventDefault();
    if (!title.trim() || !price) return;

    const existing = editingItemId ? wishlistItems.find(i => i.id === editingItemId) : null;
    const tags = tagsText.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);

    const itemData = {
      id: editingItemId || `g_${Date.now()}`,
      title: title.trim(),
      price: Number(price),
      category,
      priority,
      closenessRequired,
      url: url.trim() || 'https://amazon.com',
      imageUrl: imageUrl.trim() || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=800&q=80',
      description: description.trim() || 'A wonderful holiday gift choice!',
      mustGet: mustGet.trim(),
      tags,
      claimed: existing?.claimed ?? false,
      claimedBy: existing?.claimedBy ?? '',
      claimedNote: existing?.claimedNote ?? ''
    };

    if (editingItemId) {
      onUpdateItem(itemData);
    } else {
      onAddItem(itemData);
    }

    resetForm();
  };

  const startEdit = (item) => {
    setEditingItemId(item.id);
    setTitle(item.title);
    setPrice(item.price);
    setCategory(item.category);
    setPriority(item.priority);
    setClosenessRequired(item.closenessRequired || 'casual');
    setUrl(item.url);
    setImageUrl(item.imageUrl);
    setDescription(item.description);
    setMustGet(item.mustGet || '');
    setTagsText((item.tags || []).join(', '));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setShowAddForm(true);
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(wishlistItems, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `christmas_wishlist_${ownerName || 'my_list'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if (Array.isArray(importedData)) {
          onImportWishlist(importedData);
          alert('Wishlist imported successfully! 🎉');
        }
      } catch (err) {
        alert('Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
  };

  const visibleItems = wishlistItems.filter(item => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = !q || item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const trashCutoff = Date.now() - trashDays * 24 * 60 * 60 * 1000;
  const recentlyDeleted = trash.filter(t => (t.deletedAt ?? 0) > trashCutoff);

  return (
    <div style={{ maxWidth: '1000px', margin: '30px auto', padding: '0 20px' }}>
      
      {/* Admin Header */}
      <div className="glass-card" style={{ padding: '28px', marginBottom: '28px', background: 'radial-gradient(circle at top right, rgba(251, 191, 36, 0.1) 0%, rgba(15, 23, 42, 0.85) 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.8rem', margin: 0 }} className="gold-gradient-text">
              {theme.adminTitle}
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '4px' }}>
              Add, edit, or customize all items on your holiday wishlist.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {onRestoreDefaults && (
              <button onClick={onRestoreDefaults} className="festive-btn-secondary" style={{ fontSize: '0.85rem', padding: '8px 14px', color: '#fbbf24' }}>
                <RefreshCw style={{ width: '16px', height: '16px' }} />
                Restore Default Wishlist
              </button>
            )}
            <button onClick={handleExportJSON} className="festive-btn-secondary" style={{ fontSize: '0.85rem', padding: '8px 14px' }}>
              <Download style={{ width: '16px', height: '16px' }} />
              Export JSON
            </button>
            <label className="festive-btn-secondary" style={{ fontSize: '0.85rem', padding: '8px 14px', cursor: 'pointer' }}>
              <Upload style={{ width: '16px', height: '16px' }} />
              Import JSON
              <input type="file" accept=".json" onChange={handleImportJSON} style={{ display: 'none' }} />
            </label>
            <button onClick={onResetClaims} className="festive-btn-secondary" style={{ fontSize: '0.85rem', padding: '8px 14px', color: '#f43f5e' }}>
              <RefreshCw style={{ width: '16px', height: '16px' }} />
              Reset All Claims
            </button>
          </div>
        </div>

        {/* Owner Profile Setting */}
        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <User style={{ width: '20px', height: '20px', color: '#fbbf24' }} />
          <span style={{ fontSize: '0.9rem', color: '#cbd5e1', fontWeight: 600 }}>Wishlist Owner Name:</span>
          <input 
            type="text"
            placeholder="e.g. Arav"
            value={tempOwnerName}
            onChange={(e) => setTempOwnerName(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
          />
          <button 
            onClick={() => onUpdateOwnerName(tempOwnerName)}
            className="festive-btn-primary"
            style={{ padding: '6px 14px', fontSize: '0.85rem' }}
          >
            <Save style={{ width: '14px', height: '14px' }} />
            Save Name
          </button>
        </div>

        {/* Site Theme */}
        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ fontSize: '0.9rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '10px' }}>Site Background & Theme (updates for everyone):</div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {Object.values(THEMES).map(t => {
              const active = themeId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onChangeTheme(t.id)}
                  style={{ flex: '1 1 220px', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '14px', cursor: 'pointer', textAlign: 'left', color: '#f8fafc', background: active ? 'rgba(251, 191, 36, 0.14)' : 'rgba(255, 255, 255, 0.04)', border: active ? '2px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.12)' }}
                >
                  <t.Logo size={34} />
                  <span>
                    <strong style={{ display: 'block', fontSize: '1rem' }}>{t.emoji} {t.name}{active ? ' (live)' : ''}</strong>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      {t.id === 'birthday' ? 'White marble, gold, sparkles' : 'Red & green, snowfall'}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add / Edit Form Toggle Button */}
      {!showAddForm && (
        <button 
          onClick={() => setShowAddForm(true)} 
          className="festive-btn-primary"
          style={{ width: '100%', marginBottom: '28px', padding: '14px' }}
        >
          <Plus style={{ width: '20px', height: '20px' }} />
          Add New Gift to Wishlist
        </button>
      )}

      {/* Add / Edit Form */}
      {showAddForm && (
        <form onSubmit={handleSaveItem} className="glass-card animate-fade-in" style={{ padding: '28px', marginBottom: '32px', border: '1px solid rgba(251, 191, 36, 0.4)' }}>
          <h3 style={{ fontSize: '1.3rem', color: '#fbbf24', marginBottom: '20px' }}>
            {editingItemId ? 'Edit Wishlist Item ✏️' : 'Add New Wishlist Item 🎁'}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>Item Title *</label>
              <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Wireless Headphones" style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>Price ($) *</label>
              <input type="number" required min="1" step="1" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 45" style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff' }}>
                <option value="Family">Family 👨‍👩‍👧</option>
                <option value="Tech & Gadgets">Tech & Gadgets</option>
                <option value="Cozy & Home">Cozy & Home</option>
                <option value="Fun & Games">Fun & Games</option>
                <option value="Experiences & Activities">Experiences & Activities</option>
                <option value="Creative & Books">Creative & Books</option>
                <option value="Everyday Essentials">Everyday Essentials</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>Priority Badge</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff' }}>
                <option value="Must Have 🌟">Must Have 🌟</option>
                <option value="High Wish ❤️">High Wish ❤️</option>
                <option value="Fun Gift 🎁">Fun Gift 🎁</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>Closeness Tier Required</label>
              <select value={closenessRequired} onChange={(e) => setClosenessRequired(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff' }}>
                <option value="casual">Classmate / Distant Relative 🎒</option>
                <option value="friend">Good Friend / Cousin 🌟</option>
                <option value="close">Best Friend / Sibling / Parent ❤️</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>Product Store URL</label>
              <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://amazon.com/dp/..." style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff' }} />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>Image URL (Unsplash or direct image link)</label>
            <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://images.unsplash.com/..." style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff' }} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>"Please get..." reminder (optional, shown in a pop-up before the store link opens)</label>
            <input type="text" value={mustGet} onChange={(e) => setMustGet(e.target.value)} placeholder="e.g. the WHITE one" style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff' }} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>Quiz tags (optional, comma separated: hair, skin, fragrance, outdoors, tech, fun, giftcard, practical, luxury)</label>
            <input type="text" value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="e.g. skin, luxury" style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff' }} />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>Description & Preferences (Color/Size)</label>
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Size M in Space Gray color..." style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff', resize: 'none' }} />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={resetForm} className="festive-btn-secondary">
              Cancel
            </button>
            <button type="submit" className="festive-btn-primary">
              <Save style={{ width: '16px', height: '16px' }} />
              {editingItemId ? 'Save Changes' : 'Add Item'}
            </button>
          </div>
        </form>
      )}

      {/* Catalog-style item grid */}
      <div className="glass-card" style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '1.2rem', color: '#f8fafc', margin: 0, flex: '1 1 200px' }}>
            Master Wishlist ({wishlistItems.length})
          </h3>
          <div style={{ position: 'relative', flex: '1 1 220px' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff', fontSize: '0.9rem' }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {['All', ...new Set(wishlistItems.map(i => i.category))].map(cat => (
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

      {visibleItems.length === 0 ? (
        <div className="glass-card" style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', marginBottom: '24px' }}>
          <Gift style={{ width: '40px', height: '40px', color: '#64748b', margin: '0 auto 10px' }} />
          No items match.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '22px', marginBottom: '32px' }}>
          {visibleItems.map(item => (
            <div key={item.id} className="glass-card animate-fade-in" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ height: '170px', position: 'relative', overflow: 'hidden' }}>
                <img src={item.imageUrl} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(15, 23, 42, 0.85)', padding: '3px 8px', borderRadius: '6px', color: '#fbbf24', fontSize: '0.75rem', fontWeight: 700 }}>
                  {item.priority}
                </div>
                <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#e11d48', color: '#fff', padding: '3px 10px', borderRadius: '6px', fontWeight: 800, fontSize: '0.9rem' }}>
                  ${item.price}
                </div>
              </div>

              <div style={{ padding: '18px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700, textTransform: 'uppercase' }}>{item.category}</span>
                  <h3 style={{ fontSize: '1.05rem', margin: '6px 0 8px', color: '#f8fafc', lineHeight: 1.3 }}>{item.title}</h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.4, margin: '0 0 10px' }}>{item.description}</p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '0.75rem' }}>
                    {item.claimed ? (
                      <span style={{ color: '#10b981', fontWeight: 700 }}>✅ Claimed by {item.claimedBy || theme.secretGifter}</span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>Available</span>
                    )}
                    {item.mustGet && <span style={{ color: '#fbbf24' }}>⚠️ Please get: {item.mustGet}</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => startEdit(item)} className="festive-btn-primary" style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}>
                    <Edit2 style={{ width: '15px', height: '15px' }} />
                    Edit
                  </button>
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="festive-btn-secondary" style={{ padding: '8px 12px', fontSize: '0.85rem', textDecoration: 'none' }} title="Open product link">
                    <ExternalLink style={{ width: '15px', height: '15px' }} />
                  </a>
                  <button onClick={() => setConfirm({ kind: 'delete', item })} className="festive-btn-secondary" style={{ padding: '8px 12px', fontSize: '0.85rem', color: '#f43f5e' }} title="Delete">
                    <Trash2 style={{ width: '15px', height: '15px' }} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recently Deleted */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <button
          onClick={() => setShowTrash(v => !v)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', color: '#f8fafc', cursor: 'pointer', padding: 0, fontSize: '1.1rem', fontWeight: 700 }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Trash2 style={{ width: '18px', height: '18px', color: '#f43f5e' }} />
            Recently Deleted ({recentlyDeleted.length})
          </span>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 500 }}>{showTrash ? 'Hide' : 'Show'}</span>
        </button>

        {showTrash && (
          <div style={{ marginTop: '16px' }}>
            {recentlyDeleted.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>Nothing deleted recently.</p>
            ) : (
              <>
                <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: 0 }}>
                  Deleted items stay here for {trashDays} days so you can bring them back.
                </p>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {recentlyDeleted.map(item => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', flexWrap: 'wrap' }}>
                      <img src={item.imageUrl} alt="" style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }} />
                      <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.9rem' }}>{item.title}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>${item.price} • deleted {timeAgo(item.deletedAt)}</div>
                      </div>
                      <button onClick={() => onRestoreItem(item.id)} className="festive-btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                        <Undo2 style={{ width: '14px', height: '14px' }} />
                        Restore
                      </button>
                      <button onClick={() => setConfirm({ kind: 'purge', item })} className="festive-btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', color: '#f43f5e' }}>
                        Delete forever
                      </button>
                    </div>
                  ))}
                </div>
                <button onClick={() => setConfirm({ kind: 'empty' })} className="festive-btn-secondary" style={{ marginTop: '14px', padding: '6px 12px', fontSize: '0.8rem', color: '#f43f5e' }}>
                  Empty Recently Deleted
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Confirmation pop-up */}
      {confirm && (
        <div
          onClick={() => setConfirm(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-card animate-fade-in"
            style={{ width: '100%', maxWidth: '400px', padding: '28px', background: '#0f172a', border: '1px solid rgba(244, 63, 94, 0.5)', textAlign: 'center' }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🗑️</div>
            <h3 style={{ fontSize: '1.2rem', color: '#f8fafc', marginBottom: '8px' }}>
              {confirm.kind === 'delete' && 'Delete this item?'}
              {confirm.kind === 'purge' && 'Delete forever?'}
              {confirm.kind === 'empty' && 'Empty Recently Deleted?'}
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '22px' }}>
              {confirm.kind === 'delete' && <>"{confirm.item.title}" will move to Recently Deleted, where you can restore it for {trashDays} days.{confirm.item.claimed ? ` It is claimed by ${confirm.item.claimedBy || 'someone'}.` : ''}</>}
              {confirm.kind === 'purge' && <>"{confirm.item.title}" will be gone for good. This can't be undone.</>}
              {confirm.kind === 'empty' && <>All {recentlyDeleted.length} items will be gone for good. This can't be undone.</>}
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={() => setConfirm(null)} className="festive-btn-secondary" style={{ flex: 1 }}>
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm.kind === 'delete') onDeleteItem(confirm.item.id);
                  if (confirm.kind === 'purge') onPurgeItem(confirm.item.id);
                  if (confirm.kind === 'empty') onEmptyTrash();
                  setConfirm(null);
                }}
                className="festive-btn-primary"
                style={{ flex: 1, background: '#e11d48' }}
              >
                {confirm.kind === 'delete' ? 'Delete' : 'Delete forever'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
