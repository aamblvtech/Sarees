import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  Package,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Plus,
  UploadCloud,
  FileSpreadsheet,
  Search,
  Filter,
  LogOut,
  Edit2,
  Trash2,
  Eye,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  X,
  User,
  MapPin,
  FileText,
  DollarSign
} from 'lucide-react';
import supplierService from '../services/supplierService';

export default function SupplierDashboard() {
  const navigate = useNavigate();

  // Authentication & session
  const [supplierUser, setSupplierUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dashboard metrics
  const [metrics, setMetrics] = useState({
    total: 0,
    approved: 0,
    ai_ready: 0,
    pending: 0,
    rejected: 0,
    needs_image: 0
  });

  // Products list
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Add/Edit Form State
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    categoryId: 1,
    subcategory: 'sarees',
    gender: 'women',
    garmentType: 'saree',
    price: '',
    originalPrice: '',
    description: '',
    material: '',
    color: '',
    sizes: 'Free Size',
    stockStatus: 'in_stock',
    primaryImage: '',
    frontImage: '',
    backImage: '',
    sideImage: '',
    modelImage: '',
    imageUsagePermission: 'supplier_granted'
  });
  const [formImageFile, setFormImageFile] = useState(null);
  const [formImagePreview, setFormImagePreview] = useState(null);
  const [imageDimensionInfo, setImageDimensionInfo] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // CSV Modal State
  const [csvFile, setCsvFile] = useState(null);
  const [csvSubmitting, setCsvSubmitting] = useState(false);
  const [csvResult, setCsvResult] = useState(null);
  const [csvError, setCsvError] = useState(null);

  // Profile Edit State
  const [profileData, setProfileData] = useState({
    brandName: '',
    contactPhone: '',
    taxId: '',
    warehouseAddress: '',
    websiteUrl: ''
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState(null);

  // Check auth and load dashboard
  useEffect(() => {
    if (!supplierService.isAuthenticated()) {
      navigate('/supplier/login');
      return;
    }
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, prodsRes] = await Promise.all([
        supplierService.getDashboard(),
        supplierService.getProducts()
      ]);

      if (dashRes.success) {
        setMetrics(dashRes.metrics || {});
        setSupplierUser(dashRes.supplier || supplierService.getCurrentSupplier());
        setCategories(dashRes.categories || []);
        if (dashRes.supplier?.profile) {
          setProfileData({
            brandName: dashRes.supplier.profile.brand_name || '',
            contactPhone: dashRes.supplier.profile.contact_phone || '',
            taxId: dashRes.supplier.profile.tax_id || '',
            warehouseAddress: dashRes.supplier.profile.warehouse_address || '',
            websiteUrl: dashRes.supplier.profile.website_url || ''
          });
        }
      }

      if (prodsRes.success) {
        setProducts(prodsRes.data || []);
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        supplierService.logout();
        navigate('/supplier/login');
        return;
      }
      setError(err.response?.data?.error || err.message || 'Failed to load supplier dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    supplierService.logout();
    navigate('/supplier/login');
  };

  // Image Selection & Dimension Validation
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFormImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    setFormImagePreview(objectUrl);

    // Client-side technical verification of dimensions
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const isValid = w >= 250 && h >= 250;
      setImageDimensionInfo({
        width: w,
        height: h,
        isValid,
        isHires: Math.max(w, h) >= 1024,
        error: !isValid ? `Image dimensions (${w}×${h}px) are below the required 250×250px minimum.` : null
      });
    };
    img.src = objectUrl;
  };

  // Open modal for Create
  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      brand: supplierUser?.profile?.brand_name || supplierUser?.companyName || '',
      categoryId: 1,
      subcategory: 'sarees',
      gender: 'women',
      garmentType: 'saree',
      price: '',
      originalPrice: '',
      description: '',
      material: '',
      color: '',
      sizes: 'Free Size',
      stockStatus: 'in_stock',
      primaryImage: '',
      frontImage: '',
      backImage: '',
      sideImage: '',
      modelImage: '',
      imageUsagePermission: 'supplier_granted'
    });
    setFormImageFile(null);
    setFormImagePreview(null);
    setImageDimensionInfo(null);
    setFormError(null);
    setShowAddModal(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (prod) => {
    setEditingProduct(prod);
    setFormData({
      name: prod.name || '',
      brand: prod.brand || '',
      categoryId: prod.category_id || 1,
      subcategory: prod.subcategory || 'sarees',
      gender: prod.gender || 'women',
      garmentType: prod.garment_type || 'saree',
      price: prod.price || '',
      originalPrice: prod.original_price || '',
      description: prod.description || '',
      material: prod.material || '',
      color: prod.color || '',
      sizes: Array.isArray(prod.sizes) ? prod.sizes.join(', ') : (prod.sizes || 'Free Size'),
      stockStatus: prod.stock_status || 'in_stock',
      primaryImage: prod.primary_image_url || '',
      frontImage: prod.front_image_url || '',
      backImage: prod.back_image_url || '',
      sideImage: prod.side_image_url || '',
      modelImage: prod.model_image_url || '',
      imageUsagePermission: prod.image_usage_permission || 'supplier_granted'
    });
    setFormImageFile(null);
    setFormImagePreview(prod.primary_image_url || null);
    if (prod.image_width && prod.image_height) {
      setImageDimensionInfo({
        width: prod.image_width,
        height: prod.image_height,
        isValid: prod.image_width >= 250 && prod.image_height >= 250,
        isHires: Math.max(prod.image_width, prod.image_height) >= 1024,
        error: null
      });
    } else {
      setImageDimensionInfo(null);
    }
    setFormError(null);
    setShowAddModal(true);
  };

  // Save Product (Create or Edit)
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (imageDimensionInfo && !imageDimensionInfo.isValid) {
      setFormError(imageDimensionInfo.error || 'Product image must be at least 250 × 250 pixels.');
      return;
    }

    setFormSubmitting(true);
    try {
      let finalImageUrl = formData.primaryImage;

      // If an actual image file was picked, upload it first
      if (formImageFile) {
        const uploadForm = new FormData();
        uploadForm.append('primaryImage', formImageFile);
        const upRes = await supplierService.uploadImages(uploadForm);
        if (upRes.success && upRes.files?.primaryImage) {
          finalImageUrl = upRes.files.primaryImage.url;
        } else {
          throw new Error('Image upload failed.');
        }
      }

      if (!finalImageUrl) {
        throw new Error('Please select an image file or provide a high-resolution image URL.');
      }

      const sizesArray = typeof formData.sizes === 'string'
        ? formData.sizes.split(',').map((s) => s.trim()).filter(Boolean)
        : formData.sizes;

      const payload = {
        ...formData,
        primaryImage: finalImageUrl,
        sizes: sizesArray
      };

      if (editingProduct) {
        await supplierService.updateProduct(editingProduct.id, payload);
      } else {
        await supplierService.createProduct(payload);
      }

      setShowAddModal(false);
      await loadData();
    } catch (err) {
      setFormError(err.response?.data?.error || err.message || 'Failed to save product.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete Product
  const handleDeleteProduct = async (prodId, prodName) => {
    if (!window.confirm(`Are you sure you want to delete "${prodName}" from your supplier catalogue?`)) {
      return;
    }
    try {
      await supplierService.deleteProduct(prodId);
      await loadData();
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to delete product.');
    }
  };

  // CSV Batch Upload
  const handleCsvSubmit = async (e) => {
    e.preventDefault();
    if (!csvFile) {
      setCsvError('Please select a valid CSV catalogue file.');
      return;
    }
    setCsvSubmitting(true);
    setCsvError(null);
    setCsvResult(null);

    try {
      const cForm = new FormData();
      cForm.append('csvFile', csvFile);
      const res = await supplierService.importCsv(cForm);
      if (res.success) {
        setCsvResult(res);
        await loadData();
      } else {
        setCsvError(res.error || 'CSV import failed.');
      }
    } catch (err) {
      setCsvError(err.response?.data?.error || err.message || 'Failed to process CSV catalogue feed.');
    } finally {
      setCsvSubmitting(false);
    }
  };

  // Profile Save
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage(null);
    try {
      const res = await supplierService.updateProfile(profileData);
      if (res.success) {
        setProfileMessage('Profile settings updated successfully.');
        await loadData();
      }
    } catch (err) {
      setProfileMessage('Failed to update profile: ' + (err.response?.data?.error || err.message));
    } finally {
      setProfileSaving(false);
    }
  };

  // Filter products locally
  const filteredProducts = products.filter((p) => {
    if (categoryFilter !== 'all' && String(p.category_id) !== String(categoryFilter) && p.category_name?.toLowerCase() !== categoryFilter.toLowerCase()) {
      return false;
    }
    if (statusFilter !== 'all') {
      if (statusFilter === 'APPROVED' && p.approval_status !== 'APPROVED' && p.approval_status !== 'AI_READY') return false;
      if (statusFilter === 'PENDING' && p.approval_status !== 'PENDING') return false;
      if (statusFilter === 'REJECTED' && p.approval_status !== 'REJECTED') return false;
      if (statusFilter === 'NEEDS_IMAGE' && p.approval_status !== 'NEEDS_IMAGE_REPLACEMENT' && p.approval_status !== 'NEEDS_IMAGE') return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name?.toLowerCase().includes(q);
      const matchSku = p.sku?.toLowerCase().includes(q);
      const matchBrand = p.brand?.toLowerCase().includes(q);
      if (!matchName && !matchSku && !matchBrand) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-[#0B0F19] text-stone-900 dark:text-stone-100 transition-colors">
      
      {/* Top Navbar */}
      <header className="border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/90 sticky top-0 z-20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          <div className="flex items-center space-x-3">
            <Link to="/" className="font-serif text-2xl tracking-[0.2em] font-semibold text-stone-900 dark:text-white">
              VESTRA
            </Link>
            <span className="text-stone-300 dark:text-stone-700">|</span>
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-amber-500" />
              <span className="text-xs uppercase tracking-wider font-semibold text-stone-700 dark:text-stone-300 hidden sm:inline">
                Supplier Atelier Portal
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right hidden md:block">
              <div className="text-xs font-semibold text-stone-900 dark:text-white">
                {supplierUser?.companyName || 'Supplier Account'}
              </div>
              <div className="text-[10px] text-stone-500 font-mono">
                {supplierUser?.supplierCode || 'SUP-CODE'} • <span className="text-emerald-500 uppercase font-semibold">Active</span>
              </div>
            </div>

            <button
              onClick={() => setShowProfileModal(true)}
              className="p-2 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white border border-stone-200 dark:border-stone-800 rounded-lg text-xs flex items-center space-x-1.5 transition-colors"
              title="Supplier Profile & Settings"
            >
              <User className="w-4 h-4 text-amber-500" />
              <span className="hidden sm:inline">Profile</span>
            </button>

            <button
              onClick={handleLogout}
              className="p-2 text-stone-600 dark:text-stone-400 hover:text-red-600 dark:hover:text-red-400 border border-stone-200 dark:border-stone-800 rounded-lg text-xs flex items-center space-x-1.5 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Banner with Actions */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 rounded-2xl shadow-sm">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-stone-900 dark:text-white">
              {supplierUser?.companyName || 'Supplier Atelier'}
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1">
              Manage your high-resolution garments, batch catalogue feeds, and review approval status for AI Virtual Fitting.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="px-3.5 py-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => setShowCsvModal(true)}
              className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-900 dark:text-white border border-stone-300 dark:border-stone-700 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              <span>Upload CSV Feed</span>
            </button>

            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-stone-950 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Garment</span>
            </button>
          </div>
        </div>

        {/* 5 KPI Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 rounded-xl shadow-sm space-y-1">
            <div className="flex items-center justify-between text-stone-500 text-xs uppercase tracking-wider">
              <span>Total Garments</span>
              <Package className="w-4 h-4 text-stone-400" />
            </div>
            <div className="text-2xl font-bold font-serif text-stone-900 dark:text-white">
              {metrics.total || 0}
            </div>
            <div className="text-[11px] text-stone-400">Registered in catalogue</div>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-emerald-500/20 dark:border-emerald-500/30 p-4 rounded-xl shadow-sm space-y-1">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs uppercase tracking-wider">
              <span>Approved & Live</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold font-serif text-emerald-600 dark:text-emerald-400">
              {metrics.approved || 0}
            </div>
            <div className="text-[11px] text-stone-400">Visible to customers</div>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-amber-500/20 dark:border-amber-500/30 p-4 rounded-xl shadow-sm space-y-1">
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 text-xs uppercase tracking-wider">
              <span>Pending Review</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold font-serif text-amber-600 dark:text-amber-400">
              {metrics.pending || 0}
            </div>
            <div className="text-[11px] text-stone-400">Held for admin review</div>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-orange-500/20 dark:border-orange-500/30 p-4 rounded-xl shadow-sm space-y-1">
            <div className="flex items-center justify-between text-orange-600 dark:text-orange-400 text-xs uppercase tracking-wider">
              <span>Needs Image</span>
              <AlertTriangle className="w-4 h-4 text-orange-500" />
            </div>
            <div className="text-2xl font-bold font-serif text-orange-600 dark:text-orange-400">
              {metrics.needs_image || 0}
            </div>
            <div className="text-[11px] text-stone-400">&lt; 250×250 px resolution</div>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-red-500/20 dark:border-red-500/30 p-4 rounded-xl shadow-sm space-y-1 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-red-600 dark:text-red-400 text-xs uppercase tracking-wider">
              <span>Rejected</span>
              <XCircle className="w-4 h-4 text-red-500" />
            </div>
            <div className="text-2xl font-bold font-serif text-red-600 dark:text-red-400">
              {metrics.rejected || 0}
            </div>
            <div className="text-[11px] text-stone-400">Incompatible assets</div>
          </div>

        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-3.5 rounded-xl shadow-sm">
          
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, SKU or brand..."
              className="w-full pl-9 pr-3 py-1.5 bg-stone-50 dark:bg-stone-800/80 border border-stone-300 dark:border-stone-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-xs focus:outline-none text-stone-700 dark:text-stone-300"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug || c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-xs focus:outline-none text-stone-700 dark:text-stone-300"
            >
              <option value="all">All Statuses</option>
              <option value="APPROVED">Approved & Live</option>
              <option value="PENDING">Pending Review</option>
              <option value="NEEDS_IMAGE">Needs Image</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

        </div>

        {/* Products Table */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-900 dark:text-white uppercase tracking-wider">
              Garments Catalogue ({filteredProducts.length})
            </h2>
            <div className="text-xs text-stone-500">
              Technical Gate: <span className="font-semibold text-amber-500">≥ 250×250 px</span> (Prefer ≥ 1024 px)
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-stone-500 flex flex-col items-center justify-center space-y-2">
              <RefreshCw className="w-5 h-5 animate-spin text-amber-500" />
              <span>Loading registered garments...</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Package className="w-8 h-8 text-stone-400 mx-auto" />
              <div className="text-sm font-semibold text-stone-900 dark:text-white">
                No garments found
              </div>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                No items match your filter criteria. Click "Add New Garment" to register individual garments or upload a batch CSV feed.
              </p>
              <button
                onClick={handleOpenAddModal}
                className="mt-2 px-4 py-2 bg-stone-900 dark:bg-amber-500 text-white dark:text-stone-950 text-xs font-semibold rounded-lg"
              >
                + Add First Garment
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-500 dark:text-stone-400 uppercase tracking-wider font-semibold border-b border-stone-200 dark:border-stone-800">
                  <tr>
                    <th className="py-3 px-4">Garment</th>
                    <th className="py-3 px-4">Category & Gender</th>
                    <th className="py-3 px-4">Price</th>
                    <th className="py-3 px-4">Image Quality</th>
                    <th className="py-3 px-4">Approval Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                  {filteredProducts.map((prod) => {
                    const imgUrl = prod.primary_image_url || prod.image_url || '/placeholder.jpg';
                    const isApproved = prod.approval_status === 'APPROVED' || prod.approval_status === 'AI_READY';
                    const isPending = prod.approval_status === 'PENDING';
                    const isRejected = prod.approval_status === 'REJECTED';
                    const isNeedsImg = prod.approval_status === 'NEEDS_IMAGE_REPLACEMENT' || prod.approval_status === 'NEEDS_IMAGE';

                    return (
                      <tr key={prod.id} className="hover:bg-stone-50/60 dark:hover:bg-stone-800/40 transition-colors">
                        
                        {/* Garment Details */}
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="relative w-12 h-14 bg-stone-100 dark:bg-stone-800 rounded-lg overflow-hidden flex-shrink-0 border border-stone-200 dark:border-stone-700">
                              <img
                                src={imgUrl}
                                alt={prod.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=200&h=200';
                                }}
                              />
                            </div>
                            <div className="space-y-0.5">
                              <div className="font-semibold text-stone-900 dark:text-white line-clamp-1">
                                {prod.name}
                              </div>
                              <div className="text-[11px] text-stone-500">
                                Brand: <span className="font-medium text-stone-700 dark:text-stone-300">{prod.brand}</span> • SKU: <span className="font-mono">{prod.sku}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category & Gender */}
                        <td className="py-3 px-4 text-stone-600 dark:text-stone-300">
                          <div>{prod.category_name || prod.subcategory || 'Sarees'}</div>
                          <div className="text-[10px] text-stone-400 capitalize">
                            {prod.gender || 'women'} • {prod.garment_type || 'saree'}
                          </div>
                        </td>

                        {/* Price */}
                        <td className="py-3 px-4 font-mono font-medium">
                          <span className="text-stone-900 dark:text-white">₹{prod.price}</span>
                          {prod.original_price && prod.original_price > prod.price && (
                            <span className="ml-1.5 text-stone-400 line-through text-[11px]">
                              ₹{prod.original_price}
                            </span>
                          )}
                        </td>

                        {/* Image Quality Gate Badge */}
                        <td className="py-3 px-4">
                          {prod.image_width && prod.image_height ? (
                            <div className="space-y-0.5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                                prod.image_width >= 1024 || prod.image_height >= 1024
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                  : prod.image_width >= 250 && prod.image_height >= 250
                                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                  : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                              }`}>
                                {prod.image_width}×{prod.image_height} px
                              </span>
                              <div className="text-[10px] text-stone-400">
                                {prod.image_width >= 1024 || prod.image_height >= 1024
                                  ? 'Studio Hi-Res'
                                  : prod.image_width >= 250 && prod.image_height >= 250
                                  ? 'Standard Validated'
                                  : 'Low-Res (< 250px)'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px] text-stone-400 font-mono">Unchecked</span>
                          )}
                        </td>

                        {/* Approval Status Badge */}
                        <td className="py-3 px-4">
                          {isApproved ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-full text-[11px] font-semibold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              <span>Approved & Live</span>
                            </span>
                          ) : isPending ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 rounded-full text-[11px] font-semibold">
                              <Clock className="w-3 h-3 text-amber-500" />
                              <span>Pending Atelier Review</span>
                            </span>
                          ) : isNeedsImg ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-orange-500/10 border border-orange-500/30 text-orange-700 dark:text-orange-300 rounded-full text-[11px] font-semibold">
                              <AlertTriangle className="w-3 h-3 text-orange-500" />
                              <span>Image Replacement Required</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 rounded-full text-[11px] font-semibold">
                              <XCircle className="w-3 h-3 text-red-500" />
                              <span>Rejected</span>
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleOpenEditModal(prod)}
                            className="p-1.5 text-stone-500 hover:text-stone-900 dark:hover:text-white rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                            title="Edit Garment"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(prod.id, prod.name)}
                            className="p-1.5 text-stone-500 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                            title="Delete Garment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>

      {/* ===================== ADD / EDIT MODAL ===================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl max-w-2xl w-full p-6 sm:p-8 space-y-5 my-8 shadow-2xl">
            
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-4">
              <div>
                <h3 className="font-serif text-xl font-semibold text-stone-900 dark:text-white">
                  {editingProduct ? 'Edit Registered Garment' : 'Register New Fashion Garment'}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Garment will be verified for technical resolution (≥ 250×250 px) and submitted for Atelier review.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                    Garment Name / Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Pure Zari Banarasi Kanjeevaram Saree"
                    className="w-full px-3.5 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                    Brand Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="e.g. Surat Handloom Mills"
                    className="w-full px-3.5 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                    Category *
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3.5 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                    Selling Price (INR) *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="3499"
                    className="w-full px-3.5 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                    Original Price / MRP
                  </label>
                  <input
                    type="number"
                    value={formData.originalPrice}
                    onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                    placeholder="5999"
                    className="w-full px-3.5 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                    Gender *
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3.5 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  >
                    <option value="women">Women</option>
                    <option value="men">Men</option>
                    <option value="unisex">Unisex</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                    Garment Silhouette / Type *
                  </label>
                  <select
                    value={formData.garmentType}
                    onChange={(e) => setFormData({ ...formData, garmentType: e.target.value })}
                    className="w-full px-3.5 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  >
                    <option value="saree">Saree (6-Yard Traditional Draped)</option>
                    <option value="upper_body">Upper Body (Shirt / Kurti / Top)</option>
                    <option value="lower_body">Lower Body (Trousers / Jeans / Skirt)</option>
                    <option value="upper_and_lower">Full Ensemble (Dress / Suit)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                    Fabric & Material
                  </label>
                  <input
                    type="text"
                    value={formData.material}
                    onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                    placeholder="e.g. Pure Mulberry Silk & Antique Zari"
                    className="w-full px-3.5 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                    Primary Colour
                  </label>
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="e.g. Royal Indigo & Gold"
                    className="w-full px-3.5 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

              </div>

              {/* Image Upload & Gate Verification */}
              <div className="p-4 bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-stone-900 dark:text-white">
                    Garment Photograph (Min 250×250 px, Prefer ≥1024 px) *
                  </label>
                  {imageDimensionInfo && (
                    <span className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded ${
                      imageDimensionInfo.isValid
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        : 'bg-red-500/20 text-red-600 dark:text-red-400'
                    }`}>
                      {imageDimensionInfo.width}×{imageDimensionInfo.height} px
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-4">
                  {formImagePreview && (
                    <div className="w-16 h-20 bg-stone-200 dark:bg-stone-700 rounded-lg overflow-hidden flex-shrink-0 border border-stone-300 dark:border-stone-600">
                      <img src={formImagePreview} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                  
                  <div className="flex-1 space-y-2">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageChange}
                      className="block w-full text-xs text-stone-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-stone-900 file:text-white dark:file:bg-amber-500 dark:file:text-stone-950 hover:file:opacity-90"
                    />
                    <div className="text-[11px] text-stone-500">
                      Or paste direct image URL:
                    </div>
                    <input
                      type="url"
                      value={formData.primaryImage}
                      onChange={(e) => {
                        setFormData({ ...formData, primaryImage: e.target.value });
                        if (e.target.value) {
                          setFormImagePreview(e.target.value);
                          const img = new Image();
                          img.onload = () => {
                            setImageDimensionInfo({
                              width: img.naturalWidth,
                              height: img.naturalHeight,
                              isValid: img.naturalWidth >= 250 && img.naturalHeight >= 250,
                              isHires: Math.max(img.naturalWidth, img.naturalHeight) >= 1024,
                              error: null
                            });
                          };
                          img.src = e.target.value;
                        }
                      }}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full px-3 py-1.5 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {imageDimensionInfo?.error && (
                  <div className="text-xs text-red-600 dark:text-red-400 flex items-center space-x-1.5 pt-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{imageDimensionInfo.error}</span>
                  </div>
                )}
              </div>

              {/* Permission Agreement */}
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <label className="flex items-start space-x-2.5 text-xs text-stone-700 dark:text-stone-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.imageUsagePermission === 'supplier_granted'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        imageUsagePermission: e.target.checked ? 'supplier_granted' : 'unauthorized'
                      })
                    }
                    className="mt-0.5 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span>
                    <strong>Commercial Rights Declaration:</strong> I warrant that our registered company owns full legal authorization or studio copyrights for this garment photograph. Newly submitted garments are held in <em>PENDING</em> review until Atelier verification.
                  </span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 rounded-lg text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-stone-950 rounded-lg text-xs font-semibold shadow-md disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {formSubmitting ? (
                    <span>Submitting to Atelier...</span>
                  ) : (
                    <span>{editingProduct ? 'Save Changes' : 'Submit for Review'}</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ===================== CSV MODAL ===================== */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl max-w-xl w-full p-6 sm:p-8 space-y-5 my-8 shadow-2xl">
            
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-4">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                <h3 className="font-serif text-xl font-semibold text-stone-900 dark:text-white">
                  Batch Catalogue Feed (CSV)
                </h3>
              </div>
              <button
                onClick={() => setShowCsvModal(false)}
                className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {csvError && (
              <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-700 dark:text-red-300">
                {csvError}
              </div>
            )}

            {csvResult && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                <div className="font-semibold flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{csvResult.message}</span>
                </div>
                <div>Imported: {csvResult.importedCount} items</div>
                {csvResult.errors && csvResult.errors.length > 0 && (
                  <div className="text-red-600 dark:text-red-400 mt-2">
                    {csvResult.errors.length} rows rejected due to missing attributes or invalid image.
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleCsvSubmit} className="space-y-4">
              
              <div className="border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-xl p-6 text-center space-y-2 hover:border-amber-500 transition-colors">
                <UploadCloud className="w-8 h-8 text-stone-400 mx-auto" />
                <div className="text-xs text-stone-600 dark:text-stone-300">
                  Select CSV catalogue file from your local machine
                </div>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  required
                  onChange={(e) => setCsvFile(e.target.files[0])}
                  className="block w-full text-xs text-stone-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-stone-900 file:text-white dark:file:bg-amber-500 dark:file:text-stone-950"
                />
              </div>

              <div className="p-3.5 bg-stone-50 dark:bg-stone-800/60 rounded-xl text-xs space-y-1 text-stone-600 dark:text-stone-400">
                <div className="font-semibold text-stone-900 dark:text-white">Required CSV Columns:</div>
                <div className="font-mono text-[11px] leading-relaxed">
                  Brand, Product name, Selling price, Original price, Category, Subcategory, Gender, Colour, Fabric, Image URL, Permission
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-stone-200 dark:border-stone-800">
                <a
                  href="/api/admin/import/template"
                  download="vestra_catalogue_template.csv"
                  className="text-xs text-amber-600 dark:text-amber-400 font-semibold underline underline-offset-4 flex items-center space-x-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Download Sample CSV Template</span>
                </a>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowCsvModal(false)}
                    className="px-3.5 py-2 border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 rounded-lg text-xs font-semibold"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={csvSubmitting}
                    className="px-4 py-2 bg-stone-900 dark:bg-amber-500 text-white dark:text-stone-950 text-xs font-semibold rounded-lg shadow-md disabled:opacity-50"
                  >
                    {csvSubmitting ? 'Importing Batch...' : 'Upload & Ingest Feed'}
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ===================== PROFILE MODAL ===================== */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl max-w-lg w-full p-6 space-y-5 my-8 shadow-2xl">
            
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-amber-500" />
                <h3 className="font-serif text-lg font-semibold text-stone-900 dark:text-white">
                  Supplier Profile Settings
                </h3>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {profileMessage && (
              <div className="p-3 bg-stone-100 dark:bg-stone-800 rounded-lg text-xs text-stone-700 dark:text-stone-300">
                {profileMessage}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-3.5">
              
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wider font-semibold text-stone-700 dark:text-stone-300">
                  Brand Display Name
                </label>
                <input
                  type="text"
                  value={profileData.brandName}
                  onChange={(e) => setProfileData({ ...profileData, brandName: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wider font-semibold text-stone-700 dark:text-stone-300">
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={profileData.contactPhone}
                  onChange={(e) => setProfileData({ ...profileData, contactPhone: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wider font-semibold text-stone-700 dark:text-stone-300">
                  GSTIN / Tax ID
                </label>
                <input
                  type="text"
                  value={profileData.taxId}
                  onChange={(e) => setProfileData({ ...profileData, taxId: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wider font-semibold text-stone-700 dark:text-stone-300">
                  Dispatch / Warehouse Address
                </label>
                <textarea
                  rows="2"
                  value={profileData.warehouseAddress}
                  onChange={(e) => setProfileData({ ...profileData, warehouseAddress: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wider font-semibold text-stone-700 dark:text-stone-300">
                  Official Website
                </label>
                <input
                  type="url"
                  value={profileData.websiteUrl}
                  onChange={(e) => setProfileData({ ...profileData, websiteUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-3.5 py-1.5 border border-stone-300 dark:border-stone-700 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="px-4 py-1.5 bg-stone-900 dark:bg-amber-500 text-white dark:text-stone-950 rounded-lg text-xs font-semibold disabled:opacity-50"
                >
                  {profileSaving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
