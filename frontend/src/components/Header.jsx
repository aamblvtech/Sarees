import React from 'react';
import { QrCode, Sparkles, Shield, Camera, Lock } from 'lucide-react';

export default function Header({ onOpenQR, onOpenGuide, onOpenAdmin, activeProvider }) {
  return (
    <header className="studio-header">
      <div className="brand-wrapper">
        <div className="brand-crest">A</div>
        <div className="brand-text">
          <h1>AURA ATELIER</h1>
          <p>AI Virtual Dressing Room • Looklet Edition</p>
        </div>
      </div>

      <div className="header-actions">
        <button 
          className="pill-btn" 
          onClick={onOpenGuide}
          title="Tips for best AI virtual try-on photo"
        >
          <Camera size={15} />
          <span>Photo Guide</span>
        </button>

        <button 
          className="pill-btn pill-btn-gold" 
          onClick={onOpenQR}
          title="Scan QR to open dressing room on your mobile phone"
        >
          <QrCode size={15} />
          <span>Scan for Mobile</span>
        </button>

        <button 
          className="pill-btn" 
          onClick={onOpenAdmin}
          title="Store Manager & Inventory Studio"
        >
          <Lock size={14} />
          <span>Admin</span>
        </button>
      </div>
    </header>
  );
}
