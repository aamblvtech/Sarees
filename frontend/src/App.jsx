import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import DressingStage from './components/DressingStage';
import CatalogDrawer from './components/CatalogDrawer';
import QRModal from './components/QRModal';
import PhotoGuidanceModal from './components/PhotoGuidanceModal';
import AdminStudioModal from './components/AdminStudioModal';

export default function App() {
  const [catalogItems, setCatalogItems] = useState([]);
  const [selectedGarment, setSelectedGarment] = useState(null);
  
  // Customer session and photo state: initialize a unique persistent session ID for QR mobile pairing
  const [customerPhotoUrl, setCustomerPhotoUrl] = useState(() => localStorage.getItem('aura_photo_url') || null);
  const [customerSessionId, setCustomerSessionId] = useState(() => {
    let sid = localStorage.getItem('aura_session_id');
    if (!sid) {
      sid = 'aura_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
      localStorage.setItem('aura_session_id', sid);
    }
    return sid;
  });
  
  // Try-on inference state
  const [resultUrl, setResultUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingGarmentId, setProcessingGarmentId] = useState(null);
  const [jobProgress, setJobProgress] = useState(0);
  const [processingStageMessage, setProcessingStageMessage] = useState('Creating Your Virtual Look...');
  const [tryonError, setTryonError] = useState(null);
  
  // Modals
  const [showQRModal, setShowQRModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  
  // Filters
  const [activeDepartment, setActiveDepartment] = useState('All');
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Refs for race-condition prevention & rapid clicking
  const fileInputRef = useRef(null);
  const currentRequestId = useRef(0);
  const pollIntervalRef = useRef(null);

  // Load catalog on mount
  const fetchCatalog = async () => {
    try {
      const res = await fetch('/api/catalog');
      if (res.ok) {
        const data = await res.json();
        setCatalogItems(data);
        if (data.length > 0 && !selectedGarment) {
          setSelectedGarment(data[0]);
        }
      }
    } catch (err) {
      console.error("Catalog load error:", err);
    }
  };

  useEffect(() => {
    fetchCatalog();
    
    // Validate cached customer photo URL on startup to discard stale/purged images
    const cachedUrl = localStorage.getItem('aura_photo_url');
    if (cachedUrl) {
      fetch(cachedUrl, { method: 'HEAD' })
        .then(res => {
          if (!res.ok) {
            localStorage.removeItem('aura_photo_url');
            setCustomerPhotoUrl(null);
          }
        })
        .catch(() => {
          localStorage.removeItem('aura_photo_url');
          setCustomerPhotoUrl(null);
        });
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Real-time synchronization loop: listens for mobile phone uploads from QR code
  useEffect(() => {
    if (!customerSessionId) return;

    const syncPoll = setInterval(async () => {
      try {
        const res = await fetch(`/api/tryon/session-status?session_id=${encodeURIComponent(customerSessionId)}`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.status === 'ready' && data.image_url) {
          setCustomerPhotoUrl((prevUrl) => {
            // Only trigger update if the photo is newly received from phone
            if (prevUrl !== data.image_url) {
              localStorage.setItem('aura_photo_url', data.image_url);
              setResultUrl(null);
              setTryonError(null);

              // If an outfit is already selected on the main screen, automatically trigger try-on!
              if (selectedGarment) {
                setTimeout(() => {
                  startVirtualTryon(selectedGarment, customerSessionId);
                }, 300);
              }
              return data.image_url;
            }
            return prevUrl;
          });
        }
      } catch (err) {
        // Silent catch for network hiccups
      }
    }, 2000);

    return () => clearInterval(syncPoll);
  }, [customerSessionId, selectedGarment]);

  // Upload customer portrait to backend session
  const uploadPortraitToSession = async (file, useDemo = false) => {
    try {
      const formData = new FormData();
      if (customerSessionId) {
        formData.append("session_id", customerSessionId);
      }
      if (useDemo) {
        formData.append("use_demo", "true");
      } else if (file) {
        formData.append("person", file);
      }
      formData.append("user_consent", "true");

      const res = await fetch('/api/tryon/session-photo', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Could not save portrait to session.");
      }

      const data = await res.json();
      setCustomerSessionId(data.session_id);
      setCustomerPhotoUrl(data.image_url);
      setResultUrl(null);
      setTryonError(null);

      localStorage.setItem('aura_session_id', data.session_id);
      localStorage.setItem('aura_photo_url', data.image_url);

      // If an outfit is already selected, automatically start try-on!
      if (selectedGarment) {
        startVirtualTryon(selectedGarment, data.session_id);
      }
    } catch (err) {
      setTryonError({ message: err.message, isQuota: false });
    }
  };


  // Handle Photo File selection
  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Image exceeds 10MB. Please select a smaller photo.");
      return;
    }

    uploadPortraitToSession(file, false);
  };

  // Demo model selector
  const handleSelectSampleModel = () => {
    uploadPortraitToSession(null, true);
  };

  // AUTOMATIC TRY-ON DISPATCHER (Handles rapid outfit clicking)
  const startVirtualTryon = async (garment, sessionIdOverride = null) => {
    const activeSession = sessionIdOverride || customerSessionId;

    if (!activeSession && !customerPhotoUrl) {
      // User hasn't uploaded photo yet: prompt file picker
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
      return;
    }

    // Cancel any ongoing poll interval immediately
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    // Generate unique request ID to ignore outdated responses
    currentRequestId.current += 1;
    const thisRequestId = currentRequestId.current;

    setIsProcessing(true);
    setProcessingGarmentId(garment.id);
    setJobProgress(15);
    setProcessingStageMessage("Creating Your Virtual Look...");
    setTryonError(null);

    try {
      const formData = new FormData();
      formData.append("garment_id", garment.id);
      formData.append("user_consent", "true");
      if (activeSession) {
        formData.append("session_id", activeSession);
      }

      const res = await fetch('/api/tryon/jobs', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Could not submit try-on job.");
      }

      const data = await res.json();
      const jobId = data.job_id;

      // Start asynchronous polling loop
      let pollCount = 0;
      pollIntervalRef.current = setInterval(async () => {
        // If customer clicked another outfit in the meantime, discard this poll!
        if (currentRequestId.current !== thisRequestId) {
          clearInterval(pollIntervalRef.current);
          return;
        }

        pollCount += 1;
        try {
          const statusRes = await fetch(`/api/tryon/jobs/${jobId}`);
          if (!statusRes.ok) return;

          const statusData = await statusRes.json();

          // Check again before updating UI
          if (currentRequestId.current !== thisRequestId) {
            clearInterval(pollIntervalRef.current);
            return;
          }

          if (statusData.status === 'processing') {
            if (pollCount <= 4) {
              setJobProgress(30);
              setProcessingStageMessage("Preparing Model...");
            } else if (pollCount <= 12) {
              setJobProgress(60);
              setProcessingStageMessage("Generating Outfit...");
            } else {
              setJobProgress(85);
              setProcessingStageMessage("Refining Silhouette & Drapery...");
            }
          } else if (statusData.status === 'completed') {
            clearInterval(pollIntervalRef.current);
            setJobProgress(100);
            setProcessingStageMessage("Generation completed!");
            setTimeout(() => {
              if (currentRequestId.current === thisRequestId) {
                setResultUrl(statusData.result_url);
                setIsProcessing(false);
                setProcessingGarmentId(null);
              }
            }, 400);
          } else if (statusData.status === 'failed') {
            clearInterval(pollIntervalRef.current);
            setIsProcessing(false);
            setProcessingGarmentId(null);

            const errMsg = statusData.error_message || "AI Virtual Try-On failed to generate result.";
            const errCode = statusData.error_code || (errMsg.toLowerCase().includes("quota") ? "QUOTA_EXHAUSTED" : "GENERATION_FAILED");
            const retryAfter = statusData.retry_after_seconds;

            setTryonError({
              message: errMsg,
              code: errCode,
              retryAfterSeconds: retryAfter,
              garment: garment
            });
          }

          // Timeout guard after 120s
          if (pollCount > 48) {
            clearInterval(pollIntervalRef.current);
            if (currentRequestId.current === thisRequestId) {
              setIsProcessing(false);
              setProcessingGarmentId(null);
              setTryonError({
                message: "Inference timed out. The public AI model queue is busy. Please try again.",
                isQuota: false,
                garment: garment
              });
            }
          }
        } catch (err) {
          console.error("Poll error:", err);
        }
      }, 2500);

    } catch (err) {
      if (currentRequestId.current === thisRequestId) {
        setIsProcessing(false);
        setProcessingGarmentId(null);
        setTryonError({
          message: err.message || "Failed to start virtual try-on.",
          isQuota: false,
          garment: garment
        });
      }
    }
  };

  // Outfit Card Click Handler (AUTOMATIC TRY-ON)
  const handleOutfitClick = (item) => {
    setSelectedGarment(item);
    // Automatically start virtual try-on immediately
    startVirtualTryon(item);
  };

  // Reset session
  const handleReset = async () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setCustomerPhotoUrl(null);
    setCustomerSessionId(null);
    setResultUrl(null);
    setIsProcessing(false);
    setProcessingGarmentId(null);
    setTryonError(null);
    localStorage.removeItem('aura_session_id');
    localStorage.removeItem('aura_photo_url');
  };

  // Retry currently selected outfit
  const handleRetry = () => {
    if (selectedGarment) {
      startVirtualTryon(selectedGarment);
    }
  };

  return (
    <div>
      {/* Hidden file input for photo upload */}
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
      />

      {/* Top Header */}
      <Header 
        onOpenQR={() => setShowQRModal(true)}
        onOpenGuide={() => setShowGuideModal(true)}
        onOpenAdmin={() => setShowAdminModal(true)}
      />

      {/* Main Studio Viewport */}
      <main className="studio-main">
        {/* Left/Center: Dressing Stage with Split Slider and In-Stage Loading */}
        <DressingStage 
          customerPhotoUrl={customerPhotoUrl}
          resultUrl={resultUrl}
          selectedGarment={selectedGarment}
          onUploadClick={() => fileInputRef.current && fileInputRef.current.click()}
          onSelectSampleModel={handleSelectSampleModel}
          onRetry={handleRetry}
          onReset={handleReset}
          onOpenTokenConfig={() => setShowAdminModal(true)}
          onDismissError={() => setTryonError(null)}
          isProcessing={isProcessing}
          processingStageMessage={processingStageMessage}
          jobProgress={jobProgress}
          tryonError={tryonError}
        />

        {/* Right: Categorized Clothing Catalog Drawer with Clickable Cards */}
        <CatalogDrawer 
          catalogItems={catalogItems}
          selectedGarment={selectedGarment}
          onOutfitClick={handleOutfitClick}
          activeDepartment={activeDepartment}
          setActiveDepartment={setActiveDepartment}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isProcessing={isProcessing}
          processingGarmentId={processingGarmentId}
        />
      </main>

      {/* Modals */}
      <QRModal 
        isOpen={showQRModal} 
        onClose={() => setShowQRModal(false)} 
        sessionId={customerSessionId}
        customerPhotoUrl={customerPhotoUrl}
      />

      <PhotoGuidanceModal 
        isOpen={showGuideModal} 
        onClose={() => setShowGuideModal(false)} 
      />

      <AdminStudioModal 
        isOpen={showAdminModal} 
        onClose={() => setShowAdminModal(false)}
        onRefreshCatalog={fetchCatalog}
      />
    </div>
  );
}
