import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import Landing from './pages/Landing';
import LoginSignup from './pages/LoginSignup';
import FarmerDashboard from './pages/FarmerDashboard';
import ConsumerMarketplace from './pages/ConsumerMarketplace';
import BulkBuyerPortal from './pages/BulkBuyerPortal';
import AdminPanel from './pages/AdminPanel';
import LogisticsDashboard from './pages/LogisticsDashboard';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  
  if (loading) return null;
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function MainLayout() {
  const [cartOpen, setCartOpen] = useState(false);
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar onCartToggle={() => setCartOpen(!cartOpen)} />
      
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<LoginSignup />} />
          <Route path="/register" element={<LoginSignup />} />
          <Route path="/marketplace" element={<ConsumerMarketplace />} />
          
          {/* Role Protected Paths */}
          <Route 
            path="/farmer-dashboard" 
            element={
              <ProtectedRoute allowedRoles={['farmer']}>
                <FarmerDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/bulk-portal" 
            element={
              <ProtectedRoute allowedRoles={['bulk_buyer']}>
                <BulkBuyerPortal />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin-panel" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminPanel />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/logistics-dashboard" 
            element={
              <ProtectedRoute allowedRoles={['logistics_partner']}>
                <LogisticsDashboard />
              </ProtectedRoute>
            } 
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Footer />

      {/* Cart Drawer for Consumers/Bulk Buyers */}
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <MainLayout />
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
