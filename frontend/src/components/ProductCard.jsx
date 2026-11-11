import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, ArrowUpRight, Heart, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import ProductStatusBadge, { ATELIER_FALLBACK_IMAGE } from './ProductStatusBadge';
import tryOnService from '../services/tryOnService';

export default function ProductCard({ product, initialWishlisted = false, onWishlistToggle }) {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(initialWishlisted);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  useEffect(() => {
    // Check local storage for wishlist persistence
    try {
      const savedWishlist = JSON.parse(localStorage.getItem('vestra_wishlist') || '[]');
      if (savedWishlist.includes(product.id)) {
        setIsWishlisted(true);
      }
    } catch (e) {
      // Ignore JSON error
    }
  }, [product.id]);

  const handleTryOn = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/try-on?productId=${product.id}`);
  };

  const handleWishlistToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const nextState = !isWishlisted;
    setIsWishlisted(nextState);

    // Sync localStorage
    try {
      const savedWishlist = JSON.parse(localStorage.getItem('vestra_wishlist') || '[]');
      let updated;
      if (nextState) {
        updated = Array.from(new Set([...savedWishlist, product.id]));
      } else {
        updated = savedWishlist.filter((id) => id !== product.id);
      }
      localStorage.setItem('vestra_wishlist', JSON.stringify(updated));
    } catch (err) {
      console.warn('LocalStorage error:', err);
    }

    // Sync with backend API
    try {
      setWishlistLoading(true);
      let sessionId = localStorage.getItem('vestra_session_id');
      if (!sessionId) {
        sessionId = 'sess_' + Math.random().toString(36).substring(2, 11);
        localStorage.setItem('vestra_session_id', sessionId);
      }

      if (nextState) {
        await tryOnService.addToWishlist(product.id, sessionId);
      } else {
        await tryOnService.removeFromWishlist(product.id, sessionId);
      }
    } catch (err) {
      console.warn('Wishlist sync warning:', err.message);
    } finally {
      setWishlistLoading(false);
      if (onWishlistToggle) {
        onWishlistToggle(product.id, nextState);
      }
    }
  };

  const formattedPrice = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: product.currency || 'INR',
    maximumFractionDigits: 0,
  }).format(product.price);

  const formattedOriginalPrice = product.originalPrice
    ? new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: product.currency || 'INR',
        maximumFractionDigits: 0,
      }).format(product.originalPrice)
    : null;

  const displayImage = imageError
    ? ATELIER_FALLBACK_IMAGE
    : product.primaryImage || product.images?.[0] || ATELIER_FALLBACK_IMAGE;

  const brandOrSupplier = product.brand || product.supplierName || 'VESTRA Atelier';
  const categoryDisplay = product.categoryName || 'Collection';

  // Availability status calculations
  const rawStock = (product.stockStatus || 'in_stock').toLowerCase();
  const isOutOfStock = rawStock === 'out_of_stock';
  const isLowStock = rawStock === 'low_stock';
  const availabilityLabel = isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock';
  const availabilityBadgeStyle = isOutOfStock
    ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
    : isLowStock
    ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
    : 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800';

  const isTryOnDisabled =
    isOutOfStock ||
    product.tryonCompatibility === 'unsupported' ||
    product.tryonCompatibility === 'needs_image_replacement' ||
    product.isAiReady === false;

  return (
    <div className="group relative bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-800 rounded-none overflow-hidden transition-all duration-300 hover:shadow-vestra flex flex-col hover:border-slate-300">
      
      {/* Product Image Container */}
      <div className="relative aspect-[3/4] overflow-hidden bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        <Link
          to={`/products/${product.id}`}
          className="block w-full h-full"
        >
          <img
            src={displayImage}
            alt={product.name}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
            loading="lazy"
          />
        </Link>

        {/* Top Left Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
          {product.isFeatured && (
            <span className="bg-white/95 text-slate-800 border border-slate-200/80 dark:bg-white dark:text-[#000000] text-[9px] tracking-widest uppercase px-2 py-0.5 font-mono font-medium rounded shadow-xs">
              Featured
            </span>
          )}
          {product.source && product.source !== 'atelier' && (
            <span className="bg-slate-900/90 text-white text-[9px] tracking-wider uppercase px-2 py-0.5 font-mono font-semibold rounded shadow-xs">
              {product.source.replace('_', ' ')}
            </span>
          )}
          <ProductStatusBadge product={product} isImageMissing={imageError} />
        </div>

        {/* Top Right Wishlist Button */}
        <div className="absolute top-3 right-3 z-10">
          <button
            type="button"
            onClick={handleWishlistToggle}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            className={`p-2 rounded-full backdrop-blur-md transition-all duration-200 shadow-sm border ${
              isWishlisted
                ? 'bg-rose-500/90 text-white border-rose-400 hover:bg-rose-600'
                : 'bg-white/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:text-rose-500 hover:border-rose-300'
            }`}
          >
            <Heart
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isWishlisted ? 'fill-current scale-110' : 'scale-100'
              }`}
            />
          </button>
        </div>

        {/* Hover Quick Action Overlay Bar (Desktop) */}
        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-white/95 via-white/80 to-transparent dark:from-black/80 dark:via-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hidden sm:flex items-center justify-center z-10">
          {isTryOnDisabled ? (
            <Link
              to={`/products/${product.id}`}
              className="w-full py-2 px-3 bg-white text-slate-800 hover:bg-slate-50 text-[11px] uppercase font-mono tracking-wider font-semibold flex items-center justify-center space-x-1.5 transition-transform duration-200 shadow-sm border border-slate-200"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-700" />
              <span>Inspect Details</span>
            </Link>
          ) : (
            <button
              onClick={handleTryOn}
              className="w-full py-2 px-3 bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 text-[11px] uppercase font-mono tracking-wider font-semibold flex items-center justify-center space-x-1.5 transition-transform duration-200 shadow-sm border border-slate-300"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#F5AFAF]" />
              <span>Virtual Try-On</span>
            </button>
          )}
        </div>
      </div>

      {/* Product Details Section */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3 bg-white dark:bg-slate-800">
        <div>
          {/* Header Row: Category & Brand / Supplier */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-[10px] uppercase tracking-widest text-[#F5AFAF] font-mono font-semibold truncate">
              {categoryDisplay}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tracking-wider truncate max-w-[50%] text-right">
              {brandOrSupplier}
            </p>
          </div>

          {/* Product Title */}
          <Link
            to={`/products/${product.id}`}
            className="block text-sm font-medium text-slate-900 dark:text-[#FFFFFF] hover:text-[#F5AFAF] dark:hover:text-[#F5AFAF] transition-colors leading-snug font-serif line-clamp-1"
            title={product.name}
          >
            {product.name}
          </Link>
        </div>

        {/* Pricing, Availability Status & Actions */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline space-x-2">
              <span className="text-sm font-semibold text-slate-900 dark:text-[#FFFFFF] font-mono">
                {formattedPrice}
              </span>
              {formattedOriginalPrice && (
                <span className="text-xs text-slate-400 line-through font-mono">
                  {formattedOriginalPrice}
                </span>
              )}
            </div>

            {/* Availability Status Pill */}
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${availabilityBadgeStyle}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                  isOutOfStock ? 'bg-rose-500' : isLowStock ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
              />
              {availabilityLabel}
            </span>
          </div>

          {/* Permanent Action Row for Mobile & Kiosk Touch Devices */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleTryOn}
              disabled={isTryOnDisabled}
              className={`flex-1 py-1.5 px-3 text-[11px] uppercase font-mono tracking-wider font-semibold flex items-center justify-center space-x-1.5 rounded transition-all shadow-xs border ${
                isTryOnDisabled
                  ? 'bg-slate-100 text-slate-400 dark:bg-slate-800/80 dark:text-slate-600 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                  : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 border-slate-900 dark:border-white'
              }`}
            >
              <Sparkles className="w-3 h-3 text-[#F5AFAF]" />
              <span>{isTryOnDisabled ? 'Unavailable' : 'Try-On'}</span>
            </button>

            <Link
              to={`/products/${product.id}`}
              className="py-1.5 px-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-mono flex items-center justify-center transition-colors"
              title="View product details"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
