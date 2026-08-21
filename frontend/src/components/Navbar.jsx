import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Sprout, ShoppingCart, LogOut, User, Menu, X, BarChart3, ShieldAlert, Award } from 'lucide-react';

const Navbar = ({ onCartToggle }) => {
  const { user, logout } = useAuth();
  const { getCartCount } = useCart();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsOpen(false);
  };

  const getDashboardLink = () => {
    if (!user) return '/';
    switch (user.role) {
      case 'farmer': return '/farmer-dashboard';
      case 'bulk_buyer': return '/bulk-portal';
      case 'logistics_partner': return '/logistics-dashboard';
      case 'admin': return '/admin-panel';
      default: return '/marketplace';
    }
  };

  return (
    <nav className="sticky top-0 z-50 glassmorphism shadow-md border-b border-emerald-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo Section */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2 text-emerald-700 hover:text-emerald-800 transition-colors">
              <Sprout className="h-8 w-8 text-emerald-600 stroke-[2.5]" />
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-emerald-700 to-green-600 bg-clip-text text-transparent">
                KisanConnect
              </span>
            </Link>
          </div>

          {/* Desktop Nav Items */}
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/marketplace" className="text-gray-600 hover:text-emerald-600 font-medium transition-colors">
              Marketplace
            </Link>
            
            {user && (
              <Link to={getDashboardLink()} className="text-gray-600 hover:text-emerald-600 font-medium transition-colors flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4" />
                Dashboard
              </Link>
            )}

            {!user ? (
              <div className="flex items-center space-x-3">
                <Link to="/login" className="text-emerald-600 hover:text-emerald-700 font-semibold transition-colors px-3 py-2 rounded-lg">
                  Login
                </Link>
                <Link to="/register" className="bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold shadow-sm hover:shadow hover:from-emerald-700 hover:to-green-700 px-4 py-2 rounded-lg transition-all transform hover:-translate-y-0.5">
                  Sign Up
                </Link>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                {/* Farmer KYC indicator */}
                {user.role === 'farmer' && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    user.kyc_status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                    user.kyc_status === 'pending' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                    'bg-red-100 text-red-800'
                  }`}>
                    <Award className="h-3 w-3" />
                    KYC: {user.kyc_status.toUpperCase()}
                  </span>
                )}

                {/* Cart Icon for consumer/buyer */}
                {['consumer', 'bulk_buyer'].includes(user.role) && (
                  <button 
                    onClick={onCartToggle} 
                    className="relative p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
                  >
                    <ShoppingCart className="h-6 w-6" />
                    {getCartCount() > 0 && (
                      <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-amber-500 rounded-full">
                        {getCartCount()}
                      </span>
                    )}
                  </button>
                )}

                {/* Profile display & Logout */}
                <div className="flex items-center space-x-2 pl-2 border-l border-gray-200">
                  <div className="flex flex-col text-right">
                    <span className="text-sm font-semibold text-gray-700">{user.username}</span>
                    <span className="text-[10px] text-gray-400 capitalize">{user.role.replace('_', ' ')}</span>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <User className="h-4 w-4" />
                  </div>
                  <button 
                    onClick={handleLogout} 
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    title="Log Out"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            {user && ['consumer', 'bulk_buyer'].includes(user.role) && (
              <button 
                onClick={onCartToggle} 
                className="relative p-2 mr-2 text-gray-500 hover:text-emerald-600 rounded-full transition-colors"
              >
                <ShoppingCart className="h-6 w-6" />
                {getCartCount() > 0 && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-amber-500 rounded-full">
                    {getCartCount()}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden glassmorphism border-b border-emerald-100 px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <Link 
            to="/marketplace" 
            className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-emerald-600 hover:bg-emerald-50"
            onClick={() => setIsOpen(false)}
          >
            Marketplace
          </Link>
          
          {user && (
            <Link 
              to={getDashboardLink()} 
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-emerald-600 hover:bg-emerald-50"
              onClick={() => setIsOpen(false)}
            >
              Dashboard
            </Link>
          )}

          {!user ? (
            <div className="pt-4 pb-2 border-t border-gray-200 space-y-2">
              <Link 
                to="/login" 
                className="block w-full text-center px-4 py-2 border border-emerald-600 text-emerald-600 font-semibold rounded-md hover:bg-emerald-50"
                onClick={() => setIsOpen(false)}
              >
                Login
              </Link>
              <Link 
                to="/register" 
                className="block w-full text-center px-4 py-2 bg-emerald-600 text-white font-semibold rounded-md hover:bg-emerald-700"
                onClick={() => setIsOpen(false)}
              >
                Sign Up
              </Link>
            </div>
          ) : (
            <div className="pt-4 pb-2 border-t border-gray-200">
              <div className="flex items-center px-3 mb-3">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <User className="h-6 w-6" />
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-gray-800">{user.username}</div>
                  <div className="text-sm font-medium text-gray-500 capitalize">{user.role}</div>
                </div>
              </div>
              <button 
                onClick={handleLogout} 
                className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <LogOut className="h-5 w-5" />
                Log Out
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
