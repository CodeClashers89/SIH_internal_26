import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Sprout, ShoppingCart, LogOut, User, Menu, X, BarChart3, ShieldAlert, Award, Globe, ChevronDown } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'gu', name: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'mr', name: 'मराठी', flag: '🇮🇳' },
  { code: 'bn', name: 'বাংলা', flag: '🇮🇳' },
  { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', name: 'తెలుగు', flag: '🇮🇳' },
  { code: 'kn', name: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  { code: 'ml', name: 'മലയാളം', flag: '🇮🇳' }
];

const getActiveLanguage = () => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; googtrans=`);
  if (parts.length === 2) {
    const cookieVal = parts.pop().split(';').shift();
    const match = cookieVal.split('/');
    if (match.length >= 3) {
      return match[2];
    }
  }
  return 'en';
};

const clearAllGoogtransCookies = () => {
  const hostname = window.location.hostname;
  
  // Try clearing cookies on common paths and domains
  const paths = ['/', '/app', ''];
  const domains = [
    hostname,
    `.${hostname}`,
    `www.${hostname}`,
    'localhost',
    '.localhost',
    ''
  ];
  
  for (const path of paths) {
    for (const domain of domains) {
      let baseString = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}`;
      if (domain) {
        document.cookie = `${baseString}; domain=${domain}`;
      } else {
        document.cookie = baseString;
      }
    }
  }
};

const changeLanguage = (langCode) => {
  // Clear any existing cookies to avoid conflicts or duplicate domains
  clearAllGoogtransCookies();
  
  if (langCode !== 'en') {
    // Set the cookie only for the path `/` on the current domain natively (omit domain entirely)
    document.cookie = `googtrans=/en/${langCode}; path=/; SameSite=Lax`;
  }
  
  window.location.reload();
};


const LanguageSelector = ({ activeLang }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeLangObj = LANGUAGES.find(l => l.code === activeLang) || LANGUAGES[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-emerald-100 bg-white/50 hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 font-medium transition-all focus:outline-none text-sm cursor-pointer shadow-sm animate-fade-in"
      >
        <Globe className="h-4 w-4 text-emerald-600 animate-pulse-soft" />
        <span className="mr-0.5">{activeLangObj.flag}</span>
        <span>{activeLangObj.name}</span>
        <ChevronDown className={`h-3 w-3 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl shadow-xl bg-white/95 backdrop-blur-md border border-emerald-100 py-1.5 z-[100] max-h-80 overflow-y-auto transform origin-top-right transition-all">
          <div className="px-3 py-1.5 text-[10px] font-bold text-emerald-800/60 uppercase tracking-wider border-b border-emerald-50 mb-1">
            Language / भाषा
          </div>
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                changeLanguage(lang.code);
                setIsOpen(false);
              }}
              className={`w-full text-left flex items-center space-x-2.5 px-3 py-2 text-sm font-semibold transition-colors hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer ${
                activeLang === lang.code ? 'text-emerald-700 bg-emerald-100/50' : 'text-gray-600'
              }`}
            >
              <span className="text-base">{lang.flag}</span>
              <span>{lang.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const Navbar = ({ onCartToggle }) => {
  const { user, logout } = useAuth();
  const { getCartCount } = useCart();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [activeLang, setActiveLang] = useState('en');

  useEffect(() => {
    setActiveLang(getActiveLanguage());
  }, []);

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
      case 'consumer': return '/consumer-dashboard';
      default: return '/consumer-dashboard';
    }
  };

  return (
    <nav className="sticky top-0 z-50 glassmorphism shadow-md border-b border-emerald-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo Section */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2.5 group transition-transform active:scale-95">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-md shadow-emerald-500/20 flex items-center justify-center">
                <div className="h-full w-full bg-white dark:bg-slate-900 rounded-[10px] flex items-center justify-center">
                  <Sprout className="h-6 w-6 text-emerald-500 stroke-[2.5] group-hover:rotate-12 transition-transform duration-300" />
                </div>
              </div>
              <span className="font-display font-extrabold text-2xl tracking-tight bg-gradient-to-r from-emerald-600 via-teal-500 to-amber-500 bg-clip-text text-transparent">
                KisanConnect
              </span>
            </Link>
          </div>

          {/* Desktop Nav Items */}
          <div className="hidden md:flex items-center space-x-6">
            {/* Hide Marketplace link for farmers — they manage listings, not browse */}
            {(!user || user.role !== 'farmer') && (
              <Link to="/marketplace" className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold transition-colors text-sm">
                Marketplace
              </Link>
            )}
            
            {user && (
              <div className="flex items-center space-x-6">
                <Link to={getDashboardLink()} className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold transition-colors text-sm flex items-center gap-1.5">
                  <BarChart3 className="h-4 w-4 text-emerald-500" />
                  Dashboard
                </Link>
                {user.role === 'farmer' && (
                  <>
                    <Link to="/farmer-profile" className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold transition-colors text-sm flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-800 pl-6">
                      <User className="h-4 w-4 text-emerald-500" />
                      My Profile
                    </Link>
                    <Link to="/farmer-ai-assistant" className="text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 font-semibold transition-colors text-sm flex items-center gap-1.5 pl-6">
                      <span className="text-lg">🤖</span>
                      AI Assistant
                    </Link>
                  </>
                )}
              </div>
            )}
            
            {user && user.role === 'admin' && (
              <Link to="/control-tower" className="text-slate-600 dark:text-slate-300 hover:text-cyan-600 font-semibold transition-colors text-sm flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-cyan-500" />
                Control Tower
              </Link>
            )}

            {/* Language Selector Dropdown */}
            <LanguageSelector activeLang={activeLang} />

            {!user ? (
              <div className="flex items-center space-x-3">
                <Link to="/login" className="text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 font-bold transition-colors text-sm px-4 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50">
                  Login
                </Link>
                <Link to="/register" className="bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-sm shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30 px-5 py-2.5 rounded-xl transition-all transform hover:-translate-y-0.5 active:scale-95">
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
                  <Link to={user.role === 'farmer' ? '/farmer-profile' : '#'} className="flex items-center space-x-2 hover:opacity-80 transition-opacity cursor-pointer">
                    <div className="flex flex-col text-right">
                      <span className="text-sm font-semibold text-gray-700">{user.username}</span>
                      <span className="text-[10px] text-gray-400 capitalize">{user.role.replace('_', ' ')}</span>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                      <User className="h-4 w-4" />
                    </div>
                  </Link>
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
          {/* Hide Marketplace link for farmers in mobile menu too */}
          {(!user || user.role !== 'farmer') && (
            <Link 
              to="/marketplace" 
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-emerald-600 hover:bg-emerald-50"
              onClick={() => setIsOpen(false)}
            >
              Marketplace
            </Link>
          )}
          
          {user && (
            <Link 
              to={getDashboardLink()} 
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-emerald-600 hover:bg-emerald-50"
              onClick={() => setIsOpen(false)}
            >
              Dashboard
            </Link>
          )}

          {user && user.role === 'admin' && (
            <Link 
              to="/control-tower" 
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-indigo-50"
              onClick={() => setIsOpen(false)}
            >
              Control Tower
            </Link>
          )}

          {/* Mobile Language Selector */}
          <div className="border-t border-emerald-100/50 pt-3 pb-2 px-3">
            <span className="block text-xs font-bold text-emerald-800/60 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-emerald-600" />
              Language / भाषा
            </span>
            <div className="grid grid-cols-2 gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-sm font-semibold transition-all cursor-pointer ${
                    activeLang === lang.code
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-300'
                  }`}
                >
                  <span className="text-base">{lang.flag}</span>
                  <span>{lang.name}</span>
                </button>
              ))}
            </div>
          </div>

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
