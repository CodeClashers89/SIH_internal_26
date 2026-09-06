import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import api from '../utils/api';
import ProductCard from '../components/ProductCard';
import {
  Truck, Clock, Calendar, CheckCircle2, AlertCircle, ArrowRight,
  ShoppingBag, Sparkles, Repeat, IndianRupee, ShieldCheck, User,
  MapPin, RefreshCw, ChevronRight, Package, CreditCard, Key,
  HeartHandshake, Leaf, TrendingUp, PiggyBank
} from 'lucide-react';

const STATUS_STEPS = [
  { id: 'placed', label: 'Placed' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'packed', label: 'Packed' },
  { id: 'in_transit', label: 'Out for Delivery' },
  { id: 'delivered', label: 'Delivered' }
];

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const ConsumerDashboard = () => {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [freshProducts, setFreshProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [ordersRes, subsRes, prodsRes] = await Promise.allSettled([
        api.get('/orders/'),
        api.get('/orders/subscriptions/'),
        api.get('/products/?')
      ]);

      if (ordersRes.status === 'fulfilled') setOrders(ordersRes.value.data || []);
      if (subsRes.status === 'fulfilled') setSubscriptions(subsRes.value.data || []);
      if (prodsRes.status === 'fulfilled') {
        const sorted = [...(prodsRes.value.data || [])].sort((a, b) => b.freshness_percentage - a.freshness_percentage);
        setFreshProducts(sorted.slice(0, 2));
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Find active / latest order
  const activeOrder = orders.find(o => o.status !== 'delivered' && o.status !== 'cancelled') || orders[0] || null;
  const unpaidOrder = orders.find(o => o.payment_status !== 'paid' && o.status !== 'cancelled');
  const activeSub = subscriptions.find(s => s.status === 'active') || subscriptions[0] || null;

  // Calculate estimated total savings (approx 18% middleman margin + subscriber discounts)
  const totalSpend = orders.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
  const calculatedSavings = Math.round(totalSpend * 0.18) + (subscriptions.length > 0 ? 120 : 60);

  const getStepIndex = (status) => {
    switch (status) {
      case 'placed': return 0;
      case 'confirmed': return 1;
      case 'packed': return 2;
      case 'in_transit': return 3;
      case 'delivered': return 4;
      default: return 0;
    }
  };

  const currentStepIdx = activeOrder ? getStepIndex(activeOrder.status) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fadeIn">
      
      {/* ── 1. GREETING HERO BANNER ── */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 font-bold text-[11px] uppercase tracking-wider px-3 py-0.5 rounded-full">
                Consumer Hub
              </span>
              <span className="text-emerald-200 text-xs flex items-center gap-1 font-medium bg-black/10 px-2.5 py-0.5 rounded-full">
                <MapPin className="h-3 w-3 text-emerald-400" /> {user?.district || 'Pune'}, {user?.state || 'Maharashtra'} ({user?.pincode || '411001'})
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {getGreeting()}, {user?.first_name || user?.username || 'Consumer'} 👋
            </h1>
            <p className="text-emerald-100/90 text-xs sm:text-sm max-w-xl leading-relaxed">
              Track active fresh produce drops, manage recurring delivery schedules, and view direct farmer savings.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-stretch sm:self-auto">
            <button
              onClick={fetchDashboardData}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-4 py-2.5 rounded-xl border border-white/20 transition-all shadow-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => navigate('/marketplace')}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-emerald-400 text-emerald-950 hover:bg-emerald-300 font-black text-xs px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <ShoppingBag className="h-4 w-4" />
              Go to Marketplace
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. TOP METRIC SUMMARY CARDS (4 STRUCTURED TILES) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Stat 1: Active Order */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex items-center gap-3.5 hover:border-emerald-300 transition-all">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl shrink-0">
            <Truck className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Order</p>
            <h3 className="text-base font-black text-slate-800 truncate">
              {activeOrder ? `Order #${activeOrder.id}` : 'No Active Drop'}
            </h3>
            <span className="text-[11px] font-semibold text-emerald-600 block truncate">
              {activeOrder ? (activeOrder.status === 'in_transit' ? 'Out for delivery today' : activeOrder.status.toUpperCase()) : 'Browse marketplace'}
            </span>
          </div>
        </div>

        {/* Stat 2: Payment Status */}
        <div className={`bg-white border rounded-2xl p-4 shadow-xs flex items-center gap-3.5 transition-all ${
          unpaidOrder ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200/80 hover:border-emerald-300'
        }`}>
          <div className={`p-3 rounded-xl shrink-0 ${unpaidOrder ? 'bg-rose-100 text-rose-600' : 'bg-emerald-50 text-emerald-700'}`}>
            {unpaidOrder ? <AlertCircle className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payment Status</p>
            <h3 className="text-base font-black text-slate-800 truncate">
              {unpaidOrder ? `₹${parseFloat(unpaidOrder.total_amount).toFixed(2)}` : 'All Paid'}
            </h3>
            <span className={`text-[11px] font-semibold block truncate ${unpaidOrder ? 'text-rose-600 font-bold' : 'text-emerald-600'}`}>
              {unpaidOrder ? 'Action Required • Unpaid' : '100% Settled'}
            </span>
          </div>
        </div>

        {/* Stat 3: Direct Savings */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex items-center gap-3.5 hover:border-amber-300 transition-all">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl shrink-0">
            <PiggyBank className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Direct Savings</p>
            <h3 className="text-base font-black text-slate-800 truncate">
              ₹{calculatedSavings.toLocaleString()}
            </h3>
            <span className="text-[11px] font-semibold text-amber-600 block truncate">
              Saved vs Retail Markups
            </span>
          </div>
        </div>

        {/* Stat 4: Scheduled Drops */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex items-center gap-3.5 hover:border-teal-300 transition-all">
          <div className="p-3 bg-teal-50 text-teal-700 rounded-xl shrink-0">
            <Repeat className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Scheduled Drops</p>
            <h3 className="text-base font-black text-slate-800 truncate">
              {subscriptions.length} {subscriptions.length === 1 ? 'Subscription' : 'Subscriptions'}
            </h3>
            <span className="text-[11px] font-semibold text-teal-600 block truncate">
              {activeSub ? `Next: ${activeSub.delivery_day}` : 'Set up auto-delivery'}
            </span>
          </div>
        </div>

      </div>

      {/* ── 3. MAIN DASHBOARD CONTENT STACK (VERTICALLY STACKED COMPONENTS) ── */}
      <div className="space-y-6">

        {/* 🚚 COMPONENT 1: ACTIVE ORDER TRACKER CARD (FULL WIDTH) */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-xs relative overflow-hidden space-y-6">
          <div className="flex justify-between items-start border-b border-slate-100 pb-4 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100/70 text-emerald-800 rounded-2xl">
                <Truck className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-emerald-800 uppercase tracking-wider">
                    {activeOrder?.status === 'in_transit' ? '🚚 OUT FOR DELIVERY TODAY' : '📦 LATEST ORDER TRACKER'}
                  </span>
                  {activeOrder?.subscription && (
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Repeat className="h-2.5 w-2.5" /> Auto-Delivery
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-black text-slate-800 mt-0.5">
                  {activeOrder ? (
                    <>Order #{activeOrder.id} • {activeOrder.items?.length || 1} Item{activeOrder.items?.length > 1 ? 's' : ''}</>
                  ) : (
                    'No Active Deliveries'
                  )}
                </h2>
              </div>
            </div>

            {activeOrder && (
              <div className="text-left sm:text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Expected Delivery</span>
                <span className="text-xs font-black text-emerald-700 flex items-center gap-1 sm:justify-end">
                  <Clock className="h-3.5 w-3.5" />
                  {activeOrder.status === 'delivered' ? 'Delivered' : 'Today, 10:00 AM – 12:00 PM'}
                </span>
              </div>
            )}
          </div>

          {activeOrder ? (
            <div className="space-y-6">
              {/* Milestone Stepper Bar */}
              <div className="py-2">
                <div className="relative flex justify-between items-center max-w-2xl mx-auto px-2">
                  {/* Connecting line background */}
                  <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-slate-100 rounded-full z-0" />
                  {/* Active progress line */}
                  <div 
                    className="absolute left-6 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full z-0 transition-all duration-500"
                    style={{ width: `${(currentStepIdx / (STATUS_STEPS.length - 1)) * 88}%` }}
                  />

                  {STATUS_STEPS.map((step, idx) => {
                    const isDone = idx <= currentStepIdx;
                    const isCurrent = idx === currentStepIdx;
                    return (
                      <div key={step.id} className="relative z-10 flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-xs ${
                          isDone 
                            ? isCurrent
                              ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 scale-110'
                              : 'bg-emerald-500 text-white'
                            : 'bg-white border-2 border-slate-200 text-slate-400'
                        }`}>
                          {idx === 3 ? (
                            <Truck className="h-4 w-4" />
                          ) : isDone ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            idx + 1
                          )}
                        </div>
                        <span className={`text-[10px] font-bold mt-1.5 whitespace-nowrap ${
                          isCurrent ? 'text-emerald-800 font-extrabold' : isDone ? 'text-slate-700' : 'text-slate-400'
                        }`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Items & Delivery Telemetry Snippet */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50/80 border border-slate-200/70 p-4 rounded-2xl space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Produce Items in this Drop
                  </span>
                  <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                    {activeOrder.items?.map(it => (
                      <div key={it.id} className="flex justify-between font-semibold text-slate-700 text-xs py-0.5 border-b border-slate-100 last:border-0">
                        <span className="truncate pr-2">• {it.product_details?.name}</span>
                        <span className="shrink-0 text-slate-900 font-bold">{it.quantity} {it.product_details?.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-emerald-50/60 border border-emerald-100 p-4 rounded-2xl space-y-2 text-xs text-slate-700">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" /> Courier Telemetry
                  </span>
                  {activeOrder.shipment?.partner_details ? (
                    <div className="space-y-1 text-xs">
                      <p><strong className="text-slate-800">Driver:</strong> {activeOrder.shipment.partner_details.name}</p>
                      <p><strong className="text-slate-800">Contact:</strong> {activeOrder.shipment.partner_details.phone || 'Available upon pickup'}</p>
                    </div>
                  ) : (
                    <p className="text-slate-500 italic text-xs">Farmer preparing fresh harvest batch.</p>
                  )}
                  {activeOrder.shipment?.delivery_otp && activeOrder.payment_status === 'paid' && (
                    <div className="flex items-center gap-1.5 mt-2 bg-amber-100/90 border border-amber-300 text-amber-900 px-2.5 py-1.5 rounded-xl font-black text-xs w-fit">
                      <Key className="h-3.5 w-3.5 text-amber-700" /> OTP: {activeOrder.shipment.delivery_otp}
                    </div>
                  )}
                </div>
              </div>

              {/* Track Order Action Button */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => navigate('/marketplace?tab=tracking')}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl text-xs shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                >
                  <Truck className="h-4 w-4" />
                  Track Order &amp; View All Deliveries
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 space-y-3">
              <Package className="h-12 w-12 text-slate-300 mx-auto" />
              <p className="text-slate-500 text-xs font-semibold">
                You haven't placed any orders yet.
              </p>
              <button
                onClick={() => navigate('/marketplace')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ShoppingBag className="h-4 w-4" />
                Browse Fresh Produce
              </button>
            </div>
          )}
        </div>

        {/* ⚠️ COMPONENT 2: ACTION BANNER - PENDING PAYMENT (IF ANY) */}
        {unpaidOrder && (
          <div className="bg-rose-50 border-2 border-rose-200 rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-rose-700 font-black text-xs uppercase tracking-wider">
                <AlertCircle className="h-4 w-4 text-rose-600" />
                Payment Required for Order #{unpaidOrder.id}
              </div>
              <h3 className="text-xl font-black text-rose-950">
                ₹{parseFloat(unpaidOrder.total_amount).toFixed(2)}
              </h3>
              <p className="text-xs text-rose-800 leading-relaxed">
                Complete payment to unlock your delivery OTP and confirm dispatch.
              </p>
            </div>
            <button
              onClick={() => navigate('/marketplace?tab=tracking')}
              className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-3 px-6 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <CreditCard className="h-4 w-4" /> Pay Now
            </button>
          </div>
        )}

        {/* 📅 COMPONENT 3: SCHEDULED DROPS (STACKED FULL WIDTH CARD) */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="font-black text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-600" />
              Scheduled Drops &amp; Auto-Deliveries
            </h3>
            <button
              onClick={() => navigate('/marketplace?tab=subscriptions')}
              className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              View All Subscriptions <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {subscriptions.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 rounded-2xl p-4 space-y-2 border border-slate-100">
              <Repeat className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-600">No recurring deliveries yet</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Choose <strong>Auto-Delivery</strong> at checkout for weekly fresh drops &amp; 5% discount.
              </p>
              <button
                onClick={() => navigate('/marketplace')}
                className="mt-2 bg-emerald-600 text-white font-bold text-xs px-4 py-2 rounded-xl"
              >
                Set Up Schedule
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {subscriptions.map(sub => (
                <div key={sub.id} className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-2.5 hover:bg-emerald-50/80 transition-all">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                      <Repeat className="h-3.5 w-3.5 text-emerald-600" /> Every {sub.delivery_day}
                    </span>
                    <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full ${
                      sub.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {sub.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <p className="text-[11px] text-slate-600 font-medium">
                    📅 Next Drop: <strong>{sub.next_delivery_date} ({sub.delivery_time_slot})</strong>
                  </p>

                  {/* Progress Bar */}
                  <div className="space-y-1 pt-1">
                    <div className="w-full bg-emerald-200/60 rounded-full h-2">
                      <div 
                        className="bg-emerald-600 h-2 rounded-full" 
                        style={{ width: `${Math.min(100, (sub.completed_deliveries / (sub.total_deliveries || 1)) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] font-semibold text-slate-600 pt-0.5">
                      <span>{sub.completed_deliveries} / {sub.total_deliveries} Drops</span>
                      <span className="text-emerald-700 font-black">₹{parseFloat(sub.per_delivery_total).toFixed(2)}/drop</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 🌾 COMPONENT 4: FARM-TO-FORK TRANSPARENCY INDEX & IMPACT HUB (STACKED FULL WIDTH CARD) */}
        <div className="bg-gradient-to-br from-emerald-900 via-teal-950 to-slate-900 text-white rounded-3xl p-6 shadow-md space-y-4 relative overflow-hidden">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-800/60 border border-emerald-700/50 px-2.5 py-0.5 rounded-full inline-block">
                🌾 Transparency Index
              </span>
              <h4 className="font-black text-lg text-white">Your Farm-to-Fork Impact</h4>
            </div>
            <span className="text-xs text-emerald-200/80 bg-white/10 px-3 py-1 rounded-full font-bold">
              Direct D2C Supply Chain
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-emerald-100 pt-2">
            <div className="bg-white/10 border border-white/10 p-3.5 rounded-2xl space-y-1">
              <span className="text-emerald-300/80 font-semibold text-[10px] uppercase block">Direct Farmer Payout</span>
              <span className="font-black text-emerald-300 text-lg block">88% of Total</span>
            </div>
            <div className="bg-white/10 border border-white/10 p-3.5 rounded-2xl space-y-1">
              <span className="text-emerald-300/80 font-semibold text-[10px] uppercase block">Middleman Commission</span>
              <span className="font-black text-emerald-300 text-lg block">₹0.00 (0%)</span>
            </div>
            <div className="bg-white/10 border border-white/10 p-3.5 rounded-2xl space-y-1">
              <span className="text-emerald-300/80 font-semibold text-[10px] uppercase block">Avg Distance Traveled</span>
              <span className="font-black text-emerald-300 text-lg block">~14 km</span>
            </div>
          </div>
        </div>

        {/* 🌱 COMPONENT 5: FRESH HARVEST NEAR YOU (STACKED FULL WIDTH CATALOG HIGHLIGHT) */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-xl">🌱</span>
              <div>
                <h2 className="text-base font-black text-slate-800 uppercase tracking-wide">
                  Fresh Harvest Near You
                </h2>
                <p className="text-xs text-slate-400 font-medium">Directly from local farms in {user?.district || 'your area'}</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/marketplace')}
              className="flex items-center gap-1 text-xs font-black text-emerald-700 hover:text-emerald-800 hover:underline transition-all cursor-pointer"
            >
              View Marketplace <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-1">
            {freshProducts.map((p) => (
              <div key={p.id}>
                <ProductCard
                  product={p}
                  onAddToCart={(prod, qty, config) => {
                    addToCart(prod, qty, config);
                  }}
                />
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};

export default ConsumerDashboard;

