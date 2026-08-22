import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import DemandForecastingChart from '../components/DemandForecastingChart';
import Stepper from '../components/Stepper';
import MarketMap from '../components/MarketMap';
import MarketDetailPanel from '../components/MarketDetailPanel';
import NearestMandiExplorer from '../components/NearestMandiExplorer';
import { 
  Plus, Loader2, Calendar, FileCheck, Package, ShoppingBag, 
  DollarSign, RefreshCcw, Handshake, MapPin, PlusCircle, CheckCircle, Info, Award
} from 'lucide-react';

const FarmerDashboard = () => {
  const { user, submitKyc } = useAuth();
  
  // Dashboard states
  const [stats, setStats] = useState(null);
  const [listings, setListings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [bulkReqs, setBulkReqs] = useState([]);
  const [myOffers, setMyOffers] = useState([]);
  const [preHarvestContracts, setPreHarvestContracts] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [selectedMarket, setSelectedMarket] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Tab Control
  const [activeSection, setActiveSection] = useState('inventory');

  // Add listing state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  
  // Form states for adding product
  const [pName, setPName] = useState('');
  const [pCategory, setPCategory] = useState('vegetables');
  const [pQuantity, setPQuantity] = useState('');
  const [pUnit, setPUnit] = useState('kg');
  const [pPrice, setPPrice] = useState('');
  const [pHarvest, setPHarvest] = useState('');
  const [pExpiry, setPExpiry] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pImage, setPImage] = useState('');

  // Form states for counter offering quote
  const [counterPrices, setCounterPrices] = useState({});

  // Form states for submitting offer to bulk requirement
  const [offerReqId, setOfferReqId] = useState(null);
  const [offerQty, setOfferQty] = useState('');
  const [offerPrice, setOfferPrice] = useState('');
  const [offerDate, setOfferDate] = useState('');
  const [offerNotes, setOfferNotes] = useState('');
  const [submittingOffer, setSubmittingOffer] = useState(false);

  // Form states for proposing pre-harvest contract
  const [contractCrop, setContractCrop] = useState('');
  const [contractQty, setContractQty] = useState('');
  const [contractUnit, setContractUnit] = useState('kg');
  const [contractPrice, setContractPrice] = useState('');
  const [contractDate, setContractDate] = useState('');
  const [submittingContract, setSubmittingContract] = useState(false);

  // KYC upload state
  const [kycText, setKycText] = useState('');
  const [kycLoading, setKycLoading] = useState(false);

  const fetchDashboardData = async () => {
    setRefreshing(true);
    try {
      const [statsRes, listingsRes, ordersRes, quotesRes, bulkRes, myOffersRes, contractRes, marketsRes] = await Promise.all([
        api.get('/farmer/stats/'),
        api.get(`/products/?farmer=${user.id}`),
        api.get('/orders/'),
        api.get('/orders/quotes/'),
        api.get('/orders/bulk-requirements/'),
        api.get('/orders/farmer-offers/'),
        api.get('/orders/pre-harvest-contracts/'),
        api.get('/market-prices/markets/')
      ]);
      setStats(statsRes.data);
      setListings(listingsRes.data);
      setOrders(ordersRes.data);
      setQuotes(quotesRes.data);
      setBulkReqs(bulkRes.data);
      setMyOffers(myOffersRes.data);
      setPreHarvestContracts(contractRes.data);
      setMarkets(marketsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError('');

    const payload = {
      name: pName,
      category: pCategory,
      quantity: parseFloat(pQuantity),
      unit: pUnit,
      price_per_unit: parseFloat(pPrice),
      harvest_date: pHarvest,
      expiry_date: pExpiry,
      description: pDesc,
      image_url: pImage
    };

    try {
      const response = await api.post('/products/', payload);
      setListings([response.data, ...listings]);
      setShowAddModal(false);
      // Reset form
      setPName('');
      setPQuantity('');
      setPPrice('');
      setPHarvest('');
      setPExpiry('');
      setPDesc('');
      setPImage('');
      fetchDashboardData(); // update stats
    } catch (err) {
      setAddError(err.response?.data?.non_field_errors?.[0] || 'Failed to add product. Verify inputs.');
    } finally {
      setAddLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await api.patch(`/orders/${orderId}/status/`, { status: newStatus });
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: response.data.status } : o));
    } catch (err) {
      alert('Error updating order status');
    }
  };

  const handleKycSubmit = async (e) => {
    e.preventDefault();
    setKycLoading(true);
    const result = await submitKyc(kycText);
    setKycLoading(false);
    if (result.success) {
      alert('KYC documents submitted to Admin verification queue.');
      setKycText('');
    } else {
      alert(result.error);
    }
  };

  // Wholesale Counter offer
  const handleCounterQuote = async (quoteId) => {
    const price = counterPrices[quoteId];
    if (!price) {
      alert('Please enter a counter price.');
      return;
    }
    try {
      await api.post(`/orders/quotes/${quoteId}/counter-offer/`, { offered_price: parseFloat(price) });
      alert('Counter price offer submitted to buyer.');
      setCounterPrices(prev => ({ ...prev, [quoteId]: '' }));
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit counter offer.');
    }
  };

  const handleAcceptQuote = async (quoteId) => {
    try {
      await api.post(`/orders/quotes/${quoteId}/accept-offer/`);
      alert('Quote accepted! Order is now created.');
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to accept quote.');
    }
  };

  const handleRejectQuote = async (quoteId) => {
    try {
      await api.post(`/orders/quotes/${quoteId}/reject-offer/`);
      alert('Quote rejected.');
      fetchDashboardData();
    } catch (err) {
      alert('Failed to reject quote.');
    }
  };

  // Submit offer for bulk buyer requirement
  const handleOpenOfferForm = (req) => {
    setOfferReqId(req.id);
    setOfferQty(req.quantity);
    setOfferPrice(req.target_price_max);
    setOfferDate(req.required_date);
  };

  const handleSubmitSourcingOffer = async (e) => {
    e.preventDefault();
    if (!offerReqId) return;
    setSubmittingOffer(true);
    try {
      const payload = {
        requirement: offerReqId,
        quantity: parseFloat(offerQty),
        price_per_unit: parseFloat(offerPrice),
        delivery_date: offerDate,
        notes: offerNotes
      };
      await api.post('/orders/farmer-offers/', payload);
      alert('Sourcing contribution offer submitted successfully!');
      setOfferQty('');
      setOfferPrice('');
      setOfferDate('');
      setOfferNotes('');
      setOfferReqId(null);
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit sourcing offer.');
    } finally {
      setSubmittingOffer(false);
    }
  };

  // Propose Pre Harvest Contract
  const handleSubmitContract = async (e) => {
    e.preventDefault();
    setSubmittingContract(true);
    try {
      const payload = {
        crop_name: contractCrop,
        expected_quantity: parseFloat(contractQty),
        unit: contractUnit,
        contract_price: parseFloat(contractPrice),
        expected_harvest_date: contractDate
      };
      await api.post('/orders/pre-harvest-contracts/', payload);
      alert('Pre-harvest contract proposed! Wholesalers can now review and reserve it.');
      setContractCrop('');
      setContractQty('');
      setContractPrice('');
      setContractDate('');
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to propose contract.');
    } finally {
      setSubmittingContract(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header and Refresh */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Farmer Dashboard</h1>
          <p className="text-sm text-slate-500">Manage listings, view orders, negotiate wholesale bids, and forecast yield demand.</p>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 px-4 py-2.5 rounded-xl transition-all shadow-xs border border-emerald-100"
        >
          <RefreshCcw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Sync Data
        </button>
      </div>

      {/* KYC Warning Panel */}
      {user.kyc_status !== 'approved' && (
        <div className="bg-amber-50 border border-amber-100 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="font-bold text-amber-800 text-lg flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-600" />
              KYC Verification Required
            </h3>
            <p className="text-xs text-amber-700 mt-1 max-w-xl">
              {user.kyc_status === 'pending'
                ? "Your KYC documents are currently under administrative review. Once approved, your listings will go live globally."
                : "Submit FPO registration details or Land Registry documents below to get verified."}
            </p>
          </div>
          {user.kyc_status === 'pending' ? (
            <span className="bg-amber-100 text-amber-800 text-xs font-extrabold px-3 py-1 rounded-full animate-pulse">Under Review</span>
          ) : (
            <form onSubmit={handleKycSubmit} className="flex gap-2 w-full md:w-auto">
              <input
                type="text"
                required
                placeholder="FPO certificate # or Land Registry link"
                value={kycText}
                onChange={(e) => setKycText(e.target.value)}
                className="px-3 py-2 border border-amber-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 flex-1 md:w-64"
              />
              <button
                type="submit"
                disabled={kycLoading}
                className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-4 py-2 rounded-lg text-xs shrink-0"
              >
                {kycLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit KYC'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Stats Summary Row */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xs flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">₹{stats.total_earnings.toFixed(2)}</div>
              <div className="text-xs text-slate-500 font-medium">Delivered Earnings</div>
            </div>
          </div>
          
          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xs flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-amber-50 text-amber-600">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">{stats.total_orders_received}</div>
              <div className="text-xs text-slate-500 font-medium">Orders Received</div>
            </div>
          </div>

          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xs flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">{listings.length}</div>
              <div className="text-xs text-slate-500 font-medium">Active Crop Listings</div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="w-full">
        {stats && <DemandForecastingChart data={stats.demand_trends} />}
      </div>

      {/* Bottom Workspace Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveSection('inventory')}
          className={`pb-4 text-sm font-bold border-b-2 transition-all ${
            activeSection === 'inventory' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Crop Inventory ({listings.length})
        </button>
        <button
          onClick={() => setActiveSection('orders')}
          className={`pb-4 text-sm font-bold border-b-2 transition-all ${
            activeSection === 'orders' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Incoming Retail Orders ({orders.length})
        </button>
        <button
          onClick={() => setActiveSection('quotes')}
          className={`pb-4 text-sm font-bold border-b-2 transition-all ${
            activeSection === 'quotes' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Wholesale Bid Negotiations ({quotes.length})
        </button>
        <button
          onClick={() => setActiveSection('sourcing')}
          className={`pb-4 text-sm font-bold border-b-2 transition-all ${
            activeSection === 'sourcing' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Reverse Sourcing Requirements ({bulkReqs.length})
        </button>
        <button
          onClick={() => setActiveSection('contracts')}
          className={`pb-4 text-sm font-bold border-b-2 transition-all ${
            activeSection === 'contracts' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Pre-Harvest Contracts ({preHarvestContracts.length})
        </button>
        <button
          onClick={() => setActiveSection('markets')}
          className={`pb-4 text-sm font-bold border-b-2 transition-all ${
            activeSection === 'markets' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Market Prices
        </button>
      </div>

      {/* WORKSPACE SECTIONS */}
      {/* 1. Retail Inventory Catalog */}
      {activeSection === 'inventory' && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg text-slate-800">Crop Inventory</h3>
              <p className="text-xs text-slate-500">Your agricultural listings available for retail consumers.</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1 shadow-sm"
            >
              <Plus className="h-4 w-4" /> Add Produce
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase">
                  <th className="py-3 px-2">Crop Name</th>
                  <th className="py-3 px-2">Category</th>
                  <th className="py-3 px-2">Stock Level</th>
                  <th className="py-3 px-2">Price per Unit</th>
                  <th className="py-3 px-2">Freshness Gauge</th>
                  <th className="py-3 px-2">Harvest / Expiry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {listings.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-400">No products listed. Add your first crop!</td>
                  </tr>
                ) : (
                  listings.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-2 font-semibold text-slate-800 flex items-center gap-2">
                        {l.image_url ? (
                          <img
                            src={l.image_url}
                            alt={l.name}
                            className="h-8 w-8 rounded-lg object-cover bg-slate-100 shrink-0"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <span
                          className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 text-base flex items-center justify-center shrink-0 select-none"
                          style={{ display: l.image_url ? 'none' : 'flex' }}
                          title="No image"
                        >
                          🌿
                        </span>
                        {l.name}
                      </td>
                      <td className="py-3.5 px-2 capitalize text-slate-500">{l.category}</td>
                      <td className="py-3.5 px-2 font-medium text-slate-700">{l.quantity} {l.unit}</td>
                      <td className="py-3.5 px-2 font-extrabold text-slate-900">₹{parseFloat(l.price_per_unit).toFixed(2)}</td>
                      <td className="py-3.5 px-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          l.freshness_percentage >= 80 ? 'bg-emerald-100 text-emerald-800' :
                          l.freshness_percentage >= 50 ? 'bg-amber-100 text-amber-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {l.freshness_percentage}% Fresh
                        </span>
                      </td>
                      <td className="py-3.5 px-2 text-slate-500 leading-relaxed">
                        Harv: {new Date(l.harvest_date).toLocaleDateString('en-IN')}<br />
                        Exp: {new Date(l.expiry_date).toLocaleDateString('en-IN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Retail Incoming Orders */}
      {activeSection === 'orders' && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="font-bold text-lg text-slate-800">Incoming Orders</h3>
            <p className="text-xs text-slate-500">Track shipping schedules and trigger logistics partner operations.</p>
          </div>

          <div className="space-y-6">
            {orders.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No orders received yet.</p>
            ) : (
              orders.map((o) => (
                <div key={o.id} className="border border-slate-100 rounded-3xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-3 gap-2">
                    <div>
                      <span className="text-xs font-bold text-slate-800">Order Reference #{o.id}</span>
                      <span className="text-[10px] text-slate-400 ml-2 font-medium">Placed: {new Date(o.created_at).toLocaleDateString('en-IN')}</span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase ${
                        o.status === 'placed' ? 'bg-blue-50 border-blue-200 text-blue-800' :
                        o.status === 'confirmed' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                        o.status === 'packed' ? 'bg-indigo-50 border-indigo-200 text-indigo-800' :
                        o.status === 'in_transit' ? 'bg-purple-50 border-purple-200 text-purple-800' :
                        o.status === 'delivered' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                        'bg-rose-50 border-rose-200 text-rose-800'
                      }`}>
                        Status: {o.status}
                      </span>
                      {o.status === 'placed' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(o.id, 'confirmed')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-xl transition-all"
                        >
                          Confirm Order
                        </button>
                      )}
                      {o.status === 'confirmed' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(o.id, 'packed')}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-xl transition-all"
                        >
                          Mark Packed
                        </button>
                      )}
                      {o.status === 'packed' && (
                        <span className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 font-bold text-[10px] px-3 py-1.5 rounded-xl">
                          🚚 Awaiting Logistics Pickup
                        </span>
                      )}
                      {o.status === 'in_transit' && (
                        <span className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 text-purple-700 font-bold text-[10px] px-3 py-1.5 rounded-xl">
                          📦 In Transit — Logistics Handling
                        </span>
                      )}
                      {o.status === 'delivered' && (
                        <span className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[10px] px-3 py-1.5 rounded-xl">
                          ✅ Delivered via OTP
                        </span>
                      )}
                      {(o.status === 'placed' || o.status === 'confirmed') && (
                        <button
                          onClick={() => handleUpdateOrderStatus(o.id, 'cancelled')}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[10px] px-2.5 py-1.5 rounded-xl border border-rose-100 transition-all"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="space-y-1 col-span-1">
                      <span className="font-bold text-slate-400 uppercase text-[10px]">Shipping Details</span>
                      <p className="font-semibold text-slate-700">Buyer: {o.buyer_username}</p>
                      <p className="text-slate-500 leading-relaxed">{o.shipping_address}</p>
                      <p className="text-slate-500">PIN: {o.shipping_pincode}</p>
                    </div>

                    <div className="space-y-1 col-span-1">
                      <span className="font-bold text-slate-400 uppercase text-[10px]">Crops Ordered</span>
                      {o.items?.map((item) => (
                        <p key={item.id} className="font-medium text-slate-700">
                          • {item.product_details?.name} (Qty: {item.quantity} {item.product_details?.unit})
                        </p>
                      ))}
                      <p className="font-extrabold text-slate-900 mt-2">Total Value: ₹{parseFloat(o.total_amount).toFixed(2)}</p>
                    </div>

                    {/* Order Status Stepper */}
                    <div className="col-span-1 flex flex-col justify-center">
                      <span className="font-bold text-slate-400 uppercase text-[10px] mb-2 text-center">Tracking Progression</span>
                      <Stepper currentStatus={o.status} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 3. Wholesale Bid Negotiations (Quotes) */}
      {activeSection === 'quotes' && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="font-bold text-lg text-slate-800">Wholesale Negotiations</h3>
            <p className="text-xs text-slate-500">Quotes submitted by wholesalers. Accept the bid, reject it, or send a counter-offer.</p>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase">
                  <th className="py-3 px-2">Wholesaler</th>
                  <th className="py-3 px-2">Crop Target</th>
                  <th className="py-3 px-2">Requested Qty</th>
                  <th className="py-3 px-2">Buyer's Bid Price</th>
                  <th className="py-3 px-2">Your Counter</th>
                  <th className="py-3 px-2">Status</th>
                  <th className="py-3 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotes.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-400">No wholesaler quotes submitted.</td>
                  </tr>
                ) : (
                  quotes.map(q => (
                    <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-2 font-semibold text-slate-800">{q.buyer_username}</td>
                      <td className="py-4 px-2 font-medium text-slate-600">{q.product_details?.name}</td>
                      <td className="py-4 px-2">{q.quantity} {q.product_details?.unit}</td>
                      <td className="py-4 px-2 font-bold text-slate-900">₹{parseFloat(q.target_price).toFixed(2)}/{q.product_details?.unit}</td>
                      <td className="py-4 px-2 font-bold text-amber-600">
                        {q.offered_price ? `₹${parseFloat(q.offered_price).toFixed(2)}` : '—'}
                      </td>
                      <td className="py-4 px-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          q.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' :
                          q.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          q.status === 'offered' ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {q.status === 'offered' ? 'Price Countered' : q.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-4 px-2 text-right">
                        {q.status === 'pending' && (
                          <div className="flex items-center justify-end gap-2 flex-wrap">
                            {/* Counter offer input field */}
                            <div className="flex gap-1">
                              <input
                                type="number"
                                step="0.01"
                                placeholder="Counter ₹"
                                value={counterPrices[q.id] || ''}
                                onChange={(e) => setCounterPrices({ ...counterPrices, [q.id]: e.target.value })}
                                className="w-20 px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                              />
                              <button
                                onClick={() => handleCounterQuote(q.id)}
                                className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-2 py-1 rounded text-[10px]"
                              >
                                Counter
                              </button>
                            </div>
                            <button
                              onClick={() => handleAcceptQuote(q.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded text-[10px]"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleRejectQuote(q.id)}
                              className="bg-rose-50 border border-rose-100 text-rose-600 font-semibold px-2.5 py-1 rounded text-[10px]"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {q.status === 'offered' && (
                          <span className="text-[10px] text-slate-400 italic">Waiting for buyer response</span>
                        )}
                        {q.status === 'accepted' && (
                          <span className="text-[10px] text-emerald-600 font-bold flex items-center justify-end gap-1">
                            <CheckCircle className="h-3 w-3" /> Contract Locked
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Reverse Sourcing Marketplace */}
      {activeSection === 'sourcing' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sourcing list */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h3 className="font-bold text-lg text-slate-800">Wholesale Buying Demands</h3>
              <p className="text-xs text-slate-500">Buyers looking for bulk quantities. Review requests and submit your price offers.</p>
            </div>

            <div className="space-y-4">
              {bulkReqs.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6 bg-white border border-slate-100 rounded-3xl">No bulk demands published.</p>
              ) : (
                bulkReqs.map(req => {
                  const totalTarget = parseFloat(req.quantity) || 0;
                  const totalOffered = (req.offers || []).reduce((sum, o) => sum + (parseFloat(o.quantity) || 0), 0);
                  const remainingQty = Math.max(0, totalTarget - totalOffered);
                  const progressPct = Math.min(100, Math.round((totalOffered / (totalTarget || 1)) * 100));

                  return (
                    <div key={req.id} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-slate-800 text-base">{req.crop_name}</h4>
                          <p className="text-[10px] text-slate-500">Variety: {req.variety || 'Standard'} | Target Date: {req.required_date}</p>
                        </div>
                        <div className="text-right text-xs">
                          <span className="text-slate-400 block font-semibold">Total Pool</span>
                          <span className="text-slate-800 font-extrabold">{totalTarget} {req.unit}</span>
                        </div>
                      </div>

                      {/* Aggregation Progress Bar */}
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 space-y-2 text-xs">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-semibold text-slate-600">Farmer Sourcing Pool Progress</span>
                          <span className="font-bold text-emerald-700">{progressPct}% Pooled</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-600 h-full rounded-full transition-all"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500 pt-0.5">
                          <span>Pledged: <strong className="text-emerald-700 font-bold">{totalOffered} {req.unit}</strong></span>
                          <span>Remaining Needed: <strong className="text-amber-700 font-bold">{remainingQty} {req.unit}</strong></span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl text-xs text-slate-600">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Target Budget</span>
                          <span className="font-bold text-slate-800">₹{req.target_price_min} - ₹{req.target_price_max} per {req.unit}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Deliver Location</span>
                          <span className="font-bold text-slate-800 flex items-center gap-0.5">
                            <MapPin className="h-3 w-3 text-slate-400" />
                            {req.location}
                          </span>
                        </div>
                      </div>

                    {req.status === 'pending' && (
                      <div className="space-y-3 pt-1">
                        <button
                          onClick={() => {
                            if (offerReqId === req.id) {
                              setOfferReqId(null);
                            } else {
                              handleOpenOfferForm(req);
                            }
                          }}
                          className={`w-full font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-xs ${
                            offerReqId === req.id
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          <Handshake className="h-4 w-4" /> 
                          {offerReqId === req.id ? 'Close Offer Form' : 'Submit Sourcing Contribution'}
                        </button>

                        {offerReqId === req.id && (
                          <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 space-y-3 animate-fade-in text-xs">
                            <div className="flex justify-between items-center pb-1 border-b border-emerald-100/60">
                              <span className="font-bold text-emerald-900 text-xs">Your Sourcing Contribution Offer</span>
                              <span className="text-[10px] text-emerald-600 font-medium">Target: ₹{req.target_price_min} - ₹{req.target_price_max}/{req.unit}</span>
                            </div>

                            <form onSubmit={handleSubmitSourcingOffer} className="space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <div>
                                  <label className="block text-slate-700 font-bold mb-1 text-[11px]">Your Quantity ({req.unit})</label>
                                  <input
                                    type="number"
                                    required
                                    placeholder={`e.g. ${req.quantity}`}
                                    value={offerQty}
                                    onChange={(e) => setOfferQty(e.target.value)}
                                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="block text-slate-700 font-bold mb-1 text-[11px]">Your Offered Price (₹/{req.unit})</label>
                                  <input
                                    type="number"
                                    required
                                    placeholder={`e.g. ${req.target_price_max}`}
                                    value={offerPrice}
                                    onChange={(e) => setOfferPrice(e.target.value)}
                                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-xs"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-slate-700 font-bold mb-1 text-[11px]">Expected Delivery Date</label>
                                <input
                                  type="date"
                                  required
                                  value={offerDate}
                                  onChange={(e) => setOfferDate(e.target.value)}
                                  className="w-full px-3 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-xs"
                                />
                              </div>

                              <div>
                                <label className="block text-slate-700 font-bold mb-1 text-[11px]">Notes / Terms (Optional)</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Moisture 11%, graded, direct from farm..."
                                  value={offerNotes}
                                  onChange={(e) => setOfferNotes(e.target.value)}
                                  className="w-full px-3 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-xs"
                                />
                              </div>

                              <div className="flex gap-2 pt-1">
                                <button
                                  type="submit"
                                  disabled={submittingOffer}
                                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs shadow-xs"
                                >
                                  {submittingOffer ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Send Offer to Wholesaler'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setOfferReqId(null)}
                                  className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold"
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
              )}
            </div>
          </div>

          {/* Submit/Edit Offer panel & my submitted offers */}
          <div className="lg:col-span-1 space-y-6">
            {offerReqId && (
              <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-4 animate-fade-in">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-slate-800 text-sm">Submit Sourcing Offer</h4>
                  <button 
                    onClick={() => setOfferReqId(null)}
                    className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                </div>

                <form onSubmit={handleSubmitSourcingOffer} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Your Offered Qty</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 500"
                      value={offerQty}
                      onChange={(e) => setOfferQty(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Offered Price (₹/unit)</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 20"
                      value={offerPrice}
                      onChange={(e) => setOfferPrice(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Expected Delivery Date</label>
                    <input
                      type="date"
                      required
                      value={offerDate}
                      onChange={(e) => setOfferDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Notes / Terms (Optional)</label>
                    <textarea
                      placeholder="e.g. Fresh organic, moisture index 11%..."
                      value={offerNotes}
                      onChange={(e) => setOfferNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingOffer}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl flex items-center justify-center gap-1"
                  >
                    {submittingOffer ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Offer to Wholesaler'}
                  </button>
                </form>
              </div>
            )}

            <div>
              <h4 className="font-bold text-slate-800 text-sm mb-3">Your Sourcing Contributions</h4>
              {myOffers.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6 bg-white border border-slate-100 rounded-3xl">No offers submitted.</p>
              ) : (
                <div className="space-y-3">
                  {myOffers.map(offer => (
                    <div key={offer.id} className="bg-white border border-slate-100 rounded-2xl p-4 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <strong className="text-slate-800 text-sm">Pool Requirement #{offer.requirement}</strong>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          offer.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' :
                          offer.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {offer.status}
                        </span>
                      </div>
                      <p className="text-slate-600">Qty Offered: {offer.quantity} | Bid Rate: ₹{offer.price_per_unit}</p>
                      <p className="text-slate-400 text-[10px]">Deliver Date: {offer.delivery_date}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeSection === 'markets' && (
        <div className="space-y-6">
          <NearestMandiExplorer markets={markets} onSelectMarketOnMap={setSelectedMarket} />
          
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs relative flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <div>
                <h3 className="font-bold text-lg text-slate-800">AGMARKNET Live Market Prices Map</h3>
                <p className="text-xs text-slate-500 mb-4">Discover markets and government-reported commodity prices around India.</p>
              </div>
              <MarketMap markets={markets} onMarketSelect={setSelectedMarket} />
            </div>
            {selectedMarket && (
              <div className="w-full md:w-1/3">
                <MarketDetailPanel market={selectedMarket} onClose={() => setSelectedMarket(null)} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Pre-Harvest Contracts */}
      {activeSection === 'contracts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Propose Contract Form */}
          <div className="lg:col-span-1 bg-white border border-slate-100 rounded-3xl p-6 shadow-xs h-fit space-y-6">
            <div>
              <h3 className="font-bold text-base text-slate-800">Propose Pre-Harvest Yield</h3>
              <p className="text-[10px] text-slate-500 mt-1">Guarantee sale prices for your upcoming yield prior to actual harvest.</p>
            </div>

            <form onSubmit={handleSubmitContract} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1 uppercase">Crop Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Basmati Rice"
                  value={contractCrop}
                  onChange={(e) => setContractCrop(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-bold mb-1 uppercase">Est. Quantity</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 50"
                    value={contractQty}
                    onChange={(e) => setContractQty(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1 uppercase">Unit</label>
                  <select
                    value={contractUnit}
                    onChange={(e) => setContractUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                  >
                    <option value="kg">kg</option>
                    <option value="quintal">quintal</option>
                    <option value="ton">ton</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1 uppercase">Locked Price (₹/unit)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 85"
                  value={contractPrice}
                  onChange={(e) => setContractPrice(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1 uppercase">Est. Harvest Date</label>
                <input
                  type="date"
                  required
                  value={contractDate}
                  onChange={(e) => setContractDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={submittingContract}
                className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold py-3 rounded-xl shadow transition-all flex items-center justify-center gap-1.5"
              >
                {submittingContract ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                  <>
                    <PlusCircle className="h-5 w-5" />
                    Propose Pre-Harvest Yield
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Proposed Contracts Log */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h3 className="font-bold text-base text-slate-800">Proposed Pre-Harvest Yields</h3>
              <p className="text-xs text-slate-500">Track which buyers have reserved your pre-harvest agreements.</p>
            </div>

            {preHarvestContracts.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8 bg-white border border-slate-100 rounded-3xl">No pre-harvest agreements listed.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {preHarvestContracts.map(c => (
                  <div key={c.id} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-3 relative overflow-hidden">
                    <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-600"></div>
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-slate-800 text-sm">{c.crop_name}</h4>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        c.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {c.status === 'accepted' ? 'Reserved' : 'Available'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 space-y-1">
                      <p>Expected harvest date: <span className="font-semibold text-slate-700">{c.expected_harvest_date}</span></p>
                      <p>Expected volume: <span className="font-semibold text-slate-700">{c.expected_quantity} {c.unit}</span></p>
                      <p>Contract rate: <span className="font-bold text-emerald-700">₹{parseFloat(c.contract_price).toFixed(2)}/{c.unit}</span></p>
                      {c.status === 'accepted' && (
                        <p className="pt-2 border-t border-slate-100 text-emerald-800 font-semibold flex items-center gap-1 mt-2">
                          <CheckCircle className="h-4.5 w-4.5" />
                          Reserved by Wholesaler: {c.buyer_username}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Produce Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
              <h3 className="text-xl font-bold text-slate-800">Add Crop Listing</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                Cancel
              </button>
            </div>

            {addError && (
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-xs text-rose-600 font-semibold mb-4">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1 uppercase">Produce Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Organic Red Potatoes"
                    value={pName}
                    onChange={(e) => setPName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1 uppercase">Category</label>
                  <select
                    value={pCategory}
                    onChange={(e) => setPCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="fruits">Fruits</option>
                    <option value="vegetables">Vegetables</option>
                    <option value="grains">Grains</option>
                    <option value="pulses">Pulses</option>
                    <option value="spices">Spices</option>
                    <option value="others">Others</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="block text-slate-600 font-bold mb-1 uppercase">Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="100.00"
                    value={pQuantity}
                    onChange={(e) => setPQuantity(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-slate-600 font-bold mb-1 uppercase">Unit</label>
                  <input
                    type="text"
                    required
                    placeholder="kg or quintal"
                    value={pUnit}
                    onChange={(e) => setPUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-slate-600 font-bold mb-1 uppercase">Price per Unit</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="25.00"
                    value={pPrice}
                    onChange={(e) => setPPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1 uppercase">Harvest Date</label>
                  <input
                    type="date"
                    required
                    value={pHarvest}
                    onChange={(e) => setPHarvest(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1 uppercase">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={pExpiry}
                    onChange={(e) => setPExpiry(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1 uppercase">Crop Description</label>
                <textarea
                  rows="3"
                  placeholder="Organic crop, sun dried grains, moisture level 12%..."
                  value={pDesc}
                  onChange={(e) => setPDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1 uppercase">Image URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={pImage}
                  onChange={(e) => setPImage(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={addLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                {addLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Publish Listing'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmerDashboard;
