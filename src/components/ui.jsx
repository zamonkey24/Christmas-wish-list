import React from 'react';

export const inputStyle = {
  width: '100%', padding: '12px 14px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.06)',
  border: '1px solid rgba(255, 255, 255, 0.18)', color: '#fff', fontSize: '0.95rem', outline: 'none'
};

export function Field({ label, children, hint }) {
  return (
    <label style={{ display: 'block', marginBottom: '14px', textAlign: 'left' }}>
      <span style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>{label}</span>
      {children}
      {hint && <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>{hint}</span>}
    </label>
  );
}

export function Notice({ children, tone = 'info', onClose }) {
  const colors = tone === 'error' ? ['rgba(225, 29, 72, 0.16)', 'rgba(225, 29, 72, 0.5)', '#fecdd3'] : ['rgba(251, 191, 36, 0.14)', 'rgba(251, 191, 36, 0.45)', '#fde68a'];
  return (
    <div role="status" style={{ background: colors[0], border: `1px solid ${colors[1]}`, color: colors[2], padding: '10px 14px', borderRadius: '12px', fontSize: '0.88rem', display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
      <span>{children}</span>
      {onClose && <button onClick={onClose} aria-label="Dismiss" style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>}
    </div>
  );
}

export function Spinner({ label = 'Loading…' }) {
  return <div style={{ textAlign: 'center', color: '#94a3b8', padding: '80px 20px' }}>{label}</div>;
}
