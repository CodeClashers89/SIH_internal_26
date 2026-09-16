import React from 'react';
import { Sprout } from 'lucide-react';

const Preloader = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#f5f7f4]/95 text-slate-800 backdrop-blur-sm select-none">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-lg shadow-slate-900/5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 text-white">
          <Sprout className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold tracking-tight">KisanConnect</p>
          <p className="text-xs text-slate-500">Preparing your workspace</p>
        </div>
        <span className="ml-3 h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-700" aria-label="Loading" />
      </div>
    </div>
  );
};

export default Preloader;
