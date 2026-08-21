import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/ProductCard';
import ReviewWidget from '../components/ReviewWidget';
import Stepper from '../components/Stepper';
import { Search, MapPin, X, Loader2, ArrowRight, ShoppingBag, Truck, CheckCircle } from 'lucide-react';

const ConsumerMarketplace = () => {
  const { addToCart } = useCart();
  const { user } = useAuth();
  
  // Marketplace lists
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Filters & Searching
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('');
  const [filterPincode, setFilterPincode] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Sub-tabs
  const [activeTab, setActiveTab] = useState('browse'); // browse vs tracking

  const fetchProducts = async () => {
    setLoading(true);
    try {
      let url = '/products/?';
      if (category) url += `category=${category}&`;
      if (searchQuery) url += `search=${searchQuery}&`;
      if (filterPincode) url += `pincode=${filterPincode}&`;
      if (filterDistrict) url += `district=${filterDistrict}&`;
      
      const response = await api.get(url);
      
      // Sort logic client side
      let sorted = [...response.data];
      if (sortBy === 'price-low') {
        sorted.sort((a, b) => parseFloat(a.price_per_unit) - parseFloat(b.price_per_unit));
      } else if (sortBy === 'price-high') {
        sorted.sort((a, b) => parseFloat(b.price_per_unit) - parseFloat(a.price_per_unit));
      } else if (sortBy === 'freshness') {
        sorted.sort((a, b) => b.freshness_percentage - a.freshness_percentage);
      }
      
      setProducts(sorted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    if (!user) return;
    try {
      const response = await api.get('/orders/');
      setOrders(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [category, searchQuery, filterPincode, filterDistrict, sortBy]);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user, activeTab]);

  const handleOrderCompletion = () => {
    fetchOrders();
    setActiveTab('tracking');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Subnavigation Tabs */}
      <div className="flex border-b border-slate-100 pb-px">
        <button
          onClick={() => setActiveTab('browse')}
          className={`pb-4 px-6 text-sm font-extrabold border-b-2 transition-all ${
            activeTab === 'browse' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Browse Fresh Produce
        </button>
        {user && (
          <button
            onClick={() => setActiveTab('tracking')}
            className={`pb-4 px-6 text-sm font-extrabold border-b-2 transition-all ${
              activeTab === 'tracking' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Track Your Orders
          </button>
        )}
      </div>

      {activeTab === 'browse' ? (
        /* Browse Tab */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar filters */}
          <div className="lg:col-span-1 bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-6 h-fit">
            <h3 className="font-bold text-base text-slate-800 uppercase tracking-wider">Search Filters</h3>

            {/* Keyword Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search tomatoes, wheat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            {/* Category Select */}
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1.5 uppercase">Crop Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">All Categories</option>
                <option value="fruits">Fruits</option>
                <option value="vegetables">Vegetables</option>
                <option value="grains">Grains</option>
                <option value="pulses">Pulses</option>
                <option value="spices">Spices</option>
                <option value="others">Others</option>
              </select>
            </div>

            {/* Pincode Proximity */}
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1.5 uppercase">Filter by Pincode</label>
              <input
                type="text"
                maxLength="6"
                placeholder="e.g. 411001"
                value={filterPincode}
                onChange={(e) => setFilterPincode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            {/* District Proximity */}
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1.5 uppercase">Filter by District</label>
              <input
                type="text"
                placeholder="e.g. Pune"
                value={filterDistrict}
                onChange={(e) => setFilterDistrict(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            {/* Sorting */}
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1.5 uppercase">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="newest">Newest Listed</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="freshness">Freshness Level</option>
              </select>
            </div>
          </div>

          {/* Product grid */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="flex justify-center items-center py-24 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-24 bg-white border border-slate-100 rounded-3xl p-8 text-slate-400">
                No matching produce listed for these filter parameters.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {products.map((p) => (
                  <div key={p.id} onClick={() => setSelectedProduct(p)} className="cursor-pointer">
                    <ProductCard 
                      product={p} 
                      onAddToCart={(prod, qty) => {
                        addToCart(prod, qty);
                        alert(`Added ${qty} ${prod.unit} of ${prod.name} to basket.`);
                      }} 
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Orders & Stepper tracking Tab */
        <div className="space-y-6">
          {orders.length === 0 ? (
            <div className="text-center py-16 bg-white border border-slate-100 rounded-3xl p-8 text-slate-400">
              You haven't placed any orders yet. Visit the Browse tab to order produce.
            </div>
          ) : (
            orders.map((o) => (
              <div key={o.id} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-3 gap-2">
                  <div>
                    <span className="font-extrabold text-sm text-slate-800">Order Reference ID: #{o.id}</span>
                    <span className="text-[10px] text-slate-400 ml-3 font-medium">Date: {new Date(o.created_at).toLocaleDateString('en-IN')}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      o.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}>
                      Payment: {o.payment_status}
                    </span>
                    <span className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                      Status: {o.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
                  {/* Item summaries */}
                  <div className="space-y-2">
                    <span className="font-bold text-slate-400 uppercase text-[9px]">Ordered Crop Items</span>
                    {o.items?.map((item) => (
                      <div key={item.id} className="flex justify-between font-semibold text-slate-700">
                        <span>• {item.product_details?.name} (Qty: {item.quantity} {item.product_details?.unit})</span>
                        <span>₹{(item.quantity * item.price).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="border-t border-slate-100 pt-2 flex justify-between font-black text-slate-800 text-sm">
                      <span>Total Value Paid</span>
                      <span className="text-emerald-700">₹{parseFloat(o.total_amount).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Shipment assignment (Logistics status) */}
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-2">
                    <span className="font-bold text-slate-400 uppercase text-[9px] flex items-center gap-1">
                      <Truck className="h-3.5 w-3.5 text-emerald-600" />
                      Logistics Dispatch Status
                    </span>
                    {o.shipment ? (
                      <div className="space-y-1.5 leading-relaxed text-[11px] text-slate-600">
                        <p><strong className="text-slate-800">Partner:</strong> {o.shipment.partner_details?.name || 'Assigned local driver'}</p>
                        <p><strong className="text-slate-800">Contact:</strong> {o.shipment.partner_details?.phone || '+91 90000 00000'}</p>
                        <p><strong className="text-slate-800">Distance matrix:</strong> {o.shipment.distance_km} km</p>
                        <p className="flex items-center gap-1 mt-1 font-semibold text-emerald-700">
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-600 fill-emerald-100" />
                          Driver status: {o.shipment.status.toUpperCase()}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 italic">Scheduling courier partner matching... (Triggered automatically on successful payment confirmation)</p>
                    )}
                  </div>

                  {/* Status Tracker */}
                  <div className="flex flex-col justify-center">
                    <span className="font-bold text-slate-400 uppercase text-[9px] mb-2 text-center">Tracking Stages</span>
                    <Stepper currentStatus={o.status} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Product Detail Modal Overlay with nested Reviews */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl relative overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-lg text-slate-800">{selectedProduct.name} Details</h3>
              <button 
                onClick={() => setSelectedProduct(null)}
                className="p-1.5 hover:bg-slate-200/60 text-slate-500 rounded-lg transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <img
                  src={selectedProduct.image_url || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=600'}
                  alt={selectedProduct.name}
                  className="w-full rounded-2xl aspect-video object-cover bg-slate-100 shadow-xs border border-slate-100"
                />
                
                <div className="space-y-4 text-xs">
                  <div className="flex justify-between items-baseline">
                    <span className="text-2xl font-black text-slate-800">₹{parseFloat(selectedProduct.price_per_unit).toFixed(2)} / {selectedProduct.unit}</span>
                    <span className="bg-emerald-50 text-emerald-800 font-bold border border-emerald-100 px-2.5 py-0.5 rounded-full">
                      {selectedProduct.freshness_percentage}% Fresh
                    </span>
                  </div>

                  <p className="text-slate-500 leading-relaxed text-sm">{selectedProduct.description || 'No detailed description available.'}</p>
                  
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 leading-relaxed">
                    <h4 className="font-bold text-slate-700 uppercase text-[10px]">Farmer & Location Metadata</h4>
                    <p><strong>Producer / FPO:</strong> {selectedProduct.farmer_details?.username}</p>
                    <p><strong>KYC Status:</strong> <span className="text-emerald-700 font-bold capitalize">{selectedProduct.farmer_details?.kyc_status}</span></p>
                    <p><strong>Pincode Region:</strong> {selectedProduct.farmer_details?.address}, {selectedProduct.farmer_details?.district} ({selectedProduct.farmer_details?.pincode})</p>
                    <p><strong>Harvest Date:</strong> {new Date(selectedProduct.harvest_date).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
              </div>

              {/* Nested Review Section */}
              <ReviewWidget farmerId={selectedProduct.farmer} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsumerMarketplace;
