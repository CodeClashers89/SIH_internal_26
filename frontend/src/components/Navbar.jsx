import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { 
  Sprout, ShoppingCart, LogOut, User, Menu, X,
  Award, Globe, ChevronDown, ShoppingBag, Search, Bell, Sparkles
} from 'lucide-react';

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'gu', name: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'mr', name: 'મરાઠી', flag: '🇮🇳' },
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
  const paths = ['/', '/app', ''];
  const domains = [hostname, `.${hostname}`, `www.${hostname}`, 'localhost', '.localhost', ''];
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
  clearAllGoogtransCookies();
  if (langCode !== 'en') {
    document.cookie = `googtrans=/en/${langCode}; path=/; SameSite=Lax`;
  }
  window.location.reload();
};

export const LanguageSelector = ({ activeLang }) => {
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
        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-emerald-100 bg-white/70 hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 font-medium transition-all focus:outline-none text-xs cursor-pointer shadow-2xs"
      >
        <Globe className="h-4 w-4 text-emerald-600" />
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
              className={`w-full text-left flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold transition-colors hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer ${
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

export const NotificationSelector = () => {
  return (
    <Link
        to="/farmer-notifications"
        className="relative flex items-center gap-2 px-3 py-2 text-emerald-100 hover:text-white hover:bg-emerald-800/70 rounded-xl transition-colors"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        <span className="absolute top-0.5 right-0.5 inline-flex items-center justify-center w-4 h-4 text-[10px] font-black leading-none text-white bg-rose-500 rounded-full shadow-xs">
          3
        </span>
      </Link>
  );
};

const Navbar = ({ onCartToggle, landing = false }) => {
  const { user, logout } = useAuth();
  const { getCartCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [activeLang, setActiveLang] = useState('en');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setActiveLang(getActiveLanguage());
  }, []);

  if (landing) {
    return (
      <nav className="absolute inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto rounded-2xl border border-white/70 bg-white/60 px-4 shadow-lg shadow-emerald-900/5 backdrop-blur-xl sm:px-6">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center space-x-2.5 group transition-transform active:scale-95">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-md shadow-emerald-500/20 flex items-center justify-center">
                <div className="h-full w-full rounded-[10px] bg-white flex items-center justify-center">
                  <Sprout className="h-6 w-6 text-emerald-500 stroke-[2.5] group-hover:rotate-12 transition-transform duration-300" />
                </div>
              </div>
              <span className="font-display font-extrabold text-2xl tracking-tight bg-gradient-to-r from-emerald-700 via-teal-600 to-amber-500 bg-clip-text text-transparent">
                KisanConnect
              </span>
            </Link>
            <LanguageSelector activeLang={activeLang} />
          </div>
        </div>
      </nav>
    );
  }

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsOpen(false);
  };

  const isProfileActive = location.pathname === '/profile' || location.pathname === '/farmer-profile';

  const getProfileActiveStyle = () => {
    if (!isProfileActive) return 'hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-1.5 rounded-2xl transition-all flex items-center space-x-2 cursor-pointer';
    switch (user?.role) {
      case 'bulk_buyer':
        return 'bg-emerald-700 text-white font-black shadow-md shadow-emerald-600/25 ring-2 ring-emerald-500/50 px-3.5 py-1.5 rounded-2xl flex items-center space-x-2.5 transition-all active:scale-95 cursor-pointer';
      case 'farmer':
        return 'bg-emerald-600 text-white font-black shadow-md shadow-emerald-500/25 ring-2 ring-emerald-400/50 px-3.5 py-1.5 rounded-2xl flex items-center space-x-2.5 transition-all active:scale-95 cursor-pointer';
      case 'consumer':
        return 'bg-blue-600 text-white font-black shadow-md shadow-blue-500/25 ring-2 ring-blue-400/50 px-3.5 py-1.5 rounded-2xl flex items-center space-x-2.5 transition-all active:scale-95 cursor-pointer';
      default:
        return 'bg-emerald-600 text-white font-black shadow-md shadow-emerald-500/25 ring-2 ring-emerald-400/50 px-3.5 py-1.5 rounded-2xl flex items-center space-x-2.5 transition-all active:scale-95 cursor-pointer';
    }
  };

  return (
    <nav className="sticky top-0 z-50 glassmorphism shadow-md border-b border-emerald-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 gap-4">
          
          {/* Logo Section */}
          <div className="flex items-center shrink-0">
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

          {/* Search Bar in Title Bar (Especially for Bulk Buyers & general search) */}
          <div className="flex-1 max-w-md mx-2 hidden sm:block">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search for products, farmers, or categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    navigate(`/marketplace?q=${encodeURIComponent(searchQuery)}`);
                  }
                }}
                className="w-full pl-9 pr-4 py-2 bg-slate-50/90 border border-slate-200 rounded-full text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-xs"
              />
            </div>
          </div>

          {/* Desktop Nav Items */}
          <div className="hidden md:flex items-center space-x-3 shrink-0">
            
            {/* Authenticated app navigation belongs to the role sidebar. */}
            {!user && (
              <>
                <Link
                  to="/marketplace"
                  className={`text-sm transition-all px-4 py-2 rounded-xl flex items-center gap-2 active:scale-95 ${
                    location.pathname === '/marketplace'
                      ? 'bg-emerald-600 text-white font-extrabold shadow-md shadow-emerald-500/25 ring-2 ring-emerald-400/40'
                      : 'text-slate-600 dark:text-slate-300 hover:text-emerald-700 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 font-bold'
                  }`}
                >
                  <ShoppingBag className={`h-4 w-4 ${location.pathname === '/marketplace' ? 'text-white' : 'text-emerald-600'}`} />
                  Marketplace
                </Link>
              </>
            )}

            {/* Notification Bell Button */}
            {user && <NotificationSelector />}

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
              <div className="flex items-center space-x-3">
                {/* Farmer KYC indicator */}
                {user.role === 'farmer' && user.kyc_status && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    user.kyc_status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                    user.kyc_status === 'pending' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                    'bg-red-100 text-red-800'
                  }`}>
                    <Award className="h-3.5 w-3.5" />
                    KYC: {user.kyc_status.toUpperCase()}
                  </span>
                )}

                {/* Cart Icon for consumer/buyer */}
                {['consumer', 'bulk_buyer'].includes(user.role) && (
                  <button 
                    onClick={onCartToggle} 
                    className="relative p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors cursor-pointer"
                    title="Cart"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    {getCartCount() > 0 && (
                      <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white transform translate-x-1/3 -translate-y-1/3 bg-amber-500 rounded-full">
                        {getCartCount()}
                      </span>
                    )}
                  </button>
                )}

                {/* Profile Button & Logout */}
                <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
                  <Link to={user.role === 'farmer' ? '/farmer-profile' : '/profile'} className={getProfileActiveStyle()}>
                    <div className="flex flex-col text-right">
                      <span className={`text-xs font-extrabold ${isProfileActive ? 'text-white' : 'text-slate-800'}`}>
                        {user.business_name || user.username}
                      </span>
                      <span className={`text-[10px] capitalize ${isProfileActive ? 'text-emerald-200 font-bold' : 'text-slate-400'}`}>
                        {user.role.replace('_', ' ')}
                      </span>
                    </div>
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold ${
                      isProfileActive ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      <User className="h-4 w-4" />
                    </div>
                  </Link>
                  <button 
                    onClick={handleLogout} 
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
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
          {!user && (
            <Link 
              to="/marketplace" 
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-base font-bold transition-all ${
                location.pathname === '/marketplace'
                  ? 'bg-emerald-600 text-white font-extrabold shadow-sm'
                  : 'text-gray-700 hover:text-emerald-600 hover:bg-emerald-50'
              }`}
              onClick={() => setIsOpen(false)}
            >
              <ShoppingBag className={`h-5 w-5 ${location.pathname === '/marketplace' ? 'text-white' : 'text-emerald-600'}`} />
              Marketplace
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
              <Link 
                to={user.role === 'farmer' ? '/farmer-profile' : '/profile'} 
                onClick={() => setIsOpen(false)} 
                className={`flex items-center px-3 mb-3 p-2 rounded-xl transition-all cursor-pointer ${
                  isProfileActive
                    ? 'bg-purple-600 text-white font-extrabold shadow-md'
                    : 'hover:bg-emerald-50/80'
                }`}
              >
                <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center font-bold ${
                  isProfileActive ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  <User className="h-6 w-6" />
                </div>
                <div className="ml-3">
                  <div className={`text-base font-bold ${isProfileActive ? 'text-white' : 'text-gray-800'}`}>{user.username}</div>
                  <div className={`text-sm capitalize ${isProfileActive ? 'text-purple-200 font-semibold' : 'text-gray-500'}`}>{user.role.replace('_', ' ')}</div>
                </div>
              </Link>
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
