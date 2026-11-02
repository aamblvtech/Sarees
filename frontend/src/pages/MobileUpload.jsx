import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Camera, Image as ImageIcon, CheckCircle2, AlertCircle, RefreshCw, ShieldCheck, Sparkles, X } from 'lucide-react';
import tryOnService from '../services/tryOnService';

export default function MobileUpload() {
  const { token } = useParams();

  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [sessionError, setSessionError] = useState(null);
  const [session, setSession] = useState(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [consentChecked, setConsentChecked] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // Fetch session details on mount
  useEffect(() => {
    let isMounted = true;

    async function fetchSession() {
      if (!token) {
        setSessionError('Missing session token. Please scan the QR code from the fitting room again.');
        setIsLoadingSession(false);
        return;
      }

      try {
        const data = await tryOnService.getQrSession(token);
        if (!isMounted) return;

        if (!data) {
          setSessionError('QR session not found or has expired. Please refresh the QR code on the kiosk.');
        } else if (data.status === 'expired') {
          setSessionError('This QR code has expired (5-minute limit). Please tap "Refresh QR" on the fitting room screen.');
        } else if (data.status === 'uploaded' || data.status === 'consumed') {
          setSession(data);
          setUploadSuccess(true);
        } else {
          setSession(data);
        }
      } catch (err) {
        if (!isMounted) return;
        setSessionError(err.response?.data?.error || 'Unable to connect to the VESTRA Atelier service.');
      } finally {
        if (isMounted) setIsLoadingSession(false);
      }
    }

    fetchSession();
    return () => {
      isMounted = false;
    };
  }, [token]);

  // Handle file selection from camera or gallery
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.mimetype || file.type)) {
      setUploadError('Please select a JPEG, PNG, or WebP photo.');
      return;
    }

    // Validate size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Image size exceeds 10MB. Please choose a smaller photo.');
      return;
    }

    setUploadError(null);
    setSelectedFile(file);

    // Create instant local preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleResetPhoto = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setUploadError(null);
  };

  // Submit photo to backend
  const handleSubmit = async () => {
    if (!selectedFile) {
      setUploadError('Please take or select a photo first.');
      return;
    }

    if (!consentChecked) {
      setUploadError('Please acknowledge the privacy consent before submitting.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      await tryOnService.uploadMobilePhoto(token, selectedFile, true);
      setUploadSuccess(true);
    } catch (err) {
      setUploadError(err.response?.data?.error || err.message || 'Failed to upload photo. Please retry.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 flex flex-col justify-between p-4 sm:p-6 transition-colors">
      
      {/* Hidden File Inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Header Bar */}
      <header className="max-w-md mx-auto w-full pt-4 pb-6 text-center border-b border-[#E2E8F0] dark:border-slate-800">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[9px] uppercase tracking-[0.25em] font-semibold mb-2">
          <Sparkles className="w-2.5 h-2.5 text-[#6366F1]" />
          <span>VESTRA HAUTE ATELIER</span>
        </div>
        <h1 className="font-serif text-2xl text-slate-900 dark:text-white font-normal">
          Mobile Silhouette Transfer
        </h1>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
          Synchronize your portrait with the virtual fitting room display
        </p>
      </header>

      {/* Main Content Area */}
      <main className="max-w-md mx-auto w-full flex-1 py-6 flex flex-col justify-center">

        {/* State 1: Loading Session */}
        {isLoadingSession && (
          <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 p-8 text-center space-y-4 shadow-sm">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#6366F1]" />
            <p className="text-xs uppercase tracking-widest text-[#6366F1] font-semibold">
              Connecting to Atelier Kiosk
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Verifying one-time session credentials...
            </p>
          </div>
        )}

        {/* State 2: Session Error or Expired */}
        {!isLoadingSession && sessionError && (
          <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900 p-8 text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 mx-auto flex items-center justify-center text-red-600 dark:text-red-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="font-serif text-xl text-slate-900 dark:text-white">Session Interrupted</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {sessionError}
            </p>
            <div className="pt-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 bg-[#000000] dark:bg-[#FFFFFF] text-white dark:text-black hover:opacity-90 text-xs uppercase tracking-widest font-semibold flex items-center justify-center space-x-2 transition-all shadow"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#6366F1]" />
                <span>Retry Connection</span>
              </button>
            </div>
          </div>
        )}

        {/* State 3: Upload Success */}
        {!isLoadingSession && !sessionError && uploadSuccess && (
          <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 p-8 text-center space-y-5 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 mx-auto flex items-center justify-center text-emerald-800 dark:text-emerald-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-widest text-emerald-800 dark:text-emerald-400 font-bold bg-emerald-100/60 dark:bg-emerald-950/60 px-2 py-0.5 border border-emerald-200 dark:border-emerald-800">
                Transfer Complete
              </span>
              <h2 className="font-serif text-2xl text-slate-900 dark:text-white pt-2">
                Photo Transferred Successfully
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
                Your silhouette has been safely synchronized with the virtual fitting room on the main display screen.
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 text-left text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
              <div className="flex items-center space-x-2 text-slate-900 dark:text-white font-semibold text-[11px] uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Next Step on Display</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                Return to your laptop or kiosk screen to inspect your silhouette, select garment sizing, and start your AI virtual try-on drape. You may now close this browser tab.
              </p>
            </div>
          </div>
        )}

        {/* State 4: Capture & Upload Form */}
        {!isLoadingSession && !sessionError && !uploadSuccess && (
          <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 p-6 sm:p-7 shadow-sm space-y-6">

            {/* Step Guidance */}
            <div className="space-y-1 text-center">
              <span className="text-[10px] uppercase tracking-widest text-[#6366F1] font-semibold">
                Single-Use Authorization
              </span>
              <h2 className="font-serif text-xl text-slate-900 dark:text-white">
                Submit Your Fitting Photo
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                For best virtual draping results, stand upright in balanced frontal lighting.
              </p>
            </div>

            {/* Photo Selection or Preview */}
            {!previewUrl ? (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full py-4 px-4 bg-[#000000] dark:bg-[#FFFFFF] text-white dark:text-black hover:opacity-90 text-xs uppercase tracking-[0.2em] font-semibold flex items-center justify-center space-x-3 transition-all shadow-md group"
                >
                  <Camera className="w-4 h-4 text-[#6366F1] transition-transform group-hover:scale-110" />
                  <span>Take Photo with Camera</span>
                </button>

                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="w-full py-3.5 px-4 bg-[#FAFAFA] dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 border border-[#E2E8F0] dark:border-slate-800 text-slate-900 dark:text-white text-xs uppercase tracking-[0.15em] font-semibold flex items-center justify-center space-x-3 transition-all"
                >
                  <ImageIcon className="w-4 h-4 text-[#6366F1]" />
                  <span>Choose from Photo Gallery</span>
                </button>

                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 text-center">
                  Accepts JPEG, PNG, and WebP up to 10MB.
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative aspect-[3/4] bg-slate-100 dark:bg-slate-950 border-2 border-[#000000] dark:border-white overflow-hidden shadow-inner">
                  <img
                    src={previewUrl}
                    alt="Selected Silhouette Preview"
                    className="w-full h-full object-cover object-center"
                  />
                  <button
                    type="button"
                    onClick={handleResetPhoto}
                    className="absolute top-2 right-2 p-1.5 bg-[#000000]/80 hover:bg-[#000000] text-white rounded-full transition-colors shadow"
                    title="Change Photo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-2 left-2 right-2 bg-[#000000]/80 backdrop-blur text-white text-[9px] uppercase tracking-wider py-1 px-2 text-center font-semibold">
                    Preview: Ready to Synchronize
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleResetPhoto}
                  className="text-xs uppercase tracking-wider font-semibold text-[#6366F1] hover:underline transition-colors block mx-auto"
                >
                  Take or Choose a Different Photo
                </button>
              </div>
            )}

            {/* Error Message Notice */}
            {uploadError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-900 dark:text-red-300 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">{uploadError}</div>
              </div>
            )}

            {/* Consent & Privacy Notice */}
            <div className="pt-2 border-t border-[#E2E8F0] dark:border-slate-800 space-y-3">
              <label className="flex items-start space-x-2.5 cursor-pointer select-none text-left">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-[#000000] focus:ring-[#6366F1] border-[#E2E8F0] dark:border-slate-800"
                />
                <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  I consent to uploading this photograph for VESTRA virtual try-on processing. Photos are stored in a private directory and deleted automatically after use.
                </span>
              </label>

              {/* Submit Action */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!selectedFile || !consentChecked || isUploading}
                className="w-full py-4 bg-[#000000] dark:bg-[#FFFFFF] text-white dark:text-black hover:opacity-90 text-xs uppercase tracking-[0.2em] font-semibold flex items-center justify-center space-x-2 transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#6366F1]" />
                    <span>Synchronizing with Atelier...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-[#6366F1]" />
                    <span>Transfer to Fitting Room &rarr;</span>
                  </>
                )}
              </button>
            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="max-w-md mx-auto w-full pt-4 pb-2 text-center text-[10px] text-slate-400 dark:text-slate-500 border-t border-[#E2E8F0] dark:border-slate-800">
        <p>VESTRA Atelier &bull; Zero credentials or personal data exposed</p>
      </footer>

    </div>
  );
}
