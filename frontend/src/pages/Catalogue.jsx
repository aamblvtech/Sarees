import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Sparkles, SlidersHorizontal, RefreshCw, X, Heart } from 'lucide-react';
import productService from '../services/productService';
import ProductCard from '../components/ProductCard';

const MAIN_NAV_TABS = [
  { id: 'all', slug: 'all', name: 'All Garments' },
  { id: 'womens-wear', slug: 'womens-wear', name: "Women's Wear" },
  { id: 'mens-wear', slug: 'mens-wear', name: "Men's Wear" },
  { id: 'traditional-wear', slug: 'traditional-wear', name: 'Traditional Wear' },
  { id: 'western-wear', slug: 'western-wear', name: 'Western Wear' },
  { id: 'accessories', slug: 'accessories', name: 'Accessories' }
];

const STATIC_SUBCATEGORIES = {
  'all': [
    { slug: 'all', name: 'All Subcategories' },
    { slug: 'sarees', name: 'Sarees' },
    { slug: 'dresses', name: 'Dresses & Gowns' },
    { slug: 'kurtis', name: 'Kurtis & Sets' },
    { slug: 'shirts', name: 'Shirts & Polos' },
    { slug: 'jeans', name: 'Jeans & Denim' },
    { slug: 'trousers', name: 'Trousers & Shorts' },
    { slug: 'blazers', name: 'Blazers & Jackets' },
    { slug: 'traditional', name: 'Traditional Ensembles' },
    { slug: 'accessories', name: 'Accessories' }
  ],
  'womens-wear': [
    { slug: 'all', name: "All Women's" },
    { slug: 'sarees', name: 'Sarees' },
    { slug: 'silk_sarees', name: 'Silk Sarees' },
    { slug: 'cotton_sarees', name: 'Cotton Sarees' },
    { slug: 'banarasi_sarees', name: 'Banarasi Sarees' },
    { slug: 'kanjivaram_sarees', name: 'Kanjivaram Sarees' },
    { slug: 'paithani_sarees', name: 'Paithani Sarees' },
    { slug: 'lehengas', name: 'Lehengas' },
    { slug: 'anarkali_suits', name: 'Anarkali Suits' },
    { slug: 'salwar_suits', name: 'Salwar Suits' },
    { slug: 'churidar_sets', name: 'Churidar Sets' },
    { slug: 'kurtis', name: 'Kurtis' },
    { slug: 'ethnic_gowns', name: 'Ethnic Gowns' },
    { slug: 'dupattas', name: 'Dupattas' },
    { slug: 'dresses', name: 'Dresses' },
    { slug: 'maxi_dresses', name: 'Maxi Dresses' },
    { slug: 'midi_dresses', name: 'Midi Dresses' },
    { slug: 'mini_dresses', name: 'Mini Dresses' },
    { slug: 'tops', name: 'Tops & Shirts' },
    { slug: 't_shirts', name: 'T-Shirts' },
    { slug: 'jeans', name: 'Jeans' },
    { slug: 'trousers', name: 'Trousers' },
    { slug: 'skirts', name: 'Skirts' },
    { slug: 'jumpsuits', name: 'Jumpsuits' },
    { slug: 'coord_sets', name: 'Co-ord Sets' },
    { slug: 'blazers', name: 'Blazers' },
    { slug: 'jackets', name: 'Jackets' }
  ],
  'mens-wear': [
    { slug: 'all', name: "All Men's" },
    { slug: 'mens_kurtas', name: "Men's Kurtas" },
    { slug: 'kurta_pyjama_sets', name: 'Kurta Pyjama Sets' },
    { slug: 'sherwanis', name: 'Sherwanis' },
    { slug: 'dhoti_sets', name: 'Dhoti Sets' },
    { slug: 'nehru_jackets', name: 'Nehru Jackets' },
    { slug: 'traditional_waistcoats', name: 'Traditional Waistcoats' },
    { slug: 'casual_shirts', name: 'Casual Shirts' },
    { slug: 'formal_shirts', name: 'Formal Shirts' },
    { slug: 't_shirts', name: 'T-Shirts' },
    { slug: 'polo_t_shirts', name: 'Polo T-Shirts' },
    { slug: 'jeans', name: 'Jeans' },
    { slug: 'formal_trousers', name: 'Formal Trousers' },
    { slug: 'casual_trousers', name: 'Casual Trousers' },
    { slug: 'shorts', name: 'Shorts' },
    { slug: 'blazers', name: 'Blazers' },
    { slug: 'suits', name: 'Suits' },
    { slug: 'jackets', name: 'Jackets' },
    { slug: 'hoodies', name: 'Hoodies' },
    { slug: 'sweatshirts', name: 'Sweatshirts' }
  ],
  'traditional-wear': [
    { slug: 'all', name: 'All Traditional' },
    { slug: 'sarees', name: 'Sarees' },
    { slug: 'silk_sarees', name: 'Silk Sarees' },
    { slug: 'cotton_sarees', name: 'Cotton Sarees' },
    { slug: 'banarasi_sarees', name: 'Banarasi Sarees' },
    { slug: 'kanjivaram_sarees', name: 'Kanjivaram Sarees' },
    { slug: 'paithani_sarees', name: 'Paithani Sarees' },
    { slug: 'lehengas', name: 'Lehengas' },
    { slug: 'anarkali_suits', name: 'Anarkali Suits' },
    { slug: 'salwar_suits', name: 'Salwar Suits' },
    { slug: 'churidar_sets', name: 'Churidar Sets' },
    { slug: 'kurtis', name: 'Kurtis' },
    { slug: 'ethnic_gowns', name: 'Ethnic Gowns' },
    { slug: 'dupattas', name: 'Dupattas' },
    { slug: 'mens_kurtas', name: "Men's Kurtas" },
    { slug: 'kurta_pyjama_sets', name: 'Kurta Pyjama Sets' },
    { slug: 'sherwanis', name: 'Sherwanis' },
    { slug: 'dhoti_sets', name: 'Dhoti Sets' },
    { slug: 'nehru_jackets', name: 'Nehru Jackets' },
    { slug: 'traditional_waistcoats', name: 'Traditional Waistcoats' }
  ],
  'western-wear': [
    { slug: 'all', name: 'All Western' },
    { slug: 'dresses', name: 'Dresses' },
    { slug: 'maxi_dresses', name: 'Maxi Dresses' },
    { slug: 'midi_dresses', name: 'Midi Dresses' },
    { slug: 'mini_dresses', name: 'Mini Dresses' },
    { slug: 'tops', name: 'Tops & Shirts' },
    { slug: 't_shirts', name: 'T-Shirts' },
    { slug: 'polo_t_shirts', name: 'Polo T-Shirts' },
    { slug: 'jeans', name: 'Jeans' },
    { slug: 'trousers', name: 'Trousers' },
    { slug: 'formal_trousers', name: 'Formal Trousers' },
    { slug: 'casual_trousers', name: 'Casual Trousers' },
    { slug: 'skirts', name: 'Skirts' },
    { slug: 'shorts', name: 'Shorts' },
    { slug: 'jumpsuits', name: 'Jumpsuits' },
    { slug: 'coord_sets', name: 'Co-ord Sets' },
    { slug: 'blazers', name: 'Blazers' },
    { slug: 'suits', name: 'Suits' },
    { slug: 'jackets', name: 'Jackets' },
    { slug: 'hoodies', name: 'Hoodies' },
    { slug: 'sweatshirts', name: 'Sweatshirts' }
  ],
  'accessories': [
    { slug: 'all', name: 'All Accessories' },
    { slug: 'dupattas', name: 'Dupattas' },
    { slug: 'scarves', name: 'Scarves' },
    { slug: 'belts', name: 'Belts' },
    { slug: 'ties', name: 'Ties' },
    { slug: 'fashion_accessories', name: 'Fashion Accessories' }
  ]
};

const DEFAULT_CATEGORIES = [
  { id: 0, slug: 'all', name: 'All Garments', productCount: 92 },
  { id: 1, slug: 'sarees', name: 'Sarees', productCount: 32 },
  { id: 5, slug: 'shirts', name: 'Shirts & Tops', productCount: 7 },
  { id: 6, slug: 'jeans', name: 'Jeans & Denim', productCount: 5 },
  { id: 21, slug: 'dresses', name: 'Dresses & Gowns', productCount: 6 },
  { id: 22, slug: 'kurtis', name: 'Kurtis & Ethnic Wear', productCount: 1 },
  { id: 23, slug: 'salwar', name: 'Salwar Suits', productCount: 4 },
  { id: 31, slug: 'mens-traditional', name: "Men's Traditional Wear", productCount: 8 },
  { id: 8, slug: 'blazers', name: 'Blazers & Jackets', productCount: 13 },
  { id: 7, slug: 'trousers', name: 'Trousers', productCount: 11 },
  { id: 4, slug: 'accessories', name: 'Accessories', productCount: 3 }
];

export default function Catalogue() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category') || 'all';
  const subcategoryParam = searchParams.get('subcategory') || 'all';
  const genderParam = searchParams.get('gender') || 'all';

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [navTabs, setNavTabs] = useState(MAIN_NAV_TABS);
  const [subcategoriesMap, setSubcategoriesMap] = useState(STATIC_SUBCATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [selectedSubcategory, setSelectedSubcategory] = useState(subcategoryParam);
  const [selectedGender, setSelectedGender] = useState(genderParam);
  const [onlyTryOnReady, setOnlyTryOnReady] = useState(false);
  const [selectedSource, setSelectedSource] = useState('all');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [selectedPriceRange, setSelectedPriceRange] = useState('all');
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
            search: searchQuery || undefined,
            brand: selectedBrand !== 'all' ? selectedBrand : undefined,
            source: selectedSource !== 'all' ? selectedSource : undefined,
            aiReady: onlyTryOnReady ? 'true' : undefined,
            sort: sortBy
          }),
          productService.getCategories()
        ]);
        setProducts(prods || []);
        if (cats && cats.length > 0) {
          setCategories(cats);
        }
        if (cats?.mainNavigation && cats.mainNavigation.length > 0) {
          setNavTabs(cats.mainNavigation);
        }
        if (cats?.subcategories && Object.keys(cats.subcategories).length > 0) {
          setSubcategoriesMap(cats.subcategories);
        }
      } catch (err) {
        console.error('Failed to load catalogue:', err);
        setError('Failed to load catalogue garments. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    loadCatalogue();
  }, [
    selectedCategory,
    selectedSubcategory,
    selectedGender,
    searchQuery,
    selectedBrand,
    selectedSource,
    onlyTryOnReady,
    sortBy
  ]);

  const activeMainTab = useMemo(() => {
    if (['all', 'womens-wear', 'mens-wear', 'traditional-wear', 'western-wear', 'accessories'].includes(selectedCategory)) {
      return selectedCategory;
    }
    if (['sarees', 'salwar', 'kurtis', 'womens-traditional'].includes(selectedCategory)) {
      return 'traditional-wear';
    }
    if (['mens-traditional', 'mens-traditional-dept'].includes(selectedCategory)) {
      return 'traditional-wear';
    }
    if (['shirts', 'jeans', 'dresses', 'blazers', 'trousers', 'womens-western', 'mens-western'].includes(selectedCategory)) {
      return 'western-wear';
    }
    return 'all';
  }, [selectedCategory]);

  const currentSubcategories = useMemo(() => {
    if (subcategoriesMap[selectedCategory]) {
      return subcategoriesMap[selectedCategory];
    }
    if (subcategoriesMap[activeMainTab]) {
      return subcategoriesMap[activeMainTab];
    }
    return STATIC_SUBCATEGORIES['all'];
  }, [selectedCategory, activeMainTab, subcategoriesMap]);

  const handleCategoryChange = (slug) => {
    setSelectedCategory(slug);
    setSelectedSubcategory('all');
    const newParams = new URLSearchParams(searchParams);
    if (slug === 'all') {
      newParams.delete('category');
    } else {
      newParams.set('category', slug);
    }
    newParams.delete('subcategory');
    setSearchParams(newParams);
  };

  const handleSubcategoryChange = (sub) => {
    setSelectedSubcategory(sub);
    const newParams = new URLSearchParams(searchParams);
    if (sub === 'all') {
      newParams.delete('subcategory');
    } else {
      newParams.set('subcategory', sub);
    }
    setSearchParams(newParams);
  };

  const handleGenderChange = (gender) => {
    setSelectedGender(gender);
    const newParams = new URLSearchParams(searchParams);
    if (gender === 'all') {
      newParams.delete('gender');
    } else {
      newParams.set('gender', gender);
    }
    setSearchParams(newParams);
  };

  const handleResetAllFilters = () => {
    setSelectedCategory('all');
    setSelectedSubcategory('all');
    setSelectedGender('all');
    setSelectedBrand('all');
    setSelectedSource('all');
    setSelectedPriceRange('all');
    setOnlyTryOnReady(false);
    setSearchQuery('');
    setSortBy('featured');
    setSearchParams({});
  };

  const availableSubcategories = useMemo(() => {
    switch (selectedCategory) {
      case 'womens-wear':
        return {
          tag: "Women's Sartorial Collection",
          title: "Women's Fashion Archive",
          desc: 'Curated Indian heritage sarees, royal lehengas, haute couture dresses, tailored trousers, and tops.'
        };
      case 'mens-wear':
        return {
          tag: "Men's Sartorial Collection",
          title: "Men's Fashion Archive",
          desc: 'Bespoke wool tailoring, royal silk sherwanis, Sea Island cotton polos, selvedge denim, and outerwear.'
        };
      case 'traditional-wear':
        return {
          tag: 'Indian Heritage Grandeur',
          title: 'Traditional Couture',
          desc: 'Archival Banarasi weaves, Yeola Paithani sarees, bespoke sherwanis, and royal Nehru jackets.'
        };
      case 'western-wear':
        return {
          tag: 'Modern Atelier Tailoring',
          title: 'Western Apparel',
          desc: 'Sculptural evening dresses, bespoke suits, luxury hoodies, and contemporary denim.'
        };
      case 'accessories':
        return {
          tag: 'Artisanal Accents',
          title: 'Luxury Accessories',
          desc: 'Como 7-fold silk neckties, mulberry silk pocket squares, and gold zari bridal dupattas.'
        };
      case 'sarees':
        return [
          'kanjivaram', 'banarasi', 'chanderi', 'pochampally', 'gadwal', 'uppada',
          'paithani', 'organza', 'cotton', 'bridal', 'designer_party', 'traditional_handloom',
          'patola', 'kalamkari', 'kota_doria', 'bandhani', 'mysore_silk', 'tussar'
        ];
      case 'shirts':
        return [
          'oxford_shirts', 'formal_shirts', 'linen_shirts', 'silk_blouses', 'casual_shirts', 'resort_shirts'
        ];
      case 'jeans':
        return [
          'selvedge_jeans', 'baggy_jeans', 'wide_leg_jeans', 'straight_jeans', 'carpenter_jeans'
        ];
      case 'dresses':
        return [
          'gowns', 'maxi_dresses', 'evening_dresses', 'party_wear_dresses', 'casual_dresses'
        ];
      case 'kurtis':
        return [
          'kurti_pant_sets'
        ];
      case 'salwar':
        return [
          'anarkali_suits', 'salwar_kameez', 'churidar_sets', 'lehenga_choli'
        ];
      case 'mens-traditional':
        return [
          'sherwani_outfits', 'kurta_pyjama_sets', 'indo_western', 'traditional_outfits'
        ];
      case 'blazers':
        return [
          'formal_suits', 'blazer_trouser_sets', 'tuxedos', 'three_piece_suits',
          'smoking_jackets', 'dinner_jackets', 'power_suits', 'womens_tuxedos', 'western_coord_sets'
        ];
      case 'trousers':
        return [
          'pleated_trousers', 'baggy_chinos', 'palazzo_pants', 'cargo_pants', 'balloon_trousers', 'shirt_trouser_combinations'
        ];
      default:
        return [];
    }
  }, [selectedCategory]);

  const availableBrands = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      if (p.brand) set.add(p.brand);
      if (p.supplierName) set.add(p.supplierName);
    });
    return Array.from(set).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedPriceRange !== 'all') {
        const price = Number(p.price || 0);
        if (selectedPriceRange === 'under-2000' && price >= 2000) return false;
        if (selectedPriceRange === '2000-5000' && (price < 2000 || price > 5000)) return false;
        if (selectedPriceRange === '5000-10000' && (price < 5000 || price > 10000)) return false;
        if (selectedPriceRange === 'above-10000' && price <= 10000) return false;
      }
      return true;
    });
  }, [products, selectedPriceRange]);

  const getCategoryHeader = () => {
    switch (selectedCategory) {
      case 'womens-wear':
        return {
          tag: "Women's Sartorial Collection",
          title: "Women's Fashion Archive",
          desc: 'Curated Indian heritage sarees, royal lehengas, haute couture dresses, tailored trousers, and tops.'
        };
      case 'mens-wear':
        return {
          tag: "Men's Sartorial Collection",
          title: "Men's Fashion Archive",
          desc: 'Bespoke wool tailoring, royal silk sherwanis, Sea Island cotton polos, selvedge denim, and outerwear.'
        };
      case 'traditional-wear':
        return {
          tag: 'Indian Heritage Grandeur',
          title: 'Traditional Couture',
          desc: 'Archival Banarasi weaves, Yeola Paithani sarees, bespoke sherwanis, and royal Nehru jackets.'
        };
      case 'western-wear':
        return {
          tag: 'Modern Atelier Tailoring',
          title: 'Western Apparel',
          desc: 'Sculptural evening dresses, bespoke suits, luxury hoodies, and contemporary denim.'
        };
      case 'accessories':
        return {
          tag: 'Artisanal Accents',
          title: 'Luxury Accessories',
          desc: 'Como 7-fold silk neckties, mulberry silk pocket squares, and gold zari bridal dupattas.'
        };
      case 'sarees':
        return {
          tag: 'Heritage Indian Weaves',
          title: 'Archival Sarees',
          desc: 'Masterpieces in pure Kanjivaram silk, Banarasi antique zari, and gossamer Chanderi weaves.'
        };
      case 'shirts':
        return {
          tag: 'Tailored Silhouettes',
          title: 'Shirts & Tops',
          desc: 'Fine Italian cotton button-downs, gossamer silk blouses, and breezy resort shirts.'
        };
      case 'jeans':
        return {
          tag: 'Japanese Denim Craft',
          title: 'Jeans & Denim',
          desc: 'Artisanal Okayama selvedge denim, wide-leg silhouettes, and relaxed carpenter cuts.'
        };
      case 'dresses':
        return {
          tag: 'Haute Couture Eveningwear',
          title: 'Dresses & Gowns',
          desc: 'Sculptural velvet evening gowns, fluid bias-cut maxi dresses, and cocktail ensembles.'
        };
      case 'kurtis':
        return {
          tag: 'Artisanal Ethnic Ensembles',
          title: 'Kurtis & Ethnic Wear',
          desc: 'Hand-embroidered chanderi kurtis, intricate zardozi motifs, and coordinated pant sets.'
        };
      case 'salwar':
        return {
          tag: 'Royal Court Attire',
          title: 'Salwar Suits & Anarkalis',
          desc: 'Floor-length flared anarkalis, raw silk churidar sets, and bridal lehengas.'
        };
      case 'mens-traditional':
        return {
          tag: 'Heritage Sartorial Grandeur',
          title: "Men's Traditional Wear",
          desc: 'Bespoke hand-embroidered sherwanis, silk kurta pyjama sets, and royal bandhgalas.'
        };
      case 'blazers':
        return {
          tag: 'Bespoke Tailoring',
          title: 'Blazers & Jackets',
          desc: 'Precision Italian virgin wool tailoring, classic black-tie tuxedos, and structured power suits.'
        };
      case 'trousers':
        return {
          tag: 'Modern Sartorial Trousers',
          title: 'Trousers & Tailored Bottoms',
          desc: 'Double-pleated wool trousers, relaxed baggy chinos, and fluid palazzo cuts.'
        };
      default:
        return {
          tag: 'VESTRA Studio Archive',
          title: 'Fashion Product Catalogue',
          desc: 'Browse precision garments calibrated for neural cloth draping and AI virtual try-on.'
        };
    }
  };

  const headerInfo = getCategoryHeader();
  const hasActiveFilters =
    selectedCategory !== 'all' ||
    selectedSubcategory !== 'all' ||
    selectedGender !== 'all' ||
    selectedBrand !== 'all' ||
    selectedSource !== 'all' ||
    selectedPriceRange !== 'all' ||
    onlyTryOnReady ||
    searchQuery.trim().length > 0;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0F172A] text-slate-900 dark:text-[#FFFFFF] py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Page Title & Breadcrumb */}
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <p className="text-[10px] uppercase font-mono tracking-[0.25em] text-[#F5AFAF] font-bold">
            {headerInfo.tag}
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl font-normal text-slate-900 dark:text-[#FFFFFF]">
            {headerInfo.title}
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {headerInfo.desc}
          </p>
        </div>

        {/* Filter and Control Bar */}
        <div className="bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-800 p-5 space-y-4 shadow-xs">
          
          {/* 1. Main Navigation Filters (6 High-Level Department Tabs) */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-100 dark:border-slate-800">
            {navTabs.map((tab) => {
              const isSelected = selectedCategory === tab.slug || (tab.slug === 'all' && selectedCategory === 'all');
              const count = tab.productCount;
              return (
                <button
                  key={tab.id || tab.slug}
                  onClick={() => handleCategoryChange(tab.slug)}
                  className={`px-4 py-2 text-xs uppercase tracking-wider font-semibold whitespace-nowrap transition-all rounded flex items-center space-x-1.5 ${
                    isSelected
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isSelected ? 'text-[#F5AFAF]' : 'text-slate-400'}`} />
                  <span>{tab.name}</span>
                  {typeof count === 'number' && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                        isSelected
                          ? 'bg-white/20 text-white dark:bg-black/20 dark:text-black'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 2. Dynamic Subcategory Filters (Based on Active Navigation Tab) */}
          {currentSubcategories && currentSubcategories.length > 0 && (
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none text-xs">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 whitespace-nowrap mr-1 flex items-center space-x-1">
                <span>Subcategory:</span>
              </span>
              {currentSubcategories.map((sub) => {
                const subSlug = typeof sub === 'string' ? sub : sub.slug;
                const subName = typeof sub === 'string' ? sub.replace(/_/g, ' ') : sub.name;
                const isSubSelected = selectedSubcategory === subSlug;
                return (
                  <button
                    key={subSlug}
                    onClick={() => handleSubcategoryChange(subSlug)}
                    className={`px-2.5 py-1 text-[10px] uppercase font-mono tracking-wider font-medium whitespace-nowrap rounded transition-colors ${
                      isSubSelected
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-xs font-semibold'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {subName}
                  </button>
                );
              })}
            </div>
          )}

          {/* 3. Department Quick-Select Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px] pt-1">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 whitespace-nowrap mr-1">
              Departments:
            </span>
            {categories.filter((c) => c.slug !== 'all').map((dept) => {
              const isDeptActive = selectedCategory === dept.slug;
              return (
                <button
                  key={dept.id || dept.slug}
                  onClick={() => handleCategoryChange(dept.slug)}
                  className={`px-2 py-0.5 text-[9px] uppercase font-mono tracking-wider whitespace-nowrap rounded-sm transition-all ${
                    isDeptActive
                      ? 'bg-rose-50 text-rose-900 border border-rose-300 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800 font-semibold'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {dept.name} {typeof dept.productCount === 'number' && `(${dept.productCount})`}
                </button>
              );
            })}
          </div>

          {/* Multi-Source Origin Bar */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 whitespace-nowrap">
              Catalogue Source:
            </span>
            {[
              { id: 'all', label: 'All Sources' },
              { id: 'atelier', label: 'VESTRA Atelier' },
              { id: 'flipkart', label: 'Flipkart' },
              { id: 'myntra', label: 'Myntra' },
              { id: 'amazon', label: 'Amazon' },
              { id: 'supplier_csv', label: 'Suppliers & Mills' },
              { id: 'manual', label: 'Boutiques' }
            ].map((src) => (
              <button
                key={src.id}
                onClick={() => setSelectedSource(src.id)}
                className={`px-2.5 py-1 text-[10px] uppercase font-mono tracking-wider font-semibold rounded transition-colors ${
                  selectedSource === src.id
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                {src.label}
              </button>
            ))}

            {/* Brand / Supplier Filter */}
            {availableBrands.length > 0 && (
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] text-slate-800 dark:text-slate-200 px-2 py-1 uppercase font-mono tracking-wider font-medium rounded ml-auto"
              >
                <option value="all">All Brands / Suppliers ({availableBrands.length})</option>
                {availableBrands.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            )}

            {/* Price Filter */}
            <select
              value={selectedPriceRange}
              onChange={(e) => setSelectedPriceRange(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] text-slate-800 dark:text-slate-200 px-2 py-1 uppercase font-mono tracking-wider font-medium rounded"
            >
              <option value="all">All Prices</option>
              <option value="under-2000">Under ₹2,000</option>
              <option value="2000-5000">₹2,000 – ₹5,000</option>
              <option value="5000-10000">₹5,000 – ₹10,000</option>
              <option value="above-10000">Above ₹10,000</option>
            </select>
          </div>

          {/* Search, Gender, Try-On Toggle & Sort Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            
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
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300'
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
                    ? 'bg-rose-50 text-rose-900 border-rose-300 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-rose-300'
                }`}
              >
                <Sparkles className="w-3 h-3 text-[#F5AFAF]" />
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
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-[#FFFFFF] pl-8 pr-8 py-2 rounded focus:outline-none focus:border-[#F5AFAF] shadow-xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-[#FFFFFF] px-3 py-2 uppercase font-mono tracking-wider font-medium rounded focus:outline-none focus:border-[#F5AFAF] shadow-xs"
              >
                <option value="featured">Featured First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="newest">Newest Arrivals</option>
                <option value="name">Name: A to Z</option>
              </select>

            </div>

          </div>

          {/* Results count & Reset Bar */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center space-x-3">
              <span className="font-mono">
                Showing {filteredProducts.length} items
              </span>
              {hasActiveFilters && (
                <button
                  onClick={handleResetAllFilters}
                  className="text-[11px] font-mono text-[#F5AFAF] hover:underline flex items-center space-x-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reset All Filters</span>
                </button>
              )}
            </div>
            <span className="text-[11px] font-mono text-slate-600 dark:text-slate-300 flex items-center space-x-1">
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
          <div className="text-center py-16 space-y-4 bg-[#FBEFEF] dark:bg-[#1E293B] border border-rose-200 dark:border-rose-900 rounded">
            <p className="text-sm text-rose-600 dark:text-rose-400 font-mono">{error}</p>
            <button
              onClick={handleResetAllFilters}
              className="px-5 py-2.5 bg-slate-900 text-white dark:bg-white dark:text-black text-xs uppercase tracking-wider font-semibold rounded shadow-xs"
            >
              Reset Filters & Reload
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-[#FBEFEF] dark:bg-[#1E293B] border border-[#F9DFDF] dark:border-slate-800 space-y-4 rounded">
            <Sparkles className="w-10 h-10 text-[#F5AFAF] mx-auto animate-pulse" />
            <h3 className="font-serif text-2xl text-slate-900 dark:text-[#FFFFFF]">
              {selectedCategory !== 'all'
                ? `No garments found in ${categories.find(c => c.slug === selectedCategory)?.name || 'this category'}`
                : 'No garments match your filters'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              We couldn't find any active garments matching your selected criteria. Try selecting another category or resetting your filters.
            </p>
            <button
              onClick={handleResetAllFilters}
              className="px-6 py-2.5 bg-slate-900 text-white dark:bg-white dark:text-black text-xs uppercase tracking-widest font-semibold rounded shadow-sm hover:opacity-90 transition-opacity"
            >
              View All Garments
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
