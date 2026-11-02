import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, ArrowUpRight, Layers } from 'lucide-react';
import ProductStatusBadge, { ATELIER_FALLBACK_IMAGE } from './ProductStatusBadge';

export default function ProductCard({ product }) {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);

  const handleTryOn = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/try-on?productId=${product.id}`);
  };

  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: product.currency || 'USD',
    maximumFractionDigits: 0,
  }).format(product.price);

  const formattedOriginalPrice = product.originalPrice
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: product.currency || 'USD',
        maximumFractionDigits: 0,
      }).format(product.originalPrice)
    : null;

  const displayImage = imageError
    ? ATELIER_FALLBACK_IMAGE
    : product.primaryImage || product.images?.[0] || ATELIER_FALLBACK_IMAGE;

  return (
    <div className="group relative bg-[#FCF8F8] dark:bg-[#1E293B] border border-[#F9DFDF] dark:border-slate-800 rounded-none overflow-hidden transition-all duration-300 hover:shadow-vestra flex flex-col hover:border-[#F5AFAF]">
      
      {/* Product Image Container */}
      <div className="relative aspect-[3/4] overflow-hidden bg-[#FCF8F8] dark:bg-slate-900 border-b border-[#F9DFDF] dark:border-slate-800">
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

        {/* Floating Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
          {product.isFeatured && (
            <span className="bg-[#000000] text-[#FFFFFF] dark:bg-[#FFFFFF] dark:text-[#000000] text-[9px] tracking-widest uppercase px-2 py-0.5 font-mono font-medium rounded shadow-xs">
              Featured
            </span>
          )}
          <ProductStatusBadge product={product} isImageMissing={imageError} />
        </div>

        {/* Hover Quick Action Overlay Bar */}
        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center z-10">
          {product.tryonCompatibility === 'unsupported' ? (
            <Link
              to={`/products/${product.id}`}
              className="w-full py-2 px-3 bg-[#FFFFFF] text-[#000000] hover:bg-[#FBEFEF] text-[11px] uppercase font-mono tracking-wider font-semibold flex items-center justify-center space-x-1.5 transition-transform duration-200 shadow-md border border-[#F9DFDF]"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-700" />
              <span>Inspect Details</span>
            </Link>
          ) : product.tryonCompatibility === 'awaiting_saree_engine' || product.garmentType === 'saree' ? (
            <Link
              to={`/products/${product.id}`}
              className="w-full py-2 px-3 bg-slate-900/90 text-[#FFFFFF] hover:bg-slate-900 text-[11px] uppercase font-mono tracking-wider font-semibold flex items-center justify-center space-x-1.5 transition-transform duration-200 shadow-md border border-slate-700"
            >
              <Layers className="w-3.5 h-3.5 text-[#F5AFAF]" />
              <span>Saree AI Pending</span>
            </Link>
          ) : (
            <button
              onClick={handleTryOn}
              className="w-full py-2 px-3 bg-[#000000] text-[#FFFFFF] hover:bg-slate-900 dark:bg-[#FFFFFF] dark:text-[#000000] dark:hover:bg-slate-100 text-[11px] uppercase font-mono tracking-wider font-semibold flex items-center justify-center space-x-1.5 transition-transform duration-200 shadow-md border border-black dark:border-white"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#F5AFAF]" />
              <span>Select & Try On</span>
            </button>
          )}
        </div>
      </div>

      {/* Product Details Section */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3 bg-[#FBEFEF]/35 dark:bg-[#1E293B]">
        <div>
          {/* Category Tag */}
          <p className="text-[10px] uppercase tracking-widest text-[#F5AFAF] font-mono font-semibold mb-1">
            {product.categoryName || 'Collection'}
          </p>

          {/* Product Title */}
          <Link
            to={`/products/${product.id}`}
            className="block text-sm font-medium text-[#000000] dark:text-[#FFFFFF] hover:text-[#F5AFAF] dark:hover:text-[#F5AFAF] transition-colors leading-snug font-serif"
          >
            {product.name}
          </Link>
        </div>

        {/* Price and Garment Type Meta */}
        <div className="pt-2 border-t border-[#F9DFDF] dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-baseline space-x-2">
            <span className="text-sm font-semibold text-[#000000] dark:text-[#FFFFFF] font-mono">
              {formattedPrice}
            </span>
            {formattedOriginalPrice && (
              <span className="text-xs text-slate-400 line-through font-mono">
                {formattedOriginalPrice}
              </span>
            )}
          </div>

          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 dark:text-slate-400">
            {product.garmentType === 'upper_body'
              ? 'Top'
              : product.garmentType === 'lower_body'
              ? 'Bottom'
              : product.garmentType === 'saree'
              ? '6-Yd Saree'
              : product.garmentType === 'accessory'
              ? 'Accessory'
              : 'Full Outfit'}
          </span>
        </div>

      </div>
    </div>
  );
}
