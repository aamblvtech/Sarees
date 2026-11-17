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
    <div className="min-h-[85vh] bg-neutral-50 dark:bg-[#0D0E10] flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-md w-full space-y-6 bg-white dark:bg-[#121316] p-8 sm:p-10 border border-black/[0.08] dark:border-white/[0.08] rounded-md shadow-sm">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-block">
            <span className="font-serif text-3xl tracking-[0.25em] text-neutral-900 dark:text-white font-light block">
              VASTRA
            </span>
          </Link>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 bg-neutral-100 dark:bg-[#17181C] text-neutral-600 dark:text-neutral-300 text-[11px] font-mono rounded-sm">
            <Lock className="w-3 h-3 text-neutral-400" strokeWidth={1.5} />
            <span>Atelier Management Portal</span>
          </div>
          <h2 className="font-serif text-2xl font-normal text-neutral-900 dark:text-white pt-1">
            Administrator sign in
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
            Enter your credentials to manage collection inventory, category taxonomies, and virtual try-on assets.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start space-x-2 rounded-md">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 block">
              Email address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={1.5} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@vastra.com"
                className="w-full bg-neutral-50 dark:bg-[#17181C] border border-black/[0.08] dark:border-white/[0.08] text-xs text-neutral-900 dark:text-white pl-9 pr-3 py-2.5 rounded-md focus:outline-none focus:border-neutral-900 dark:focus:border-white transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 block">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={1.5} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-neutral-50 dark:bg-[#17181C] border border-black/[0.08] dark:border-white/[0.08] text-xs text-neutral-900 dark:text-white pl-9 pr-3 py-2.5 rounded-md focus:outline-none focus:border-neutral-900 dark:focus:border-white transition-colors"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-950 text-xs font-medium flex items-center justify-center space-x-2 transition-colors rounded-md shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-neutral-400" />
                  <span>Verifying credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign in to portal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

        </form>

        {/* Security Notice */}
        <div className="pt-4 border-t border-black/[0.08] dark:border-white/[0.08] text-center">
          <div className="flex items-center justify-center space-x-1.5 text-xs text-neutral-400">
            <ShieldCheck className="w-3.5 h-3.5 opacity-60" strokeWidth={1.5} />
            <span>Secured with JWT session tokens & PostgreSQL RBAC</span>
          </div>
        </div>

      </div>
    </div>
  );
}
