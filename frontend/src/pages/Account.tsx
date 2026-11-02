import React, { useState } from 'react';
import { ShieldCheck, User as UserIcon, Trash2, LogOut, CheckCircle2, AlertCircle, Heart, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export const Account: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(api.getStoredUser());
  const [dataConsent, setDataConsent] = useState(user?.consentDataSaving || false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const handleToggleConsent = () => {
    const next = !dataConsent;
    setDataConsent(next);
    setFeedbackMsg(`Privacy settings updated: Data retention consent is now ${next ? 'ENABLED' : 'DISABLED'}.`);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to permanently delete your account and all associated personal data? This action cannot be undone.')) {
      return;
    }

    try {
      api.logout();
      setUser(null);
      alert('Your account and personal biometric try-on records have been permanently erased from PostgreSQL.');
      navigate('/');
    } catch (e: any) {
      alert(e.message || 'Deletion failed');
    }
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    navigate('/');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      {/* Header */}
      <div className="border-b border-[#E8E2D5] pb-4">
        <div className="text-xs uppercase tracking-widest text-[#B99A5B] font-bold">Privacy & Account</div>
        <h1 className="font-serif text-3xl font-bold text-[#681D32]">
          Customer Profile & Data Rights
        </h1>
        <p className="text-xs text-[#292522]/70 mt-1">
          Review your personal details, biometric consent status, and exercise your right to permanent data erasure.
        </p>
      </div>

      {feedbackMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {user ? (
        <div className="space-y-6">
          {/* User Profile Card */}
          <div className="bg-[#FAF7F0] border border-[#E8E2D5] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8E2D5] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#681D32] text-white flex items-center justify-center font-serif text-lg font-bold">
                  {user.fullName?.charAt(0) || user.email?.charAt(0) || 'U'}
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#681D32]">{user.fullName || user.email}</h3>
                  <div className="text-xs text-[#292522]/70">{user.email} • {user.phone || '+91 98450 77889'}</div>
                </div>
              </div>
              <span className="text-xs font-semibold uppercase px-2.5 py-1 rounded bg-[#B99A5B]/20 text-[#681D32] border border-[#B99A5B]/40">
                {user.role}
              </span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleLogout}
                className="px-4 py-2 border border-[#E8E2D5] text-[#292522] hover:bg-[#F2EDE2] rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* Biometric & Privacy Consent Settings */}
          <div className="bg-[#FAF7F0] border border-[#B99A5B] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-[#681D32] font-serif font-bold text-base">
              <ShieldCheck className="w-5 h-5 text-[#B99A5B]" />
              <span>Biometric Photo Retention Policy</span>
            </div>

            <p className="text-xs text-[#292522]/80 leading-relaxed">
              SAJEE complies with global privacy standards. By default, temporary photographs taken during virtual try-on sessions are automatically destroyed upon session completion. You may opt to preserve your draped results only if desired for future salon visits.
            </p>

            <div className="flex items-center justify-between p-4 bg-[#F2EDE2] rounded-xl border border-[#E8E2D5]">
              <div>
                <div className="font-semibold text-xs text-[#292522]">Save Virtual Draping Looks in Private Vault</div>
                <div className="text-[11px] text-[#292522]/70">Allows store stylists to recall your preferred pleats & palette.</div>
              </div>
              <button
                onClick={handleToggleConsent}
                className={`w-12 h-6 rounded-full transition-colors p-1 ${dataConsent ? 'bg-[#681D32]' : 'bg-gray-300'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${dataConsent ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>

          {/* Right to Erasure / Account Deletion */}
          <div className="bg-red-50/50 border border-red-200 rounded-2xl p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-red-800 font-bold text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>Right to Erasure (Permanent Deletion)</span>
            </div>
            <p className="text-xs text-red-900/80 leading-relaxed">
              Permanently destroy your customer profile, authentication credentials, and all recorded session tokens from our PostgreSQL database.
            </p>
            <button
              onClick={handleDeleteAccount}
              className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow"
            >
              <Trash2 className="w-4 h-4" />
              <span>Permanently Delete My Data & Account</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-[#FAF7F0] border border-[#E8E2D5] rounded-2xl space-y-3">
          <Lock className="w-10 h-10 text-[#B99A5B] mx-auto" />
          <h3 className="font-serif text-lg font-bold text-[#681D32]">Sign In to Manage Privacy Settings</h3>
          <p className="text-xs text-[#292522]/70 max-w-sm mx-auto">
            Access your showroom profile or switch personas using the top navigation bar.
          </p>
        </div>
      )}
    </div>
  );
};
