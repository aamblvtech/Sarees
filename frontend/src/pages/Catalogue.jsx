import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Sparkles, SlidersHorizontal, RefreshCw } from 'lucide-react';
import productService from '../services/productService';
import ProductCard from '../components/ProductCard';

export default function Catalogue() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category') || 'all';
  const subcategoryParam = searchParams.get('subcategory') || 'all';
  const genderParam = searchParams.get('gender') || 'all';

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [selectedSubcategory, setSelectedSubcategory] = useState(subcategoryParam);
  const [selectedGender, setSelectedGender] = useState(genderParam);
  const [onlyTryOnReady, setOnlyTryOnReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setSelectedCategory(categoryParam);
    setSelectedSubcategory(subcategoryParam);
    setSelectedGender(genderParam);
  }, [categoryParam, subcategoryParam, genderParam]);

  useEffect(() => {
    async function loadCatalogue() {
      setLoading(true);
      setError(null);
      try {
        const [prods, cats] = await Promise.all([
          productService.getProducts({
            category: selectedCategory !== 'all' ? selectedCategory : undefined,
            subcategory: selectedSubcategory !== 'all' ? selectedSubcategory : undefined,
            gender: selectedGender !== 'all' ? selectedGender : undefined,
            search: searchQuery || undefined
          }),
          productService.getCategories()
        ]);
        setProducts(prods);
        setCategories(cats);
      } catch (err) {
        setError('Failed to load catalogue. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    loadCatalogue();
  }, [selectedCategory, selectedSubcategory, selectedGender, searchQuery]);

  const handleCategoryChange = (slug) => {
    setSelectedCategory(slug);
    setSelectedSubcategory('all');
    if (slug === 'all') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', slug);
    }
    searchParams.delete('subcategory');
    setSearchParams(searchParams);
  };

  const handleSubcategoryChange = (sub) => {
    setSelectedSubcategory(sub);
    if (sub === 'all') {
      searchParams.delete('subcategory');
    } else {
      searchParams.set('subcategory', sub);
    }
    setSearchParams(searchParams);
  };

  const handleGenderChange = (gender) => {
    setSelectedGender(gender);
    if (gender === 'all') {
      searchParams.delete('gender');
    } else {
      searchParams.set('gender', gender);
    }
    setSearchParams(searchParams);
  };

  const availableSubcategories = React.useMemo(() => {
    if (selectedCategory === 'sarees') {
      return [
        'kanjivaram', 'banarasi', 'pochampally', 'gadwal', 'uppada',
        'chanderi', 'paithani', 'organza', 'cotton', 'bridal', 'designer_party', 'traditional_handloom'
      ];
    }
    if (selectedCategory === 'womens-clothing') {
      return [
        'anarkali_suits', 'salwar_kameez', 'churidar_sets', 'kurti_pant_sets',
        'lehenga_choli', 'gowns', 'maxi_dresses', 'evening_dresses',
        'party_wear_dresses', 'casual_dresses', 'western_coord_sets', 'jumpsuits'
      ];
    }
    if (selectedCategory === 'mens-clothing') {
      return [
        'formal_suits', 'blazer_trouser_sets', 'kurta_pyjama_sets',
        'sherwani_outfits', 'indo_western', 'shirt_trouser_combinations',
        'casual_coords', 'traditional_outfits'
      ];
    }
    if (selectedCategory === 'accessories') return ['belts', 'shawls'];
    return [
      'kanjivaram', 'banarasi', 'chanderi', 'anarkali_suits', 'salwar_kameez',
      'gowns', 'dresses', 'lehenga_choli', 'formal_suits', 'sherwani_outfits',
      'kurta_pyjama_sets', 'western_coord_sets', 'jumpsuits'
    ];
  }, [selectedCategory]);

  const filteredProducts = products.filter((p) => {
    if (onlyTryOnReady && p.tryonCompatibility !== 'supported') return false;
    return true;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price-low') return a.price - b.price;
    if (sortBy === 'price-high') return b.price - a.price;
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
  });

  const getCategoryHeader = () => {
    if (selectedCategory === 'sarees') {
      return {
        tag: 'Heritage Indian Weaves',
        title: 'Archival Sarees',
        desc: 'Masterpieces in pure Kanjivaram silk, Banarasi antique zari, and gossamer Chanderi weaves.'
      };
    }
    if (selectedCategory === 'womens-clothing') {
      return {
        tag: 'Haute Couture & Modern Silhouettes',
        title: "Women's Collection",
        desc: 'Sculptural velvet gowns, fluid bias-cut dresses, hand-embroidered kurtis, and double-breasted blazers.'
      };
    }
    if (selectedCategory === 'mens-clothing') {
      return {
        tag: 'Sartorial Tailoring & Refined Essentials',
        title: "Men's Collection",
        desc: 'Precision Italian virgin wool tailoring, handloom linen button-downs, and Okayama selvedge denim.'
      };
    }
    if (selectedCategory === 'accessories') {
      return {
        tag: 'Atelier Accents',
        title: 'Luxury Accessories',
        desc: 'Artisanal full-grain leather belts with palladium hardware and pure Himalayan pashmina stoles.'
      };
    }
    return {
      tag: 'VESTRA Studio Archive',
      title: 'Clothing Collection',
      desc: 'Browse precision garments calibrated for neural cloth draping and AI virtual try-on.'
    };
  };

  const headerInfo = getCategoryHeader();

  return (
    <div className="min-h-screen bg-[#FCF8F8] dark:bg-[#0F172A] text-[#000000] dark:text-[#FFFFFF] py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Page Title & Breadcrumb */}
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <p className="text-[10px] uppercase font-mono tracking-[0.25em] text-[#F5AFAF] font-bold">
            {headerInfo.tag}
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl font-normal text-[#000000] dark:text-[#FFFFFF]">
            {headerInfo.title}
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {headerInfo.desc}
          </p>
        </div>

        {/* Filter and Control Bar */}
        <div className="bg-[#FBEFEF] dark:bg-[#1E293B] border border-[#F9DFDF] dark:border-slate-800 p-5 space-y-4 shadow-vestra-sm">
          
          {/* Main Category Tabs */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none border-b border-[#F9DFDF] dark:border-slate-800">
            <button
              onClick={() => handleCategoryChange('all')}
              className={`px-4 py-2 text-xs uppercase tracking-wider font-semibold whitespace-nowrap transition-colors rounded ${
                selectedCategory === 'all'
                  ? 'bg-[#000000] text-[#FFFFFF] dark:bg-[#FFFFFF] dark:text-[#000000]'
                  : 'bg-[#FCF8F8] dark:bg-[#0F172A] text-slate-700 dark:text-slate-300 hover:border-[#F5AFAF] border border-[#F9DFDF] dark:border-slate-700'
              }`}
            >
              All Garments
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id || cat.slug}
                onClick={() => handleCategoryChange(cat.slug)}
                className={`px-4 py-2 text-xs uppercase tracking-wider font-semibold whitespace-nowrap transition-colors rounded ${
                  selectedCategory === cat.slug
                    ? 'bg-[#000000] text-[#FFFFFF] dark:bg-[#FFFFFF] dark:text-[#000000]'
                    : 'bg-[#FCF8F8] dark:bg-[#0F172A] text-slate-700 dark:text-slate-300 hover:border-[#F5AFAF] border border-[#F9DFDF] dark:border-slate-700'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Subcategory Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 whitespace-nowrap mr-1">
              Subcategory:
            </span>
            <button
              onClick={() => handleSubcategoryChange('all')}
              className={`px-2.5 py-1 text-[10px] uppercase font-mono tracking-wider font-medium whitespace-nowrap rounded transition-colors ${
                selectedSubcategory === 'all'
                  ? 'bg-[#000000] text-[#FFFFFF] dark:bg-[#FFFFFF] dark:text-[#000000]'
                  : 'bg-[#FCF8F8] dark:bg-[#0F172A] text-slate-700 dark:text-slate-300 border border-[#F9DFDF] dark:border-slate-700 hover:border-[#F5AFAF]'
              }`}
            >
              All
            </button>
            {availableSubcategories.map((sub) => (
              <button
                key={sub}
                onClick={() => handleSubcategoryChange(sub)}
                className={`px-2.5 py-1 text-[10px] uppercase font-mono tracking-wider font-medium whitespace-nowrap rounded transition-colors ${
                  selectedSubcategory === sub
                    ? 'bg-[#000000] text-[#FFFFFF] dark:bg-[#FFFFFF] dark:text-[#000000]'
                    : 'bg-[#FCF8F8] dark:bg-[#0F172A] text-slate-700 dark:text-slate-300 border border-[#F9DFDF] dark:border-slate-700 hover:border-[#F5AFAF]'
                }`}
              >
                {sub.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Search, Gender, Try-On Toggle & Sort Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2 border-t border-[#F9DFDF] dark:border-slate-800">
            
            {/* Gender Audience Pills */}
            <div className="flex items-center space-x-2">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 whitespace-nowrap">
                Gender:
              </span>
              {['all', 'women', 'men', 'unisex'].map((g) => (
                <button
                  key={g}
                  onClick={() => handleGenderChange(g)}
                  className={`px-2.5 py-1 text-[10px] uppercase font-mono tracking-wider font-medium rounded transition-colors ${
                    selectedGender === g
                      ? 'bg-[#000000] text-[#FFFFFF] dark:bg-[#FFFFFF] dark:text-[#000000]'
                      : 'bg-[#FCF8F8] dark:bg-[#0F172A] text-slate-700 dark:text-slate-300 border border-[#F9DFDF] dark:border-slate-700 hover:border-[#F5AFAF]'
                  }`}
                >
                  {g}
                </button>
              ))}

              {/* Try-On Ready Toggle */}
              <button
                onClick={() => setOnlyTryOnReady(!onlyTryOnReady)}
                className={`ml-2 px-3 py-1 text-[10px] uppercase font-mono tracking-wider font-semibold border rounded flex items-center space-x-1.5 transition-all ${
                  onlyTryOnReady
                    ? 'bg-[#F5AFAF] text-black border-[#F5AFAF]'
                    : 'bg-[#FCF8F8] dark:bg-[#0F172A] text-slate-700 dark:text-slate-300 border-[#F9DFDF] dark:border-slate-700 hover:border-[#F5AFAF]'
                }`}
              >
                <Sparkles className="w-3 h-3 text-[#F5AFAF] dark:text-white" />
                <span>AI Try-On Ready</span>
              </button>
            </div>

            {/* Search and Sort controls */}
            <div className="flex items-center space-x-3">
              
              {/* Search Input */}
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search kurti, saree, blazer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#FCF8F8] dark:bg-[#0F172A] border border-[#F9DFDF] dark:border-slate-700 text-xs text-[#000000] dark:text-[#FFFFFF] pl-8 pr-3 py-2 rounded focus:outline-none focus:border-[#F5AFAF]"
                />
              </div>

              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-[#FCF8F8] dark:bg-[#0F172A] border border-[#F9DFDF] dark:border-slate-700 text-xs text-[#000000] dark:text-[#FFFFFF] px-3 py-2 uppercase font-mono tracking-wider font-medium rounded focus:outline-none focus:border-[#F5AFAF]"
              >
                <option value="featured">Featured First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="name">Alphabetical</option>
              </select>

            </div>

          </div>

          {/* Results count & status */}
          <div className="pt-2 border-t border-[#F9DFDF] dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span className="font-mono">
              Showing {sortedProducts.length} items
            </span>
            <span className="text-[11px] font-mono text-slate-700 dark:text-slate-300 flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-[#F5AFAF] inline-block mr-1"></span>
              <span>Calibrated for Genlook virtual try-on</span>
            </span>
          </div>

        </div>

        {/* Product Grid Area */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 py-8">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} className="aspect-[3/4] bg-[#FBEFEF] dark:bg-slate-800 animate-pulse border border-[#F9DFDF] dark:border-slate-800" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16 space-y-4 bg-[#FBEFEF] dark:bg-[#1E293B] border border-rose-200 dark:border-rose-900">
            <p className="text-sm text-rose-600">{error}</p>
            <button
              onClick={() => setSelectedCategory('all')}
              className="px-4 py-2 bg-[#000000] text-[#FFFFFF] dark:bg-[#FFFFFF] dark:text-[#000000] text-xs uppercase tracking-wider font-semibold"
            >
              Reset Filters
            </button>
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="text-center py-20 bg-[#FBEFEF] dark:bg-[#1E293B] border border-[#F9DFDF] dark:border-slate-800 space-y-4">
            <Sparkles className="w-8 h-8 text-[#F5AFAF] mx-auto" />
            <h3 className="font-serif text-2xl text-[#000000] dark:text-[#FFFFFF]">No Garments Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Try adjusting your category filter or search keywords.
            </p>
            <button
              onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }}
              className="px-6 py-2.5 bg-[#000000] text-[#FFFFFF] dark:bg-[#FFFFFF] dark:text-[#000000] text-xs uppercase tracking-widest font-semibold"
            >
              Show All Garments
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
