import React, { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sprout, Users, ArrowRight, ShieldCheck, TrendingUp, HandCoins, Truck, Sparkles, CheckCircle2, Play, Pause, Volume2, VolumeX, Activity, ArrowUpRight, Zap } from 'lucide-react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import PriceComparisonChart from '../components/PriceComparisonChart';

const Landing = () => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [liveTickerIndex, setLiveTickerIndex] = useState(0);

  const liveFeeds = [
    { text: 'Farm Node #408 dispatched 450kg organic tomatoes to Pune Retailers', time: 'Just now', tag: 'DISPATCH' },
    { text: 'Direct FPO Escrow of ₹84,200 settled with zero commission', time: '1m ago', tag: 'ESCROW' },
    { text: 'Nashik Mandi benchmark updated: ₹32/kg vs KisanConnect ₹44/kg', time: '3m ago', tag: 'BENCHMARK' },
    { text: 'Cold Chain Logistics assigned for Pincode 411038 in 18 mins', time: '5m ago', tag: 'LOGISTICS' },
  ];

  useEffect(() => {
    const tickerTimer = setInterval(() => {
      setLiveTickerIndex((prev) => (prev + 1) % liveFeeds.length);
    }, 4000);
    return () => clearInterval(tickerTimer);
  }, [liveFeeds.length]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const prefersReducedMotion = mediaQuery.matches;

    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.defaultMuted = true;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (videoRef.current && !prefersReducedMotion && isPlaying) {
              const playPromise = videoRef.current.play();
              if (playPromise !== undefined) {
                playPromise.catch(() => {});
              }
            }
          } else {
            if (videoRef.current) {
              videoRef.current.pause();
            }
          }
        });
      },
      { rootMargin: '100px', threshold: 0.05 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [isMuted, isPlaying]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const stats = [
    { label: 'Registered Farmers & FPOs', value: '1,200+', icon: Users, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
    { label: 'Direct Platform GMV', value: '₹48 Lakhs+', icon: HandCoins, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
    { label: 'Middlemen Markup Saved', value: '25% - 40%', icon: TrendingUp, color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20' },
    { label: 'Pincode Logistics Partners', value: '45+ Hubs', icon: Truck, color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  ];

  const fadeInUp = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12
      }
    }
  };

  return (
    <div className="space-y-20 pb-24 dark:bg-slate-950 dark:text-white overflow-hidden selection:bg-emerald-500 selection:text-white">
      
      {/* ── Live Dynamic Platform Ticker ── */}
      <div className="bg-slate-900 border-b border-emerald-500/20 py-2.5 px-4 text-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-extrabold text-[11px] tracking-wider uppercase text-emerald-400 flex items-center gap-1">
              <Activity className="h-3.5 w-3.5" /> LIVE TELEMETRY:
            </span>
          </div>

          <div className="flex-1 overflow-hidden h-5 relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={liveTickerIndex}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.4 }}
                className="flex items-center gap-2 truncate text-slate-300 text-[11px] sm:text-xs"
              >
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black px-1.5 py-0.5 rounded">
                  {liveFeeds[liveTickerIndex].tag}
                </span>
                <span className="font-medium truncate">{liveFeeds[liveTickerIndex].text}</span>
                <span className="text-slate-500 font-mono text-[10px] shrink-0">({liveFeeds[liveTickerIndex].time})</span>
              </motion.div>
            </AnimatePresence>
          </div>

          <Link to="/marketplace" className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 hover:underline shrink-0">
            Live Mandi Explorer <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* ── Dynamic Hero Section (Video + Glass Overlays) ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-emerald-950/90 to-slate-950 text-white py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-b border-emerald-500/20">
        {/* Dynamic ambient particles / glow */}
        <div className="absolute inset-0 opacity-15 bg-[linear-gradient(rgba(16,185,129,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.15)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none"></div>
        <div className="absolute top-1/4 right-1/4 w-[480px] h-[480px] rounded-full bg-emerald-500/20 blur-[130px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 left-1/4 w-[360px] h-[360px] rounded-full bg-amber-500/10 blur-[110px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          
          {/* Left Column: Hero Content */}
          <motion.div 
            initial={{ opacity: 0, x: -35 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 backdrop-blur-md shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
              <span>Smart Direct-to-Consumer Agricultural Network</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold tracking-tight leading-[1.12]">
              Eliminate Middlemen. <br />
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">
                Connect Farmers Direct.
              </span>
            </h1>

            <p className="text-slate-300 text-base sm:text-lg max-w-xl leading-relaxed font-sans">
              KisanConnect links rural agricultural producers and FPOs directly with urban retail consumers and large industrial bulk buyers with automated escrow settlements and AI-assisted logistics dispatch.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link
                to="/register"
                className="bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-base px-8 py-4 rounded-2xl shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/40 transition-all flex items-center justify-center gap-2.5 transform hover:-translate-y-0.5 active:scale-95"
              >
                <span>Get Started Now</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                to="/marketplace"
                className="glassmorphism-dark hover:bg-white/10 text-white border border-emerald-500/30 font-bold text-base px-8 py-4 rounded-2xl transition-all text-center flex items-center justify-center gap-2 hover:border-emerald-400/50 active:scale-95"
              >
                <span>Browse Marketplace</span>
                <ArrowUpRight className="h-4 w-4 text-emerald-400" />
              </Link>
            </div>

            {/* Verified Highlights */}
            <div className="flex flex-wrap gap-4 pt-3 text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Real-Time Mandi Benchmark
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Direct Escrow Payouts
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Pincode-Optimized Logistics
              </span>
            </div>
          </motion.div>

          {/* Right Column: Interactive Living Video Player with HUD Overlays */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            className="lg:col-span-6 relative"
          >
            {/* Multi-layered glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/25 via-teal-500/20 to-amber-500/15 rounded-3xl filter blur-2xl"></div>

            <div 
              ref={containerRef} 
              className="relative z-10 rounded-3xl overflow-hidden border border-emerald-500/30 shadow-2xl shadow-emerald-950/50 bg-slate-900 group"
            >
              {/* Living Video Element */}
              <video
                ref={videoRef}
                autoPlay
                loop
                muted={isMuted}
                playsInline
                poster="https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=800"
                preload="metadata"
                className="w-full h-[380px] sm:h-[430px] object-cover transition-transform duration-700 group-hover:scale-105"
                aria-label="Farmers and logistics workers loading fresh agricultural produce"
              >
                <source src="/videos/hero-video.mp4" type="video/mp4" />
                <source src="/hero-video.mp4" type="video/mp4" />
                <source src="/video.mp4" type="video/mp4" />
                <img
                  src="https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=800"
                  alt="Indian Farmer harvesting crops"
                  className="w-full h-full object-cover"
                />
              </video>

              {/* Top Glass HUD Chip */}
              <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 backdrop-blur-md border border-emerald-500/30 text-xs font-bold text-white shadow-lg">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
                <span>FARM HARVEST TO SHELF STREAM</span>
              </div>

              {/* Video Floating Controls */}
              <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="p-2 rounded-xl bg-slate-950/70 hover:bg-slate-950 backdrop-blur-md border border-white/10 text-white transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-md"
                  title={isMuted ? "Unmute sound" : "Mute sound"}
                >
                  {isMuted ? <VolumeX className="h-4 w-4 text-slate-400" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
                </button>
                <button
                  onClick={togglePlay}
                  className="p-2 rounded-xl bg-slate-950/70 hover:bg-slate-950 backdrop-blur-md border border-white/10 text-white transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-md"
                  title={isPlaying ? "Pause video" : "Play video"}
                >
                  {isPlaying ? <Pause className="h-4 w-4 text-slate-400" /> : <Play className="h-4 w-4 text-emerald-400" />}
                </button>
              </div>

              {/* Bottom Telemetry Floating Card */}
              <div className="absolute bottom-4 left-4 right-4 z-20 p-3.5 rounded-2xl bg-slate-950/85 backdrop-blur-xl border border-emerald-500/25 shadow-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Zero-Loss Cold Chain Network
                    </div>
                    <div className="text-xs sm:text-sm font-extrabold text-white">
                      Harvested & Delivered in &lt; 24 Hours
                    </div>
                  </div>
                </div>
                <Link
                  to="/marketplace"
                  className="hidden sm:inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shrink-0 hover:scale-105 active:scale-95"
                >
                  View Listings
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Stats Counter Grid ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={staggerContainer}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {stats.map((s, index) => {
            const Icon = s.icon;
            return (
              <motion.div 
                key={index}
                variants={fadeInUp}
                className="bg-white dark:bg-slate-900/90 border border-slate-100 dark:border-emerald-500/20 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all flex items-center gap-4 card-hover-3d"
              >
                <div className={`p-3.5 rounded-2xl border ${s.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-2xl font-display font-black text-slate-900 dark:text-white tracking-tight">{s.value}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">{s.label}</div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* ── Value Prop & Pricing Comparison Section ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-5 space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Mandi vs Platform Direct Pricing</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-slate-800 dark:text-white tracking-tight leading-tight">
            Transparent Pricing. Zero Middleman Exploitation.
          </h2>
          
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
            By eliminating commissions taken by collection agents, transport intermediaries, and speculative wholesalers, we restore margin directly to farmers and consumers.
          </p>

          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-100 dark:border-emerald-500/15 shadow-xs">
              <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Strict KYC & Land Document Verification</h4>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 leading-normal">Every listing is verified by platform admins checking FPO certificates, 7/12 land records, and crop authenticity.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-100 dark:border-emerald-500/15 shadow-xs">
              <Truck className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Rule-Based Pincode Logistics</h4>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 leading-normal">Orders are auto-assigned to regional driver partners, reducing transit food mileage and transit spoilage.</p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="lg:col-span-7 bg-white dark:bg-slate-900/90 border border-slate-100 dark:border-emerald-500/20 p-6 sm:p-8 rounded-3xl shadow-sm"
        >
          <PriceComparisonChart />
        </motion.div>
      </section>

      {/* ── Tailored Role Workflows ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <h2 className="text-3xl font-display font-extrabold text-slate-800 dark:text-white">
            Tailored Marketplace Workflows
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Whether you grow produce, purchase for family consumption, or source at industrial processing scale.
          </p>
        </div>
        
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {/* Farmers */}
          <motion.div 
            variants={fadeInUp}
            className="bg-white dark:bg-slate-900/90 border border-slate-100 dark:border-emerald-500/15 rounded-3xl p-7 shadow-xs flex flex-col hover:border-emerald-500/40 transition-all card-hover-3d"
          >
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg mb-5 border border-emerald-500/20">
              🌾
            </div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 self-start px-2.5 py-1 rounded-full mb-3">Farmer / FPO Role</span>
            <h3 className="font-display font-bold text-xl text-slate-800 dark:text-white mb-2">Maximize Listing Earnings</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed mb-6">
              Create listings directly. Compare pricing charts with Mandi benchmarks, manage orders progress, and track daily aggregated crop demand trends.
            </p>
            <Link to="/register?role=farmer" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 flex items-center gap-1.5 mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
              Register as Farmer <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>

          {/* Consumers */}
          <motion.div 
            variants={fadeInUp}
            className="bg-white dark:bg-slate-900/90 border border-slate-100 dark:border-emerald-500/15 rounded-3xl p-7 shadow-xs flex flex-col hover:border-amber-500/40 transition-all card-hover-3d"
          >
            <div className="h-10 w-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-lg mb-5 border border-amber-500/20">
              🛒
            </div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 self-start px-2.5 py-1 rounded-full mb-3">Retail Consumer</span>
            <h3 className="font-display font-bold text-xl text-slate-800 dark:text-white mb-2">Buy Fresh, Direct Farm Produce</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed mb-6">
              Search vegetables and fruits by location proximity, add items to cart, checkout via simulated Razorpay sandbox, and rate farmers directly.
            </p>
            <Link to="/register?role=consumer" className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 flex items-center gap-1.5 mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
              Register as Consumer <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>

          {/* Bulk Buyers */}
          <motion.div 
            variants={fadeInUp}
            className="bg-white dark:bg-slate-900/90 border border-slate-100 dark:border-emerald-500/15 rounded-3xl p-7 shadow-xs flex flex-col hover:border-cyan-500/40 transition-all card-hover-3d"
          >
            <div className="h-10 w-10 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold text-lg mb-5 border border-cyan-500/20">
              🏢
            </div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 self-start px-2.5 py-1 rounded-full mb-3">Bulk Industry Partner</span>
            <h3 className="font-display font-bold text-xl text-slate-800 dark:text-white mb-2">Request Tiered Wholesale Quotes</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed mb-6">
              Access the processing portal to request bulk rates, track negotiated offers, and schedule deliveries directly with FPO packing operations.
            </p>
            <Link to="/register?role=bulk_buyer" className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 flex items-center gap-1.5 mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
              Register as Bulk Buyer <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
};

export default Landing;
