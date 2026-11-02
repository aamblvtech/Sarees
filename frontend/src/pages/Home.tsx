import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, QrCode, Monitor, ShieldCheck, ChevronRight, CheckCircle2, ArrowRight, Layers, Eye, RefreshCw, Star } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { CameraCaptureModal } from '../components/CameraCaptureModal';
import { SareeProduct } from '../types';

interface HomeProps {
  products: SareeProduct[];
}

export const Home: React.FC<HomeProps> = ({ products }) => {
  const [selectedProductForTryOn, setSelectedProductForTryOn] = useState<SareeProduct | null>(null);

  const featured = products.slice(0, 3);

  return (
    <div className="space-y-24">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#FAF7F0] via-[#F2EDE2]/60 to-[#FAF7F0] pt-12 pb-20 border-b border-[#E8E2D5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Copy */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#681D32]/10 border border-[#681D32]/20 text-[#681D32] text-xs font-semibold tracking-wider uppercase">
                <Sparkles className="w-3.5 h-3.5 text-[#B99A5B]" />
                <span>Next-Generation Indian Retail Technology</span>
              </div>

              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-[#681D32] leading-[1.12]">
                Your Perfect Saree, <br />
                <span className="italic font-normal text-[#292522]">Before You Drape It.</span>
              </h1>

              <p className="text-base sm:text-lg text-[#292522]/80 leading-relaxed max-w-xl font-normal">
                Discover the grandeur of heirloom Kanjeevarams, Banarasis, and Paithanis with zero friction. Experience intelligent virtual draping on full-scale salon touch kiosks and personal mobile sessions.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-4 pt-3">
                <Link
                  to="/catalog"
                  className="px-8 py-3.5 rounded-xl bg-[#681D32] hover:bg-[#852842] text-[#FAF7F0] font-semibold text-sm shadow-sajee hover:shadow-sajee-lg transition-all flex items-center gap-2 group"
                >
                  <Sparkles className="w-4 h-4 text-[#B99A5B] group-hover:scale-110 transition-transform" />
                  <span>Try Sarees Virtually</span>
                </Link>

                <Link
                  to="/catalog"
                  className="px-8 py-3.5 rounded-xl border border-[#B99A5B] bg-[#FAF7F0] hover:bg-[#B99A5B]/10 text-[#681D32] font-semibold text-sm transition-all flex items-center gap-2"
                >
                  <span>Explore Sarees</span>
                  <ArrowRight className="w-4 h-4 text-[#B99A5B]" />
                </Link>
              </div>

              {/* Guarantees */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-[#E8E2D5] max-w-lg">
                <div>
                  <div className="font-serif font-bold text-lg text-[#681D32]">100%</div>
                  <div className="text-[11px] text-[#292522]/70 font-medium">Delicate Silk Preservation</div>
                </div>
                <div>
                  <div className="font-serif font-bold text-lg text-[#681D32]">60 Sec</div>
                  <div className="text-[11px] text-[#292522]/70 font-medium">Virtual Draping Turnaround</div>
                </div>
                <div>
                  <div className="font-serif font-bold text-lg text-[#681D32]">Zero Trace</div>
                  <div className="text-[11px] text-[#292522]/70 font-medium">Biometric Auto-Purge</div>
                </div>
              </div>
            </div>

            {/* Right Editorial Visual */}
            <div className="lg:col-span-5 relative">
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border-2 border-[#B99A5B]/40 group">
                <img
                  src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=85"
                  alt="SAJEE Bridal Kanjeevaram Saree"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                />

                {/* Floating Studio Tag */}
                <div className="absolute top-4 right-4 bg-[#292522]/85 backdrop-blur-md text-[#FAF7F0] px-3 py-1.5 rounded-lg border border-[#B99A5B]/40 text-xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>4K Salon Kiosk Active</span>
                </div>

                {/* Bottom Card */}
                <div className="absolute bottom-4 inset-x-4 p-4 rounded-xl bg-[#FAF7F0]/95 backdrop-blur-md border border-[#B99A5B] shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-[#B99A5B] font-bold">Featured Masterpiece</div>
                      <div className="font-serif font-bold text-sm text-[#681D32]">Maharani Kanjeevaram Bridal Silk</div>
                      <div className="text-xs text-[#292522]/70 font-semibold">₹68,500 • 24k Gold Zari</div>
                    </div>
                    <button
                      onClick={() => setSelectedProductForTryOn(products[0] || null)}
                      className="px-3.5 py-2 bg-[#681D32] hover:bg-[#852842] text-[#FAF7F0] text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#B99A5B]" />
                      <span>Try Now</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. HOW IT WORKS WORKFLOW */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
          <div className="text-xs uppercase tracking-widest text-[#B99A5B] font-bold">Showroom Orchestration</div>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#681D32]">
            The Cloakroom-Inspired Retail Journey
          </h2>
          <p className="text-sm text-[#292522]/75">
            A seamless bridge between physical tactile inspection and AI-assisted visual preview in four elegant steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            {
              step: '01',
              title: 'Barcode Scanning',
              desc: 'Store staff scans delicate folded saree barcodes using mobile cameras or handheld scanner guns.',
              icon: QrCode,
            },
            {
              step: '02',
              title: 'Curate Selection',
              desc: 'Selected sarees are added directly to a dedicated customer collection in PostgreSQL.',
              icon: Layers,
            },
            {
              step: '03',
              title: 'Instant QR Session',
              desc: 'A secure, expiring QR code links the customer’s selection to the salon kiosk or mobile device.',
              icon: Sparkles,
            },
            {
              step: '04',
              title: 'Full-Scale Virtual Drape',
              desc: 'Customer steps before the 4K portrait display for an instantaneous, lifelike drape visualization.',
              icon: Monitor,
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="bg-[#FAF7F0] border border-[#E8E2D5] rounded-xl p-6 relative hover:border-[#B99A5B] transition-all duration-300 shadow-sm hover:shadow-sajee"
            >
              <div className="text-4xl font-serif font-bold text-[#B99A5B]/30 absolute top-4 right-4">
                {item.step}
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#681D32] text-[#B99A5B] flex items-center justify-center mb-5 shadow">
                <item.icon className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-lg text-[#681D32] mb-2">{item.title}</h3>
              <p className="text-xs text-[#292522]/75 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. SAREE ANATOMY COMPONENT BREAKDOWN */}
      <section className="bg-[#292522] text-[#FAF7F0] py-20 border-y-2 border-[#B99A5B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-5 space-y-4">
              <div className="text-xs uppercase tracking-widest text-[#B99A5B] font-bold">Artisanal Engineering</div>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white">
                Deconstructing Heritage Weaves
              </h2>
              <p className="text-xs text-[#FAF7F0]/80 leading-relaxed">
                Standard virtual try-on software treats a saree like a western dress. At SAJEE, our specialized registration models label each distinct structural component of unstitched 9-meter weaves:
              </p>

              <div className="space-y-3 pt-2">
                {[
                  { title: 'The Body Field', desc: 'The continuous silk warp & weft housing repeating butta motifs.' },
                  { title: 'The Grand Pallu', desc: 'The ornamental shoulder fall boasting dense 24k gold zari iconography.' },
                  { title: 'Korvai Interlocked Borders', desc: 'Contrasting selvages woven with structural temple interlocking.' },
                  { title: 'Blouse Piece Component', desc: 'Contrasting running unstitched fabric aligned to sleeve hems.' },
                ].map((comp, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[#3F3B37]/50 border border-[#FAF7F0]/10">
                    <CheckCircle2 className="w-4 h-4 text-[#B99A5B] shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-[#FAF7F0]">{comp.title}</div>
                      <div className="text-[11px] text-[#FAF7F0]/65">{comp.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <Link
                  to="/saree-register"
                  className="inline-flex items-center gap-2 text-xs font-bold text-[#B99A5B] hover:text-[#FAF7F0] transition-colors"
                >
                  <span>Explore Staff Component Annotator</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border-2 border-[#B99A5B]/40 shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1200&q=85"
                  alt="Saree Pallu and Border Detail"
                  className="w-full h-full object-cover"
                />
                
                {/* Visual Annotation Callouts */}
                <div className="absolute top-1/4 left-1/4 bg-[#681D32]/90 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded border border-[#B99A5B] shadow-lg animate-bounce">
                  Grand Pallu Zari (Annotated)
                </div>
                <div className="absolute bottom-6 right-8 bg-[#292522]/90 backdrop-blur-md text-[#B99A5B] text-[10px] font-bold px-2.5 py-1 rounded border border-[#B99A5B] shadow-lg">
                  Korvai Temple Border (Annotated)
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4. FEATURED CATALOG COLLECTIONS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <div className="text-xs uppercase tracking-widest text-[#B99A5B] font-bold">Heirloom Curation</div>
            <h2 className="font-serif text-3xl font-bold text-[#681D32]">
              Signature Masterpiece Sarees
            </h2>
          </div>
          <Link
            to="/catalog"
            className="text-xs font-semibold text-[#681D32] hover:text-[#852842] flex items-center gap-1"
          >
            <span>View Full Salon Catalog (6 Sarees)</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {featured.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onTryOn={(p) => setSelectedProductForTryOn(p)}
            />
          ))}
        </div>
      </section>

      {/* 5. PHYSICAL SHOWROOM KIOSK INTRODUCTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 bg-[#FAF7F0] border border-[#B99A5B] rounded-3xl p-8 sm:p-12 shadow-sajee">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#681D32] bg-[#681D32]/10 px-3 py-1 rounded-full">
              <Monitor className="w-4 h-4 text-[#B99A5B]" />
              <span>Showroom Hardware Architecture</span>
            </div>

            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#681D32]">
              The 55" SAJEE Atelier Touch Kiosk
            </h2>

            <p className="text-xs sm:text-sm text-[#292522]/80 leading-relaxed">
              Designed for luxury Indian retail showrooms. A freestanding vertical monolith encased in warm ivory and deep maroon brushed casing, crowned with an ultra-wide portrait camera and warm studio color-rendering illumination.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-3 bg-[#F2EDE2] rounded-xl border border-[#E8E2D5]">
                <div className="font-bold text-xs text-[#681D32]">12 Touch Screens</div>
                <div className="text-[11px] text-[#292522]/70">From QR sync to dual-saree comparison and associate dispatch.</div>
              </div>
              <div className="p-3 bg-[#F2EDE2] rounded-xl border border-[#E8E2D5]">
                <div className="font-bold text-xs text-[#681D32]">Offline Graceful Fallback</div>
                <div className="text-[11px] text-[#292522]/70">Zero showroom downtime; transparent simulation when GPU is offline.</div>
              </div>
            </div>

            <div className="pt-2">
              <Link
                to="/kiosk"
                className="px-6 py-3 bg-[#681D32] hover:bg-[#852842] text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow"
              >
                <Monitor className="w-4 h-4 text-[#B99A5B]" />
                <span>Launch Interactive Kiosk Mode</span>
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center">
            {/* Visual Mini Mock of Kiosk Chassis */}
            <div className="w-56 h-96 rounded-2xl bg-[#681D32] p-3 shadow-2xl border-4 border-[#B99A5B] flex flex-col justify-between items-center text-center">
              <div className="w-4 h-4 rounded-full bg-black border border-[#B99A5B] flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              </div>
              <div className="w-full flex-1 bg-[#FAF7F0] rounded-xl my-2 p-3 flex flex-col justify-between items-center shadow-inner">
                <div className="text-[9px] font-serif font-bold text-[#681D32]">SAJEE SALON KIOSK</div>
                <div className="w-16 h-16 rounded-full bg-[#681D32]/10 border border-[#B99A5B] flex items-center justify-center">
                  <QrCode className="w-8 h-8 text-[#681D32]" />
                </div>
                <div className="text-[8px] text-[#292522]/70">Touch Screen or Scan Session QR</div>
              </div>
              <div className="text-[9px] tracking-widest text-[#B99A5B] font-bold">SAJEE ALPHA-01</div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. TRANSPARENT TESTIMONIALS (Transparently labeled as demo content) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto space-y-2 mb-12">
          <div className="text-xs uppercase tracking-widest text-[#B99A5B] font-bold">Retailer Feedback</div>
          <h2 className="font-serif text-3xl font-bold text-[#681D32]">
            What Showroom Directors Experience
          </h2>
          <div className="text-[11px] text-[#292522]/60 italic">
            *Demo evaluation testimonials from our flagship showroom pilot program
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              quote: '“Our delicate real zari bridal Kanjeevarams were suffering wear and tear from 20+ drapings a day. SAJEE enabled brides to narrow down their selection to 2 sarees on screen before physical draping.”',
              author: 'Priya Somani',
              role: 'Director of Retail, Lavelle Road',
            },
            {
              quote: '“The barcode workflow is effortless. In 15 seconds, our senior drapers scan 4 sarees, hand the customer a QR card, and the kiosk brings their curated suite to life.”',
              author: 'Rajesh K. Mehta',
              role: 'Showroom Master Draper',
            },
            {
              quote: '“Customers appreciate the absolute privacy. The guarantee that photos are wiped cleanly when they tap ‘End Session’ builds tremendous luxury brand trust.”',
              author: 'Deepika Rao',
              role: 'Client Experience Lead',
            },
          ].map((item, idx) => (
            <div key={idx} className="bg-[#FAF7F0] border border-[#E8E2D5] rounded-xl p-6 shadow-sm flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex gap-1 text-[#B99A5B]">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-[#B99A5B]" />
                  ))}
                </div>
                <p className="text-xs text-[#292522]/85 italic leading-relaxed font-serif">
                  {item.quote}
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-[#E8E2D5]">
                <div className="font-bold text-xs text-[#681D32]">{item.author}</div>
                <div className="text-[10px] text-[#292522]/65">{item.role}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Virtual Try-On Modal */}
      {selectedProductForTryOn && (
        <CameraCaptureModal
          product={selectedProductForTryOn}
          isOpen={Boolean(selectedProductForTryOn)}
          onClose={() => setSelectedProductForTryOn(null)}
        />
      )}
    </div>
  );
};
