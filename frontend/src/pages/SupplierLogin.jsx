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
    <div className="min-h-[90vh] bg-stone-50 dark:bg-[#0B0F19] text-stone-900 dark:text-stone-100 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <Link to="/" className="inline-block">
            <span className="font-serif text-3xl tracking-[0.25em] text-stone-900 dark:text-white font-semibold">
              VESTRA
            </span>
          </Link>
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-400 text-xs tracking-wider uppercase font-medium rounded-full">
            <Building2 className="w-3.5 h-3.5" />
            <span>Supplier & Designer Partner Portal</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl text-stone-900 dark:text-white">
            {activeTab === 'login' ? 'Supplier Sign In' : 'Partner Application'}
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 max-w-md mx-auto">
            Direct catalogue integration, high-resolution garment feeds, and AI Virtual Fitting Room onboarding for certified fashion manufacturers.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/60 p-1.5 rounded-xl shadow-sm">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setLoginError(null);
            }}
            className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all ${
              activeTab === 'login'
                ? 'bg-stone-900 text-white dark:bg-amber-500 dark:text-stone-950 shadow-sm'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setRegisterError(null);
            }}
            className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all ${
              activeTab === 'register'
                ? 'bg-stone-900 text-white dark:bg-amber-500 dark:text-stone-950 shadow-sm'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            Apply as Supplier
          </button>
        </div>

        {/* ===================== TAB 1: LOGIN ===================== */}
        {activeTab === 'login' && (
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 sm:p-8 rounded-2xl shadow-sm space-y-6">

            {/* Error Message */}
            {loginError && (
              <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wider font-semibold text-stone-700 dark:text-stone-300">
                  Registered Supplier Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="partner@handloom.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-stone-50 dark:bg-stone-800/80 border border-stone-300 dark:border-stone-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wider font-semibold text-stone-700 dark:text-stone-300">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-stone-50 dark:bg-stone-800/80 border border-stone-300 dark:border-stone-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3 bg-stone-900 hover:bg-stone-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-stone-950 font-semibold text-xs uppercase tracking-widest rounded-lg flex items-center justify-center space-x-2 transition-all shadow-md disabled:opacity-50"
              >
                {loginLoading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Enter Supplier Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="text-center pt-2 text-xs text-stone-500">
              New fashion manufacturer or boutique designer?{' '}
              <button
                type="button"
                onClick={() => setActiveTab('register')}
                className="text-amber-600 dark:text-amber-400 font-semibold underline underline-offset-4"
              >
                Apply for partnership here
              </button>
            </div>
          </div>
        )}

        {/* ===================== TAB 2: REGISTER ===================== */}
        {activeTab === 'register' && (
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 sm:p-8 rounded-2xl shadow-sm space-y-6">
            
            {registerSuccess && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 space-y-2">
                <div className="flex items-center space-x-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Application Submitted</span>
                </div>
                <p className="leading-relaxed">{registerSuccess}</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className="mt-2 text-xs font-semibold underline underline-offset-4"
                >
                  Go to Sign In
                </button>
              </div>
            )}

            {registerError && (
              <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <span>{registerError}</span>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider font-semibold text-stone-700 dark:text-stone-300">
                    Company / Entity Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={registerData.companyName}
                    onChange={(e) => setRegisterData({ ...registerData, companyName: e.target.value })}
                    placeholder="e.g. Surat Heritage Weaves Pvt Ltd"
                    className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800/80 border border-stone-300 dark:border-stone-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider font-semibold text-stone-700 dark:text-stone-300">
                    Brand Name
                  </label>
                  <input
                    type="text"
                    value={registerData.brandName}
                    onChange={(e) => setRegisterData({ ...registerData, brandName: e.target.value })}
                    placeholder="e.g. Surat Silks"
                    className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800/80 border border-stone-300 dark:border-stone-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider font-semibold text-stone-700 dark:text-stone-300">
                    Primary Contact Person *
                  </label>
                  <input
                    type="text"
                    required
                    value={registerData.contactPerson}
                    onChange={(e) => setRegisterData({ ...registerData, contactPerson: e.target.value })}
                    placeholder="e.g. Rajesh K. Mehta"
                    className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800/80 border border-stone-300 dark:border-stone-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider font-semibold text-stone-700 dark:text-stone-300">
                    Supplier Category *
                  </label>
                  <select
                    value={registerData.supplierType}
                    onChange={(e) => setRegisterData({ ...registerData, supplierType: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800/80 border border-stone-300 dark:border-stone-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  >
                    <option value="manufacturer">Clothing Manufacturer</option>
                    <option value="wholesaler">Fashion Wholesaler</option>
                    <option value="boutique">Independent Boutique</option>
                    <option value="artisan_cooperative">Artisan Cooperative</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider font-semibold text-stone-700 dark:text-stone-300">
                    Official Work Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={registerData.email}
                    onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                    placeholder="partner@company.com"
                    className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800/80 border border-stone-300 dark:border-stone-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider font-semibold text-stone-700 dark:text-stone-300">
                    Account Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    placeholder="Min. 8 characters"
                    className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800/80 border border-stone-300 dark:border-stone-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider font-semibold text-stone-700 dark:text-stone-300">
                    Phone / WhatsApp *
                  </label>
                  <input
                    type="text"
                    required
                    value={registerData.phone}
                    onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                    placeholder="+91 98250 11223"
                    className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800/80 border border-stone-300 dark:border-stone-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider font-semibold text-stone-700 dark:text-stone-300">
                    City & State *
                  </label>
                  <input
                    type="text"
                    required
                    value={registerData.city}
                    onChange={(e) => setRegisterData({ ...registerData, city: e.target.value })}
                    placeholder="e.g. Surat, Gujarat"
                    className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800/80 border border-stone-300 dark:border-stone-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider font-semibold text-stone-700 dark:text-stone-300">
                    Tax ID / GSTIN
                  </label>
                  <input
                    type="text"
                    value={registerData.taxId}
                    onChange={(e) => setRegisterData({ ...registerData, taxId: e.target.value })}
                    placeholder="e.g. GSTIN24AAACS1122D1Z4"
                    className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800/80 border border-stone-300 dark:border-stone-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider font-semibold text-stone-700 dark:text-stone-300">
                    Website or Catalogue URL
                  </label>
                  <input
                    type="url"
                    value={registerData.websiteUrl}
                    onChange={(e) => setRegisterData({ ...registerData, websiteUrl: e.target.value })}
                    placeholder="https://brand.com"
                    className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800/80 border border-stone-300 dark:border-stone-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wider font-semibold text-stone-700 dark:text-stone-300">
                  Warehouse / Studio Dispatch Address
                </label>
                <textarea
                  rows="2"
                  value={registerData.warehouseAddress}
                  onChange={(e) => setRegisterData({ ...registerData, warehouseAddress: e.target.value })}
                  placeholder="Street address, textile market, postal pin code"
                  className="w-full px-3.5 py-2 bg-stone-50 dark:bg-stone-800/80 border border-stone-300 dark:border-stone-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              {/* Legal Copyright and Permission Checkbox */}
              <div className="p-3.5 bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700/60 rounded-xl space-y-2">
                <label className="flex items-start space-x-2.5 text-xs text-stone-600 dark:text-stone-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={registerData.agreeTerms}
                    onChange={(e) => setRegisterData({ ...registerData, agreeTerms: e.target.checked })}
                    className="mt-0.5 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span>
                    <strong className="text-stone-900 dark:text-white">Commercial Rights Confirmation:</strong> I confirm our organization owns full commercial copyrights or manufacturer authorization for all submitted garment photography. Images must meet minimum 250×250 px resolution before Genlook AI virtual try-on processing.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={registerLoading}
                className="w-full py-3 bg-stone-900 hover:bg-stone-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-stone-950 font-semibold text-xs uppercase tracking-widest rounded-lg flex items-center justify-center space-x-2 transition-all shadow-md disabled:opacity-50"
              >
                {registerLoading ? (
                  <span>Submitting Application...</span>
                ) : (
                  <>
                    <span>Submit Supplier Application</span>
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

