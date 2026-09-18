import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Building2, Home, Handshake, Layers, FileText, 
  RefreshCw, ShoppingBag, User, LogOut, Sprout 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LanguageSelector } from './Navbar';

const BulkBuyerSidebar = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeLang, setActiveLang] = useState('en');
  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab') || 'dashboard';

  useEffect(() => {
    const cookie = document.cookie.split('; ').find((entry) => entry.startsWith('googtrans='));
    const language = cookie?.split('/')[2];
    if (language) setActiveLang(language);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isBulkPortal = location.pathname === '/bulk-portal' || location.pathname.includes('portal');
  const isDashboardActive = isBulkPortal && (currentTab === 'dashboard' || !searchParams.get('tab'));
  const isQuotesActive = isBulkPortal && currentTab === 'quotes';
  const isReverseActive = isBulkPortal && currentTab === 'reverse';
  const isContractsActive = isBulkPortal && currentTab === 'contracts';
  const isSubscriptionsActive = isBulkPortal && currentTab === 'subscriptions';
  const isMarketplaceActive = location.pathname === '/marketplace';
  const isProfileActive = location.pathname === '/profile';

  const navItems = [
    { key: 'dashboard', label: 'Dashboard', to: '/bulk-portal', icon: Home, isActive: isDashboardActive },
    { key: 'quotes', label: 'Single Crop Bids', to: '/bulk-portal?tab=quotes', icon: Handshake, isActive: isQuotesActive },
    { key: 'reverse', label: 'Reverse Sourcing', to: '/bulk-portal?tab=reverse', icon: Layers, isActive: isReverseActive },
    { key: 'contracts', label: 'Pre-Harvest Contracts', to: '/bulk-portal?tab=contracts', icon: FileText, isActive: isContractsActive },
    { key: 'subscriptions', label: 'Recurring Subscriptions', to: '/bulk-portal?tab=subscriptions', icon: RefreshCw, isActive: isSubscriptionsActive },
    { key: 'marketplace', label: 'Produce Marketplace', to: '/marketplace', icon: ShoppingBag, isActive: isMarketplaceActive },
  ];

  return (
    <aside className="w-64 shrink-0 bg-[#064e3b] text-white sticky top-0 h-screen p-4 flex flex-col justify-between border-r border-emerald-900/50 shadow-xl font-sans overflow-y-auto z-40">
      <div className="space-y-6">
        
        {/* Brand Header */}
        <Link to="/" className="flex items-center gap-2.5 px-1 py-1 group">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-400 to-teal-300 p-0.5 shadow-md flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <div className="h-full w-full rounded-[10px] bg-[#064e3b] flex items-center justify-center">
              <Sprout className="h-5 w-5 text-emerald-300" />
            </div>
          </div>
          <div className="min-w-0">
            <span className="font-display font-black text-lg tracking-tight bg-gradient-to-r from-emerald-200 via-teal-100 to-white bg-clip-text text-transparent block leading-tight">
              KisanConnect
            </span>
            <span className="text-[10px] text-emerald-300/80 font-bold uppercase tracking-wider block">
              B2B Enterprise Hub
            </span>
          </div>
        </Link>

        {/* Wholesaler Header Info */}
        <div className="p-3.5 bg-emerald-900/60 rounded-2xl border border-emerald-800/60 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5 text-emerald-300" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider block">Bulk Buyer Hub</span>
            <h3 className="text-xs font-black text-white truncate" title={user?.business_name || user?.username}>
              {user?.business_name || user?.username || 'Wholesaler'}
            </h3>
            <span className="text-[10px] text-emerald-200/80 block truncate">
              GSTIN: {user?.gst_number || user?.gstin || '24AAAAB1111C1Z1'}
            </span>
          </div>
        </div>

        {/* Language Selector */}
        <div className="rounded-2xl bg-emerald-900/40 border border-emerald-700/50 p-2">
          <LanguageSelector activeLang={activeLang} />
        </div>

        {/* Sidebar Navigation Options */}
        <div className="space-y-2">
          <span className="text-[10px] font-extrabold text-emerald-300/60 uppercase tracking-widest px-3 block">
            Navigation
          </span>

          {navItems.map(({ key, label, to, icon: Icon, isActive }) => (
            <Link
              key={key}
              to={to}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-extrabold text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-[#059669] text-white shadow-md shadow-emerald-950/40 ring-1 ring-emerald-400/30'
                  : 'text-emerald-100/80 hover:bg-emerald-900/60 hover:text-white'
              }`}
            >
              <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-white' : 'text-emerald-300'}`} />
              <span className="truncate">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom Profile & Logout Buttons */}
      <div className="pt-4 border-t border-emerald-900/60 space-y-2">
        <Link
          to="/profile"
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-extrabold text-sm transition-all duration-200 ${
            isProfileActive
              ? 'bg-[#059669] text-white shadow-md shadow-emerald-950/40 ring-1 ring-emerald-400/30'
              : 'text-emerald-100 bg-emerald-900/40 hover:bg-emerald-900/80 border border-emerald-700/50 hover:text-white'
          }`}
        >
          <User className={`h-5 w-5 ${isProfileActive ? 'text-white' : 'text-emerald-300'} shrink-0`} />
          <span>My Profile</span>
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-extrabold text-sm text-emerald-100 hover:bg-rose-900/50 hover:text-white transition-all duration-200 cursor-pointer"
        >
          <LogOut className="h-5 w-5 text-emerald-300 shrink-0" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
};

export default BulkBuyerSidebar;
