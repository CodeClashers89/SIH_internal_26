import React, { useState } from 'react';
import { Calendar, MapPin, User, ShoppingCart, Info, Plus, Minus, Trash2, Repeat } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import OrderTypeModal from './OrderTypeModal';

const ProductCard = ({ product, onAddToCart }) => {
  const { user } = useAuth();
  const { cartItems, addToCart, updateQuantity, removeFromCart } = useCart();
  const [showOrderModal, setShowOrderModal] = useState(false);

  const getFreshnessColor = (pct) => {
    if (pct >= 80) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (pct >= 50) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-rose-100 text-rose-800 border-rose-200';
  };

  const isFarmerOwner = user && user.id === product.farmer;
  const isFarmerRole = user && user.role === 'farmer';
  const isAdminRole = user && user.role === 'admin';
  const maxStock = parseFloat(product.quantity) || 0;
  const outOfStock = maxStock <= 0;

  // Check if item is already in cart
  const cartItem = cartItems.find((item) => item.product.id === product.id);
  const cartQty = cartItem ? cartItem.quantity : 0;

  const handleInitialAdd = (e) => {
    e.stopPropagation();
    setShowOrderModal(true);
  };

  const handleOrderConfirm = (type, config) => {
    if (onAddToCart) {
      onAddToCart(product, 1, config);
    } else {
      addToCart(product, 1, config);
    }
  };

  const handleIncrement = (e) => {
    e.stopPropagation();
    if (cartQty < maxStock) {
      updateQuantity(product.id, cartQty + 1);
    }
  };

  const handleDecrement = (e) => {
    e.stopPropagation();
    if (cartQty <= 1) {
      removeFromCart(product.id);
    } else {
      updateQuantity(product.id, cartQty - 1);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-all duration-300 flex flex-col h-full group">
      {/* Product Image & Badge */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
        <img 
          src={product.image_url || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=600'} 
          alt={product.name}
          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=600';
          }}
        />
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getFreshnessColor(product.freshness_percentage)}`}>
            {product.freshness_percentage}% Fresh
          </span>
          <span className="bg-slate-900/80 backdrop-blur-xs text-white px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider">
            {product.category}
          </span>
        </div>
      </div>

      {/* Info Content */}
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="font-bold text-lg text-slate-800 line-clamp-1 group-hover:text-emerald-700 transition-colors">
          {product.name}
        </h3>
        
        <div className="flex justify-between items-baseline mt-2">
          <div className="text-2xl font-black text-slate-900">
            ₹{parseFloat(product.price_per_unit).toFixed(2)}
            <span className="text-xs text-slate-500 font-medium ml-1">/ {product.unit}</span>
          </div>
          <span className={`text-xs font-semibold ${outOfStock ? 'text-rose-500' : 'text-slate-500'}`}>
            {outOfStock ? 'Out of Stock' : `${product.quantity} ${product.unit} left`}
          </span>
        </div>

        <p className="text-slate-500 text-xs mt-3 line-clamp-2 min-h-[2rem]">
          {product.description || 'No description provided.'}
        </p>

        {/* Technical metadata */}
        <div className="border-t border-slate-100 pt-4 mt-auto space-y-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-emerald-600" />
            <span className="font-medium text-slate-700">{product.farmer_details?.username || 'Farmer'}</span>
          </div>
          
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-emerald-600" />
            <span>{product.farmer_details?.address}, {product.farmer_details?.district} ({product.farmer_details?.pincode})</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-emerald-600" />
            <span>Harvested: {new Date(product.harvest_date).toLocaleDateString('en-IN', {day: 'numeric', month: 'short'})}</span>
          </div>
        </div>

        {/* Add block */}
        {!isFarmerRole && !isAdminRole && (
          <div className="mt-5 pt-3 border-t border-slate-100">
            {cartQty === 0 ? (
              <button
                type="button"
                onClick={handleInitialAdd}
                disabled={outOfStock}
                className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm shadow-xs hover:shadow-md hover:shadow-emerald-600/20 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]"
              >
                <ShoppingCart className="h-4 w-4" />
                Add to Cart
              </button>
            ) : cartItem?.isSubscription ? (
              <div 
                onClick={(e) => e.stopPropagation()}
                className="w-full flex items-center justify-between bg-emerald-50/90 border-2 border-emerald-600 rounded-xl p-1.5 shadow-xs transition-all animate-fadeIn"
              >
                <div className="flex items-center gap-1.5 font-black text-emerald-900 text-xs px-2 select-none">
                  <Repeat className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Recurring Order</span>
                </div>
                
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromCart(product.id);
                  }}
                  className="h-8 px-2.5 rounded-lg bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-200 border border-slate-200 flex items-center justify-center gap-1 font-bold text-xs transition-all shadow-xs active:scale-95"
                  title="Delete recurring order"
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                  <span>Delete</span>
                </button>
              </div>
            ) : (
              <div 
                onClick={(e) => e.stopPropagation()}
                className="w-full flex items-center justify-between bg-emerald-50/90 border-2 border-emerald-600 rounded-xl p-1 shadow-xs transition-all animate-fadeIn"
              >
                <button
                  type="button"
                  onClick={handleDecrement}
                  className="h-8 w-8 rounded-lg bg-white text-slate-700 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 border border-slate-200 flex items-center justify-center font-bold transition-all shadow-xs active:scale-90"
                  title={cartQty <= 1 ? "Remove from cart" : "Decrease quantity (-1)"}
                >
                  {cartQty <= 1 ? <Trash2 className="h-3.5 w-3.5 text-rose-500" /> : <Minus className="h-4 w-4 text-emerald-800" />}
                </button>
                
                <div className="flex items-center gap-1.5 font-black text-emerald-900 text-sm px-2 select-none">
                  <span className="text-base font-black">{cartQty}</span>
                  <span className="text-xs text-emerald-700 font-semibold">in cart</span>
                </div>

                <button
                  type="button"
                  onClick={handleIncrement}
                  disabled={cartQty >= maxStock}
                  className="h-8 w-8 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center font-bold transition-all shadow-xs active:scale-90"
                  title="Increase quantity (+1)"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {isFarmerOwner && (
          <div className="mt-4 bg-emerald-50 border border-emerald-100 rounded-lg p-2.5 flex items-center gap-2 text-xs text-emerald-800">
            <Info className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <span>This is your listing. Edit it in the Farmer Dashboard.</span>
          </div>
        )}
      </div>

      {/* Order Type Selector Modal */}
      <OrderTypeModal
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        product={product}
        onConfirm={handleOrderConfirm}
      />
    </div>
  );
};

export default ProductCard;
