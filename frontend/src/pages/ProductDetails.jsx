import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Scissors, AlertCircle, Check } from 'lucide-react';
import productService from '../services/productService';
import ProductStatusBadge, { ATELIER_FALLBACK_IMAGE } from '../components/ProductStatusBadge';

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedSize, setSelectedSize] = useState('M');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    async function fetchProduct() {
      setLoading(true);
      setError(null);
      try {
        const data = await productService.getProductById(id);
        if (data) {
          setProduct(data);
          setSelectedImage(data.primaryImage || data.images?.[0]);
          if (data.sizes && data.sizes.length > 0) {
            setSelectedSize(data.sizes[0]);
          }
        } else {
          setError('Product not found.');
        }
      } catch (err) {
        setError('Error loading product details.');
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [id]);

  const handleLaunchTryOn = () => {
    if (!product) return;
    navigate(`/try-on?productId=${product.id}&size=${selectedSize}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#121316] flex items-center justify-center p-8 transition-colors">
        <div className="text-center space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-neutral-400" strokeWidth={1.5} />
          <p className="text-xs text-neutral-500 font-mono">Loading garment details...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#121316] flex items-center justify-center p-8 transition-colors">
        <div className="text-center space-y-4 max-w-md bg-neutral-50 dark:bg-[#17181C] p-8 border border-black/[0.08] dark:border-white/[0.08] rounded-lg">
          <h2 className="font-serif text-2xl text-neutral-900 dark:text-neutral-100">Garment Unavailable</h2>
          <p className="text-xs text-neutral-500">{error || 'Unable to locate this garment in the collection.'}</p>
          <Link
            to="/catalogue"
            className="inline-flex h-9 px-5 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-medium rounded items-center justify-center transition-colors"
          >
            Return to Catalogue
          </Link>
        </div>
      </div>
    );
  }

  const formattedPrice = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: product.currency || 'INR',
    maximumFractionDigits: 0
  }).format(product.price);

  const formattedOriginalPrice = product.originalPrice
    ? new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: product.currency || 'INR',
        maximumFractionDigits: 0
      }).format(product.originalPrice)
    : null;

  const imageList = product.images && product.images.length > 0
    ? product.images
    : [product.primaryImage];

  const availableSizes = product.sizes || ['XS', 'S', 'M', 'L', 'XL'];

  return (
    <div className="min-h-screen bg-white dark:bg-[#121316] text-neutral-900 dark:text-neutral-100 py-8 sm:py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Back Link */}
        <div>
          <Link
            to="/catalogue"
            className="inline-flex items-center space-x-1.5 text-xs text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 opacity-60" strokeWidth={1.5} />
            <span>Collection</span>
          </Link>
        </div>

        {/* Product Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          
          {/* Left Column: Photograph Gallery */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Main Stage Image */}
            <div className="relative aspect-[3/4] bg-neutral-100 dark:bg-neutral-900 border border-black/[0.08] dark:border-white/[0.08] rounded-lg overflow-hidden group">
              <img
                src={selectedImage || ATELIER_FALLBACK_IMAGE}
                alt={product.name}
                onError={(e) => { e.currentTarget.src = ATELIER_FALLBACK_IMAGE; }}
                className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]"
              />
              
              <div className="absolute top-4 left-4">
                <ProductStatusBadge product={product} size="sm" />
              </div>

              {product.tryonCompatibility !== 'needs_image_replacement' && product.isAiReady !== false && product.tryonCompatibility !== 'unsupported' && (
                <button
                  onClick={handleLaunchTryOn}
                  className="absolute top-4 right-4 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md text-neutral-900 dark:text-white px-3.5 py-1.5 text-xs font-medium rounded-md shadow-xs border border-black/[0.08] dark:border-white/[0.08] hover:bg-neutral-50 transition-colors"
                >
                  Start Virtual Try-On
                </button>
              )}
            </div>

            {/* Thumbnail Carousel */}
            {imageList.length > 1 && (
              <div className="flex space-x-3 overflow-x-auto pb-2">
                {imageList.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(imgUrl)}
                    className={`relative w-20 aspect-[3/4] rounded border overflow-hidden transition-all flex-shrink-0 ${
                      selectedImage === imgUrl
                        ? 'border-neutral-900 dark:border-white'
                        : 'border-black/[0.08] dark:border-white/[0.08] opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover object-top" />
                  </button>
                ))}
              </div>
            )}

          </div>

          {/* Right Column: Garment Information & Actions */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Header info */}
            <div className="space-y-2 pb-6 border-b border-black/[0.08] dark:border-white/[0.08]">
              <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                <span>{product.brand || 'VASTRA'} &bull; {product.categoryName || 'Couture'}</span>
                <span className="font-mono">{product.sku}</span>
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl text-neutral-900 dark:text-neutral-100 font-normal leading-tight">
                {product.name}
              </h1>

              <div className="flex items-baseline space-x-3 pt-1">
                <span className="text-2xl font-mono font-medium text-neutral-900 dark:text-neutral-100">
                  {formattedPrice}
                </span>
                {formattedOriginalPrice && (
                  <span className="text-sm font-mono text-neutral-400 line-through">
                    {formattedOriginalPrice}
                  </span>
                )}
                <span className="text-xs text-neutral-500">
                  Taxes included
                </span>
              </div>
            </div>

            {/* Garment Description */}
            <div className="space-y-3">
              <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed font-light">
                {product.description}
              </p>
            </div>

            {/* Size Selector */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
                  Select Size
                </label>
                <button
                  onClick={handleLaunchTryOn}
                  className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white inline-flex items-center space-x-1"
                >
                  <Scissors className="w-3 h-3 opacity-60" strokeWidth={1.5} />
                  <span>Virtual fit preview</span>
                </button>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {availableSizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`py-2.5 text-xs font-medium border rounded transition-colors ${
                      selectedSize === size
                        ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white shadow-xs'
                        : 'bg-white dark:bg-[#17181C] text-neutral-800 dark:text-neutral-200 border-black/[0.08] dark:border-white/[0.08] hover:border-black/20'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-3">
              {product.tryonCompatibility === 'needs_image_replacement' || product.isAiReady === false ? (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 rounded text-xs text-amber-900 dark:text-amber-200 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div>
                    <p className="font-medium">Catalogue preview only</p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">High-resolution photography is currently being scheduled for this piece.</p>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleLaunchTryOn}
                  className="w-full h-11 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-100 dark:hover:bg-white dark:text-neutral-900 text-xs font-medium rounded-md flex items-center justify-center transition-colors shadow-xs"
                >
                  Try On in Virtual Fitting Room
                </button>
              )}

              <button
                onClick={() => alert(`Added ${product.name} (Size: ${selectedSize}) to your bag.`)}
                className="w-full h-11 bg-white hover:bg-neutral-50 dark:bg-[#17181C] dark:hover:bg-neutral-800 border border-black/[0.12] dark:border-white/[0.12] text-neutral-900 dark:text-white text-xs font-medium rounded-md transition-colors"
              >
                Add Size {selectedSize} to Bag &bull; {formattedPrice}
              </button>
            </div>

            {/* Specification Tabs */}
            <div className="pt-6 border-t border-black/[0.08] dark:border-white/[0.08] space-y-3">
              <div className="flex border-b border-black/[0.06] dark:border-white/[0.06] text-xs">
                {[
                  { id: 'details', label: 'Material & Craft' },
                  { id: 'fit', label: 'Silhouette & Fit' },
                  { id: 'delivery', label: 'Delivery & Care' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`pb-2.5 mr-6 font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'border-b-2 border-neutral-900 dark:border-white text-neutral-900 dark:text-white'
                        : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed pt-1">
                {activeTab === 'details' && (
                  <div className="space-y-1.5">
                    <p><span className="text-neutral-900 dark:text-neutral-200">Fabric:</span> {product.material || 'Mulberry Silk & Fine Wool Blend'}</p>
                    <p><span className="text-neutral-900 dark:text-neutral-200">Finishing:</span> Hand-rolled edges with reinforced structural seams</p>
                  </div>
                )}
                {activeTab === 'fit' && (
                  <div className="space-y-1.5">
                    <p><span className="text-neutral-900 dark:text-neutral-200">Silhouette:</span> {product.fit || 'Tailored shoulder with fluid fall'}</p>
                    <p><span className="text-neutral-900 dark:text-neutral-200">Virtual Fitting:</span> Calibrated with 2D garment drape models</p>
                  </div>
                )}
                {activeTab === 'delivery' && (
                  <div className="space-y-1.5">
                    <p><span className="text-neutral-900 dark:text-neutral-200">Care:</span> {product.careInstructions || 'Specialist dry clean only'}</p>
                    <p><span className="text-neutral-900 dark:text-neutral-200">Shipping:</span> Dispatched in archival protective packaging</p>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
