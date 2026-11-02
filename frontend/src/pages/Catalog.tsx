import React, { useState, useMemo } from 'react';
import { Search, Filter, SlidersHorizontal, Sparkles, X, Plus } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { CameraCaptureModal } from '../components/CameraCaptureModal';
import { SareeProduct } from '../types';

interface CatalogProps {
  products: SareeProduct[];
}

export const Catalog: React.FC<CatalogProps> = ({ products }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFabric, setSelectedFabric] = useState<string>('all');
  const [selectedOccasion, setSelectedOccasion] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc'>('featured');
  const [tryOnProduct, setTryOnProduct] = useState<SareeProduct | null>(null);
  const [selectedForCollection, setSelectedForCollection] = useState<string[]>([]);

  // Unique Filter Options
  const fabrics = ['all', 'Pure Kanjeevaram Silk', 'Banarasi Katan Silk', 'Chanderi Silk Cotton', 'Pure Paithani Silk', 'Handloom Tussar Silk', 'Pure Silk Organza'];
  const occasions = ['all', 'Bridal & Wedding', 'Festive & Reception', 'Cocktail & Evening', 'Traditional Ceremony', 'Art Gala & Daytime Festivity', 'Sangeet & Reception'];

  const filteredProducts = useMemo(() => {
    return products
      .filter(p => {
        const matchesSearch =
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.fabric.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.description || '').toLowerCase().includes(searchTerm.toLowerCase());

        const matchesFabric = selectedFabric === 'all' || p.fabric === selectedFabric;
        const matchesOccasion = selectedOccasion === 'all' || p.occasion === selectedOccasion;

        return matchesSearch && matchesFabric && matchesOccasion;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.price - b.price;
        if (sortBy === 'price-desc') return b.price - a.price;
        return 0; // featured default
      });
  }, [products, searchTerm, selectedFabric, selectedOccasion, sortBy]);

  const toggleSelect = (product: SareeProduct) => {
    setSelectedForCollection(prev =>
      prev.includes(product.id) ? prev.filter(id => id !== product.id) : [...prev, product.id]
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E8E2D5] pb-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-[#B99A5B] font-bold">Showroom Archive</div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#681D32]">
            The SAJEE Saree Collection
          </h1>
          <p className="text-xs text-[#292522]/70 mt-1">
            Handcrafted heritage weaves with documented Korvai borders, 24k gold zari, and verified component metadata.
          </p>
        </div>

        {selectedForCollection.length > 0 && (
          <div className="bg-[#681D32] text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-3 shadow-md">
            <span>{selectedForCollection.length} Sarees Selected for Draping</span>
            <button
              onClick={() => setSelectedForCollection([])}
              className="text-[#FAF7F0]/70 hover:text-white"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-[#FAF7F0] border border-[#E8E2D5] rounded-xl p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          
          {/* Search Box */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-[#292522]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by weave, SKU (e.g. SAJEE-KANJ-001), or motif..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-lg border border-[#E8E2D5] bg-[#FAF7F0] focus:border-[#681D32] focus:ring-1 focus:ring-[#681D32] outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#292522]/50 hover:text-[#292522]"
              >
                ✕
              </button>
            )}
          </div>

          {/* Fabric Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedFabric}
              onChange={(e) => setSelectedFabric(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-lg border border-[#E8E2D5] bg-[#FAF7F0] focus:border-[#681D32] outline-none cursor-pointer"
            >
              <option value="all">All Heritage Fabrics</option>
              {fabrics.filter(f => f !== 'all').map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* Occasion Filter */}
          <div className="md:col-span-2">
            <select
              value={selectedOccasion}
              onChange={(e) => setSelectedOccasion(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-lg border border-[#E8E2D5] bg-[#FAF7F0] focus:border-[#681D32] outline-none cursor-pointer"
            >
              <option value="all">All Occasions</option>
              {occasions.filter(o => o !== 'all').map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="md:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full py-2 px-3 text-xs rounded-lg border border-[#E8E2D5] bg-[#FAF7F0] focus:border-[#681D32] outline-none cursor-pointer font-medium"
            >
              <option value="featured">Featured Atelier</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>

        </div>

        {/* Quick Filter Pill Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E8E2D5]/70 text-xs">
          <span className="text-[#292522]/60 font-medium">Quick Curations:</span>
          {['Bridal & Wedding', 'Pure Kanjeevaram Silk', 'Banarasi Katan Silk', 'Pure Paithani Silk'].map(tag => (
            <button
              key={tag}
              onClick={() => {
                if (tag === 'Bridal & Wedding') setSelectedOccasion(tag);
                else setSelectedFabric(tag);
              }}
              className="px-2.5 py-1 rounded-full text-[11px] bg-[#F2EDE2] text-[#681D32] hover:bg-[#681D32] hover:text-white transition-colors border border-[#E8E2D5]"
            >
              {tag}
            </button>
          ))}
          {(selectedFabric !== 'all' || selectedOccasion !== 'all' || searchTerm) && (
            <button
              onClick={() => {
                setSelectedFabric('all');
                setSelectedOccasion('all');
                setSearchTerm('');
              }}
              className="text-[11px] text-red-600 hover:underline ml-2"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Product Results Grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProducts.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onTryOn={(p) => setTryOnProduct(p)}
              onSelect={(p) => toggleSelect(p)}
              isSelected={selectedForCollection.includes(product.id)}
            />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center space-y-3 bg-[#F2EDE2]/40 rounded-2xl border border-dashed border-[#B99A5B]">
          <SlidersHorizontal className="w-8 h-8 text-[#B99A5B] mx-auto" />
          <h3 className="font-serif text-lg font-bold text-[#681D32]">No Matching Sarees Found</h3>
          <p className="text-xs text-[#292522]/70 max-w-sm mx-auto">
            Try adjusting your fabric, occasion, or search parameters to discover other heirloom masterpieces in our archive.
          </p>
          <button
            onClick={() => {
              setSelectedFabric('all');
              setSelectedOccasion('all');
              setSearchTerm('');
            }}
            className="px-4 py-2 bg-[#681D32] text-white text-xs font-semibold rounded-lg hover:bg-[#852842]"
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* Virtual Try-On Modal */}
      {tryOnProduct && (
        <CameraCaptureModal
          product={tryOnProduct}
          isOpen={Boolean(tryOnProduct)}
          onClose={() => setTryOnProduct(null)}
        />
      )}
    </div>
  );
};
