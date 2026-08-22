import React, { useEffect, useState } from 'react';
import { Sprout } from 'lucide-react';

const Preloader = () => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 1600);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950 text-white transition-opacity duration-500 ease-out select-none">
      {/* Background Cyber Mesh */}
      <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(16,185,129,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.1)_1px,transparent_1px)] [background-size:28px_28px] pointer-events-none"></div>
      
      {/* Ambient background glows */}
      <div className="absolute top-1/3 left-1/3 w-80 h-80 rounded-full bg-emerald-500/15 blur-[90px] animate-pulse"></div>
      <div className="absolute bottom-1/3 right-1/3 w-80 h-80 rounded-full bg-amber-500/10 blur-[90px] animate-pulse [animation-delay:0.8s]"></div>

      <div className="relative flex flex-col items-center max-w-xs px-4">
        {/* Pulsing Sprout Icon Sphere */}
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-emerald-500 to-amber-400 blur-xl opacity-60 animate-ping"></div>
          <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-amber-400 p-0.5 shadow-2xl flex items-center justify-center">
            <div className="h-full w-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Sprout className="h-8 w-8 text-emerald-400 animate-bounce" />
            </div>
          </div>
        </div>

        {/* Pulse Heartbeat Wave */}
        <svg
          viewBox="0 0 280 80"
          className="w-56 h-16 drop-shadow-[0_0_12px_rgba(16,185,129,0.7)]"
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path
            d="M 10 40 L 70 40 L 85 20 L 100 65 L 115 10 L 130 70 L 145 40 L 270 40"
            stroke="rgba(255, 255, 255, 0.08)"
          />
          <path
            d="M 10 40 L 70 40 L 85 20 L 100 65 L 115 10 L 130 70 L 145 40 L 270 40"
            stroke="url(#cyberPulseGradient)"
            strokeDasharray="350"
            strokeDashoffset="350"
            className="animate-pulse-wave"
          />
          <defs>
            <linearGradient id="cyberPulseGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>
          </defs>
        </svg>

        {/* Brand Title */}
        <h1 className="mt-4 font-display font-extrabold text-2xl tracking-wide bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">
          KisanConnect
        </h1>

        <p className="mt-1 text-[10px] uppercase font-bold tracking-[0.3em] text-emerald-400/80">
          Decentralized Agri-Tech
        </p>

        {/* Progress Bar */}
        <div className="w-32 h-1 mt-6 bg-slate-800/80 rounded-full overflow-hidden border border-white/5">
          <div className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 w-0 animate-progress"></div>
        </div>
      </div>

      <style>{`
        @keyframes pulse-wave {
          to { strokeDashoffset: 0; }
        }
        @keyframes progress {
          to { width: 100%; }
        }
        .animate-pulse-wave {
          animation: pulse-wave 1.6s cubic-bezier(0.2, 1, 0.4, 1) infinite;
        }
        .animate-progress {
          animation: progress 1.5s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Preloader;
