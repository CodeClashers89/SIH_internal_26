import React, { useState, useEffect } from 'react';
import { X, Trash2, Plus, Minus, CreditCard, Loader2, CheckCircle, AlertCircle, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

// Loads the Razorpay checkout script dynamically
const loadRazorpayScript = () =>
  new Promise((resolve) => {
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

const CartDrawer = ({ isOpen, onClose, onOrderPlaced }) => {
  const { cartItems, updateQuantity, removeFromCart, getCartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingPincode, setShippingPincode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('cart'); // 'cart' | 'paying' | 'success'

  // Sandbox simulation fallback state
  const [sandboxOrder, setSandboxOrder] = useState(null);
  const [showSandbox, setShowSandbox] = useState(false);

  if (!isOpen) return null;

  // Pre-fill address from user profile if available
  const defaultAddress = shippingAddress || user?.address || '';
  const defaultPincode = shippingPincode || user?.pincode || '';

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

      // 1. Create order on backend → get Razorpay order_id
      const response = await api.post('/orders/create/', {
        items: itemsPayload,
        shipping_address: addr,
        shipping_pincode: pin,
      });

      const orderData = response.data;

      // 2. Try to load real Razorpay checkout
      const scriptLoaded = await loadRazorpayScript();

      if (scriptLoaded && window.Razorpay && !orderData.order.razorpay_order_id?.startsWith('rzp_mock_')) {
        // ── Real Razorpay Checkout ──────────────────────────────────────────
        const options = {
          key: orderData.razorpay_key_id,
          amount: orderData.amount_in_paise,
          currency: orderData.currency,
          name: 'KisanConnect',
          description: `Order #${orderData.order.id} — Fresh Farm Produce`,
          order_id: orderData.order.razorpay_order_id,
          image: 'https://i.imgur.com/n5tjHFD.png',
          prefill: {
            name: user?.username || '',
            email: user?.email || '',
            contact: user?.phone || '',
          },
          theme: { color: '#059669' },
          handler: async (paymentResult) => {
            setStep('paying');
            await handlePaymentSuccess(orderData, paymentResult);
          },
          modal: {
            ondismiss: () => {
              // User closed modal without paying — show sandbox fallback
              setSandboxOrder(orderData);
              setShowSandbox(true);
            }
          }
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        // ── Sandbox Simulator Fallback ──────────────────────────────────────
        setSandboxOrder(orderData);
        setShowSandbox(true);
      }
    } catch (err) {
      console.error('Order creation error:', err);
      let errMsg = 'Failed to place order.';
      if (err.response?.data) {
        const d = err.response.data;
        if (typeof d === 'string') errMsg = d;
        else if (d.error) errMsg = d.error;
        else if (d.detail) errMsg = d.detail;
        else if (d.items) {
          errMsg = Array.isArray(d.items) ? d.items.join(', ') : JSON.stringify(d.items);
        } else {
          errMsg = Object.values(d).flat().join(', ');
        }
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatePayment = async (success) => {
    if (!sandboxOrder) return;
    setLoading(true);
    try {
      if (success) {
        await handlePaymentSuccess(sandboxOrder, {
          razorpay_payment_id: `pay_mock_${Math.random().toString(36).substr(2, 9)}`,
          razorpay_signature: 'mock_signature',
        });
        setShowSandbox(false);
      } else {
        setShowSandbox(false);
        setSandboxOrder(null);
        setError('Payment failed. Your order was created but unpaid. You can retry payment from your orders page.');
        if (onOrderPlaced) onOrderPlaced(); // still navigate to tracking
      }
    } catch (err) {
      setError('Error processing payment simulation.');
    } finally {
      setLoading(false);
    }
  };

  // ── Success Screen ──────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end">
        <div className="w-full max-w-md bg-white h-full flex flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="p-5 bg-emerald-50 rounded-full border-4 border-emerald-100">
            <CheckCircle className="h-14 w-14 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-800">Order Confirmed!</h2>
          <p className="text-sm text-slate-500 max-w-xs">
            Payment successful. Your order is placed and awaiting farmer confirmation. You can track it in <strong>My Orders</strong>.
          </p>
          <div className="h-1 w-24 bg-emerald-200 rounded-full overflow-hidden mt-2">
            <div className="h-full bg-emerald-500 rounded-full animate-[progress_2.5s_linear_forwards]" />
          </div>
          <p className="text-xs text-slate-400">Closing automatically...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Cart Sidebar */}
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end">
        <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl relative">
          {/* Header */}
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-emerald-50 to-teal-50">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-emerald-600" />
              Your Basket
              <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {cartItems.length}
              </span>
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-200/60 text-slate-500 hover:text-slate-800 rounded-lg transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-3">
                <ShoppingBag className="h-12 w-12 stroke-[1.5]" />
                <p className="text-sm font-medium">Your basket is empty</p>
                <p className="text-xs">Browse the marketplace to add produce</p>
              </div>
            ) : (
              cartItems.map((item) => (
                <div key={item.product.id} className="flex gap-4 border-b border-slate-100 pb-4">
                  <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                    {item.product.image_url ? (
                      <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : '🌿'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-800 text-sm line-clamp-1">{item.product.name}</h4>
                    <span className="text-xs text-slate-400">
                      ₹{parseFloat(item.product.price_per_unit).toFixed(2)} / {item.product.unit}
                    </span>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="px-2.5 py-1 text-slate-500 hover:text-emerald-600 transition-colors"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-xs font-bold px-1 text-slate-800 min-w-[20px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="px-2.5 py-1 text-slate-500 hover:text-emerald-600 transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-xs text-rose-500 hover:text-rose-600 hover:underline flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="font-bold text-slate-800 text-sm self-center shrink-0">
                    ₹{(parseFloat(item.product.price_per_unit) * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Checkout Form */}
          {cartItems.length > 0 && (
            <div className="p-5 border-t border-slate-100 bg-slate-50 space-y-4">
              {/* Total */}
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-semibold text-slate-500">Cart Total</span>
                <span className="text-2xl font-black text-slate-900">₹{getCartTotal().toFixed(2)}</span>
              </div>

              <form onSubmit={handleCheckout} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                    Delivery Address
                  </label>
                  <textarea
                    rows="2"
                    required
                    value={shippingAddress || defaultAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="Full delivery address..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                    Delivery Pincode
                  </label>
                  <input
                    type="text"
                    required
                    maxLength="6"
                    pattern="\d{6}"
                    value={shippingPincode || defaultPincode}
                    onChange={(e) => setShippingPincode(e.target.value.replace(/\D/g, ''))}
                    placeholder="6-digit PIN code"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all"
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2 text-xs text-rose-700 font-medium">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-3.5 px-4 rounded-2xl shadow-md shadow-emerald-200/50 transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      Place Order &amp; Pay via Razorpay
                    </>
                  )}
                </button>

                <p className="text-[10px] text-center text-slate-400 leading-relaxed">
                  🔒 Secured by Razorpay · UPI / Cards / Net Banking supported
                </p>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* ── Razorpay Sandbox Simulator Modal ─────────────────────────────────── */}
      {showSandbox && sandboxOrder && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-5">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-blue-400 animate-pulse" />
                <span className="font-bold tracking-wider text-[11px] text-blue-400 uppercase">
                  Razorpay Sandbox Gateway
                </span>
              </div>
              <button onClick={() => setShowSandbox(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 bg-emerald-600/20 rounded-xl">
                <CreditCard className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-base font-bold">Complete Your Payment</h3>
                <p className="text-xs text-slate-400">KisanConnect Fresh Produce</p>
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800 mb-5 space-y-2.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Order ID</span>
                <span className="font-bold text-white">#{sandboxOrder.order.id}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Razorpay Ref</span>
                <span className="font-mono text-xs text-slate-300 truncate ml-2 max-w-[180px]">
                  {sandboxOrder.order.razorpay_order_id}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Produce Subtotal</span>
                <span className="font-semibold text-slate-200">
                  ₹{parseFloat(sandboxOrder.order.product_subtotal || sandboxOrder.bill_breakdown?.product_subtotal || sandboxOrder.order.total_amount).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-emerald-400">
                <span>🚚 Transportation / Delivery</span>
                <span className="font-semibold">
                  + ₹{parseFloat(sandboxOrder.order.shipping_charge || sandboxOrder.bill_breakdown?.shipping_charge || 0).toFixed(2)}
                </span>
              </div>
              <div className="border-t border-slate-800 pt-2.5 flex justify-between items-baseline">
                <span className="text-sm font-bold text-slate-200">Total Payable</span>
                <span className="text-2xl font-black text-amber-400">
                  ₹{parseFloat(sandboxOrder.order.total_amount).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payment Methods (visual only for demo) */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              {['🏦 Net Banking', '💳 Card', '📱 UPI'].map(m => (
                <div key={m} className="bg-slate-800/60 border border-slate-700 rounded-xl px-2 py-2 text-center text-[10px] text-slate-400 font-semibold cursor-not-allowed">
                  {m}
                </div>
              ))}
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => handleSimulatePayment(true)}
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 text-sm active:scale-[0.99]"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Pay ₹{parseFloat(sandboxOrder.order.total_amount).toFixed(2)} — Simulate Success
                  </>
                )}
              </button>
              <button
                onClick={() => handleSimulatePayment(false)}
                disabled={loading}
                className="w-full bg-slate-700 hover:bg-rose-800/60 border border-slate-600 hover:border-rose-700 text-slate-300 hover:text-rose-300 font-semibold py-2.5 rounded-2xl transition-all text-xs"
              >
                Simulate Payment Failure
              </button>
            </div>

            <p className="text-[10px] text-center text-slate-600 mt-4">
              Sandbox mode · No real money is charged · For demo purposes only
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default CartDrawer;
