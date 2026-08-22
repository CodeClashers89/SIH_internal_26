import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/ProductCard';
import ReviewWidget from '../components/ReviewWidget';
import Stepper from '../components/Stepper';
import CartDrawer from '../components/CartDrawer';
import {
  Search, MapPin, X, Loader2, ArrowRight, ShoppingBag,
  Truck, CheckCircle, CreditCard, Key, RefreshCw, Package,
  AlertCircle, IndianRupee
} from 'lucide-react';

// Loads Razorpay SDK for retry-pay flow
const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (document.getElementById('razorpay-script')) { resolve(true); return; }
    const script = document.createElement('script');
    script.id = 'razorpay-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const STATUS_STEPS = ['placed', 'confirmed', 'packed', 'in_transit', 'delivered'];
const STATUS_LABELS = {
  placed: '🛒 Placed',
  confirmed: '✅ Confirmed',
  packed: '📦 Packed',
  in_transit: '🚚 In Transit',
  delivered: '🎉 Delivered',
};

const ConsumerMarketplace = () => {
  const { addToCart } = useCart();
  const { user } = useAuth();

  // Marketplace
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('');
  const [filterPincode, setFilterPincode] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Tabs
  const [activeTab, setActiveTab] = useState('browse');

  // Cart drawer
  const [cartOpen, setCartOpen] = useState(false);

  // Retry payment sandbox modal
  const [retryOrder, setRetryOrder] = useState(null);
  const [retryLoading, setRetryLoading] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      let url = '/products/?';
      if (category) url += `category=${category}&`;
      if (searchQuery) url += `search=${searchQuery}&`;
      if (filterPincode) url += `pincode=${filterPincode}&`;
      if (filterDistrict) url += `district=${filterDistrict}&`;
      const response = await api.get(url);
      let sorted = [...response.data];
      if (sortBy === 'price-low') sorted.sort((a, b) => parseFloat(a.price_per_unit) - parseFloat(b.price_per_unit));
      else if (sortBy === 'price-high') sorted.sort((a, b) => parseFloat(b.price_per_unit) - parseFloat(a.price_per_unit));
      else if (sortBy === 'freshness') sorted.sort((a, b) => b.freshness_percentage - a.freshness_percentage);
      setProducts(sorted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [category, searchQuery, filterPincode, filterDistrict, sortBy]);

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    try {
      const response = await api.get('/orders/');
      setOrders(response.data);
    } catch (err) { console.error(err); }
  }, [user]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { if (user && activeTab === 'tracking') fetchOrders(); }, [user, activeTab, fetchOrders]);

  const handleOrderPlaced = () => {
    fetchOrders();
    setActiveTab('tracking');
  };

  // ── Retry payment for unpaid orders ──────────────────────────────────────
  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    try {
      await api.patch(`/orders/${orderId}/status/`, { status: 'cancelled' });
      fetchOrders();
      alert("Order cancelled successfully.");
    } catch (err) {
      if (err.response?.data?.error === 'CANCELLATION_LOCKED_AFTER_TRANSPORT_HANDOVER') {
        alert("CANCELLATION LOCKED: This order can no longer be cancelled because the produce has already been handed over to the transport partner.");
      } else {
        alert(err.response?.data?.error || "Failed to cancel order.");
      }
    }
  };

  const handleRetryPayment = async (order) => {
    setRetryLoading(true);
    try {
      const res = await api.post(`/orders/${order.id}/retry-payment/`);
      const orderData = res.data;

      const scriptLoaded = await loadRazorpayScript();
      if (scriptLoaded && window.Razorpay && !orderData.order.razorpay_order_id?.startsWith('rzp_mock_')) {
        const options = {
          key: orderData.razorpay_key_id,
          amount: orderData.amount_in_paise,
          currency: orderData.currency,
          name: 'KisanConnect',
          description: `Retry payment — Order #${orderData.order.id}`,
          order_id: orderData.order.razorpay_order_id,
          theme: { color: '#059669' },
          handler: async (paymentResult) => {
            await api.post('/orders/payment-callback/', {
              order_id: orderData.order.id,
              razorpay_order_id: orderData.order.razorpay_order_id,
              razorpay_payment_id: paymentResult.razorpay_payment_id,
              razorpay_signature: paymentResult.razorpay_signature,
            });
            fetchOrders();
          },
        };
        new window.Razorpay(options).open();
      } else {
        // Sandbox mode
        setRetryOrder(orderData);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to initiate retry payment.');
    } finally {
      setRetryLoading(false);
    }
  };

  const handleRetrySimulate = async (success) => {
    if (!retryOrder) return;
    if (success) {
      try {
        await api.post('/orders/payment-callback/', {
          order_id: retryOrder.order.id,
          razorpay_order_id: retryOrder.order.razorpay_order_id,
          razorpay_payment_id: `pay_retry_${Math.random().toString(36).substr(2, 9)}`,
          razorpay_signature: 'mock_signature',
        });
        fetchOrders();
      } catch (err) { alert('Payment callback failed.'); }
    }
    setRetryOrder(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      {/* Sub-navigation */}
      <div className="flex border-b border-slate-100 pb-px gap-1">
        <button
          onClick={() => setActiveTab('browse')}
          className={`pb-4 px-6 text-sm font-extrabold border-b-2 transition-all ${
            activeTab === 'browse' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          🌾 Browse Fresh Produce
        </button>
        {user && (
          <>
            <button
              onClick={() => setActiveTab('tracking')}
              className={`pb-4 px-6 text-sm font-extrabold border-b-2 transition-all ${
                activeTab === 'tracking' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              📦 My Orders
            </button>
            <button
              onClick={() => setCartOpen(true)}
              className="ml-auto mb-3 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm shadow-emerald-200"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Open Cart
            </button>
          </>
        )}
      </div>

      {/* ── Browse Tab ── */}
      {activeTab === 'browse' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-6 h-fit">
            <h3 className="font-bold text-base text-slate-800 uppercase tracking-wider">Filters</h3>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search produce..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1.5 uppercase">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500">
                <option value="">All Categories</option>
                <option value="fruits">Fruits</option>
                <option value="vegetables">Vegetables</option>
                <option value="grains">Grains</option>
                <option value="pulses">Pulses</option>
                <option value="spices">Spices</option>
                <option value="others">Others</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1.5 uppercase">Pincode</label>
              <input type="text" maxLength="6" placeholder="e.g. 411001" value={filterPincode}
                onChange={(e) => setFilterPincode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1.5 uppercase">District</label>
              <input type="text" placeholder="e.g. Pune" value={filterDistrict}
                onChange={(e) => setFilterDistrict(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1.5 uppercase">Sort By</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500">
                <option value="newest">Newest</option>
                <option value="price-low">Price: Low → High</option>
                <option value="price-high">Price: High → Low</option>
                <option value="freshness">Freshness</option>
              </select>
            </div>
          </div>

          {/* Products */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="flex justify-center items-center py-24 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-24 bg-white border border-slate-100 rounded-3xl p-8 text-slate-400">
                No matching produce for these filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {products.map((p) => (
                  <div key={p.id} onClick={() => setSelectedProduct(p)} className="cursor-pointer">
                    <ProductCard
                      product={p}
                      onAddToCart={(prod, qty) => {
                        addToCart(prod, qty);
                        setCartOpen(true);
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── My Orders Tab ── */}
      {activeTab === 'tracking' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-black text-slate-800">My Orders</h2>
            <button onClick={fetchOrders}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-600 transition-colors">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-16 bg-white border border-slate-100 rounded-3xl p-8 text-slate-400">
              <Package className="h-12 w-12 mx-auto mb-3 text-slate-200" />
              <p className="font-semibold">No orders yet.</p>
              <p className="text-xs mt-1">Browse the marketplace and place your first order!</p>
            </div>
          ) : (
            orders.map((o) => (
              <div key={o.id} className="bg-white border border-slate-100 rounded-3xl shadow-xs overflow-hidden">
                {/* Status accent bar */}
                <div className={`h-1.5 w-full ${
                  o.status === 'delivered' ? 'bg-emerald-400' :
                  o.status === 'in_transit' ? 'bg-blue-400' :
                  o.status === 'packed' ? 'bg-purple-400' :
                  o.status === 'confirmed' ? 'bg-teal-400' : 'bg-amber-400'
                }`} />

                <div className="p-5 space-y-4">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <span className="font-extrabold text-sm text-slate-800">Order #{o.id}</span>
                      <span className="text-[10px] text-slate-400 ml-2">
                        {new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      {/* Payment badge */}
                      {o.payment_status !== 'paid' ? (
                        <button
                          onClick={() => handleRetryPayment(o)}
                          disabled={retryLoading}
                          className="flex items-center gap-1 bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[10px] px-2.5 py-1.5 rounded-full hover:bg-rose-100 transition-all"
                        >
                          <CreditCard className="h-3 w-3" />
                          {retryLoading ? 'Loading...' : 'Pay Now ₹' + parseFloat(o.total_amount).toFixed(0)}
                        </button>
                      ) : (
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2.5 py-1 rounded-full">
                          ✅ Paid
                        </span>
                      )}
                      <span className="bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
                        {STATUS_LABELS[o.status] || o.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 text-xs">
                    {/* Items & Price Breakdown */}
                    <div className="space-y-2">
                      <span className="font-bold text-slate-400 uppercase text-[9px]">Bill Breakdown</span>
                      {o.items?.map((item) => (
                        <div key={item.id} className="flex justify-between font-semibold text-slate-700">
                          <span>• {item.product_details?.name} × {item.quantity} {item.product_details?.unit}</span>
                          <span>₹{(item.quantity * item.price).toFixed(2)}</span>
                        </div>
                      ))}
                      
                      <div className="border-t border-slate-100 pt-2 space-y-1 text-[11px]">
                        <div className="flex justify-between text-slate-500">
                          <span>Produce Subtotal</span>
                          <span>₹{parseFloat(o.product_subtotal || o.items?.reduce((acc, it) => acc + (it.quantity * it.price), 0) || o.total_amount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-emerald-600 font-medium">
                          <span>🚚 Transportation / Delivery</span>
                          <span>+ ₹{parseFloat(o.shipping_charge || 0).toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="border-t border-slate-200 pt-2 flex justify-between font-black text-slate-800 text-sm">
                        <span>Total {o.payment_status === 'paid' ? 'Paid' : 'Due'}</span>
                        <span className="text-emerald-700">₹{parseFloat(o.total_amount).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Logistics / Shipment */}
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-2">
                      <span className="font-bold text-slate-400 uppercase text-[9px] flex items-center gap-1">
                        <Truck className="h-3 w-3 text-emerald-600" /> Delivery Status
                      </span>
                      {o.shipment ? (
                        <div className="space-y-1.5 leading-relaxed text-[11px] text-slate-600">
                          {o.shipment.partner_details ? (
                            <>
                              <p>
                                <strong className="text-slate-800">Driver:</strong>{' '}
                                {o.shipment.partner_details.name}
                              </p>
                              <p>
                                <strong className="text-slate-800">Contact:</strong>{' '}
                                {o.shipment.partner_details.phone || 'Pending'}
                              </p>
                            </>
                          ) : (
                            <p className="text-amber-600 font-semibold">
                              ⏳ Waiting for a driver to accept...
                            </p>
                          )}
                          <p>
                            <strong className="text-slate-800">Distance:</strong> {o.shipment.distance_km} km
                          </p>
                          <p className="flex items-center gap-1 mt-1 font-semibold">
                            <span className={`inline-block h-2 w-2 rounded-full ${
                              o.shipment.status === 'delivered' ? 'bg-emerald-500' :
                              o.shipment.status === 'picked_up' ? 'bg-blue-500' : 'bg-amber-400'
                            }`} />
                            {o.shipment.status === 'delivered' ? '✅ Delivered' :
                             o.shipment.status === 'picked_up' ? '🚚 Out for Delivery' :
                             '📋 Driver Assigned / Awaiting Pickup'}
                          </p>

                          {/* OTP display logic: ONLY show OTP when paid! If unpaid, OTP is locked */}
                          {o.shipment.status !== 'delivered' && (
                            o.payment_status === 'paid' ? (
                              <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl p-2.5 space-y-1">
                                <div className="flex justify-between items-center">
                                  <p className="text-[9px] font-bold text-amber-700 uppercase flex items-center gap-1">
                                    <Key className="h-3 w-3" /> Your Delivery OTP
                                  </p>
                                  <span className="text-[9px] text-amber-600 font-semibold">
                                    📧 Emailed to you
                                  </span>
                                </div>
                                <p className="text-lg font-black tracking-[0.3em] text-amber-800">
                                  {o.shipment.delivery_otp}
                                </p>
                                <p className="text-[9px] text-amber-600">
                                  Share this with your driver only upon inspecting your delivery.
                                </p>
                              </div>
                            ) : (
                              <div className="mt-2 bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-rose-700">
                                <p className="text-[10px] font-bold flex items-center gap-1">
                                  🔒 Delivery OTP Locked
                                </p>
                                <p className="text-[9px] text-rose-600 mt-0.5">
                                  Pay ₹{parseFloat(o.total_amount).toFixed(2)} (produce + transport) to unlock OTP &amp; receive delivery.
                                </p>
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 italic">
                          {o.payment_status !== 'paid'
                            ? '⚠️ Complete payment to activate delivery scheduling.'
                            : o.status === 'placed'
                            ? '⏳ Waiting for farmer to confirm order...'
                            : '🔄 Scheduling delivery...'}
                        </p>
                      )}
                    </div>

                    {/* Stepper */}
                    <div className="flex flex-col justify-center">
                      <span className="font-bold text-slate-400 uppercase text-[9px] mb-2 text-center">
                        Order Progress
                      </span>
                      <Stepper currentStatus={o.status} />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                    {!o.cancellation_locked && o.status !== 'cancelled' && o.status !== 'delivered' && (
                      <button 
                        onClick={() => handleCancelOrder(o.id)}
                        className="px-4 py-2 bg-rose-50 text-rose-600 font-semibold text-xs rounded-xl hover:bg-rose-100 transition-colors"
                      >
                        Cancel Order
                      </button>
                    )}
                    {o.cancellation_locked && o.status !== 'delivered' && o.status !== 'cancelled' && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-3 py-2 rounded-xl">Cancellation Locked</span>
                        <button 
                          onClick={() => alert("Post-handover resolution feature coming soon.")}
                          className="px-4 py-2 bg-indigo-50 text-indigo-600 font-semibold text-xs rounded-xl hover:bg-indigo-100 transition-colors"
                        >
                          Request Resolution
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Cart Drawer ── */}
      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        onOrderPlaced={handleOrderPlaced}
      />

      {/* ── Retry Payment Sandbox Modal ── */}
      {retryOrder && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold">Retry Payment</h3>
              <button onClick={() => setRetryOrder(null)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800 mb-5 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Order</span>
                <span className="font-bold">#{retryOrder.order.id}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-semibold text-slate-300">Amount Due</span>
                <span className="text-xl font-black text-amber-400">₹{parseFloat(retryOrder.order.total_amount).toFixed(2)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <button onClick={() => handleRetrySimulate(true)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-2xl text-sm">
                Simulate Successful Payment
              </button>
              <button onClick={() => setRetryOrder(null)}
                className="w-full bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-2xl text-xs">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Product Detail Modal ── */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl relative overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-lg text-slate-800">{selectedProduct.name}</h3>
              <button onClick={() => setSelectedProduct(null)}
                className="p-1.5 hover:bg-slate-200/60 text-slate-500 rounded-lg transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="w-full rounded-2xl aspect-video bg-slate-100 flex items-center justify-center text-6xl overflow-hidden">
                  {selectedProduct.image_url ? (
                    <img
                      src={selectedProduct.image_url}
                      alt={selectedProduct.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : '🌿'}
                </div>
                <div className="space-y-4 text-xs">
                  <div className="flex justify-between items-baseline">
                    <span className="text-2xl font-black text-slate-800">
                      ₹{parseFloat(selectedProduct.price_per_unit).toFixed(2)} / {selectedProduct.unit}
                    </span>
                    <span className="bg-emerald-50 text-emerald-800 font-bold border border-emerald-100 px-2.5 py-0.5 rounded-full">
                      {selectedProduct.freshness_percentage}% Fresh
                    </span>
                  </div>
                  <p className="text-slate-500 leading-relaxed text-sm">
                    {selectedProduct.description || 'No description available.'}
                  </p>
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 leading-relaxed">
                    <h4 className="font-bold text-slate-700 uppercase text-[10px]">Farmer Details</h4>
                    <p><strong>Producer:</strong> {selectedProduct.farmer_details?.username}</p>
                    <p><strong>KYC:</strong> <span className="text-emerald-700 font-bold capitalize">{selectedProduct.farmer_details?.kyc_status}</span></p>
                    <p><strong>Region:</strong> {selectedProduct.farmer_details?.district} ({selectedProduct.farmer_details?.pincode})</p>
                    <p><strong>Harvest:</strong> {new Date(selectedProduct.harvest_date).toLocaleDateString('en-IN')}</p>
                  </div>
                  <button
                    onClick={() => { addToCart(selectedProduct, 1); setSelectedProduct(null); setCartOpen(true); }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-2xl text-sm flex items-center justify-center gap-2 transition-all"
                  >
                    <ShoppingBag className="h-4 w-4" /> Add to Basket
                  </button>
                </div>
              </div>
              <ReviewWidget farmerId={selectedProduct.farmer} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsumerMarketplace;
