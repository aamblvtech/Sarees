import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Package, Plus, Edit2, Trash2, Search, Filter, LogOut, Check,
  Upload, Sparkles, RefreshCw, AlertCircle, Eye, EyeOff, Layers,
  ExternalLink, Database, ShieldCheck, X, Download, FileSpreadsheet,
  CheckCircle2, AlertTriangle, Globe, RotateCcw, FileText, CheckCheck
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

  // Top Tabs
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'myntra_import'
  const [selectedApprovalStatus, setSelectedApprovalStatus] = useState('all');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedGender, setSelectedGender] = useState('all');
  const [selectedCompatibility, setSelectedCompatibility] = useState('all');
  const [selectedStock, setSelectedStock] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedReview, setSelectedReview] = useState('all');

  // Modals & Bulk Actions
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState('');
  const [catalogueActionLoading, setCatalogueActionLoading] = useState(false);

  // Approval Modal State
  const [approvalModalProduct, setApprovalModalProduct] = useState(null);
  const [newApprovalStatus, setNewApprovalStatus] = useState('APPROVED');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [isUpdatingApproval, setIsUpdatingApproval] = useState(false);

  // Myntra Import Tab State
  const [importSubTab, setImportSubTab] = useState('single'); // 'single' | 'csv'

  // Myntra Single Import Form State
  const [myntraSingleForm, setMyntraSingleForm] = useState({
    brand: '',
    productTitle: '',
    myntraUrl: '',
    sellingPrice: '',
    originalPrice: '',
    categoryId: '1',
    subcategory: 'sarees',
    gender: 'women',
    garmentType: 'saree',
    colour: '',
    fabric: '',
    permissionStatus: 'authorized',
    permissionNotes: ''
  });
  const [singleFiles, setSingleFiles] = useState({
    image: null,
    frontImage: null,
    backImage: null,
    sideImage: null,
    modelImage: null
  });
  const [singleImportLoading, setSingleImportLoading] = useState(false);
  const [singleImportSuccess, setSingleImportSuccess] = useState(null);
  const [singleImportError, setSingleImportError] = useState(null);

  // Myntra CSV Bulk Import State
  const [csvTabMode, setCsvTabMode] = useState('upload'); // 'upload' | 'paste'
  const [csvFile, setCsvFile] = useState(null);
  const [csvText, setCsvText] = useState('');
  const [csvPreviewLoading, setCsvPreviewLoading] = useState(false);
  const [csvCommitLoading, setCsvCommitLoading] = useState(false);
  const [csvPreviewData, setCsvPreviewData] = useState(null);
  const [csvImportSuccess, setCsvImportSuccess] = useState(null);
  const [csvImportError, setCsvImportError] = useState(null);

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
  const [replacingProduct, setReplacingProduct] = useState(null);
  const [replaceFile, setReplaceFile] = useState(null);
  const [replaceUrl, setReplaceUrl] = useState('');
  const [replaceLoading, setReplaceLoading] = useState(false);
  const [replaceError, setReplaceError] = useState(null);
  const [replaceSuccess, setReplaceSuccess] = useState(null);

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

  // Open Modal for Replacing Product Image
  const handleOpenReplaceModal = (prod) => {
    setReplacingProduct(prod);
    setReplaceFile(null);
    setReplaceUrl('');
    setReplaceError(null);
    setReplaceSuccess(null);
    setIsReplaceModalOpen(true);
  };

  const handleExecuteReplaceImage = async (e) => {
    e.preventDefault();
    if (!replaceFile && !replaceUrl.trim()) {
      setReplaceError('Please select an image file or provide an image URL.');
      return;
    }
    setReplaceLoading(true);
    setReplaceError(null);
    setReplaceSuccess(null);
    try {
      const res = await adminService.replaceProductImage(replacingProduct.id, {
        file: replaceFile,
        imageUrl: replaceUrl.trim() || undefined
      });
      setReplaceSuccess(res?.message || 'Product image updated successfully.');
      await loadAllData();
      setTimeout(() => {
        setIsReplaceModalOpen(false);
      }, 1200);
    } catch (err) {
      setReplaceError(err.response?.data?.error || err.message || 'Failed to replace image.');
    } finally {
      setReplaceLoading(false);
    }
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

  // Bulk selection handlers
  const handleToggleSelectProduct = (id) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllProducts = () => {
    if (selectedProductIds.length === filteredProducts.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(filteredProducts.map((p) => p.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProductIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedProductIds.length} selected garments from the database?`)) return;

    setIsBulkDeleting(true);
    try {
      await adminService.bulkDeleteProducts(selectedProductIds);
      setSelectedProductIds([]);
      await loadAllData();
    } catch (err) {
      alert('Failed to delete selected products: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleClearAllCatalogue = async () => {
    if (clearConfirmText !== 'DELETE') {
      alert('Please type DELETE to confirm clearing all catalogue products.');
      return;
    }
    setCatalogueActionLoading(true);
    try {
      await adminService.deleteAllProducts();
      setShowClearModal(false);
      setClearConfirmText('');
      setSelectedProductIds([]);
      await loadAllData();
    } catch (err) {
      alert('Failed to clear catalogue: ' + (err.response?.data?.error || err.message));
    } finally {
      setCatalogueActionLoading(false);
    }
  };

  const handleResetSeedCatalogue = async () => {
    setCatalogueActionLoading(true);
    try {
      await adminService.resetSeedCatalogue();
      setShowResetModal(false);
      setSelectedProductIds([]);
      await loadAllData();
    } catch (err) {
      alert('Failed to reset catalogue: ' + (err.response?.data?.error || err.message));
    } finally {
      setCatalogueActionLoading(false);
    }
  };

  // Approval modal handlers
  const handleOpenApprovalModal = (product) => {
    setApprovalModalProduct(product);
    setNewApprovalStatus(product.approvalStatus || (product.tryonCompatibility === 'supported' ? 'AI_READY' : 'APPROVED'));
    setApprovalNotes('');
  };

  const handleSaveApprovalStatus = async () => {
    if (!approvalModalProduct) return;
    setIsUpdatingApproval(true);
    try {
      await adminService.updateProductApprovalStatus(
        approvalModalProduct.id,
        newApprovalStatus,
        approvalNotes
      );
      setApprovalModalProduct(null);
      await loadAllData();
    } catch (err) {
      alert('Failed to update status: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsUpdatingApproval(false);
    }
  };

  // Single Myntra product import handler
  const handleSingleMyntraSubmit = async (e) => {
    e.preventDefault();
    setSingleImportError(null);
    setSingleImportSuccess(null);
    setSingleImportLoading(true);

    try {
      const data = new FormData();
      Object.entries(myntraSingleForm).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          data.append(key, val);
        }
      });

      if (singleFiles.image) data.append('image', singleFiles.image);
      if (singleFiles.frontImage) data.append('frontImage', singleFiles.frontImage);
      if (singleFiles.backImage) data.append('backImage', singleFiles.backImage);
      if (singleFiles.sideImage) data.append('sideImage', singleFiles.sideImage);
      if (singleFiles.modelImage) data.append('modelImage', singleFiles.modelImage);

      const res = await adminService.importSingleMyntraProduct(data);
      setSingleImportSuccess(`Product "${res.data?.name}" saved successfully as ${res.data?.approval_status || 'DRAFT'}!`);
      // Reset form
      setMyntraSingleForm({
        brand: '',
        productTitle: '',
        myntraUrl: '',
        sellingPrice: '',
        originalPrice: '',
        categoryId: categories[0]?.id || '1',
        subcategory: 'sarees',
        gender: 'women',
        garmentType: 'saree',
        colour: '',
        fabric: '',
        permissionStatus: 'authorized',
        permissionNotes: ''
      });
      setSingleFiles({ image: null, frontImage: null, backImage: null, sideImage: null, modelImage: null });
      await loadAllData();
    } catch (err) {
      setSingleImportError(err.response?.data?.error || err.message || 'Failed to import product.');
    } finally {
      setSingleImportLoading(false);
    }
  };

  // CSV handlers
  const handleDownloadTemplate = () => {
    adminService.downloadImportTemplate();
  };

  const handlePreviewCsv = async () => {
    setCsvImportError(null);
    setCsvImportSuccess(null);
    setCsvPreviewLoading(true);

    try {
      let payload;
      if (csvTabMode === 'upload') {
        if (!csvFile) {
          setCsvImportError('Please select a CSV file first.');
          setCsvPreviewLoading(false);
          return;
        }
        payload = new FormData();
        payload.append('csvFile', csvFile);
      } else {
        if (!csvText.trim()) {
          setCsvImportError('Please paste CSV text into the field.');
          setCsvPreviewLoading(false);
          return;
        }
        payload = csvText;
      }

      const res = await adminService.previewMyntraCsv(payload);
      if (res.success) {
        setCsvPreviewData(res);
      } else {
        setCsvImportError(res.error || 'Failed to preview CSV.');
      }
    } catch (err) {
      setCsvImportError(err.response?.data?.error || err.message || 'Error parsing CSV.');
    } finally {
      setCsvPreviewLoading(false);
    }
  };

  const handleCommitCsv = async () => {
    if (!csvPreviewData || !csvPreviewData.rows) return;
    const validRows = csvPreviewData.rows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      setCsvImportError('No valid rows available to import.');
      return;
    }

    setCsvCommitLoading(true);
    setCsvImportError(null);
    try {
      const res = await adminService.commitMyntraCsv(validRows);
      setCsvImportSuccess(`Successfully imported ${res.importedCount} products in batch ${res.batchId}! All imported garments are stored in Draft status for review.`);
      setCsvPreviewData(null);
      setCsvFile(null);
      setCsvText('');
      await loadAllData();
    } catch (err) {
      setCsvImportError(err.response?.data?.error || err.message || 'Failed to commit import.');
    } finally {
      setCsvCommitLoading(false);
    }
  };

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.subcategory?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.myntraUrl && p.myntraUrl.toLowerCase().includes(searchQuery.toLowerCase()));

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
      (selectedReview === 'reviewed' && !(p.needsAdminReview ?? p.needs_admin_review));

    const matchesApproval =
      selectedApprovalStatus === 'all' ||
      (p.approvalStatus || (p.tryonCompatibility === 'supported' ? 'AI_READY' : 'APPROVED')).toUpperCase() === selectedApprovalStatus.toUpperCase();

    return (
      matchesSearch &&
      matchesCategory &&
      matchesGender &&
      matchesCompatibility &&
      matchesStock &&
      matchesStatus &&
      matchesReview &&
      matchesApproval
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

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-2 border-b border-[#F9DFDF] dark:border-slate-800">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-5 py-3 text-xs uppercase tracking-widest font-semibold transition-all border-b-2 flex items-center space-x-2 ${
              activeTab === 'inventory'
                ? 'border-black dark:border-white text-slate-900 dark:text-white bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 hover:bg-slate-100/50'
            }`}
          >
            <Package className="w-4 h-4 text-[#F5AFAF]" />
            <span>Catalogue Inventory ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('myntra_import')}
            className={`px-5 py-3 text-xs uppercase tracking-widest font-semibold transition-all border-b-2 flex items-center space-x-2 ${
              activeTab === 'myntra_import'
                ? 'border-black dark:border-white text-slate-900 dark:text-white bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 hover:bg-slate-100/50'
            }`}
          >
            <Globe className="w-4 h-4 text-[#F5AFAF]" />
            <span>Myntra Catalogue Import</span>
          </button>
        </div>

        {activeTab === 'inventory' ? (
          <>
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

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={() => setShowResetModal(true)}
                    className="px-3.5 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider font-semibold transition-colors flex items-center space-x-1.5"
                    title="Reseed database with original luxury collection"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Reset Seed</span>
                  </button>

                  <button
                    onClick={() => setShowClearModal(true)}
                    className="px-3.5 py-2 border border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 text-xs uppercase tracking-wider font-semibold transition-colors flex items-center space-x-1.5"
                    title="Remove all products from database"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Catalogue</span>
                  </button>

                  <button
                    onClick={() => setIsCategoryModalOpen(true)}
                    className="px-4 py-2 border border-[#000000] dark:border-white text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 text-xs uppercase tracking-wider font-semibold transition-colors flex items-center space-x-1.5"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Categories</span>
                  </button>

                  <button
                    onClick={handleOpenAddModal}
                    className="px-5 py-2 bg-[#000000] dark:bg-[#FFFFFF] text-white dark:text-black hover:opacity-90 text-xs uppercase tracking-widest font-semibold transition-all shadow flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4 text-[#F5AFAF]" />
                    <span>Add New Garment</span>
                  </button>
                </div>
              </div>

              {/* Filter Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 pt-3 border-t border-[#F9DFDF] dark:border-slate-800">
                
                <div className="relative lg:col-span-2">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search name, SKU, brand, URL..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 text-xs text-slate-900 dark:text-white pl-9 pr-3 py-2 focus:outline-none focus:border-[#000000] dark:focus:border-white"
                  />
                </div>

                <select
                  value={selectedApprovalStatus}
                  onChange={(e) => setSelectedApprovalStatus(e.target.value)}
                  className="bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 text-xs text-slate-900 dark:text-white px-3 py-2 uppercase tracking-wider focus:outline-none focus:border-[#000000] dark:focus:border-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="AI_READY">AI Ready</option>
                  <option value="APPROVED">Approved</option>
                  <option value="NEEDS_ADMIN_REVIEW">Needs Admin Review</option>
                  <option value="NEEDS_PERMISSION_REVIEW">Needs Permission</option>
                  <option value="NEEDS_IMAGE">Needs Image</option>
                  <option value="DRAFT">Draft</option>
                </select>

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
              <option value="needs_image_replacement">Image Needs Replacement</option>
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
              {/* Bulk Action Toolbar */}
              {selectedProductIds.length > 0 && (
                <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between border-b border-slate-700 animate-fadeIn">
                  <div className="flex items-center space-x-2 text-xs">
                    <CheckCheck className="w-4 h-4 text-[#F5AFAF]" />
                    <span><strong>{selectedProductIds.length}</strong> garments selected</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setSelectedProductIds([])}
                      className="px-3 py-1 text-xs text-slate-300 hover:text-white underline"
                    >
                      Deselect All
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      disabled={isBulkDeleting}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold uppercase tracking-wider transition-colors shadow flex items-center space-x-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isBulkDeleting ? 'Deleting...' : `Delete Selected (${selectedProductIds.length})`}</span>
                    </button>
                  </div>
                </div>
              )}

              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white border-b border-[#F9DFDF] dark:border-slate-800 text-[10px] uppercase tracking-widest">
                    <th className="py-3.5 px-3 w-8">
                      <input
                        type="checkbox"
                        checked={filteredProducts.length > 0 && selectedProductIds.length === filteredProducts.length}
                        onChange={handleSelectAllProducts}
                        className="rounded border-slate-300 text-black focus:ring-0 cursor-pointer"
                      />
                    </th>
                    <th className="py-3.5 px-4 font-semibold">Preview</th>
                    <th className="py-3.5 px-4 font-semibold">Title & SKU</th>
                    <th className="py-3.5 px-4 font-semibold">Taxonomy</th>
                    <th className="py-3.5 px-4 font-semibold">Approval Workflow</th>
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
                    const approval = (p.approvalStatus || (compat === 'supported' ? 'AI_READY' : 'APPROVED')).toUpperCase();
                    const isSelected = selectedProductIds.includes(p.id);

                    return (
                      <tr key={p.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isSelected ? 'bg-rose-50/30 dark:bg-rose-950/20' : ''}`}>
                        
                        {/* Checkbox */}
                        <td className="py-3 px-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectProduct(p.id)}
                            className="rounded border-slate-300 text-black focus:ring-0 cursor-pointer"
                          />
                        </td>

                        {/* Thumbnail & Image Resolution */}
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-12 h-16 bg-slate-100 dark:bg-slate-800 border border-[#F9DFDF] dark:border-slate-800 overflow-hidden flex-shrink-0 relative group">
                              {img ? (
                                <img src={img} alt={p.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[9px] text-slate-400">
                                  No Img
                                </div>
                              )}
                            </div>
                            <div className="space-y-0.5 text-[10px]">
                              <div className="font-mono font-medium text-slate-700 dark:text-slate-300">
                                {p.dimensionLabel || (p.imageWidth && p.imageHeight ? `${p.imageWidth} × ${p.imageHeight} px` : '—')}
                              </div>
                              <div>
                                {p.qualityStatus === 'high_resolution' ? (
                                  <span className="text-[9px] px-1 py-0.2 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold">
                                    HD Studio
                                  </span>
                                ) : (p.qualityStatus === 'too_small' || compat === 'needs_image_replacement') ? (
                                  <span className="text-[9px] px-1 py-0.2 bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold">
                                    &lt; 250px Low Res
                                  </span>
                                ) : (
                                  <span className="text-[9px] px-1 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                                    Standard
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => handleOpenReplaceModal(p)}
                                className="text-[9px] text-[#F5AFAF] hover:text-[#000000] dark:hover:text-white underline font-semibold mt-0.5 block text-left"
                              >
                                Replace Image
                              </button>
                            </div>
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
                          {p.myntraUrl && (
                            <div className="mt-1">
                              <a
                                href={p.myntraUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center space-x-1 text-[10px] text-rose-600 dark:text-rose-400 hover:underline font-mono"
                                title="View original Myntra product page reference"
                              >
                                <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                                <span className="truncate max-w-[200px]">Myntra Reference Link</span>
                              </a>
                            </div>
                          )}
                        </td>

                        {/* Taxonomy */}
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-900 dark:text-white">{p.categoryName || 'Apparel'}</p>
                          <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-[#F9DFDF] dark:border-slate-700 text-[9px] uppercase tracking-wider text-slate-600 dark:text-slate-300 font-semibold">
                            {subcat.replace('_', ' ')}
                          </span>
                        </td>

                        {/* Approval Workflow */}
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            {approval === 'AI_READY' && (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                                <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                                <span>AI Ready</span>
                              </span>
                            )}
                            {approval === 'APPROVED' && (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-700 text-[10px] font-semibold uppercase tracking-wider">
                                <CheckCircle2 className="w-2.5 h-2.5 text-blue-600" />
                                <span>Approved</span>
                              </span>
                            )}
                            {approval === 'NEEDS_ADMIN_REVIEW' && (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-[10px] font-semibold uppercase tracking-wider">
                                <AlertCircle className="w-2.5 h-2.5 text-amber-600" />
                                <span>Admin Review</span>
                              </span>
                            )}
                            {approval === 'NEEDS_PERMISSION_REVIEW' && (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300 dark:border-purple-700 text-[10px] font-semibold uppercase tracking-wider">
                                <ShieldCheck className="w-2.5 h-2.5 text-purple-600" />
                                <span>Perm Review</span>
                              </span>
                            )}
                            {approval === 'NEEDS_IMAGE' && (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-700 text-[10px] font-semibold uppercase tracking-wider">
                                <AlertCircle className="w-2.5 h-2.5 text-rose-600" />
                                <span>Needs Image</span>
                              </span>
                            )}
                            {approval === 'DRAFT' && (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-[10px] font-semibold uppercase tracking-wider">
                                <span>Draft</span>
                              </span>
                            )}
                            <button
                              onClick={() => handleOpenApprovalModal(p)}
                              className="text-[9px] text-slate-500 hover:text-black dark:hover:text-white underline block font-mono"
                            >
                              Update Status &rarr;
                            </button>
                          </div>
                        </td>

                        {/* Try-On Compatibility Badge */}
                        <td className="py-3 px-4">
                          {compat === 'supported' ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[10px] font-semibold">
                              <Sparkles className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                              <span>Try-On Supported</span>
                            </span>
                          ) : compat === 'needs_image_replacement' ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[10px] font-semibold">
                              <AlertCircle className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                              <span>Needs High-Res</span>
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
                            onClick={() => handleOpenApprovalModal(p)}
                            className="p-1.5 text-slate-500 hover:text-black dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Approval Workflow & Status"
                          >
                            <ShieldCheck className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                          </button>
                          
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
        </>
        ) : (
          /* ============================================================== */
          /* MYNTRA CATALOGUE IMPORT SECTION                                */
          /* ============================================================== */
          <div className="space-y-6">
            
            {/* Header & Atelier Notice */}
            <div className="bg-white dark:bg-slate-900 p-6 border border-[#F9DFDF] dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center space-x-2 px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-[10px] uppercase font-bold tracking-widest mb-2">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Free Reference Catalogue System</span>
                  </div>
                  <h2 className="font-serif text-2xl text-slate-900 dark:text-white">
                    Myntra Catalogue Product Import
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Add fashion garments referenced from Myntra with documented image usage permissions, 250×250px dimension verification, and multi-stage approval.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleDownloadTemplate}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs uppercase tracking-wider font-semibold transition-colors flex items-center space-x-1.5 border border-slate-300 dark:border-slate-700"
                  >
                    <Download className="w-3.5 h-3.5 text-[#F5AFAF]" />
                    <span>Download CSV Template</span>
                  </button>
                </div>
              </div>

              {/* Legal & Atelier Policy Notice */}
              <div className="p-4 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-start space-x-3">
                <ShieldCheck className="w-4 h-4 text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold uppercase tracking-wider text-[11px]">Atelier Legal & Compliance Policy</p>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                    This import system does not scrape Myntra pages or bypass access gates. All imported items are stored as <strong>DRAFT</strong> until authorized high-resolution product photography (&ge;250×250px) and documented usage permissions are verified by an administrator.
                  </p>
                </div>
              </div>

              {/* Sub-Tabs: Single vs CSV */}
              <div className="flex items-center space-x-2 border-b border-[#F9DFDF] dark:border-slate-800 pt-2">
                <button
                  onClick={() => setImportSubTab('single')}
                  className={`px-4 py-2 text-xs uppercase tracking-wider font-semibold transition-all border-b-2 flex items-center space-x-1.5 ${
                    importSubTab === 'single'
                      ? 'border-black dark:border-white text-slate-900 dark:text-white font-bold'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Single Product Manual Reference</span>
                </button>

                <button
                  onClick={() => setImportSubTab('csv')}
                  className={`px-4 py-2 text-xs uppercase tracking-wider font-semibold transition-all border-b-2 flex items-center space-x-1.5 ${
                    importSubTab === 'csv'
                      ? 'border-black dark:border-white text-slate-900 dark:text-white font-bold'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>12-Column CSV Bulk Import</span>
                </button>
              </div>
            </div>

            {/* SUB-TAB 1: SINGLE PRODUCT MANUAL REFERENCE */}
            {importSubTab === 'single' && (
              <form onSubmit={handleSingleMyntraSubmit} className="bg-white dark:bg-slate-900 p-6 border border-[#F9DFDF] dark:border-slate-800 shadow-sm space-y-6">
                
                {singleImportSuccess && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>{singleImportSuccess}</span>
                  </div>
                )}

                {singleImportError && (
                  <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-xs text-red-800 dark:text-red-200 flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <span>{singleImportError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* Myntra URL */}
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>Myntra Product Page Reference URL</span>
                      <span className="text-[9px] text-slate-400 normal-case font-normal">(Used for external reference & duplicate prevention)</span>
                    </label>
                    <div className="relative">
                      <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="url"
                        placeholder="https://www.myntra.com/sarees/brand/product-name/12345/buy"
                        value={myntraSingleForm.myntraUrl}
                        onChange={(e) => setMyntraSingleForm({ ...myntraSingleForm, myntraUrl: e.target.value })}
                        className="w-full bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 text-xs text-slate-900 dark:text-white pl-9 pr-3 py-2.5 font-mono focus:outline-none focus:border-black dark:focus:border-white"
                      />
                    </div>
                  </div>

                  {/* Brand */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest font-semibold text-slate-700 dark:text-slate-300">
                      Brand Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sangria, Anouk, KALINI, nevash fashion"
                      value={myntraSingleForm.brand}
                      onChange={(e) => setMyntraSingleForm({ ...myntraSingleForm, brand: e.target.value })}
                      className="w-full bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 text-xs text-slate-900 dark:text-white px-3 py-2.5 focus:outline-none focus:border-black dark:focus:border-white"
                    />
                  </div>

                  {/* Product Title */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest font-semibold text-slate-700 dark:text-slate-300">
                      Product Title / Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Women Printed Pure Silk Saree"
                      value={myntraSingleForm.productTitle}
                      onChange={(e) => setMyntraSingleForm({ ...myntraSingleForm, productTitle: e.target.value })}
                      className="w-full bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 text-xs text-slate-900 dark:text-white px-3 py-2.5 focus:outline-none focus:border-black dark:focus:border-white"
                    />
                  </div>

                  {/* Selling Price */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest font-semibold text-slate-700 dark:text-slate-300">
                      Selling Price (INR ₹) *
                    </label>
                    <input
                      type="number"
                      step="1"
                      required
                      placeholder="e.g. 1320"
                      value={myntraSingleForm.sellingPrice}
                      onChange={(e) => setMyntraSingleForm({ ...myntraSingleForm, sellingPrice: e.target.value })}
                      className="w-full bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 text-xs text-slate-900 dark:text-white px-3 py-2.5 focus:outline-none focus:border-black dark:focus:border-white"
                    />
                  </div>

                  {/* Original Price */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest font-semibold text-slate-700 dark:text-slate-300">
                      Original / MRP Price (INR ₹)
                    </label>
                    <input
                      type="number"
                      step="1"
                      placeholder="e.g. 1749"
                      value={myntraSingleForm.originalPrice}
                      onChange={(e) => setMyntraSingleForm({ ...myntraSingleForm, originalPrice: e.target.value })}
                      className="w-full bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 text-xs text-slate-900 dark:text-white px-3 py-2.5 focus:outline-none focus:border-black dark:focus:border-white"
                    />
                  </div>

                  {/* Category */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest font-semibold text-slate-700 dark:text-slate-300">
                      Category *
                    </label>
                    <select
                      value={myntraSingleForm.categoryId}
                      onChange={(e) => setMyntraSingleForm({ ...myntraSingleForm, categoryId: e.target.value })}
                      className="w-full bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 text-xs text-slate-900 dark:text-white px-3 py-2.5 focus:outline-none focus:border-black dark:focus:border-white uppercase tracking-wider"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Subcategory */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest font-semibold text-slate-700 dark:text-slate-300">
                      Subcategory
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. sarees, silk_sarees, lehengas"
                      value={myntraSingleForm.subcategory}
                      onChange={(e) => setMyntraSingleForm({ ...myntraSingleForm, subcategory: e.target.value })}
                      className="w-full bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 text-xs text-slate-900 dark:text-white px-3 py-2.5 focus:outline-none focus:border-black dark:focus:border-white"
                    />
                  </div>

                  {/* Gender */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest font-semibold text-slate-700 dark:text-slate-300">
                      Target Audience / Gender
                    </label>
                    <select
                      value={myntraSingleForm.gender}
                      onChange={(e) => setMyntraSingleForm({ ...myntraSingleForm, gender: e.target.value })}
                      className="w-full bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 text-xs text-slate-900 dark:text-white px-3 py-2.5 focus:outline-none focus:border-black dark:focus:border-white uppercase tracking-wider"
                    >
                      <option value="women">Women</option>
                      <option value="men">Men</option>
                      <option value="unisex">Unisex</option>
                    </select>
                  </div>

                  {/* Garment Type */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest font-semibold text-slate-700 dark:text-slate-300">
                      Garment Type
                    </label>
                    <select
                      value={myntraSingleForm.garmentType}
                      onChange={(e) => setMyntraSingleForm({ ...myntraSingleForm, garmentType: e.target.value })}
                      className="w-full bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 text-xs text-slate-900 dark:text-white px-3 py-2.5 focus:outline-none focus:border-black dark:focus:border-white uppercase tracking-wider"
                    >
                      <option value="saree">Saree (6-Yard Unstitched Drape)</option>
                      <option value="full_body">Full Body Outfit / Dress</option>
                      <option value="upper_body">Upper Body</option>
                      <option value="lower_body">Lower Body</option>
                    </select>
                  </div>

                  {/* Colour & Fabric */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest font-semibold text-slate-700 dark:text-slate-300">
                      Primary Colour
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Cobalt Blue, Crimson Red, Gold"
                      value={myntraSingleForm.colour}
                      onChange={(e) => setMyntraSingleForm({ ...myntraSingleForm, colour: e.target.value })}
                      className="w-full bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 text-xs text-slate-900 dark:text-white px-3 py-2.5 focus:outline-none focus:border-black dark:focus:border-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest font-semibold text-slate-700 dark:text-slate-300">
                      Fabric & Weave
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Pure Silk, Art Silk, Chanderi Cotton, Georgette"
                      value={myntraSingleForm.fabric}
                      onChange={(e) => setMyntraSingleForm({ ...myntraSingleForm, fabric: e.target.value })}
                      className="w-full bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 text-xs text-slate-900 dark:text-white px-3 py-2.5 focus:outline-none focus:border-black dark:focus:border-white"
                    />
                  </div>

                  {/* Permission Status */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest font-semibold text-slate-700 dark:text-slate-300">
                      Image Usage Permission Status *
                    </label>
                    <select
                      value={myntraSingleForm.permissionStatus}
                      onChange={(e) => setMyntraSingleForm({ ...myntraSingleForm, permissionStatus: e.target.value })}
                      className="w-full bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 text-xs text-slate-900 dark:text-white px-3 py-2.5 focus:outline-none focus:border-black dark:focus:border-white font-semibold"
                    >
                      <option value="authorized">Authorized / Direct Brand Partner</option>
                      <option value="commercial_license">Commercial License (Licensed Studio Photography)</option>
                      <option value="brand_partner">Brand Partner Distribution</option>
                      <option value="pending_review">Pending Review (Draft Only)</option>
                      <option value="unauthorized">Unauthorized (Blocked from try-on)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest font-semibold text-slate-700 dark:text-slate-300">
                      Permission Documentation / License Notes
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Brand agreement #2026-SR, Shutterstock License #48912"
                      value={myntraSingleForm.permissionNotes}
                      onChange={(e) => setMyntraSingleForm({ ...myntraSingleForm, permissionNotes: e.target.value })}
                      className="w-full bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 text-xs text-slate-900 dark:text-white px-3 py-2.5 focus:outline-none focus:border-black dark:focus:border-white"
                    />
                  </div>

                </div>

                {/* Multi-View Image Uploads */}
                <div className="pt-4 border-t border-[#F9DFDF] dark:border-slate-800 space-y-4">
                  <div>
                    <h4 className="font-serif text-lg text-slate-900 dark:text-white">
                      Authorised Garment View Photographs
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Upload high-resolution original product photos. Required minimum: 250×250px (prefer &ge;1024px on longer side). Do not upload whole screenshots.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    {/* Front / Primary */}
                    <div className="p-4 border-2 border-dashed border-[#F9DFDF] dark:border-slate-800 rounded bg-[#FCF8F8] dark:bg-slate-950 space-y-2 text-center">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-rose-600 dark:text-rose-400">Front View (Primary) *</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => setSingleFiles({ ...singleFiles, frontImage: e.target.files[0] })}
                        className="block w-full text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:bg-slate-900 file:text-white"
                      />
                      {singleFiles.frontImage && (
                        <p className="text-[10px] text-emerald-600 font-semibold truncate">{singleFiles.frontImage.name}</p>
                      )}
                    </div>

                    {/* Back View */}
                    <div className="p-4 border-2 border-dashed border-[#F9DFDF] dark:border-slate-800 rounded bg-[#FCF8F8] dark:bg-slate-950 space-y-2 text-center">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Back View (Optional)</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => setSingleFiles({ ...singleFiles, backImage: e.target.files[0] })}
                        className="block w-full text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:bg-slate-800 file:text-white"
                      />
                      {singleFiles.backImage && (
                        <p className="text-[10px] text-emerald-600 font-semibold truncate">{singleFiles.backImage.name}</p>
                      )}
                    </div>

                    {/* Side View */}
                    <div className="p-4 border-2 border-dashed border-[#F9DFDF] dark:border-slate-800 rounded bg-[#FCF8F8] dark:bg-slate-950 space-y-2 text-center">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Side View (Optional)</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => setSingleFiles({ ...singleFiles, sideImage: e.target.files[0] })}
                        className="block w-full text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:bg-slate-800 file:text-white"
                      />
                      {singleFiles.sideImage && (
                        <p className="text-[10px] text-emerald-600 font-semibold truncate">{singleFiles.sideImage.name}</p>
                      )}
                    </div>

                    {/* Model View */}
                    <div className="p-4 border-2 border-dashed border-[#F9DFDF] dark:border-slate-800 rounded bg-[#FCF8F8] dark:bg-slate-950 space-y-2 text-center">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Model View (Optional)</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => setSingleFiles({ ...singleFiles, modelImage: e.target.files[0] })}
                        className="block w-full text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:bg-slate-800 file:text-white"
                      />
                      {singleFiles.modelImage && (
                        <p className="text-[10px] text-emerald-600 font-semibold truncate">{singleFiles.modelImage.name}</p>
                      )}
                    </div>

                  </div>
                </div>

                {/* Form Submit */}
                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#F9DFDF] dark:border-slate-800">
                  <button
                    type="submit"
                    disabled={singleImportLoading}
                    className="px-6 py-3 bg-[#000000] dark:bg-[#FFFFFF] text-white dark:text-black hover:opacity-90 text-xs uppercase tracking-widest font-semibold transition-all shadow flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4 text-[#F5AFAF]" />
                    <span>{singleImportLoading ? 'Validating & Saving...' : 'Save Product as Draft for Review'}</span>
                  </button>
                </div>

              </form>
            )}

            {/* SUB-TAB 2: CSV BULK IMPORT */}
            {importSubTab === 'csv' && (
              <div className="bg-white dark:bg-slate-900 p-6 border border-[#F9DFDF] dark:border-slate-800 shadow-sm space-y-6">
                
                {/* Format Guidance Card */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 dark:text-white">Required 12 CSV Columns (in order):</span>
                    <button
                      onClick={handleDownloadTemplate}
                      className="text-xs text-[#F5AFAF] hover:text-black dark:hover:text-white underline font-semibold flex items-center space-x-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Sample CSV</span>
                    </button>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-900 font-mono text-[11px] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 overflow-x-auto">
                    Brand, Product name, Myntra product URL, Selling price, Original price, Category, Subcategory, Gender, Colour, Fabric, Image filename, Image usage permission status
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Image files listed in <code>Image filename</code> should be placed into the backend <code>uploads/</code> directory before import.
                  </p>
                </div>

                {/* Upload or Paste Toggle */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 text-xs">
                    <button
                      type="button"
                      onClick={() => setCsvTabMode('upload')}
                      className={`px-3 py-1.5 font-semibold uppercase tracking-wider rounded ${
                        csvTabMode === 'upload' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      Upload .CSV File
                    </button>
                    <button
                      type="button"
                      onClick={() => setCsvTabMode('paste')}
                      className={`px-3 py-1.5 font-semibold uppercase tracking-wider rounded ${
                        csvTabMode === 'paste' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      Paste CSV Text
                    </button>
                  </div>

                  {csvTabMode === 'upload' ? (
                    <div className="p-8 border-2 border-dashed border-[#F9DFDF] dark:border-slate-800 rounded bg-[#FCF8F8] dark:bg-slate-950 text-center space-y-2">
                      <FileSpreadsheet className="w-8 h-8 mx-auto text-[#F5AFAF]" />
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">Select a valid CSV file</p>
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        onChange={(e) => setCsvFile(e.target.files[0])}
                        className="block mx-auto text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-slate-900 file:text-white"
                      />
                      {csvFile && (
                        <p className="text-xs text-emerald-600 font-semibold">{csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <textarea
                        rows={6}
                        placeholder="Paste CSV rows here including headers..."
                        value={csvText}
                        onChange={(e) => setCsvText(e.target.value)}
                        className="w-full bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 text-xs text-slate-900 dark:text-white p-3 font-mono focus:outline-none focus:border-black dark:focus:border-white"
                      />
                    </div>
                  )}

                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={handlePreviewCsv}
                      disabled={csvPreviewLoading}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-xs uppercase tracking-wider font-semibold transition-colors flex items-center space-x-2"
                    >
                      <Search className="w-4 h-4 text-[#F5AFAF]" />
                      <span>{csvPreviewLoading ? 'Validating Rows...' : 'Parse & Validate Rows'}</span>
                    </button>
                  </div>
                </div>

                {/* Validation Feedback Messages */}
                {csvImportError && (
                  <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-xs text-red-800 dark:text-red-200 flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <span>{csvImportError}</span>
                  </div>
                )}

                {csvImportSuccess && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>{csvImportSuccess}</span>
                  </div>
                )}

                {/* Preview Table & Summary */}
                {csvPreviewData && (
                  <div className="space-y-4 pt-4 border-t border-[#F9DFDF] dark:border-slate-800 animate-fadeIn">
                    
                    {/* Summary Statistics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Total Rows</span>
                        <p className="text-xl font-serif font-bold text-slate-900 dark:text-white">{csvPreviewData.totalRows}</p>
                      </div>
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center">
                        <span className="text-[10px] uppercase font-bold text-emerald-600">Valid Rows</span>
                        <p className="text-xl font-serif font-bold text-emerald-700 dark:text-emerald-300">{csvPreviewData.validCount}</p>
                      </div>
                      <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-center">
                        <span className="text-[10px] uppercase font-bold text-red-600">Invalid Rows</span>
                        <p className="text-xl font-serif font-bold text-red-700 dark:text-red-300">{csvPreviewData.invalidCount}</p>
                      </div>
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-center">
                        <span className="text-[10px] uppercase font-bold text-amber-600">Duplicates</span>
                        <p className="text-xl font-serif font-bold text-amber-700 dark:text-amber-300">{csvPreviewData.duplicateCount}</p>
                      </div>
                    </div>

                    {/* Commit Action */}
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-4 border border-[#F9DFDF] dark:border-slate-800">
                      <div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-white">
                          Ready to commit <strong>{csvPreviewData.validCount}</strong> validated rows to PostgreSQL.
                        </p>
                        <p className="text-[11px] text-slate-500">All imported items will be placed into DRAFT status for admin review.</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleCommitCsv}
                        disabled={csvCommitLoading || csvPreviewData.validCount === 0}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs uppercase tracking-widest font-semibold transition-all shadow flex items-center space-x-2 disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        <span>{csvCommitLoading ? 'Committing Import...' : `Import ${csvPreviewData.validCount} Valid Products`}</span>
                      </button>
                    </div>

                    {/* Validation Table */}
                    <div className="overflow-x-auto border border-[#F9DFDF] dark:border-slate-800">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-950 text-[10px] uppercase tracking-wider font-semibold border-b border-[#F9DFDF] dark:border-slate-800">
                            <th className="p-2.5">Row</th>
                            <th className="p-2.5">Brand & Name</th>
                            <th className="p-2.5">Myntra Reference URL</th>
                            <th className="p-2.5">Price</th>
                            <th className="p-2.5">Image Status</th>
                            <th className="p-2.5">Permission</th>
                            <th className="p-2.5">Initial Status</th>
                            <th className="p-2.5">Outcome</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                          {csvPreviewData.rows.map((r, idx) => (
                            <tr key={idx} className={r.isValid ? 'bg-white dark:bg-slate-900' : 'bg-red-50/40 dark:bg-red-950/20'}>
                              <td className="p-2.5 font-bold">#{r.rowIndex}</td>
                              <td className="p-2.5">
                                <span className="font-sans font-semibold text-slate-900 dark:text-white">{r.normalized.brand}</span>
                                <p className="text-[10px] font-sans text-slate-500 truncate max-w-[200px]">{r.normalized.productName}</p>
                              </td>
                              <td className="p-2.5 truncate max-w-[180px] text-[10px] text-slate-500" title={r.normalized.myntraUrl}>
                                {r.normalized.myntraUrl || '—'}
                              </td>
                              <td className="p-2.5">
                                ₹{r.normalized.sellingPrice} {r.normalized.originalPrice ? <span className="line-through text-slate-400 text-[10px]">₹{r.normalized.originalPrice}</span> : null}
                              </td>
                              <td className="p-2.5">
                                {r.normalized.imageMetadata ? (
                                  <span className={r.normalized.imageMetadata.isAiReady ? 'text-emerald-600 font-semibold' : 'text-amber-600'}>
                                    {r.normalized.imageMetadata.width}×{r.normalized.imageMetadata.height}px
                                  </span>
                                ) : (
                                  <span className="text-slate-400">Missing on Disk</span>
                                )}
                              </td>
                              <td className="p-2.5">
                                <span className="uppercase text-[9px] font-semibold">{r.normalized.permissionStatus}</span>
                              </td>
                              <td className="p-2.5">
                                <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 uppercase text-[9px] font-bold">
                                  {r.normalized.initialApprovalStatus}
                                </span>
                              </td>
                              <td className="p-2.5">
                                {r.isValid ? (
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold uppercase rounded">
                                    <Check className="w-2.5 h-2.5" />
                                    <span>VALID</span>
                                  </span>
                                ) : (
                                  <div className="space-y-0.5 text-red-600 text-[10px]">
                                    {r.errors.map((e, eIdx) => (
                                      <p key={eIdx}>&bull; {e}</p>
                                    ))}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                  </div>
                )}

              </div>
            )}

          </div>
        )}

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
      {/* PRODUCT APPROVAL WORKFLOW MODAL                                */}
      {/* ============================================================== */}
      {approvalModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-[#F9DFDF] dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#F9DFDF] dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-serif text-xl text-slate-900 dark:text-white">Product Approval & Quality Gate</h3>
                <p className="text-xs text-slate-500 font-mono">Product ID #{approvalModalProduct.id} &bull; {approvalModalProduct.sku}</p>
              </div>
              <button
                onClick={() => setApprovalModalProduct(null)}
                className="text-slate-400 hover:text-black dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Product Title:</span>
                <p className="text-sm font-serif font-medium text-slate-900 dark:text-white">{approvalModalProduct.name}</p>
                <p className="text-[11px] text-slate-500">{approvalModalProduct.brand} &bull; ₹{approvalModalProduct.price}</p>
              </div>

              {approvalModalProduct.myntraUrl && (
                <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Myntra Reference:</span>
                  <a
                    href={approvalModalProduct.myntraUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-rose-600 dark:text-rose-400 font-mono text-[10px] truncate hover:underline"
                  >
                    {approvalModalProduct.myntraUrl}
                  </a>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Dimensions:</span>
                  <p className="font-mono font-bold text-slate-900 dark:text-white">
                    {approvalModalProduct.dimensionLabel || 'Under 250px'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Permission Status:</span>
                  <p className="font-semibold uppercase text-slate-900 dark:text-white">
                    {approvalModalProduct.permissionStatus || 'authorized'}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider font-bold text-slate-700 dark:text-slate-300">
                  Target Approval Status
                </label>
                <select
                  value={newApprovalStatus}
                  onChange={(e) => setNewApprovalStatus(e.target.value)}
                  className="w-full bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 p-2.5 text-xs uppercase tracking-wider font-semibold"
                >
                  <option value="DRAFT">DRAFT (Inactive / Under Preparation)</option>
                  <option value="NEEDS_IMAGE">NEEDS_IMAGE (Image below 250px or Missing)</option>
                  <option value="NEEDS_PERMISSION_REVIEW">NEEDS_PERMISSION_REVIEW (Awaiting License)</option>
                  <option value="NEEDS_ADMIN_REVIEW">NEEDS_ADMIN_REVIEW (Atelier Review Queue)</option>
                  <option value="APPROVED">APPROVED (Active in Public Catalogue)</option>
                  <option value="AI_READY">AI_READY (Approved + High-Res Try-On Enabled)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider font-bold text-slate-700 dark:text-slate-300">
                  Review Notes / Audit Trail
                </label>
                <input
                  type="text"
                  placeholder="e.g. Verified resolution & photographer license."
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="w-full bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 p-2 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#F9DFDF] dark:border-slate-800">
              <button
                type="button"
                onClick={() => setApprovalModalProduct(null)}
                className="px-4 py-2 border border-slate-300 text-xs uppercase font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveApprovalStatus}
                disabled={isUpdatingApproval}
                className="px-5 py-2 bg-black dark:bg-white text-white dark:text-black text-xs uppercase tracking-wider font-semibold shadow hover:opacity-90"
              >
                {isUpdatingApproval ? 'Saving...' : 'Save Approval Status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLEAR CATALOGUE SAFETY MODAL */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-red-300 dark:border-red-800 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-serif text-lg font-bold">Clear All Catalogue Products</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              This action will remove <strong>all products</strong> from your PostgreSQL catalogue database.
              To confirm this destructive action, please type <strong>DELETE</strong> below:
            </p>
            <input
              type="text"
              placeholder="Type DELETE to confirm"
              value={clearConfirmText}
              onChange={(e) => setClearConfirmText(e.target.value)}
              className="w-full bg-[#FCF8F8] dark:bg-slate-950 border border-red-300 p-2.5 text-xs font-mono font-bold text-center tracking-widest text-red-600 focus:outline-none"
            />
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => { setShowClearModal(false); setClearConfirmText(''); }}
                className="px-4 py-2 border border-slate-300 text-xs uppercase font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAllCatalogue}
                disabled={clearConfirmText !== 'DELETE' || catalogueActionLoading}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs uppercase font-semibold disabled:opacity-40"
              >
                {catalogueActionLoading ? 'Deleting...' : 'Delete Everything'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET SEED MODAL */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-[#F9DFDF] dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 text-slate-900 dark:text-white">
              <RotateCcw className="w-5 h-5 text-[#F5AFAF]" />
              <h3 className="font-serif text-lg font-bold">Reset Catalogue to Atelier Default</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              This will reseed your database with the complete luxury atelier collection (64 original luxury garments, couture suits, and authentic handloom sarees).
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 border border-slate-300 text-xs uppercase font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetSeedCatalogue}
                disabled={catalogueActionLoading}
                className="px-5 py-2 bg-black dark:bg-white text-white dark:text-black text-xs uppercase font-semibold hover:opacity-90"
              >
                {catalogueActionLoading ? 'Reseeding...' : 'Reset to Default Seed'}
              </button>
            </div>
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

      {/* REPLACE PRODUCT IMAGE MODAL */}
      {/* ============================================================== */}
      {isReplaceModalOpen && replacingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-[#F9DFDF] dark:border-slate-800 w-full max-w-lg shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#F9DFDF] dark:border-slate-800">
              <div>
                <h3 className="font-serif text-lg text-slate-900 dark:text-white">
                  Replace Garment Image
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {replacingProduct.name} (ID: {replacingProduct.id})
                </p>
              </div>
              <button
                onClick={() => setIsReplaceModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleExecuteReplaceImage} className="p-6 space-y-5">
              
              {/* Current Image Details */}
              <div className="flex items-center space-x-4 p-3 bg-slate-50 dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800">
                <div className="w-16 h-20 bg-slate-200 dark:bg-slate-800 overflow-hidden flex-shrink-0">
                  <img
                    src={replacingProduct.primaryImage || replacingProduct.primary_image_url}
                    alt={replacingProduct.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="space-y-1 text-xs">
                  <p className="font-semibold text-slate-900 dark:text-white">Current Garment Image</p>
                  <p className="font-mono text-slate-500 dark:text-slate-400">
                    Resolution: {replacingProduct.dimensionLabel || (replacingProduct.imageWidth && replacingProduct.imageHeight ? `${replacingProduct.imageWidth} × ${replacingProduct.imageHeight} px` : 'Below 250px')}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Status: <span className="font-semibold text-amber-600 dark:text-amber-400 uppercase">{replacingProduct.tryonCompatibility || replacingProduct.tryon_compatibility || 'needs_image_replacement'}</span>
                  </p>
                </div>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-[11px] text-blue-900 dark:text-blue-300">
                <p className="font-semibold">Resolution Requirement:</p>
                <p>Genlook AI try-on strictly requires minimum 250×250px. Luxury atelier recommended standard is 1024×1024px or higher.</p>
              </div>

              {/* Upload New Image File */}
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider font-semibold text-slate-900 dark:text-white">
                  Upload High-Resolution File
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    setReplaceFile(e.target.files?.[0] || null);
                    if (e.target.files?.[0]) setReplaceUrl('');
                  }}
                  className="w-full bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 text-xs p-2 text-slate-900 dark:text-white"
                />
                <p className="text-[10px] text-slate-400">Supported formats: JPEG, PNG, WebP (Max 10MB)</p>
              </div>

              <div className="flex items-center space-x-2 text-xs text-slate-400">
                <div className="flex-1 border-t border-[#F9DFDF] dark:border-slate-800" />
                <span>OR</span>
                <div className="flex-1 border-t border-[#F9DFDF] dark:border-slate-800" />
              </div>

              {/* Enter High-Res Image URL */}
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider font-semibold text-slate-900 dark:text-white">
                  High-Resolution Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/... or /uploads/..."
                  value={replaceUrl}
                  onChange={(e) => {
                    setReplaceUrl(e.target.value);
                    if (e.target.value) setReplaceFile(null);
                  }}
                  className="w-full bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 text-xs p-2.5 text-slate-900 dark:text-white"
                />
              </div>

              {replaceError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-xs text-red-800 dark:text-red-300">
                  {replaceError}
                </div>
              )}

              {replaceSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300">
                  {replaceSuccess}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#F9DFDF] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsReplaceModalOpen(false)}
                  className="px-4 py-2 border border-[#F9DFDF] dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={replaceLoading}
                  className="px-6 py-2 bg-[#000000] dark:bg-[#FFFFFF] text-white dark:text-black hover:opacity-90 text-xs uppercase tracking-wider font-semibold disabled:opacity-50"
                >
                  {replaceLoading ? 'Updating Image...' : 'Save & Verify Image'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* PRODUCT APPROVAL WORKFLOW MODAL                                */}
      {/* ============================================================== */}
      {approvalModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-[#F9DFDF] dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#F9DFDF] dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-serif text-xl text-slate-900 dark:text-white">Product Approval & Quality Gate</h3>
                <p className="text-xs text-slate-500 font-mono">Product ID #{approvalModalProduct.id} &bull; {approvalModalProduct.sku}</p>
              </div>
              <button
                onClick={() => setApprovalModalProduct(null)}
                className="text-slate-400 hover:text-black dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Product Title:</span>
                <p className="text-sm font-serif font-medium text-slate-900 dark:text-white">{approvalModalProduct.name}</p>
                <p className="text-[11px] text-slate-500">{approvalModalProduct.brand} &bull; ₹{approvalModalProduct.price}</p>
              </div>

              {approvalModalProduct.myntraUrl && (
                <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Myntra Reference:</span>
                  <a
                    href={approvalModalProduct.myntraUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-rose-600 dark:text-rose-400 font-mono text-[10px] truncate hover:underline"
                  >
                    {approvalModalProduct.myntraUrl}
                  </a>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Dimensions:</span>
                  <p className="font-mono font-bold text-slate-900 dark:text-white">
                    {approvalModalProduct.dimensionLabel || 'Under 250px'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Permission Status:</span>
                  <p className="font-semibold uppercase text-slate-900 dark:text-white">
                    {approvalModalProduct.permissionStatus || 'authorized'}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider font-bold text-slate-700 dark:text-slate-300">
                  Target Approval Status
                </label>
                <select
                  value={newApprovalStatus}
                  onChange={(e) => setNewApprovalStatus(e.target.value)}
                  className="w-full bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 p-2.5 text-xs uppercase tracking-wider font-semibold"
                >
                  <option value="DRAFT">DRAFT (Inactive / Under Preparation)</option>
                  <option value="NEEDS_IMAGE">NEEDS_IMAGE (Image below 250px or Missing)</option>
                  <option value="NEEDS_PERMISSION_REVIEW">NEEDS_PERMISSION_REVIEW (Awaiting License)</option>
                  <option value="NEEDS_ADMIN_REVIEW">NEEDS_ADMIN_REVIEW (Atelier Review Queue)</option>
                  <option value="APPROVED">APPROVED (Active in Public Catalogue)</option>
                  <option value="AI_READY">AI_READY (Approved + High-Res Try-On Enabled)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider font-bold text-slate-700 dark:text-slate-300">
                  Review Notes / Audit Trail
                </label>
                <input
                  type="text"
                  placeholder="e.g. Verified resolution & photographer license."
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="w-full bg-[#FCF8F8] dark:bg-slate-950 border border-[#F9DFDF] dark:border-slate-800 p-2 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#F9DFDF] dark:border-slate-800">
              <button
                type="button"
                onClick={() => setApprovalModalProduct(null)}
                className="px-4 py-2 border border-slate-300 text-xs uppercase font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveApprovalStatus}
                disabled={isUpdatingApproval}
                className="px-5 py-2 bg-black dark:bg-white text-white dark:text-black text-xs uppercase tracking-wider font-semibold shadow hover:opacity-90"
              >
                {isUpdatingApproval ? 'Saving...' : 'Save Approval Status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLEAR CATALOGUE SAFETY MODAL */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-red-300 dark:border-red-800 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-serif text-lg font-bold">Clear All Catalogue Products</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              This action will remove <strong>all products</strong> from your PostgreSQL catalogue database.
              To confirm this destructive action, please type <strong>DELETE</strong> below:
            </p>
            <input
              type="text"
              placeholder="Type DELETE to confirm"
              value={clearConfirmText}
              onChange={(e) => setClearConfirmText(e.target.value)}
              className="w-full bg-[#FCF8F8] dark:bg-slate-950 border border-red-300 p-2.5 text-xs font-mono font-bold text-center tracking-widest text-red-600 focus:outline-none"
            />
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => { setShowClearModal(false); setClearConfirmText(''); }}
                className="px-4 py-2 border border-slate-300 text-xs uppercase font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAllCatalogue}
                disabled={clearConfirmText !== 'DELETE' || catalogueActionLoading}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs uppercase font-semibold disabled:opacity-40"
              >
                {catalogueActionLoading ? 'Deleting...' : 'Delete Everything'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET SEED MODAL */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-[#F9DFDF] dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 text-slate-900 dark:text-white">
              <RotateCcw className="w-5 h-5 text-[#F5AFAF]" />
              <h3 className="font-serif text-lg font-bold">Reset Catalogue to Atelier Default</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              This will reseed your database with the complete luxury atelier collection (64 original luxury garments, couture suits, and authentic handloom sarees).
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 border border-slate-300 text-xs uppercase font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetSeedCatalogue}
                disabled={catalogueActionLoading}
                className="px-5 py-2 bg-black dark:bg-white text-white dark:text-black text-xs uppercase font-semibold hover:opacity-90"
              >
                {catalogueActionLoading ? 'Reseeding...' : 'Reset to Default Seed'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
