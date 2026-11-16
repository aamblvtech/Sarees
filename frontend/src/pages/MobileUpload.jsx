import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Camera, Image as ImageIcon, ShieldCheck, AlertCircle, CheckCircle2, RefreshCw, X } from 'lucide-react';
import axios from 'axios';

/**
 * VESTRA Mobile Silhouette Upload Companion
 * Accessible via QR Code from Virtual Fitting Room.
 * Uses Atelier aesthetic tokens.
 */
export default function MobileUpload() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [sessionError, setSessionError] = useState(null);
  const [sessionData, setSessionData] = useState(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  useEffect(() => {
    if (!token) {
      setSessionError('Missing or invalid session link. Please scan the QR code from the fitting room screen.');
      setIsLoadingSession(false);
      return;
    }

    const verifySession = async () => {
      try {
        const res = await axios.get(`/api/tryon/qr-session/${token}`);
        if (res.data?.success) {
          if (res.data.data.status === 'expired') {
            setSessionError('This transfer link has expired (5 minute security timeout). Please generate a new QR code on your main screen.');
          } else if (res.data.data.status === 'consumed') {
            setSessionError('This session has already been used. Please scan a fresh QR code.');
          } else {
            setSessionData(res.data.data);
          }
        } else {
          setSessionError('Session verification failed.');
        }
      } catch (err) {
        setSessionError(err.response?.data?.error || 'Unable to connect to session. Ensure your phone is connected to the same local network.');
      } finally {
        setIsLoadingSession(false);
      }
    };

    verifySession();
  }, [token]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setUploadError('Please select a valid image (JPEG, PNG, or WebP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Image size exceeds 10MB limit.');
      return;
    }

    setUploadError(null);
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleResetPhoto = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadError(null);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      setUploadError('Please choose or take a photo first.');
      return;
    }

    if (!consentChecked) {
      setUploadError('Please acknowledge the privacy consent before continuing.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('photo', selectedFile);

      const res = await axios.post(`/api/tryon/qr-upload/${token}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.success) {
        setUploadSuccess(true);
      } else {
        setUploadError(res.data?.error || 'Transfer failed.');
      }
    } catch (err) {
      setUploadError(err.response?.data?.error || err.message || 'Upload failed. Check your connection.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#0D0E10] text-neutral-900 dark:text-neutral-100 flex flex-col justify-between p-4 sm:p-6 transition-colors">
      
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
      <header className="max-w-md mx-auto w-full pt-4 pb-6 text-center border-b border-black/[0.06] dark:border-white/[0.06]">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 text-xs font-mono mb-2 rounded-xs">
          <span>VESTRA Atelier</span>
        </div>
        <h1 className="font-serif text-2xl text-neutral-900 dark:text-neutral-50 font-normal">
          Mobile Silhouette Transfer
        </h1>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Synchronize your portrait with the virtual fitting room display
        </p>
      </header>

      {/* Main Content Area */}
      <main className="max-w-md mx-auto w-full flex-1 py-6 flex flex-col justify-center">

        {/* State 1: Loading Session */}
        {isLoadingSession && (
          <div className="bg-white dark:bg-[#121316] border border-black/[0.08] dark:border-white/[0.08] p-8 text-center space-y-4 rounded-xs shadow-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#C96872]" />
            <p className="text-xs font-mono text-neutral-600 dark:text-neutral-300">
              Connecting to atelier kiosk...
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Verifying one-time session credentials...
            </p>
          </div>
        )}

        {/* State 2: Session Error or Expired */}
        {!isLoadingSession && sessionError && (
          <div className="bg-white dark:bg-[#121316] border border-red-500/20 p-8 text-center space-y-4 rounded-xs shadow-xs">
            <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-500/20 mx-auto flex items-center justify-center text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h2 className="font-serif text-xl text-neutral-900 dark:text-neutral-100 font-normal">Session interrupted</h2>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {sessionError}
            </p>
            <div className="pt-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full min-h-[44px] bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 text-xs font-medium flex items-center justify-center space-x-2 transition-colors rounded-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry connection</span>
              </button>
            </div>
          </div>
        )}

        {/* State 3: Upload Success */}
        {!isLoadingSession && !sessionError && uploadSuccess && (
          <div className="bg-white dark:bg-[#121316] border border-emerald-500/20 p-8 text-center space-y-5 rounded-xs shadow-xs">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 mx-auto flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-xs border border-emerald-500/20">
                Transfer complete
              </span>
              <h2 className="font-serif text-2xl text-neutral-900 dark:text-neutral-100 font-normal pt-2">
                Photo transferred successfully
              </h2>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed pt-1">
                Your silhouette has been safely synchronized with the virtual fitting room on the main display screen.
              </p>
            </div>

            <div className="p-4 bg-neutral-50 dark:bg-[#17181C] border border-black/[0.06] dark:border-white/[0.06] text-left text-xs text-neutral-700 dark:text-neutral-300 space-y-1.5 rounded-xs">
              <div className="flex items-center space-x-2 text-neutral-900 dark:text-neutral-100 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Next step on display</span>
              </div>
              <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                Return to your screen to inspect your silhouette, select garment sizing, and start your AI virtual try-on drape. You may now close this browser tab.
              </p>
            </div>
          </div>
        )}

        {/* State 4: Capture & Upload Form */}
        {!isLoadingSession && !sessionError && !uploadSuccess && (
          <div className="bg-white dark:bg-[#121316] border border-black/[0.08] dark:border-white/[0.08] p-6 sm:p-7 rounded-xs shadow-xs space-y-6">

            {/* Step Guidance */}
            <div className="space-y-1 text-center">
              <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400">
                Single-use authorization
              </span>
              <h2 className="font-serif text-xl text-neutral-900 dark:text-neutral-100 font-normal">
                Submit your fitting photo
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                For best virtual draping results, stand upright in balanced frontal lighting.
              </p>
            </div>

            {/* Photo Selection or Preview */}
            {!previewUrl ? (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full min-h-[48px] px-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 text-xs font-medium flex items-center justify-center space-x-2.5 transition-colors rounded-xs shadow-xs"
                >
                  <Camera className="w-4 h-4" />
                  <span>Take photo with camera</span>
                </button>

                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="w-full min-h-[44px] px-4 bg-white dark:bg-[#17181C] hover:bg-neutral-50 dark:hover:bg-neutral-800 border border-black/[0.1] dark:border-white/[0.1] text-neutral-800 dark:text-neutral-200 text-xs font-medium flex items-center justify-center space-x-2.5 transition-colors rounded-xs"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>Choose from photo gallery</span>
                </button>

                <div className="p-3 bg-neutral-50 dark:bg-[#17181C] border border-black/[0.06] dark:border-white/[0.06] text-xs text-neutral-500 dark:text-neutral-400 text-center rounded-xs">
                  Accepts JPEG, PNG, and WebP up to 10MB.
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative aspect-[3/4] bg-neutral-100 dark:bg-neutral-900 border border-black/[0.1] dark:border-white/[0.1] overflow-hidden rounded-xs">
                  <img
                    src={previewUrl}
                    alt="Selected silhouette preview"
                    className="w-full h-full object-cover object-center"
                  />
                  <button
                    type="button"
                    onClick={handleResetPhoto}
                    className="absolute top-2 right-2 p-1.5 bg-black/80 hover:bg-black text-white rounded-full transition-colors"
                    title="Change photo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-2 left-2 right-2 bg-black/80 backdrop-blur-xs text-white text-[10px] py-1 px-2 text-center font-mono rounded-xs">
                    Preview: ready to synchronize
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleResetPhoto}
                  className="text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:underline transition-colors block mx-auto"
                >
                  Take or choose a different photo
                </button>
              </div>
            )}

            {/* Error Message Notice */}
            {uploadError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-500/20 text-xs text-red-900 dark:text-red-300 flex items-start space-x-2 rounded-xs">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">{uploadError}</div>
              </div>
            )}

            {/* Consent & Privacy Notice */}
            <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.06] space-y-3">
              <label className="flex items-start space-x-2.5 cursor-pointer select-none text-left">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-neutral-900 focus:ring-neutral-500 border-neutral-300 dark:border-neutral-700 rounded-xs"
                />
                <span className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  I consent to uploading this photograph for VESTRA virtual try-on processing. Photos are stored in a private directory and deleted automatically after use.
                </span>
              </label>

              {/* Submit Action */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!selectedFile || !consentChecked || isUploading}
                className="w-full min-h-[48px] bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 text-xs font-medium flex items-center justify-center space-x-2 transition-colors rounded-xs shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Synchronizing with atelier...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Transfer to fitting room &rarr;</span>
                  </>
                )}
              </button>
            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="max-w-md mx-auto w-full pt-4 pb-2 text-center text-xs text-neutral-400 dark:text-neutral-500 border-t border-black/[0.06] dark:border-white/[0.06]">
        <p>VESTRA Atelier &bull; Zero credentials or personal data exposed</p>
      </footer>

    </div>
  );
}