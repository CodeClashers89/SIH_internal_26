import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { 
  X, Trash2, Plus, Minus, ArrowRight, ShoppingBag, 
  MapPin, CheckCircle, CreditCard, Loader2, Sparkles,
  Repeat, Calendar, Clock, ShieldCheck, Sun, Sunrise, Sunset
} from 'lucide-react';

// Dynamically load Razorpay SDK
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (document.getElementById('razorpay-script')) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.id = 'razorpay-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const DAYS_OF_WEEK = [
  { id: 'Monday', label: 'Mon' },
  { id: 'Tuesday', label: 'Tue' },
  { id: 'Wednesday', label: 'Wed' },
  { id: 'Thursday', label: 'Thu' },
  { id: 'Friday', label: 'Fri' },
  { id: 'Saturday', label: 'Sat' },
  { id: 'Sunday', label: 'Sun' },
];

const TIME_SLOTS = [
  { id: 'morning', label: 'Morning', time: '6:00 AM – 9:00 AM', icon: Sunrise },
  { id: 'afternoon', label: 'Afternoon', time: '12:00 PM – 3:00 PM', icon: Sun },
  { id: 'evening', label: 'Evening', time: '5:00 PM – 8:00 PM', icon: Sunset },
];

const DURATIONS = [
  { months: 1, deliveries: 4, label: '1 Month', desc: '4 Deliveries' },
  { months: 2, deliveries: 8, label: '2 Months', desc: '8 Deliveries', popular: true },
  { months: 3, deliveries: 12, label: '3 Months', desc: '12 Deliveries' },
];

const CartDrawer = ({ isOpen, onClose, onOrderPlaced }) => {
  const { cartItems, updateQuantity, removeFromCart, getCartTotal, clearCart, subscriptionConfig } = useCart();
  const { user } = useAuth();
  
  // Checkout & Subscription Configuration State
  const [orderType, setOrderType] = useState('onetime'); // 'onetime' | 'subscription'
  const [deliveryDay, setDeliveryDay] = useState('Monday');
  const [deliveryTimeSlot, setDeliveryTimeSlot] = useState('morning');
  const [durationMonths, setDurationMonths] = useState(2);

  // Sync settings when drawer opens
  useEffect(() => {
    if (isOpen && subscriptionConfig) {
      if (subscriptionConfig.orderType) setOrderType(subscriptionConfig.orderType);
      if (subscriptionConfig.deliveryDay) setDeliveryDay(subscriptionConfig.deliveryDay);
      if (subscriptionConfig.deliveryTimeSlot) setDeliveryTimeSlot(subscriptionConfig.deliveryTimeSlot);
      if (subscriptionConfig.durationMonths) setDurationMonths(subscriptionConfig.durationMonths);
    }
  }, [isOpen, subscriptionConfig]);

  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingPincode, setShippingPincode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('cart'); // 'cart' | 'paying' | 'success'
  const [confirmedSubData, setConfirmedSubData] = useState(null);

  // Sandbox simulation fallback state
  const [sandboxOrder, setSandboxOrder] = useState(null);
  const [showSandbox, setShowSandbox] = useState(false);

  if (!isOpen) return null;

  // Pre-fill address from user profile if available
  const defaultAddress = shippingAddress || user?.address || '';
  const defaultPincode = shippingPincode || user?.pincode || '';

  // Subscription calculation helpers
  const baseSubtotal = getCartTotal();
  const discountRate = orderType === 'subscription' ? 0.05 : 0;
  const subscriberSavings = baseSubtotal * discountRate;
  const perDeliveryTotal = baseSubtotal - subscriberSavings;
  const totalDeliveries = durationMonths * 4;
  const totalPlanAmount = perDeliveryTotal * totalDeliveries;

  // Calculate next delivery date for display
  const getNextDeliveryDate = (targetDay) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetIndex = days.findIndex(d => d.toLowerCase() === targetDay.toLowerCase());
    const now = new Date();
    const currentDayIndex = now.getDay();
    let daysUntil = (targetIndex - currentDayIndex + 7) % 7;
    if (daysUntil === 0) daysUntil = 7;
    const nextDate = new Date(now.getTime() + daysUntil * 24 * 60 * 60 * 1000);
    return nextDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const handlePaymentSuccess = async (orderData, paymentResult) => {
    try {
      await api.post('/orders/payment-callback/', {
        order_id: orderData.order.id,
        razorpay_order_id: orderData.order.razorpay_order_id,
        razorpay_payment_id: paymentResult.razorpay_payment_id,
        razorpay_signature: paymentResult.razorpay_signature || 'mock_signature',
      });
      clearCart();
      setStep('success');
      setTimeout(() => {
        setStep('cart');
        setShowSandbox(false);
        setSandboxOrder(null);
        onClose();
        if (onOrderPlaced) onOrderPlaced();
      }, 2500);
    } catch (err) {
      setError('Payment verified but order confirmation failed. Contact support.');
    }
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    const addr = shippingAddress || defaultAddress;
    const pin = shippingPincode || defaultPincode;

    if (!addr || !pin) {
      setError('Please provide your delivery address and pincode.');
      return;
    }
    if (pin.length !== 6) {
      setError('Pincode must be exactly 6 digits.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const itemsPayload = cartItems.map(item => ({
        product: item.product.id,
        quantity: item.quantity
      }));

      // A) RECURRING SUBSCRIPTION ORDER FLOW
      if (orderType === 'subscription') {
        const subPayload = {
          delivery_day: deliveryDay,
          delivery_time_slot: deliveryTimeSlot,
          duration_months: durationMonths,
          shipping_address: addr,
          shipping_pincode: pin,
          items: itemsPayload
        };

        const response = await api.post('/orders/subscriptions/', subPayload);
        const { subscription, initial_order, razorpay_order_id, razorpay_key, amount } = response.data;
        setConfirmedSubData(subscription);

        const loaded = await loadRazorpayScript();
        if (!loaded || !window.Razorpay || !razorpay_key) {
          // Open simulated sandbox modal
          setSandboxOrder({ order: initial_order, razorpay_order_id, subscription });
          setShowSandbox(true);
          setLoading(false);
          return;
        }

        const options = {
          key: razorpay_key,
          amount: amount,
          currency: 'INR',
          name: 'KisanConnect Subscriptions',
          description: `Auto-Delivery Subscription #${subscription.id} (1st Drop)`,
          order_id: razorpay_order_id,
          handler: (res) => handlePaymentSuccess({ order: initial_order }, res),
          prefill: {
            name: user?.username || '',
            email: user?.email || '',
            contact: user?.phone || '',
          },
          theme: { color: '#059669' },
          modal: {
            ondismiss: () => {
              setLoading(false);
              setSandboxOrder({ order: initial_order, razorpay_order_id, subscription });
              setShowSandbox(true);
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
        setLoading(false);
        return;
      }

      // B) ONE-TIME STANDARD ORDER FLOW
      const response = await api.post('/orders/create/', {
        items: itemsPayload,
        shipping_address: addr,
        shipping_pincode: pin,
      });

      const { order, razorpay_order_id, razorpay_key, amount } = response.data;

      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay || !razorpay_key) {
        setSandboxOrder({ order, razorpay_order_id });
        setShowSandbox(true);
        setLoading(false);
        return;
      }

      const options = {
        key: razorpay_key,
        amount: amount,
        currency: 'INR',
        name: 'KisanConnect Marketplace',
        description: `Order #${order.id}`,
        order_id: razorpay_order_id,
        handler: (res) => handlePaymentSuccess({ order }, res),
        prefill: {
          name: user?.username || '',
          email: user?.email || '',
          contact: user?.phone || '',
        },
        theme: { color: '#059669' },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setSandboxOrder({ order, razorpay_order_id });
            setShowSandbox(true);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
      setLoading(false);

    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.error || err.response?.data?.detail || 'Failed to place order. Please try again.');
    }
  };

  const handleSimulatePayment = async (success) => {
    if (!sandboxOrder) return;
    setLoading(true);
    try {
      if (success) {
        await api.post('/orders/payment-callback/', {
          order_id: sandboxOrder.order.id,
          razorpay_order_id: sandboxOrder.razorpay_order_id,
          razorpay_payment_id: 'pay_simulated_' + Math.random().toString(36).substring(7),
          razorpay_signature: 'sig_simulated_' + Math.random().toString(36).substring(7),
        });
        clearCart();
        setStep('success');
        setTimeout(() => {
          setStep('cart');
          setShowSandbox(false);
          setSandboxOrder(null);
          onClose();
          if (onOrderPlaced) onOrderPlaced();
        }, 2500);
      } else {
        setError('Simulated payment failed. You can retry anytime.');
        setShowSandbox(false);
      }
    } catch (err) {
      setError('Payment confirmation error. Contact support.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between">
          
          {/* Header */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="h-5 w-5 text-emerald-600" />
              <h2 className="font-black text-slate-800 text-lg">Your Basket</h2>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full">
                {cartItems.reduce((sum, item) => sum + item.quantity, 0)} items
              </span>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {step === 'success' ? (
              <div className="text-center py-12 space-y-4 animate-scaleUp">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle className="h-10 w-10 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">
                    {orderType === 'subscription' ? 'Auto-Delivery Activated!' : 'Order Placed Successfully!'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {orderType === 'subscription' 
                      ? `Your weekly delivery every ${deliveryDay} has been scheduled.`
                      : 'Farmer has been notified for harvesting and dispatch.'
                    }
                  </p>
                </div>
                {orderType === 'subscription' && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-800 space-y-1">
                    <p className="font-bold">✨ 5% Subscriber Savings Applied</p>
                    <p>First Drop Date: <strong>{getNextDeliveryDate(deliveryDay)} ({deliveryTimeSlot})</strong></p>
                  </div>
                )}
              </div>
            ) : cartItems.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <ShoppingBag className="h-12 w-12 text-slate-300 mx-auto" />
                <p className="text-slate-500 text-sm font-semibold">Your basket is empty</p>
                <p className="text-slate-400 text-xs">Explore fresh farm listings and add produce to checkout.</p>
              </div>
            ) : (
              <>
                {/* ── Order Mode Toggle (One-Time vs Subscription) ── */}
                <div className="bg-slate-100/80 p-1.5 rounded-2xl flex gap-1 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setOrderType('onetime')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      orderType === 'onetime'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <ShoppingBag className="h-3.5 w-3.5" />
                    One-Time Order
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType('subscription')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      orderType === 'subscription'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-emerald-700 hover:text-emerald-800 bg-emerald-50/60'
                    }`}
                  >
                    <Repeat className="h-3.5 w-3.5" />
                    Auto-Delivery (-5%)
                  </button>
                </div>

                {/* ── Dynamic Subscription Scheduler UI (Shown only when subscription is chosen) ── */}
                {orderType === 'subscription' && (
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50/80 border-2 border-emerald-600/30 rounded-2xl p-4 space-y-4 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-emerald-900 font-black text-xs uppercase tracking-wider">
                        <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                        Recurring Schedule Settings
                      </div>
                      <span className="bg-amber-400 text-amber-950 font-black text-[9px] px-2 py-0.5 rounded-full uppercase">
                        Save 5%
                      </span>
                    </div>

                    {/* 1. Day of Week Selector */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 mb-1.5 uppercase">
                        Deliver Every Week On:
                      </label>
                      <div className="grid grid-cols-7 gap-1">
                        {DAYS_OF_WEEK.map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => setDeliveryDay(d.id)}
                            className={`py-1 text-center text-xs font-bold rounded-lg border transition-all ${
                              deliveryDay === d.id
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs scale-105'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                            }`}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 2. Preferred Time Slot */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 mb-1.5 uppercase">
                        Preferred Time Slot:
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {TIME_SLOTS.map((slot) => {
                          const Icon = slot.icon;
                          const isSelected = deliveryTimeSlot === slot.id;
                          return (
                            <button
                              key={slot.id}
                              type="button"
                              onClick={() => setDeliveryTimeSlot(slot.id)}
                              className={`p-2 rounded-xl text-left border transition-all ${
                                isSelected
                                  ? 'bg-white border-emerald-600 ring-2 ring-emerald-500/20 text-emerald-900 shadow-xs'
                                  : 'bg-white/70 border-slate-200 hover:bg-white text-slate-600'
                              }`}
                            >
                              <div className="flex items-center gap-1 text-[11px] font-bold">
                                <Icon className={`h-3 w-3 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                                {slot.label}
                              </div>
                              <div className="text-[9px] text-slate-500 mt-0.5">{slot.time}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 3. Duration Selector */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 mb-1.5 uppercase">
                        Schedule Duration:
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {DURATIONS.map((dur) => (
                          <button
                            key={dur.months}
                            type="button"
                            onClick={() => setDurationMonths(dur.months)}
                            className={`p-2 rounded-xl border text-center transition-all relative ${
                              durationMonths === dur.months
                                ? 'bg-white border-emerald-600 ring-2 ring-emerald-500/20 text-emerald-900 shadow-xs font-bold'
                                : 'bg-white/70 border-slate-200 hover:bg-white text-slate-600 text-xs'
                            }`}
                          >
                            <div className="text-xs font-bold">{dur.label}</div>
                            <div className="text-[9px] text-slate-500">{dur.desc}</div>
                            {dur.popular && (
                              <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[8px] font-black px-1.5 rounded-full uppercase tracking-tighter">
                                Popular
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Schedule Summary Banner */}
                    <div className="bg-white rounded-xl p-3 border border-emerald-200 text-xs space-y-1 text-slate-700">
                      <div className="flex justify-between items-center text-slate-800 font-bold">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                          First Delivery:
                        </span>
                        <span className="text-emerald-700 font-black">
                          {getNextDeliveryDate(deliveryDay)} ({deliveryTimeSlot})
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        🔁 <strong>{totalDeliveries} deliveries</strong> every {deliveryDay} morning directly from the farmer. Pause or cancel anytime.
                      </p>
                    </div>
                  </div>
                )}

                {/* ── Cart Items List ── */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Basket Items
                  </span>
                  {cartItems.map((item) => (
                    <div 
                      key={item.product.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors"
                    >
                      <div className="flex-1 pr-3">
                        <h4 className="font-bold text-xs text-slate-800 line-clamp-1">{item.product.name}</h4>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                          <span>₹{parseFloat(item.product.price_per_unit).toFixed(2)}/{item.product.unit}</span>
                          <span>•</span>
                          <span className="text-emerald-700 font-semibold">{item.product.farmer_details?.username || 'Farmer'}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {orderType === 'subscription' ? (
                          <button 
                            type="button"
                            onClick={() => removeFromCart(item.product.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : (
                          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-2xs">
                            <button 
                              type="button"
                              onClick={() => {
                                if (item.quantity <= 1) removeFromCart(item.product.id);
                                else updateQuantity(item.product.id, item.quantity - 1);
                              }}
                              className="p-1 hover:bg-slate-100 rounded-lg text-slate-600"
                            >
                              {item.quantity <= 1 ? <Trash2 className="h-3 w-3 text-rose-500" /> : <Minus className="h-3 w-3" />}
                            </button>
                            <span className="text-xs font-bold px-2 text-slate-800">{item.quantity}</span>
                            <button 
                              type="button"
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              disabled={item.quantity >= parseFloat(item.product.quantity)}
                              className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 disabled:opacity-40"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                        <span className="text-xs font-extrabold text-slate-800 min-w-[3.5rem] text-right">
                          ₹{(item.quantity * parseFloat(item.product.price_per_unit)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── Shipping Address Form ── */}
                <form id="checkout-form" onSubmit={handleCheckout} className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                    Delivery Destination
                  </div>
                  
                  <div>
                    <input 
                      type="text" 
                      placeholder="Street address, building, house no." 
                      defaultValue={defaultAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      required
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50 focus:bg-white"
                    />
                  </div>
                  
                  <div>
                    <input 
                      type="text" 
                      maxLength="6"
                      placeholder="6-digit Pincode (e.g. 411001)" 
                      defaultValue={defaultPincode}
                      onChange={(e) => setShippingPincode(e.target.value)}
                      required
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50 focus:bg-white"
                    />
                  </div>

                  {error && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-xs font-semibold">
                      {error}
                    </div>
                  )}
                </form>
              </>
            )}
          </div>

          {/* Footer / Summary & Checkout */}
          {cartItems.length > 0 && step === 'cart' && (
            <div className="p-5 border-t border-slate-100 bg-slate-50/80 space-y-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Produce Subtotal</span>
                  <span className="font-semibold">₹{baseSubtotal.toFixed(2)}</span>
                </div>

                {orderType === 'subscription' && (
                  <>
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span className="flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> 5% Subscriber Discount
                      </span>
                      <span>-₹{subscriberSavings.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-700 font-semibold border-t border-slate-200 pt-1">
                      <span>Per-Delivery Price ({totalDeliveries} Drops)</span>
                      <span className="text-emerald-700 font-bold">₹{perDeliveryTotal.toFixed(2)} / delivery</span>
                    </div>
                  </>
                )}

                <div className="flex justify-between text-slate-500">
                  <span>Farm Dispatch &amp; Logistics</span>
                  <span className="text-emerald-600 font-bold">Free Direct Pickup</span>
                </div>

                <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
                  <span className="font-black text-sm text-slate-800">
                    {orderType === 'subscription' ? 'Initial Drop Payment' : 'Total Amount'}
                  </span>
                  <span className="font-black text-xl text-emerald-700">
                    ₹{perDeliveryTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                form="checkout-form"
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold py-3 px-4 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-center space-x-2 text-sm disabled:opacity-50 active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    <span>
                      {orderType === 'subscription' 
                        ? `Confirm & Pay 1st Drop (₹${perDeliveryTotal.toFixed(2)})`
                        : `Pay Now (₹${perDeliveryTotal.toFixed(2)})`
                      }
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-semibold">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>100% Escrow Secured · Direct-to-Farmer Payout</span>
              </div>
            </div>
          )}

          {/* Sandbox Payment Simulation Modal */}
          {showSandbox && sandboxOrder && (
            <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-slate-900 text-white border border-slate-800 p-6 rounded-3xl w-full max-w-xs shadow-2xl space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <CreditCard className="h-4 w-4 text-emerald-400" />
                    <span>Payment Sandbox</span>
                  </div>
                  <button onClick={() => setShowSandbox(false)} className="text-slate-400 hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
                  <div className="text-slate-400 text-[10px]">Razorpay Order ID</div>
                  <div className="font-mono text-emerald-400 text-xs truncate">{sandboxOrder.razorpay_order_id}</div>
                  <div className="flex justify-between items-baseline pt-1">
                    <span className="text-slate-400">Total Due:</span>
                    <span className="font-black text-white text-base">₹{perDeliveryTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => handleSimulatePayment(true)}
                    disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                    Simulate Payment Success
                  </button>
                  <button
                    onClick={() => handleSimulatePayment(false)}
                    disabled={loading}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2 rounded-xl text-xs transition-colors"
                  >
                    Simulate Failure
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default CartDrawer;
