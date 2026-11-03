import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, RefreshCw, Check, AlertCircle, Sparkles, Video } from 'lucide-react';
import cameraService from '../services/cameraService';

export default function CameraModal({ isOpen, onClose, onPhotoCaptured }) {
  const [stream, setStream] = useState(null);
  const [capturedFile, setCapturedFile] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [shutterFlash, setShutterFlash] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);

  const videoRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      startCameraStream();
    } else {
      stopCameraStream();
      setCapturedFile(null);
      setCapturedPhoto(null);
      setCameraError(null);
      setIsVideoReady(false);
    }

    return () => {
      stopCameraStream();
    };
  }, [isOpen]);

  const startCameraStream = async () => {
    setIsInitializing(true);
    setIsVideoReady(false);
    setCameraError(null);
    setCapturedFile(null);
    setCapturedPhoto(null);

    try {
      const mediaStream = await cameraService.startCamera();
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setCameraError(err.message || 'Unable to access your webcam.');
    } finally {
      setIsInitializing(false);
    }
  };

  const stopCameraStream = () => {
    if (stream) {
      cameraService.stopStream(stream);
      setStream(null);
    }
    if (videoRef.current) {
      if (videoRef.current.srcObject) {
        cameraService.stopStream(videoRef.current.srcObject);
        videoRef.current.srcObject = null;
      }
    }
    setIsVideoReady(false);
  };

  const handleCapture = async () => {
    setCameraError(null);
    const video = videoRef.current;

    if (!video) {
      setCameraError('Webcam video element is not available.');
      return;
    }

    if (typeof video.readyState === 'number' && video.readyState < 2) {
      setCameraError('Webcam feed is still buffering. Please wait for the live picture to appear.');
      return;
    }

    if (!video.videoWidth || !video.videoHeight || video.videoWidth <= 0 || video.videoHeight <= 0) {
      setCameraError('Camera dimensions not ready yet. Please wait for the camera frame to render.');
      return;
    }

    setIsCapturing(true);

    try {
      setShutterFlash(true);
      setTimeout(() => setShutterFlash(false), 160);

      const result = await cameraService.captureFrame(video);

      if (!result || !result.blob) {
        throw new Error('Capture failed: No image data returned from camera sensor.');
      }

      setCapturedFile(result.file);
      setCapturedPhoto({
        blob: result.blob,
        file: result.file,
        dataUrl: result.dataUrl,
        width: result.width,
        height: result.height,
        timestamp: result.timestamp
      });
    } catch (err) {
      console.error('Frame capture failure:', err);
      setCameraError(err.message || 'Failed to capture frame from webcam.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleRetake = () => {
    setCapturedFile(null);
    setCapturedPhoto(null);
    setCameraError(null);
    startCameraStream();
  };

  const handleConfirm = () => {
    if (capturedFile) {
      onPhotoCaptured(capturedFile, capturedPhoto?.dataUrl);
      onClose();
    } else if (capturedPhoto) {
      onPhotoCaptured(capturedPhoto.file || capturedPhoto.blob, capturedPhoto.dataUrl);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#0F172A] border border-slate-200/90 dark:border-slate-800 max-w-xl w-full shadow-2xl relative overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0F172A]">
          <div className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F5AFAF] pulse-camera" />
            <h3 className="font-serif text-lg font-semibold text-slate-900 dark:text-[#FFFFFF]">
              Live Silhouette Capture
            </h3>
            <span className="text-[9px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-[#F5AFAF] border border-slate-200 dark:border-slate-700">
              HD Feed
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-[#FFFFFF] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder Content Area */}
        <div className="relative aspect-[3/4] sm:aspect-[4/5] bg-slate-950 overflow-hidden flex items-center justify-center">
          
          {/* Shutter Flash Animation */}
          {shutterFlash && (
            <div className="absolute inset-0 bg-white z-30 transition-opacity duration-150" />
          )}

          {/* Electric Indigo #F5AFAF Scanning Laser Line */}
          {!capturedPhoto && isVideoReady && (
            <div className="animate-camera-scan pointer-events-none z-20" />
          )}

          {/* Camera Error Message */}
          {cameraError && (
            <div className="p-6 text-center text-white space-y-3 max-w-sm z-20 bg-slate-900/90 border border-slate-700 backdrop-blur-sm">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
              <p className="text-xs font-medium text-rose-200 leading-relaxed">{cameraError}</p>
              <button
                onClick={startCameraStream}
                className="px-4 py-2 bg-[#FFFFFF] text-[#000000] text-xs uppercase tracking-wider font-semibold hover:bg-slate-100 transition-colors"
              >
                Restart Camera
              </button>
            </div>
          )}

          {/* Initializing Spinner */}
          {isInitializing && !cameraError && (
            <div className="text-center text-white space-y-3 z-10">
              <RefreshCw className="w-7 h-7 animate-spin mx-auto text-[#F5AFAF]" />
              <p className="text-xs tracking-wider uppercase font-mono text-slate-300">Calibrating Optics...</p>
            </div>
          )}

          {/* Live Video Viewfinder */}
          {!capturedPhoto && (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    videoRef.current.play().catch((e) => console.warn('Autoplay error:', e));
                  }
                }}
                onCanPlay={() => setIsVideoReady(true)}
              />
              
              {/* Electric Indigo #F5AFAF Framing Overlay Guide */}
              <div className="absolute inset-6 border border-dashed border-[#F5AFAF]/50 pointer-events-none flex flex-col justify-between p-4 z-10">
                {/* Corner Accents */}
                <div className="flex justify-between items-start">
                  <span className="w-3 h-3 border-t-2 border-l-2 border-[#F5AFAF]" />
                  <span className="text-[9px] uppercase font-mono tracking-widest text-[#FFFFFF] bg-black/70 px-2 py-0.5 border border-[#F5AFAF]/40">
                    Center Torso & Face
                  </span>
                  <span className="w-3 h-3 border-t-2 border-r-2 border-[#F5AFAF]" />
                </div>

                <div className="flex justify-between items-end">
                  <span className="w-3 h-3 border-b-2 border-l-2 border-[#F5AFAF]" />
                  <span className="text-[9px] uppercase font-mono tracking-widest text-slate-300 bg-black/70 px-2 py-0.5 border border-slate-700">
                    Optimal Distance: 4–6 ft
                  </span>
                  <span className="w-3 h-3 border-b-2 border-r-2 border-[#F5AFAF]" />
                </div>
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
              <div className="absolute top-4 left-4 bg-black/85 backdrop-blur text-white text-[10px] tracking-widest uppercase px-3 py-1 font-semibold flex items-center space-x-1.5 border border-white/20">
                <Sparkles className="w-3 h-3 text-[#F5AFAF]" />
                <span>Silhouette Captured &bull; HD</span>
              </div>
            </div>
          )}

        </div>

        {/* Controls Footer */}
        <div className="px-6 py-4 bg-white dark:bg-[#0F172A] border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          {!capturedPhoto ? (
            <>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Position full torso in even lighting.
              </p>
              <button
                onClick={handleCapture}
                disabled={isInitializing || isCapturing}
                className="px-6 py-2.5 bg-white hover:bg-slate-50 text-slate-900 dark:bg-[#FFFFFF] dark:hover:bg-slate-100 dark:text-[#000000] text-xs uppercase tracking-widest font-semibold flex items-center space-x-2 transition-all disabled:opacity-50 shadow-xs border border-slate-300"
              >
                {isCapturing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#F5AFAF]" />
                    <span>Freezing...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-3.5 h-3.5 text-[#F5AFAF]" />
                    <span>Capture Photo</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <div className="w-full flex items-center justify-between gap-3">
              <button
                onClick={handleRetake}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-[#FFFFFF] text-xs uppercase tracking-widest font-medium hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center space-x-2 transition-colors shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retake</span>
              </button>
              <button
                onClick={handleConfirm}
                className="px-6 py-2 bg-white hover:bg-rose-50/50 hover:border-rose-300 text-slate-900 dark:bg-[#FFFFFF] dark:hover:bg-slate-100 dark:text-[#000000] text-xs uppercase tracking-widest font-semibold flex items-center space-x-2 transition-all shadow-sm border-2 border-slate-900"
              >
                <Check className="w-4 h-4 text-[#F5AFAF]" />
                <span>Apply Silhouette</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
