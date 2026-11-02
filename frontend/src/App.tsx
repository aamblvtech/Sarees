import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { Catalog } from './pages/Catalog';
import { ProductDetails } from './pages/ProductDetails';
import { CustomerSession } from './pages/CustomerSession';
import { StaffDashboard } from './pages/StaffDashboard';
import { SareeRegistration } from './pages/SareeRegistration';
import { KioskView } from './pages/KioskView';
import { AdminDashboard } from './pages/AdminDashboard';
import { Account } from './pages/Account';
import { SareeProduct } from './types';
import { api } from './services/api';

export function App() {
  const [products, setProducts] = useState<SareeProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCatalog() {
      try {
        const res = await api.getProducts();
        if (res.data && res.data.length > 0) {
          setProducts(res.data);
        }
      } catch (e) {
        console.warn('Initial catalog load failed, using baseline data:', e);
      } finally {
        setLoading(false);
      }
    }
    loadCatalog();
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-[#FAF7F0] text-[#292522]">
        <Navbar />

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home products={products} />} />
            <Route path="/catalog" element={<Catalog products={products} />} />
            <Route path="/products/:id" element={<ProductDetails products={products} />} />
            <Route path="/tryon/session/:token" element={<CustomerSession />} />
            <Route path="/staff" element={<StaffDashboard products={products} />} />
            <Route path="/saree-register" element={<SareeRegistration />} />
            <Route path="/kiosk" element={<KioskView products={products} />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/account" element={<Account />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
