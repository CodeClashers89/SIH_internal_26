import React, { useState } from 'react';
import { X, Trash2, Plus, Minus, CreditCard, Loader2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const CartDrawer = ({ isOpen, onClose, onOrderPlaced }) => {
  const { cartItems, updateQuantity, removeFromCart, getCartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingPincode, setShippingPincode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Sandbox Modal State
  const [sandboxOrder, setSandboxOrder] = useState(null);
  const [showSandbox, setShowSandbox] = useState(false);

  if (!isOpen) return null;

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!shippingAddress || !shippingPincode) {
      setError('Please provide shipping address and pincode');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const itemsPayload = cartItems.map(item => ({
        product: item.product.id,
        quantity: item.quantity
      }));

      const response = await api.post('/orders/create/', {
        items: itemsPayload,
        shipping_address: shippingAddress,
        shipping_pincode: shippingPincode
      });

      // Launch the Sandbox Simulator Modal
      setSandboxOrder(response.data);
      setShowSandbox(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to place order. Check product stock levels.');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatePayment = async (success) => {
    if (!sandboxOrder) return;
    setLoading(true);

    try {
      if (success) {
        // Send success callback
        await api.post('/orders/payment-callback/', {
          order_id: sandboxOrder.order.id,
          razorpay_order_id: sandboxOrder.order.razorpay_order_id,
          razorpay_payment_id: `pay_mock_${Math.random().toString(36).substr(2, 9)}`,
          razorpay_signature: 'mock_signature'
        });
        clearCart();
        setShowSandbox(false);
        onClose();
        if (onOrderPlaced) onOrderPlaced();
      } else {
        // Simulate failure
        alert('Payment failed simulation. Order status remains pending.');
        setShowSandbox(false);
        onClose();
        if (onOrderPlaced) onOrderPlaced();
      }
    } catch (err) {
      alert('Error verifying payment callback');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Sidebar overlay */}
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end">
        <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl relative animate-slide-in">
          {/* Header */}
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-emerald-50 to-green-50">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              Your Basket ({cartItems.length})
            </h2>
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-slate-200/60 text-slate-500 hover:text-slate-800 rounded-lg transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Cart items list */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                <Trash2 className="h-12 w-12 stroke-[1.5] mb-2" />
                <p className="text-sm">Your basket is currently empty.</p>
              </div>
            ) : (
              cartItems.map((item) => (
                <div key={item.product.id} className="flex gap-4 border-b border-slate-100 pb-4">
                  <img 
                    src={item.product.image_url || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=150'} 
                    alt={item.product.name}
                    className="w-16 h-16 rounded-xl object-cover bg-slate-50"
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-800 text-sm line-clamp-1">{item.product.name}</h4>
                    <span className="text-xs text-slate-400">₹{parseFloat(item.product.price_per_unit).toFixed(2)} / {item.product.unit}</span>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50">
                        <button 
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="px-2.5 py-1 text-slate-500 hover:text-emerald-600 transition-colors"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-xs font-semibold px-1 text-slate-800">{item.quantity}</span>
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
                  <div className="font-bold text-slate-800 text-sm self-center">
                    ₹{(parseFloat(item.product.price_per_unit) * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Checkout & Address forms */}
          {cartItems.length > 0 && (
            <div className="p-5 border-t border-slate-100 bg-slate-50">
              <div className="flex justify-between items-baseline mb-4">
                <span className="text-sm font-semibold text-slate-500">Cart Total</span>
                <span className="text-2xl font-black text-slate-900">₹{getCartTotal().toFixed(2)}</span>
              </div>

              <form onSubmit={handleCheckout} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Shipping Address</label>
                  <textarea
                    rows="2"
                    required
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="Enter full address where produce should be delivered"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Delivery Pincode</label>
                  <input
                    type="text"
                    required
                    maxLength="6"
                    value={shippingPincode}
                    onChange={(e) => setShippingPincode(e.target.value)}
                    placeholder="6-digit PIN code"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {error && <p className="text-xs text-rose-500 font-semibold">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <CreditCard className="h-5 w-5" />
                      Checkout & Pay via Razorpay
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Razorpay Sandbox Payment Simulator Modal */}
      {showSandbox && sandboxOrder && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500 animate-pulse"></div>
                <span className="font-bold tracking-wider text-xs text-blue-400 uppercase">Razorpay Sandbox Gateway</span>
              </div>
              <button 
                onClick={() => setShowSandbox(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <h3 className="text-lg font-bold mb-1">Simulating Sandbox Order Checkout</h3>
            <p className="text-xs text-slate-400 mb-6">Merchant: KisanConnect Marketplace Platform</p>

            <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 mb-6 space-y-3">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Order Reference ID</span>
                <span className="font-semibold text-white">#{sandboxOrder.order.id}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Razorpay Order ID</span>
                <span className="font-semibold text-white">{sandboxOrder.order.razorpay_order_id}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Customer</span>
                <span className="font-semibold text-white capitalize">{user?.username}</span>
              </div>
              <div className="border-t border-slate-800 my-2 pt-2 flex justify-between text-sm">
                <span className="font-bold text-slate-200">Amount Due</span>
                <span className="font-black text-amber-400 text-lg">₹{parseFloat(sandboxOrder.order.total_amount).toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleSimulatePayment(true)}
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Simulate Successful Payment'}
              </button>
              <button
                onClick={() => handleSimulatePayment(false)}
                disabled={loading}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Simulate Failed Payment'}
              </button>
            </div>

            <p className="text-[10px] text-center text-slate-500 mt-6 leading-relaxed">
              This sandbox interface simulates the payment signature callbacks of Razorpay payment gateway to confirm orders and schedule delivery dispatch in KisanConnect.
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default CartDrawer;
