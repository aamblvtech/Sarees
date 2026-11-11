import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, ArrowRight, ShieldCheck, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import adminService from '../services/adminService';

export default function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await adminService.login(email, password);
      if (res.success) {
        navigate('/admin/dashboard');
      } else {
        setError(res.error || 'Authentication rejected.');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Unable to connect to authentication server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] bg-white dark:bg-[#0F172A] flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-slate-900 p-8 sm:p-10 border border-slate-200/90 dark:border-slate-800 shadow-sm">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-block">
            <span className="font-serif text-3xl tracking-[0.25em] text-slate-900 dark:text-white font-semibold block">
              VESTRA
            </span>
          </Link>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] tracking-widest uppercase font-semibold">
            <Lock className="w-3 h-3 text-[#F5AFAF]" />
            <span>Atelier Management Portal</span>
          </div>
          <h2 className="font-serif text-2xl text-slate-900 dark:text-white pt-2">
            Administrator Sign In
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Enter your credentials to manage collection inventory, category taxonomies, and virtual try-on assets.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wider font-semibold text-slate-900 dark:text-white block">
              Admin Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#F5AFAF] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@vestra.com"
                className="w-full bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 text-xs text-slate-900 dark:text-white pl-9 pr-3 py-2.5 focus:outline-none focus:border-[#000000] dark:focus:border-[#FFFFFF]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wider font-semibold text-slate-900 dark:text-white block">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#F5AFAF] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 text-xs text-slate-900 dark:text-white pl-9 pr-3 py-2.5 focus:outline-none focus:border-[#000000] dark:focus:border-[#FFFFFF]"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-white hover:bg-rose-50/50 hover:border-rose-300 text-slate-900 dark:bg-white dark:text-black text-xs uppercase tracking-[0.2em] font-semibold flex items-center justify-center space-x-2 transition-all shadow-xs border-2 border-slate-900 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#F5AFAF]" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Enter Atelier Portal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

        </form>

        {/* Security Notice */}
        <div className="pt-4 border-t border-[#F9DFDF] dark:border-slate-800 text-center">
          <div className="flex items-center justify-center space-x-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-[#F5AFAF]" />
            <span>Secured with JWT Session Tokens & PostgreSQL RBAC</span>
          </div>
        </div>

      </div>
    </div>
  );
}
