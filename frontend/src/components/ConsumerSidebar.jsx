import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, User, MapPin, Home, Package, Repeat, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LanguageSelector } from './Navbar';

const ConsumerSidebar = () => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const isDashboardActive = location.pathname === '/consumer-dashboard' || location.pathname.includes('consumer-dashboard');
  const marketplaceTab = new URLSearchParams(location.search).get('tab') || 'browse';
  const isMarketplaceActive = location.pathname === '/marketplace' && marketplaceTab === 'browse';
  const isOrdersActive = location.pathname === '/marketplace' && marketplaceTab === 'tracking';
  const isRecurringActive = location.pathname === '/marketplace' && marketplaceTab === 'recurring';
  const isProfileActive = location.pathname === '/profile';

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  return (
    <aside className="w-64 shrink-0 bg-[#064e3b] text-white sticky top-0 h-screen p-4 flex flex-col justify-between border-r border-emerald-900/50 shadow-xl font-sans overflow-y-auto z-40">
      <div className="space-y-6">
        
        {/* Consumer Header Info */}
        <div className="p-3.5 bg-emerald-900/60 rounded-2xl border border-emerald-800/60 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
            <User className="h-5 w-5 text-emerald-300" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider block">Consumer Hub</span>
            <h3 className="text-xs font-black text-white truncate">{user?.username || 'Consumer'}</h3>
            <span className="text-[10px] text-emerald-200/80 block truncate flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" /> {user?.district || 'Pune'} ({user?.pincode || '411001'})
            </span>
          </div>
        </div>

        <div className="rounded-2xl bg-emerald-900/40 border border-emerald-700/50 p-2">
          <LanguageSelector activeLang="en" />
        </div>

        {/* Sidebar Navigation Options */}
        <div className="space-y-2">
          <span className="text-[10px] font-extrabold text-emerald-300/60 uppercase tracking-widest px-3 block">
            Navigation
          </span>

          {/* 1. Dashboard */}
          <Link
            to="/consumer-dashboard"
            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-extrabold text-sm transition-all duration-200 ${
              isDashboardActive
                ? 'bg-[#059669] text-white shadow-md shadow-emerald-950/40 ring-1 ring-emerald-400/30'
                : 'text-emerald-100/80 hover:bg-emerald-900/60 hover:text-white'
            }`}
          >
            <Home className={`h-5 w-5 ${isDashboardActive ? 'text-white' : 'text-emerald-300'}`} />
            <span>Dashboard</span>
          </Link>

          {/* 2. Browse produce */}
          <Link
            to="/marketplace?tab=browse"
            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-extrabold text-sm transition-all duration-200 ${
              isMarketplaceActive
                ? 'bg-[#059669] text-white shadow-md shadow-emerald-950/40 ring-1 ring-emerald-400/30'
                : 'text-emerald-100/80 hover:bg-emerald-900/60 hover:text-white'
            }`}
          >
            <ShoppingBag className={`h-5 w-5 ${isMarketplaceActive ? 'text-white' : 'text-emerald-300'}`} />
            <span>Browse Fresh Produce</span>
          </Link>

          <Link
            to="/marketplace?tab=tracking"
            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-extrabold text-sm transition-all duration-200 ${
              isOrdersActive
                ? 'bg-[#059669] text-white shadow-md shadow-emerald-950/40 ring-1 ring-emerald-400/30'
                : 'text-emerald-100/80 hover:bg-emerald-900/60 hover:text-white'
            }`}
          >
            <Package className={`h-5 w-5 ${isOrdersActive ? 'text-white' : 'text-emerald-300'}`} />
            <span>One Time Orders</span>
          </Link>

          <Link
            to="/marketplace?tab=recurring"
            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-extrabold text-sm transition-all duration-200 ${
              isRecurringActive
                ? 'bg-[#059669] text-white shadow-md shadow-emerald-950/40 ring-1 ring-emerald-400/30'
                : 'text-emerald-100/80 hover:bg-emerald-900/60 hover:text-white'
            }`}
          >
            <Repeat className={`h-5 w-5 ${isRecurringActive ? 'text-white' : 'text-emerald-300'}`} />
            <span>Recurring Orders</span>
          </Link>
        </div>

      </div>

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
          <span>Profile</span>
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-extrabold text-sm text-emerald-100 hover:bg-rose-900/50 hover:text-white transition-all duration-200"
        >
          <LogOut className="h-5 w-5 text-emerald-300 shrink-0" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
};

export default ConsumerSidebar;
