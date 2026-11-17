import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Camera, Layers, Cpu, Check } from 'lucide-react';
import productService from '../services/productService';
import ProductCard from '../components/ProductCard';

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [cats, prods] = await Promise.all([
          productService.getCategories(),
          productService.getProducts()
        ]);
        setCategories(cats || []);
        const featured = (prods || []).filter(p => p.isFeatured).slice(0, 4);
        setFeaturedProducts(featured.length > 0 ? featured : (prods || []).slice(0, 4));
      } catch (e) {
        console.error('Failed to load home data', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-[#121316] text-neutral-900 dark:text-neutral-100 transition-colors">
      
      {/* 1. HERO SECTION */}
      <section className="border-b border-black/[0.08] dark:border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Calm Typography & Clear Actions */}
            <div className="lg:col-span-7 space-y-6">
              
              <div className="inline-flex items-center space-x-2 text-[11px] text-neutral-500 dark:text-neutral-400 font-mono tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                <span>Virtual Fitting Atelier &bull; Precision Draping</span>
              </div>

              <div className="space-y-4 max-w-xl">
                <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-normal leading-[1.08] text-neutral-900 dark:text-neutral-100">
                  Experience Fashion Before You Wear It
                </h1>
                <p className="text-base sm:text-lg font-normal text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Calibrated virtual fitting for Indian heritage weaves, bespoke tailoring, and contemporary silhouettes. Preview genuine garment drape on your silhouette portrait.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <Link
                  to="/try-on"
                  className="h-11 px-6 rounded-md bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-100 dark:hover:bg-white dark:text-neutral-900 text-xs font-medium inline-flex items-center justify-center transition-colors shadow-xs"
                >
                  Start Virtual Try-On
                </Link>
                
                <Link
                  to="/catalogue"
                  className="h-11 px-6 rounded-md bg-white dark:bg-[#17181C] hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-black/[0.12] dark:border-white/[0.12] text-xs font-medium inline-flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <span>Browse Collection</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-60" strokeWidth={1.5} />
                </Link>
              </div>

              {/* Plain Trust Metrics */}
              <div className="pt-6 grid grid-cols-3 gap-6 border-t border-black/[0.06] dark:border-white/[0.06] max-w-lg">
                <div>
                  <p className="font-mono text-2xl font-medium text-neutral-900 dark:text-neutral-100">91+</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Archival garments</p>
                </div>
                <div>
                  <p className="font-mono text-2xl font-medium text-neutral-900 dark:text-neutral-100">&lt; 3s</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">AI synthesis time</p>
                </div>
                <div>
                  <p className="font-mono text-2xl font-medium text-neutral-900 dark:text-neutral-100">Zero</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Portrait retention</p>
                </div>
              </div>

            </div>

            {/* Right Column: High-Fashion Editorial Moment */}
            <div className="lg:col-span-5">
              <div className="relative aspect-[4/5] rounded-lg overflow-hidden border border-black/[0.08] dark:border-white/[0.08] bg-neutral-100 dark:bg-neutral-900 shadow-atelier-card">
                <img
                  src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=85"
                  alt="VASTRA Luxury Editorial"
                  className="w-full h-full object-cover object-top filter brightness-[0.98] dark:brightness-[0.9]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <p className="text-[11px] font-mono tracking-wider text-white/80 uppercase">Atelier Archive</p>
                  <p className="font-serif text-lg font-normal">Authentic Drape Simulation</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. CAPSULE CATEGORIES */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 pb-4 border-b border-black/[0.06] dark:border-white/[0.06] gap-4">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">
              Curated Capsules
            </p>
            <h2 className="font-serif text-2xl sm:text-3xl text-neutral-900 dark:text-neutral-100">
              Explore by Silhouette
            </h2>
          </div>
          <Link
            to="/catalogue"
            className="text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white inline-flex items-center space-x-1.5 transition-colors"
          >
            <span>View all garments</span>
            <ArrowRight className="w-3.5 h-3.5 opacity-60" strokeWidth={1.5} />
          </Link>
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.slice(0, 3).map((category, idx) => (
            <Link
              key={category.id || idx}
              to={`/catalogue?category=${category.slug}`}
              className="group relative aspect-[4/5] rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-900 border border-black/[0.08] dark:border-white/[0.08] block transition-all hover:border-black/20 dark:hover:border-white/20"
            >
              <img
                src={category.imageUrl}
                alt={category.name}
                className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white space-y-1.5">
                <span className="text-[10px] font-mono tracking-wider text-neutral-300 block">
                  Collection 0{idx + 1}
                </span>
                <h3 className="font-serif text-xl font-normal">
                  {category.name}
                </h3>
                <p className="text-xs text-neutral-200 line-clamp-2 leading-relaxed">
                  {category.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. FEATURED PRODUCTS SECTION */}
      <section className="py-20 bg-neutral-50 dark:bg-[#0D0E10] border-y border-black/[0.08] dark:border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 pb-4 border-b border-black/[0.06] dark:border-white/[0.06] gap-4">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">
                Featured Edits
              </p>
              <h2 className="font-serif text-2xl sm:text-3xl text-neutral-900 dark:text-neutral-100">
                Signature Garments
              </h2>
            </div>
            <Link
              to="/catalogue"
              className="text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white inline-flex items-center space-x-1.5 transition-colors"
            >
              <span>View full collection</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-60" strokeWidth={1.5} />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(n => (
                <div key={n} className="aspect-[3/4] bg-white dark:bg-neutral-800 rounded-lg border border-black/[0.08] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

        </div>
      </section>

      {/* 4. HOW IT WORKS */}
      <section id="how-it-works" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="max-w-2xl mb-16 space-y-2">
          <p className="text-xs font-mono uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Process
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl text-neutral-900 dark:text-neutral-100">
            Virtual Try-On in Four Steps
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Real-time pose estimation combined with cloth draping models to preview garment fit and proportions.
          </p>
        </div>

        {/* 4-Step Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="p-6 bg-white dark:bg-[#17181C] border border-black/[0.08] dark:border-white/[0.08] rounded-lg space-y-3">
            <span className="font-mono text-sm text-neutral-400 block">01</span>
            <div className="w-9 h-9 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-neutral-200">
              <Camera className="w-4 h-4" strokeWidth={1.5} />
            </div>
            <h3 className="font-serif text-lg text-neutral-900 dark:text-neutral-100">
              Capture Portrait
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Upload a photograph, capture via live camera with auto-pose detection, or scan a QR code from mobile.
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-[#17181C] border border-black/[0.08] dark:border-white/[0.08] rounded-lg space-y-3">
            <span className="font-mono text-sm text-neutral-400 block">02</span>
            <div className="w-9 h-9 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-neutral-200">
              <Layers className="w-4 h-4" strokeWidth={1.5} />
            </div>
            <h3 className="font-serif text-lg text-neutral-900 dark:text-neutral-100">
              Select Garment
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Choose from our curated archive across men's, women's, traditional sarees, or upload a custom outfit.
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-[#17181C] border border-black/[0.08] dark:border-white/[0.08] rounded-lg space-y-3">
            <span className="font-mono text-sm text-neutral-400 block">03</span>
            <div className="w-9 h-9 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-neutral-200">
              <Cpu className="w-4 h-4" strokeWidth={1.5} />
            </div>
            <h3 className="font-serif text-lg text-neutral-900 dark:text-neutral-100">
              Drape Synthesis
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              AI model aligns garment landmarks to customer posture, resolving seams, neckline, and pleat drape.
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-[#17181C] border border-black/[0.08] dark:border-white/[0.08] rounded-lg space-y-3">
            <span className="font-mono text-sm text-neutral-400 block">04</span>
            <div className="w-9 h-9 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-neutral-200">
              <Check className="w-4 h-4" strokeWidth={1.5} />
            </div>
            <h3 className="font-serif text-lg text-neutral-900 dark:text-neutral-100">
              Compare & Fit
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Review side-by-side Before and After views, inspect sizing recommendations, and save your fitting dossier.
            </p>
          </div>

        </div>

        {/* Clean Callout */}
        <div className="mt-12 p-8 rounded-lg bg-neutral-50 dark:bg-[#17181C] border border-black/[0.08] dark:border-white/[0.08] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <h3 className="font-serif text-xl text-neutral-900 dark:text-neutral-100">
              Ready to preview your fitting?
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Capture your portrait once to try on multiple outfits with zero credits required in mock preview mode.
            </p>
          </div>

          <Link
            to="/try-on"
            className="h-10 px-6 rounded-md bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-100 dark:hover:bg-white dark:text-neutral-900 text-xs font-medium inline-flex items-center justify-center transition-colors whitespace-nowrap"
          >
            Launch Fitting Studio
          </Link>
        </div>

      </section>

    </div>
  );
}
