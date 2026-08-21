import React, { useState } from 'react';
import { Calendar, MapPin, Sparkles, User, ShoppingCart, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ProductCard = ({ product, onAddToCart }) => {
  const { user } = useAuth();
  const [qty, setQty] = useState(1);

  const getFreshnessColor = (pct) => {
    if (pct >= 80) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (pct >= 50) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-rose-100 text-rose-800 border-rose-200';
  };

  const isFarmerOwner = user && user.id === product.farmer;
  const isFarmerRole = user && user.role === 'farmer';
  const isAdminRole = user && user.role === 'admin';
  const outOfStock = parseFloat(product.quantity) <= 0;

  const handleAdd = () => {
    onAddToCart(product, qty);
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
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-2">
            <input 
              type="number" 
              min="1" 
              max={product.quantity}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Math.min(parseFloat(product.quantity), parseFloat(e.target.value) || 1)))}
              disabled={outOfStock}
              className="w-16 px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm text-center focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
            />
            <button
              onClick={handleAdd}
              disabled={outOfStock}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold py-1.5 px-3 rounded-lg text-sm shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none"
            >
              <ShoppingCart className="h-4 w-4" />
              Add to Cart
            </button>
          </div>
        )}

        {isFarmerOwner && (
          <div className="mt-4 bg-emerald-50 border border-emerald-100 rounded-lg p-2.5 flex items-center gap-2 text-xs text-emerald-800">
            <Info className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <span>This is your listing. Edit it in the Farmer Dashboard.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
