import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, Camera, CheckCircle2, Shield, Cpu, Layers } from 'lucide-react';
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
        // Display top 4 featured garments for hero showcase
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
    <div className="min-h-screen bg-[#FCF8F8] dark:bg-[#0F172A] text-[#000000] dark:text-[#FFFFFF] transition-colors duration-200">
      
      {/* 1. HERO SECTION */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden border-b border-[#F9DFDF] dark:border-slate-800">
        
        {/* Background Editorial Image with subtle veil */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=2000&q=88"
            alt="VESTRA Luxury Editorial"
            className="w-full h-full object-cover object-top filter brightness-[0.96] dark:brightness-[0.4]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#FCF8F8] via-[#FCF8F8]/85 to-transparent dark:from-[#0F172A] dark:via-[#0F172A]/90 dark:to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#FCF8F8] dark:from-[#0F172A] via-transparent to-transparent" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 w-full">
          <div className="max-w-2xl space-y-8">
            
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 bg-[#FBEFEF] dark:bg-[#1E293B] border border-[#F9DFDF] dark:border-slate-800 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#F5AFAF] pulse-camera" />
              <span className="text-[10px] tracking-[0.2em] uppercase font-mono font-medium text-slate-800 dark:text-slate-300">
                AI Virtual Try-On Studio &bull; Precision Draping
              </span>
            </div>

            <div className="space-y-4">
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-normal leading-[1.06] tracking-tight text-[#000000] dark:text-[#FFFFFF]">
                Try Before <br />
                <span className="italic font-normal">You Buy.</span>
              </h1>
              <p className="text-lg sm:text-xl font-light text-slate-700 dark:text-slate-300 tracking-wide leading-relaxed">
                Experience Fashion Before You Wear It. Neural garment synthesis calibrated directly to your personal silhouette portrait.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
              <Link
                to="/try-on"
                className="px-8 py-4 bg-[#000000] hover:bg-slate-900 text-[#FFFFFF] dark:bg-[#FFFFFF] dark:hover:bg-slate-100 dark:text-[#000000] text-xs uppercase tracking-[0.2em] font-semibold text-center transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center space-x-3 border border-black dark:border-white group"
              >
                <Sparkles className="w-4 h-4 text-[#F5AFAF] transition-transform group-hover:rotate-12" />
                <span>Enter Virtual Fitting Room</span>
              </Link>
              
              <Link
                to="/catalogue"
                className="px-8 py-4 bg-[#FBEFEF] dark:bg-[#1E293B] hover:bg-[#F9DFDF] dark:hover:bg-slate-800 border border-[#F9DFDF] dark:border-slate-700 text-[#000000] dark:text-[#FFFFFF] text-xs uppercase tracking-[0.2em] font-medium text-center transition-all duration-200 flex items-center justify-center space-x-2 group"
              >
                <span>Browse Clothing Archive</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            {/* Trust Metrics */}
            <div className="pt-6 grid grid-cols-3 gap-6 border-t border-[#F9DFDF] dark:border-slate-800 text-left">
              <div>
                <p className="font-mono text-2xl font-bold text-[#000000] dark:text-[#FFFFFF]">100%</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Zero Fabric Waste</p>
              </div>
              <div>
                <p className="font-mono text-2xl font-bold text-[#000000] dark:text-[#FFFFFF]">&lt; 3s</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Drape Synthesis</p>
              </div>
              <div>
                <p className="font-mono text-2xl font-bold text-[#000000] dark:text-[#FFFFFF]">Isolated</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Private Sessions</p>
              </div>
            </div>

          </div>
        </div>

      </section>


      {/* 2. CAPSULE CATEGORIES */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] font-mono text-[#F5AFAF] font-bold mb-2">
              Curated Capsules
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#000000] dark:text-[#FFFFFF]">
              Explore by Silhouette
            </h2>
          </div>
          <Link
            to="/catalogue"
            className="mt-4 md:mt-0 text-xs uppercase tracking-widest text-[#000000] dark:text-[#FFFFFF] hover:text-[#F5AFAF] font-semibold inline-flex items-center space-x-2 transition-colors"
          >
            <span>View Full Archive</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.slice(0, 3).map((category, idx) => (
            <Link
              key={category.id || idx}
              to={`/catalogue?category=${category.slug}`}
              className="group relative aspect-[4/5] overflow-hidden bg-[#FBEFEF] dark:bg-slate-800 border border-[#F9DFDF] dark:border-slate-800 block"
            >
              <img
                src={category.imageUrl}
                alt={category.name}
                className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white space-y-2">
                <span className="text-[10px] uppercase font-mono tracking-[0.2em] text-[#F5AFAF] font-semibold block">
                  Capsule 0{idx + 1}
                </span>
                <h3 className="font-serif text-2xl font-semibold tracking-wide">
                  {category.name}
                </h3>
                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                  {category.description}
                </p>
                <div className="pt-2 flex items-center space-x-1.5 text-xs text-white font-semibold uppercase tracking-wider group-hover:underline">
                  <span>Explore Capsule</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>


      {/* 3. FEATURED PRODUCTS SECTION */}
      <section className="py-20 bg-[#FBEFEF]/40 dark:bg-[#0F172A] border-y border-[#F9DFDF] dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-xl mx-auto mb-16 space-y-3">
            <span className="text-xs uppercase tracking-[0.25em] font-mono text-[#F5AFAF] font-bold">
              Signature Editions
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#000000] dark:text-[#FFFFFF]">
              Featured Garments Ready for Fitting
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Select any garment below to immediately launch the virtual fitting room.
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
              {[1, 2, 3, 4].map(n => (
                <div key={n} className="aspect-[3/4] bg-[#FBEFEF] dark:bg-slate-800" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          <div className="text-center mt-12">
            <Link
              to="/catalogue"
              className="inline-flex items-center space-x-2 px-8 py-3.5 border border-[#000000] dark:border-[#FFFFFF] text-xs uppercase tracking-[0.2em] font-semibold text-[#000000] dark:text-[#FFFFFF] hover:bg-[#000000] hover:text-[#FFFFFF] dark:hover:bg-[#FFFFFF] dark:hover:text-[#000000] transition-colors"
            >
              <span>Explore Complete Collection</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </section>


      {/* 4. HOW IT WORKS (Minimal Numbered Steps) */}
      <section id="how-it-works" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <span className="text-xs uppercase tracking-[0.25em] font-mono text-[#F5AFAF] font-bold">
            How It Works
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-[#000000] dark:text-[#FFFFFF]">
            Neural Fitting in Four Steps
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            VESTRA integrates computer vision pose landmark detection with volumetric cloth draping for accurate size and fit preview.
          </p>
        </div>

        {/* 4-Step Grid with Minimal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          <div className="p-6 bg-[#FBEFEF] dark:bg-[#1E293B] border border-[#F9DFDF] dark:border-slate-800 space-y-4 relative">
            <span className="font-mono text-3xl font-bold text-[#F5AFAF] dark:text-slate-700 block">01</span>
            <div className="w-10 h-10 bg-white dark:bg-slate-800 border border-[#F9DFDF] dark:border-slate-700 flex items-center justify-center text-[#000000] dark:text-[#FFFFFF]">
              <Camera className="w-5 h-5 text-[#F5AFAF]" />
            </div>
            <h3 className="font-serif text-xl font-semibold text-[#000000] dark:text-[#FFFFFF]">
              Upload Portrait
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Upload a full-length photograph, capture a live webcam portrait, or scan a QR code to transfer directly from mobile.
            </p>
          </div>

          <div className="p-6 bg-[#FBEFEF] dark:bg-[#1E293B] border border-[#F9DFDF] dark:border-slate-800 space-y-4 relative">
            <span className="font-mono text-3xl font-bold text-[#F5AFAF] dark:text-slate-700 block">02</span>
            <div className="w-10 h-10 bg-white dark:bg-slate-800 border border-[#F9DFDF] dark:border-slate-700 flex items-center justify-center text-[#000000] dark:text-[#FFFFFF]">
              <Layers className="w-5 h-5 text-[#F5AFAF]" />
            </div>
            <h3 className="font-serif text-xl font-semibold text-[#000000] dark:text-[#FFFFFF]">
              Select Garment
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Choose from our catalogue across Men's, Women's, Sarees, or upload a custom bespoke garment image.
            </p>
          </div>

          <div className="p-6 bg-[#FBEFEF] dark:bg-[#1E293B] border border-[#F9DFDF] dark:border-slate-800 space-y-4 relative">
            <span className="font-mono text-3xl font-bold text-[#F5AFAF] dark:text-slate-700 block">03</span>
            <div className="w-10 h-10 bg-white dark:bg-slate-800 border border-[#F9DFDF] dark:border-slate-700 flex items-center justify-center text-[#000000] dark:text-[#FFFFFF]">
              <Cpu className="w-5 h-5 text-[#F5AFAF]" />
            </div>
            <h3 className="font-serif text-xl font-semibold text-[#000000] dark:text-[#FFFFFF]">
              Cloud AI Synthesis
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Genlook cloud engine maps torso landmarks, resolves seam tension, and generates a realistic composite image.
            </p>
          </div>

          <div className="p-6 bg-[#FBEFEF] dark:bg-[#1E293B] border border-[#F9DFDF] dark:border-slate-800 space-y-4 relative">
            <span className="font-mono text-3xl font-bold text-[#F5AFAF] dark:text-slate-700 block">04</span>
            <div className="w-10 h-10 bg-white dark:bg-slate-800 border border-[#F9DFDF] dark:border-slate-700 flex items-center justify-center text-[#000000] dark:text-[#FFFFFF]">
              <CheckCircle2 className="w-5 h-5 text-[#F5AFAF]" />
            </div>
            <h3 className="font-serif text-xl font-semibold text-[#000000] dark:text-[#FFFFFF]">
              Inspect & Save
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Compare the Before portrait with the AI-generated After result side-by-side and save your high-resolution fitting dossier.
            </p>
          </div>

        </div>

        {/* Studio Launch Banner */}
        <div className="mt-16 p-8 sm:p-12 bg-[#000000] dark:bg-[#1E293B] text-white flex flex-col md:flex-row items-center justify-between gap-8 border border-black dark:border-slate-800">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-[#F5AFAF]" />
              <span className="text-[10px] uppercase font-mono tracking-[0.2em] text-[#F5AFAF] font-bold">
                Live Studio Active
              </span>
            </div>
            <h3 className="font-serif text-2xl sm:text-3xl font-semibold">
              Ready to test your silhouette?
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Upload your photo once and preview any outfit in our catalogue with genuine AI generation.
            </p>
          </div>

          <Link
            to="/try-on"
            className="whitespace-nowrap px-8 py-4 bg-[#FFFFFF] text-[#000000] hover:bg-[#FBEFEF] text-xs uppercase tracking-[0.2em] font-semibold transition-all shadow-md flex items-center space-x-2 border border-[#F9DFDF]"
          >
            <Sparkles className="w-4 h-4 text-[#F5AFAF]" />
            <span>Open Fitting Studio</span>
          </Link>
        </div>

      </section>

    </div>
  );
}
