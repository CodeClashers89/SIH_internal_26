import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, Truck, Package, Route, User, ShieldCheck, CheckCircle, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LanguageSelector } from './Navbar';

const LogisticsSidebar = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const activeTab = location.hash.replace('#', '') || 'overview';

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const navItems = [
    { key: 'overview', label: 'Overview', to: '/logistics-dashboard#overview', icon: BarChart3 },
    { key: 'available', label: 'Available Jobs', to: '/logistics-dashboard#available', icon: Truck },
    { key: 'active', label: 'Active Shipments', to: '/logistics-dashboard#active', icon: Package },
    { key: 'delivery_map', label: 'Delivery Map & Route', to: '/logistics-dashboard#delivery_map', icon: Route },
    { key: 'completed', label: 'Completed', to: '/logistics-dashboard#completed', icon: CheckCircle },
    { key: 'vehicle', label: 'Vehicle Profile', to: '/logistics-dashboard#vehicle', icon: Settings },
  ];

  return (
    <aside className="w-64 shrink-0 bg-[#064e3b] text-white sticky top-0 h-screen p-4 flex flex-col justify-between border-r border-emerald-900/50 shadow-xl font-sans overflow-y-auto z-40">
      <div className="space-y-6">
        <div className="p-3.5 bg-emerald-900/60 rounded-2xl border border-emerald-800/60 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
            <Truck className="h-5 w-5 text-emerald-300" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider block">Logistics</span>
            <h3 className="text-xs font-black text-white truncate">{user?.username || 'Driver'}</h3>
            <span className="text-[10px] text-emerald-200/80 block truncate">{user?.vehicle_type || 'Tempo'} • {user?.district || 'Pune'}</span>
          </div>
        </div>

        <div className="rounded-2xl bg-emerald-900/40 border border-emerald-700/50 p-2">
          <LanguageSelector activeLang="en" />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-extrabold text-emerald-300/60 uppercase tracking-widest px-3 block">Navigation</span>

          {navItems.map(({ key, label, to, icon: Icon }) => {
            const isActive = activeTab === key;
            return (
              <Link
                key={key}
                to={to}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-extrabold text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-[#059669] text-white shadow-md shadow-emerald-950/40 ring-1 ring-emerald-400/30'
                    : 'text-emerald-100/80 hover:bg-emerald-900/60 hover:text-white'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-emerald-300'}`} />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="pt-4 border-t border-emerald-900/60 space-y-2">
        <Link
          to="/profile"
          className="flex items-center gap-3 px-4 py-3 rounded-2xl font-extrabold text-sm text-emerald-100 bg-emerald-900/40 hover:bg-emerald-900/80 border border-emerald-700/50 hover:text-white transition-all duration-200"
        >
          <ShieldCheck className="h-5 w-5 text-emerald-300 shrink-0" />
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

export default LogisticsSidebar;
