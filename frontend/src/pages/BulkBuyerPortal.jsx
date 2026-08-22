import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { 
  ShoppingBag, Loader2, ArrowUpRight, DollarSign, 
  Handshake, AlertCircle, PlusCircle, CheckCircle, RefreshCw, Calendar, MapPin, Award
} from 'lucide-react';

const BulkBuyerPortal = () => {
  const { user } = useAuth();
  
  // Tab control
  const [activeTab, setActiveTab] = useState('quotes');

  // Lists
  const [products, setProducts] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [preHarvestContracts, setPreHarvestContracts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Quote Negotiation Form State
  const [selectedProdId, setSelectedProdId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [submittingQuote, setSubmittingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState('');

  // Bulk Requirement Form State
  const [reqCrop, setReqCrop] = useState('');
  const [reqVariety, setReqVariety] = useState('');
  const [reqQty, setReqQty] = useState('');
  const [reqUnit, setReqUnit] = useState('kg');
  const [reqGrade, setReqGrade] = useState('A');
  const [reqPriceMin, setReqPriceMin] = useState('');
  const [reqPriceMax, setReqPriceMax] = useState('');
  const [reqDate, setReqDate] = useState('');
  const [reqLocation, setReqLocation] = useState('');
  const [submittingReq, setSubmittingReq] = useState(false);
  const [reqError, setReqError] = useState('');

  // Payment confirmation popup after accepting quote
  const [sandboxOrder, setSandboxOrder] = useState(null);
  const [showPayModal, setShowPayModal] = useState(false);

  const fetchPortalData = async () => {
    try {
      const [prodRes, quotesRes, reqRes, contractRes] = await Promise.allSettled([
        api.get('/products/'),
        api.get('/orders/quotes/'),
        api.get('/orders/bulk-requirements/'),
        api.get('/orders/pre-harvest-contracts/')
      ]);
      
      if (prodRes.status === 'fulfilled') {
        const prodData = Array.isArray(prodRes.value.data) ? prodRes.value.data : (prodRes.value.data?.results || []);
        setProducts(prodData);
        if (prodData.length > 0) {
          setSelectedProdId(prodData[0].id);
        }
      }
      if (quotesRes.status === 'fulfilled') {
        const quotesData = Array.isArray(quotesRes.value.data) ? quotesRes.value.data : (quotesRes.value.data?.results || []);
        setQuotes(quotesData);
      }
      if (reqRes.status === 'fulfilled') {
        const reqData = Array.isArray(reqRes.value.data) ? reqRes.value.data : (reqRes.value.data?.results || []);
        setRequirements(reqData);
      }
      if (contractRes.status === 'fulfilled') {
        const contractData = Array.isArray(contractRes.value.data) ? contractRes.value.data : (contractRes.value.data?.results || []);
        setPreHarvestContracts(contractData);
      }
    } catch (err) {
      console.error('Failed to fetch portal data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPortalData();
    }
  }, [user]);

  const handleSubmitQuote = async (e) => {
    e.preventDefault();
    setSubmittingQuote(true);
    setQuoteError('');

    const payload = {
      product: parseInt(selectedProdId),
      quantity: parseFloat(quantity),
      target_price: parseFloat(targetPrice)
    };

    try {
      const response = await api.post('/orders/quotes/', payload);
      setQuotes([response.data, ...quotes]);
      setQuantity('');
      setTargetPrice('');
      alert('Wholesale quote request submitted to the farmer.');
    } catch (err) {
      setQuoteError(err.response?.data?.error || 'Failed to submit quote. Ensure quantity does not exceed stock.');
    } finally {
      setSubmittingQuote(false);
    }
  };

  const handleSubmitRequirement = async (e) => {
    e.preventDefault();
    setSubmittingReq(true);
    setReqError('');

    const payload = {
      crop_name: reqCrop,
      variety: reqVariety,
      quantity: parseFloat(reqQty),
      unit: reqUnit,
      grade: reqGrade,
      target_price_min: parseFloat(reqPriceMin),
      target_price_max: parseFloat(reqPriceMax),
      required_date: reqDate,
      location: reqLocation
    };

    try {
      const response = await api.post('/orders/bulk-requirements/', payload);
      setRequirements([response.data, ...requirements]);
      setReqCrop('');
      setReqVariety('');
      setReqQty('');
      setReqPriceMin('');
      setReqPriceMax('');
      setReqDate('');
      setReqLocation('');
      alert('Bulk requirement posted successfully! Farmers can view and submit offers.');
    } catch (err) {
      setReqError(err.response?.data?.error || 'Failed to post bulk requirement.');
    } finally {
      setSubmittingReq(false);
    }
  };

  const handleAcceptCounter = async (quoteId) => {
    try {
      const response = await api.post(`/orders/quotes/${quoteId}/accept-offer/`);
      alert('Offer accepted successfully! Proceeding to simulated checkout.');
      setSandboxOrder(response.data);
      setShowPayModal(true);
      fetchPortalData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to accept offer.');
    }
  };

  const handleRejectOffer = async (quoteId) => {
    try {
      await api.post(`/orders/quotes/${quoteId}/reject-offer/`);
      alert('Offer rejected.');
      fetchPortalData();
    } catch (err) {
      alert('Error updating quote');
    }
  };

  const handleAcceptFarmerOffer = async (offerId) => {
    try {
      const response = await api.post(`/orders/farmer-offers/${offerId}/accept/`);
      alert('Farmer offer accepted successfully! Proceeding to simulated checkout.');
      setSandboxOrder(response.data);
      setShowPayModal(true);
      fetchPortalData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to accept farmer offer.');
    }
  };

  const handleRejectFarmerOffer = async (offerId) => {
    try {
      await api.post(`/orders/farmer-offers/${offerId}/reject/`);
      alert('Farmer offer rejected.');
      fetchPortalData();
    } catch (err) {
      alert('Failed to reject farmer offer.');
    }
  };

  const handleReserveContract = async (contractId) => {
    try {
      await api.post(`/orders/pre-harvest-contracts/${contractId}/reserve/`);
      alert('Pre-harvest contract reserved successfully!');
      fetchPortalData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reserve pre-harvest contract.');
    }
  };

  const handleSimulatePayment = async (success) => {
    if (!sandboxOrder) return;
    try {
      if (success) {
        await api.post('/orders/payment-callback/', {
          order_id: sandboxOrder.order.id,
          razorpay_order_id: sandboxOrder.order.razorpay_order_id,
          razorpay_payment_id: `pay_bulk_mock_${Math.random().toString(36).substr(2, 9)}`,
          razorpay_signature: 'mock_signature'
        });
        alert('Bulk transaction verified successfully! Logistics partner scheduled.');
      } else {
        alert('Payment failed simulation. Order status remains unpaid.');
      }
    } catch (err) {
      alert('Error verifying payment callback');
    } finally {
      setShowPayModal(false);
      setSandboxOrder(null);
      fetchPortalData();
    }
  };

  const getSelectedProductDetails = () => {
    return products.find(p => p.id === parseInt(selectedProdId));
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
      
      {/* Page Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Bulk Buyer & Wholesaler Portal</h1>
          <p className="text-sm text-slate-500">Post sourcing requirements, negotiate custom pricing, and secure pre-harvest contracts.</p>
        </div>
        <button 
          onClick={fetchPortalData}
          className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-semibold text-xs bg-white hover:bg-slate-50 active:scale-95 transition-all"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh Portal
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('quotes')}
          className={`pb-4 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'quotes'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Single Crop Negotiations ({quotes.length})
        </button>
        <button
          onClick={() => setActiveTab('reverse')}
          className={`pb-4 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'reverse'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Reverse Sourcing Marketplace ({requirements.length})
        </button>
        <button
          onClick={() => setActiveTab('contracts')}
          className={`pb-4 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'contracts'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Pre-Harvest Contracts ({preHarvestContracts.filter(c => c.status === 'proposed' || c.buyer === user.id).length})
        </button>
      </div>

      {/* Tab: Quote Negotiations */}
      {activeTab === 'quotes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quote Request Form */}
          <div className="lg:col-span-1 bg-white border border-slate-100 rounded-3xl p-6 shadow-xs h-fit space-y-6">
            <div>
              <h3 className="font-bold text-base text-slate-800">Negotiate Specific Listing</h3>
              <p className="text-[10px] text-slate-500 mt-1">Submit wholesale bids directly to FPOs and independent farmers.</p>
            </div>

            {quoteError && (
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-xs text-rose-600 font-semibold">
                {quoteError}
              </div>
            )}

            <form onSubmit={handleSubmitQuote} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1 uppercase">Select Crop Yield</label>
                <select
                  value={selectedProdId}
                  onChange={(e) => setSelectedProdId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stock: {p.quantity} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              {selectedProdId && getSelectedProductDetails() && (
                <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 space-y-1">
                  <span className="font-bold text-[9px] uppercase tracking-wider text-emerald-800">Listing Price Reference</span>
                  <p className="font-semibold text-slate-700">₹{parseFloat(getSelectedProductDetails().price_per_unit).toFixed(2)} per {getSelectedProductDetails().unit}</p>
                  <p className="text-[10px] text-slate-500">Farmer: {getSelectedProductDetails().farmer_details?.username} ({getSelectedProductDetails().farmer_details?.district})</p>
                </div>
              )}

              <div>
                <label className="block text-slate-600 font-bold mb-1 uppercase">Target Quantity</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 500"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="bg-slate-100 border border-slate-200 text-slate-600 font-semibold px-4 py-2 rounded-xl flex items-center justify-center uppercase">
                    {getSelectedProductDetails()?.unit || 'Units'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1 uppercase">Target Bid Price (per unit)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 font-semibold">₹</div>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 20.00"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingQuote}
                className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                {submittingQuote ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                  <>
                    <Handshake className="h-5 w-5" />
                    Initiate Negotiation
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Negotiation Log Table */}
          <div className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-6">
            <div>
              <h3 className="font-bold text-base text-slate-800">Negotiation Log</h3>
              <p className="text-[10px] text-slate-500 mt-1">Review active, countered, or completed negotiations.</p>
            </div>

            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase">
                    <th className="py-3 px-2">Crop Listing</th>
                    <th className="py-3 px-2">Requested Qty</th>
                    <th className="py-3 px-2">Your Bid</th>
                    <th className="py-3 px-2">Farmer Counter</th>
                    <th className="py-3 px-2">Status</th>
                    <th className="py-3 px-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quotes.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-slate-400">No active quote negotiations.</td>
                    </tr>
                  ) : (
                    quotes.map((q) => (
                      <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-2 font-semibold text-slate-800">{q.product_details?.name}</td>
                        <td className="py-4 px-2 font-medium text-slate-600">{q.quantity} {q.product_details?.unit}</td>
                        <td className="py-4 px-2 font-bold text-slate-900">₹{parseFloat(q.target_price).toFixed(2)}</td>
                        <td className="py-4 px-2 font-bold text-slate-900">
                          {q.offered_price ? `₹${parseFloat(q.offered_price).toFixed(2)}` : '—'}
                        </td>
                        <td className="py-4 px-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            q.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' :
                            q.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            q.status === 'offered' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                            {q.status === 'offered' ? 'Counter Offered' : q.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-4 px-2 text-right">
                          {q.status === 'offered' && (
                            <div className="flex gap-1 justify-end">
                              <button
                                onClick={() => handleAcceptCounter(q.id)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded text-[10px] transition-colors"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleRejectOffer(q.id)}
                                className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold px-2.5 py-1 rounded text-[10px] border border-rose-100 transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                          {q.status === 'accepted' && (
                            <span className="text-[10px] text-emerald-600 font-semibold">Contract Locked</span>
                          )}
                          {q.status === 'pending' && (
                            <span className="text-[10px] text-slate-400 italic">Awaiting Farmer</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Reverse Sourcing Marketplace */}
      {activeTab === 'reverse' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Post Bulk Requirement Form */}
          <div className="lg:col-span-1 bg-white border border-slate-100 rounded-3xl p-6 shadow-xs h-fit space-y-6">
            <div>
              <h3 className="font-bold text-base text-slate-800">Post Bulk Sourcing Order</h3>
              <p className="text-[10px] text-slate-500 mt-1">Submit large buying requirements. Multiple farmers can contribute to fulfill the pool.</p>
            </div>

            {reqError && (
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-xs text-rose-600 font-semibold">
                {reqError}
              </div>
            )}

            <form onSubmit={handleSubmitRequirement} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-bold mb-1 uppercase">Crop Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tomato"
                    value={reqCrop}
                    onChange={(e) => setReqCrop(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1 uppercase">Variety / Grade</label>
                  <input
                    type="text"
                    placeholder="e.g. Hybrid / A Grade"
                    value={reqVariety}
                    onChange={(e) => setReqVariety(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-bold mb-1 uppercase">Req. Quantity</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 1000"
                    value={reqQty}
                    onChange={(e) => setReqQty(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1 uppercase">Unit</label>
                  <select
                    value={reqUnit}
                    onChange={(e) => setReqUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                  >
                    <option value="kg">Kilogram (kg)</option>
                    <option value="quintal">Quintal (100 kg)</option>
                    <option value="ton">Ton</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-bold mb-1 uppercase">Min Price (₹/unit)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 18"
                    value={reqPriceMin}
                    onChange={(e) => setReqPriceMin(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1 uppercase">Max Price (₹/unit)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 25"
                    value={reqPriceMax}
                    onChange={(e) => setReqPriceMax(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-bold mb-1 uppercase">Required Date</label>
                  <input
                    type="date"
                    required
                    value={reqDate}
                    onChange={(e) => setReqDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1 uppercase">Delivery Location</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. APMC Mandi, Pune"
                    value={reqLocation}
                    onChange={(e) => setReqLocation(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingReq}
                className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold py-3 rounded-xl shadow transition-all flex items-center justify-center gap-1.5"
              >
                {submittingReq ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                  <>
                    <PlusCircle className="h-5 w-5" />
                    Publish Requirement
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Active Sourcing Requirements & Submissions */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h3 className="font-bold text-base text-slate-800">Your Active Buying Pools</h3>
              <p className="text-xs text-slate-500">Track farmer contributions and offers submitted to fulfill your listings.</p>
            </div>

            {requirements.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-3xl p-8 text-center text-slate-400 text-xs">
                You have not published any sourcing requirements.
              </div>
            ) : (
              requirements.map(req => (
                <div key={req.id} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-4">
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <div>
                      <h4 className="font-bold text-slate-800 text-base">{req.crop_name}</h4>
                      <p className="text-[10px] text-slate-500">Variety: {req.variety || 'Standard'} | Target: {req.quantity} {req.unit} | Target Budget: ₹{req.target_price_min} - ₹{req.target_price_max}/{req.unit}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      req.status === 'fulfilled' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {req.status}
                    </span>
                  </div>

                  {/* Farmer Offers List */}
                  <div className="border-t border-slate-100 pt-3">
                    <h5 className="font-bold text-slate-700 text-xs mb-2">Farmer Offers & Contributions</h5>
                    {req.offers && req.offers.length > 0 ? (
                      <div className="space-y-2">
                        {req.offers.map(offer => (
                          <div key={offer.id} className="bg-slate-50 rounded-2xl p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                            <div>
                              <p className="font-semibold text-slate-800">Farmer: {offer.farmer_username}</p>
                              <p className="text-[10px] text-slate-500">Quantity Offered: {offer.quantity} {req.unit} @ ₹{offer.price_per_unit}/{req.unit} (Delivery: {offer.delivery_date})</p>
                              {offer.notes && <p className="text-[10px] italic text-slate-400 mt-1">Notes: "{offer.notes}"</p>}
                            </div>
                            <div className="flex items-center gap-2">
                              {offer.status === 'pending' ? (
                                <>
                                  <button
                                    onClick={() => handleAcceptFarmerOffer(offer.id)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-[10px]"
                                  >
                                    Accept Offer
                                  </button>
                                  <button
                                    onClick={() => handleRejectFarmerOffer(offer.id)}
                                    className="bg-rose-50 border border-rose-100 text-rose-600 font-semibold px-3 py-1.5 rounded-lg text-[10px]"
                                  >
                                    Reject
                                  </button>
                                </>
                              ) : (
                                <span className={`px-2.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  offer.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                                }`}>
                                  {offer.status}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 italic">No offers received from farmers yet.</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab: Pre-Harvest Contracts */}
      {activeTab === 'contracts' && (
        <div className="space-y-6">
          <div>
            <h3 className="font-bold text-base text-slate-800">Pre-Harvest Contract Marketplace</h3>
            <p className="text-xs text-slate-500">Secure crops before harvest at locked prices to protect against retail market volatility.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {preHarvestContracts.length === 0 ? (
              <div className="col-span-2 bg-white border border-slate-100 rounded-3xl p-8 text-center text-slate-400 text-xs">
                No pre-harvest contracts are currently proposed.
              </div>
            ) : (
              preHarvestContracts.map(contract => (
                <div key={contract.id} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 left-0 h-1 bg-amber-500"></div>
                  
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-800 text-base">{contract.crop_name}</h4>
                      <p className="text-[10px] text-slate-500">Proposed by Farmer: {contract.farmer_username}</p>
                    </div>
                    <div className="text-right text-xs">
                      <span className="text-slate-400 block font-semibold">Expected Quantity</span>
                      <span className="text-slate-800 font-extrabold">{contract.expected_quantity} {contract.unit}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-2xl text-xs text-slate-600">
                    <div>
                      <span className="text-slate-400 block font-semibold">Harvest Due Date</span>
                      <span className="text-slate-800 font-bold flex items-center gap-1 mt-0.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-500" />
                        {contract.expected_harvest_date}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">Contract Price</span>
                      <span className="text-emerald-700 font-bold flex items-center gap-0.5 mt-0.5">
                        <DollarSign className="h-3.5 w-3.5" />
                        ₹{parseFloat(contract.contract_price).toFixed(2)}/{contract.unit}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      contract.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {contract.status === 'accepted' ? 'Reserved' : 'Available'}
                    </span>
                    
                    {contract.status === 'proposed' ? (
                      <button
                        onClick={() => handleReserveContract(contract.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs"
                      >
                        Reserve Contract
                      </button>
                    ) : (
                      contract.buyer === user.id && (
                        <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle className="h-4 w-4" />
                          Reserved by You
                        </span>
                      )
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Razorpay Sandbox Payment Simulator for Bulk Orders */}
      {showPayModal && sandboxOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-2xl relative">
            <h3 className="text-lg font-bold mb-1">Razorpay Bulk Order Gateway Simulator</h3>
            <p className="text-xs text-slate-400 mb-6">Contract reference order verified in KisanConnect logistics.</p>

            <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 mb-6 space-y-3 text-xs">
              <div className="flex justify-between">
                <span>Order ID</span>
                <span className="font-semibold text-white">#{sandboxOrder.order.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Razorpay Reference</span>
                <span className="font-semibold text-white">{sandboxOrder.order.razorpay_order_id}</span>
              </div>
              <div className="border-t border-slate-800 my-2 pt-2 flex justify-between text-sm">
                <span className="font-bold text-slate-200">Wholesale Total</span>
                <span className="font-black text-amber-400 text-lg">₹{parseFloat(sandboxOrder.order.total_amount).toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleSimulatePayment(true)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all shadow-md"
              >
                Simulate Successful Bulk Payment
              </button>
              <button
                onClick={() => handleSimulatePayment(false)}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl transition-all shadow-md"
              >
                Simulate Cancelled
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkBuyerPortal;
