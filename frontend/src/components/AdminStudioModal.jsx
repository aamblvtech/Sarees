import React, { useState, useEffect } from 'react';
import { X, Lock, Plus, Trash2, CheckCircle, RefreshCw, Activity, Package, Layers } from 'lucide-react';

export default function AdminStudioModal({ isOpen, onClose, onRefreshCatalog }) {
  const [token, setToken] = useState(localStorage.getItem('admin_token') || '');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory', 'add', 'stats'

  // Catalog items in admin
  const [adminItems, setAdminItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  // New product form
  const [newName, setNewName] = useState('');
  const [newDept, setNewDept] = useState('Indian');
  const [newCategory, setNewCategory] = useState('sarees');
  const [newType, setNewType] = useState('one-piece');
  const [newPrice, setNewPrice] = useState('2999');
  const [newFabric, setNewFabric] = useState('Pure Silk');
  const [newColor, setNewColor] = useState('Royal Gold');
  const [newDesc, setNewDesc] = useState('');
  const [newImageFile, setNewImageFile] = useState(null);
  const [formMsg, setFormMsg] = useState('');

  // AI Configuration state
  const [selectedProvider, setSelectedProvider] = useState('idm-vton');
  const [colabUrlInput, setColabUrlInput] = useState('');
  const [hfTokenInput, setHfTokenInput] = useState('');
  const [fashnKeyInput, setFashnKeyInput] = useState('');
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [configMsg, setConfigMsg] = useState('');

  const handleSaveConfig = async () => {
    setConfigMsg('Saving AI settings...');
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider: selectedProvider,
          colab_vton_url: colabUrlInput,
          hf_token: hfTokenInput,
          fashn_api_key: fashnKeyInput,
          gemini_api_key: geminiKeyInput
        })
      });
      if (!res.ok) throw new Error('Could not update AI settings.');
      setConfigMsg('AI settings updated successfully!');
      fetchAdminData();
    } catch (err) {
      setConfigMsg(err.message);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) {
        throw new Error('Invalid administrator credentials.');
      }
      const data = await res.json();
      setToken(data.access_token);
      localStorage.setItem('admin_token', data.access_token);
    } catch (err) {
      setLoginError(err.message);
    }
  };

  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('admin_token');
  };

  const fetchAdminData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [catRes, statsRes] = await Promise.all([
        fetch('/api/admin/catalog', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/stats', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      if (catRes.ok) {
        const catData = await catRes.json();
        setAdminItems(catData);
      }
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && token) {
      fetchAdminData();
    }
  }, [isOpen, token]);

  const handleDeleteItem = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      const res = await fetch(`/api/admin/catalog/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchAdminData();
        onRefreshCatalog();
      }
    } catch (err) {
      alert("Error deleting product.");
    }
  };

  const handleToggleActive = async (item) => {
    try {
      const res = await fetch(`/api/admin/catalog/${item.id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: !item.is_active })
      });
      if (res.ok) {
        fetchAdminData();
        onRefreshCatalog();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!newImageFile) {
      setFormMsg("Please upload a product photo.");
      return;
    }
    setFormMsg("Uploading and creating garment...");
    try {
      const formData = new FormData();
      formData.append("name", newName);
      formData.append("department", newDept);
      formData.append("category", newCategory);
      formData.append("clothing_type", newType);
      formData.append("price", parseFloat(newPrice));
      formData.append("fabric", newFabric);
      formData.append("color", newColor);
      formData.append("description", newDesc);
      formData.append("image", newImageFile);

      const res = await fetch('/api/admin/catalog', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) {
        throw new Error("Failed to create product.");
      }

      setFormMsg("Product added successfully!");
      setNewName('');
      setNewImageFile(null);
      fetchAdminData();
      onRefreshCatalog();
      setTimeout(() => setActiveTab('inventory'), 1200);
    } catch (err) {
      setFormMsg(err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-card" 
        style={{ maxWidth: '820px', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Lock size={22} color="var(--gold)" />
            <h3 className="modal-title">Store Admin & Inventory Studio</h3>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* If not logged in, show login form */}
        {!token ? (
          <form onSubmit={handleLogin} style={{ padding: '20px 0' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '18px' }}>
              Enter store manager credentials to manage genuine inventory and view AI try-on logs.
            </p>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Username</label>
              <input 
                type="text" 
                value={username} 
                onChange={e => setUsername(e.target.value)}
                className="search-input"
                style={{ paddingLeft: '14px' }}
                required 
              />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                className="search-input"
                style={{ paddingLeft: '14px' }}
                required 
              />
            </div>

            {loginError && (
              <div style={{ color: 'var(--error)', fontSize: '13px', marginBottom: '14px' }}>
                {loginError}
              </div>
            )}

            <button type="submit" className="pill-btn pill-btn-gold" style={{ width: '100%', padding: '12px', justifyContent: 'center' }}>
              Log In to Admin Studio
            </button>
          </form>
        ) : (
          /* Admin Dashboard */
          <div>
            {/* Admin Tabs */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '18px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className={`chip-btn ${activeTab === 'inventory' ? 'active' : ''}`}
                  onClick={() => setActiveTab('inventory')}
                >
                  <Package size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                  Inventory ({adminItems.length})
                </button>
                <button 
                  className={`chip-btn ${activeTab === 'add' ? 'active' : ''}`}
                  onClick={() => setActiveTab('add')}
                >
                  <Plus size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                  Add Product
                </button>
                <button 
                  className={`chip-btn ${activeTab === 'stats' ? 'active' : ''}`}
                  onClick={() => setActiveTab('stats')}
                >
                  <Activity size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                  System & AI Health
                </button>
              </div>

              <button className="pill-btn" onClick={handleLogout} style={{ fontSize: '12px', padding: '4px 12px' }}>
                Log Out
              </button>
            </div>

            {/* TAB 1: Inventory List */}
            {activeTab === 'inventory' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Real Store Clothing Items</span>
                  <button className="pill-btn" onClick={fetchAdminData} style={{ fontSize: '11px', padding: '4px 8px' }}>
                    <RefreshCw size={12} />
                    <span>Refresh</span>
                  </button>
                </div>

                <div style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {adminItems.map(item => (
                    <div 
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-subtle)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img 
                          src={item.image_url} 
                          alt={item.name} 
                          style={{ width: '44px', height: '44px', borderRadius: '6px', objectFit: 'cover' }} 
                        />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>{item.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {item.department} • {item.category} • ₹{item.price.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button 
                          className="pill-btn"
                          style={{ 
                            fontSize: '11px', 
                            padding: '4px 10px',
                            color: item.is_active ? 'var(--success)' : 'var(--text-muted)'
                          }}
                          onClick={() => handleToggleActive(item)}
                        >
                          {item.is_active ? 'Active' : 'Inactive'}
                        </button>
                        <button 
                          className="close-btn"
                          style={{ color: '#ef4444' }}
                          onClick={() => handleDeleteItem(item.id)}
                          title="Delete Product"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: Add Product */}
            {activeTab === 'add' && (
              <form onSubmit={handleCreateProduct} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Product Name</label>
                  <input 
                    type="text" 
                    value={newName} 
                    onChange={e => setNewName(e.target.value)}
                    placeholder="e.g. Traditional Banarasi Silk Saree"
                    className="search-input"
                    style={{ paddingLeft: '14px' }}
                    required 
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Department</label>
                  <select 
                    value={newDept} 
                    onChange={e => {
                      setNewDept(e.target.value);
                      setNewCategory(e.target.value === 'Indian' ? 'sarees' : 'dresses');
                    }}
                    className="search-input"
                    style={{ paddingLeft: '14px' }}
                  >
                    <option value="Indian">Indian Couture</option>
                    <option value="Western">Western Atelier</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Category</label>
                  <select 
                    value={newCategory} 
                    onChange={e => setNewCategory(e.target.value)}
                    className="search-input"
                    style={{ paddingLeft: '14px' }}
                  >
                    {newDept === 'Indian' ? (
                      <>
                        <option value="sarees">Sarees</option>
                        <option value="kurtis">Kurtis & Salwar</option>
                        <option value="lehengas">Lehengas</option>
                        <option value="sherwanis">Sherwanis</option>
                        <option value="ethnic_wear">Other Ethnic</option>
                      </>
                    ) : (
                      <>
                        <option value="dresses">Dresses</option>
                        <option value="shirts">Shirts</option>
                        <option value="t-shirts">T-Shirts</option>
                        <option value="jackets">Jackets</option>
                        <option value="jeans">Jeans & Trousers</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Clothing Type (VTON)</label>
                  <select 
                    value={newType} 
                    onChange={e => setNewType(e.target.value)}
                    className="search-input"
                    style={{ paddingLeft: '14px' }}
                  >
                    <option value="one-piece">One-Piece (Saree, Dress, Lehenga, Kurti)</option>
                    <option value="upper_body">Upper Body (Shirt, T-Shirt, Jacket)</option>
                    <option value="lower_body">Lower Body (Jeans, Trousers)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Price (₹)</label>
                  <input 
                    type="number" 
                    value={newPrice} 
                    onChange={e => setNewPrice(e.target.value)}
                    className="search-input"
                    style={{ paddingLeft: '14px' }}
                    required 
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Fabric</label>
                  <input 
                    type="text" 
                    value={newFabric} 
                    onChange={e => setNewFabric(e.target.value)}
                    placeholder="e.g. Katan Silk, Chiffon, Organic Cotton"
                    className="search-input"
                    style={{ paddingLeft: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Color</label>
                  <input 
                    type="text" 
                    value={newColor} 
                    onChange={e => setNewColor(e.target.value)}
                    placeholder="e.g. Crimson Gold, Navy Blue"
                    className="search-input"
                    style={{ paddingLeft: '14px' }}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Garment Photograph (Real Product Image)</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={e => setNewImageFile(e.target.files[0])}
                    className="search-input"
                    style={{ padding: '8px 14px' }}
                    required
                  />
                </div>

                {formMsg && (
                  <div style={{ gridColumn: '1 / -1', fontSize: '13px', color: 'var(--gold-light)' }}>
                    {formMsg}
                  </div>
                )}

                <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                  <button type="submit" className="pill-btn pill-btn-gold" style={{ width: '100%', padding: '12px', justifyContent: 'center' }}>
                    Save Product to Store Catalog
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: System Stats & AI Health */}
            {activeTab === 'stats' && stats && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active AI Engine</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--gold)', marginTop: '4px' }}>
                      {stats.system.active_ai_provider.toUpperCase()}
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Try-On Sessions</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginTop: '4px' }}>
                      {stats.tryons.total}
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Success Rate</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--success)', marginTop: '4px' }}>
                      {stats.tryons.success_rate}
                    </div>
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--gold-light)', marginBottom: '12px' }}>
                    AI Model Provider & GPU Authentication
                  </h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: '1.5' }}>
                    Configure a free Hugging Face token from <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noreferrer" style={{ color: 'var(--gold)', textDecoration: 'underline' }}>huggingface.co/settings/tokens</a> to bypass public ZeroGPU queue limits, or configure FASHN commercial API key.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                        Active AI Provider
                      </label>
                      <select 
                        value={selectedProvider} 
                        onChange={e => setSelectedProvider(e.target.value)}
                        className="search-input"
                        style={{ paddingLeft: '14px' }}
                      >
                        <option value="idm-vton">IDM-VTON (Hugging Face ZeroGPU)</option>
                        <option value="colab">Google Colab GPU (IDM-VTON T4)</option>
                        <option value="gemini-nano-banana">Google Gemini Multimodal</option>
                        <option value="fashn">FASHN.ai (Commercial API)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                        Google Colab Tunnel URL (COLAB_VTON_URL)
                      </label>
                      <input 
                        type="text"
                        placeholder="https://...gradio.live"
                        value={colabUrlInput}
                        onChange={e => setColabUrlInput(e.target.value)}
                        className="search-input"
                        style={{ paddingLeft: '14px' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                        Hugging Face Token (HF_TOKEN)
                      </label>
                      <input 
                        type="password"
                        placeholder="hf_..."
                        value={hfTokenInput}
                        onChange={e => setHfTokenInput(e.target.value)}
                        className="search-input"
                        style={{ paddingLeft: '14px' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                        Google Gemini Key (GEMINI_API_KEY)
                      </label>
                      <input 
                        type="password"
                        placeholder="AIzaSy..."
                        value={geminiKeyInput}
                        onChange={e => setGeminiKeyInput(e.target.value)}
                        className="search-input"
                        style={{ paddingLeft: '14px' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                        FASHN.ai API Key (Optional)
                      </label>
                      <input 
                        type="password"
                        placeholder="fa-..."
                        value={fashnKeyInput}
                        onChange={e => setFashnKeyInput(e.target.value)}
                        className="search-input"
                        style={{ paddingLeft: '14px' }}
                      />
                    </div>
                  </div>

                  {configMsg && (
                    <div style={{ fontSize: '12px', color: 'var(--gold-light)', marginBottom: '10px' }}>
                      {configMsg}
                    </div>
                  )}

                  <button 
                    type="button" 
                    className="pill-btn pill-btn-gold"
                    onClick={handleSaveConfig}
                    style={{ padding: '8px 18px', fontSize: '12px' }}
                  >
                    Save & Apply AI Settings
                  </button>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#fff', marginBottom: '8px' }}>Privacy & Deployment</h4>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    <div>• Public Store URL: <strong style={{ color: '#fff' }}>{stats.system.public_store_url}</strong></div>
                    <div>• Ephemeral Retention: <strong style={{ color: '#fff' }}>{stats.system.retention_seconds / 60} minutes</strong></div>
                    <div>• Auto-deletion active for all scratch and temporary outputs</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
