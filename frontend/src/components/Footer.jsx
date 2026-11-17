import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowUpRight } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-[#0D0E10] text-neutral-600 dark:text-neutral-400 pt-16 pb-12 border-t border-black/[0.08] dark:border-white/[0.08] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 pb-14 border-b border-black/[0.06] dark:border-white/[0.06]">
          
          {/* Brand Column */}
          <div className="md:col-span-1 space-y-3">
            <span className="font-serif text-2xl tracking-[0.16em] text-neutral-900 dark:text-neutral-100 font-normal block">
              VASTRA
            </span>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Virtual fashion fitting room synthesizing luxury garments onto customer silhouette portraits with true-to-life draping.
            </p>
          </div>

          {/* Navigation */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase font-medium tracking-wider text-neutral-900 dark:text-neutral-100">
              Collection
            </h4>
            <ul className="space-y-2 text-xs text-neutral-500 dark:text-neutral-400">
              <li>
                <Link to="/catalogue" className="hover:text-neutral-900 dark:hover:text-white transition-colors">
                  All Garments
                </Link>
              </li>
              <li>
                <Link to="/catalogue?category=womens-wear" className="hover:text-neutral-900 dark:hover:text-white transition-colors">
                  Women's Wear
                </Link>
              </li>
              <li>
                <Link to="/catalogue?category=mens-wear" className="hover:text-neutral-900 dark:hover:text-white transition-colors">
                  Men's Wear
                </Link>
              </li>
              <li>
                <Link to="/catalogue?category=traditional-wear" className="hover:text-neutral-900 dark:hover:text-white transition-colors">
                  Traditional Couture
                </Link>
              </li>
            </ul>
          </div>

          {/* Platform */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase font-medium tracking-wider text-neutral-900 dark:text-neutral-100">
              Studio
            </h4>
            <ul className="space-y-2 text-xs text-neutral-500 dark:text-neutral-400">
              <li>
                <Link to="/try-on" className="hover:text-neutral-900 dark:hover:text-white transition-colors">
                  Virtual Fitting Room
                </Link>
              </li>
              <li>
                <Link to="/kiosk" className="hover:text-neutral-900 dark:hover:text-white transition-colors">
                  Mall Kiosk Experience
                </Link>
              </li>
              <li>
                <Link to="/supplier/login" className="hover:text-neutral-900 dark:hover:text-white transition-colors">
                  Supplier Portal
                </Link>
              </li>
              <li>
                <Link to="/admin/login" className="hover:text-neutral-900 dark:hover:text-white transition-colors inline-flex items-center space-x-1">
                  <span>Atelier Console</span>
                  <ArrowUpRight className="w-3 h-3 opacity-60" strokeWidth={1.5} />
                </Link>
              </li>
            </ul>
          </div>

          {/* Privacy Notice */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase font-medium tracking-wider text-neutral-900 dark:text-neutral-100">
              Privacy Standard
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Customer portrait data is processed in private transient sessions with zero model retention. Session data purges automatically.
            </p>
            <div className="pt-1 flex items-center space-x-2 text-[11px] text-neutral-500 dark:text-neutral-400">
              <ShieldCheck className="w-3.5 h-3.5 text-neutral-400" strokeWidth={1.5} />
              <span>Isolated customer sessions</span>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 gap-4">
          <p>&copy; {new Date().getFullYear()} VASTRA Atelier. All rights reserved.</p>
          <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
            Experience Fashion Before You Wear It
          </p>
        </div>

      </div>
    </footer>
  );
}
