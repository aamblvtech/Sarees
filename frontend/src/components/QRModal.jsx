import React, { useState, useEffect, useRef } from 'react';
import { X, Copy, Check, Smartphone, ExternalLink, RefreshCw } from 'lucide-react';

export default function QRModal({ isOpen, onClose, sessionId, customerPhotoUrl }) {
  const [qrInfo, setQrInfo] = useState(null);
  const [copied, setCopied] = useState(false);
  const [justSynced, setJustSynced] = useState(false);
  const photoAtOpenRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      photoAtOpenRef.current = customerPhotoUrl;
      if (sessionId) {
        fetch(`/api/qr/info?session_id=${encodeURIComponent(sessionId)}`)
          .then(res => res.json())
          .then(data => setQrInfo(data))
          .catch(err => console.error("Could not fetch QR info:", err));
      }
    }
  }, [isOpen, sessionId]);

  // Only auto-close if a NEW customer photo arrives while modal is open
  useEffect(() => {
    if (isOpen && customerPhotoUrl && photoAtOpenRef.current && customerPhotoUrl !== photoAtOpenRef.current) {
      setJustSynced(true);
      const timer = setTimeout(() => {
        onClose();
        setJustSynced(false);
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [customerPhotoUrl, isOpen, onClose]);


  if (!isOpen) return null;

  const mobileUrl = qrInfo ? qrInfo.mobile_upload_url : (sessionId ? `/mobile-upload?session=${sessionId}` : '/mobile-upload');

  const handleCopy = () => {
    if (!mobileUrl) return;
    navigator.clipboard.writeText(mobileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Smartphone size={22} color="var(--gold)" />
            <h3 className="modal-title">Mobile Phone Upload</h3>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ textAlign: 'center', padding: '10px 0 16px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
            Scan with your phone camera to take or upload your portrait. It will automatically appear on this screen!
          </p>

          {/* Sync Status Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: justSynced ? 'rgba(46, 204, 113, 0.15)' : 'rgba(223, 177, 91, 0.12)',
            border: `1px solid ${justSynced ? 'var(--success)' : 'rgba(223, 177, 91, 0.3)'}`,
            padding: '5px 14px',
            borderRadius: '20px',
            fontSize: '12px',
            color: justSynced ? 'var(--success)' : 'var(--gold-light)',
            marginBottom: '16px'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: justSynced ? 'var(--success)' : 'var(--gold)',
              boxShadow: justSynced ? '0 0 8px var(--success)' : '0 0 6px var(--gold)',
              display: 'inline-block'
            }}></span>
            <span>
              {justSynced ? "✓ Photo Received! Syncing to Studio..." : "Waiting for phone scan & upload..."}
            </span>
          </div>

          {/* QR Code Container */}
          <div style={{
            background: '#ffffff',
            padding: '14px',
            borderRadius: '16px',
            display: 'inline-block',
            boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
            marginBottom: '16px'
          }}>
            <img 
              src={`/api/qr?session_id=${encodeURIComponent(sessionId || '')}&size=8`} 
              alt="Scan to Upload Portrait" 
              style={{ width: '210px', height: '210px', display: 'block' }} 
            />
          </div>

          {/* Reachable URL copy bar */}
          <div style={{
            background: 'rgba(0,0,0,0.4)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            marginBottom: '10px'
          }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
              {mobileUrl}
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button 
                className="pill-btn" 
                onClick={handleCopy}
                style={{ padding: '4px 8px', fontSize: '11px', flexShrink: 0 }}
                title="Copy link to clipboard"
              >
                {copied ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <a 
                href={mobileUrl} 
                target="_blank" 
                rel="noreferrer"
                className="pill-btn" 
                style={{ padding: '4px 8px', fontSize: '11px', flexShrink: 0, textDecoration: 'none' }}
                title="Open mobile upload page in new tab for testing"
              >
                <ExternalLink size={12} />
                <span>Test</span>
              </a>
            </div>
          </div>

          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Session ID: <code style={{ color: 'var(--gold)' }}>{sessionId}</code>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', textAlign: 'center' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Device B (Phone) & Device A (PC) must be on the same Wi-Fi network • Or configure a public URL in .env
          </span>
        </div>
      </div>
    </div>
  );
}

