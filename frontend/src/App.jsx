import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Catalogue from './pages/Catalogue';
import ProductDetails from './pages/ProductDetails';
import VirtualFittingRoom from './pages/VirtualFittingRoom';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import MobileUpload from './pages/MobileUpload';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider } from './context/ThemeContext';

// Automatically scroll to top upon navigating between pages
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AppContent() {
  const { pathname } = useLocation();
  const isMobileUploadView = pathname.startsWith('/mobile-upload');

  if (isMobileUploadView) {
    return (
      <ErrorBoundary>
        <Routes>
          <Route path="/mobile-upload/:token" element={<MobileUpload />} />
        </Routes>
      </ErrorBoundary>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-[#0F172A] text-slate-900 dark:text-[#FFFFFF] transition-colors duration-200">
      <Navbar />
      <main className="flex-grow">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/catalogue" element={<Catalogue />} />
            <Route path="/products/:id" element={<ProductDetails />} />
            <Route path="/try-on" element={<VirtualFittingRoom />} />
            
            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />

            {/* Fallback route */}
            <Route path="*" element={<Home />} />
          </Routes>
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Router>
        <ScrollToTop />
        <AppContent />
      </Router>
    </ThemeProvider>
  );
}
