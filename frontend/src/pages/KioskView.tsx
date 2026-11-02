import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, QrCode, Camera, ShieldCheck, RefreshCw, CheckCircle2, ChevronRight, ArrowLeft, ArrowRight, UserCheck, HelpCircle, Layers, Sliders, LogOut } from 'lucide-react';
import { SareeProduct, TryOnJob } from '../types';
import { api } from '../services/api';

type KioskStep =
  | 'welcome'              // 1. Welcome
  | 'scan_qr'              // 2. Scan QR
  | 'collection_loaded'    // 3. Collection loaded
  | 'consent'              // 4. Customer consent
  | 'capture_photo'        // 5. Capture person photo
  | 'photo_confirmation'   // 6. Photo confirmation
  | 'select_saree'         // 7. Select saree
  | 'ai_processing'        // 8. AI processing
  | 'tryon_result'         // 9. Try-on result
  | 'compare_sarees'       // 10. Compare sarees
  | 'request_staff'        // 11. Request staff assistance
  | 'finish_session';      // 12. Finish session & clear data

interface KioskViewProps {
  products: SareeProduct[];
}

export const KioskView: React.FC<KioskViewProps> = ({ products }) => {
  const [currentStep, setCurrentStep] = useState<KioskStep>('welcome');
  const [sessionToken, setSessionToken] = useState('demo-session-token');
  const [collectionSarees, setCollectionSarees] = useState<SareeProduct[]>(products.slice(0, 3));
  const [selectedSaree, setSelectedSaree] = useState<SareeProduct>(products[0] || {} as any);
  const [compareSaree, setCompareSaree] = useState<SareeProduct>(products[1] || {} as any);
  
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [kioskError, setKioskError] = useState<string | null>(null);
  const [tryOnJob, setTryOnJob] = useState<TryOnJob | null>(null);
  const [staffRequested, setStaffRequested] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Auto heartbeat
  useEffect(() => {
    const timer = setInterval(() => {
      // Keep kiosk heartbeat alive
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Kiosk camera feed unavailable on this sensor input.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1080 }, height: { ideal: 1920 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      setCameraError(err.message || 'Camera input sensor not detected.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 720;
    canvas.height = videoRef.current.videoHeight || 960;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      setPhotoDataUrl(canvas.toDataURL('image/jpeg', 0.9));
    }
    stopCamera();
    setCurrentStep('photo_confirmation');
  };

  const handleStartInference = async (saree: SareeProduct) => {
    setSelectedSaree(saree);
    setCurrentStep('ai_processing');
    setKioskError(null);

    try {
      const formData = new FormData();
      formData.append('productId', saree.id);
      formData.append('consentGiven', 'true');
      formData.append('drapeStyle', 'nivi');
      // In showroom kiosk demo mode, use fast deterministic simulation
      formData.append('preferredProvider', 'mock');

      const submitRes = await api.submitTryOn(formData);
      const jId = submitRes.jobId;

      let attempts = 0;
      const pollTimer = setInterval(async () => {
        attempts++;
        try {
          const res = await api.pollTryOnJob(jId);
          if (res.status === 'completed') {
            clearInterval(pollTimer);
            setTryOnJob(res);
            setCurrentStep('tryon_result');
          } else if (res.status === 'failed' || res.status === 'model_unavailable') {
            clearInterval(pollTimer);
            setKioskError(res.errorMessage || 'Virtual draping inference failed.');
            setCurrentStep('select_saree');
          } else if (attempts > 30) {
            clearInterval(pollTimer);
            setKioskError('Inference timed out. Please tap to retry.');
            setCurrentStep('select_saree');
          }
        } catch (e: any) {
          clearInterval(pollTimer);
          setKioskError(e.message || 'Error communicating with try-on service.');
          setCurrentStep('select_saree');
        }
      }, 1500);
    } catch (e: any) {
      setKioskError(e.message || 'Failed to submit try-on job.');
      setCurrentStep('select_saree');
    }
  };

  const handleFinishAndClear = () => {
    stopCamera();
    setPhotoDataUrl(null);
    setTryOnJob(null);
    setStaffRequested(false);
    setCurrentStep('finish_session');
    setTimeout(() => {
      setCurrentStep('welcome');
    }, 3500);
  };

  return (
    <div className="min-h-screen bg-[#292522] py-6 px-4 flex flex-col items-center justify-center">
      
      {/* Freestanding Monolith Chassis Frame Preview */}
      <div className="w-full max-w-md sm:max-w-lg lg:max-w-xl aspect-[9/16] bg-[#681D32] rounded-[42px] p-5 shadow-2xl border-4 border-[#B99A5B] flex flex-col justify-between relative overflow-hidden">
        
        {/* Chassis Top Bar: High-Resolution Camera & Studio Lighting Sensor */}
        <div className="flex items-center justify-between px-6 py-2 bg-black/40 rounded-full border border-[#B99A5B]/30 mb-3 text-[11px] text-[#FAF7F0]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-semibold text-xs tracking-wider">KIOSK ALPHA • SALON 01</span>
          </div>

          <div className="w-4 h-4 rounded-full bg-black border border-[#B99A5B] flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
          </div>

          <div className="text-[10px] text-[#B99A5B] font-mono">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        {/* 12-Screen Interactive Kiosk Display Engine */}
        <div className="flex-1 bg-[#FAF7F0] rounded-[28px] overflow-hidden flex flex-col justify-between relative p-6 border border-[#E8E2D5] shadow-inner text-[#292522]">
          
          {/* STEP 1: WELCOME SCREEN */}
          {currentStep === 'welcome' && (
            <div className="flex-1 flex flex-col justify-between text-center py-6 animate-in fade-in">
              <div className="space-y-2">
                <span className="text-[11px] uppercase tracking-widest text-[#B99A5B] font-bold">
                  Atelier Virtual Draping Suite
                </span>
                <h1 className="font-serif text-3xl font-bold text-[#681D32]">
                  SAJEE
                </h1>
                <p className="text-xs text-[#292522]/70 italic font-serif">
                  “Drape Your Elegance.”
                </p>
              </div>

              <div className="relative aspect-[4/5] rounded-2xl overflow-hidden border-2 border-[#B99A5B]/40 shadow-lg mx-auto max-w-xs my-4 group">
                <img
                  src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=85"
                  alt="Heirloom Saree"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                  <div className="text-left text-white">
                    <div className="text-[10px] text-[#B99A5B] font-bold uppercase">Heritage Silk Archive</div>
                    <div className="font-serif font-bold text-sm">Preview Sarees Instantly</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setCurrentStep('scan_qr')}
                  className="w-full py-4 bg-[#681D32] hover:bg-[#852842] text-white rounded-2xl font-bold text-sm shadow-sajee flex items-center justify-center gap-2 group transition-all"
                >
                  <QrCode className="w-5 h-5 text-[#B99A5B] group-hover:scale-110 transition-transform" />
                  <span>Tap to Scan Selection QR</span>
                </button>

                <button
                  onClick={() => {
                    setCollectionSarees(products.slice(0, 3));
                    setCurrentStep('collection_loaded');
                  }}
                  className="text-xs text-[#681D32] hover:underline font-semibold"
                >
                  Or Explore Salon Curated Suite (Demo Guest)
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: SCAN QR CODE */}
          {currentStep === 'scan_qr' && (
            <div className="flex-1 flex flex-col justify-between py-4 text-center animate-in fade-in">
              <div className="space-y-2">
                <button onClick={() => setCurrentStep('welcome')} className="text-xs text-[#681D32] font-semibold flex items-center gap-1">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <h2 className="font-serif text-2xl font-bold text-[#681D32]">Scan Associate QR</h2>
                <p className="text-xs text-[#292522]/70">
                  Hold your phone or QR card printed by store associate Ananya up to the sensor.
                </p>
              </div>

              <div className="w-48 h-48 mx-auto rounded-2xl border-4 border-[#681D32] p-4 flex items-center justify-center bg-white shadow-lg relative">
                <QrCode className="w-32 h-32 text-[#681D32]" />
                <div className="absolute inset-x-2 top-0 h-1 bg-[#B99A5B] animate-pulse"></div>
              </div>

              <button
                onClick={() => {
                  setCollectionSarees(products.slice(0, 4));
                  setCurrentStep('collection_loaded');
                }}
                className="w-full py-3.5 bg-[#681D32] text-white font-bold text-xs rounded-xl shadow"
              >
                Simulate QR Scanned Successfully
              </button>
            </div>
          )}

          {/* STEP 3: COLLECTION LOADED */}
          {currentStep === 'collection_loaded' && (
            <div className="flex-1 flex flex-col justify-between py-4 animate-in fade-in">
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-[#B99A5B] font-bold">Session Synchronized</span>
                <h2 className="font-serif text-2xl font-bold text-[#681D32]">
                  Your Curated Suite ({collectionSarees.length} Sarees)
                </h2>
                <p className="text-xs text-[#292522]/70">Curated by Senior Draper Ananya Sharma</p>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto py-2">
                {collectionSarees.map(s => (
                  <div key={s.id} className="flex items-center gap-3 p-2 bg-[#F2EDE2] rounded-xl border border-[#E8E2D5]">
                    <img src={s.primaryImage} alt={s.name} className="w-12 h-14 object-cover rounded-lg" />
                    <div>
                      <div className="font-serif font-bold text-xs text-[#681D32]">{s.name}</div>
                      <div className="text-[11px] text-[#292522]/70">{s.sku} • ₹{s.price.toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setCurrentStep('consent')}
                className="w-full py-3.5 bg-[#681D32] text-white font-bold text-xs rounded-xl shadow flex items-center justify-center gap-2"
              >
                <span>Proceed to Biometric Consent</span>
                <ArrowRight className="w-4 h-4 text-[#B99A5B]" />
              </button>
            </div>
          )}

          {/* STEP 4: CUSTOMER CONSENT */}
          {currentStep === 'consent' && (
            <div className="flex-1 flex flex-col justify-between py-4 animate-in fade-in space-y-4">
              <div className="space-y-2">
                <ShieldCheck className="w-8 h-8 text-[#B99A5B] mx-auto" />
                <h2 className="font-serif text-2xl font-bold text-[#681D32] text-center">Touchscreen Consent</h2>
                <div className="bg-[#F2EDE2] p-4 rounded-xl text-xs space-y-2 text-[#292522]/80 leading-relaxed border border-[#E8E2D5]">
                  <p>• The top-mounted sensor will take a single full-body portrait.</p>
                  <p>• Your photograph is processed solely for virtual drape projection.</p>
                  <p>• Your photo is permanently wiped the instant you exit this session.</p>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    setCurrentStep('capture_photo');
                    startCamera();
                  }}
                  className="w-full py-3.5 bg-[#681D32] text-white font-bold text-xs rounded-xl shadow flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#B99A5B]" />
                  <span>I Agree & Enable Salon Camera</span>
                </button>
                <button
                  onClick={() => setCurrentStep('welcome')}
                  className="w-full py-2 text-xs text-[#292522]/60 font-medium"
                >
                  Decline & Return to Welcome
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: CAPTURE PERSON PHOTO */}
          {currentStep === 'capture_photo' && (
            <div className="flex-1 flex flex-col justify-between py-2 text-center animate-in fade-in">
              <div className="text-xs font-semibold text-[#681D32]">
                Stand on the Salon Footprints • Look Straight
              </div>

              <div className="relative aspect-[3/4] max-h-72 mx-auto rounded-2xl overflow-hidden bg-black border-2 border-[#B99A5B] shadow-inner flex items-center justify-center">
                {cameraActive ? (
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                ) : (
                  <div className="p-4 text-xs text-white/80 space-y-2">
                    <Camera className="w-8 h-8 text-[#B99A5B] mx-auto" />
                    <div>{cameraError || 'Camera sensor initializing...'}</div>
                    <button
                      onClick={startCamera}
                      className="px-3 py-1 bg-[#681D32] rounded text-white text-[11px]"
                    >
                      Retry Sensor
                    </button>
                  </div>
                )}
                {/* Silhouette Guide Overlay */}
                <div className="absolute inset-4 border-2 border-dashed border-[#FAF7F0]/40 rounded-2xl pointer-events-none flex items-center justify-center">
                  <span className="text-[10px] text-white/80 bg-black/60 px-2 py-0.5 rounded">Align Full Height</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={takeSnapshot}
                  className="w-full py-3.5 bg-[#681D32] text-white font-bold text-xs rounded-xl shadow flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4 text-[#B99A5B]" />
                  <span>Capture Snapshot</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: PHOTO CONFIRMATION */}
          {currentStep === 'photo_confirmation' && (
            <div className="flex-1 flex flex-col justify-between py-4 text-center animate-in fade-in">
              <h2 className="font-serif text-2xl font-bold text-[#681D32]">Confirm Your Photo</h2>
              
              <div className="aspect-[3/4] max-h-64 mx-auto rounded-xl overflow-hidden border border-[#B99A5B] bg-black">
                {photoDataUrl ? (
                  <img src={photoDataUrl} alt="Snapshot" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-white">Preview unavailable</div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setCurrentStep('capture_photo');
                    startCamera();
                  }}
                  className="flex-1 py-3 border border-[#E8E2D5] rounded-xl text-xs font-semibold hover:bg-[#F2EDE2]"
                >
                  Retake Photo
                </button>
                <button
                  onClick={() => setCurrentStep('select_saree')}
                  className="flex-1 py-3 bg-[#681D32] text-white rounded-xl text-xs font-bold shadow"
                >
                  Confirm & Select Saree
                </button>
              </div>
            </div>
          )}

          {/* STEP 7: SELECT SAREE */}
          {currentStep === 'select_saree' && (
            <div className="flex-1 flex flex-col justify-between py-4 animate-in fade-in">
              <div className="space-y-1">
                <h2 className="font-serif text-2xl font-bold text-[#681D32]">Select Saree to Drape</h2>
                <p className="text-xs text-[#292522]/70">Tap any saree from your curated suite</p>
              </div>

              {kioskError && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 space-y-1 my-2 text-left">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-700" />
                    <span>Draping Status Notice</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-snug">{kioskError}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 max-h-72 overflow-y-auto py-2">
                {collectionSarees.map(s => (
                  <div
                    key={s.id}
                    onClick={() => handleStartInference(s)}
                    className="p-2 bg-[#FAF7F0] rounded-xl border-2 border-[#E8E2D5] hover:border-[#681D32] cursor-pointer shadow-xs transition-all text-left group"
                  >
                    <img src={s.primaryImage} alt={s.name} className="w-full aspect-[3/4] object-cover rounded-lg mb-1.5" />
                    <div className="font-serif font-bold text-xs text-[#681D32] truncate">{s.name}</div>
                    <div className="text-[10px] text-[#B99A5B] font-semibold">₹{s.price.toLocaleString('en-IN')}</div>
                  </div>
                ))}
              </div>

              <div className="text-[10px] text-center text-[#292522]/60">
                Tap any saree to begin instantaneous 4K AI draping
              </div>
            </div>
          )}

          {/* STEP 8: AI PROCESSING */}
          {currentStep === 'ai_processing' && (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-10 space-y-4 animate-in fade-in">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full border-4 border-[#E8E2D5]"></div>
                <div className="absolute inset-0 rounded-full border-4 border-[#681D32] border-t-transparent animate-spin"></div>
                <Sparkles className="w-8 h-8 text-[#B99A5B] absolute inset-0 m-auto" />
              </div>
              <h2 className="font-serif text-2xl font-bold text-[#681D32]">Synthesizing Heritage Drape</h2>
              <p className="text-xs text-[#292522]/70 max-w-xs">
                Rendering pleats, Korvai border alignment, and zari sheen for {selectedSaree.name}...
              </p>
            </div>
          )}

          {/* STEP 9: TRY-ON RESULT */}
          {currentStep === 'tryon_result' && tryOnJob && (
            <div className="flex-1 flex flex-col justify-between py-2 animate-in fade-in">
              <div className="relative aspect-[3/4] max-h-80 mx-auto rounded-2xl overflow-hidden border-2 border-[#B99A5B] shadow-xl bg-black">
                <img
                  src={tryOnJob.resultImageUrl || selectedSaree.primaryImage}
                  alt="Draped result"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 inset-x-0 bg-black/85 text-white p-2.5 text-[10px] border-t border-[#B99A5B]">
                  <div className="font-bold text-[#B99A5B]">
                    {tryOnJob.isSimulation ? 'SAJEE STUDIO SIMULATION PREVIEW (NON-AI)' : 'REAL AI CLOUD DRAPE'}
                  </div>
                  <div className="text-white/80 line-clamp-1">{selectedSaree.name} ({selectedSaree.sku}) • {tryOnJob.disclaimer}</div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="space-y-2 pt-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setCurrentStep('compare_sarees')}
                    className="py-2.5 bg-[#FAF7F0] border border-[#681D32] text-[#681D32] font-bold text-xs rounded-xl"
                  >
                    Compare 2 Sarees
                  </button>
                  <button
                    onClick={() => {
                      setStaffRequested(true);
                      setCurrentStep('request_staff');
                    }}
                    className="py-2.5 bg-[#B99A5B] text-black font-bold text-xs rounded-xl"
                  >
                    Request Draper Fitting
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentStep('select_saree')}
                    className="flex-1 py-2 text-xs font-semibold border border-[#E8E2D5] rounded-xl"
                  >
                    Try Another Saree
                  </button>
                  <button
                    onClick={handleFinishAndClear}
                    className="flex-1 py-2 bg-red-800 text-white font-bold text-xs rounded-xl"
                  >
                    End & Wipe Photos
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 10: COMPARE SAREES */}
          {currentStep === 'compare_sarees' && (
            <div className="flex-1 flex flex-col justify-between py-2 animate-in fade-in">
              <div className="text-center space-y-1">
                <h2 className="font-serif text-xl font-bold text-[#681D32]">Dual Weave Comparison</h2>
                <div className="text-[11px] text-[#292522]/70">Side-by-side drape analysis</div>
              </div>

              <div className="grid grid-cols-2 gap-2 my-2">
                <div className="p-2 bg-[#F2EDE2] rounded-xl border border-[#B99A5B]">
                  <img src={selectedSaree.primaryImage} alt="Option A" className="w-full aspect-[3/4] object-cover rounded-lg mb-1" />
                  <div className="font-bold text-[10px] text-[#681D32] truncate">{selectedSaree.name}</div>
                  <div className="text-[9px] text-[#292522]/70">₹{selectedSaree.price.toLocaleString('en-IN')}</div>
                </div>
                <div className="p-2 bg-[#F2EDE2] rounded-xl border border-[#E8E2D5]">
                  <img src={compareSaree.primaryImage} alt="Option B" className="w-full aspect-[3/4] object-cover rounded-lg mb-1" />
                  <div className="font-bold text-[10px] text-[#681D32] truncate">{compareSaree.name}</div>
                  <div className="text-[9px] text-[#292522]/70">₹{compareSaree.price.toLocaleString('en-IN')}</div>
                </div>
              </div>

              <button
                onClick={() => setCurrentStep('tryon_result')}
                className="w-full py-3 bg-[#681D32] text-white font-bold text-xs rounded-xl shadow"
              >
                Back to Single Drape
              </button>
            </div>
          )}

          {/* STEP 11: REQUEST STAFF ASSISTANCE */}
          {currentStep === 'request_staff' && (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-6 space-y-4 animate-in fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700">
                <UserCheck className="w-8 h-8" />
              </div>
              <h2 className="font-serif text-2xl font-bold text-[#681D32]">Stylist Notified!</h2>
              <p className="text-xs text-[#292522]/80 max-w-xs leading-relaxed">
                Associate <strong>Ananya Sharma</strong> has been dispatched to Salon Kiosk 01 with your selected saree: <br />
                <span className="font-semibold text-[#681D32]">{selectedSaree.name}</span>
              </p>
              <div className="text-[11px] text-[#292522]/60">
                Fitting Room Suite #2 is being prepared with pure silk accessories.
              </div>
              <button
                onClick={() => setCurrentStep('tryon_result')}
                className="px-6 py-2.5 bg-[#681D32] text-white rounded-xl text-xs font-bold"
              >
                Return to Screen
              </button>
            </div>
          )}

          {/* STEP 12: FINISH SESSION & CLEAR DATA */}
          {currentStep === 'finish_session' && (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-10 space-y-4 animate-in fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-400 flex items-center justify-center text-emerald-800">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h2 className="font-serif text-2xl font-bold text-[#681D32]">Session Concluded</h2>
              <div className="p-3 bg-[#F2EDE2] rounded-xl text-xs text-[#292522]/80 max-w-xs">
                Privacy policy executed: All captured portrait frames and temporary try-on artifacts have been permanently erased from local storage.
              </div>
              <div className="text-[11px] text-[#B99A5B] font-semibold">
                Returning to showroom welcome screen...
              </div>
            </div>
          )}

        </div>

        {/* Chassis Bottom Accent */}
        <div className="text-center pt-3 text-[10px] text-[#FAF7F0]/60 tracking-widest font-mono uppercase">
          SAJEE PROPRIETARY MONOLITH • ULTRA-WIDE PORTRAIT SENSOR
        </div>

      </div>
    </div>
  );
};
