import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Phone,
  MapPin,
  FileText,
  Globe,
  Tag
} from 'lucide-react';
import supplierService from '../services/supplierService';

export default function SupplierLogin() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);

  // Register form state
  const [registerData, setRegisterData] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    password: '',
    phone: '',
    city: 'Surat',
    country: 'India',
    supplierType: 'manufacturer',
    brandName: '',
    taxId: '',
    warehouseAddress: '',
    websiteUrl: '',
    agreeTerms: true
  });
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState(null);
  const [registerSuccess, setRegisterSuccess] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const res = await supplierService.login(loginEmail, loginPassword);
      if (res.success && res.token) {
        navigate('/supplier/dashboard');
      } else {
        setLoginError(res.error || 'Authentication rejected.');
      }
    } catch (err) {
      setLoginError(
        err.response?.data?.error ||
          err.message ||
          'Unable to connect to supplier authentication server.'
      );
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegisterError(null);
    setRegisterSuccess(null);

    if (!registerData.agreeTerms) {
      setRegisterError('You must agree to the fashion image copyright & partnership terms.');
      return;
    }

    setRegisterLoading(true);
    try {
      const res = await supplierService.register(registerData);
      if (res.success) {
        setRegisterSuccess(
          `Application for "${res.supplier?.companyName || registerData.companyName}" submitted successfully! Your account code is ${res.supplier?.supplierCode}. An Atelier Administrator will review your credentials before account activation.`
        );
        // Reset registration fields
        setRegisterData({
          companyName: '',
          contactPerson: '',
          email: '',
          password: '',
          phone: '',
          city: 'Surat',
          country: 'India',
          supplierType: 'manufacturer',
          brandName: '',
          taxId: '',
          warehouseAddress: '',
          websiteUrl: '',
          agreeTerms: true
        });
      } else {
        setRegisterError(res.error || 'Registration failed.');
      }
    } catch (err) {
      setRegisterError(
        err.response?.data?.error || err.message || 'Unable to submit supplier registration.'
      );
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] bg-neutral-50 dark:bg-[#0D0E10] text-neutral-900 dark:text-neutral-100 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <Link to="/" className="inline-block">
            <span className="font-serif text-3xl tracking-[0.25em] text-neutral-900 dark:text-white font-light">
              VASTRA
            </span>
          </Link>
          <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 bg-neutral-100 dark:bg-[#17181C] border border-black/[0.08] dark:border-white/[0.08] text-neutral-600 dark:text-neutral-300 text-xs font-mono rounded-sm">
            <Building2 className="w-3.5 h-3.5 opacity-60" strokeWidth={1.5} />
            <span>Supplier & Designer Partner Portal</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-normal text-neutral-900 dark:text-white">
            {activeTab === 'login' ? 'Supplier sign in' : 'Partner application'}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
            Direct catalogue integration, high-resolution garment feeds, and AI Virtual Fitting Room onboarding for certified fashion manufacturers.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#121316] p-1 rounded-md shadow-xs">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setLoginError(null);
            }}
            className={`flex-1 min-h-[44px] py-2 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'login'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setRegisterError(null);
            }}
            className={`flex-1 min-h-[44px] py-2 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'register'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Apply as supplier
          </button>
        </div>

        {/* ===================== TAB 1: LOGIN ===================== */}
        {activeTab === 'login' && (
          <div className="bg-white dark:bg-[#121316] border border-black/[0.08] dark:border-white/[0.08] p-6 sm:p-8 rounded-md shadow-sm space-y-5">

            {/* Error Message */}
            {loginError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-md text-xs text-rose-700 dark:text-rose-300 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Registered supplier email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" strokeWidth={1.5} />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="partner@handloom.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-[#17181C] border border-black/[0.08] dark:border-white/[0.08] rounded-md text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" strokeWidth={1.5} />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-[#17181C] border border-black/[0.08] dark:border-white/[0.08] rounded-md text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full min-h-[44px] py-2.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-950 font-medium text-xs rounded-md flex items-center justify-center space-x-2 transition-colors shadow-sm disabled:opacity-50"
              >
                {loginLoading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Enter supplier portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="text-center pt-2 text-xs text-neutral-500">
              New fashion manufacturer or boutique designer?{' '}
              <button
                type="button"
                onClick={() => setActiveTab('register')}
                className="text-neutral-900 dark:text-white font-medium underline underline-offset-4"
              >
                Apply for partnership here
              </button>
            </div>
          </div>
        )}

        {/* ===================== TAB 2: REGISTER ===================== */}
        {activeTab === 'register' && (
          <div className="bg-white dark:bg-[#121316] border border-black/[0.08] dark:border-white/[0.08] p-6 sm:p-8 rounded-md shadow-sm space-y-5">
            
            {registerSuccess && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-md text-xs text-emerald-800 dark:text-emerald-300 space-y-2">
                <div className="flex items-center space-x-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Application submitted</span>
                </div>
                <p className="leading-relaxed">{registerSuccess}</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className="mt-2 text-xs font-medium underline underline-offset-4"
                >
                  Go to sign in
                </button>
              </div>
            )}

            {registerError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-md text-xs text-rose-700 dark:text-rose-300 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span>{registerError}</span>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Company / entity name *
                  </label>
                  <input
                    type="text"
                    required
                    value={registerData.companyName}
                    onChange={(e) => setRegisterData({ ...registerData, companyName: e.target.value })}
                    placeholder="e.g. Surat Heritage Weaves Pvt Ltd"
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-[#17181C] border border-black/[0.08] dark:border-white/[0.08] rounded-md text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Brand name
                  </label>
                  <input
                    type="text"
                    value={registerData.brandName}
                    onChange={(e) => setRegisterData({ ...registerData, brandName: e.target.value })}
                    placeholder="e.g. Surat Silks"
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-[#17181C] border border-black/[0.08] dark:border-white/[0.08] rounded-md text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Primary contact person *
                  </label>
                  <input
                    type="text"
                    required
                    value={registerData.contactPerson}
                    onChange={(e) => setRegisterData({ ...registerData, contactPerson: e.target.value })}
                    placeholder="e.g. Rajesh K. Mehta"
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-[#17181C] border border-black/[0.08] dark:border-white/[0.08] rounded-md text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Supplier category *
                  </label>
                  <select
                    value={registerData.supplierType}
                    onChange={(e) => setRegisterData({ ...registerData, supplierType: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-[#17181C] border border-black/[0.08] dark:border-white/[0.08] rounded-md text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-white"
                  >
                    <option value="manufacturer">Clothing Manufacturer</option>
                    <option value="wholesaler">Fashion Wholesaler</option>
                    <option value="boutique">Independent Boutique</option>
                    <option value="artisan_cooperative">Artisan Cooperative</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Official work email *
                  </label>
                  <input
                    type="email"
                    required
                    value={registerData.email}
                    onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                    placeholder="partner@company.com"
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-[#17181C] border border-black/[0.08] dark:border-white/[0.08] rounded-md text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Account password *
                  </label>
                  <input
                    type="password"
                    required
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    placeholder="Min. 8 characters"
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-[#17181C] border border-black/[0.08] dark:border-white/[0.08] rounded-md text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Phone / WhatsApp *
                  </label>
                  <input
                    type="text"
                    required
                    value={registerData.phone}
                    onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                    placeholder="+91 98250 11223"
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-[#17181C] border border-black/[0.08] dark:border-white/[0.08] rounded-md text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    City & state *
                  </label>
                  <input
                    type="text"
                    required
                    value={registerData.city}
                    onChange={(e) => setRegisterData({ ...registerData, city: e.target.value })}
                    placeholder="e.g. Surat, Gujarat"
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-[#17181C] border border-black/[0.08] dark:border-white/[0.08] rounded-md text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Tax ID / GSTIN
                  </label>
                  <input
                    type="text"
                    value={registerData.taxId}
                    onChange={(e) => setRegisterData({ ...registerData, taxId: e.target.value })}
                    placeholder="e.g. GSTIN24AAACS1122D1Z4"
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-[#17181C] border border-black/[0.08] dark:border-white/[0.08] rounded-md text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Website or catalogue URL
                  </label>
                  <input
                    type="url"
                    value={registerData.websiteUrl}
                    onChange={(e) => setRegisterData({ ...registerData, websiteUrl: e.target.value })}
                    placeholder="https://brand.com"
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-[#17181C] border border-black/[0.08] dark:border-white/[0.08] rounded-md text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-white"
                  />
                </div>

              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Warehouse / studio dispatch address
                </label>
                <textarea
                  rows="2"
                  value={registerData.warehouseAddress}
                  onChange={(e) => setRegisterData({ ...registerData, warehouseAddress: e.target.value })}
                  placeholder="Street address, textile market, postal pin code"
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-[#17181C] border border-black/[0.08] dark:border-white/[0.08] rounded-md text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-white"
                />
              </div>

              {/* Legal Copyright and Permission Checkbox */}
              <div className="p-3 bg-neutral-50 dark:bg-[#17181C] border border-black/[0.08] dark:border-white/[0.08] rounded-md space-y-2">
                <label className="flex items-start space-x-2.5 text-xs text-neutral-600 dark:text-neutral-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={registerData.agreeTerms}
                    onChange={(e) => setRegisterData({ ...registerData, agreeTerms: e.target.checked })}
                    className="mt-0.5 rounded border-neutral-300 text-neutral-900 focus:ring-rose-500"
                  />
                  <span>
                    <strong className="text-neutral-900 dark:text-white">Commercial rights confirmation:</strong> I confirm our organization owns full commercial copyrights or manufacturer authorization for all submitted garment photography. Images must meet minimum 250×250 px resolution before Genlook AI virtual try-on processing.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={registerLoading}
                className="w-full min-h-[44px] py-2.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-950 font-medium text-xs rounded-md flex items-center justify-center space-x-2 transition-colors shadow-sm disabled:opacity-50"
              >
                {registerLoading ? (
                  <span>Submitting application...</span>
                ) : (
                  <>
                    <span>Submit supplier application</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}

