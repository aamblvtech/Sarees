import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();

  const navLinks = [
    { name: 'Catalogue', path: '/catalogue' },
    { name: 'Virtual Fitting Room', path: '/try-on' },
    { name: 'Mall Kiosk', path: '/kiosk' },
    { name: 'Supplier Portal', path: '/supplier/login' },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#121316]/95 backdrop-blur-md border-b border-black/[0.08] dark:border-white/[0.08] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Identity */}
          <Link to="/" className="flex items-baseline space-x-2.5 group">
            <span className="font-serif text-2xl tracking-[0.16em] text-neutral-900 dark:text-neutral-100 font-normal transition-opacity group-hover:opacity-80">
              VASTRA
            </span>
            <span className="text-[11px] font-sans tracking-wide text-neutral-500 dark:text-neutral-400 hidden sm:inline">
              Virtual Fitting Atelier
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
                  className={`text-[13px] transition-colors py-1 relative ${
                    active
                      ? 'text-neutral-900 dark:text-neutral-100 font-medium'
                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
                  }`}
                >
                  <span>{link.name}</span>
                  {active && (
                    <span className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-neutral-900 dark:bg-neutral-100" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Actions & Theme Toggle */}
          <div className="hidden md:flex items-center space-x-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-md text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-neutral-300" strokeWidth={1.5} />
              ) : (
                <Moon className="w-4 h-4 text-neutral-700" strokeWidth={1.5} />
              )}
            </button>

            <Link
              to="/try-on"
              className="h-9 px-4 rounded-md bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-100 dark:hover:bg-white dark:text-neutral-900 text-xs font-medium inline-flex items-center justify-center transition-colors"
            >
              Start Try-On
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 text-neutral-600 dark:text-neutral-400"
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="w-4 h-4" strokeWidth={1.5} />
              ) : (
                <Moon className="w-4 h-4" strokeWidth={1.5} />
              )}
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-neutral-700 dark:text-neutral-300"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" strokeWidth={1.5} /> : <Menu className="w-5 h-5" strokeWidth={1.5} />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#121316] px-4 pt-3 pb-6 space-y-3">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm text-neutral-800 dark:text-neutral-200 hover:text-neutral-900 dark:hover:text-white"
            >
              {link.name}
            </Link>
          ))}
          <div className="pt-2">
            <Link
              to="/try-on"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full h-10 rounded-md bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 text-xs font-medium flex items-center justify-center"
            >
              Start Try-On
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
