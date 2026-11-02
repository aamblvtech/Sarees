import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sparkles, Menu, X, Sun, Moon, Shield } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();

  const navLinks = [
    { name: 'Collection', path: '/catalogue' },
    { name: 'Virtual Fitting Room', path: '/try-on', badge: 'AI Studio' },
    { name: 'How It Works', path: '/#how-it-works' },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAFAFA]/95 dark:bg-[#0F172A]/95 backdrop-blur-md border-b border-[#E2E8F0] dark:border-slate-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Brand Identity */}
          <Link to="/" className="flex flex-col group">
            <span className="font-serif text-2xl sm:text-3xl tracking-[0.24em] text-[#000000] dark:text-[#FFFFFF] font-semibold transition-opacity group-hover:opacity-85">
              VESTRA
            </span>
            <span className="text-[9px] tracking-[0.2em] text-slate-500 dark:text-slate-400 uppercase font-medium">
              Virtual Fitting Studio
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => {
              const active = isActive(link.path);
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`text-xs tracking-[0.15em] uppercase transition-all py-1.5 relative ${
                    active
                      ? 'text-[#000000] dark:text-[#FFFFFF] font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-[#000000] dark:hover:text-[#FFFFFF]'
                  }`}
                >
                  <span>{link.name}</span>
                  {link.badge && (
                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 text-[8px] font-mono font-medium tracking-normal bg-[#000000] text-[#FFFFFF] dark:bg-[#FFFFFF] dark:text-[#000000] rounded">
                      {link.badge}
                    </span>
                  )}
                  {active && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#000000] dark:bg-[#FFFFFF]" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Actions & Theme Toggle */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-full border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-black dark:hover:border-white transition-all shadow-xs"
              title={isDark ? 'Switch to Light Mode (#FAFAFA)' : 'Switch to Dark Mode (#0F172A)'}
              aria-label="Toggle Theme"
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[10px] uppercase font-mono tracking-wider font-semibold">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-800" />
                  <span className="text-[10px] uppercase font-mono tracking-wider font-semibold">Dark</span>
                </>
              )}
            </button>

            <Link
              to="/admin/dashboard"
              className="text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:text-[#000000] dark:hover:text-[#FFFFFF] font-medium transition-colors px-2 py-1"
            >
              Admin Portal
            </Link>

            <Link
              to="/try-on"
              className="inline-flex items-center space-x-2 bg-[#000000] text-[#FFFFFF] hover:bg-slate-900 dark:bg-[#FFFFFF] dark:text-[#000000] dark:hover:bg-slate-100 px-5 py-2.5 text-xs uppercase tracking-widest font-semibold transition-all duration-200 border border-[#000000] dark:border-[#FFFFFF] shadow-xs group"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#6366F1] transition-transform group-hover:rotate-12" />
              <span>Try Virtual Fitting</span>
            </Link>
          </div>

          {/* Mobile Actions */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-full border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
              aria-label="Toggle Theme"
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[9px] uppercase font-mono font-semibold">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-800" />
                  <span className="text-[9px] uppercase font-mono font-semibold">Dark</span>
                </>
              )}
            </button>

            <Link
              to="/try-on"
              className="p-2 text-[#000000] dark:text-[#FFFFFF]"
              title="Virtual Fitting"
            >
              <Sparkles className="w-5 h-5 text-[#6366F1]" />
            </Link>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#000000] dark:text-[#FFFFFF] border border-[#E2E8F0] dark:border-slate-800 rounded"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E2E8F0] dark:border-slate-800 bg-[#FAFAFA] dark:bg-[#0F172A] px-4 pt-4 pb-6 space-y-3 animate-fadeIn">
          {navLinks.map((link) => {
            const active = isActive(link.path);
            return (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block text-xs uppercase tracking-widest py-2.5 px-3 rounded transition-colors ${
                  active
                    ? 'bg-[#000000] text-[#FFFFFF] dark:bg-[#FFFFFF] dark:text-[#000000] font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{link.name}</span>
                  {link.badge && (
                    <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-[#6366F1] text-white">
                      {link.badge}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}

          <div className="pt-3 border-t border-[#E2E8F0] dark:border-slate-800 flex flex-col space-y-2">
            <Link
              to="/admin/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="text-xs uppercase tracking-wider py-2 px-3 text-slate-600 dark:text-slate-400 font-medium"
            >
              Admin Portal
            </Link>

            <Link
              to="/try-on"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-3 bg-[#000000] text-[#FFFFFF] dark:bg-[#FFFFFF] dark:text-[#000000] text-xs uppercase tracking-widest font-semibold flex items-center justify-center space-x-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#6366F1]" />
              <span>Launch Virtual Fitting</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
