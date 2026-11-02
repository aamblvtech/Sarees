import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Sparkles, ShieldCheck, Check, ArrowLeft, Layers, Heart, Share2, Info, ChevronRight, PackageCheck } from 'lucide-react';
import { SareeProduct } from '../types';
import { api } from '../services/api';
import { CameraCaptureModal } from '../components/CameraCaptureModal';

interface ProductDetailsProps {
  products: SareeProduct[];
}

export const ProductDetails: React.FC<ProductDetailsProps> = ({ products }) => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<SareeProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState<string>('');
  const [showTryOn, setShowTryOn] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'components' | 'care'>('details');

  useEffect(() => {
    async function loadProduct() {
      setLoading(true);
      try {
        if (id) {
          const data = await api.getProductById(id);
          setProduct(data);
          setActiveImage(data.primaryImage);
        }
      } catch (e) {
        // Fallback from props
        const fallback = products.find(p => p.id === id);
        if (fallback) {
          setProduct(fallback);
          setActiveImage(fallback.primaryImage);
        }
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [id, products]);

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-10 h-10 border-4 border-[#681D32] border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs text-[#292522]/70">Retrieving master weave metadata from PostgreSQL...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold text-[#681D32]">Saree Not Found</h2>
        <p className="text-xs text-[#292522]/70">The requested masterpiece may have been archived or reserved.</p>
        <Link to="/catalog" className="inline-flex items-center gap-1.5 text-xs text-[#681D32] font-bold">
          <ArrowLeft className="w-4 h-4" /> Return to Catalog
        </Link>
      </div>
    );
  }

  const formattedPrice = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(product.price);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-[#292522]/60">
        <Link to="/catalog" className="hover:text-[#681D32] flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Catalog
        </Link>
        <span>/</span>
        <span className="text-[#B99A5B] font-medium">{product.fabric}</span>
        <span>/</span>
        <span className="text-[#292522] font-semibold">{product.name}</span>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        
        {/* Left Column: Image Gallery */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-[#292522] border-2 border-[#B99A5B]/40 shadow-xl group">
            <img
              src={activeImage}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />

            <div className="absolute top-4 left-4 bg-[#681D32]/90 backdrop-blur-md text-white text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded shadow">
              {product.fabric}
            </div>

            <div className="absolute bottom-4 right-4 bg-[#292522]/80 backdrop-blur-md text-[#FAF7F0] text-xs px-3 py-1.5 rounded-lg border border-[#B99A5B]/40 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>In Showroom Stock ({product.stockQuantity} pieces)</span>
            </div>
          </div>

          {/* Thumbnails */}
          <div className="flex gap-3 overflow-x-auto pb-2">
            {[product.primaryImage, ...(product.images || []).map(img => img.imageUrl)].map((imgUrl, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImage(imgUrl)}
                className={`relative w-20 h-24 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                  activeImage === imgUrl ? 'border-[#681D32] ring-2 ring-[#B99A5B]' : 'border-[#E8E2D5] opacity-70 hover:opacity-100'
                }`}
              >
                <img src={imgUrl} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Garment Specs & Draping CTAs */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-widest text-[#B99A5B] font-bold">
              SKU: {product.sku} • {product.occasion}
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#681D32]">
              {product.name}
            </h1>
            <div className="text-2xl font-serif font-bold text-[#292522] pt-1">
              {formattedPrice}
            </div>
          </div>

          <p className="text-xs sm:text-sm text-[#292522]/80 leading-relaxed">
            {product.description || 'Authentic pure silk master weave engineered with traditional interlocking techniques.'}
          </p>

          {/* Try-on Callout Box */}
          <div className="bg-[#FAF7F0] border-2 border-[#681D32] rounded-2xl p-5 shadow-sajee space-y-4">
            <div className="flex items-center gap-2 text-sm font-serif font-bold text-[#681D32]">
              <Sparkles className="w-4 h-4 text-[#B99A5B]" />
              <span>Experience On-Demand Virtual Draping</span>
            </div>
            <p className="text-xs text-[#292522]/75 leading-relaxed">
              Preview this saree with our studio virtual try-on engine before requesting an in-person physical salon fitting.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowTryOn(true)}
                className="w-full py-3.5 bg-[#681D32] hover:bg-[#852842] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-all group"
              >
                <Sparkles className="w-4 h-4 text-[#B99A5B] group-hover:scale-110 transition-transform" />
                <span>Launch Virtual Try-On</span>
              </button>
            </div>
          </div>

          {/* Technical Tab Breakdown */}
          <div className="border border-[#E8E2D5] rounded-xl overflow-hidden bg-[#FAF7F0]">
            <div className="flex border-b border-[#E8E2D5] bg-[#F2EDE2]/60 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('details')}
                className={`flex-1 py-2.5 text-center transition-colors ${
                  activeTab === 'details' ? 'border-b-2 border-[#681D32] text-[#681D32] bg-[#FAF7F0]' : 'text-[#292522]/70'
                }`}
              >
                Weave Attributes
              </button>
              <button
                onClick={() => setActiveTab('components')}
                className={`flex-1 py-2.5 text-center transition-colors ${
                  activeTab === 'components' ? 'border-b-2 border-[#681D32] text-[#681D32] bg-[#FAF7F0]' : 'text-[#292522]/70'
                }`}
              >
                Annotated Components
              </button>
              <button
                onClick={() => setActiveTab('care')}
                className={`flex-1 py-2.5 text-center transition-colors ${
                  activeTab === 'care' ? 'border-b-2 border-[#681D32] text-[#681D32] bg-[#FAF7F0]' : 'text-[#292522]/70'
                }`}
              >
                Care & Heirloom Tips
              </button>
            </div>

            <div className="p-4 text-xs space-y-2.5">
              {activeTab === 'details' && (
                <div className="space-y-2">
                  <div className="flex justify-between py-1 border-b border-[#E8E2D5]/60">
                    <span className="text-[#292522]/60">Fabric Composition:</span>
                    <span className="font-semibold text-[#292522]">{product.fabric}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E8E2D5]/60">
                    <span className="text-[#292522]/60">Border Type:</span>
                    <span className="font-semibold text-[#292522]">{product.borderType || 'Korvai Zari Border'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E8E2D5]/60">
                    <span className="text-[#292522]/60">Pallu Work:</span>
                    <span className="font-semibold text-[#292522]">{product.palluDetails || 'Ornamental Zari Motifs'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[#292522]/60">Blouse Piece:</span>
                    <span className="font-semibold text-[#292522]">
                      {product.blousePiece ? `Included (${product.blouseDetails || 'Unstitched running fabric'})` : 'Not Included'}
                    </span>
                  </div>
                </div>
              )}

              {activeTab === 'components' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-[#681D32] font-semibold">
                    <Layers className="w-4 h-4 text-[#B99A5B]" />
                    <span>PostgreSQL Component Labels</span>
                  </div>
                  <p className="text-[11px] text-[#292522]/70">
                    Saree components are registered for AI drape projection:
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                    <div className="p-2 bg-[#F2EDE2] rounded">
                      <strong>Body Field:</strong> Verified
                    </div>
                    <div className="p-2 bg-[#F2EDE2] rounded">
                      <strong>Pallu:</strong> High Zari Density
                    </div>
                    <div className="p-2 bg-[#F2EDE2] rounded">
                      <strong>Lower Border:</strong> Korvai Bound
                    </div>
                    <div className="p-2 bg-[#F2EDE2] rounded">
                      <strong>Upper Border:</strong> Symmetric Temple
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'care' && (
                <div className="space-y-1.5 text-[#292522]/80">
                  <p>• Dry clean only with specialized silk conservators.</p>
                  <p>• Store folded in muslin cloth; avoid direct hanger wire contact.</p>
                  <p>• Refold along fresh creases every 3 months to preserve real gold zari patina.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Virtual Try-On Modal */}
      {showTryOn && (
        <CameraCaptureModal
          product={product}
          isOpen={showTryOn}
          onClose={() => setShowTryOn(false)}
        />
      )}
    </div>
  );
};
