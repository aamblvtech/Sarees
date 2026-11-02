import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Shield, Cpu, ArrowUpRight } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#FCF8F8] dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 pt-16 pb-12 border-t border-[#F9DFDF] dark:border-[#1E293B] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 pb-14 border-b border-[#F9DFDF] dark:border-[#1E293B]">
          
          {/* Brand Column */}
          <div className="md:col-span-1 space-y-4">
            <span className="font-serif text-3xl tracking-[0.24em] text-[#000000] dark:text-[#FFFFFF] font-semibold block">
              VESTRA
            </span>
            <p className="text-xs tracking-[0.18em] text-[#F5AFAF] uppercase font-semibold">
              Virtual Fitting Studio
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
              Precision virtual fitting room synthesizing luxury garments onto customer silhouettes with zero latency and true-to-life draping.
            </p>
          </div>

          {/* Navigation */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-widest text-[#000000] dark:text-[#FFFFFF] font-semibold">
              Clothing Archive
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-500 dark:text-slate-400">
              <li>
                <Link to="/catalogue" className="hover:text-[#000000] dark:hover:text-white transition-colors">
                  All Garments
                </Link>
              </li>
              <li>
                <Link to="/catalogue?category=womens-clothing" className="hover:text-[#000000] dark:hover:text-white transition-colors">
                  Women's Couture
                </Link>
              </li>
              <li>
                <Link to="/catalogue?category=mens-clothing" className="hover:text-[#000000] dark:hover:text-white transition-colors">
                  Men's Tailoring
                </Link>
              </li>
              <li>
                <Link to="/catalogue?category=sarees" className="hover:text-[#000000] dark:hover:text-white transition-colors">
                  Heirloom Sarees
                </Link>
              </li>
              <li>
                <Link to="/catalogue?category=accessories" className="hover:text-[#000000] dark:hover:text-white transition-colors">
                  Atelier Accessories
                </Link>
              </li>
            </ul>
          </div>

          {/* Virtual Fitting Studio */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-widest text-[#000000] dark:text-[#FFFFFF] font-semibold">
              AI Try-On Platform
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-500 dark:text-slate-400">
              <li>
                <Link to="/try-on" className="hover:text-[#000000] dark:hover:text-white transition-colors inline-flex items-center space-x-1">
                  <span>Virtual Fitting Room</span>
                  <Sparkles className="w-3 h-3 text-[#F5AFAF]" />
                </Link>
              </li>
              <li>
                <Link to="/#how-it-works" className="hover:text-[#000000] dark:hover:text-white transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <span className="inline-flex items-center space-x-1.5 text-slate-500 dark:text-slate-400">
                  <Cpu className="w-3 h-3 text-[#F5AFAF]" />
                  <span>Genlook Cloud AI Engine</span>
                </span>
              </li>
              <li className="pt-1">
                <Link to="/admin/dashboard" className="text-[#000000] dark:text-white hover:text-slate-700 dark:hover:text-slate-300 font-medium inline-flex items-center space-x-1">
                  <span>Admin Console</span>
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Technology & Privacy */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-widest text-[#000000] dark:text-[#FFFFFF] font-semibold">
              Privacy & Security
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Customer photographs remain strictly confidential. Temporary sessions can be deleted with one click.
            </p>
            <div className="pt-2 flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
              <Shield className="w-4 h-4 text-[#F5AFAF]" />
              <span>Isolated Private Cloud &bull; GDPR Compliant</span>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 dark:text-slate-500 gap-4">
          <p>&copy; {new Date().getFullYear()} VESTRA Atelier Inc. All rights reserved.</p>
          <div className="flex items-center space-x-6">
            <span>Rose Palette: #F5AFAF / #F9DFDF / #FBEFEF / #FCF8F8</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
