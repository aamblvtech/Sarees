import React, { useState } from 'react';
import { Upload, Camera, Save, Sparkles, Layers, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ComponentAnnotator } from '../components/ComponentAnnotator';
import { api } from '../services/api';

export const SareeRegistration: React.FC = () => {
  const navigate = useNavigate();
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [fabric, setFabric] = useState('Pure Kanjeevaram Silk');
  const [color, setColor] = useState('Deep Maroon & Gold');
  const [occasion, setOccasion] = useState('Bridal & Wedding');
  const [price, setPrice] = useState(65000);
  const [borderType, setBorderType] = useState('Korvai Broad Gold Zari');
  const [palluDetails, setPalluDetails] = useState('Heavy Rich Pallu with Mayil and Rudraksh buttas');
  const [blouseDetails, setBlouseDetails] = useState('Unstitched pure silk piece with border');
  const [stockQuantity, setStockQuantity] = useState(3);
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=85');

  const [createdProductId, setCreatedProductId] = useState<string | null>(null);
  const [step, setStep] = useState<'info' | 'annotate'>('info');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRegisterProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku.trim() || !name.trim()) {
      setErrorMsg('SKU and Saree Name are required.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const product = await api.createProduct({
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        fabric,
        color,
        occasion,
        price: Number(price),
        borderType,
        palluDetails,
        blousePiece: true,
        blouseDetails,
        stockQuantity: Number(stockQuantity),
        primaryImageUrl: imageUrl,
      });

      setCreatedProductId(product.id);
      setStep('annotate');
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to register product in PostgreSQL.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAnnotations = async (annotations: any) => {
    if (!createdProductId) return;
    await api.saveAnnotations(createdProductId, annotations);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E8E2D5] pb-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-[#B99A5B] font-bold">Catalog Ingestion</div>
          <h1 className="font-serif text-3xl font-bold text-[#681D32]">
            Folded Saree Registration & Component Mapping
          </h1>
          <p className="text-xs text-[#292522]/70 mt-1">
            Capture a flat-lay folded saree photograph, extract structural boundaries, and store verified component metadata.
          </p>
        </div>

        <Link
          to="/staff"
          className="text-xs font-semibold text-[#681D32] hover:text-[#852842] flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Staff Suite</span>
        </Link>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {step === 'info' ? (
        <form onSubmit={handleRegisterProduct} className="bg-[#FAF7F0] border border-[#E8E2D5] rounded-2xl p-8 shadow-sm space-y-6">
          <h3 className="font-serif text-xl font-bold text-[#681D32] border-b border-[#E8E2D5] pb-2">
            Step 1: Garment Attributes & Folded Photography
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-semibold text-[#292522] block mb-1">Product SKU *</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                placeholder="e.g. SAJEE-KANJ-007"
                required
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E2D5] bg-[#FAF7F0] focus:border-[#681D32] outline-none font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#292522] block mb-1">Masterpiece Title *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Shringar Banarasi Brocade"
                required
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E2D5] bg-[#FAF7F0] focus:border-[#681D32] outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#292522] block mb-1">Heritage Fabric</label>
              <select
                value={fabric}
                onChange={(e) => setFabric(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E2D5] bg-[#FAF7F0] focus:border-[#681D32] outline-none"
              >
                <option value="Pure Kanjeevaram Silk">Pure Kanjeevaram Silk</option>
                <option value="Banarasi Katan Silk">Banarasi Katan Silk</option>
                <option value="Chanderi Silk Cotton">Chanderi Silk Cotton</option>
                <option value="Pure Paithani Silk">Pure Paithani Silk</option>
                <option value="Handloom Tussar Silk">Handloom Tussar Silk</option>
                <option value="Pure Silk Organza">Pure Silk Organza</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#292522] block mb-1">Occasion</label>
              <select
                value={occasion}
                onChange={(e) => setOccasion(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E2D5] bg-[#FAF7F0] focus:border-[#681D32] outline-none"
              >
                <option value="Bridal & Wedding">Bridal & Wedding</option>
                <option value="Festive & Reception">Festive & Reception</option>
                <option value="Traditional Ceremony">Traditional Ceremony</option>
                <option value="Cocktail & Evening">Cocktail & Evening</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#292522] block mb-1">Showroom Price (INR)</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E2D5] bg-[#FAF7F0] focus:border-[#681D32] outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#292522] block mb-1">Available Pieces in Stock</label>
              <input
                type="number"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E2D5] bg-[#FAF7F0] focus:border-[#681D32] outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-[#292522] block mb-1">Folded Saree Image URL</label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E2D5] bg-[#FAF7F0] focus:border-[#681D32] outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-[#681D32] hover:bg-[#852842] text-white rounded-xl text-xs font-bold shadow flex items-center gap-2"
            >
              <span>{loading ? 'Registering...' : 'Register Saree & Launch Component Annotator'}</span>
              <Sparkles className="w-4 h-4 text-[#B99A5B]" />
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-[#F2EDE2] p-4 rounded-xl border border-[#B99A5B]">
            <div>
              <div className="font-bold text-xs text-[#681D32]">Saree Registered in Database</div>
              <div className="text-xs text-[#292522]">{name} ({sku}) • ID: {createdProductId}</div>
            </div>
            <button
              onClick={() => navigate('/catalog')}
              className="px-4 py-2 bg-[#681D32] text-white rounded-lg text-xs font-semibold"
            >
              Finish & Return to Catalog
            </button>
          </div>

          <ComponentAnnotator
            imageUrl={imageUrl}
            onSave={handleSaveAnnotations}
          />
        </div>
      )}
    </div>
  );
};
