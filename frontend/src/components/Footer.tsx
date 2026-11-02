import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Sparkles, MapPin, Phone, Mail, Award, Info } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#292522] text-[#FAF7F0] border-t-2 border-[#B99A5B] mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand Vision */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-serif font-bold text-[#FAF7F0] tracking-wider">SAJEE</span>
              <span className="h-4 w-px bg-[#B99A5B]"></span>
              <span className="text-[10px] tracking-widest uppercase font-semibold text-[#B99A5B]">Atelier</span>
            </div>
            <p className="text-xs text-[#FAF7F0]/70 italic font-serif">
              “Drape Your Elegance.”
            </p>
            <p className="text-xs text-[#FAF7F0]/75 leading-relaxed">
              Pioneering high-fidelity virtual saree draping for heritage Indian silks. Empowering discerning brides and connoisseurs to preview master weaves without repeated physical handling of delicate heirloom garments.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs text-[#B99A5B]">
              <ShieldCheck className="w-4 h-4" />
              <span>Biometric Privacy Guaranteed</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold tracking-wider uppercase text-[#B99A5B]">Showroom Experiences</h4>
            <ul className="space-y-2 text-xs text-[#FAF7F0]/80">
              <li><Link to="/catalog" className="hover:text-[#B99A5B] transition-colors">Curated Saree Catalog</Link></li>
              <li><Link to="/staff" className="hover:text-[#B99A5B] transition-colors">Staff Barcode Scanner</Link></li>
              <li><Link to="/kiosk" className="hover:text-[#B99A5B] transition-colors">Retail 4K Touch Kiosk</Link></li>
              <li><Link to="/saree-register" className="hover:text-[#B99A5B] transition-colors">Component Annotation Suite</Link></li>
              <li><Link to="/admin" className="hover:text-[#B99A5B] transition-colors">Showroom Velocity Analytics</Link></li>
            </ul>
          </div>

          {/* Flagship Boutiques */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold tracking-wider uppercase text-[#B99A5B]">Flagship Salons</h4>
            <div className="space-y-2 text-xs text-[#FAF7F0]/80">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#B99A5B] shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Bangalore Flagship Maison</div>
                  <div className="text-[11px] text-[#FAF7F0]/60">42 Lavelle Road, Indiranagar</div>
                </div>
              </div>
              <div className="flex items-start gap-2 pt-2">
                <MapPin className="w-4 h-4 text-[#B99A5B] shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Hyderabad Heritage Lounge</div>
                  <div className="text-[11px] text-[#FAF7F0]/60">Road No. 36, Jubilee Hills</div>
                </div>
              </div>
            </div>
          </div>

          {/* Transparency & AI Ethics Notice */}
          <div className="space-y-3 bg-[#3F3B37]/50 p-4 rounded-lg border border-[#B99A5B]/30">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#B99A5B]">
              <Info className="w-4 h-4" />
              <span>AI Technology Disclosure</span>
            </div>
            <p className="text-[11px] text-[#FAF7F0]/75 leading-relaxed">
              SAJEE employs a dual inference architecture: high-fidelity diffusion pipelines (IDM-VTON) where GPU clusters are configured, and explicitly watermarked visual simulations for development and rapid preview. We never fabricate artificial guarantees on unstitched fabric drape.
            </p>
            <div className="text-[10px] text-[#FAF7F0]/50 pt-2 border-t border-[#FAF7F0]/10">
              Customer photos are strictly encrypted, temporary, and purged upon session conclusion or upon request.
            </div>
          </div>
        </div>

        <div className="border-t border-[#FAF7F0]/10 mt-12 pt-6 flex flex-col sm:flex-row justify-between items-center text-xs text-[#FAF7F0]/60">
          <div>© 2026 SAJEE Luxury Garment Technologies Pvt. Ltd. All Rights Reserved.</div>
          <div className="flex space-x-6 mt-4 sm:mt-0">
            <Link to="/account" className="hover:text-white transition-colors">Privacy & Data Consent</Link>
            <span>•</span>
            <span className="text-[#B99A5B]">ISO 27001 Retail Standard</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
