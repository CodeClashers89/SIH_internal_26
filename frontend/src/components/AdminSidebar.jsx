import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck, UserCheck, AlertTriangle, LayoutDashboard, BarChart3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AdminSidebar = () => {
  const location = useLocation();
  const { user } = useAuth();
  const activePath = location.pathname;

  const navItems = [
    { key: 'admin-panel', label: 'Admin Console', to: '/admin-panel', icon: LayoutDashboard },
    { key: 'control-tower', label: 'Control Tower', to: '/control-tower', icon: BarChart3 },
    { key: 'kyc', label: 'KYC Queue', to: '/admin-panel', icon: UserCheck },
    { key: 'exceptions', label: 'Exceptions', to: '/control-tower', icon: AlertTriangle },
  ];

  return (
    <aside className="w-64 shrink-0 bg-[#064e3b] text-white sticky top-16 h-[calc(100vh-4rem)] p-4 flex flex-col justify-between border-r border-emerald-900/50 shadow-xl font-sans overflow-y-auto z-40">
      <div className="space-y-6">
        <div className="p-3.5 bg-emerald-900/60 rounded-2xl border border-emerald-800/60 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5 text-emerald-300" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider block">Admin Hub</span>
            <h3 className="text-xs font-black text-white truncate">{user?.username || 'Admin'}</h3>
            <span className="text-[10px] text-emerald-200/80 block truncate">Platform Ops</span>
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-extrabold text-emerald-300/60 uppercase tracking-widest px-3 block">Navigation</span>
          {navItems.map(({ key, label, to, icon: Icon }) => {
            const isActive = activePath === to || (to === '/admin-panel' && activePath === '/admin-panel');
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

      <div className="pt-4 border-t border-emerald-900/60">
        <Link
          to="/profile"
          className="flex items-center gap-3 px-4 py-3 rounded-2xl font-extrabold text-sm text-emerald-100 bg-emerald-900/40 hover:bg-emerald-900/80 border border-emerald-700/50 hover:text-white transition-all duration-200"
        >
          <ShieldCheck className="h-5 w-5 text-emerald-300 shrink-0" />
          <span>Profile</span>
        </Link>
      </div>
    </aside>
  );
};

export default AdminSidebar;
