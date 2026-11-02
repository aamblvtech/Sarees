import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, ShoppingBag, Shield, QrCode, Monitor, User as UserIcon, LogOut, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(api.getStoredUser());
  const [showRoleModal, setShowRoleModal] = useState(false);

  const handleFastSwitch = async (role: 'customer' | 'staff' | 'admin') => {
    try {
      const email = role === 'admin' ? 'admin@sajee.luxury' : role === 'staff' ? 'staff@sajee.luxury' : 'customer@sajee.luxury';
      const pass = role === 'admin' ? 'AdminPassword@2026' : role === 'staff' ? 'StaffPassword@2026' : 'CustomerPassword@2026';
      await api.login(email, pass);
      setUser(api.getStoredUser());
      setShowRoleModal(false);
      if (role === 'staff') navigate('/staff');
      else if (role === 'admin') navigate('/admin');
      else navigate('/catalog');
    } catch (e) {
      console.error('Fast switch failed', e);
    }
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    navigate('/');
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#FAF7F0]/90 backdrop-blur-md border-b border-[#E8E2D5] transition-all">
        {/* Subtle Luxury Top Bar */}
        <div className="bg-[#681D32] text-[#FAF7F0] text-xs py-1.5 px-4 text-center tracking-widest font-medium uppercase flex items-center justify-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#B99A5B]" />
          <span>SAJEE Atelier Virtual Draping — Experience Heritage Silks Before You Drape</span>
          <span className="hidden md:inline text-[#B99A5B]">•</span>
          <span className="hidden md:inline text-xs text-[#FAF7F0]/80">Flagship Salon: Bangalore & Hyderabad</span>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex flex-col items-start group">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-serif font-bold tracking-wider text-[#681D32] group-hover:text-[#852842] transition-colors">
                SAJEE
              </span>
              <span className="h-4 w-px bg-[#B99A5B]"></span>
              <span className="text-[10px] tracking-widest uppercase font-semibold text-[#B99A5B]">Atelier</span>
            </div>
            <span className="text-[10px] tracking-[0.25em] uppercase text-[#292522]/70 font-sans mt-0.5">
              Drape Your Elegance
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-[#292522]">
            <Link
              to="/catalog"
              className={`hover:text-[#681D32] transition-colors pb-1 border-b-2 ${
                location.pathname === '/catalog' ? 'border-[#681D32] text-[#681D32]' : 'border-transparent'
              }`}
            >
              Saree Catalog
            </Link>
            <Link
              to="/staff"
              className={`hover:text-[#681D32] transition-colors flex items-center gap-1.5 pb-1 border-b-2 ${
                location.pathname === '/staff' ? 'border-[#681D32] text-[#681D32]' : 'border-transparent'
              }`}
            >
              <QrCode className="w-4 h-4 text-[#B99A5B]" />
              Staff Suite & Scanning
            </Link>
            <Link
              to="/kiosk"
              className={`hover:text-[#681D32] transition-colors flex items-center gap-1.5 pb-1 border-b-2 ${
                location.pathname === '/kiosk' ? 'border-[#681D32] text-[#681D32]' : 'border-transparent'
              }`}
            >
              <Monitor className="w-4 h-4 text-[#681D32]" />
              Showroom Kiosk
            </Link>
            <Link
              to="/admin"
              className={`hover:text-[#681D32] transition-colors pb-1 border-b-2 ${
                location.pathname === '/admin' ? 'border-[#681D32] text-[#681D32]' : 'border-transparent'
              }`}
            >
              Analytics
            </Link>
          </nav>

          {/* Actions & Role Switcher */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowRoleModal(true)}
              className="text-xs font-semibold px-3 py-1.5 rounded-full border border-[#B99A5B] bg-[#FAF7F0] text-[#681D32] hover:bg-[#B99A5B]/10 transition-all flex items-center gap-1.5 shadow-sm"
              title="Fast switch between Customer, Staff, and Admin test personas"
            >
              <Shield className="w-3.5 h-3.5 text-[#B99A5B]" />
              <span className="capitalize">{user ? `${user.role}: ${user.fullName?.split(' ')[0] || user.email?.split('@')[0] || 'User'}` : 'Persona Demo'}</span>
            </button>

            {user ? (
              <div className="flex items-center space-x-2">
                <Link
                  to="/account"
                  className="p-2 text-[#292522] hover:text-[#681D32] rounded-full hover:bg-[#E8E2D5]/50 transition-colors"
                  title="Customer Privacy & Account"
                >
                  <UserIcon className="w-5 h-5" />
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 text-[#292522] hover:text-[#681D32] rounded-full hover:bg-[#E8E2D5]/50 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleFastSwitch('customer')}
                className="text-xs font-medium text-[#FAF7F0] bg-[#681D32] hover:bg-[#852842] px-4 py-2 rounded shadow transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Role Switcher Dialog */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[#FAF7F0] border border-[#B99A5B] rounded-xl max-w-md w-full p-6 shadow-2xl animate-in fade-in">
            <div className="flex justify-between items-center pb-3 border-b border-[#E8E2D5]">
              <h3 className="font-serif text-xl font-bold text-[#681D32]">Showroom Role Switcher</h3>
              <button onClick={() => setShowRoleModal(false)} className="text-[#292522]/60 hover:text-[#292522]">✕</button>
            </div>
            <p className="text-xs text-[#292522]/80 mt-2 mb-4">
              Select an authentic pre-seeded credential persona to test different aspects of the SAJEE virtual try-on workflow:
            </p>

            <div className="space-y-3">
              <button
                onClick={() => handleFastSwitch('customer')}
                className="w-full text-left p-3 rounded-lg border border-[#E8E2D5] hover:border-[#681D32] hover:bg-[#F2EDE2] transition-all flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-sm text-[#292522]">Meera Venkatesh</div>
                  <div className="text-xs text-[#292522]/70">Customer Persona • Browsing bridal collection & personal try-ons</div>
                </div>
                <span className="text-xs bg-[#E8E2D5] px-2 py-1 rounded text-[#292522]">Customer</span>
              </button>

              <button
                onClick={() => handleFastSwitch('staff')}
                className="w-full text-left p-3 rounded-lg border border-[#E8E2D5] hover:border-[#681D32] hover:bg-[#F2EDE2] transition-all flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-sm text-[#681D32]">Ananya Sharma (Senior Draper)</div>
                  <div className="text-xs text-[#292522]/70">Staff Persona • Barcode scanner, collections & QR kiosk dispatch</div>
                </div>
                <span className="text-xs bg-[#681D32] text-white px-2 py-1 rounded">Staff</span>
              </button>

              <button
                onClick={() => handleFastSwitch('admin')}
                className="w-full text-left p-3 rounded-lg border border-[#E8E2D5] hover:border-[#681D32] hover:bg-[#F2EDE2] transition-all flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-sm text-[#B99A5B]">Priya Somani (Director)</div>
                  <div className="text-xs text-[#292522]/70">Admin Persona • Analytics, kiosk fleet monitoring & audit logs</div>
                </div>
                <span className="text-xs bg-[#B99A5B] text-white px-2 py-1 rounded">Admin</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
