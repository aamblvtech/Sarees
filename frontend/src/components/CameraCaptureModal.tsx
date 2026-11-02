import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, RefreshCw, Sparkles, ShieldCheck, AlertCircle, Check, X, SlidersHorizontal } from 'lucide-react';
import { SareeProduct, TryOnJob } from '../types';
import { api } from '../services/api';

interface CameraCaptureModalProps {
  product: SareeProduct;
  isOpen: boolean;
  onClose: () => void;
  sessionId?: string;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  product,
  isOpen,
  onClose,
  sessionId,
}) => {
  const [mode, setMode] = useState<'consent' | 'capture' | 'preview' | 'processing' | 'result'>('consent');
  const [consentGiven, setConsentGiven] = useState(false);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [drapeStyle, setDrapeStyle] = useState<'nivi' | 'bengali' | 'gujarati'>('nivi');
  const [preferredProvider, setPreferredProvider] = useState<'artcraft' | 'fal' | 'replicate' | 'mock'>('artcraft');
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [job, setJob] = useState<TryOnJob | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let timer: any;
    if (mode === 'processing') {
      setElapsedSec(0);
      timer = setInterval(() => {
        setElapsedSec(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [mode]);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setMode('consent');
      setPhotoDataUrl(null);
      setJob(null);
      setErrorMsg(null);
    }
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access API is not supported in this browser environment. Please use photo upload.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1080 },
          height: { ideal: 1440 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      console.warn('Camera initiation failed:', err);
      setCameraError(err.message || 'Camera permission denied or camera device unavailable.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleCaptureSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 720;
    canvas.height = videoRef.current.videoHeight || 960;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setPhotoDataUrl(dataUrl);

    // Convert dataUrl to File
    fetch(dataUrl)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setPhotoFile(file);
      });

    stopCamera();
    setMode('preview');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErrorMsg('Please upload a valid JPEG, PNG, or WebP image.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Photo size must be under 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoDataUrl(reader.result as string);
      setPhotoFile(file);
      setMode('preview');
    };
    reader.readAsDataURL(file);
  };

  const handleStartProcessing = async () => {
    if (!consentGiven) {
      setErrorMsg('Consent is strictly required before virtual draping.');
      return;
    }

    setMode('processing');
    setErrorMsg(null);

    try {
      const formData = new FormData();
      if (photoFile) {
        formData.append('photo', photoFile);
      }
      formData.append('productId', product.id);
      formData.append('drapeStyle', drapeStyle);
      formData.append('preferredProvider', preferredProvider);
      formData.append('consentGiven', 'true');
      if (sessionId) {
        formData.append('sessionId', sessionId);
      }

      const submitRes = await api.submitTryOn(formData);
      const jobId = submitRes.jobId;

      // Poll job status
      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        try {
          const pollRes = await api.pollTryOnJob(jobId);
          if (pollRes.status === 'completed') {
            clearInterval(pollInterval);
            setJob(pollRes);
            setMode('result');
          } else if (pollRes.status === 'failed' || pollRes.status === 'model_unavailable') {
            clearInterval(pollInterval);
            setErrorMsg(pollRes.errorMessage || 'Virtual draping inference failed. Check server logs.');
            setMode('preview');
          } else if (attempts >= 60) {
            clearInterval(pollInterval);
            setErrorMsg('Inference timed out after 120 seconds. Serverless GPU inference may be queued or initializing. Please retry.');
            setMode('preview');
          }
        } catch (e: any) {
          clearInterval(pollInterval);
          setErrorMsg(e.message || 'Error checking try-on progress.');
          setMode('preview');
        }
      }, 2000);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to submit try-on job.');
      setMode('preview');
    }
  };

  const handlePurgeAndClose = async () => {
    if (sessionId) {
      try {
        await api.purgeSessionData(sessionId);
      } catch (e) {
        console.warn('Purge notice failed', e);
      }
    }
    stopCamera();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in">
      <div className="bg-[#FAF7F0] border border-[#B99A5B] rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col justify-between">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E8E2D5] flex items-center justify-between bg-[#F2EDE2]/60 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-[#681D32] text-white rounded-lg">
              <Sparkles className="w-4 h-4 text-[#B99A5B]" />
            </span>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#681D32]">
                Virtual Saree Drape Studio
              </h3>
              <div className="text-xs text-[#292522]/70">
                Selected: <span className="font-semibold text-[#292522]">{product.name}</span> ({product.sku})
              </div>
            </div>
          </div>
          <button
            onClick={handlePurgeAndClose}
            className="p-1.5 rounded-full hover:bg-[#E8E2D5] text-[#292522]/70 hover:text-[#292522]"
            title="Close & Purge Temporary Photo"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 p-4 bg-amber-50/90 border border-amber-300 text-amber-900 rounded-xl text-xs space-y-2 shadow-sm">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 shrink-0 text-amber-700 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-amber-900">
                    {errorMsg.toLowerCase().includes('credit')
                      ? 'Cloud Compute Credits Required'
                      : errorMsg.toLowerCase().includes('fal_key') || errorMsg.toLowerCase().includes('replicate_api_token')
                      ? 'Cloud Provider Configuration Notice'
                      : 'Virtual Draping Inference Notice'}
                  </div>
                  <p className="text-amber-800 leading-relaxed">{errorMsg}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 pl-7">
                {errorMsg.toLowerCase().includes('artcraft') && (
                  <a
                    href="https://app.getartcraft.com"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#681D32] hover:bg-[#852842] text-white text-[11px] font-semibold rounded-lg shadow-sm transition-colors"
                  >
                    <span>ArtCraft Dashboard & Keys</span>
                    <span className="text-[10px]">↗</span>
                  </a>
                )}
                {errorMsg.toLowerCase().includes('fal') && (
                  <a
                    href="https://fal.ai/dashboard/billing"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#681D32] hover:bg-[#852842] text-white text-[11px] font-semibold rounded-lg shadow-sm transition-colors"
                  >
                    <span>Fal.ai Dashboard & Billing</span>
                    <span className="text-[10px]">↗</span>
                  </a>
                )}
                {errorMsg.toLowerCase().includes('replicate') && (
                  <a
                    href="https://replicate.com/account/billing#billing"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#681D32] hover:bg-[#852842] text-white text-[11px] font-semibold rounded-lg shadow-sm transition-colors"
                  >
                    <span>Add Replicate Credits</span>
                    <span className="text-[10px]">↗</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setPreferredProvider('mock');
                    setErrorMsg(null);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 text-[11px] font-semibold border border-amber-300 rounded-lg transition-colors"
                >
                  <span>Switch to Instant Studio Simulation</span>
                </button>
              </div>
            </div>
          )}

          {/* STAGE 1: PRIVACY CONSENT */}
          {mode === 'consent' && (
            <div className="space-y-5">
              <div className="bg-[#FAF7F0] border border-[#B99A5B]/40 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 text-[#681D32] font-semibold text-sm mb-2">
                  <ShieldCheck className="w-5 h-5 text-[#B99A5B]" />
                  <span>SAJEE Atelier Biometric & Image Privacy Protocol</span>
                </div>
                <p className="text-xs text-[#292522]/80 leading-relaxed">
                  To drape this <strong className="text-[#681D32]">{product.name}</strong> virtually, our system requires a clear full-length or upper-body portrait photograph.
                </p>
                <ul className="text-xs text-[#292522]/75 space-y-1.5 mt-3 list-disc pl-5">
                  <li>Your photo is transmitted securely via TLS encryption directly to our local studio inference server.</li>
                  <li>Images are never sold, indexed into public catalogs, or sent to unauthorized third parties.</li>
                  <li>Photos are automatically purged after your session ends or instantly upon clicking <em>“Delete Photo and End Session”</em>.</li>
                  <li>Visual previews are virtual simulations to assist your styling decision; physical fabric feel is experienced at our salon fitting suite.</li>
                </ul>
              </div>

              <label className="flex items-start gap-3 p-3 bg-[#F2EDE2]/70 rounded-lg cursor-pointer border border-[#E8E2D5] hover:border-[#681D32]">
                <input
                  type="checkbox"
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
                  className="mt-0.5 rounded text-[#681D32] focus:ring-[#681D32]"
                />
                <span className="text-xs text-[#292522] leading-tight">
                  I consent to the temporary capture and processing of my photograph solely for the purpose of virtual saree draping visualization.
                </span>
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-[#E8E2D5] text-xs font-semibold rounded-lg text-[#292522] hover:bg-[#F2EDE2]"
                >
                  Cancel
                </button>
                <button
                  disabled={!consentGiven}
                  onClick={() => {
                    setMode('capture');
                    startCamera();
                  }}
                  className={`px-6 py-2 rounded-lg text-xs font-semibold text-white transition-all shadow ${
                    consentGiven ? 'bg-[#681D32] hover:bg-[#852842]' : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  Proceed to Photo Capture
                </button>
              </div>
            </div>
          )}

          {/* STAGE 2: CAMERA CAPTURE OR UPLOAD */}
          {mode === 'capture' && (
            <div className="space-y-4">
              <div className="relative aspect-[3/4] max-h-[380px] mx-auto rounded-xl overflow-hidden bg-black flex items-center justify-center border-2 border-[#B99A5B]/40">
                {cameraActive ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover mirror"
                    />
                    {/* Guidance Overlay */}
                    <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-[#FAF7F0]/40 m-6 rounded-2xl flex flex-col items-center justify-between p-4">
                      <span className="bg-black/60 text-[#FAF7F0] text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm">
                        Align Shoulders & Torso in Frame
                      </span>
                      <span className="text-[11px] text-[#FAF7F0]/80 bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm">
                        Evenly lit • Plain backdrop recommended
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="p-6 text-center text-[#FAF7F0] space-y-3">
                    <Camera className="w-10 h-10 mx-auto text-[#B99A5B]" />
                    <p className="text-xs text-[#FAF7F0]/80 max-w-xs mx-auto">
                      {cameraError || 'Camera inactive. Click "Enable Camera" or upload a clear portrait photo directly.'}
                    </p>
                    <div className="flex justify-center gap-2 pt-2">
                      <button
                        onClick={startCamera}
                        className="px-3 py-1.5 bg-[#681D32] text-xs font-semibold rounded text-white hover:bg-[#852842]"
                      >
                        Enable Camera
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 border border-[#B99A5B] bg-[#FAF7F0] text-[#681D32] hover:bg-[#B99A5B]/10 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <Upload className="w-4 h-4 text-[#B99A5B]" />
                  <span>Upload Photo Instead</span>
                </button>

                {cameraActive && (
                  <button
                    onClick={handleCaptureSnapshot}
                    className="px-6 py-2.5 bg-[#681D32] hover:bg-[#852842] text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg"
                  >
                    <Camera className="w-4 h-4 text-[#B99A5B]" />
                    <span>Take Snapshot</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STAGE 3: PREVIEW & DRAPE STYLE SELECTOR */}
          {mode === 'preview' && photoDataUrl && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="aspect-[3/4] max-h-[300px] rounded-xl overflow-hidden border border-[#B99A5B] bg-[#F2EDE2]">
                  <img src={photoDataUrl} alt="Captured preview" className="w-full h-full object-cover" />
                </div>

                <div className="space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <h4 className="font-serif font-bold text-sm text-[#681D32]">Styling & Draping Parameters</h4>
                    
                    <div>
                      <label className="text-xs text-[#292522]/80 font-medium block mb-1.5">
                        Traditional Saree Drape Form:
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['nivi', 'bengali', 'gujarati'] as const).map(style => (
                          <button
                            key={style}
                            onClick={() => setDrapeStyle(style)}
                            className={`p-2 text-xs rounded-lg border capitalize font-semibold transition-all ${
                              drapeStyle === style
                                ? 'border-[#681D32] bg-[#681D32] text-white shadow-sm'
                                : 'border-[#E8E2D5] bg-[#FAF7F0] text-[#292522] hover:border-[#B99A5B]'
                            }`}
                          >
                            {style}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-[#292522]/60 mt-1">
                        {drapeStyle === 'nivi' && 'Nivi Style: Classic pleats centered with pallu draped over left shoulder.'}
                        {drapeStyle === 'bengali' && 'Bengali Style: Broad ornamental box pleats with keys pallu fall.'}
                        {drapeStyle === 'gujarati' && 'Gujarati Style: Front-facing grand zari pallu spread over right shoulder.'}
                      </p>
                    </div>

                    <div>
                      <label className="text-xs text-[#292522]/80 font-medium block mb-1.5">
                        Inference Pipeline Engine:
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <button
                          type="button"
                          onClick={() => setPreferredProvider('artcraft')}
                          className={`p-2 text-xs rounded-lg border text-left transition-all ${
                            preferredProvider === 'artcraft'
                              ? 'border-[#681D32] bg-[#681D32]/10 text-[#681D32] font-bold shadow-sm'
                              : 'border-[#E8E2D5] bg-[#FAF7F0] text-[#292522] hover:border-[#B99A5B]'
                          }`}
                        >
                          <div className="flex items-center gap-1 font-bold">
                            <Sparkles className="w-3.5 h-3.5 text-[#B99A5B] shrink-0" />
                            <span className="truncate">ArtCraft AI</span>
                          </div>
                          <div className="text-[10px] text-[#292522]/60 font-normal mt-0.5 truncate">
                            getartcraft.com
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPreferredProvider('fal')}
                          className={`p-2 text-xs rounded-lg border text-left transition-all ${
                            preferredProvider === 'fal'
                              ? 'border-[#681D32] bg-[#681D32]/10 text-[#681D32] font-bold shadow-sm'
                              : 'border-[#E8E2D5] bg-[#FAF7F0] text-[#292522] hover:border-[#B99A5B]'
                          }`}
                        >
                          <div className="flex items-center gap-1 font-bold">
                            <Sparkles className="w-3.5 h-3.5 text-[#B99A5B] shrink-0" />
                            <span className="truncate">Fal.ai Cloud</span>
                          </div>
                          <div className="text-[10px] text-[#292522]/60 font-normal mt-0.5 truncate">
                            Image Apps v2
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPreferredProvider('replicate')}
                          className={`p-2 text-xs rounded-lg border text-left transition-all ${
                            preferredProvider === 'replicate'
                              ? 'border-[#681D32] bg-[#681D32]/10 text-[#681D32] font-bold shadow-sm'
                              : 'border-[#E8E2D5] bg-[#FAF7F0] text-[#292522] hover:border-[#B99A5B]'
                          }`}
                        >
                          <div className="flex items-center gap-1 font-bold">
                            <Sparkles className="w-3.5 h-3.5 text-[#B99A5B] shrink-0" />
                            <span className="truncate">Replicate</span>
                          </div>
                          <div className="text-[10px] text-[#292522]/60 font-normal mt-0.5 truncate">
                            IDM-VTON A100
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPreferredProvider('mock')}
                          className={`p-2 text-xs rounded-lg border text-left transition-all ${
                            preferredProvider === 'mock'
                              ? 'border-[#681D32] bg-[#681D32]/10 text-[#681D32] font-bold shadow-sm'
                              : 'border-[#E8E2D5] bg-[#FAF7F0] text-[#292522] hover:border-[#B99A5B]'
                          }`}
                        >
                          <div className="flex items-center gap-1 font-bold">
                            <ShieldCheck className="w-3.5 h-3.5 text-[#B99A5B] shrink-0" />
                            <span className="truncate">Simulation</span>
                          </div>
                          <div className="text-[10px] text-[#292522]/60 font-normal mt-0.5 truncate">
                            Studio Demo
                          </div>
                        </button>
                      </div>
                    </div>

                    <div className="p-3 bg-[#F2EDE2] rounded-lg text-xs space-y-1">
                      <div className="font-semibold text-[#681D32]">Fabric & Garment Spec:</div>
                      <div className="text-[#292522]/80">{product.fabric} • {product.borderType || 'Zari Border'}</div>
                      <div className="text-[10px] text-[#292522]/60">Component detection & Korvai color matching active.</div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => {
                        setMode('capture');
                        startCamera();
                      }}
                      className="px-3 py-2 border border-[#E8E2D5] text-xs font-medium rounded-lg text-[#292522] hover:bg-[#F2EDE2] flex items-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retake</span>
                    </button>

                    <button
                      onClick={handleStartProcessing}
                      className="flex-1 px-4 py-2 bg-[#681D32] hover:bg-[#852842] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow"
                    >
                      <Sparkles className="w-4 h-4 text-[#B99A5B]" />
                      <span>{errorMsg ? 'Retry Virtual Drape' : 'Generate Virtual Drape'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 4: PROCESSING INFERENCE ANIMATION */}
          {mode === 'processing' && (
            <div className="py-12 text-center space-y-5">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-[#E8E2D5]"></div>
                <div className="absolute inset-0 rounded-full border-4 border-[#681D32] border-t-transparent animate-spin"></div>
                <Sparkles className="w-8 h-8 text-[#B99A5B] absolute inset-0 m-auto animate-pulse" />
              </div>

              <div className="space-y-1.5">
                <h4 className="font-serif text-lg font-bold text-[#681D32]">
                  {preferredProvider === 'artcraft'
                    ? 'Synthesizing Luxury Saree Drape (ArtCraft AI)...'
                    : preferredProvider === 'fal'
                    ? 'Synthesizing Real AI Drape (Fal.ai)...'
                    : preferredProvider === 'replicate'
                    ? 'Synthesizing Real AI Drape (IDM-VTON)...'
                    : 'Synthesizing Heritage Drape Simulation...'}
                </h4>
                <p className="text-xs text-[#292522]/70 max-w-sm mx-auto">
                  {preferredProvider === 'artcraft'
                    ? 'Rendering photorealistic bridal drape on ArtCraft Omni cluster with custom textile reflection and zari luster.'
                    : preferredProvider === 'fal'
                    ? 'Executing generative virtual try-on on Fal.ai cloud cluster with pose preservation.'
                    : preferredProvider === 'replicate'
                    ? 'Executing generative diffusion on NVIDIA A100 serverless cloud cluster. Preserving saree motifs and pleating flow.'
                    : `Aligning body pleats, matching zari patina, and projecting pallu trajectory in ${drapeStyle} form.`}
                </p>
                <div className="text-xs font-semibold text-[#681D32] bg-[#FAF7F0] border border-[#B99A5B]/30 inline-block px-3 py-1 rounded-full shadow-sm mt-1">
                  ⏱️ Inference Elapsed: {elapsedSec}s {preferredProvider !== 'mock' ? '(typical: 15-35s)' : ''}
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 text-[11px] text-[#B99A5B] font-medium bg-[#B99A5B]/10 px-3 py-1 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Isolated Inference Pipeline • Zero Cloud Retention</span>
              </div>
            </div>
          )}

          {/* STAGE 5: RESULT & BEFORE/AFTER */}
          {mode === 'result' && job && (
            <div className="space-y-4">
              <div className="relative aspect-[3/4] max-h-[420px] mx-auto rounded-xl overflow-hidden border border-[#B99A5B] shadow-lg bg-[#292522]">
                <img
                  src={job.resultImageUrl || photoDataUrl || product.primaryImage}
                  alt="Draped Virtual Result"
                  className="w-full h-full object-cover"
                />

                {/* Honest Simulation/AI Disclaimer Banner */}
                <div className="absolute bottom-0 inset-x-0 bg-[#292522]/90 backdrop-blur-md text-[#FAF7F0] p-3 text-[11px] border-t border-[#B99A5B]">
                  <div className="flex items-center justify-between font-semibold text-[#B99A5B] mb-0.5">
                    <span>
                      {job.isSimulation || job.provider === 'mock'
                        ? 'SAJEE STUDIO SIMULATION PREVIEW (NON-AI)'
                        : job.provider === 'artcraft'
                        ? 'REAL AI CLOUD DRAPE (ARTCRAFT OMNI GENERATION)'
                        : job.provider === 'fal'
                        ? 'REAL AI CLOUD DRAPE (FAL.AI IMAGE APPS V2)'
                        : 'REAL AI CLOUD DRAPE (IDM-VTON ON A100 GPU)'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-black/50 text-[#B99A5B]">
                      {job.isSimulation || job.provider === 'mock'
                        ? 'STUDIO SIMULATION'
                        : job.provider === 'artcraft'
                        ? 'ARTCRAFT AI'
                        : job.provider === 'fal'
                        ? 'FAL.AI CLOUD'
                        : 'REAL AI DIFFUSION'}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#FAF7F0]/80 leading-tight">
                    {job.isSimulation || job.provider === 'mock'
                      ? 'This visual preview is generated by studio simulation for UI demonstration. It is NOT real AI generative diffusion.'
                      : job.disclaimer}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E8E2D5]">
                <button
                  onClick={handlePurgeAndClose}
                  className="px-3.5 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4 text-red-600" />
                  <span>Delete Photo & End Session</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setMode('capture');
                      startCamera();
                    }}
                    className="px-3 py-2 border border-[#B99A5B] bg-[#FAF7F0] text-[#681D32] hover:bg-[#B99A5B]/10 rounded-lg text-xs font-medium"
                  >
                    Try Another Photo
                  </button>
                  <button
                    onClick={onClose}
                    className="px-5 py-2 bg-[#681D32] hover:bg-[#852842] text-white rounded-lg text-xs font-bold shadow"
                  >
                    Keep in Showroom Selection
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
