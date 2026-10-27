import React from 'react';
import { X, CheckCircle, Shield, AlertCircle, Sun, UserCheck, ShieldCheck } from 'lucide-react';

export default function PhotoGuidanceModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <UserCheck size={22} color="var(--gold)" />
            <h3 className="modal-title">Portrait Guidance & Privacy</h3>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          For the most realistic virtual draping results, follow these four simple suggestions:
        </p>

        <div className="guidance-box">
          <div className="guidance-item">
            <span className="guidance-dot">•</span>
            <div>
              <strong style={{ color: '#fff' }}>Clear, Even Lighting:</strong> Stand in a well-lit area without harsh backlighting or heavy shadows across your clothing.
            </div>
          </div>
          <div className="guidance-item">
            <span className="guidance-dot">•</span>
            <div>
              <strong style={{ color: '#fff' }}>Visible Body & Posture:</strong> Stand 2–3 meters away so your upper body or full height is comfortably framed.
            </div>
          </div>
          <div className="guidance-item">
            <span className="guidance-dot">•</span>
            <div>
              <strong style={{ color: '#fff' }}>Natural Stance:</strong> Keep arms slightly relaxed by your side so clothing borders and hemlines drape naturally.
            </div>
          </div>
          <div className="guidance-item">
            <span className="guidance-dot">•</span>
            <div>
              <strong style={{ color: '#fff' }}>Fitted Garments:</strong> Wearing everyday t-shirts, tops, or trousers gives the AI the cleanest canvas to fit new fabrics.
            </div>
          </div>
        </div>

        {/* Privacy Notice Box */}
        <div style={{
          background: 'rgba(34, 197, 94, 0.08)',
          border: '1px solid rgba(34, 197, 94, 0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 16px',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start',
          marginTop: '18px'
        }}>
          <ShieldCheck size={20} color="var(--success)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#fff', marginBottom: '4px' }}>
              Privacy & Ephemeral Storage Guarantee
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Your photograph is processed ephemerally on our secure server solely for virtual try-on and is automatically deleted after 30 minutes. Customer photographs are never used to train models or shared with third parties.
            </p>
          </div>
        </div>

        <div style={{ marginTop: '24px', textAlign: 'right' }}>
          <button 
            className="pill-btn pill-btn-gold" 
            onClick={onClose}
            style={{ padding: '8px 22px' }}
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
}
