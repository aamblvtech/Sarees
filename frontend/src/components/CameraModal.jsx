import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  X,
  RefreshCw,
  Check,
  AlertCircle,
  Users,
  UserCheck,
  Scan
} from 'lucide-react';
import cameraService from '../services/cameraService';
import poseDetectionService from '../services/poseDetectionService';

/**
 * CameraModal - Smart Camera with Automatic Pose Estimation & Auto-Capture
 * Features:
 * - Real-time browser-based body pose estimation (MediaPipe Tasks Vision).
 * - Landmarks tracking: Head, Shoulders, Elbows, Wrists, Hips, Knees, Ankles.
 * - Posture verification: upright, facing camera, full body in frame.
 * - Anti-crowd detection: flags when multiple people are in frame.
 * - Stability detection: holds still for 1.5–2.0s triggers auto capture.
 * - Manual capture fallback button available anytime.
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
      poseDetectionService.initialize().catch((e) => console.warn('Pose init notice:', e));
      const mediaStream = await cameraService.startCamera({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsInitializing(false);
    } catch (err) {
      setIsInitializing(false);
      setCameraError(err.message || 'Unable to access camera.');
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
  };

  // Pose estimation frame loop
  const processPoseFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || capturedPhoto) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState >= 2 && video.videoWidth > 0) {
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      try {
        const assessment = poseDetectionService.detectPose(video, performance.now());

        if (assessment) {
          setPoseState(assessment);
          poseDetectionService.drawPoseSkeleton(canvas, assessment, assessment);

          if (isAutoCaptureEnabled && assessment.readyToCapture && !hasAutoCaptured.current && !isCapturing) {
            hasAutoCaptured.current = true;
            handleCapture('auto');
            return;
          }
        }
      } catch (poseErr) {
        console.warn('[CameraModal] Pose estimation loop warning:', poseErr);
      }
    }

    animationFrameId.current = requestAnimationFrame(processPoseFrame);
  }, [isAutoCaptureEnabled, isCapturing, capturedPhoto]);

  useEffect(() => {
    if (isVideoReady && !capturedPhoto) {
      animationFrameId.current = requestAnimationFrame(processPoseFrame);
    }
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isVideoReady, capturedPhoto, processPoseFrame]);

  const handleCapture = async (trigger = 'manual') => {
    if (!videoRef.current || isCapturing) return;

    setIsCapturing(true);
    setShutterFlash(true);
    setTimeout(() => setShutterFlash(false), 150);

    try {
      const snap = await cameraService.captureFrame(videoRef.current, {
        mimeType: 'image/jpeg',
        quality: 0.95
      });

      setCapturedFile(snap.file);
      setCapturedPhoto({
        dataUrl: snap.dataUrl,
        file: snap.file,
        triggerType: trigger
      });
      stopCameraStream();
    } catch (err) {
      setCameraError('Capture failed: ' + err.message);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    setCapturedFile(null);
    hasAutoCaptured.current = false;
    startCameraStream();
  };

  const handleConfirm = () => {
    if (capturedPhoto && onPhotoCaptured) {
      onPhotoCaptured(capturedFile || capturedPhoto.file || capturedPhoto.blob, capturedPhoto?.dataUrl);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#17181C] border border-black/[0.08] dark:border-white/[0.08] max-w-2xl w-full rounded-xl relative overflow-hidden flex flex-col my-auto max-h-[96vh] shadow-atelier-modal">
        
        {/* Header with Status */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-black/[0.06] dark:border-white/[0.06]">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
            <h3 className="font-serif text-base text-neutral-900 dark:text-neutral-100 font-normal">
              Smart Studio Camera
            </h3>
            <span className="text-[11px] font-mono text-neutral-500">
              Auto-Pose
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsAutoCaptureEnabled(!isAutoCaptureEnabled)}
              className={`h-7 px-2.5 text-xs rounded transition-colors ${
                isAutoCaptureEnabled
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-medium'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
              }`}
            >
              Auto-capture: {isAutoCaptureEnabled ? 'On' : 'Off'}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Viewfinder Area */}
        <div className="relative aspect-[3/4] sm:aspect-[4/5] bg-neutral-950 overflow-hidden flex items-center justify-center">
          
          {shutterFlash && (
            <div className="absolute inset-0 bg-white z-40 transition-opacity duration-150" />
          )}

          {cameraError && (
            <div className="p-6 text-center text-white space-y-3 max-w-sm z-30 bg-neutral-900/90 border border-neutral-700 rounded-lg">
              <AlertCircle className="w-6 h-6 text-rose-400 mx-auto" strokeWidth={1.5} />
              <p className="text-xs text-neutral-200">{cameraError}</p>
              <button
                onClick={startCameraStream}
                className="h-8 px-4 bg-white text-neutral-900 text-xs font-medium rounded hover:bg-neutral-100 transition-colors"
              >
                Restart camera
              </button>
            </div>
          )}

          {isInitializing && !cameraError && (
            <div className="text-center text-white space-y-2 z-20">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-neutral-400" strokeWidth={1.5} />
              <p className="text-xs font-mono text-neutral-400">
                Calibrating camera...
              </p>
            </div>
          )}

          {/* Live Video & Framing Guide */}
          {!capturedPhoto && (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
                onCanPlay={() => setIsVideoReady(true)}
              />

              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none z-10 transform -scale-x-100"
              />

              {/* Atelier Tailored Viewfinder Corner Brackets */}
              <div className="absolute inset-6 pointer-events-none flex flex-col justify-between z-20">
                <div className="flex justify-between items-start">
                  <span className="w-4 h-4 border-t border-l border-white/60" />
                  <span className="w-4 h-4 border-t border-r border-white/60" />
                </div>
                <div className="flex justify-between items-end">
                  <span className="w-4 h-4 border-b border-l border-white/60" />
                  <div className="text-[10px] font-mono text-white/80 bg-black/60 px-2.5 py-1 rounded">
                    Full body portrait &bull; Stand 5–7 ft away
                  </div>
                  <span className="w-4 h-4 border-b border-r border-white/60" />
                </div>
              </div>

              {/* Guidance Badge */}
              <div className="absolute top-4 inset-x-6 z-30 flex flex-col items-center pointer-events-none space-y-2">
                <div className="px-3 py-1.5 rounded bg-black/75 backdrop-blur-sm border border-white/10 text-xs text-white font-medium flex items-center space-x-1.5 shadow-xs">
                  {poseState.status === 'perfect' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" strokeWidth={2} />
                  ) : poseState.status === 'holding_still' ? (
                    <Scan className="w-3.5 h-3.5 text-amber-300 animate-spin" strokeWidth={1.5} />
                  ) : poseState.status === 'multiple_people' ? (
                    <Users className="w-3.5 h-3.5 text-rose-300" strokeWidth={1.5} />
                  ) : (
                    <UserCheck className="w-3.5 h-3.5 text-neutral-300" strokeWidth={1.5} />
                  )}
                  <span>{poseState.guidance}</span>
                </div>

                {isAutoCaptureEnabled && poseState.progress > 0 && poseState.progress < 1.0 && (
                  <div className="w-44 bg-black/50 rounded-full h-1 overflow-hidden">
                    <div
                      className="bg-white h-full transition-all duration-75"
                      style={{ width: `${Math.round(poseState.progress * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Captured Review Preview */}
          {capturedPhoto && (
            <div className="relative w-full h-full">
              <img
                src={capturedPhoto.dataUrl}
                alt="Captured silhouette"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 bg-black/75 text-white text-[11px] font-mono px-2.5 py-1 rounded border border-white/10">
                {capturedPhoto.triggerType === 'auto' ? 'Auto-captured portrait' : 'Manual capture'}
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-white dark:bg-[#17181C] border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between">
          {!capturedPhoto ? (
            <div className="w-full flex items-center justify-between">
              <span className="text-xs text-neutral-500">
                {isAutoCaptureEnabled ? 'Hold steady for auto-capture' : 'Press capture when aligned'}
              </span>

              <button
                type="button"
                onClick={() => handleCapture('manual')}
                disabled={isInitializing || isCapturing}
                className="h-9 px-4 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-900 text-xs font-medium rounded flex items-center space-x-1.5 transition-colors disabled:opacity-50"
              >
                {isCapturing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
                    <span>Capturing...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span>Capture photo</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="w-full flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleRetake}
                className="h-9 px-3.5 border border-black/[0.12] dark:border-white/[0.12] text-neutral-800 dark:text-neutral-200 text-xs font-medium rounded hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center space-x-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Retake photo</span>
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                className="h-9 px-5 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-900 text-xs font-medium rounded flex items-center space-x-1.5 transition-colors shadow-xs"
              >
                <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Use this photo</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
