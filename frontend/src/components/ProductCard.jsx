import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, ArrowUpRight } from 'lucide-react';
import ProductStatusBadge, { ATELIER_FALLBACK_IMAGE } from './ProductStatusBadge';
import tryOnService from '../services/tryOnService';

export default function ProductCard({ product, initialWishlisted = false, onWishlistToggle }) {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(initialWishlisted);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  useEffect(() => {
    try {
      const savedWishlist = JSON.parse(localStorage.getItem('vestra_wishlist') || '[]');
      if (savedWishlist.includes(product.id)) {
        setIsWishlisted(true);
      }
    } catch {
      // Ignore
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

    try {
      const savedWishlist = JSON.parse(localStorage.getItem('vestra_wishlist') || '[]');
      const updated = nextState
        ? Array.from(new Set([...savedWishlist, product.id]))
        : savedWishlist.filter((id) => id !== product.id);
      localStorage.setItem('vestra_wishlist', JSON.stringify(updated));
    } catch (err) {
      console.warn('Wishlist storage warning:', err);
    }

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

  const brandOrSupplier = product.brand || product.supplierName || 'VESTRA';
  const categoryDisplay = product.categoryName || 'Garment';

  const rawStock = (product.stockStatus || 'in_stock').toLowerCase();
  const isOutOfStock = rawStock === 'out_of_stock';
  const isLowStock = rawStock === 'low_stock';
  const availabilityLabel = isOutOfStock ? 'Out of stock' : isLowStock ? 'Low stock' : 'In stock';
  
  const isTryOnDisabled =
    isOutOfStock ||
    product.tryonCompatibility === 'unsupported' ||
    product.tryonCompatibility === 'needs_image_replacement' ||
    product.isAiReady === false;

  return (
    <div className="group relative bg-white dark:bg-[#17181C] border border-black/[0.08] dark:border-white/[0.08] rounded-lg overflow-hidden transition-all duration-200 hover:border-black/20 dark:hover:border-white/20 flex flex-col">
      
      {/* Product Image Stage */}
      <div className="relative aspect-[3/4] overflow-hidden bg-neutral-100 dark:bg-neutral-900">
        <Link to={`/products/${product.id}`} className="block w-full h-full">
          <img
            src={displayImage}
            alt={product.name}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]"
            loading="lazy"
          />
        </Link>

        {/* Status Tags */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10 pointer-events-none">
          {product.isFeatured && (
            <span className="bg-white/95 dark:bg-neutral-900/95 text-neutral-800 dark:text-neutral-200 text-[10px] px-2 py-0.5 font-sans font-medium rounded-sm shadow-xs border border-black/[0.06] dark:border-white/[0.06]">
              Featured
            </span>
          )}
          <ProductStatusBadge product={product} isImageMissing={imageError} />
        </div>

        {/* Wishlist Button */}
        <div className="absolute top-2.5 right-2.5 z-10">
          <button
            type="button"
            onClick={handleWishlistToggle}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-xs ${
              isWishlisted
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                : 'bg-white/90 dark:bg-neutral-900/90 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white border border-black/[0.08] dark:border-white/[0.08]'
            }`}
          >
            <Heart
              className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-current' : ''}`}
              strokeWidth={1.5}
            />
          </button>
        </div>

        {/* Quick Try-On Overlay on Desktop Hover */}
        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-150 hidden sm:flex items-center justify-center z-10">
          {isTryOnDisabled ? (
            <Link
              to={`/products/${product.id}`}
              className="w-full py-2 px-3 bg-white text-neutral-900 text-xs font-medium rounded flex items-center justify-center space-x-1.5 transition-colors hover:bg-neutral-50"
            >
              <span>View details</span>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-60" strokeWidth={1.5} />
            </Link>
          ) : (
            <button
              onClick={handleTryOn}
              className="w-full py-2 px-3 bg-white text-neutral-900 hover:bg-neutral-100 text-xs font-medium rounded flex items-center justify-center space-x-1.5 transition-colors shadow-xs"
            >
              <span>Virtual Try-On</span>
            </button>
          )}
        </div>
      </div>

      {/* Product Information */}
      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-2.5">
        <div>
          <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 mb-1">
            <span className="truncate">{brandOrSupplier}</span>
            <span className="truncate">{categoryDisplay}</span>
          </div>

          <Link
            to={`/products/${product.id}`}
            className="block text-sm font-normal text-neutral-900 dark:text-neutral-100 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors line-clamp-1"
            title={product.name}
          >
            {product.name}
          </Link>
        </div>

        {/* Pricing & Stock Line */}
        <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between">
          <div className="flex items-baseline space-x-1.5">
            <span className="text-sm font-mono font-medium text-neutral-900 dark:text-neutral-100">
              {formattedPrice}
            </span>
            {formattedOriginalPrice && (
              <span className="text-xs font-mono text-neutral-400 dark:text-neutral-500 line-through">
                {formattedOriginalPrice}
              </span>
            )}
          </div>

          <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {availabilityLabel}
          </span>
        </div>

        {/* Mobile / Tablet Quick Action */}
        <div className="sm:hidden pt-1">
          <button
            onClick={isTryOnDisabled ? () => navigate(`/products/${product.id}`) : handleTryOn}
            className="w-full py-2 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs font-medium rounded transition-colors"
          >
            {isTryOnDisabled ? 'View details' : 'Virtual Try-On'}
          </button>
        </div>
      </div>

    </div>
  );
}
