import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Scan, Plus, Trash2, Sparkles, CheckCircle2, AlertCircle, RefreshCw, Monitor, ArrowRight, Shield, Layers } from 'lucide-react';
import { SareeProduct, KioskDevice } from '../types';
import { api } from '../services/api';

interface StaffDashboardProps {
  products: SareeProduct[];
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({ products }) => {
  const [skuInput, setSkuInput] = useState('');
  const [scannedProduct, setScannedProduct] = useState<SareeProduct | null>(null);
  const [collection, setCollection] = useState<SareeProduct[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [selectedKioskId, setSelectedKioskId] = useState('');
  const [kiosks, setKiosks] = useState<KioskDevice[]>([]);
  const [qrSessionData, setQrSessionData] = useState<{
    token: string;
    qrDataUrl: string;
    qrTargetUrl: string;
    expiresAt: string;
    sessionId: string;
  } | null>(null);

  const [loadingSku, setLoadingSku] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [recentJobs, setRecentJobs] = useState<any[]>([
    { id: 'job-901', customer: 'Meera V.', sku: 'SAJEE-KANJ-001', status: 'completed', provider: 'MOCK', timestamp: '5 mins ago' },
    { id: 'job-902', customer: 'Ananya S.', sku: 'SAJEE-BNR-002', status: 'completed', provider: 'MOCK', timestamp: '12 mins ago' },
  ]);

  useEffect(() => {
    async function loadKiosks() {
      try {
        const data = await api.getKiosks();
        setKiosks(data);
        if (data.length > 0) setSelectedKioskId(data[0].id);
      } catch (e) {
        console.warn('Could not load kiosks', e);
      }
    }
    loadKiosks();
  }, []);

  const handleLookupSku = async (targetSku?: string) => {
    const sku = (targetSku || skuInput).trim().toUpperCase();
    if (!sku) return;

    setLoadingSku(true);
    setErrorMsg(null);
    try {
      const data = await api.getProductBySku(sku);
      setScannedProduct(data);
    } catch (e: any) {
      setErrorMsg(e.message || `No saree matching barcode SKU '${sku}' found in PostgreSQL.`);
      setScannedProduct(null);
    } finally {
      setLoadingSku(false);
    }
  };

  const handleAddToCollection = () => {
    if (!scannedProduct) return;
    if (collection.some(item => item.id === scannedProduct.id)) {
      setErrorMsg(`Saree ${scannedProduct.sku} is already added to this customer selection.`);
      return;
    }
    setCollection([...collection, scannedProduct]);
    setScannedProduct(null);
    setSkuInput('');
  };

  const handleRemoveFromCollection = (id: string) => {
    setCollection(collection.filter(item => item.id !== id));
  };

  const handleCreateQrSession = async () => {
    if (collection.length === 0) {
      setErrorMsg('Please scan and add at least one saree to the customer collection first.');
      return;
    }

    try {
      const res = await api.createSession({
        customerName: customerName || 'Valued Guest',
        kioskId: selectedKioskId,
        initialProductIds: collection.map(p => p.id),
      });

      setQrSessionData(res);
      setErrorMsg(null);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to generate showroom QR session.');
    }
  };

  const handleRevokeSession = async () => {
    if (!qrSessionData) return;
    try {
      await api.revokeSession(qrSessionData.sessionId);
      setQrSessionData(null);
      setCollection([]);
      alert('Session successfully revoked and wiped.');
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to revoke session');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      
      {/* Header Banner */}
      <div className="bg-[#681D32] text-white rounded-2xl p-6 sm:p-8 shadow-sajee flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#B99A5B] text-xs font-semibold uppercase tracking-wider">
            <Shield className="w-4 h-4" />
            <span>SAJEE Showroom Stylist & Draper Suite</span>
          </div>
          <h1 className="font-serif text-3xl font-bold mt-1">
            Barcode Ingestion & Collection Builder
          </h1>
          <p className="text-xs text-[#FAF7F0]/80 mt-1 max-w-xl">
            Scan physical saree barcodes, curate the customer's try-on suite, and project it directly to the 4K showroom kiosk via secure QR codes.
          </p>
        </div>

        <div className="bg-[#FAF7F0]/10 backdrop-blur-md px-4 py-3 rounded-xl border border-[#B99A5B]/30 text-xs space-y-1">
          <div className="text-[#B99A5B] font-semibold">Active Associate:</div>
          <div className="font-bold text-white">Ananya Sharma (Senior Draper)</div>
          <div className="text-[10px] text-[#FAF7F0]/70">Flagship Lavelle Rd • Station 01</div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="font-bold">✕</button>
        </div>
      )}

      {/* Main Grid: Left Scanner & Right Collection Builder */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: BARCODE SCANNER & LOOKUP */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#FAF7F0] border border-[#E8E2D5] rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-[#E8E2D5] pb-3">
              <div className="flex items-center gap-2 font-serif font-bold text-base text-[#681D32]">
                <Scan className="w-5 h-5 text-[#B99A5B]" />
                <span>Barcode / SKU Scanner</span>
              </div>
              <span className="text-[10px] text-[#B99A5B] bg-[#B99A5B]/10 px-2.5 py-0.5 rounded font-semibold uppercase">
                PostgreSQL Lookup
              </span>
            </div>

            {/* Quick Scan Simulation Buttons for Demo Sarees */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#292522]">Instant Test Barcode Trigger:</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {products.slice(0, 4).map(p => (
                  <button
                    key={p.sku}
                    onClick={() => {
                      setSkuInput(p.sku);
                      handleLookupSku(p.sku);
                    }}
                    className="p-2 rounded-lg border border-[#E8E2D5] bg-[#FAF7F0] hover:border-[#681D32] hover:bg-[#F2EDE2] text-left transition-colors text-[11px]"
                  >
                    <div className="font-bold text-[#681D32]">{p.sku}</div>
                    <div className="text-[#292522]/70 truncate">{p.name.split(' ')[0]} Silk</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Manual SKU Input */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-semibold text-[#292522]">Manual SKU Entry:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={skuInput}
                  onChange={(e) => setSkuInput(e.target.value.toUpperCase())}
                  placeholder="e.g. SAJEE-KANJ-001"
                  className="flex-1 px-3 py-2 text-xs rounded-lg border border-[#E8E2D5] bg-[#FAF7F0] focus:border-[#681D32] outline-none font-mono"
                />
                <button
                  onClick={() => handleLookupSku()}
                  disabled={loadingSku}
                  className="px-4 py-2 bg-[#681D32] hover:bg-[#852842] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                >
                  <Scan className="w-3.5 h-3.5 text-[#B99A5B]" />
                  <span>{loadingSku ? 'Looking up...' : 'Lookup'}</span>
                </button>
              </div>
            </div>

            {/* Scanned Saree Result Card */}
            {scannedProduct && (
              <div className="p-4 bg-[#F2EDE2] rounded-xl border border-[#B99A5B] space-y-3 animate-in fade-in">
                <div className="flex gap-3 items-center">
                  <img
                    src={scannedProduct.primaryImage}
                    alt={scannedProduct.name}
                    className="w-16 h-20 object-cover rounded-lg border border-[#B99A5B]/40 shrink-0"
                  />
                  <div className="overflow-hidden">
                    <div className="text-[10px] text-[#B99A5B] font-bold uppercase">{scannedProduct.sku}</div>
                    <div className="font-serif font-bold text-sm text-[#681D32] truncate">{scannedProduct.name}</div>
                    <div className="text-xs text-[#292522]/80 font-medium">₹{scannedProduct.price.toLocaleString('en-IN')}</div>
                    <div className="text-[11px] text-[#292522]/70">{scannedProduct.fabric}</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E8E2D5] flex items-center justify-between">
                  <span className="text-xs text-[#292522]/80">
                    Stock: <strong>{scannedProduct.stockQuantity} in salon</strong>
                  </span>
                  <button
                    onClick={handleAddToCollection}
                    className="px-4 py-1.5 bg-[#681D32] hover:bg-[#852842] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#B99A5B]" />
                    <span>Add to Customer Suite</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: CUSTOMER TRY-ON COLLECTION & QR DISPATCH */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#FAF7F0] border border-[#E8E2D5] rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-[#E8E2D5] pb-3">
              <div className="flex items-center gap-2 font-serif font-bold text-base text-[#681D32]">
                <Layers className="w-5 h-5 text-[#B99A5B]" />
                <span>Customer Try-On Collection ({collection.length} Sarees)</span>
              </div>
              <span className="text-xs text-[#292522]/60 font-medium">Auto-Expires in 60 mins</span>
            </div>

            {/* Customer Name & Kiosk Assignment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[#292522] block mb-1">Customer Name / ID:</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Meera Venkatesh (Bridal Suite)"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E2D5] bg-[#FAF7F0] focus:border-[#681D32] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#292522] block mb-1">Target Showroom Kiosk:</label>
                <select
                  value={selectedKioskId}
                  onChange={(e) => setSelectedKioskId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E2D5] bg-[#FAF7F0] focus:border-[#681D32] outline-none cursor-pointer"
                >
                  {kiosks.map(k => (
                    <option key={k.id} value={k.id}>
                      {k.name} ({k.identifier})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Collection Items List */}
            {collection.length > 0 ? (
              <div className="space-y-2 border border-[#E8E2D5] rounded-xl p-3 bg-[#F2EDE2]/40 max-h-64 overflow-y-auto">
                {collection.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-2.5 bg-[#FAF7F0] rounded-lg border border-[#E8E2D5] shadow-xs">
                    <div className="flex items-center gap-3">
                      <img src={item.primaryImage} alt={item.name} className="w-12 h-14 object-cover rounded" />
                      <div>
                        <div className="font-semibold text-xs text-[#681D32]">{item.name}</div>
                        <div className="text-[11px] text-[#292522]/70">{item.sku} • {item.fabric}</div>
                        <div className="text-[11px] font-bold text-[#292522]">₹{item.price.toLocaleString('en-IN')}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveFromCollection(item.id)}
                      className="p-1.5 text-[#292522]/40 hover:text-red-600 rounded"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-xs text-[#292522]/60 border border-dashed border-[#E8E2D5] rounded-xl bg-[#F2EDE2]/20">
                No sarees added yet. Scan barcodes from the left panel to build the customer's suite.
              </div>
            )}

            {/* QR Generation Action */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={handleCreateQrSession}
                disabled={collection.length === 0}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all ${
                  collection.length > 0
                    ? 'bg-[#681D32] hover:bg-[#852842] text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <QrCode className="w-4 h-4 text-[#B99A5B]" />
                <span>Generate Secure Showroom QR Session</span>
              </button>
            </div>
          </div>

          {/* ACTIVE QR MODAL / SESSION CARD */}
          {qrSessionData && (
            <div className="bg-[#FAF7F0] border-2 border-[#681D32] rounded-2xl p-6 shadow-xl space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-[#E8E2D5] pb-3">
                <div className="flex items-center gap-2 text-sm font-serif font-bold text-[#681D32]">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Session Active: Present QR to Customer</span>
                </div>
                <button
                  onClick={handleRevokeSession}
                  className="px-3 py-1 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-xs font-semibold rounded-lg"
                >
                  Revoke & Expire Now
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                <div className="flex flex-col items-center p-4 bg-white rounded-xl border border-[#B99A5B]/40 shadow-inner">
                  <img
                    src={qrSessionData.qrDataUrl}
                    alt="Customer Session QR Code"
                    className="w-48 h-48 object-contain"
                  />
                  <div className="text-[10px] text-[#292522]/70 font-mono mt-2">
                    Token: {qrSessionData.token.slice(0, 12)}...
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-[#292522]/60">Assigned Kiosk:</span>
                    <div className="font-bold text-[#681D32]">
                      {kiosks.find(k => k.id === selectedKioskId)?.name || 'Salon Monolith 01'}
                    </div>
                  </div>
                  <div>
                    <span className="text-[#292522]/60">Valid Until:</span>
                    <div className="font-semibold text-[#292522]">
                      {new Date(qrSessionData.expiresAt).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="pt-2">
                    <a
                      href={qrSessionData.qrTargetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#681D32] hover:bg-[#852842] text-white rounded-lg text-xs font-bold"
                    >
                      <span>Open Customer View</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
