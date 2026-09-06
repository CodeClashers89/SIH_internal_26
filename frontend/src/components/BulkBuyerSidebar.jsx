import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Building2, User, Handshake, Layers, FileText, RefreshCw, Home } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const BulkBuyerSidebar = () => {
  const location = useLocation();
  const { user } = useAuth();
  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab') || 'dashboard';

  const isBulkPortal = location.pathname === '/bulk-portal' || location.pathname.includes('portal');
  const isDashboardActive = isBulkPortal && (currentTab === 'dashboard' || !searchParams.get('tab'));
  const isQuotesActive = isBulkPortal && currentTab === 'quotes';
  const isReverseActive = isBulkPortal && currentTab === 'reverse';
  const isContractsActive = isBulkPortal && currentTab === 'contracts';
  const isSubscriptionsActive = isBulkPortal && currentTab === 'subscriptions';
  const isMarketplaceActive = location.pathname === '/marketplace';
  const isProfileActive = location.pathname === '/profile';

  return (
    <aside className="w-64 shrink-0 bg-[#064e3b] text-white sticky top-16 h-[calc(100vh-4rem)] p-4 flex flex-col justify-between border-r border-emerald-900/50 shadow-xl font-sans overflow-y-auto z-40">
      <div className="space-y-6">
        
        {/* Wholesaler Header Info */}
        <div className="p-3.5 bg-emerald-900/60 rounded-2xl border border-emerald-800/60 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5 text-emerald-300" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider block">B2B Portal</span>
            <h3 className="text-xs font-black text-white truncate">{user?.username || 'Wholesaler'}</h3>
            <span className="text-[10px] text-emerald-200/80 block truncate">GSTIN: {user?.gstin || '24AAAAB1111C1Z1'}</span>
          </div>
        </div>

        {/* Sidebar Navigation Options */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-extrabold text-emerald-300/60 uppercase tracking-widest px-3 block mb-1">
            Navigation
          </span>

          {/* 1. Dashboard */}
          <Link
            to="/bulk-portal"
            className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl font-extrabold text-xs transition-all duration-200 ${
              isDashboardActive
                ? 'bg-[#059669] text-white shadow-md shadow-emerald-950/40 ring-1 ring-emerald-400/30'
                : 'text-emerald-100/80 hover:bg-emerald-900/60 hover:text-white'
            }`}
          >
            <Home className={`h-4 w-4 shrink-0 ${isDashboardActive ? 'text-white' : 'text-emerald-300'}`} />
            <span className="truncate">Dashboard</span>
          </Link>

          {/* 2. Single Crop Bids */}
          <Link
            to="/bulk-portal?tab=quotes"
            className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl font-extrabold text-xs transition-all duration-200 ${
              isQuotesActive
                ? 'bg-[#059669] text-white shadow-md shadow-emerald-950/40 ring-1 ring-emerald-400/30'
                : 'text-emerald-100/80 hover:bg-emerald-900/60 hover:text-white'
            }`}
          >
            <Handshake className={`h-4 w-4 shrink-0 ${isQuotesActive ? 'text-white' : 'text-emerald-300'}`} />
            <span className="truncate">Single Crop Bids</span>
          </Link>

          {/* 3. Reverse Sourcing */}
          <Link
            to="/bulk-portal?tab=reverse"
            className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl font-extrabold text-xs transition-all duration-200 ${
              isReverseActive
                ? 'bg-[#059669] text-white shadow-md shadow-emerald-950/40 ring-1 ring-emerald-400/30'
                : 'text-emerald-100/80 hover:bg-emerald-900/60 hover:text-white'
            }`}
          >
            <Layers className={`h-4 w-4 shrink-0 ${isReverseActive ? 'text-white' : 'text-emerald-300'}`} />
            <span className="truncate">Reverse Sourcing</span>
          </Link>

          {/* 4. Pre-Harvest Contracts */}
          <Link
            to="/bulk-portal?tab=contracts"
            className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl font-extrabold text-xs transition-all duration-200 ${
              isContractsActive
                ? 'bg-[#059669] text-white shadow-md shadow-emerald-950/40 ring-1 ring-emerald-400/30'
                : 'text-emerald-100/80 hover:bg-emerald-900/60 hover:text-white'
            }`}
          >
            <FileText className={`h-4 w-4 shrink-0 ${isContractsActive ? 'text-white' : 'text-emerald-300'}`} />
            <span className="truncate">Pre-Harvest Contracts</span>
          </Link>

          {/* 5. Recurring Subscriptions */}
          <Link
            to="/bulk-portal?tab=subscriptions"
            className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl font-extrabold text-xs transition-all duration-200 ${
              isSubscriptionsActive
                ? 'bg-[#059669] text-white shadow-md shadow-emerald-950/40 ring-1 ring-emerald-400/30'
                : 'text-emerald-100/80 hover:bg-emerald-900/60 hover:text-white'
            }`}
          >
            <RefreshCw className={`h-4 w-4 shrink-0 ${isSubscriptionsActive ? 'text-white' : 'text-emerald-300'}`} />
            <span className="truncate">Recurring Subscriptions</span>
          </Link>

          {/* 6. Marketplace */}
          <Link
            to="/marketplace"
            className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl font-extrabold text-xs transition-all duration-200 ${
              isMarketplaceActive
                ? 'bg-[#059669] text-white shadow-md shadow-emerald-950/40 ring-1 ring-emerald-400/30'
                : 'text-emerald-100/80 hover:bg-emerald-900/60 hover:text-white'
            }`}
          >
            <ShoppingBag className={`h-4 w-4 shrink-0 ${isMarketplaceActive ? 'text-white' : 'text-emerald-300'}`} />
            <span className="truncate">Marketplace</span>
          </Link>
        </div>

      </div>

      {/* Bottom Profile Button */}
      <div className="pt-4 border-t border-emerald-900/60">
        <Link
          to="/profile"
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-extrabold text-xs transition-all duration-200 ${
            isProfileActive
              ? 'bg-[#059669] text-white shadow-md shadow-emerald-950/40 ring-1 ring-emerald-400/30'
              : 'text-emerald-100 bg-emerald-900/40 hover:bg-emerald-900/80 border border-emerald-700/50 hover:text-white'
          }`}
        >
          <User className={`h-5 w-5 ${isProfileActive ? 'text-white' : 'text-emerald-300'} shrink-0`} />
          <span>Profile</span>
        </Link>
      </div>
    </aside>
  );
};

export default BulkBuyerSidebar;
