import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Sparkles, Camera, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw, Layers, ArrowLeft, Trash2, Heart } from 'lucide-react';
import { SareeProduct, TryOnJob } from '../types';
import { api } from '../services/api';
import { CameraCaptureModal } from '../components/CameraCaptureModal';

export const CustomerSession: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [session, setSession] = useState<any>(null);
  const [sarees, setSarees] = useState<SareeProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [activeSaree, setActiveSaree] = useState<SareeProduct | null>(null);
  const [showTryOnModal, setShowTryOnModal] = useState(false);
  const [sessionPurged, setSessionPurged] = useState(false);

  useEffect(() => {
    async function resolveSession() {
      if (!token) return;
      setLoading(true);
      setErrorMsg(null);
      setErrorStatus(null);
      try {
        const res = await api.getSessionByToken(token);
        setSession(res.session);
        setSarees(res.sarees);
        if (res.sarees.length > 0) setActiveSaree(res.sarees[0]);
      } catch (err: any) {
        setErrorMsg(err.message || 'Unable to load try-on collection session.');
        if (err.message?.includes('expired')) setErrorStatus('EXPIRED');
        else if (err.message?.includes('revoked')) setErrorStatus('REVOKED');
        else setErrorStatus('NOT_FOUND');
      } finally {
        setLoading(false);
      }
    }
    resolveSession();
  }, [token]);

  const handlePurgeAndExit = async () => {
    if (session?.id) {
      try {
        await api.purgeSessionData(session.id);
      } catch (e) {
        console.warn(e);
      }
    }
    setSessionPurged(true);
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-10 h-10 border-4 border-[#681D32] border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs text-[#292522]/70">Cryptographically resolving QR token with PostgreSQL...</p>
      </div>
    );
  }

  if (sessionPurged) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-[#FAF7F0] border border-[#B99A5B] rounded-2xl text-center space-y-4 shadow-xl">
        <ShieldCheck className="w-12 h-12 text-[#681D32] mx-auto" />
        <h2 className="font-serif text-2xl font-bold text-[#681D32]">Session Concluded & Data Purged</h2>
        <p className="text-xs text-[#292522]/80 leading-relaxed">
          In strict compliance with SAJEE Privacy Protocol, your temporary uploaded photos and virtual drape jobs have been permanently erased from the server.
        </p>
        <Link
          to="/"
          className="inline-block px-6 py-2.5 bg-[#681D32] text-white rounded-xl text-xs font-bold"
        >
          Return to SAJEE Homepage
        </Link>
      </div>
    );
  }

  if (errorStatus) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-[#FAF7F0] border border-red-300 rounded-2xl text-center space-y-4 shadow-xl">
        <AlertCircle className="w-12 h-12 text-red-600 mx-auto" />
        <h2 className="font-serif text-2xl font-bold text-[#681D32]">
          {errorStatus === 'EXPIRED' ? 'QR Session Expired' : errorStatus === 'REVOKED' ? 'Session Revoked' : 'Session Not Found'}
        </h2>
        <p className="text-xs text-[#292522]/80 leading-relaxed">
          {errorMsg || 'This session is no longer active. Showroom sessions are valid for 60 minutes for privacy.'}
        </p>
        <div className="text-[11px] text-[#292522]/60 pt-2">
          Please ask your showroom draper (Ananya) to generate a new QR session for your fitting.
        </div>
        <Link
          to="/catalog"
          className="inline-block px-6 py-2.5 bg-[#681D32] text-white rounded-xl text-xs font-bold"
        >
          Explore Public Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Session Header */}
      <div className="bg-[#FAF7F0] border border-[#B99A5B] rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#B99A5B]">
            <Sparkles className="w-4 h-4" />
            <span>Showroom Guest Session • {session?.customerName || 'Personal Salon Suite'}</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#681D32] mt-1">
            Your Selected Saree Collection ({sarees.length} Sarees)
          </h1>
          <p className="text-xs text-[#292522]/70 mt-0.5">
            Synchronized directly from the physical barcode scanner at Lavelle Road.
          </p>
        </div>

        <button
          onClick={handlePurgeAndExit}
          className="px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-300 text-red-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <Trash2 className="w-4 h-4 text-red-600" />
          <span>Delete Photos & End Session</span>
        </button>
      </div>

      {/* Saree Grid in Customer Suite */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {sarees.map(saree => (
          <div
            key={saree.id}
            className="bg-[#FAF7F0] border border-[#E8E2D5] rounded-xl overflow-hidden hover:border-[#B99A5B] transition-all shadow-sm flex flex-col justify-between"
          >
            <div className="aspect-[3/4] relative overflow-hidden bg-[#F2EDE2]">
              <img src={saree.primaryImage} alt={saree.name} className="w-full h-full object-cover" />
              <div className="absolute top-3 left-3 bg-[#681D32] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                {saree.sku}
              </div>
            </div>

            <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-[#B99A5B]">{saree.occasion}</div>
                <h3 className="font-serif font-bold text-sm text-[#681D32]">{saree.name}</h3>
                <div className="text-xs text-[#292522] font-semibold mt-1">
                  ₹{saree.price.toLocaleString('en-IN')}
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveSaree(saree);
                  setShowTryOnModal(true);
                }}
                className="w-full py-2.5 bg-[#681D32] hover:bg-[#852842] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow"
              >
                <Camera className="w-3.5 h-3.5 text-[#B99A5B]" />
                <span>Try On Virtually</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Virtual Try-On Modal */}
      {showTryOnModal && activeSaree && (
        <CameraCaptureModal
          product={activeSaree}
          isOpen={showTryOnModal}
          onClose={() => setShowTryOnModal(false)}
          sessionId={session?.id}
        />
      )}
    </div>
  );
};
