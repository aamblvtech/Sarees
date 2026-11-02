import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Eye, Plus, Check } from 'lucide-react';
import { SareeProduct } from '../types';

interface ProductCardProps {
  product: SareeProduct;
  onTryOn?: (product: SareeProduct) => void;
  onSelect?: (product: SareeProduct) => void;
  isSelected?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onTryOn,
  onSelect,
  isSelected = false,
}) => {
  const formattedPrice = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(product.price);

  return (
    <div className="group bg-[#FAF7F0] border border-[#E8E2D5] rounded-xl overflow-hidden hover:border-[#B99A5B] transition-all duration-300 shadow-sm hover:shadow-sajee-lg flex flex-col justify-between">
      {/* Image Container */}
      <div className="relative aspect-[3/4] overflow-hidden bg-[#F2EDE2]">
        <img
          src={product.primaryImage}
          alt={product.name}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
          loading="lazy"
        />

        {/* Top Floating Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
          <span className="bg-[#681D32]/90 backdrop-blur-sm text-[#FAF7F0] text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded shadow">
            {product.fabric.split(' ')[0]} Weave
          </span>
          <span className="bg-[#B99A5B]/90 backdrop-blur-sm text-[#292522] text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded shadow">
            SKU: {product.sku}
          </span>
        </div>

        {/* Stock Badge */}
        <div className="absolute top-3 right-3">
          <span className="bg-[#292522]/80 backdrop-blur-sm text-[#FAF7F0] text-[10px] px-2 py-0.5 rounded">
            {product.stockQuantity > 0 ? `${product.stockQuantity} in salon` : 'Made to order'}
          </span>
        </div>

        {/* Quick Action Overlay on Hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#292522]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4 justify-between">
          <Link
            to={`/products/${product.id}`}
            className="text-xs bg-[#FAF7F0] text-[#292522] hover:bg-[#FAF7F0]/90 px-3 py-1.5 rounded font-medium flex items-center gap-1.5 shadow"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Examine</span>
          </Link>

          {onTryOn && (
            <button
              onClick={() => onTryOn(product)}
              className="text-xs bg-[#681D32] hover:bg-[#852842] text-[#FAF7F0] px-3.5 py-1.5 rounded font-medium flex items-center gap-1.5 shadow"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#B99A5B]" />
              <span>Try On</span>
            </button>
          )}
        </div>
      </div>

      {/* Details Container */}
      <div className="p-5 flex flex-col flex-1 justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-[#B99A5B] font-semibold mb-1">
            {product.occasion} • {product.color}
          </div>

          <Link to={`/products/${product.id}`}>
            <h3 className="font-serif text-lg font-bold text-[#681D32] group-hover:text-[#852842] transition-colors line-clamp-1">
              {product.name}
            </h3>
          </Link>

          <p className="text-xs text-[#292522]/70 mt-1 line-clamp-2 leading-relaxed">
            {product.description || `${product.fabric} with authentic artisanal borders and rich pallu zari work.`}
          </p>
        </div>

        <div className="pt-4 mt-3 border-t border-[#E8E2D5] flex items-center justify-between">
          <div>
            <div className="text-xs text-[#292522]/50">Showroom Price</div>
            <div className="text-lg font-serif font-bold text-[#292522]">
              {formattedPrice}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onSelect && (
              <button
                onClick={() => onSelect(product)}
                className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${
                  isSelected
                    ? 'bg-[#681D32] border-[#681D32] text-white'
                    : 'border-[#B99A5B] text-[#681D32] hover:bg-[#B99A5B]/10'
                }`}
                title={isSelected ? 'Remove from selection' : 'Add to try-on selection'}
              >
                {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </button>
            )}

            {onTryOn && (
              <button
                onClick={() => onTryOn(product)}
                className="bg-[#681D32] hover:bg-[#852842] text-[#FAF7F0] text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#B99A5B]" />
                <span>Try On</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
