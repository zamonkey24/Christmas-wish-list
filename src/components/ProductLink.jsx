import React, { useState } from 'react';
import { ExternalLink } from 'lucide-react';

// Link to the store. If the item needs a specific version (item.mustGet), ask first.
export default function ProductLink({ item, className, style, iconSize, children }) {
  const [showNote, setShowNote] = useState(false);
  const icon = <ExternalLink style={{ width: iconSize, height: iconSize }} />;

  if (!item.mustGet) {
    return (
      <a href={item.url} target="_blank" rel="noopener noreferrer" className={className} style={{ textDecoration: 'none', ...style }}>
        {icon}
        {children}
      </a>
    );
  }

  const handleGotIt = () => {
    window.open(item.url, '_blank', 'noopener,noreferrer');
    setShowNote(false);
  };

  return (
    <>
      <button type="button" onClick={() => setShowNote(true)} className={className} style={style}>
        {icon}
        {children}
      </button>

      {showNote && (
        <div
          onClick={() => setShowNote(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 110, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-card animate-fade-in"
            style={{ width: '100%', maxWidth: '400px', padding: '28px', background: '#0f172a', border: '1px solid rgba(251, 191, 36, 0.4)', textAlign: 'center' }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⚠️</div>
            <h3 style={{ fontSize: '1.2rem', color: '#f8fafc', marginBottom: '8px' }}>
              Please get "{item.mustGet}"
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '22px' }}>
              On the Amazon page, pick this option before you order: <strong style={{ color: '#fbbf24' }}>{item.mustGet}</strong>
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={() => setShowNote(false)} className="festive-btn-secondary" style={{ flex: 1 }}>
                Cancel
              </button>
              <button type="button" onClick={handleGotIt} className="festive-btn-primary" style={{ flex: 1 }}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
