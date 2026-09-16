import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { Sparkles, MessageCircleMore } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ChatProvider } from './context/ChatContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import Preloader from './components/Preloader';
import BulkBuyerSidebar from './components/BulkBuyerSidebar';
import ConsumerSidebar from './components/ConsumerSidebar';
import FarmerSidebar from './components/FarmerSidebar';
import LogisticsSidebar from './components/LogisticsSidebar';
import AdminSidebar from './components/AdminSidebar';
import Landing from './pages/Landing';
import LoginSignup from './pages/LoginSignup';
import FarmerDashboard from './pages/FarmerDashboard';
import FarmerProfilePage from './pages/FarmerProfilePage';
import FarmerNotifications from './pages/FarmerNotifications';
import FarmerAIAssistant from './pages/FarmerAIAssistant';
import ConsumerMarketplace from './pages/ConsumerMarketplace';
import ConsumerDashboard from './pages/ConsumerDashboard';
import BulkBuyerPortal from './pages/BulkBuyerPortal';
import AdminPanel from './pages/AdminPanel';
import LogisticsDashboard from './pages/LogisticsDashboard';
import ControlTower from './pages/ControlTower';
import UserProfilePage from './pages/UserProfilePage';

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


const FloatingAssistantButton = () => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user || user.role !== 'farmer' || location.pathname === '/farmer-ai-assistant') {
    return null;
  }

  return (
    <Link
      to="/farmer-ai-assistant"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_18px_45px_rgba(16,185,129,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_50px_rgba(16,185,129,0.45)] focus:outline-none focus:ring-4 focus:ring-emerald-200"
      aria-label="Open AI assistant"
      title="AI Assistant"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/12 backdrop-blur-sm">
        <MessageCircleMore className="h-6 w-6" />
      </span>
      <span className="hidden sm:flex items-center gap-2 pr-5 text-sm font-black tracking-wide">
        <Sparkles className="h-4 w-4" />
        AI Assistant
      </span>
    </Link>
  );
};

function MainLayout() {
  const [cartOpen, setCartOpen] = useState(false);
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Preloader />;
  }

  const isChatbotPage = location.pathname === '/farmer-ai-assistant';
  const isLandingPage = location.pathname === '/';
  const isAuthPage = ['/login', '/register'].includes(location.pathname);
  const isConsumer = user && user.role === 'consumer';
  const isBulkBuyer = user && user.role === 'bulk_buyer';
  const isFarmer = user && user.role === 'farmer';
  const isLogistics = user && user.role === 'logistics_partner';
  const isAdmin = user && user.role === 'admin';
  const hasSidebar = isConsumer || isBulkBuyer || isFarmer || isLogistics || isAdmin;
  const isPublicRoute = ['/', '/login', '/register'].includes(location.pathname);
  const showSidebar = hasSidebar && !isChatbotPage && !isPublicRoute;

  const appRoutes = (
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
        path="/farmer-notifications"
        element={
          <ProtectedRoute allowedRoles={['farmer']}>
            <FarmerNotifications />
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
      <Route 
        path="/profile" 
        element={
          <ProtectedRoute allowedRoles={['consumer', 'bulk_buyer', 'farmer', 'logistics_partner', 'admin']}>
            <UserProfilePage />
          </ProtectedRoute>
        } 
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );

  return (
    <div className="flex flex-col min-h-screen">
      {!isFarmer && (
        <Navbar
          landing={isLandingPage || isAuthPage}
          onCartToggle={() => setCartOpen(!cartOpen)}
        />
      )}
      
      {showSidebar ? (
        <div className="app-shell flex flex-grow bg-slate-50/50 items-start">
          {isConsumer && <ConsumerSidebar />}
          {isBulkBuyer && <BulkBuyerSidebar />}
          {isFarmer && <FarmerSidebar />}
          {isLogistics && <LogisticsSidebar />}
          {isAdmin && <AdminSidebar />}
          <main className="app-main flex-grow p-4 sm:p-6 lg:p-8 overflow-x-hidden min-w-0">
            {appRoutes}
          </main>
        </div>
      ) : (
        <main className={`flex-grow ${isChatbotPage ? 'app-main-full' : ''}`}>
          {appRoutes}
        </main>
      )}

      {!isChatbotPage && !isConsumer && !isFarmer && !isLandingPage && !isAuthPage && <Footer />}
      <FloatingAssistantButton />

      {/* Cart Drawer for Consumers/Bulk Buyers */}
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <ChatProvider>
          <Router>
            <MainLayout />
          </Router>
        </ChatProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
