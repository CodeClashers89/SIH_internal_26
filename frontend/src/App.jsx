import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ChatProvider } from './context/ChatContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import Preloader from './components/Preloader';
import Landing from './pages/Landing';
import LoginSignup from './pages/LoginSignup';
import FarmerDashboard from './pages/FarmerDashboard';
import FarmerProfilePage from './pages/FarmerProfilePage';
import FarmerAIAssistant from './pages/FarmerAIAssistant';
import ConsumerMarketplace from './pages/ConsumerMarketplace';
import ConsumerDashboard from './pages/ConsumerDashboard';
import BulkBuyerPortal from './pages/BulkBuyerPortal';
import AdminPanel from './pages/AdminPanel';
import LogisticsDashboard from './pages/LogisticsDashboard';
import ControlTower from './pages/ControlTower';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <Preloader />;
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Redirect farmers away from consumer-only pages (e.g. /marketplace)
const NonFarmerRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Preloader />;
  if (user && user.role === 'farmer') {
    return <Navigate to="/farmer-dashboard" replace />;
  }
  return children;
};


function MainLayout() {
  const [cartOpen, setCartOpen] = useState(false);
  const { loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Preloader />;
  }

  const isChatbotPage = location.pathname === '/farmer-ai-assistant';

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar onCartToggle={() => setCartOpen(!cartOpen)} />
      
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<LoginSignup />} />
          <Route path="/register" element={<LoginSignup />} />
          <Route path="/marketplace" element={
            <NonFarmerRoute>
              <ConsumerMarketplace />
            </NonFarmerRoute>
          } />
          
          {/* Role Protected Paths */}
          <Route 
            path="/consumer-dashboard" 
            element={
              <ProtectedRoute allowedRoles={['consumer', 'admin']}>
                <ConsumerDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/farmer-dashboard" 
            element={
              <ProtectedRoute allowedRoles={['farmer']}>
                <FarmerDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/farmer-profile" 
            element={
              <ProtectedRoute allowedRoles={['farmer']}>
                <FarmerProfilePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/farmer-ai-assistant" 
            element={
              <ProtectedRoute allowedRoles={['farmer']}>
                <FarmerAIAssistant />
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
            path="/control-tower" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ControlTower />
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

      {!isChatbotPage && <Footer />}

      {/* Cart Drawer for Consumers/Bulk Buyers */}
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}

function App() {
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AuthProvider>
      <CartProvider>
        <ChatProvider>
          {initialLoading && <Preloader />}
          <Router>
            <MainLayout />
          </Router>
        </ChatProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
