import React from 'react';
import { Gift } from 'lucide-react';

// What someone sees when they open an invite link without being logged in.
export default function InviteLanding({ invite, onSignUp, onLogIn, onLook }) {
  return (
    <main style={{ flex: 1, position: 'relative', zIndex: 10 }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '56px 20px 60px' }}>
        <div className="glass-card animate-fade-in" style={{ padding: '32px', textAlign: 'center' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '18px', background: 'rgba(129, 140, 248, 0.16)', color: '#a5b4fc', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}><Gift style={{ width: '30px', height: '30px' }} /></div>
          <h1 style={{ fontSize: '1.6rem', margin: '0 0 8px' }} className="gold-gradient-text">{invite.ownerName} invited you to their wishlist</h1>
          <p style={{ color: '#94a3b8', margin: '0 0 22px', lineHeight: 1.5 }}>Take their quiz to find the perfect gift, and claim it so nobody else buys the same thing. Sign up or log in and it will be saved to your account.</p>
          <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
            <button onClick={onSignUp} className="festive-btn-primary" style={{ padding: '13px' }}>Sign Up</button>
            <button onClick={onLogIn} className="festive-btn-secondary" style={{ padding: '13px' }}>Log In</button>
            <button onClick={onLook} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '8px', textDecoration: 'underline' }}>Just look at it for now</button>
          </div>
        </div>
      </div>
    </main>
  );
}
