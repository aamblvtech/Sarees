import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Camera, 
  Sliders, 
  RotateCcw, 
  Download, 
  Sparkles, 
  RefreshCw, 
  AlertTriangle, 
  Key,
  X,
  Gem,
  Compass,
  Calendar
} from 'lucide-react';
import ProcessingOverlay from './ProcessingOverlay';

export default function DressingStage({
  customerPhotoUrl,
  resultUrl,
  selectedGarment,
  onUploadClick,
  onSelectSampleModel,
  onRetry,
  onReset,
  onOpenTokenConfig,
  isProcessing,
  processingStageMessage,
  jobProgress,
  tryonError,
  onDismissError
}) {
  const [sliderPos, setSliderPos] = useState(50);
  const [viewMode, setViewMode] = useState('slider'); // 'slider', 'result', 'original'
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  // Gemini Atelier Stylist Consultation State
  const [showStylist, setShowStylist] = useState(false);
  const [stylistAdvice, setStylistAdvice] = useState(null);
  const [loadingStylist, setLoadingStylist] = useState(false);

  // Fetch bespoke Gemini Haute Couture stylist consultation when outfit changes
  useEffect(() => {
    if (!selectedGarment) {
      setStylistAdvice(null);
      return;
    }
    let isSubscribed = true;
    setLoadingStylist(true);

    const formData = new FormData();
    formData.append("garment_id", selectedGarment.id);

    fetch('/api/tryon/stylist-consultation', {
      method: 'POST',
      body: formData
    })
      .then(res => res.json())
      .then(data => {
        if (isSubscribed && data.status === 'success' && data.advice) {
          setStylistAdvice(data.advice);
        }
      })
      .catch(err => {
        console.warn("Stylist consultation fetch error:", err);
      })
      .finally(() => {
        if (isSubscribed) setLoadingStylist(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [selectedGarment?.id]);

  // Automatically pop stylist advice once virtual try-on finishes
  useEffect(() => {
    if (resultUrl && !isProcessing) {
      setShowStylist(true);
    }
  }, [resultUrl, isProcessing]);


  const handlePointerMove = (e) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches && e.touches[0].clientX);
    if (!clientX) return;
    const pos = ((clientX - rect.left) / rect.width) * 100;
    setSliderPos(Math.min(Math.max(pos, 5), 95));
  };

  const handlePointerDown = () => setIsDragging(true);
  const handlePointerUp = () => setIsDragging(false);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('touchmove', handlePointerMove);
      window.addEventListener('touchend', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [isDragging]);

  const handleDownload = () => {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = `AURA_TryOn_${selectedGarment ? selectedGarment.name.replace(/\s+/g, '_') : 'Look'}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="stage-container">
      <div 
        className="stage-viewport"
        ref={containerRef}
      >
        {/* State 1: No Customer Photo Yet */}
        {!customerPhotoUrl ? (
          <div className="stage-empty">
            <div className="stage-empty-icon">
              <Camera size={34} />
            </div>
            <h3>Your Personal Fitting Room</h3>
            <p>
              Upload a photograph once. After that, click any outfit on the right to see automatic AI virtual try-on.
            </p>

            <div style={{ display: 'flex', gap: '12px', marginTop: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button 
                className="pill-btn pill-btn-gold" 
                onClick={onUploadClick}
                style={{ padding: '12px 24px', fontSize: '14px' }}
              >
                <Upload size={17} />
                <span>Upload Photograph</span>
              </button>

              <button 
                className="pill-btn" 
                onClick={onSelectSampleModel}
                style={{ padding: '12px 20px', fontSize: '13px' }}
              >
                <span>Try With Demo Model</span>
              </button>
            </div>
          </div>
        ) : (
          /* State 2: Customer Photo Loaded */
          <>
            {/* View Result Mode */}
            {resultUrl && !isProcessing ? (
              <>
                {viewMode === 'slider' && (
                  <div className="compare-container">
                    {/* Underlying: AI Result */}
                    <img 
                      src={resultUrl} 
                      alt="AI Virtual Try-On Result" 
                      className="compare-img-under" 
                    />
                    
                    {/* Overlying: Original Customer Portrait with clip */}
                    <div 
                      className="compare-img-over-wrapper"
                      style={{ width: `${sliderPos}%` }}
                    >
                      <img 
                        src={customerPhotoUrl} 
                        alt="Original Portrait" 
                        className="compare-img-over"
                        style={{ width: containerRef.current ? containerRef.current.clientWidth : '100%' }}
                      />
                    </div>

                    {/* Interactive Split Drag Handle */}
                    <div 
                      className="compare-handle"
                      style={{ left: `${sliderPos}%` }}
                      onPointerDown={handlePointerDown}
                      onTouchStart={handlePointerDown}
                    >
                      <div className="compare-handle-knob">
                        <Sliders size={18} />
                      </div>
                    </div>
                  </div>
                )}

                {viewMode === 'result' && (
                  <img src={resultUrl} alt="AI Virtual Try-On" className="stage-image" />
                )}

                {viewMode === 'original' && (
                  <img src={customerPhotoUrl} alt="Original Portrait" className="stage-image" />
                )}

                {/* Top Badges */}
                <div className="stage-badge stage-badge-top-left">
                  <span>AI Fitted • {selectedGarment?.name || 'Outfit'}</span>
                </div>

                {/* Bottom View Switcher Pill */}
                <div className="stage-badge stage-badge-bottom">
                  <button 
                    style={{ 
                      color: viewMode === 'slider' ? 'var(--gold-light)' : 'var(--text-muted)',
                      fontWeight: viewMode === 'slider' ? '600' : '400',
                      fontSize: '12px'
                    }}
                    onClick={() => setViewMode('slider')}
                  >
                    Compare Split
                  </button>
                  <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
                  <button 
                    style={{ 
                      color: viewMode === 'result' ? 'var(--gold-light)' : 'var(--text-muted)',
                      fontWeight: viewMode === 'result' ? '600' : '400',
                      fontSize: '12px'
                    }}
                    onClick={() => setViewMode('result')}
                  >
                    Fitted Result
                  </button>
                  <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
                  <button 
                    style={{ 
                      color: viewMode === 'original' ? 'var(--gold-light)' : 'var(--text-muted)',
                      fontWeight: viewMode === 'original' ? '600' : '400',
                      fontSize: '12px'
                    }}
                    onClick={() => setViewMode('original')}
                  >
                    Original
                  </button>
                </div>
              </>
            ) : (
              /* Customer photo loaded without result (or before try-on) */
              <>
                <img src={customerPhotoUrl} alt="Customer Portrait" className="stage-image" />
                <div className="stage-badge stage-badge-top-left">
                  <span>Portrait Ready • Click any outfit to try on</span>
                </div>
              </>
            )}

            {/* In-Stage Loading Overlay (Only covers the stage, keeps catalog interactive!) */}
            {isProcessing && (
              <ProcessingOverlay 
                progress={jobProgress}
                stageMessage={processingStageMessage || "Creating Your Virtual Look..."}
                garmentName={selectedGarment?.name}
              />
            )}

            {/* In-Stage Error Card (Keeps customer photo and selected garment visible separately) */}
            {tryonError && !isProcessing && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(14, 10, 18, 0.90)',
                backdropFilter: 'blur(16px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                textAlign: 'center',
                zIndex: 25
              }}>
                {onDismissError && (
                  <button 
                    onClick={onDismissError}
                    style={{
                      position: 'absolute',
                      top: 16,
                      right: 16,
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-muted)',
                      cursor: 'pointer'
                    }}
                    title="Dismiss and view original photograph"
                  >
                    <X size={16} />
                  </button>
                )}

                <div style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ef4444',
                  marginBottom: '12px'
                }}>
                  <AlertTriangle size={26} />
                </div>

                <h4 style={{ fontFamily: 'var(--font-editorial)', fontSize: '20px', color: '#fff', marginBottom: '8px' }}>
                  {tryonError.code === 'QUOTA_EXHAUSTED' ? 'Cloud GPU Quota Exhausted' :
                   tryonError.code === 'PROVIDER_BUSY' ? 'GPU Queue Busy' :
                   tryonError.code === 'AUTHENTICATION_FAILED' ? 'Authentication Required' :
                   tryonError.code === 'PROVIDER_UNAVAILABLE' ? 'AI Provider Unavailable' :
                   'AI Virtual Try-On Could Not Complete'}
                </h4>

                {tryonError.retryAfterSeconds && (
                  <div style={{
                    background: 'rgba(223, 177, 91, 0.12)',
                    border: '1px solid rgba(223, 177, 91, 0.35)',
                    padding: '4px 14px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    color: 'var(--gold-light)',
                    marginBottom: '10px'
                  }}>
                    ⏱️ Provider Reset In: {Math.floor(tryonError.retryAfterSeconds / 3600)}h {Math.floor((tryonError.retryAfterSeconds % 3600) / 60)}m
                  </div>
                )}

                {/* Side-by-side separate visibility for Customer Photo and Selected Garment */}
                {(customerPhotoUrl || selectedGarment) && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    margin: '12px 0 16px',
                    background: 'rgba(0,0,0,0.4)',
                    padding: '10px 18px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    {customerPhotoUrl && (
                      <div style={{ textAlign: 'center' }}>
                        <img 
                          src={customerPhotoUrl} 
                          alt="Customer Portrait" 
                          onError={(e) => { e.currentTarget.parentElement.style.display = 'none'; }}
                          style={{ width: '56px', height: '70px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--gold-border)' }} 
                        />
                        <div style={{ fontSize: '10px', color: 'var(--gold-light)', marginTop: '4px', fontWeight: '500' }}>Your Portrait</div>
                      </div>
                    )}

                    {customerPhotoUrl && selectedGarment && (
                      <div style={{ color: 'var(--gold)', fontSize: '16px', fontWeight: 'bold' }}>+</div>
                    )}

                    {selectedGarment && (
                      <div style={{ textAlign: 'center' }}>
                        <img 
                          src={selectedGarment.image_url} 
                          alt={selectedGarment.name} 
                          style={{ width: '56px', height: '70px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--gold-border)' }} 
                        />
                        <div style={{ fontSize: '10px', color: 'var(--gold-light)', marginTop: '4px', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {selectedGarment.name}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '440px', lineHeight: '1.5', marginBottom: '18px' }}>
                  {tryonError.message}
                </p>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button 
                    className="pill-btn pill-btn-gold" 
                    onClick={onRetry}
                    style={{ padding: '9px 18px', fontSize: '12px' }}
                  >
                    <RefreshCw size={14} />
                    <span>Retry Fitting</span>
                  </button>

                  {onDismissError && (
                    <button 
                      className="pill-btn" 
                      onClick={onDismissError}
                      style={{ padding: '9px 16px', fontSize: '12px' }}
                    >
                      <span>View Original Portrait</span>
                    </button>
                  )}

                  {onOpenTokenConfig && (
                    <button 
                      className="pill-btn" 
                      onClick={onOpenTokenConfig}
                      style={{ padding: '9px 16px', borderColor: 'var(--gold-border)', fontSize: '12px' }}
                    >
                      <Key size={13} color="var(--gold)" />
                      <span>Configure AI Settings</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Haute Couture Stylist Consultation Panel */}
            {showStylist && stylistAdvice && !isProcessing && (
              <div className="stylist-panel">
                <div className="stylist-panel-header">
                  <div className="stylist-panel-title">
                    <Sparkles size={16} color="var(--gold)" />
                    <span>Atelier Couture Consultation</span>
                    <span className="stylist-badge-ai">Gemini AI</span>
                  </div>
                  <button 
                    onClick={() => setShowStylist(false)}
                    style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                    title="Dismiss stylist notes"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="stylist-section-item">
                  <div className="stylist-item-icon">
                    <Compass size={14} />
                  </div>
                  <div>
                    <div className="stylist-item-label">Drape & Silhouette Architecture</div>
                    <div className="stylist-item-text">{stylistAdvice.drape}</div>
                  </div>
                </div>

                <div className="stylist-section-item">
                  <div className="stylist-item-icon">
                    <Gem size={14} />
                  </div>
                  <div>
                    <div className="stylist-item-label">Fine Jewelry & Accents</div>
                    <div className="stylist-item-text">{stylistAdvice.jewelry}</div>
                  </div>
                </div>

                <div className="stylist-section-item">
                  <div className="stylist-item-icon">
                    <Calendar size={14} />
                  </div>
                  <div>
                    <div className="stylist-item-label">Coiffure & Grand Occasion</div>
                    <div className="stylist-item-text">{stylistAdvice.occasion}</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Stage Toolbar */}
      <div className="stage-toolbar">
        {selectedGarment ? (
          <div className="selected-garment-ribbon">
            <img 
              src={selectedGarment.image_url} 
              alt={selectedGarment.name} 
              className="garment-thumb-small"
            />
            <div>
              <div style={{ fontSize: '11px', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {selectedGarment.department} • {selectedGarment.category}
              </div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>
                {selectedGarment.name}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--gold-light)', fontWeight: '700' }}>
                ₹{selectedGarment.price.toLocaleString()}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Select an outfit from the collection to try it on.
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
          {selectedGarment && (
            <button 
              className={`pill-btn ${showStylist ? 'pill-btn-gold' : ''}`}
              onClick={() => setShowStylist(!showStylist)} 
              title="Toggle Haute Couture styling notes powered by Gemini AI"
            >
              <Sparkles size={14} />
              <span>Stylist Advice</span>
            </button>
          )}

          {customerPhotoUrl && (
            <button 
              className="pill-btn" 
              onClick={onUploadClick} 
              title="Replace your current photograph"
            >
              <Upload size={14} />
              <span>Change Photo</span>
            </button>
          )}


          {resultUrl && (
            <button 
              className="pill-btn" 
              onClick={handleDownload} 
              title="Download your virtual try-on portrait"
            >
              <Download size={14} />
              <span>Download</span>
            </button>
          )}

          {customerPhotoUrl && (
            <button 
              className="pill-btn" 
              onClick={onReset} 
              title="Reset session and delete temporary photos"
              style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>
          )}

          {/* Retry button if tryon failed */}
          {tryonError && customerPhotoUrl && selectedGarment && !isProcessing && (
            <button 
              className="pill-btn pill-btn-gold" 
              onClick={onRetry}
            >
              <RefreshCw size={14} />
              <span>Retry</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
