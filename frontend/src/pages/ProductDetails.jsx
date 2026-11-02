import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Sparkles, ArrowLeft, RefreshCw, Scissors, ShieldCheck, Check } from 'lucide-react';
import productService from '../services/productService';
import ProductStatusBadge, { ATELIER_FALLBACK_IMAGE } from '../components/ProductStatusBadge';

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedSize, setSelectedSize] = useState('M');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    async function fetchProduct() {
      setLoading(true);
      setError(null);
      try {
        const data = await productService.getProductById(id);
        if (data) {
          setProduct(data);
          setSelectedImage(data.primaryImage || data.images?.[0]);
          if (data.sizes && data.sizes.length > 0) {
            setSelectedSize(data.sizes[0]);
          }
        } else {
          setError('Product not found.');
        }
      } catch (err) {
        setError('Error loading product details.');
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [id]);

  const handleLaunchTryOn = () => {
    if (!product) return;
    navigate(`/try-on?productId=${product.id}&size=${selectedSize}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0F172A] flex items-center justify-center p-8 transition-colors">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#6366F1]" />
          <p className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">Retrieving Garment Dossier...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0F172A] flex items-center justify-center p-8 transition-colors">
        <div className="text-center space-y-4 max-w-md bg-white dark:bg-slate-900 p-8 border border-[#E2E8F0] dark:border-slate-800 shadow-sm">
          <h2 className="font-serif text-2xl text-slate-900 dark:text-white">Garment Unavailable</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{error || 'Unable to locate this garment in the archive.'}</p>
          <Link
            to="/catalogue"
            className="inline-block px-6 py-2.5 bg-[#000000] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#000000] text-xs uppercase tracking-widest font-semibold hover:opacity-90 transition-opacity"
          >
            Return to Catalogue
          </Link>
        </div>
      </div>
    );
  }

  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: product.currency || 'USD',
    maximumFractionDigits: 0
  }).format(product.price);

  const formattedOriginalPrice = product.originalPrice
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: product.currency || 'USD',
        maximumFractionDigits: 0
      }).format(product.originalPrice)
    : null;

  const imageList = product.images && product.images.length > 0
    ? product.images
    : [product.primaryImage];

  const availableSizes = product.sizes || ['XS', 'S', 'M', 'L', 'XL'];

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 py-8 sm:py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-7xl mx-auto">
        
        {/* Back Link */}
        <div className="mb-8">
          <Link
            to="/catalogue"
            className="inline-flex items-center space-x-2 text-xs uppercase tracking-widest text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Collection</span>
          </Link>
        </div>

        {/* Product Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          
          {/* Left Column: Photograph Gallery */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Main Stage Image */}
            <div className="relative aspect-[3/4] bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 overflow-hidden group shadow-sm">
              <img
                src={selectedImage || ATELIER_FALLBACK_IMAGE}
                alt={product.name}
                onError={(e) => { e.currentTarget.src = ATELIER_FALLBACK_IMAGE; }}
                className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
              />
              
              {/* Try On Quick Floating Pill */}
              <button
                onClick={handleLaunchTryOn}
                className="absolute top-4 right-4 bg-[#000000]/90 dark:bg-[#FFFFFF]/90 backdrop-blur text-white dark:text-black hover:bg-[#000000] dark:hover:bg-white px-4 py-2 text-xs uppercase tracking-wider font-semibold flex items-center space-x-2 shadow-lg transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#6366F1]" />
                <span>Virtual Try-On</span>
              </button>

              <div className="absolute top-4 left-4">
                <ProductStatusBadge product={product} size="sm" />
              </div>

              {product.isSample && (
                <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur border border-[#E2E8F0] dark:border-slate-800 px-3 py-1 text-[10px] tracking-widest uppercase text-slate-600 dark:text-slate-300 font-semibold">
                  Sample Inventory Model
                </div>
              )}
            </div>

            {/* Thumbnail Carousel */}
            {imageList.length > 1 && (
              <div className="flex space-x-3 overflow-x-auto pb-2">
                {imageList.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(imgUrl)}
                    className={`relative w-20 aspect-[3/4] border-2 overflow-hidden transition-all flex-shrink-0 ${
                      selectedImage === imgUrl
                        ? 'border-[#000000] dark:border-[#FFFFFF]'
                        : 'border-[#E2E8F0] dark:border-slate-800 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

          </div>

          {/* Right Column: Garment Information & Actions */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* Header info */}
            <div className="space-y-3 pb-6 border-b border-[#E2E8F0] dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400 font-semibold">
                  {product.categoryName || 'Couture Silhouette'}
                </span>
                <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                  {product.sku}
                </span>
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl text-slate-900 dark:text-white font-normal leading-tight">
                {product.name}
              </h1>

              <div className="flex items-baseline space-x-3 pt-1">
                <span className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
                  {formattedPrice}
                </span>
                {formattedOriginalPrice && (
                  <span className="text-sm text-slate-400 dark:text-slate-500 line-through">
                    {formattedOriginalPrice}
                  </span>
                )}
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide">
                  Taxes & duties included
                </span>
              </div>
            </div>

            {/* Garment Description */}
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-light">
                {product.description}
              </p>
            </div>

            {/* Size Selector */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs uppercase tracking-widest text-slate-900 dark:text-white font-semibold">
                  Select Size
                </label>
                <button
                  onClick={handleLaunchTryOn}
                  className="text-xs text-[#6366F1] hover:underline inline-flex items-center space-x-1"
                >
                  <Scissors className="w-3 h-3" />
                  <span>Unsure about fit? Try virtually</span>
                </button>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {availableSizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`py-3 text-xs uppercase tracking-wider font-semibold border transition-all ${
                      selectedSize === size
                        ? 'bg-[#000000] dark:bg-[#FFFFFF] text-white dark:text-black border-[#000000] dark:border-[#FFFFFF]'
                        : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-[#E2E8F0] dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* CTAs */}
            <div className="space-y-3 pt-4">
              
              {/* PRIMARY: Try It On Button */}
              <button
                onClick={handleLaunchTryOn}
                className="w-full py-4 bg-[#000000] dark:bg-[#FFFFFF] text-white dark:text-black hover:opacity-90 text-xs uppercase tracking-[0.2em] font-semibold flex items-center justify-center space-x-3 transition-all duration-300 shadow-md group"
              >
                <Sparkles className="w-4 h-4 text-[#6366F1] transition-transform group-hover:rotate-12" />
                <span>Try It On in Virtual Fitting Room</span>
              </button>

              {/* SECONDARY: Add to Bag */}
              <button
                onClick={() => alert(`Added ${product.name} (Size: ${selectedSize}) to your luxury shopping bag.`)}
                className="w-full py-3.5 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 border border-[#000000] dark:border-white text-slate-900 dark:text-white text-xs uppercase tracking-[0.2em] font-medium transition-colors"
              >
                Add Size {selectedSize} to Bag &bull; {formattedPrice}
              </button>

            </div>

            {/* Accordion Specification Tabs */}
            <div className="pt-6 border-t border-[#E2E8F0] dark:border-slate-800 space-y-4">
              
              <div className="flex border-b border-[#E2E8F0] dark:border-slate-800">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`pb-2.5 text-xs uppercase tracking-wider font-semibold mr-6 transition-colors ${
                    activeTab === 'details'
                      ? 'border-b-2 border-[#000000] dark:border-white text-slate-900 dark:text-white'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  Material & Craft
                </button>
                <button
                  onClick={() => setActiveTab('fit')}
                  className={`pb-2.5 text-xs uppercase tracking-wider font-semibold mr-6 transition-colors ${
                    activeTab === 'fit'
                      ? 'border-b-2 border-[#000000] dark:border-white text-slate-900 dark:text-white'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  Silhouette & Fit
                </button>
                <button
                  onClick={() => setActiveTab('delivery')}
                  className={`pb-2.5 text-xs uppercase tracking-wider font-semibold transition-colors ${
                    activeTab === 'delivery'
                      ? 'border-b-2 border-[#000000] dark:border-white text-slate-900 dark:text-white'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  Delivery & Care
                </button>
              </div>

              <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-2">
                {activeTab === 'details' && (
                  <div className="space-y-2">
                    <p><strong>Composition:</strong> {product.material || '100% Certified Luxury Silk & Virgin Wool Blend'}</p>
                    <p><strong>Origin:</strong> Crafted in Italy & France by Master Tailors</p>
                    <p><strong>Finishing:</strong> Hand-rolled hems and reinforced internal seam binding</p>
                  </div>
                )}
                {activeTab === 'fit' && (
                  <div className="space-y-2">
                    <p><strong>Silhouette:</strong> {product.fit || 'True to size; tailored through shoulders with fluid drape'}</p>
                    <p><strong>Model Specs:</strong> Model is 5'10" wearing size S</p>
                    <p><strong>AI Fitting:</strong> Use our Virtual Fitting Room to simulate how the fabric drapes across your specific shoulders and waist.</p>
                  </div>
                )}
                {activeTab === 'delivery' && (
                  <div className="space-y-2">
                    <p><strong>Care:</strong> {product.careInstructions || 'Specialist dry clean only. Store in breathable cotton garment cover.'}</p>
                    <p><strong>Complimentary Courier:</strong> Dispatched within 24 hours in archival signature packaging.</p>
                    <p><strong>White-Glove Returns:</strong> 30-day complimentary door-to-door returns with prepaid courier pickup.</p>
                  </div>
                )}
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
