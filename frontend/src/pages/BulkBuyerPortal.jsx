import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { 
  ShoppingBag, Loader2, ArrowUpRight, DollarSign, 
  Handshake, AlertCircle, PlusCircle, CheckCircle, RefreshCw, Calendar, MapPin, Award,
  Layers, FileText
} from 'lucide-react';
import PaymentVerificationModal from '../components/PaymentVerificationModal';

const B2B_API = import.meta.env.VITE_B2B_API_URL || 'http://localhost:8001/api/v1/subscription';

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

const BulkBuyerPortal = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');
  
  // Tab control
  const [activeTab, setActiveTab] = useState(urlTab || 'dashboard');

  useEffect(() => {
    if (urlTab && ['dashboard', 'quotes', 'reverse', 'contracts', 'subscriptions'].includes(urlTab)) {
      setActiveTab(urlTab);
    } else if (!urlTab) {
      setActiveTab('dashboard');
    }
  }, [urlTab]);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setSearchParams({ tab: tabKey });
  };

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

  // Professional Payment Verification Screen State
  const [verificationModal, setVerificationModal] = useState({
    isOpen: false,
    status: 'verifying',
    orderId: null,
    paymentId: null,
    amount: 0,
    title: 'Wholesale Payment',
    description: '',
  });

  // Subscriptions State
  const [subscriptions, setSubscriptions] = useState([]);
  const [subCrop, setSubCrop] = useState('');
  const [subQty, setSubQty] = useState('');
  const [subPrice, setSubPrice] = useState('');
  const [subDays, setSubDays] = useState('Daily');
  const [submittingSub, setSubmittingSub] = useState(false);
  const [subError, setSubError] = useState('');

  const fetchSubscriptions = async () => {
    try {
      const res = await fetch(`${B2B_API}/list?buyer_id=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setSubscriptions(data);
      }
    } catch (err) {
      console.error('Failed to fetch subscriptions', err);
    }
  };

  const handleCreateSubscription = async (e) => {
    e.preventDefault();
    setSubmittingSub(true);
    setSubError('');

    const payload = {
      buyer_profile: {
        buyer_id: String(user.id),
        name: user.username || "B2B Buyer",
        delivery_address: "Registered Address"
      },
      schedule_matrix: {
        recurring_days: [subDays]
      },
      items_breakdown: [
        {
          commodity_name: subCrop,
          quantity: parseFloat(subQty),
          unit: "kg",
          price_per_unit: parseFloat(subPrice)
        }
      ]
    };

    try {
      const res = await fetch(`${B2B_API}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setSubCrop('');
        setSubQty('');
        setSubPrice('');
        alert('Recurring Subscription created successfully!');
        fetchSubscriptions();
      } else {
        setSubError('Failed to create subscription.');
      }
    } catch (err) {
      setSubError('Network error connecting to subscription engine.');
    } finally {
      setSubmittingSub(false);
    }
  };

  const handleToggleSubscription = async (subId, currentStatus) => {
    try {
      const res = await fetch(`${B2B_API}/toggle-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription_id: subId, active: !currentStatus })
      });
      if (res.ok) {
        fetchSubscriptions();
      }
    } catch (err) {
      alert('Failed to toggle subscription status');
    }
  };

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
      fetchSubscriptions();
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

  const verifyAndConfirmPayment = async (order, paymentResult, successCallback) => {
    setShowPayModal(false);
    setSandboxOrder(null);
    setVerificationModal({
      isOpen: true,
      status: 'verifying',
      orderId: order?.id,
      paymentId: paymentResult.razorpay_payment_id,
      amount: Number(order?.total_amount || 0),
      title: 'Confirming Wholesale Payment...',
      description: 'Verifying bank cryptographic signature and securing funds in escrow...',
    });

    try {
      await api.post('/orders/payment-callback/', {
        order_id: order?.id,
        razorpay_order_id: paymentResult.razorpay_order_id || order?.razorpay_order_id,
        razorpay_payment_id: paymentResult.razorpay_payment_id,
        razorpay_signature: paymentResult.razorpay_signature,
      });

      // Smooth delay so the user clearly sees the verification steps finish
      await new Promise(r => setTimeout(r, 900));

      setVerificationModal({
        isOpen: true,
        status: 'success',
        orderId: order?.id,
        paymentId: paymentResult.razorpay_payment_id,
        amount: Number(order?.total_amount || 0),
        title: 'Wholesale Payment Confirmed! 🎉',
        description: 'Payment secured in KisanConnect Escrow. Logistics shipment has been created and broadcast to regional transport partners.',
      });

      if (successCallback) successCallback();
      fetchPortalData();
    } catch (err) {
      setVerificationModal({
        isOpen: true,
        status: 'failed',
        orderId: order?.id,
        paymentId: paymentResult.razorpay_payment_id,
        amount: Number(order?.total_amount || 0),
        title: 'Verification Incomplete',
        description: 'We could not confirm the payment signature. If funds were debited, our logistics team will sync your order automatically.',
      });
    }
  };

  const handleInitiateBulkPayment = async (orderResponseData, customTitle, successCallback) => {
    const order = orderResponseData.order;
    const keyToUse = orderResponseData.razorpay_key || orderResponseData.razorpay_key_id || import.meta.env.VITE_RAZORPAY_KEY_ID;
    const rzpOrderId = orderResponseData.razorpay_order_id || order?.razorpay_order_id;
    const totalPaise = orderResponseData.amount || orderResponseData.amount_in_paise || Math.round(Number(order?.total_amount || 0) * 100);

    const scriptLoaded = await loadRazorpayScript();
    const isMock = !keyToUse || keyToUse.startsWith('rzp_test_KisanConnect') || !rzpOrderId || rzpOrderId.startsWith('rzp_mock_');

    if (scriptLoaded && window.Razorpay && !isMock) {
      const options = {
        key: keyToUse,
        amount: totalPaise,
        currency: orderResponseData.currency || 'INR',
        name: 'KisanConnect Wholesale',
        description: customTitle || `Wholesale Order #${order.id}`,
        order_id: rzpOrderId,
        theme: { color: '#064e3b' },
        prefill: {
          name: user?.username || user?.business_name || 'B2B Buyer',
          email: user?.email || '',
          contact: user?.phone || '',
        },
        handler: async (paymentResult) => {
          await verifyAndConfirmPayment(order, paymentResult, successCallback);
        },
      };
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        alert('Payment failed: ' + (resp.error?.description || 'Transaction declined.'));
      });
      rzp.open();
    } else {
      // Open sandbox modal for testing or fallback
      setSandboxOrder(orderResponseData);
      setShowPayModal(true);
    }
  };

  const handleAcceptCounter = async (quoteId) => {
    try {
      const response = await api.post(`/orders/quotes/${quoteId}/accept-offer/`);
      handleInitiateBulkPayment(response.data, 'Wholesale Single-Crop Bid Order', () => {
        fetchPortalData();
      });
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
      handleInitiateBulkPayment(response.data, 'Wholesale Reverse Sourcing Order', () => {
        fetchPortalData();
      });
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
    if (success) {
      const mockPayId = `pay_bulk_sim_${Math.random().toString(36).substr(2, 9)}`;
      await verifyAndConfirmPayment(sandboxOrder.order, {
        razorpay_order_id: sandboxOrder.razorpay_order_id || sandboxOrder.order?.razorpay_order_id,
        razorpay_payment_id: mockPayId,
        razorpay_signature: 'mock_signature'
      });
    } else {
      setShowPayModal(false);
      setSandboxOrder(null);
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
    <div className="flex-1 w-full min-w-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8 space-y-8 overflow-y-auto">
      
      {/* Header and Refresh */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">
            {activeTab === 'dashboard' && 'Bulk Buyer Dashboard'}
            {activeTab === 'quotes' && 'Single Crop Bids & Negotiations'}
            {activeTab === 'reverse' && 'Reverse Sourcing Demands'}
            {activeTab === 'contracts' && 'Pre-Harvest Forward Contracts'}
            {activeTab === 'subscriptions' && 'Recurring Produce Subscriptions'}
          </h1>
          <p className="text-sm text-slate-500">
            {activeTab === 'dashboard' && 'Manage crop bids, submit reverse sourcing tenders, monitor forward contracts, and track subscriptions.'}
            {activeTab === 'quotes' && 'Submit and negotiate direct wholesale crop pricing with regional farmers & FPOs.'}
            {activeTab === 'reverse' && 'Publish customized procurement specs for verified regional growers to quote.'}
            {activeTab === 'contracts' && 'Lock guaranteed yield commitments before harvest with fixed price protections.'}
            {activeTab === 'subscriptions' && 'Automate recurring deliveries with custom delivery cycles and volume discounts.'}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {activeTab !== 'dashboard' && (
            <button
              onClick={() => handleTabChange('dashboard')}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 px-3.5 py-2.5 rounded-xl transition-all border border-slate-200 shadow-2xs cursor-pointer"
            >
              ← Back to Overview
            </button>
          )}
          <button
            onClick={fetchPortalData}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 px-4 py-2.5 rounded-xl transition-all shadow-xs border border-emerald-100 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Sync Data
          </button>
        </div>
      </div>

      {/* Tab: Dashboard Overview */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8">
          
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-[#064e3b] via-emerald-800 to-teal-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="text-xs font-black uppercase tracking-widest text-emerald-300 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-700/50">
                B2B Procurement Hub
              </span>
              <h2 className="text-2xl sm:text-3xl font-black">Welcome back, {user?.username || 'Wholesaler'} 👋</h2>
              <p className="text-emerald-100/90 text-xs sm:text-sm max-w-xl">
                Manage your active single-crop bids, post custom reverse sourcing requirements, lock pre-harvest forward contracts, and automate recurring deliveries.
              </p>
            </div>
            <button
              onClick={() => handleTabChange('reverse')}
              className="bg-[#059669] hover:bg-emerald-500 text-white font-extrabold text-xs px-5 py-3 rounded-2xl shadow-lg shadow-emerald-950/40 transition-all cursor-pointer shrink-0 active:scale-95 flex items-center gap-2"
            >
              <PlusCircle className="h-4 w-4" /> Post New Requirement
            </button>
          </div>

          {/* Quick Shortcuts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Recent Bids Summary */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                  <Handshake className="h-4 w-4 text-emerald-600" />
                  Recent Active Bids
                </h4>
                <button
                  onClick={() => handleTabChange('quotes')}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                >
                  View All ({quotes.length}) →
                </button>
              </div>

              {quotes.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No active single-crop bids placed yet.</p>
              ) : (
                <div className="space-y-3">
                  {quotes.slice(0, 3).map(q => (
                    <div key={q.id} className="p-3 bg-slate-50 rounded-2xl flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-slate-800 block">{q.product_details?.name || 'Crop Listing'}</span>
                        <span className="text-slate-500 text-[11px]">{q.quantity} Quintals • Target: ₹{q.target_price}</span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold capitalize ${
                        q.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' :
                        q.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {q.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Requirements Summary */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-teal-600" />
                  Active Sourcing Requirements
                </h4>
                <button
                  onClick={() => handleTabChange('reverse')}
                  className="text-xs font-bold text-teal-600 hover:text-teal-700 cursor-pointer"
                >
                  View All ({requirements.length}) →
                </button>
              </div>

              {requirements.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No active sourcing requirements posted yet.</p>
              ) : (
                <div className="space-y-3">
                  {requirements.slice(0, 3).map(r => (
                    <div key={r.id} className="p-3 bg-slate-50 rounded-2xl flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-slate-800 block">{r.crop_name} ({r.variety || 'Standard'})</span>
                        <span className="text-slate-500 text-[11px]">{r.target_quantity} {r.unit} • Grade {r.grade}</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-teal-100 text-teal-800 capitalize">
                        {r.status || 'Active'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* Tab: Quote Negotiations */}
      {activeTab === 'quotes' && (
        <div className="space-y-6">
          {/* Quote Request Form */}
          <div className="w-full bg-white border border-slate-100 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600">Wholesale Channel</p>
              <h3 className="font-black text-xl text-slate-800 mt-1">Negotiate Specific Listing</h3>
              <p className="text-sm text-slate-500 mt-1">Submit wholesale bids directly to FPOs and independent regional farmers.</p>
            </div>

            {quoteError && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-700 font-semibold">
                {quoteError}
              </div>
            )}

            <form onSubmit={handleSubmitQuote} className="space-y-5 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Select Crop Yield</label>
                  <select
                    value={selectedProdId}
                    onChange={(e) => setSelectedProdId(e.target.value)}
                    className="w-full px-3.5 py-3 border border-slate-200 rounded-2xl bg-white text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs transition-all"
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Stock: {p.quantity} {p.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Target Quantity</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g. 500"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full px-3.5 py-3 border border-slate-200 rounded-2xl bg-white text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs transition-all"
                    />
                    <span className="bg-slate-50 border border-slate-200 text-slate-600 font-bold px-4 py-3 rounded-2xl flex items-center justify-center uppercase text-xs shrink-0">
                      {getSelectedProductDetails()?.unit || 'Units'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Target Bid Price (per unit)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 font-bold text-sm">₹</div>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g. 20.00"
                      value={targetPrice}
                      onChange={(e) => setTargetPrice(e.target.value)}
                      className="w-full pl-8 pr-3.5 py-3 border border-slate-200 rounded-2xl bg-white text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs transition-all"
                    />
                  </div>
                </div>
              </div>

              {selectedProdId && getSelectedProductDetails() && (
                <div className="bg-emerald-50/70 rounded-2xl p-4 border border-emerald-100/80 flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs gap-2">
                  <div>
                    <span className="font-extrabold text-[10px] uppercase tracking-wider text-emerald-800 block">Listing Price Reference</span>
                    <p className="font-bold text-slate-800 text-sm mt-0.5">₹{parseFloat(getSelectedProductDetails().price_per_unit).toFixed(2)} per {getSelectedProductDetails().unit}</p>
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-emerald-200 text-emerald-800 font-bold text-xs shadow-2xs">
                      👨‍🌾 {getSelectedProductDetails().farmer_details?.username || 'Verified Farmer'} ({getSelectedProductDetails().farmer_details?.district || 'Regional'})
                    </span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submittingQuote}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm py-3.5 px-6 rounded-2xl shadow-md shadow-emerald-950/20 hover:shadow-lg hover:shadow-emerald-950/30 transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
              >
                {submittingQuote ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                  <>
                    <Handshake className="h-5 w-5" />
                    <span>Initiate Negotiation</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Negotiation Log Table */}
          <div className="w-full bg-white border border-slate-100 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-600">Negotiation Portfolio</p>
              <h3 className="font-black text-xl text-slate-800 mt-1">Negotiation Log</h3>
              <p className="text-sm text-slate-500 mt-1">Review active, countered, or completed negotiations.</p>
            </div>

            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-3">Crop Listing</th>
                    <th className="py-3.5 px-3">Requested Qty</th>
                    <th className="py-3.5 px-3">Your Bid</th>
                    <th className="py-3.5 px-3">Farmer Counter</th>
                    <th className="py-3.5 px-3">Status</th>
                    <th className="py-3.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quotes.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-10 text-center text-slate-400 font-medium">No active quote negotiations.</td>
                    </tr>
                  ) : (
                    quotes.map((q) => (
                      <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-3 font-bold text-slate-800 text-sm">{q.product_details?.name}</td>
                        <td className="py-4 px-3 font-semibold text-slate-600">{q.quantity} {q.product_details?.unit}</td>
                        <td className="py-4 px-3 font-bold text-slate-900 text-sm">₹{parseFloat(q.target_price).toFixed(2)}</td>
                        <td className="py-4 px-3">
                          {q.offered_price ? (
                            <div>
                              <span className="font-bold text-emerald-800 text-sm">₹{parseFloat(q.offered_price).toFixed(2)}</span>
                              <div className="mt-1 space-y-1">
                                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                                  🌾 1 Farmer Pledged 100 {q.product_details?.unit || 'kg'}
                                </span>
                                <span className="block text-[11px] text-amber-700 font-semibold">
                                  ⏳ Waiting for 2 more farmers ({Math.max(0, parseFloat(q.quantity) - 100).toFixed(0)} {q.product_details?.unit || 'kg'} remaining)
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <span className="text-slate-400 font-bold">—</span>
                              <span className="block text-[11px] text-slate-400 italic mt-0.5">Awaiting 3 farmer pool</span>
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase inline-flex items-center gap-1.5 ${
                            q.status === 'accepted' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                            q.status === 'rejected' ? 'bg-rose-50 border-rose-200 text-rose-800' :
                            q.status === 'offered' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                            'bg-blue-50 border-blue-200 text-blue-800'
                          }`}>
                            {q.status === 'offered' ? '1 Offer (Waiting for 2)' : q.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-4 px-3 text-right">
                          {q.status === 'offered' && (
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleAcceptCounter(q.id)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3.5 py-1.5 rounded-xl text-xs shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleRejectOffer(q.id)}
                                className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold px-3.5 py-1.5 rounded-xl text-xs border border-rose-200 transition-all cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                          {q.status === 'accepted' && (
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 inline-flex items-center gap-1">
                              <CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> Contract Locked
                            </span>
                          )}
                          {q.status === 'pending' && (
                            <span className="text-xs text-slate-400 font-medium italic">Awaiting Farmer</span>
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
        <div className="space-y-6">
          
          {/* Post Bulk Requirement Form */}
          <div className="w-full bg-white border border-slate-100 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-teal-600">Reverse Sourcing Channel</p>
              <h3 className="font-black text-xl text-slate-800 mt-1">Post Bulk Sourcing Order</h3>
              <p className="text-sm text-slate-500 mt-1">Submit large buying requirements. Multiple verified regional farmers can contribute to fulfill the pool.</p>
            </div>

            {reqError && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-700 font-semibold">
                {reqError}
              </div>
            )}

            <form onSubmit={handleSubmitRequirement} className="space-y-5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Crop Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tomato"
                    value={reqCrop}
                    onChange={(e) => setReqCrop(e.target.value)}
                    className="w-full px-3.5 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-sm font-medium text-slate-800 shadow-2xs transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Variety / Grade</label>
                  <input
                    type="text"
                    placeholder="e.g. Hybrid / A Grade"
                    value={reqVariety}
                    onChange={(e) => setReqVariety(e.target.value)}
                    className="w-full px-3.5 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-sm font-medium text-slate-800 shadow-2xs transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Req. Quantity</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 1000"
                    value={reqQty}
                    onChange={(e) => setReqQty(e.target.value)}
                    className="w-full px-3.5 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-sm font-medium text-slate-800 shadow-2xs transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Unit</label>
                  <select
                    value={reqUnit}
                    onChange={(e) => setReqUnit(e.target.value)}
                    className="w-full px-3.5 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-sm font-medium text-slate-800 shadow-2xs transition-all"
                  >
                    <option value="kg">Kilogram (kg)</option>
                    <option value="quintal">Quintal (100 kg)</option>
                    <option value="ton">Ton</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Min Price (₹/unit)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 18"
                    value={reqPriceMin}
                    onChange={(e) => setReqPriceMin(e.target.value)}
                    className="w-full px-3.5 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-sm font-medium text-slate-800 shadow-2xs transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Max Price (₹/unit)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 25"
                    value={reqPriceMax}
                    onChange={(e) => setReqPriceMax(e.target.value)}
                    className="w-full px-3.5 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-sm font-medium text-slate-800 shadow-2xs transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Required Date</label>
                  <input
                    type="date"
                    required
                    value={reqDate}
                    onChange={(e) => setReqDate(e.target.value)}
                    className="w-full px-3.5 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-sm font-medium text-slate-800 shadow-2xs transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Delivery Location</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. APMC Mandi, Pune"
                    value={reqLocation}
                    onChange={(e) => setReqLocation(e.target.value)}
                    className="w-full px-3.5 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-sm font-medium text-slate-800 shadow-2xs transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingReq}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm py-3.5 px-6 rounded-2xl shadow-md shadow-emerald-950/20 hover:shadow-lg hover:shadow-emerald-950/30 transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
              >
                {submittingReq ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                  <>
                    <PlusCircle className="h-5 w-5" />
                    <span>Publish Requirement</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Active Sourcing Requirements & Submissions */}
          <div className="w-full space-y-6">
            <div>
              <h3 className="font-bold text-base text-slate-800">Your Active Buying Pools</h3>
              <p className="text-xs text-slate-500">Track farmer contributions and offers submitted to fulfill your listings.</p>
            </div>

            {requirements.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-3xl p-8 text-center text-slate-400 text-xs">
                You have not published any sourcing requirements.
              </div>
            ) : (
              requirements.map(req => {
                const totalTarget = parseFloat(req.quantity) || 0;
                const totalOffered = (req.offers || []).reduce((sum, o) => sum + (parseFloat(o.quantity) || 0), 0);
                const remainingQty = Math.max(0, totalTarget - totalOffered);
                const progressPct = Math.min(100, Math.round((totalOffered / (totalTarget || 1)) * 100));

                return (
                  <div key={req.id} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-4">
                    <div className="flex flex-wrap justify-between items-start gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-800 text-base">{req.crop_name}</h4>
                          <span className="text-xs text-slate-500 font-medium">({req.variety || 'Standard'})</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Delivery: <strong className="text-slate-700">{req.location}</strong> | Needed by: <strong className="text-slate-700">{req.required_date}</strong>
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                        req.status === 'fulfilled' || remainingQty === 0
                          ? 'bg-emerald-100 text-emerald-800' 
                          : totalOffered > 0
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                      }`}>
                        {req.status === 'fulfilled' || remainingQty === 0 ? 'Fully Pooled' : totalOffered > 0 ? `${req.offers.length} Offer Received` : 'Awaiting Offers'}
                      </span>
                    </div>

                    {/* Smart Aggregation Pool Status Bar */}
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5">
                          <Handshake className="h-4 w-4 text-emerald-600" />
                          Order Aggregation Progress
                        </span>
                        <span className="font-extrabold text-emerald-700 text-xs">
                          {progressPct}% Pooled
                        </span>
                      </div>

                      {/* Visual Progress Bar */}
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-emerald-500 to-green-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>

                      {/* 3 Metric Pills: Target, Fulfilled/Offered, Remaining */}
                      <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                        <div className="bg-white rounded-xl p-2 border border-slate-100 shadow-2xs">
                          <span className="text-[10px] text-slate-400 block font-semibold">Total Target</span>
                          <span className="text-xs font-bold text-slate-800">{totalTarget} {req.unit}</span>
                        </div>
                        <div className="bg-emerald-50/70 rounded-xl p-2 border border-emerald-100 shadow-2xs">
                          <span className="text-[10px] text-emerald-700 block font-semibold">Pledged / Offered</span>
                          <span className="text-xs font-extrabold text-emerald-800">{totalOffered} {req.unit}</span>
                        </div>
                        <div className={`rounded-xl p-2 border shadow-2xs ${
                          remainingQty === 0 
                            ? 'bg-emerald-100/60 border-emerald-200 text-emerald-900' 
                            : 'bg-amber-50/70 border-amber-100 text-amber-900'
                        }`}>
                          <span className="text-[10px] opacity-75 block font-semibold">Remaining Needed</span>
                          <span className="text-xs font-extrabold">{remainingQty} {req.unit}</span>
                        </div>
                      </div>
                    </div>

                    {/* Farmer Offers List */}
                    <div className="border-t border-slate-100 pt-3">
                      <div className="flex justify-between items-center mb-2">
                        <h5 className="font-bold text-slate-700 text-xs">Farmer Offers & Sourcing Contributions ({req.offers?.length || 0})</h5>
                        <span className="text-[10px] text-slate-400">Budget: ₹{req.target_price_min} - ₹{req.target_price_max}/{req.unit}</span>
                      </div>
                      {req.offers && req.offers.length > 0 ? (
                        <div className="space-y-2">
                          {req.offers.map(offer => (
                            <div key={offer.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-slate-800">🌾 {offer.farmer_username}</p>
                                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    Contributes {offer.quantity} {req.unit}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1">
                                  Offered Price: <strong className="text-slate-800">₹{offer.price_per_unit}/{req.unit}</strong> | Delivery: <strong className="text-slate-800">{offer.delivery_date}</strong>
                                </p>
                                {offer.notes && <p className="text-[10px] italic text-slate-400 mt-0.5">Notes: "{offer.notes}"</p>}
                              </div>
                              <div className="flex items-center gap-2">
                                {offer.status === 'pending' ? (
                                  <>
                                    <button
                                      onClick={() => handleAcceptFarmerOffer(offer.id)}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs shadow-xs transition"
                                    >
                                      Accept & Lock Qty
                                    </button>
                                    <button
                                      onClick={() => handleRejectFarmerOffer(offer.id)}
                                      className="bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-600 font-semibold px-3 py-1.5 rounded-xl text-xs transition"
                                    >
                                      Reject
                                    </button>
                                  </>
                                ) : (
                                  <span className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider ${
                                    offer.status === 'accepted' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-200 text-slate-700'
                                  }`}>
                                    {offer.status === 'accepted' ? '✓ Accepted & Allocated' : offer.status}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic py-2">No offers received from nearby farmers yet.</p>
                      )}
                    </div>
                  </div>
                );
              })
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

                  <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase ${
                      contract.status === 'accepted' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-blue-50 border-blue-200 text-blue-800'
                    }`}>
                      {contract.status === 'accepted' ? 'Reserved' : 'Available'}
                    </span>
                    
                    {contract.status === 'proposed' ? (
                      <button
                        onClick={() => handleReserveContract(contract.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                      >
                        Reserve Contract
                      </button>
                    ) : (
                      contract.buyer === user?.id && (
                        <span className="text-xs text-emerald-700 font-bold flex items-center gap-1.5 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-100">
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
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

      {/* Tab: Recurring Subscriptions */}
      {activeTab === 'subscriptions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-white border border-slate-100 rounded-3xl p-6 sm:p-7 shadow-xs h-fit space-y-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-600">Automated Procurement</p>
              <h3 className="font-black text-xl text-slate-800 mt-1">New Subscription</h3>
              <p className="text-sm text-slate-500 mt-1">Setup automated recurring orders for your business.</p>
            </div>
            
            {subError && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-700 font-semibold">
                {subError}
              </div>
            )}

            <form onSubmit={handleCreateSubscription} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Produce Name</label>
                <input required type="text" value={subCrop} onChange={e => setSubCrop(e.target.value)} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs transition-all" placeholder="e.g. Tomatoes" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Quantity (kg)</label>
                  <input required type="number" min="1" value={subQty} onChange={e => setSubQty(e.target.value)} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Est. Price/kg</label>
                  <input required type="number" min="1" value={subPrice} onChange={e => setSubPrice(e.target.value)} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Schedule</label>
                <select value={subDays} onChange={e => setSubDays(e.target.value)} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs transition-all">
                  <option value="Daily">Daily</option>
                  <option value="Monday">Every Monday</option>
                  <option value="Tuesday">Every Tuesday</option>
                  <option value="Wednesday">Every Wednesday</option>
                  <option value="Thursday">Every Thursday</option>
                  <option value="Friday">Every Friday</option>
                  <option value="Saturday">Every Saturday</option>
                  <option value="Sunday">Every Sunday</option>
                </select>
              </div>
              <button disabled={submittingSub} type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm py-3.5 px-6 rounded-2xl shadow-md shadow-emerald-950/20 hover:shadow-lg transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer">
                {submittingSub ? 'Setting up...' : 'Create Subscription'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {subscriptions.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center text-slate-400">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No active recurring subscriptions found.</p>
              </div>
            ) : (
              subscriptions.map(sub => (
                <div key={sub.subscription_id} className={`bg-white rounded-3xl border ${sub.is_active ? 'border-emerald-200' : 'border-slate-200'} p-5 shadow-xs flex justify-between items-center`}>
                  <div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sub.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {sub.is_active ? 'ACTIVE' : 'PAUSED'}
                    </span>
                    <h4 className="font-bold text-lg text-slate-800 mt-2">
                      {sub.items_breakdown[0].quantity} {sub.items_breakdown[0].unit} {sub.items_breakdown[0].commodity_name}
                    </h4>
                    <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {sub.schedule_matrix.recurring_days.join(', ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-slate-800">
                      ₹{sub.billing_summary.weekly_estimate.toFixed(2)} <span className="text-[10px] text-slate-400 font-medium">/ week</span>
                    </div>
                    {sub.billing_summary.discount_applied_pct > 0 && (
                      <div className="text-[10px] text-emerald-600 font-bold mb-2">10% Volume Discount Applied!</div>
                    )}
                    <button 
                      onClick={() => handleToggleSubscription(sub.subscription_id, sub.is_active)}
                      className={`text-xs font-bold px-4 py-1.5 rounded-lg border ${sub.is_active ? 'border-rose-200 text-rose-600 hover:bg-rose-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}
                    >
                      {sub.is_active ? 'Pause Schedule' : 'Resume Schedule'}
                    </button>
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
            <button
              onClick={() => { setShowPayModal(false); setSandboxOrder(null); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition cursor-pointer"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold mb-1">Razorpay Bulk Order Gateway Simulator</h3>
            <p className="text-xs text-slate-400 mb-6">Contract reference order verified in KisanConnect logistics.</p>

            <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 mb-6 space-y-3 text-xs">
              <div className="flex justify-between">
                <span>Order ID</span>
                <span className="font-semibold text-white">#{sandboxOrder.order?.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Razorpay Reference</span>
                <span className="font-semibold text-white">{sandboxOrder.razorpay_order_id || sandboxOrder.order?.razorpay_order_id}</span>
              </div>
              <div className="border-t border-slate-800 my-2 pt-2 flex justify-between text-sm">
                <span className="font-bold text-slate-200">Wholesale Total</span>
                <span className="font-black text-amber-400 text-lg">₹{parseFloat(sandboxOrder.order?.total_amount || 0).toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleSimulatePayment(true)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all shadow-md cursor-pointer"
              >
                Simulate Successful Bulk Payment
              </button>
              <button
                onClick={() => handleSimulatePayment(false)}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl transition-all shadow-md cursor-pointer"
              >
                Simulate Cancelled
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Professional Payment Verification Screen Modal */}
      <PaymentVerificationModal
        isOpen={verificationModal.isOpen}
        status={verificationModal.status}
        orderId={verificationModal.orderId}
        paymentId={verificationModal.paymentId}
        amount={verificationModal.amount}
        title={verificationModal.title}
        description={verificationModal.description}
        onClose={() => setVerificationModal(prev => ({ ...prev, isOpen: false }))}
        actionLabel="View Dashboard & Logistics"
        onAction={() => {
          setVerificationModal(prev => ({ ...prev, isOpen: false }));
          handleTabChange('dashboard');
        }}
      />
    </div>
  );
};

export default BulkBuyerPortal;
