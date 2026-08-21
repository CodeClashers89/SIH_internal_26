import React from 'react';
import { Link } from 'react-router-dom';
import { Sprout, Users, ArrowRight, ShieldCheck, TrendingUp, HandCoins, Truck } from 'lucide-react';
import PriceComparisonChart from '../components/PriceComparisonChart';

const Landing = () => {
  const stats = [
    { label: 'Registered Farmers & FPOs', value: '1,200+', icon: Users, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Platform Transactions', value: '₹48 Lakhs+', icon: HandCoins, color: 'text-amber-600 bg-amber-50' },
    { label: 'Intermediary Commissions Saved', value: '25% - 40%', icon: TrendingUp, color: 'text-blue-600 bg-blue-50' },
    { label: 'Pincode Logistics Partners', value: '45+', icon: Truck, color: 'text-purple-600 bg-purple-50' },
  ];

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-green-950 text-white py-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#e11d48_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <Sprout className="h-3.5 w-3.5" />
              Direct-to-Market Platform
            </span>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
              Eliminate Middlemen. <br />
              <span className="bg-gradient-to-r from-amber-400 to-green-400 bg-clip-text text-transparent">
                Connect Farmers Direct.
              </span>
            </h1>
            <p className="text-slate-300 text-base sm:text-lg max-w-lg leading-relaxed">
              KisanConnect is a decentralized digital marketplace that links rural agricultural producers and FPOs directly with urban retail consumers and large industrial bulk buyers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link
                to="/register"
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-900 font-extrabold px-8 py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
              >
                Get Started
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                to="/marketplace"
                className="border border-white/20 bg-white/5 hover:bg-white/10 text-white font-bold px-8 py-3.5 rounded-xl transition-all text-center"
              >
                Browse Marketplace
              </Link>
            </div>
          </div>

          <div className="hidden lg:block relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 to-green-500/20 rounded-3xl filter blur-xl"></div>
            <img
              src="https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=800"
              alt="Indian Farmer harvesting crops"
              className="rounded-3xl shadow-2xl border border-white/10 object-cover w-full h-[400px] relative z-10"
            />
          </div>
        </div>
      </section>

      {/* Stats Counter Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((s, index) => {
            const Icon = s.icon;
            return (
              <div key={index} className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xs flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${s.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900">{s.value}</div>
                  <div className="text-xs text-slate-500 font-medium">{s.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Value Prop & Pricing Comparison Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
        <div className="col-span-1 space-y-6">
          <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-tight">
            Fair Pricing for Everyone.
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            By eliminating commissions taken by collection agents, transport commission agents, and wholesalers, we restore value to both ends of the supply chain.
          </p>
          <div className="space-y-4 pt-2">
            <div className="flex gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Strict KYC & Farmer Checks</h4>
                <p className="text-slate-500 text-xs mt-1">Every listing is verified by admins checking FPO certificates and agricultural land details.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Truck className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Rule-Based Pincode Logistics</h4>
                <p className="text-slate-500 text-xs mt-1">Orders are auto-assigned to regional local logistics partners, reducing food mileage and delivery time.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-1 lg:col-span-2">
          <PriceComparisonChart />
        </div>
      </section>

      {/* Roles Guides */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-black text-center text-slate-800 mb-10">Tailored Marketplace Workflows</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Farmers */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs flex flex-col hover:border-emerald-200 transition-colors">
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 self-start px-2 py-0.5 rounded mb-4">Farmer / FPO Role</span>
            <h3 className="font-bold text-lg text-slate-800 mb-2">Maximize Listing Earnings</h3>
            <p className="text-slate-500 text-xs leading-relaxed mb-6">
              Create listings directly. Compare pricing charts with Mandi benchmarks, manage orders progress, and track daily aggregated crop demand trends.
            </p>
            <Link to="/register?role=farmer" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 mt-auto">
              Register as Farmer <ArrowRight className="h-4.5 w-4.5" />
            </Link>
          </div>

          {/* Consumers */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs flex flex-col hover:border-amber-200 transition-colors">
            <span className="text-xs font-bold text-amber-600 bg-amber-50 self-start px-2 py-0.5 rounded mb-4">Consumer Role</span>
            <h3 className="font-bold text-lg text-slate-800 mb-2">Buy Fresh, Direct Produce</h3>
            <p className="text-slate-500 text-xs leading-relaxed mb-6">
              Search vegetables and fruits by location proximity, add items to the cart, checkout via simulated Razorpay sandbox, and review farmer rating feedback.
            </p>
            <Link to="/register?role=consumer" className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 mt-auto">
              Register as Retail Consumer <ArrowRight className="h-4.5 w-4.5" />
            </Link>
          </div>

          {/* Bulk Buyers */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs flex flex-col hover:border-blue-200 transition-colors">
            <span className="text-xs font-bold text-blue-600 bg-blue-50 self-start px-2 py-0.5 rounded mb-4">Bulk Buyer Role</span>
            <h3 className="font-bold text-lg text-slate-800 mb-2">Request Tiered Wholesale Quotes</h3>
            <p className="text-slate-500 text-xs leading-relaxed mb-6">
              Access the processing portal to request bulk rates, track negotiated offers, and schedule deliveries directly with FPO packing operations.
            </p>
            <Link to="/register?role=bulk_buyer" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-auto">
              Register as Bulk Buyer <ArrowRight className="h-4.5 w-4.5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
