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
  HeartHandshake, Leaf, TrendingUp
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
        // Sort by highest freshness percentage
        const sorted = [...(prodsRes.value.data || [])].sort((a, b) => b.freshness_percentage - a.freshness_percentage);
        setFreshProducts(sorted.slice(0, 3));
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

  // Calculate estimated total savings (approx 15% middleman margin + subscriber discounts)
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* ── Greeting Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-emerald-700 via-teal-700 to-green-800 rounded-3xl p-7 text-white shadow-xl relative overflow-hidden">
        {/* Background decorative watermark */}
        <div className="absolute right-0 bottom-0 opacity-10 text-9xl font-black pointer-events-none translate-x-8 translate-y-8 select-none">
          🌾
        </div>

        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2">
            <span className="bg-white/20 text-white font-black text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full">
              Consumer Hub
            </span>
            <span className="text-emerald-200 text-xs flex items-center gap-1 font-semibold">
              <MapPin className="h-3 w-3" /> {user?.district || 'Pune'} ({user?.pincode || '411001'})
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {getGreeting()}, {user?.username || 'Consumer'} 👋
          </h1>
          <p className="text-emerald-100 text-xs max-w-lg leading-relaxed">
            Here's your real-time farm-to-table marketplace and delivery status update.
          </p>
        </div>

        <div className="flex items-center gap-3 z-10 shrink-0">
          <button
            onClick={fetchDashboardData}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl border border-white/20 transition-all shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => navigate('/marketplace')}
            className="flex items-center gap-1.5 bg-white text-emerald-800 hover:bg-emerald-50 font-black text-xs px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95"
          >
            <ShoppingBag className="h-3.5 w-3.5 text-emerald-600" />
            Go to Marketplace
          </button>
        </div>
      </div>

      {/* ── Main Dashboard Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left Column: Today's Delivery Card (2 cols on large screen) ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* 🚚 TODAY'S / ACTIVE DELIVERY CARD */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-7 shadow-xs relative overflow-hidden transition-all hover:shadow-md space-y-6">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl">
                  <Truck className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-emerald-800 uppercase tracking-wider">
                      {activeOrder?.status === 'in_transit' ? '🚚 OUT FOR DELIVERY TODAY' : '📦 LATEST DELIVERY STATUS'}
                    </span>
                    {activeOrder?.subscription && (
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
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
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Expected Window</span>
                  <span className="text-xs font-black text-emerald-700 flex items-center gap-1 justify-end">
                    <Clock className="h-3 w-3" />
                    {activeOrder.status === 'delivered' ? 'Delivered' : 'Today, 10 AM – 12 PM'}
                  </span>
                </div>
              )}
            </div>

            {activeOrder ? (
              <div className="space-y-6">
                {/* Milestone Stepper Bar */}
                <div className="py-2">
                  <div className="relative flex justify-between items-center max-w-xl mx-auto">
                    {/* Connecting line */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 w-full bg-slate-100 rounded-full z-0" />
                    <div 
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full z-0 transition-all duration-500"
                      style={{ width: `${(currentStepIdx / (STATUS_STEPS.length - 1)) * 100}%` }}
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
                            isCurrent ? 'text-emerald-800' : isDone ? 'text-slate-700' : 'text-slate-400'
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
                  <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Produce Items in this Drop
                    </span>
                    <div className="space-y-1">
                      {activeOrder.items?.map(it => (
                        <div key={it.id} className="flex justify-between font-semibold text-slate-700 text-xs">
                          <span>• {it.product_details?.name}</span>
                          <span>{it.quantity} {it.product_details?.unit}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-emerald-50/50 border border-emerald-100 p-3.5 rounded-2xl space-y-1.5 text-[11px] text-slate-600">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Courier Telemetry
                    </span>
                    {activeOrder.shipment?.partner_details ? (
                      <>
                        <p><strong className="text-slate-800">Driver:</strong> {activeOrder.shipment.partner_details.name}</p>
                        <p><strong className="text-slate-800">Contact:</strong> {activeOrder.shipment.partner_details.phone || 'Available upon pickup'}</p>
                      </>
                    ) : (
                      <p className="text-slate-500 italic">Farmer preparing produce batch.</p>
                    )}
                    {activeOrder.shipment?.delivery_otp && activeOrder.payment_status === 'paid' && (
                      <div className="flex items-center gap-1.5 mt-1 bg-amber-100/70 border border-amber-300 text-amber-900 px-2 py-1 rounded-lg font-black text-xs">
                        <Key className="h-3 w-3 text-amber-700" /> OTP: {activeOrder.shipment.delivery_otp}
                      </div>
                    )}
                  </div>
                </div>

                {/* Track Order Action Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => navigate('/marketplace?tab=tracking')}
                    className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold py-3 px-6 rounded-2xl text-xs shadow-md shadow-emerald-200/50 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                  >
                    <Truck className="h-4 w-4" />
                    Track Order &amp; View All Deliveries
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 space-y-3">
                <Package className="h-12 w-12 text-slate-300 mx-auto" />
                <p className="text-slate-500 text-xs font-semibold">
                  You haven't placed any orders yet.
                </p>
                <button
                  onClick={() => navigate('/marketplace')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5"
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  Browse Fresh Produce
                </button>
              </div>
            )}
          </div>

          {/* ── 2 Action / Metric Tiles ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

            {/* Tile A: Action Required / Active Schedule */}
            {unpaidOrder ? (
              <div className="bg-rose-50/80 border-2 border-rose-200 rounded-3xl p-5 shadow-xs space-y-3 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-rose-700 font-black text-xs uppercase tracking-wider">
                    <AlertCircle className="h-4 w-4 text-rose-600" />
                    Payment Pending
                  </div>
                  <h3 className="text-2xl font-black text-rose-950">
                    ₹{parseFloat(unpaidOrder.total_amount).toFixed(2)}
                  </h3>
                  <p className="text-[11px] text-rose-800 leading-relaxed">
                    Order #{unpaidOrder.id} is placed and waiting for payment to unlock delivery OTP.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/marketplace?tab=tracking')}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  <CreditCard className="h-3.5 w-3.5" /> Pay Now
                </button>
              </div>
            ) : activeSub ? (
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-3xl p-5 shadow-xs space-y-3 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-black text-xs uppercase tracking-wider">
                    <Repeat className="h-4 w-4 text-emerald-600" />
                    Active Auto-Delivery
                  </div>
                  <h3 className="text-xl font-black text-emerald-950">
                    Every {activeSub.delivery_day}
                  </h3>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    Next drop: <strong>{activeSub.next_delivery_date} ({activeSub.delivery_time_slot})</strong> · 5% discount applied.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/marketplace?tab=subscriptions')}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  <Repeat className="h-3.5 w-3.5" /> Manage Subscriptions
                </button>
              </div>
            ) : (
              <div className="bg-blue-50/80 border border-blue-200 rounded-3xl p-5 shadow-xs space-y-3 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-blue-800 font-black text-xs uppercase tracking-wider">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    Weekly Auto-Delivery
                  </div>
                  <h3 className="text-lg font-black text-blue-950">
                    Subscribe &amp; Save 5%
                  </h3>
                  <p className="text-[11px] text-blue-800 leading-relaxed">
                    Schedule recurring tomato or vegetable drops straight from local farmers.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/marketplace')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  <ShoppingBag className="h-3.5 w-3.5" /> Set Up Schedule
                </button>
              </div>
            )}

            {/* Tile B: Your Savings */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100/60 border border-amber-200 rounded-3xl p-5 shadow-xs space-y-3 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-amber-800 font-black text-xs uppercase tracking-wider">
                  <IndianRupee className="h-4 w-4 text-amber-700" />
                  Your Savings
                </div>
                <h3 className="text-2xl font-black text-amber-950">
                  ₹{calculatedSavings} Saved
                </h3>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  Saved this month by eliminating middleman retail markups + subscriber perks.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span className="bg-white/80 border border-amber-300 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full">
                  🌱 88% to Farmers
                </span>
                <span className="bg-white/80 border border-amber-300 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full">
                  🚜 Direct D2C
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* ── Right Column: Recurring Schedules & Impact Hub ── */}
        <div className="space-y-6">

          {/* Subscriptions Card / Schedule Radar */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-sm text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-emerald-600" />
                Scheduled Drops
              </h3>
              <button
                onClick={() => navigate('/marketplace?tab=subscriptions')}
                className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-0.5"
              >
                View All <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            {subscriptions.length === 0 ? (
              <div className="text-center py-6 bg-slate-50 rounded-2xl p-4 space-y-2 border border-slate-100">
                <Repeat className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-600">No recurring deliveries yet</p>
                <p className="text-[10px] text-slate-400">
                  Add items to your basket and choose <strong>Auto-Delivery</strong> for weekly drops.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {subscriptions.map(sub => (
                  <div key={sub.id} className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs text-slate-800">
                        Every {sub.delivery_day}
                      </span>
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-2 py-0.5 rounded-full">
                        {sub.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      📅 Next Drop: <strong>{sub.next_delivery_date} ({sub.delivery_time_slot})</strong>
                    </p>
                    <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                      <span>{sub.completed_deliveries} / {sub.total_deliveries} Drops completed</span>
                      <span className="text-emerald-700 font-bold">₹{parseFloat(sub.per_delivery_total).toFixed(2)}/drop</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Direct Farmer Transparency Card */}
          <div className="bg-gradient-to-br from-emerald-900 to-teal-950 text-white rounded-3xl p-6 shadow-md space-y-4 relative overflow-hidden">
            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-800/60 px-2 py-0.5 rounded-full inline-block">
                🌾 Transparency Index
              </span>
              <h4 className="font-black text-base text-white">Your Farm-to-Fork Impact</h4>
            </div>

            <div className="space-y-2.5 text-xs text-emerald-100">
              <div className="flex justify-between items-center py-1 border-b border-emerald-800/60">
                <span>Direct Farmer Payout</span>
                <span className="font-black text-emerald-300">88% of Total</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-emerald-800/60">
                <span>Middleman Commission</span>
                <span className="font-black text-emerald-300">₹0.00 (0%)</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span>Avg Distance Traveled</span>
                <span className="font-black text-emerald-300">~14 km</span>
              </div>
            </div>

            <p className="text-[10px] text-emerald-300/80 leading-relaxed pt-1">
              By purchasing on KisanConnect, you directly support rural cultivators and eliminate multi-tier mandi deductions.
            </p>
          </div>

        </div>

      </div>

      {/* ── Bottom Section: 🌱 FRESH NEAR YOU ── */}
      <div className="space-y-4 pt-4 border-t border-slate-100">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌱</span>
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-wide">
              Fresh Near You
            </h2>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full hidden sm:inline-block">
              Harvested Recently
            </span>
          </div>
          <button
            onClick={() => navigate('/marketplace')}
            className="flex items-center gap-1 text-xs font-black text-emerald-700 hover:text-emerald-800 hover:underline transition-all"
          >
            View All Marketplace Produce <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
  );
};

export default ConsumerDashboard;
