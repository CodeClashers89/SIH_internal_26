import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Package, ShoppingBag, Handshake, FileCheck, Calendar, MapPin, User, LogOut, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LanguageSelector } from './Navbar';

const FarmerSidebar = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeLang, setActiveLang] = useState('en');
  const hash = location.hash.replace('#', '');
  const activeSection = hash || 'overview';

  useEffect(() => {
    const cookie = document.cookie.split('; ').find((entry) => entry.startsWith('googtrans='));
    const language = cookie?.split('/')[2];
    if (language) setActiveLang(language);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { key: 'overview', label: 'Dashboard', to: '/farmer-dashboard#overview', icon: Home },
    { key: 'profile', label: 'My Profile', to: '/farmer-profile', icon: User },
    { key: 'inventory', label: 'Crop Inventory', to: '/farmer-dashboard#inventory', icon: Package },
    { key: 'orders', label: 'Orders & Dispatch', to: '/farmer-dashboard#orders', icon: ShoppingBag },
    { key: 'quotes', label: 'Wholesale Bids', to: '/farmer-dashboard#quotes', icon: Handshake },
    { key: 'sourcing', label: 'Bulk Demands', to: '/farmer-dashboard#sourcing', icon: FileCheck },
    { key: 'contracts', label: 'Contracts', to: '/farmer-dashboard#contracts', icon: Calendar },
    { key: 'markets', label: 'Market Prices', to: '/farmer-dashboard#markets', icon: MapPin },
    { key: 'notifications', label: 'Notifications', to: '/farmer-notifications', icon: Bell },
  ];

  return (
    <aside className="w-64 shrink-0 bg-[#064e3b] text-white sticky top-0 h-screen p-4 flex flex-col justify-between border-r border-emerald-900/50 shadow-xl font-sans overflow-y-auto z-40">
      <div className="space-y-6">
        <div className="p-3.5 bg-emerald-900/60 rounded-2xl border border-emerald-800/60 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
            <Home className="h-5 w-5 text-emerald-300" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider block">Farmer Hub</span>
            <h3 className="text-xs font-black text-white truncate">{user?.username || 'Farmer'}</h3>
            <span className="text-[10px] text-emerald-200/80 block truncate">{user?.district || 'Pune'}</span>
          </div>
        </div>

        <div className="rounded-2xl bg-emerald-900/40 border border-emerald-700/50 p-2">
          <LanguageSelector activeLang={activeLang} />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-extrabold text-emerald-300/60 uppercase tracking-widest px-3 block">Navigation</span>

          {navItems.map(({ key, label, to, icon: Icon }) => {
            const isProfilePage = location.pathname === '/farmer-profile';
            const isDashboardPage = location.pathname === '/farmer-dashboard';
            const isActive = isProfilePage
              ? key === 'profile'
              : isDashboardPage
              ? key === activeSection
              : key === 'notifications' && location.pathname === '/farmer-notifications';

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
        <button
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

export default FarmerSidebar;
