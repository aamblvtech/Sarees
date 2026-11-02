import React, { useState, useEffect, useRef } from 'react';
import { Smartphone, RefreshCw, CheckCircle2, AlertCircle, X, Shield, Clock } from 'lucide-react';
import tryOnService from '../services/tryOnService';

export default function QrModal({ isOpen, onClose, onPhotoReceived }) {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(300);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState(null);

  const pollIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  const initSession = async () => {
    setIsLoading(true);
    setError(null);
    setUploadedPhotoUrl(null);
    setCountdown(300);

    try {
      const newSession = await tryOnService.createQrSession();
      setSession(newSession);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to initialize QR session.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      setSession(null);
      setUploadedPhotoUrl(null);
      return;
    }

    initSession();

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!session || uploadedPhotoUrl) return;

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [session, uploadedPhotoUrl]);

  useEffect(() => {
    if (!session?.token || uploadedPhotoUrl) return;

    pollIntervalRef.current = setInterval(async () => {
      try {
        const statusData = await tryOnService.getQrSession(session.token);

        if (statusData && statusData.status === 'uploaded' && statusData.photoUrl) {
          clearInterval(pollIntervalRef.current);
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

          setUploadedPhotoUrl(statusData.photoUrl);

          await tryOnService.consumeQrSession(session.token);

          onPhotoReceived(statusData.photoUrl, statusData.photoFilename);

          setTimeout(() => {
            onClose();
          }, 2000);
        } else if (statusData && statusData.status === 'expired') {
          clearInterval(pollIntervalRef.current);
        }
      } catch (err) {
        // network polling hiccup
      }
    }, 2000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [session, uploadedPhotoUrl]);

  const formattedCountdown = `${Math.floor(countdown / 60)}:${(countdown % 60).toString().padStart(2, '0')}`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#FAFAFA] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-800 max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-[#000000] dark:hover:text-[#FFFFFF] transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2 pt-1">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-[#000000] text-[#FFFFFF] dark:bg-[#FFFFFF] dark:text-[#000000] text-[9px] uppercase font-mono tracking-widest font-semibold">
            <Smartphone className="w-3 h-3 text-[#6366F1]" />
            <span>Mobile Silhouette Link</span>
          </div>
          <h3 className="font-serif text-2xl text-[#000000] dark:text-[#FFFFFF]">
            Scan with Your Phone Camera
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
            Scan the QR code below using your mobile phone camera to upload a portrait directly from your phone gallery.
          </p>
        </div>

        {/* Synchronized Success Screen */}
        {uploadedPhotoUrl ? (
          <div className="p-6 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 text-center space-y-4 animate-fadeIn">
            <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 mx-auto flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h4 className="font-serif text-lg text-[#000000] dark:text-[#FFFFFF]">Silhouette Transferred!</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Synchronizing with fitting room session...
              </p>
            </div>
            <div className="w-20 h-28 mx-auto bg-slate-100 border border-[#E2E8F0] overflow-hidden shadow">
              <img src={uploadedPhotoUrl} alt="Synchronized Photo" className="w-full h-full object-cover" />
            </div>
          </div>
        ) : (
          /* Active QR Display Screen */
          <div className="space-y-5">
            {isLoading ? (
              <div className="aspect-square max-w-[260px] mx-auto bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 flex flex-col items-center justify-center p-6 space-y-3">
                <RefreshCw className="w-7 h-7 animate-spin text-[#6366F1]" />
                <span className="text-xs font-mono uppercase tracking-wider text-slate-500">
                  Generating Token...
                </span>
              </div>
            ) : error ? (
              <div className="p-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-center space-y-3">
                <AlertCircle className="w-6 h-6 text-rose-600 mx-auto" />
                <p className="text-xs text-rose-800 dark:text-rose-200 leading-relaxed">{error}</p>
                <button
                  onClick={initSession}
                  className="px-4 py-2 bg-[#000000] text-[#FFFFFF] dark:bg-[#FFFFFF] dark:text-[#000000] text-xs uppercase tracking-wider font-semibold"
                >
                  Generate New QR
                </button>
              </div>
            ) : session?.qrCodeDataUrl ? (
              <div className="space-y-4">
                
                {/* QR Code Container */}
                <div className="relative aspect-square max-w-[240px] mx-auto bg-white p-3 border-2 border-[#000000] dark:border-[#FFFFFF] shadow-md flex items-center justify-center">
                  <img
                    src={session.qrCodeDataUrl}
                    alt="Mobile Upload QR Code"
                    className="w-full h-full object-contain"
                  />
                  {countdown === 0 && (
                    <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-4 text-center space-y-2 text-white">
                      <Clock className="w-6 h-6 text-amber-400" />
                      <p className="text-xs font-semibold uppercase tracking-wider font-mono">Token Expired</p>
                      <button
                        onClick={initSession}
                        className="px-4 py-2 bg-white text-black text-xs uppercase tracking-widest font-semibold hover:bg-slate-100 transition-colors"
                      >
                        Refresh QR
                      </button>
                    </div>
                  )}
                </div>

                {/* Session countdown and security badge */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-3 py-2 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800">
                  <div className="flex items-center space-x-1.5 font-mono">
                    <Clock className="w-3.5 h-3.5 text-[#6366F1]" />
                    <span>Expires: <strong className="text-[#000000] dark:text-[#FFFFFF]">{formattedCountdown}</strong></span>
                  </div>
                  <div className="flex items-center space-x-1 text-[10px] text-slate-500">
                    <Shield className="w-3 h-3 text-[#6366F1]" />
                    <span>Isolated Token</span>
                  </div>
                </div>

                <div className="text-center text-[10px] text-slate-500 dark:text-slate-400 space-y-1">
                  <p>Open default camera app on iOS or Android and tap notification.</p>
                </div>

              </div>
            ) : null}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-[#E2E8F0] dark:border-slate-800">
              <button
                type="button"
                onClick={initSession}
                className="text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:text-[#000000] dark:hover:text-[#FFFFFF] font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span>New QR Token</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 border border-[#E2E8F0] dark:border-slate-700 text-[#000000] dark:text-[#FFFFFF] text-xs uppercase tracking-widest font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                Cancel
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
