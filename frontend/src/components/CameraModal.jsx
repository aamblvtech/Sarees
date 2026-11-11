import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  X,
  RefreshCw,
  Check,
  AlertCircle,
  Sparkles,
  Users,
  UserCheck,
  Maximize2,
  Sliders,
  CheckCircle2,
  Scan
} from 'lucide-react';
import cameraService from '../services/cameraService';
import poseDetectionService from '../services/poseDetectionService';

/**
 * CameraModal - Smart AI Camera with Automatic Pose Estimation & Auto-Capture
 * 
 * Features:
 * - Real-time browser-based body pose estimation (MediaPipe Tasks Vision).
 * - Landmarks tracking: Head, Shoulders, Elbows, Wrists, Hips, Knees, Ankles.
 * - Automatic posture verification: upright, facing camera, full body visible.
 * - Anti-crowd detection: prevents capture when multiple people are in frame.
 * - Stability detection: holds still for 1.5–2.0s triggers automatic capture.
 * - Visual guidance overlays, progress ring, shutter flash animation.
 * - Manual capture fallback button available anytime.
 * - Captured photo review: "Use This Photo" vs "Retake Photo".
 */
export default function CameraModal({ isOpen, onClose, onPhotoCaptured }) {
  const [stream, setStream] = useState(null);
  const [capturedFile, setCapturedFile] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [shutterFlash, setShutterFlash] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);

  // Pose Detection State
  const [poseState, setPoseState] = useState({
    detected: false,
    personCount: 0,
    status: 'initializing',
    guidance: 'Position yourself in front of the camera.',
    progress: 0,
    readyToCapture: false
  });
  const [isAutoCaptureEnabled, setIsAutoCaptureEnabled] = useState(true);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameId = useRef(null);
  const hasAutoCaptured = useRef(false);

  // Initialize camera and pose detector
  useEffect(() => {
    if (isOpen) {
      hasAutoCaptured.current = false;
      startCameraStream();
    } else {
      stopCameraStream();
      resetState();
    }

    return () => {
      stopCameraStream();
    };
  }, [isOpen]);

  const resetState = () => {
    setCapturedFile(null);
    setCapturedPhoto(null);
    setCameraError(null);
    setIsVideoReady(false);
    hasAutoCaptured.current = false;
    poseDetectionService.resetStability();
    setPoseState({
      detected: false,
      personCount: 0,
      status: 'idle',
      guidance: 'Position yourself in front of the camera.',
      progress: 0,
      readyToCapture: false
    });
  };

  const startCameraStream = async () => {
    setIsInitializing(true);
    setIsVideoReady(false);
    setCameraError(null);
    resetState();

    try {
      // 1. Initialize PoseLandmarker in background
      poseDetectionService.initialize().catch((e) => console.warn('Pose init notice:', e));

      // 2. Start Camera MediaStream
      const mediaStream = await cameraService.startCamera();
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setCameraError(err.message || 'Unable to access your camera.');
    } finally {
      setIsInitializing(false);
    }
  };

  const stopCameraStream = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (stream) {
      cameraService.stopStream(stream);
      setStream(null);
    }
    if (videoRef.current && videoRef.current.srcObject) {
      cameraService.stopStream(videoRef.current.srcObject);
      videoRef.current.srcObject = null;
    }
    setIsVideoReady(false);
  };

  // Real-time pose detection loop
  const runPoseDetectionLoop = useCallback(() => {
    if (!videoRef.current || !isOpen || capturedPhoto || hasAutoCaptured.current) {
      return;
    }

    const video = videoRef.current;
    if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
      const timestamp = performance.now();
      const assessment = poseDetectionService.detectPose(video, timestamp);

      setPoseState(assessment);

      // Draw skeleton landmarks on overlay canvas
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }
        const ctx = canvas.getContext('2d');
        if (assessment.landmarks) {
          poseDetectionService.drawSkeleton(ctx, assessment.landmarks, canvas.width, canvas.height);
        } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }

      // Check for automatic capture trigger
      if (isAutoCaptureEnabled && assessment.readyToCapture && !hasAutoCaptured.current && !isCapturing) {
        hasAutoCaptured.current = true;
        handleCapture('auto');
        return;
      }
    }

    animationFrameId.current = requestAnimationFrame(runPoseDetectionLoop);
  }, [isOpen, capturedPhoto, isAutoCaptureEnabled, isCapturing]);

  // Start pose loop when video is ready
  useEffect(() => {
    if (isVideoReady && !capturedPhoto) {
      animationFrameId.current = requestAnimationFrame(runPoseDetectionLoop);
    }
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isVideoReady, capturedPhoto, runPoseDetectionLoop]);

  /**
   * Captures photograph from video sensor (either auto or manual)
   */
  const handleCapture = async (triggerType = 'manual') => {
    setCameraError(null);
    const video = videoRef.current;

    if (!video || video.readyState < 2) {
      setCameraError('Camera feed is still calibrating. Please wait a moment.');
      return;
    }

    setIsCapturing(true);

    try {
      // Trigger shutter flash animation
      setShutterFlash(true);
      setTimeout(() => setShutterFlash(false), 200);

      const result = await cameraService.captureFrame(video);
      if (!result || !result.blob) {
        throw new Error('No image data returned from camera sensor.');
      }

      setCapturedFile(result.file);
      setCapturedPhoto({
        blob: result.blob,
        file: result.file,
        dataUrl: result.dataUrl,
        width: result.width,
        height: result.height,
        triggerType,
        timestamp: result.timestamp
      });

      // Stop pose loop
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    } catch (err) {
      console.error('Frame capture failure:', err);
      setCameraError(err.message || 'Failed to capture frame from camera.');
      hasAutoCaptured.current = false;
    } finally {
      setIsCapturing(false);
    }
  };

  const handleRetake = () => {
    setCapturedFile(null);
    setCapturedPhoto(null);
    setCameraError(null);
    hasAutoCaptured.current = false;
    poseDetectionService.resetStability();
    startCameraStream();
  };

  const handleConfirm = () => {
    if (capturedFile || capturedPhoto) {
      onPhotoCaptured(capturedFile || capturedPhoto.file || capturedPhoto.blob, capturedPhoto?.dataUrl);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 max-w-2xl w-full shadow-2xl rounded-2xl relative overflow-hidden flex flex-col my-auto max-h-[96vh]">
        
        {/* Header with Live Status & Mode Badge */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0B0F19]">
          <div className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="font-serif text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
              Smart AI Pose Camera
            </h3>
            <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
              Automatic Detection
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsAutoCaptureEnabled(!isAutoCaptureEnabled)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all ${
                isAutoCaptureEnabled
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-800 dark:text-amber-300'
                  : 'bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-400'
              }`}
              title="Toggle Auto Capture"
            >
              Auto Capture: {isAutoCaptureEnabled ? 'ON' : 'OFF'}
            </button>

            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewfinder Content Area */}
        <div className="relative aspect-[3/4] sm:aspect-[4/5] bg-slate-950 overflow-hidden flex items-center justify-center">
          
          {/* Shutter Flash Animation */}
          {shutterFlash && (
            <div className="absolute inset-0 bg-white z-40 transition-opacity duration-150 animate-pulse" />
          )}

          {/* Scanning Line Animation */}
          {!capturedPhoto && isVideoReady && (
            <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#F5AFAF] to-transparent animate-camera-scan pointer-events-none z-20" />
          )}

          {/* Camera Error Display */}
          {cameraError && (
            <div className="p-6 text-center text-white space-y-3 max-w-sm z-30 bg-slate-900/90 border border-slate-700 backdrop-blur-md rounded-xl">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
              <p className="text-xs font-medium text-rose-200 leading-relaxed">{cameraError}</p>
              <button
                onClick={startCameraStream}
                className="px-4 py-2 bg-white text-slate-950 text-xs uppercase tracking-wider font-semibold rounded-lg hover:bg-slate-100 transition-colors"
              >
                Restart Camera
              </button>
            </div>
          )}

          {/* Initializing Spinner */}
          {isInitializing && !cameraError && (
            <div className="text-center text-white space-y-3 z-20">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-500" />
              <p className="text-xs tracking-wider uppercase font-mono text-slate-300">
                Calibrating AI Pose Optics...
              </p>
            </div>
          )}

          {/* Live Video Viewfinder & Overlay */}
          {!capturedPhoto && (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100" // Mirrored for natural selfie view
                onCanPlay={() => setIsVideoReady(true)}
              />

              {/* Skeleton Canvas Overlay */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none z-10 transform -scale-x-100"
              />

              {/* High-Precision Full-Body Silhouette Framing Guide Overlay */}
              <div className="absolute inset-4 sm:inset-6 border border-dashed border-amber-500/40 pointer-events-none flex flex-col justify-between p-3 z-20 rounded-2xl">
                
                {/* Top Corner Markers & Head Guide */}
                <div className="flex justify-between items-start">
                  <span className="w-4 h-4 border-t-2 border-l-2 border-amber-400" />
                  <div className="w-20 h-24 rounded-full border-2 border-dashed border-amber-400/50 flex items-center justify-center bg-amber-400/5">
                    <span className="text-[8px] uppercase tracking-wider text-amber-300 font-mono">Head</span>
                  </div>
                  <span className="w-4 h-4 border-t-2 border-r-2 border-amber-400" />
                </div>

                {/* Torso Alignment Zone */}
                <div className="mx-auto w-36 sm:w-44 h-48 border border-amber-400/30 rounded-3xl flex flex-col items-center justify-center p-2 bg-amber-500/5 backdrop-blur-[0.5px]">
                  <span className="text-[9px] uppercase font-mono tracking-wider text-amber-200 bg-black/60 px-2 py-0.5 rounded">
                    Torso & Shoulders
                  </span>
                </div>

                {/* Bottom Corner Markers & Feet Guide */}
                <div className="flex justify-between items-end">
                  <span className="w-4 h-4 border-b-2 border-l-2 border-amber-400" />
                  <div className="text-[9px] uppercase font-mono tracking-wider text-slate-200 bg-black/75 px-3 py-1 rounded-full border border-slate-700">
                    Stand 5–7 ft away &bull; Keep feet in frame
                  </div>
                  <span className="w-4 h-4 border-b-2 border-r-2 border-amber-400" />
                </div>

              </div>

              {/* Real-Time Pose Guidance Banner */}
              <div className="absolute top-4 inset-x-4 sm:inset-x-8 z-30 flex flex-col items-center pointer-events-none space-y-2">
                <div className={`px-4 py-2 rounded-xl text-xs font-semibold backdrop-blur-md shadow-lg border flex items-center space-x-2 transition-all ${
                  poseState.status === 'perfect'
                    ? 'bg-emerald-500/90 text-white border-emerald-400'
                    : poseState.status === 'holding_still'
                    ? 'bg-amber-500/90 text-stone-950 border-amber-400'
                    : poseState.status === 'multiple_people'
                    ? 'bg-red-500/90 text-white border-red-400'
                    : 'bg-black/75 text-white border-white/20'
                }`}>
                  {poseState.status === 'perfect' ? (
                    <CheckCircle2 className="w-4 h-4 text-white animate-bounce" />
                  ) : poseState.status === 'holding_still' ? (
                    <Scan className="w-4 h-4 animate-spin text-stone-950" />
                  ) : poseState.status === 'multiple_people' ? (
                    <Users className="w-4 h-4 text-white" />
                  ) : (
                    <UserCheck className="w-4 h-4 text-amber-400" />
                  )}
                  <span>{poseState.guidance}</span>
                </div>

                {/* Progress bar when holding still */}
                {isAutoCaptureEnabled && poseState.progress > 0 && poseState.progress < 1.0 && (
                  <div className="w-48 bg-black/60 rounded-full h-1.5 overflow-hidden border border-white/20">
                    <div
                      className="bg-amber-400 h-full transition-all duration-75"
                      style={{ width: `${Math.round(poseState.progress * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Captured Photo Preview */}
          {capturedPhoto && (
            <div className="relative w-full h-full animate-fadeIn">
              <img
                src={capturedPhoto.dataUrl}
                alt="Captured Silhouette Preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 bg-black/85 backdrop-blur-md text-white text-[10px] tracking-widest uppercase px-3.5 py-1.5 font-semibold flex items-center space-x-2 border border-white/20 rounded-lg">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {capturedPhoto.triggerType === 'auto' ? 'Auto-Captured Pose' : 'Manual Snapshot'} &bull; HD
                </span>
              </div>
            </div>
          )}

        </div>

        {/* Controls Footer */}
        <div className="px-5 py-4 bg-white dark:bg-[#0B0F19] border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          {!capturedPhoto ? (
            <div className="w-full flex items-center justify-between">
              <div className="text-xs text-stone-500 dark:text-stone-400">
                {isAutoCaptureEnabled ? (
                  <span>Stand still in frame for auto-capture</span>
                ) : (
                  <span>Click capture when ready</span>
                )}
              </div>

              {/* Manual Capture Fallback Button */}
              <button
                type="button"
                onClick={() => handleCapture('manual')}
                disabled={isInitializing || isCapturing}
                className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-stone-950 text-xs font-semibold uppercase tracking-wider rounded-xl flex items-center space-x-2 transition-all shadow-md disabled:opacity-50"
              >
                {isCapturing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Capturing...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>Capture Photo</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="w-full flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleRetake}
                className="px-4 py-2.5 border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-200 text-xs uppercase tracking-wider font-semibold rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center space-x-2 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retake Photo</span>
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs uppercase tracking-wider font-semibold rounded-xl flex items-center space-x-2 transition-all shadow-md"
              >
                <Check className="w-4 h-4" />
                <span>Use This Photo</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
