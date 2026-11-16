import React, { useState, useEffect, useRef } from 'react';
import { Smartphone, RefreshCw, CheckCircle2, AlertCircle, X, Shield, Clock, ExternalLink, Copy, Check, Wifi } from 'lucide-react';
import tryOnService from '../services/tryOnService';

export default function QrModal({ isOpen, onClose, onPhotoReceived }) {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(300);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState(null);
  const [copied, setCopied] = useState(false);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#121316] border border-black/[0.08] dark:border-white/[0.08] max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl relative rounded-xs">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2 pt-1">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-black/[0.06] dark:border-white/[0.08] text-xs font-mono rounded-xs">
            <Smartphone className="w-3.5 h-3.5 text-[#A84B55] dark:text-[#C96872]" />
            <span>Mobile silhouette link</span>
          </div>
          <h3 className="font-serif text-2xl text-neutral-900 dark:text-neutral-50 font-normal">
            Scan with your phone camera
          </h3>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-sm mx-auto">
            Scan the QR code below using your mobile phone camera to upload a portrait directly from your phone gallery.
          </p>
        </div>

        {/* Synchronized Success Screen */}
        {uploadedPhotoUrl ? (
          <div className="p-6 bg-white dark:bg-[#17181C] border border-emerald-500/30 text-center space-y-4 rounded-xs">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-500/20 mx-auto flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-serif text-lg text-neutral-900 dark:text-neutral-100 font-normal">Silhouette transferred</h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Synchronizing with fitting room session...
              </p>
            </div>
            <div className="w-20 h-28 mx-auto bg-neutral-100 dark:bg-neutral-800 border border-black/[0.08] dark:border-white/[0.08] overflow-hidden rounded-xs">
              <img src={uploadedPhotoUrl} alt="Synchronized" className="w-full h-full object-cover" />
            </div>
          </div>
        ) : (
          /* Active QR Display Screen */
          <div className="space-y-5">
            {isLoading ? (
              <div className="aspect-square max-w-[260px] mx-auto bg-neutral-50 dark:bg-[#17181C] border border-black/[0.06] dark:border-white/[0.06] flex flex-col items-center justify-center p-6 space-y-3 rounded-xs">
                <RefreshCw className="w-6 h-6 animate-spin text-[#C96872]" />
                <span className="text-xs font-mono text-neutral-500">
                  Generating secure token...
                </span>
              </div>
            ) : error ? (
              <div className="p-6 bg-red-50 dark:bg-red-950/40 border border-red-500/20 text-center space-y-3 rounded-xs">
                <AlertCircle className="w-6 h-6 text-red-600 mx-auto" />
                <p className="text-xs text-red-800 dark:text-red-200 leading-relaxed">{error}</p>
                <button
                  onClick={initSession}
                  className="min-h-[40px] px-4 py-2 bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 text-xs font-medium rounded-xs"
                >
                  Generate new QR
                </button>
              </div>
            ) : session?.qrCodeDataUrl ? (
              <div className="space-y-4">
                
                {/* QR Code Container */}
                <div className="relative aspect-square max-w-[240px] mx-auto bg-white p-3 border border-black/[0.1] dark:border-white/[0.1] shadow-xs flex items-center justify-center rounded-xs">
                  <img
                    src={session.qrCodeDataUrl}
                    alt="Mobile Upload QR Code"
                    className="w-full h-full object-contain"
                  />
                  {countdown === 0 && (
                    <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-4 text-center space-y-2 text-white">
                      <Clock className="w-6 h-6 text-amber-400" />
                      <p className="text-xs font-mono">Token expired</p>
                      <button
                        onClick={initSession}
                        className="px-4 py-2 bg-white text-black text-xs font-medium hover:bg-neutral-100 transition-colors rounded-xs"
                      >
                        Refresh QR
                      </button>
                    </div>
                  )}
                </div>

                {/* Session countdown and security badge */}
                <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400 px-3 py-2 bg-neutral-50 dark:bg-[#17181C] border border-black/[0.06] dark:border-white/[0.06] rounded-xs">
                  <div className="flex items-center space-x-1.5 font-mono">
                    <Clock className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Expires: <strong className="text-neutral-900 dark:text-neutral-200">{formattedCountdown}</strong></span>
                  </div>
                  <div className="flex items-center space-x-1 text-xs text-neutral-500">
                    <Shield className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Isolated token</span>
                  </div>
                </div>

                {/* Wi-Fi & Network Notice */}
                <div className="flex items-center space-x-2 p-2.5 bg-neutral-50 dark:bg-[#17181C] border border-black/[0.06] dark:border-white/[0.06] rounded-xs text-xs text-neutral-600 dark:text-neutral-400">
                  <Wifi className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                  <span>Connect phone to the same Wi-Fi network (IP: <strong className="text-neutral-800 dark:text-neutral-200">{session.lanIp}</strong>)</span>
                </div>

                <div className="text-center text-xs text-neutral-500 dark:text-neutral-400 space-y-2">
                  <p>Scan with your phone's default Camera app to upload.</p>
                  
                  {/* Direct link helper */}
                  <div className="flex items-center justify-center space-x-2 pt-1 border-t border-black/[0.06] dark:border-white/[0.06] text-xs">
                    <a
                      href={session.mobileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-700 dark:text-neutral-300 hover:underline font-mono flex items-center space-x-1"
                    >
                      <span>Open mobile link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <span className="text-neutral-300 dark:text-neutral-700">&bull;</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(session.mobileUrl);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white font-mono flex items-center space-x-1"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Copied' : 'Copy link'}</span>
                    </button>
                  </div>
                </div>

              </div>
            ) : null}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-black/[0.06] dark:border-white/[0.06]">
              <button
                type="button"
                onClick={initSession}
                className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100 font-medium flex items-center space-x-1.5 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span>New QR token</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="min-h-[40px] px-5 py-2 border border-black/[0.1] dark:border-white/[0.1] text-neutral-800 dark:text-neutral-200 text-xs font-medium hover:bg-neutral-50 dark:hover:bg-[#17181C] transition-colors rounded-xs"
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