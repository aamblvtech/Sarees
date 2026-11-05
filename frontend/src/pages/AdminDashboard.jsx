import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Package, Plus, Edit2, Trash2, Search, Filter, LogOut, Check,
  Upload, Sparkles, RefreshCw, AlertCircle, Eye, EyeOff, Layers,
  ExternalLink, Database, ShieldCheck, X
} from 'lucide-react';
import adminService from '../services/adminService';

export default function AdminDashboard() {
  const navigate = useNavigate();

  // State
  const [admin, setAdmin] = useState(null);
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedGender, setSelectedGender] = useState('all');
  const [selectedCompatibility, setSelectedCompatibility] = useState('all');
  const [selectedStock, setSelectedStock] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedReview, setSelectedReview] = useState('all');

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Product Form State
  const [formData, setFormData] = useState({
    name: '',
    brand: 'VESTRA',
    categoryId: '',
    subcategory: 'sarees',
    gender: 'women',
    garmentType: 'saree',
    tryonCompatibility: 'supported',
    stockStatus: 'in_stock',
    price: '',
    originalPrice: '',
    description: '',
    material: '82% Mulberry Silk, 18% Rayon Velvet',
    fit: 'Tailored architectural fit',
    careInstructions: 'Specialist dry clean only',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    primaryImageUrl: '',
    tryonImageUrl: '',
    isActive: true,
    isFeatured: false,
    color: '',
    needsAdminReview: false,
    discountPercent: ''
  });

  // Image Uploading States
  const [uploadingPrimary, setUploadingPrimary] = useState(false);
  const [uploadingTryon, setUploadingTryon] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Category Form State
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatImage, setNewCatImage] = useState('');
  const [catSubmitting, setCatSubmitting] = useState(false);

  // Load Dashboard Data
  useEffect(() => {
    if (!adminService.isAuthenticated()) {
      navigate('/admin/login');
      return;
    }

    setAdmin(adminService.getCurrentAdmin());
    loadAllData();
  }, [navigate]);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, prodsData, catsData] = await Promise.all([
        adminService.getStats(),
        adminService.getProducts(),
        adminService.getCategories()
      ]);
      setStats(statsData);
      setProducts(prodsData);
      setCategories(catsData);
    } catch (err) {
      if (err.response?.status === 401) {
        adminService.logout();
        navigate('/admin/login');
      } else {
        setError('Failed to fetch admin data from PostgreSQL database.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    adminService.logout();
    navigate('/admin/login');
  };

  // Open Modal for New Product
  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      brand: 'VESTRA',
      categoryId: categories[0]?.id || '',
      subcategory: 'sarees',
      gender: 'women',
      garmentType: 'saree',
      tryonCompatibility: 'supported',
      stockStatus: 'in_stock',
      price: '',
      originalPrice: '',
      description: '',
      material: '100% Certified Mulberry Silk / Fine Wool Blend',
      fit: 'Precision tailored silhouette',
      careInstructions: 'Specialist dry clean only',
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
      primaryImageUrl: '',
      tryonImageUrl: '',
      isActive: true,
      isFeatured: false,
      color: '',
      needsAdminReview: false,
      discountPercent: ''
    });
    setFormError(null);
    setIsProductModalOpen(true);
  };

  // Open Modal for Edit Product
  const handleOpenEditModal = (prod) => {
    setEditingProduct(prod);
    setFormData({
      name: prod.name,
      brand: prod.brand || 'VESTRA',
      categoryId: prod.categoryId || prod.category_id || '',
      subcategory: prod.subcategory || 'sarees',
      gender: prod.gender || 'women',
      garmentType: prod.garmentType || prod.garment_type || 'upper_body',
      tryonCompatibility: prod.tryonCompatibility || prod.tryon_compatibility || 'supported',
      stockStatus: prod.stockStatus || prod.stock_status || 'in_stock',
      price: prod.price,
      originalPrice: prod.originalPrice || '',
      description: prod.description,
      material: prod.material || '',
      fit: prod.fit || '',
      careInstructions: prod.careInstructions || '',
      sizes: Array.isArray(prod.sizes) ? prod.sizes : ['XS', 'S', 'M', 'L', 'XL'],
      primaryImageUrl: prod.primaryImage || prod.primary_image_url || '',
      tryonImageUrl: prod.tryonImage || prod.tryon_image_url || prod.primaryImage || '',
      isActive: prod.isActive ?? prod.is_active ?? true,
      isFeatured: prod.isFeatured ?? prod.is_featured ?? false,
      color: prod.color || '',
      needsAdminReview: prod.needsAdminReview ?? prod.needs_admin_review ?? false,
      discountPercent: prod.discountPercent ?? prod.discount_percent ?? ''
    });
    setFormError(null);
    setIsProductModalOpen(true);
  };

  // File Upload Handlers
  const handleImageFileUpload = async (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (field === 'primary') setUploadingPrimary(true);
    if (field === 'tryon') setUploadingTryon(true);

    try {
      const res = await adminService.uploadImage(file);
      if (field === 'primary') {
        setFormData((prev) => ({
          ...prev,
          primaryImageUrl: res.url,
          tryonImageUrl: prev.tryonImageUrl || res.url
        }));
      } else {
        setFormData((prev) => ({ ...prev, tryonImageUrl: res.url }));
      }
    } catch (err) {
      alert('Upload failed: ' + (err.response?.data?.error || err.message));
    } finally {
      if (field === 'primary') setUploadingPrimary(false);
      if (field === 'tryon') setUploadingTryon(false);
    }
  };

  // Save Product (Create or Update)
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    try {
      if (!formData.name || !formData.price || !formData.description) {
        throw new Error('Please fill in Name, Price, and Description.');
      }

      if (editingProduct) {
        await adminService.updateProduct(editingProduct.id, formData);
      } else {
        await adminService.createProduct(formData);
      }

      setIsProductModalOpen(false);
      await loadAllData();
    } catch (err) {
      setFormError(err.response?.data?.error || err.message || 'Error saving product.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete Product
  const handleDeleteProduct = async (id) => {
    try {
      await adminService.deleteProduct(id);
      setDeleteConfirmId(null);
      await loadAllData();
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.error || err.message));
    }
  };

  // Add Category
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName) return;

    setCatSubmitting(true);
    try {
      await adminService.createCategory({
        name: newCatName,
        description: newCatDesc,
        imageUrl: newCatImage
      });
      setNewCatName('');
      setNewCatDesc('');
      setNewCatImage('');
      setIsCategoryModalOpen(false);
      await loadAllData();
    } catch (err) {
      alert('Failed to create category: ' + (err.response?.data?.error || err.message));
    } finally {
      setCatSubmitting(false);
    }
  };

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.subcategory?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' ||
      p.categoryId?.toString() === selectedCategory ||
      p.categoryName?.toLowerCase() === selectedCategory.toLowerCase();

    const matchesGender =
      selectedGender === 'all' ||
      p.gender?.toLowerCase() === selectedGender.toLowerCase() ||
      p.gender?.toLowerCase() === 'unisex';

    const matchesCompatibility =
      selectedCompatibility === 'all' ||
      (p.tryonCompatibility || p.tryon_compatibility)?.toLowerCase() === selectedCompatibility.toLowerCase();

    const matchesStock =
      selectedStock === 'all' ||
      (p.stockStatus || p.stock_status)?.toLowerCase() === selectedStock.toLowerCase();

    const matchesStatus =
      selectedStatus === 'all' ||
      (selectedStatus === 'active' && (p.isActive ?? p.is_active)) ||
      (selectedStatus === 'inactive' && !(p.isActive ?? p.is_active));

    const matchesReview =
      selectedReview === 'all' ||
      (selectedReview === 'needs_review' && (p.needsAdminReview ?? p.needs_admin_review)) ||
      (selectedReview === 'verified' && !(p.needsAdminReview ?? p.needs_admin_review));

    return (
      matchesSearch &&
      matchesCategory &&
      matchesGender &&
      matchesCompatibility &&
      matchesStock &&
      matchesStatus &&
      matchesReview
    );
  });

  return (
    <div className="min-h-screen bg-white dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 py-8 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Atelier Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-[#F9DFDF] dark:border-slate-800 gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-serif text-2xl sm:text-3xl font-semibold tracking-wider text-slate-900 dark:text-white">
                VESTRA
              </span>
              <span className="text-[10px] tracking-widest uppercase bg-[#000000] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#000000] px-2 py-0.5 font-medium rounded-none">
                Atelier Admin Console
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Signed in as <strong>{admin?.name || 'Administrator'}</strong> ({admin?.email}) &bull; Role: <span className="uppercase text-[#F5AFAF] font-semibold">{admin?.role || 'superadmin'}</span>
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              to="/catalogue"
              target="_blank"
              className="px-3.5 py-2 border border-[#F9DFDF] dark:border-slate-800 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 text-xs uppercase tracking-wider font-semibold inline-flex items-center space-x-1.5 transition-colors"
            >
              <span>View Public Boutique</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#F5AFAF]" />
            </Link>

            <button
              onClick={handleLogout}
              className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-[#000000] dark:border-white hover:bg-[#000000] hover:text-white dark:hover:bg-white dark:hover:text-black text-slate-900 dark:text-white text-xs uppercase tracking-wider font-semibold inline-flex items-center space-x-1.5 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Overview Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          <div className="bg-white dark:bg-slate-900 p-5 border border-[#F9DFDF] dark:border-slate-800 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-[10px] uppercase tracking-widest font-semibold">Total Garments</span>
              <Package className="w-4 h-4 text-[#F5AFAF]" />
            </div>
            <p className="font-serif text-3xl font-semibold text-slate-900 dark:text-white">
              {stats?.totalProducts ?? products.length}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {stats?.activeProducts ?? products.filter(p => p.isActive ?? p.is_active).length} active in public catalogue
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 border border-[#F9DFDF] dark:border-slate-800 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-[10px] uppercase tracking-widest font-semibold">Try-On Silhouettes</span>
              <Sparkles className="w-4 h-4 text-[#F5AFAF]" />
            </div>
            <p className="font-serif text-3xl font-semibold text-slate-900 dark:text-white">
              {stats?.tryonReadyProducts ?? products.filter(p => p.tryonImage).length}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Configured with drape warping assets
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 border border-[#F9DFDF] dark:border-slate-800 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-[10px] uppercase tracking-widest font-semibold">Capsule Categories</span>
              <Layers className="w-4 h-4 text-[#F5AFAF]" />
            </div>
            <p className="font-serif text-3xl font-semibold text-slate-900 dark:text-white">
              {categories.length}
            </p>
            <p className="text-[11px] text-[#F5AFAF] cursor-pointer hover:underline" onClick={() => setIsCategoryModalOpen(true)}>
              + Add or manage categories &rarr;
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 border border-[#F9DFDF] dark:border-slate-800 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-[10px] uppercase tracking-widest font-semibold">Database Engine</span>
              <Database className="w-4 h-4 text-[#F5AFAF]" />
            </div>
            <div className="flex items-center space-x-2 pt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-sm font-semibold text-slate-900 dark:text-white">PostgreSQL</p>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate font-mono">
              Driver: pg (parameterized SQL)
            </p>
          </div>

        </div>

        {/* Action Header & Search */}
        <div className="bg-white dark:bg-slate-900 p-5 border border-[#F9DFDF] dark:border-slate-800 shadow-sm space-y-4">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl text-slate-900 dark:text-white">
                Garment Inventory Management
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Create, curate, and update luxury pieces stored in the PostgreSQL database.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsCategoryModalOpen(true)}
                className="px-4 py-2.5 border border-[#000000] dark:border-white text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 text-xs uppercase tracking-wider font-semibold transition-colors flex items-center space-x-1.5"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Categories</span>
              </button>

              <button
                onClick={handleOpenAddModal}
                className="px-5 py-2.5 bg-[#000000] dark:bg-[#FFFFFF] text-white dark:text-black hover:opacity-90 text-xs uppercase tracking-widest font-semibold transition-all shadow flex items-center space-x-2"
              >
                <Plus className="w-4 h-4 text-[#F5AFAF]" />
                <span>Add New Garment</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 pt-3 border-t border-[#F9DFDF] dark:border-slate-800">
            
            <div className="relative lg:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name, SKU, subcategory..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 text-xs text-slate-900 dark:text-white pl-9 pr-3 py-2 focus:outline-none focus:border-[#000000] dark:focus:border-white"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 text-xs text-slate-900 dark:text-white px-3 py-2 uppercase tracking-wider focus:outline-none focus:border-[#000000] dark:focus:border-white"
            >
              <option value="all">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
              className="bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 text-xs text-slate-900 dark:text-white px-3 py-2 uppercase tracking-wider focus:outline-none focus:border-[#000000] dark:focus:border-white"
            >
              <option value="all">All Genders</option>
              <option value="women">Women</option>
              <option value="men">Men</option>
              <option value="unisex">Unisex</option>
            </select>

            <select
              value={selectedCompatibility}
              onChange={(e) => setSelectedCompatibility(e.target.value)}
              className="bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 text-xs text-slate-900 dark:text-white px-3 py-2 uppercase tracking-wider focus:outline-none focus:border-[#000000] dark:focus:border-white"
            >
              <option value="all">All Compatibility</option>
              <option value="supported">AI Try-On Ready</option>
              <option value="awaiting_saree_engine">Awaiting Saree Drape Engine</option>
              <option value="unsupported">Unsupported / Accessories</option>
            </select>

            <select
              value={selectedStock}
              onChange={(e) => setSelectedStock(e.target.value)}
              className="bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 text-xs text-slate-900 dark:text-white px-3 py-2 uppercase tracking-wider focus:outline-none focus:border-[#000000] dark:focus:border-white"
            >
              <option value="all">All Stock Statuses</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>

            <select
              value={selectedReview}
              onChange={(e) => setSelectedReview(e.target.value)}
              className="bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 text-xs text-slate-900 dark:text-white px-3 py-2 uppercase tracking-wider focus:outline-none focus:border-[#000000] dark:focus:border-white"
            >
              <option value="all">All Review Status</option>
              <option value="needs_review">Needs Admin Review ⚠️</option>
              <option value="verified">Verified Items</option>
            </select>

          </div>

        </div>

        {/* Product Table */}
        <div className="bg-white dark:bg-slate-900 border border-[#F9DFDF] dark:border-slate-800 shadow-sm overflow-hidden">
          
          {loading ? (
            <div className="p-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#F5AFAF]" />
              <p className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">Querying PostgreSQL Inventory...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-16 text-center space-y-4">
              <Package className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="font-serif text-2xl text-slate-900 dark:text-white">No Garments Found</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {products.length === 0
                  ? 'Your PostgreSQL database has no products yet. Click "Add New Garment" to create your first item.'
                  : 'No garments matched your search and filter criteria.'}
              </p>
              {products.length === 0 && (
                <button
                  onClick={handleOpenAddModal}
                  className="px-6 py-2.5 bg-[#000000] dark:bg-[#FFFFFF] text-white dark:text-black text-xs uppercase tracking-widest font-semibold hover:opacity-90"
                >
                  Create First Product
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white border-b border-[#F9DFDF] dark:border-slate-800 text-[10px] uppercase tracking-widest">
                    <th className="py-3.5 px-4 font-semibold">Preview</th>
                    <th className="py-3.5 px-4 font-semibold">Title & SKU</th>
                    <th className="py-3.5 px-4 font-semibold">Taxonomy</th>
                    <th className="py-3.5 px-4 font-semibold">Audience & Type</th>
                    <th className="py-3.5 px-4 font-semibold">Try-On Engine</th>
                    <th className="py-3.5 px-4 font-semibold">Stock</th>
                    <th className="py-3.5 px-4 font-semibold">Price</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F9DFDF] dark:divide-slate-800 text-xs">
                  {filteredProducts.map((p) => {
                    const active = p.isActive ?? p.is_active;
                    const img = p.primaryImage || p.primary_image_url;
                    const subcat = p.subcategory || 'sarees';
                    const gender = p.gender || 'women';
                    const gType = p.garmentType || p.garment_type || 'upper_body';
                    const compat = p.tryonCompatibility || p.tryon_compatibility || 'supported';
                    const stock = p.stockStatus || p.stock_status || 'in_stock';

                    return (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        
                        {/* Thumbnail */}
                        <td className="py-3 px-4">
                          <div className="w-12 h-16 bg-slate-100 dark:bg-slate-800 border border-[#F9DFDF] dark:border-slate-800 overflow-hidden flex-shrink-0">
                            {img ? (
                              <img src={img} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[9px] text-slate-400">
                                No Img
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Title & SKU */}
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <p className="font-serif font-medium text-sm text-slate-900 dark:text-white hover:text-[#F5AFAF] transition-colors">
                              {p.name}
                            </p>
                            {(p.needsAdminReview ?? p.needs_admin_review) && (
                              <span className="px-1.5 py-0.2 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 text-[9px] uppercase font-bold tracking-wider">
                                Needs Review
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <span className="font-mono">{p.sku}</span>
                            <span>&bull;</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{p.brand || 'VESTRA'}</span>
                            {p.color && (
                              <>
                                <span>&bull;</span>
                                <span className="text-slate-600 dark:text-slate-300">Color: {p.color}</span>
                              </>
                            )}
                          </div>
                        </td>

                        {/* Category & Subcategory */}
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-900 dark:text-white">{p.categoryName || 'Apparel'}</p>
                          <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-[#F9DFDF] dark:border-slate-700 text-[9px] uppercase tracking-wider text-slate-600 dark:text-slate-300 font-semibold">
                            {subcat.replace('_', ' ')}
                          </span>
                        </td>

                        {/* Audience & Type */}
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <span className="inline-block px-1.5 py-0.2 text-[9px] uppercase font-semibold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 border border-[#F9DFDF] dark:border-slate-700">
                              {gender}
                            </span>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">
                              {gType.replace('_', ' ')}
                            </p>
                          </div>
                        </td>

                        {/* Try-On Compatibility Badge */}
                        <td className="py-3 px-4">
                          {compat === 'supported' ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[10px] font-semibold">
                              <Sparkles className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                              <span>AI Ready</span>
                            </span>
                          ) : compat === 'awaiting_saree_engine' ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800 text-[10px] font-semibold">
                              <Layers className="w-2.5 h-2.5 text-purple-600 dark:text-purple-400" />
                              <span>Awaiting Saree AI</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 text-[10px] font-semibold">
                              <span>Catalog Only</span>
                            </span>
                          )}
                        </td>

                        {/* Stock Status */}
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 text-[10px] uppercase font-semibold ${
                            stock === 'in_stock'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : stock === 'low_stock'
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                          }`}>
                            {stock.replace('_', ' ')}
                          </span>
                        </td>

                        {/* Price */}
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                          <div>
                            <span>{p.currency === 'INR' ? '₹' : '$'}{p.price}</span>
                            {p.originalPrice && (
                              <span className="line-through text-slate-400 text-[10px] ml-1.5 font-normal">
                                {p.currency === 'INR' ? '₹' : '$'}{p.originalPrice}
                              </span>
                            )}
                          </div>
                          {p.discountPercent && (
                            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                              {p.discountPercent}% OFF
                            </span>
                          )}
                        </td>

                        {/* Active Status */}
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 text-[10px] uppercase font-semibold ${
                            active
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                          }`}>
                            {active ? 'Active' : 'Draft'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Edit Garment"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          
                          {deleteConfirmId === p.id ? (
                            <div className="inline-flex items-center space-x-1 bg-red-50 dark:bg-red-950/50 p-1 border border-red-300 dark:border-red-800">
                              <span className="text-[10px] text-red-700 dark:text-red-300">Confirm?</span>
                              <button
                                onClick={() => handleDeleteProduct(p.id)}
                                className="px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-semibold"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-1 py-0.5 text-slate-500 dark:text-slate-400 text-[10px]"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(p.id)}
                              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                              title="Delete Garment"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>

      </div>

      {/* ============================================================== */}
      {/* ADD / EDIT PRODUCT MODAL */}
      {/* ============================================================== */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-[#F9DFDF] dark:border-slate-800 max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#F9DFDF] dark:border-slate-800">
              <div>
                <h3 className="font-serif text-2xl text-slate-900 dark:text-white">
                  {editingProduct ? 'Edit Garment Record' : 'Register New Luxury Garment'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Data will be written directly to PostgreSQL database via parameterized SQL.
                </p>
              </div>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveProduct} className="p-6 overflow-y-auto space-y-6">
              
              {formError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Title & Brand */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs uppercase tracking-wider font-semibold text-slate-900 dark:text-white">
                    Garment Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. The Midnight Satin Tailored Blazer"
                    className="w-full bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 text-xs p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-[#000000] dark:focus:border-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider font-semibold text-slate-900 dark:text-white">
                    Brand *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="VESTRA"
                    className="w-full bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 text-xs p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-[#000000] dark:focus:border-white"
                  />
                </div>
              </div>

              {/* Category, Subcategory, Gender & Garment Type */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider font-semibold text-slate-900 dark:text-white">
                    Category *
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 text-xs p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-[#000000] dark:focus:border-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider font-semibold text-slate-900 dark:text-white">
                    Subcategory *
                  </label>
                  <select
                    value={formData.subcategory}
                    onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                    className="w-full bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 text-xs p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-[#000000] dark:focus:border-white"
                  >
                    <optgroup label="Saree Weaves">
                      <option value="kanjivaram">Kanjivaram Saree</option>
                      <option value="banarasi">Banarasi Saree</option>
                      <option value="chanderi">Chanderi Saree</option>
                      <option value="pochampally">Pochampally Saree</option>
                      <option value="gadwal">Gadwal Saree</option>
                      <option value="uppada">Uppada Saree</option>
                      <option value="paithani">Paithani Saree</option>
                      <option value="organza">Organza Saree</option>
                      <option value="cotton">Cotton Saree</option>
                      <option value="bridal">Bridal Saree</option>
                      <option value="designer_party">Designer Party-Wear Saree</option>
                      <option value="traditional_handloom">Traditional Handloom Saree</option>
                    </optgroup>
                    <optgroup label="Women's Outfits">
                      <option value="anarkali_suits">Anarkali Suit Set</option>
                      <option value="salwar_kameez">Salwar Kameez</option>
                      <option value="churidar_sets">Churidar Set</option>
                      <option value="kurti_pant_sets">Kurti & Pant Set</option>
                      <option value="lehenga_choli">Lehenga Choli</option>
                      <option value="gowns">Gown</option>
                      <option value="maxi_dresses">Maxi Dress</option>
                      <option value="evening_dresses">Evening Dress</option>
                      <option value="party_wear_dresses">Party-Wear Dress</option>
                      <option value="casual_dresses">Casual Dress</option>
                      <option value="western_coord_sets">Western Co-ord Set</option>
                      <option value="jumpsuits">Jumpsuit</option>
                    </optgroup>
                    <optgroup label="Men's Outfits">
                      <option value="formal_suits">Full Formal Suit</option>
                      <option value="blazer_trouser_sets">Blazer & Trouser Set</option>
                      <option value="kurta_pyjama_sets">Kurta Pyjama Set</option>
                      <option value="sherwani_outfits">Sherwani Outfit</option>
                      <option value="indo_western">Indo-Western Ensemble</option>
                      <option value="shirt_trouser_combinations">Shirt & Trouser Set</option>
                      <option value="casual_coords">Casual Co-ord Set</option>
                      <option value="traditional_outfits">Traditional Ceremonial Set</option>
                    </optgroup>
                    <optgroup label="Accessories">
                      <option value="belts">Leather Belt</option>
                      <option value="shawls">Pashmina Stole</option>
                    </optgroup>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider font-semibold text-slate-900 dark:text-white">
                    Target Gender *
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 text-xs p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-[#000000] dark:focus:border-white"
                  >
                    <option value="women">Women</option>
                    <option value="men">Men</option>
                    <option value="unisex">Unisex</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider font-semibold text-slate-900 dark:text-white">
                    Garment Type *
                  </label>
                  <select
                    value={formData.garmentType}
                    onChange={(e) => setFormData({ ...formData, garmentType: e.target.value })}
                    className="w-full bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 text-xs p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-[#000000] dark:focus:border-white"
                  >
                    <option value="upper_body">Upper Body (Tops, Shirts, Blazers, Kurtas)</option>
                    <option value="lower_body">Lower Body (Trousers, Jeans, Skirts)</option>
                    <option value="full_body">Full Body (Gowns, Dresses, Salwar Suits)</option>
                    <option value="saree">Saree (6-Yard Unstitched Handloom)</option>
                    <option value="accessory">Accessory (Belts, Shawls, Jewelry)</option>
                  </select>
                </div>
              </div>

              {/* Try-On Compatibility, Stock Status & Pricing */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider font-semibold text-slate-900 dark:text-white">
                    Try-On Engine Compatibility *
                  </label>
                  <select
                    value={formData.tryonCompatibility}
                    onChange={(e) => setFormData({ ...formData, tryonCompatibility: e.target.value })}
                    className="w-full bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 text-xs p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-[#000000] dark:focus:border-white"
                  >
                    <option value="supported">Supported (AI Try-On Ready)</option>
                    <option value="awaiting_saree_engine">Awaiting Saree Drape Engine</option>
                    <option value="unsupported">Unsupported / Accessories Only</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider font-semibold text-slate-900 dark:text-white">
                    Stock Status *
                  </label>
                  <select
                    value={formData.stockStatus}
                    onChange={(e) => setFormData({ ...formData, stockStatus: e.target.value })}
                    className="w-full bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 text-xs p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-[#000000] dark:focus:border-white"
                  >
                    <option value="in_stock">In Stock</option>
                    <option value="low_stock">Low Stock</option>
                    <option value="out_of_stock">Out of Stock</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider font-semibold text-slate-900 dark:text-white">
                    Retail Price ($ USD) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="1850"
                    className="w-full bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 text-xs p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-[#000000] dark:focus:border-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider font-semibold text-slate-900 dark:text-white">
                    Original Price ($ USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.originalPrice}
                    onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                    placeholder="2200"
                    className="w-full bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 text-xs p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-[#000000] dark:focus:border-white"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wider font-semibold text-slate-900 dark:text-white">
                  Editorial Description *
                </label>
                <textarea
                  rows={3}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Artisanal description of drape, cut, and occasion..."
                  className="w-full bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 text-xs p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-[#000000] dark:focus:border-white"
                />
              </div>

              {/* Material & Fit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider font-semibold text-slate-900 dark:text-white">
                    Fabric Composition
                  </label>
                  <input
                    type="text"
                    value={formData.material}
                    onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                    placeholder="100% Grade 6A Mulberry Silk"
                    className="w-full bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 text-xs p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-[#000000] dark:focus:border-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider font-semibold text-slate-900 dark:text-white">
                    Silhouette & Fit
                  </label>
                  <input
                    type="text"
                    value={formData.fit}
                    onChange={(e) => setFormData({ ...formData, fit: e.target.value })}
                    placeholder="True to size; fitted shoulders"
                    className="w-full bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 text-xs p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-[#000000] dark:focus:border-white"
                  />
                </div>
              </div>

              {/* Color & Discount Percentage */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider font-semibold text-slate-900 dark:text-white">
                    Colour Palette
                  </label>
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="e.g. Royal Blue, Magenta Pink"
                    className="w-full bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 text-xs p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-[#000000] dark:focus:border-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider font-semibold text-slate-900 dark:text-white">
                    Discount Percentage (%)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={formData.discountPercent}
                    onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value })}
                    placeholder="e.g. 25, 80"
                    className="w-full bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 text-xs p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-[#000000] dark:focus:border-white"
                  />
                </div>
              </div>

              {/* Size Multi-Select */}
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider font-semibold text-slate-900 dark:text-white block">
                  Available Sizes
                </label>
                <div className="flex space-x-2">
                  {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((s) => {
                    const checked = formData.sizes.includes(s);
                    return (
                      <button
                        type="button"
                        key={s}
                        onClick={() => {
                          const updated = checked
                            ? formData.sizes.filter((item) => item !== s)
                            : [...formData.sizes, s];
                          setFormData({ ...formData, sizes: updated });
                        }}
                        className={`px-3 py-1.5 text-xs font-semibold uppercase border transition-all ${
                          checked
                            ? 'bg-[#000000] dark:bg-[#FFFFFF] text-white dark:text-black border-[#000000] dark:border-[#FFFFFF]'
                            : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-[#F9DFDF] dark:border-slate-800 hover:border-slate-400'
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Image Uploads: Primary & Try-On */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-[#F9DFDF] dark:border-slate-800">
                
                {/* Primary Image */}
                <div className="space-y-3">
                  <label className="text-xs uppercase tracking-wider font-semibold text-slate-900 dark:text-white block">
                    Product Photograph
                  </label>

                  <div className="flex items-center space-x-3">
                    <label className="cursor-pointer px-4 py-2 bg-white dark:bg-slate-950 border border-[#000000] dark:border-white text-slate-900 dark:text-white text-xs uppercase tracking-wider font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-2">
                      <Upload className="w-3.5 h-3.5 text-[#F5AFAF]" />
                      <span>{uploadingPrimary ? 'Uploading...' : 'Upload Image File'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageFileUpload(e, 'primary')}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <input
                    type="url"
                    value={formData.primaryImageUrl}
                    onChange={(e) => setFormData({ ...formData, primaryImageUrl: e.target.value })}
                    placeholder="Or enter image URL (https://...)"
                    className="w-full bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 text-xs p-2 text-slate-900 dark:text-white"
                  />

                  {formData.primaryImageUrl && (
                    <div className="w-20 h-28 bg-slate-100 dark:bg-slate-800 border border-[#F9DFDF] dark:border-slate-800 overflow-hidden">
                      <img src={formData.primaryImageUrl} alt="Primary Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                {/* Try-On Garment Image */}
                <div className="space-y-3">
                  <label className="text-xs uppercase tracking-wider font-semibold text-slate-900 dark:text-white block">
                    Virtual Try-On Garment Asset
                  </label>

                  <div className="flex items-center space-x-3">
                    <label className="cursor-pointer px-4 py-2 bg-white dark:bg-slate-950 border border-[#000000] dark:border-white text-slate-900 dark:text-white text-xs uppercase tracking-wider font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-2">
                      <Upload className="w-3.5 h-3.5 text-[#F5AFAF]" />
                      <span>{uploadingTryon ? 'Uploading...' : 'Upload Try-On Asset'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageFileUpload(e, 'tryon')}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <input
                    type="url"
                    value={formData.tryonImageUrl}
                    onChange={(e) => setFormData({ ...formData, tryonImageUrl: e.target.value })}
                    placeholder="Or enter try-on URL"
                    className="w-full bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 text-xs p-2 text-slate-900 dark:text-white"
                  />

                  {formData.tryonImageUrl && (
                    <div className="w-20 h-28 bg-slate-100 dark:bg-slate-800 border border-[#F9DFDF] dark:border-slate-800 overflow-hidden">
                      <img src={formData.tryonImageUrl} alt="Tryon Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

              </div>

              {/* Status Toggles */}
              <div className="flex space-x-6 pt-4 border-t border-[#F9DFDF] dark:border-slate-800">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-[#000000] focus:ring-[#F5AFAF]"
                  />
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">Active in Boutique Catalogue</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                    className="w-4 h-4 text-[#000000] focus:ring-[#F5AFAF]"
                  />
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">Featured on Homepage</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.needsAdminReview}
                    onChange={(e) => setFormData({ ...formData, needsAdminReview: e.target.checked })}
                    className="w-4 h-4 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                    Flag for Admin Review (Incomplete / Truncated)
                  </span>
                </label>
              </div>

              {/* Submit Action */}
              <div className="pt-4 border-t border-[#F9DFDF] dark:border-slate-800 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-5 py-2.5 border border-[#F9DFDF] dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-6 py-2.5 bg-[#000000] dark:bg-[#FFFFFF] text-white dark:text-black hover:opacity-90 text-xs uppercase tracking-widest font-semibold transition-all shadow disabled:opacity-50"
                >
                  {formSubmitting ? 'Saving to Database...' : editingProduct ? 'Update Garment' : 'Save Garment'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* CATEGORY MANAGEMENT MODAL */}
      {/* ============================================================== */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-[#F9DFDF] dark:border-slate-800 max-w-lg w-full flex flex-col shadow-2xl">
            
            <div className="flex items-center justify-between p-6 border-b border-[#F9DFDF] dark:border-slate-800">
              <h3 className="font-serif text-2xl text-slate-900 dark:text-white">Category Management</h3>
              <button onClick={() => setIsCategoryModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-slate-900 dark:hover:text-white" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              
              {/* Existing Categories */}
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider font-semibold text-slate-900 dark:text-white">
                  Existing Categories in PostgreSQL
                </label>
                <div className="max-h-40 overflow-y-auto divide-y divide-[#F9DFDF] dark:divide-slate-800 border border-[#F9DFDF] dark:border-slate-800 bg-[#FCF8F8] dark:bg-slate-950">
                  {categories.map((c) => (
                    <div key={c.id} className="p-2.5 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-900 dark:text-white">{c.name}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">slug: {c.slug}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Category Form */}
              <form onSubmit={handleCreateCategory} className="space-y-3 pt-4 border-t border-[#F9DFDF] dark:border-slate-800">
                <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-900 dark:text-white">
                  Create New Category
                </h4>
                
                <input
                  type="text"
                  required
                  placeholder="Category Name (e.g. Resort Atelier)"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 text-xs p-2 text-slate-900 dark:text-white"
                />

                <input
                  type="text"
                  placeholder="Description..."
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="w-full bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 text-xs p-2 text-slate-900 dark:text-white"
                />

                <input
                  type="url"
                  placeholder="Banner Image URL (https://...)"
                  value={newCatImage}
                  onChange={(e) => setNewCatImage(e.target.value)}
                  className="w-full bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 text-xs p-2 text-slate-900 dark:text-white"
                />

                <button
                  type="submit"
                  disabled={catSubmitting}
                  className="w-full py-2.5 bg-[#000000] dark:bg-[#FFFFFF] text-white dark:text-black hover:opacity-90 text-xs uppercase tracking-wider font-semibold disabled:opacity-50"
                >
                  {catSubmitting ? 'Saving Category...' : 'Save Category to PostgreSQL'}
                </button>
              </form>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
