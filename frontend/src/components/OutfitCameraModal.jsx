import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, RefreshCw, Check, AlertCircle, Sparkles, Shield, Maximize2, SwitchCamera } from 'lucide-react';
import cameraService from '../services/cameraService';

/**
 * OutfitCameraModal
 * Dedicated responsive camera capture modal for physical outfits & garments.
 * 
 * Features:
 * - Live camera preview with garment positioning overlay guide.
 * - Client-side image quality checks: minimum 250x250px, preferred >= 1024px,
 *   blank/underexposed frame detection, and sharpness heuristic.
 * - Touchscreen kiosk and desktop responsive controls (Capture, Retake, Use This Image).
 * - Immediate camera stream shutdown on close/confirm to guarantee privacy.
 */
export default function OutfitCameraModal({ isOpen, onClose, onOutfitCaptured }) {
  const [stream, setStream] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [capturedFile, setCapturedFile] = useState(null);
  const [qualityReport, setQualityReport] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [shutterFlash, setShutterFlash] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // Prefer back camera if available for garments, fallback to user
  const [availableDevices, setAvailableDevices] = useState([]);

  const videoRef = useRef(null);

  // Initialize camera when modal opens
  useEffect(() => {
    if (isOpen) {
      checkDevicesAndStart();
    } else {
      stopCameraStream();
      resetState();
    }

    return () => {
      stopCameraStream();
    };
  }, [isOpen]);

  const resetState = () => {
    setCapturedPhoto(null);
    setCapturedFile(null);
    setQualityReport(null);
    setCameraError(null);
    setIsCapturing(false);
  };

  const checkDevicesAndStart = async () => {
    try {
      if (navigator?.mediaDevices?.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setAvailableDevices(videoInputs);
      }
    } catch {
      // ignore
    }
    await startCameraStream(facingMode);
  };

  const startCameraStream = async (mode = facingMode) => {
    setIsInitializing(true);
    setCameraError(null);
    resetState();

    try {
      // Stop existing stream if running
      stopCameraStream();

      // Constraints: try higher resolution for garments (1024px+ preferred)
      const constraints = {
        video: {
          facingMode: mode,
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 }
        },
        audio: false
      };

      let mediaStream;
      try {
        mediaStream = await cameraService.startCamera(constraints);
      } catch (firstErr) {
        // Fallback to basic user facing camera if environment mode not supported
        if (mode === 'environment') {
          console.warn('[Outfit Camera] Environment camera unavailable, falling back to default:', firstErr.message);
          mediaStream = await cameraService.startCamera({ video: true, audio: false });
        } else {
          throw firstErr;
        }
      }

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('[Outfit Camera] Error initializing webcam:', err);
      setCameraError(err.message || 'Unable to access your camera. Please check browser permissions.');
    } finally {
      setIsInitializing(false);
    }
  };

  const stopCameraStream = () => {
    if (stream) {
      cameraService.stopStream(stream);
      setStream(null);
    }
    if (videoRef.current && videoRef.current.srcObject) {
      cameraService.stopStream(videoRef.current.srcObject);
      videoRef.current.srcObject = null;
    }
  };

  const toggleCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCameraStream(nextMode);
  };

  /**
   * Run image quality checks on the captured frame canvas
   */
  const inspectCapturedFrame = (canvas, width, height) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return { isValid: true, width, height };

    // 1. Dimensions Check
    const minDim = Math.min(width, height);
    const maxDim = Math.max(width, height);
    const meetsTechnicalMin = width >= 250 && height >= 250;
    const isHighResolution = maxDim >= 1024;

    // 2. Sample pixel luminance for blank/overexposed/underexposed detection
    // Sample a 50x50 grid of pixels to keep performance instant
    const sampleWidth = Math.min(64, width);
    const sampleHeight = Math.min(64, height);

    // Create a small helper canvas to compute statistics quickly
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = sampleWidth;
    tempCanvas.height = sampleHeight;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(canvas, 0, 0, sampleWidth, sampleHeight);

    const imgData = tempCtx.getImageData(0, 0, sampleWidth, sampleHeight);
    const data = imgData.data;
    const pixelCount = sampleWidth * sampleHeight;

    let totalLuminance = 0;
    let minLuma = 255;
    let maxLuma = 0;
    const lumas = [];

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // ITU-R BT.601 formula for relative luminance
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      totalLuminance += luma;
      lumas.push(luma);
      if (luma < minLuma) minLuma = luma;
      if (luma > maxLuma) maxLuma = luma;
    }

    const meanLuma = totalLuminance / pixelCount;

    // Compute standard deviation of luminance (measures contrast and texture)
    let varianceSum = 0;
    for (const luma of lumas) {
      varianceSum += Math.pow(luma - meanLuma, 2);
    }
    const stdDev = Math.sqrt(varianceSum / pixelCount);

    // 3. Simple edge contrast heuristic (rough sharpness indicator)
    let edgeSum = 0;
    for (let y = 1; y < sampleHeight - 1; y++) {
      for (let x = 1; x < sampleWidth - 1; x++) {
        const idx = y * sampleWidth + x;
        const diffX = Math.abs(lumas[idx] - lumas[idx + 1]);
        const diffY = Math.abs(lumas[idx] - lumas[idx + sampleWidth]);
        edgeSum += diffX + diffY;
      }
    }
    const avgEdgeGradient = edgeSum / ((sampleWidth - 2) * (sampleHeight - 2));

    // Determine specific quality issues
    const isTooDark = meanLuma < 15;
    const isTooBright = meanLuma > 245;
    const isFlatOrBlank = stdDev < 9; // Flat color, lens capped, or featureless background
    const isLikelyBlurry = avgEdgeGradient < 6 && stdDev > 12;

    let error = null;
    let warning = null;

    if (!meetsTechnicalMin) {
      error = `Captured image (${width} × ${height} px) is below the 250 × 250 px minimum required for AI try-on.`;
    } else if (isTooDark) {
      error = 'The captured image is too dark or the camera lens is covered. Please ensure the room is well-lit.';
    } else if (isTooBright) {
      error = 'The captured image is washed out or overexposed. Please reduce glare and retake.';
    } else if (isFlatOrBlank) {
      error = 'No garment detected in the frame (image appears blank or uniform). Please position your outfit in front of the lens.';
    } else if (isLikelyBlurry) {
      warning = 'Image may be blurry. For best try-on results, hold the garment steady and verify focus.';
    }

    const isValid = !error;

    return {
      isValid,
      width,
      height,
      dimensionLabel: `${width} × ${height} px`,
      isHighResolution,
      meanLuma: Math.round(meanLuma),
      contrastScore: Math.round(stdDev),
      sharpnessScore: Math.round(avgEdgeGradient),
      isGarmentVisible: !isFlatOrBlank && !isTooDark && !isTooBright,
      error,
      warning
    };
  };

  /**
   * Capture snapshot frame from live video feed
   */
  const handleCapture = async () => {
    setCameraError(null);
    const video = videoRef.current;

    if (!video) {
      setCameraError('Camera video stream is not accessible.');
      return;
    }

    if (typeof video.readyState === 'number' && video.readyState < 2) {
      setCameraError('Camera stream is still buffering. Please wait a moment for the feed to stabilize.');
      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;

    if (!width || !height || width <= 0 || height <= 0) {
      setCameraError('Invalid camera dimensions. Please ensure camera is delivering video frames.');
      return;
    }

    setIsCapturing(true);

    try {
      // Shutter flash animation effect
      setShutterFlash(true);
      setTimeout(() => setShutterFlash(false), 180);

      // Create full-resolution canvas without stretching or cropping
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, width, height);

      // Perform quality validation
      const quality = inspectCapturedFrame(canvas, width, height);
      setQualityReport(quality);

      // Convert to JPEG Blob (quality: 0.95)
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Failed to encode camera frame into image.'))),
          'image/jpeg',
          0.95
        );
      });

      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const filename = `camera_outfit_${Date.now()}.jpg`;
      const file = new File([blob], filename, { type: 'image/jpeg', lastModified: Date.now() });

      setCapturedFile(file);
      setCapturedPhoto({
        file,
        blob,
        dataUrl,
        width,
        height
      });

      // Pause live feed while user inspects preview
      video.pause();
    } catch (err) {
      console.error('[Outfit Camera] Capture failed:', err);
      setCameraError(err.message || 'Failed to capture frame from camera.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleRetake = () => {
    resetState();
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleConfirm = () => {
    if (!capturedFile) return;

    if (qualityReport && !qualityReport.isValid) {
      setCameraError(qualityReport.error || 'Please retake a clear photo of the garment before proceeding.');
      return;
    }

    stopCameraStream();
    onOutfitCaptured(capturedFile, capturedPhoto.dataUrl, qualityReport);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 max-w-2xl w-full shadow-2xl relative overflow-hidden flex flex-col max-h-[92vh] rounded-lg">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
          <div className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F5AFAF] pulse-camera" />
            <div>
              <h3 className="font-serif text-base sm:text-lg font-semibold text-slate-900 dark:text-[#FFFFFF]">
                Capture Outfit Using Camera
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Position your physical garment (shirt, jacket, dress, or pants) clearly in the frame
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-1.5">
            {availableDevices.length > 1 && !capturedPhoto && (
              <button
                type="button"
                onClick={toggleCamera}
                title="Switch Camera (Front/Back)"
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewfinder / Preview Area */}
        <div className="relative bg-black flex-1 min-h-[300px] sm:min-h-[400px] max-h-[58vh] overflow-hidden flex items-center justify-center">
          
          {/* Shutter Flash Animation */}
          {shutterFlash && (
            <div className="absolute inset-0 bg-white z-40 animate-fadeOut pointer-events-none" />
          )}

          {/* Initializing Spinner */}
          {isInitializing && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/70 text-white space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-[#F5AFAF]" />
              <p className="text-xs uppercase tracking-wider font-mono">Initializing camera sensor...</p>
            </div>
          )}

          {/* Live Video Element */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-contain ${capturedPhoto ? 'hidden' : 'block'}`}
          />

          {/* Captured Image Preview */}
          {capturedPhoto && (
            <div className="relative w-full h-full flex items-center justify-center bg-slate-950">
              <img
                src={capturedPhoto.dataUrl}
                alt="Captured Garment Preview"
                className="max-w-full max-h-[58vh] object-contain"
              />
            </div>
          )}

          {/* Garment Alignment Guide (Visible while framing before capture) */}
          {!capturedPhoto && !isInitializing && !cameraError && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6 z-10">
              {/* Outer Alignment Box with Corner Brackets */}
              <div className="relative w-3/4 max-w-sm aspect-[3/4] border-2 border-dashed border-white/60 dark:border-white/50 rounded-xl flex flex-col items-center justify-between p-4 shadow-2xl">
                
                {/* Hanger Silhouette Icon Guide */}
                <div className="w-16 h-8 border-t-2 border-r-2 border-white/80 rounded-tr-full mt-2 rotate-[-20deg] opacity-75" />
                
                {/* Center Prompt */}
                <div className="bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded text-[10px] font-mono uppercase tracking-wider border border-white/20">
                  Align Garment Inside Frame
                </div>

                <div className="text-[9px] text-white/70 font-mono tracking-widest uppercase">
                  Hold Steady &bull; Avoid Glare
                </div>
              </div>

              {/* Status Pill */}
              <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded text-[10px] text-white font-mono flex items-center space-x-1.5 border border-white/10">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Feed &bull; {facingMode === 'environment' ? 'Main Camera' : 'User Camera'}</span>
              </div>
            </div>
          )}

          {/* Camera Error Display */}
          {cameraError && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 text-white p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-950/80 border border-rose-600/50 flex items-center justify-center text-rose-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="font-serif text-base font-semibold">Camera Access Required</h4>
              <p className="text-xs text-slate-300 max-w-md leading-relaxed">{cameraError}</p>
              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => startCameraStream(facingMode)}
                  className="px-4 py-2 bg-white text-black text-xs font-semibold uppercase tracking-wider hover:bg-slate-100 transition-colors flex items-center space-x-1.5 rounded"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#F5AFAF]" />
                  <span>Try Again</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold uppercase tracking-wider hover:bg-slate-700 transition-colors rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quality Audit Bar (Shown after capture) */}
        {capturedPhoto && qualityReport && (
          <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#F5AFAF]" />
                <span>Captured Frame Quality Verification</span>
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                qualityReport.isValid
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
              }`}>
                {qualityReport.isValid ? '✓ ELIGIBLE FOR TRY-ON' : '⚠️ QUALITY ISSUE'}
              </span>
            </div>

            {/* Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] font-mono">
              <div className="flex items-center space-x-1.5">
                <Check className={`w-3.5 h-3.5 ${qualityReport.width >= 250 && qualityReport.height >= 250 ? 'text-emerald-600' : 'text-rose-600'}`} />
                <span className="text-slate-600 dark:text-slate-400">
                  Size: <strong>{qualityReport.dimensionLabel}</strong>
                  {qualityReport.isHighResolution ? ' (HD)' : ''}
                </span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Check className={`w-3.5 h-3.5 ${qualityReport.isGarmentVisible ? 'text-emerald-600' : 'text-rose-600'}`} />
                <span className="text-slate-600 dark:text-slate-400">
                  Lighting & Frame: <strong>{qualityReport.isGarmentVisible ? 'Valid' : 'Check Lighting'}</strong>
                </span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-slate-600 dark:text-slate-400">
                  Aspect: <strong>Original Uncropped</strong>
                </span>
              </div>
            </div>

            {/* Error or Warning message */}
            {qualityReport.error && (
              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                {qualityReport.error}
              </p>
            )}
            {qualityReport.warning && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                {qualityReport.warning}
              </p>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0F172A] flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Privacy Note */}
          <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 dark:text-slate-400">
            <Shield className="w-3.5 h-3.5 text-[#F5AFAF] shrink-0" />
            <span>Privacy: Snapshot is processed locally. Video is never recorded.</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            {!capturedPhoto ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors rounded min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCapture}
                  disabled={isInitializing || !!cameraError || isCapturing}
                  className="px-6 py-2 bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-black dark:hover:bg-slate-100 text-xs uppercase tracking-wider font-semibold transition-all shadow-md flex items-center space-x-2 rounded min-h-[44px] disabled:opacity-50"
                >
                  <Camera className="w-4 h-4 text-[#F5AFAF]" />
                  <span>Capture Outfit</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleRetake}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center space-x-1.5 rounded min-h-[44px]"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#F5AFAF]" />
                  <span>Retake</span>
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={qualityReport && !qualityReport.isValid}
                  className="px-6 py-2 bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-black dark:hover:bg-slate-100 text-xs uppercase tracking-wider font-semibold transition-all shadow-md flex items-center space-x-2 rounded min-h-[44px] disabled:opacity-50"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Use This Image</span>
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

