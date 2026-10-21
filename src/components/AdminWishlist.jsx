import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Download, Upload, RefreshCw, CheckCircle2, User, Gift, Save } from 'lucide-react';

export default function AdminWishlist({ 
  wishlistItems, 
  onAddItem, 
  onUpdateItem, 
  onDeleteItem, 
  onResetClaims, 
  onRestoreDefaults,
  onImportWishlist, 
  ownerName, 
  onUpdateOwnerName 
}) {
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
    setEditingItemId(null);
    setShowAddForm(false);
  };

  const handleSaveItem = (e) => {
    e.preventDefault();
    if (!title.trim() || !price) return;

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
      claimed: false,
      claimedBy: '',
      claimedNote: ''
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

  return (
    <div style={{ maxWidth: '1000px', margin: '30px auto', padding: '0 20px' }}>
      
      {/* Admin Header */}
      <div className="glass-card" style={{ padding: '28px', marginBottom: '28px', background: 'radial-gradient(circle at top right, rgba(251, 191, 36, 0.1) 0%, rgba(15, 23, 42, 0.85) 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.8rem', margin: 0 }} className="gold-gradient-text">
              Santa's Workshop & Wishlist Admin 🛠️
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '4px' }}>
              Add, edit, or customize all items on your holiday wishlist.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {onRestoreDefaults && (
              <button onClick={onRestoreDefaults} className="festive-btn-secondary" style={{ fontSize: '0.85rem', padding: '8px 14px', color: '#fbbf24' }}>
                <RefreshCw style={{ width: '16px', height: '16px' }} />
                Restore Default Wishlist (13 Items)
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

      {/* Item Table List */}
      <div className="glass-card" style={{ padding: '20px', overflowX: 'auto' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', color: '#f8fafc' }}>
          Current Items in Master Wishlist ({wishlistItems.length})
        </h3>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8' }}>
              <th style={{ padding: '12px 8px' }}>Item</th>
              <th style={{ padding: '12px 8px' }}>Category</th>
              <th style={{ padding: '12px 8px' }}>Price</th>
              <th style={{ padding: '12px 8px' }}>Priority</th>
              <th style={{ padding: '12px 8px' }}>Status</th>
              <th style={{ padding: '12px 8px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {wishlistItems.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <td style={{ padding: '12px 8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img src={item.imageUrl} alt="" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} />
                  <div>
                    <div style={{ fontWeight: 600, color: '#f8fafc' }}>{item.title}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.description.slice(0, 40)}...</div>
                  </div>
                </td>
                <td style={{ padding: '12px 8px', color: '#cbd5e1' }}>{item.category}</td>
                <td style={{ padding: '12px 8px', fontWeight: 700, color: '#fbbf24' }}>${item.price}</td>
                <td style={{ padding: '12px 8px', fontSize: '0.8rem', color: '#94a3b8' }}>{item.priority}</td>
                <td style={{ padding: '12px 8px' }}>
                  {item.claimed ? (
                    <span style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 700 }}>Claimed ({item.claimedBy})</span>
                  ) : (
                    <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Available</span>
                  )}
                </td>
                <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: '6px' }}>
                    <button onClick={() => startEdit(item)} style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', padding: '4px' }} title="Edit">
                      <Edit2 style={{ width: '16px', height: '16px' }} />
                    </button>
                    <button onClick={() => onDeleteItem(item.id)} style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: '4px' }} title="Delete">
                      <Trash2 style={{ width: '16px', height: '16px' }} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
