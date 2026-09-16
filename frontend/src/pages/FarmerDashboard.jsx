import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import DemandForecastingChart from '../components/DemandForecastingChart';
import Stepper from '../components/Stepper';
import MarketMap from '../components/MarketMap';
import MarketDetailPanel from '../components/MarketDetailPanel';
import NearestMandiExplorer from '../components/NearestMandiExplorer';
import SubscriptionWidget from '../components/SubscriptionWidget';
import { 
  Plus, Loader2, Calendar, FileCheck, Package, ShoppingBag, 
  DollarSign, RefreshCcw, Handshake, MapPin, PlusCircle, CheckCircle, Info, Award, Route, ChevronDown, ChevronUp, User
} from 'lucide-react';
import DeliveryMap from '../components/DeliveryMap';
import RouteInfoPanel from '../components/RouteInfoPanel';
import FarmerProfileSection from '../components/FarmerProfileSection';

// ─── Skeleton Loaders ─────────────────────────────────────────────────────────
const StatsSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 animate-pulse">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xs flex items-center gap-4">
        <div className="h-12 w-12 bg-slate-200 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <div className="h-6 bg-slate-200 rounded w-3/4" />
          <div className="h-3 bg-slate-200 rounded w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

const ChartSkeleton = () => (
  <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xs animate-pulse space-y-4">
    <div className="h-6 bg-slate-200 rounded w-1/4" />
    <div className="h-48 bg-slate-100 rounded-2xl" />
  </div>
);

const TableSkeleton = () => (
  <div className="animate-pulse space-y-3">
    <div className="h-10 bg-slate-100 rounded-lg" />
    {[...Array(5)].map((_, i) => (
      <div key={i} className="h-12 bg-slate-50 rounded-lg" />
    ))}
  </div>
);

const OrdersListSkeleton = () => (
  <div className="animate-pulse space-y-6">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="border border-slate-100 rounded-3xl p-5 space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div className="h-4 bg-slate-200 rounded w-1/3" />
          <div className="h-6 bg-slate-200 rounded w-20" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-16 bg-slate-100 rounded-xl" />
          <div className="h-16 bg-slate-100 rounded-xl" />
          <div className="h-16 bg-slate-100 rounded-xl" />
        </div>
      </div>
    ))}
  </div>
);

const getFreshnessMeta = (value) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return {
      label: 'Cold Storage',
      badgeClass: 'bg-blue-100 text-blue-800',
      note: 'Freshness paused while stored',
      alert: false,
      score: null,
    };
  }

  if (numericValue >= 70) {
    return {
      label: 'Fresh',
      badgeClass: 'bg-emerald-100 text-emerald-800',
      note: 'Ready for sale',
      alert: false,
      score: numericValue,
    };
  }

  if (numericValue >= 40) {
    return {
      label: 'Standard',
      badgeClass: 'bg-amber-100 text-amber-800',
      note: 'Monitor stock timing',
      alert: numericValue <= 75,
      score: numericValue,
    };
  }

  return {
    label: 'Low Freshness',
    badgeClass: 'bg-rose-100 text-rose-800',
    note: 'Review price soon',
    alert: true,
    score: numericValue,
  };
};

const FarmerDashboard = () => {
  const { user, submitKyc } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [transportPartners, setTransportPartners] = useState([]);
  const [transportPartnersByShipment, setTransportPartnersByShipment] = useState({});
  const [transportShipments, setTransportShipments] = useState([]);
  const [transportOffers, setTransportOffers] = useState([]);
  const [selectedTransportPartner, setSelectedTransportPartner] = useState({});

  const handleTabChange = (section) => {
    setActiveSection(section);
    navigate(`#${section}`, { replace: true });
  };
  
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
  const [farmerProfile, setFarmerProfile] = useState(null);

  // Route tracking states
  const [orderRoutes, setOrderRoutes] = useState({});
  const [expandedRoutes, setExpandedRoutes] = useState({});
  const [routeLoadingOrder, setRouteLoadingOrder] = useState({});
  const [selectedCandidatePerOrder, setSelectedCandidatePerOrder] = useState({});

  const toggleOrderRoute = async (orderId) => {
    const isExpanded = !!expandedRoutes[orderId];
    setExpandedRoutes(prev => ({ ...prev, [orderId]: !isExpanded }));

    if (!isExpanded && !orderRoutes[orderId]) {
      setRouteLoadingOrder(prev => ({ ...prev, [orderId]: true }));
      try {
        const shipmentRes = await api.get('/logistics/shipments/');
        const shipment = shipmentRes.data.find(s => s.order === orderId);
        if (shipment) {
          const routeRes = await api.get(`/route-planning/farmer/shipments/${shipment.id}/route/`);
          setOrderRoutes(prev => ({ ...prev, [orderId]: routeRes.data }));
        } else {
          setOrderRoutes(prev => ({ ...prev, [orderId]: { error: 'No shipment generated for this order yet.' } }));
        }
      } catch (err) {
        console.error('Farmer route fetch error:', err);
        setOrderRoutes(prev => ({ ...prev, [orderId]: { error: 'Failed to load transportation route.' } }));
      } finally {
        setRouteLoadingOrder(prev => ({ ...prev, [orderId]: false }));
      }
    }
  };
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Tab Control
  const [activeSection, setActiveSection] = useState('overview');

  // Add listing state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  
  // Form states for adding product
  const [pName, setPName] = useState('');
  const [pCategory, setPCategory] = useState('vegetables');
  const [pQuantity, setPQuantity] = useState('');
  const [pUnit, setPUnit] = useState('kg');
  const [pPrice, setPPrice] = useState('');
  const [pHarvest, setPHarvest] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pImage, setPImage] = useState('');
  const [pColdStorage, setPColdStorage] = useState(false);
  const [pSourceLand, setPSourceLand] = useState('');

  // Form states for counter offering quote
  const [counterPrices, setCounterPrices] = useState({});
  const [dismissedZeroFreshness, setDismissedZeroFreshness] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`freshness-alerts-read-${user?.id}`) || '[]');
    } catch {
      return [];
    }
  });

  // Form states for submitting offer to bulk requirement
  const [offerReqId, setOfferReqId] = useState(null);
  const [offerQty, setOfferQty] = useState('');
  const [offerPrice, setOfferPrice] = useState('');
  const [offerDate, setOfferDate] = useState('');
  const [offerNotes, setOfferNotes] = useState('');
  const [offerError, setOfferError] = useState('');
  const [offerSuccess, setOfferSuccess] = useState('');
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
      const [statsRes, listingsRes, ordersRes, quotesRes, bulkRes, myOffersRes, contractRes, marketsRes, profileRes] = await Promise.all([
        api.get('/farmer/stats/'),
        api.get(`/products/?farmer=${user.id}`),
        api.get('/orders/'),
        api.get('/orders/quotes/'),
        api.get('/orders/bulk-requirements/'),
        api.get('/orders/farmer-offers/'),
        api.get('/orders/pre-harvest-contracts/'),
        api.get('/market-prices/markets/'),
        api.get('/v1/farmer/profile/')
      ]);
      setStats(statsRes.data);
      setListings(listingsRes.data);
      setOrders(ordersRes.data);
      setQuotes(quotesRes.data);
      setBulkReqs(bulkRes.data);
      setMyOffers(myOffersRes.data);
      setPreHarvestContracts(contractRes.data);
      setMarkets(marketsRes.data);
      setFarmerProfile(profileRes.data);
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

  const fetchTransportOptions = async () => {
    try {
      const [shipmentsRes, offersRes] = await Promise.all([
        api.get('/logistics/shipments/'),
        api.get('/logistics/transport-offers/')
      ]);
      const unassignedShipments = shipmentsRes.data.filter(shipment => !shipment.partner && shipment.status !== 'delivered');
      const partnerResults = await Promise.all(
        unassignedShipments.map(async shipment => [
          shipment.id,
          (await api.get(`/logistics/partners/?shipment=${shipment.id}`)).data
        ])
      );
      setTransportShipments(unassignedShipments);
      setTransportPartnersByShipment(Object.fromEntries(partnerResults));
      setTransportPartners([...new Map(partnerResults.flatMap(([, partners]) => partners).map(partner => [partner.id, partner])).values()]);
      setTransportOffers(offersRes.data);
    } catch (err) {
      console.error('Transport options fetch error:', err);
    }
  };

  useEffect(() => {
    if (user && ['orders', 'quotes'].includes(activeSection)) {
      fetchTransportOptions();
    }
  }, [user, activeSection]);

  // Listen for hash changes to switch tabs
  useEffect(() => {
    const validSections = ['overview', 'profile', 'inventory', 'orders', 'quotes', 'sourcing', 'contracts', 'markets'];
    if (location.hash) {
      const hashSection = location.hash.replace('#', '');
      if (validSections.includes(hashSection)) {
        setActiveSection(hashSection);
      }
    }
  }, [location.hash]);

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
      description: pDesc,
      image_url: pImage,
      stored_in_cold_storage: pColdStorage,
      source_land: pSourceLand
    };

    try {
      const response = editingProduct
        ? await api.patch(`/products/${editingProduct.id}/`, payload)
        : await api.post('/products/', payload);
      setListings(editingProduct
        ? listings.map((item) => item.id === editingProduct.id ? response.data : item)
        : [response.data, ...listings]);
      setShowAddModal(false);
      setEditingProduct(null);
      // Reset form
      setPName('');
      setPQuantity('');
      setPPrice('');
      setPHarvest('');
      setPDesc('');
      setPImage('');
      setPColdStorage(false);
      setPSourceLand('');
      fetchDashboardData(); // update stats
    } catch (err) {
      setAddError(err.response?.data?.non_field_errors?.[0] || 'Failed to add product. Verify inputs.');
    } finally {
      setAddLoading(false);
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setPName(product.name || '');
    setPCategory(product.category || 'vegetables');
    setPQuantity(product.quantity || '');
    setPUnit(product.unit || 'kg');
    setPPrice(product.price_per_unit || '');
    setPHarvest(product.harvest_date || '');
    setPDesc(product.description || '');
    setPImage(product.image_url || '');
    setPColdStorage(Boolean(product.stored_in_cold_storage));
    setPSourceLand(product.source_land || '');
    setShowAddModal(true);
  };

  const handleMarkFreshnessAlertRead = (productId) => {
    setDismissedZeroFreshness((prev) => {
      const next = prev.includes(productId) ? prev : [...prev, productId];
      localStorage.setItem(`freshness-alerts-read-${user?.id}`, JSON.stringify(next));
      return next;
    });
  };

  const activeListings = listings.filter((item) => {
    const isZeroFreshness = !item.stored_in_cold_storage && Number(item.freshness_percentage ?? 100) === 0;
    return !isZeroFreshness;
  });

  const zeroFreshnessAlerts = listings.filter((item) => {
    const isZeroFreshness = !item.stored_in_cold_storage && Number(item.freshness_percentage ?? 100) === 0;
    return isZeroFreshness && !dismissedZeroFreshness.includes(item.id);
  });

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await api.patch(`/orders/${orderId}/status/`, { status: newStatus });
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: response.data.status } : o));
      fetchDashboardData();
    } catch (err) {
      if (err.response?.status === 409) {
        fetchDashboardData();
      }
      alert(err.response?.data?.error || 'Error updating order status');
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

  const handleOfferTransport = async (shipmentId) => {
    const partnerId = selectedTransportPartner[shipmentId];
    if (!partnerId) {
      alert('Select a transport driver first.');
      return;
    }
    try {
      await api.post('/logistics/transport-offers/', {
        shipment: shipmentId,
        partner: partnerId,
        message: 'Please accept this delivery ride offer for my order.'
      });
      alert('Ride offer sent to the selected driver.');
      fetchTransportOptions();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send transport offer.');
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
    setOfferError('');
    setOfferSuccess('');
  };

  const handleSubmitSourcingOffer = async (e) => {
    e.preventDefault();
    if (!offerReqId) return;
    setOfferError('');
    setOfferSuccess('');

    const requirement = bulkReqs.find((req) => req.id === offerReqId);
    const requestedQuantity = Number(offerQty);
    const matchingProducts = listings.filter((product) => {
      const productName = (product.name || '').toLowerCase();
      const cropName = (requirement?.crop_name || '').toLowerCase();
      return product.quantity > 0 && (productName.includes(cropName) || cropName.includes(productName));
    });
    const availableQuantity = matchingProducts.reduce((sum, product) => sum + Number(product.quantity || 0), 0);
    const alreadyOffered = (requirement?.offers || []).reduce((sum, offer) => sum + Number(offer.quantity || 0), 0);
    const remainingQuantity = Math.max(0, Number(requirement?.quantity || 0) - alreadyOffered);

    if (!Number.isFinite(requestedQuantity) || requestedQuantity <= 0) {
      setOfferError('Enter a quantity greater than zero.');
      return;
    }
    if (requestedQuantity > availableQuantity) {
      setOfferError(`You have only ${availableQuantity} ${matchingProducts[0]?.unit || 'units'} of matching inventory available.`);
      return;
    }
    if (requestedQuantity > remainingQuantity) {
      setOfferError(`This demand needs only ${remainingQuantity} ${requirement?.unit || 'units'} more.`);
      return;
    }

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
      setOfferQty('');
      setOfferPrice('');
      setOfferDate('');
      setOfferNotes('');
      setOfferReqId(null);
      setOfferSuccess('Offer submitted successfully. The wholesaler can now review it.');
      fetchDashboardData();
    } catch (err) {
      setOfferError(err.response?.data?.error || 'Failed to submit sourcing offer.');
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



  return (
    <div className="flex-1 w-full min-w-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8 space-y-8 overflow-y-auto">
        
        {/* Header and Refresh */}
        {activeSection === 'overview' && (
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
        )}

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

      {/* Profile Section */}
      {activeSection === 'profile' && (
        <div className="animate-fade-in">
          <FarmerProfileSection />
        </div>
      )}

      {/* Overview Section */}
      {activeSection === 'overview' && (
        <div className="space-y-8 animate-fade-in">
          {/* Stats Summary Row */}
          {loading ? (
            <StatsSkeleton />
          ) : stats ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xs flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
                  <DollarSign className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-slate-900">₹{stats.total_earnings.toFixed(2)}</div>
                  <div className="text-[15px] text-slate-600 font-semibold">Delivered Earnings</div>
                </div>
              </div>
              
              <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xs flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-amber-50 text-amber-600">
                  <ShoppingBag className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-slate-900">{stats.total_orders_received}</div>
                  <div className="text-[15px] text-slate-600 font-semibold">Orders Received</div>
                </div>
              </div>

              <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xs flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
                  <Package className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-slate-900">{listings.length}</div>
                  <div className="text-[15px] text-slate-600 font-semibold">Active Crop Listings</div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Charts Section */}
          <div className="w-full">
            {loading ? (
              <ChartSkeleton />
            ) : stats ? (
              <DemandForecastingChart data={stats.demand_trends} />
            ) : null}
          </div>
        </div>
      )}

      {/* WORKSPACE SECTIONS */}
      {/* 1. Retail Inventory Catalog */}
      {activeSection === 'inventory' && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg text-slate-800">Crop Inventory</h3>
              <p className="text-sm text-slate-600 leading-relaxed">Your agricultural listings available for retail consumers.</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base font-bold px-4 py-3 rounded-xl flex items-center gap-1 shadow-sm"
            >
              <Plus className="h-4 w-4" /> Add Produce
            </button>
          </div>

          {zeroFreshnessAlerts.length > 0 && (
            <div className="space-y-3">
              {zeroFreshnessAlerts.map((item) => (
                <div key={item.id} className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm font-bold text-rose-700">{item.name} was removed from active inventory because freshness reached 0%.</div>
                    <div className="text-xs text-rose-600 mt-1">This is only a temporary alert. It is not saved to the database.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleMarkFreshnessAlertRead(item.id)}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3 py-2 rounded-lg transition-all"
                  >
                    Mark as read
                  </button>
                </div>
              ))}
            </div>
          )}

          {loading ? (
            <TableSkeleton />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[15px]">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-700 text-[15px] font-bold uppercase">
                    <th className="py-3 px-2">Crop Name</th>
                    <th className="py-3 px-2">Category</th>
                    <th className="py-3 px-2">Stock Level</th>
                    <th className="py-3 px-2">Price per Unit</th>
                    <th className="py-3 px-2">Storage / Freshness</th>
                    <th className="py-3 px-2">Harvest Date</th>
                    <th className="py-3 px-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeListings.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-slate-400">No products listed. Add your first crop!</td>
                    </tr>
                  ) : (
                    activeListings.map((l) => {
                      const freshness = getFreshnessMeta(l.freshness_percentage);

                      return (
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
                            {l.stored_in_cold_storage ? (
                              <div className="space-y-1">
                                <span className="px-2 py-0.5 rounded text-[13px] font-bold bg-blue-100 text-blue-800 whitespace-nowrap">Cold Storage</span>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <span className={`px-2 py-0.5 rounded text-[13px] font-bold whitespace-nowrap ${freshness.badgeClass}`}>
                                  {freshness.score !== null ? `${freshness.score}% | ${freshness.label}` : freshness.label}
                                </span>
                                {freshness.alert && <p className="text-[10px] font-bold text-rose-600">Review price soon</p>}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-2 text-slate-500 leading-relaxed">
                            {new Date(l.harvest_date).toLocaleDateString('en-IN')}
                          </td>
                          <td className="py-3.5 px-2">
                            <button onClick={() => handleEditProduct(l)} className="text-xs font-bold text-emerald-700 hover:text-emerald-900">Edit</button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

      {/* 2. Retail Incoming Orders */}
      {activeSection === 'orders' && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600">Retail channel</p>
            <h3 className="font-black text-xl text-slate-800 mt-1">Retail Orders</h3>
            <p className="text-sm text-slate-500 leading-relaxed mt-1">Consumer purchases for your listed produce. Wholesale negotiations appear under Wholesale Bids.</p>
          </div>

          {loading ? (
            <OrdersListSkeleton />
          ) : (
            <div className="space-y-6">
              {orders.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No orders received yet.</p>
              ) : (
                orders.map((o) => {
                  const selectedTransportOffer = transportOffers.find(offer => offer.shipment_details?.order === o.id && offer.status === 'pending');
                  const assignedPartner = o.shipment?.partner_details || selectedTransportOffer?.partner_details;

                  return (
                  <div key={o.id} className="border border-slate-100 rounded-3xl p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-3 gap-2">
                      <div>
                        <span className="text-xs font-bold text-slate-800">Order Reference #{o.id}</span>
                        <span className="text-[13px] text-slate-400 ml-2 font-medium">Placed: {new Date(o.created_at).toLocaleDateString('en-IN')}</span>
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className={`px-2.5 py-1 rounded-full text-[13px] font-bold border uppercase ${
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
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[15px] px-4 py-3 rounded-xl transition-all"
                          >
                            Confirm Order
                          </button>
                        )}
                        {o.status === 'confirmed' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(o.id, 'packed')}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[15px] px-4 py-3 rounded-xl transition-all"
                          >
                            Mark Packed
                          </button>
                        )}
                        {o.status === 'packed' && (
                          <span className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 font-bold text-[15px] px-4 py-3 rounded-xl">
                            🚚 Awaiting Logistics Pickup
                          </span>
                        )}
                        {o.status === 'in_transit' && (
                          <span className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 text-purple-700 font-bold text-[15px] px-4 py-3 rounded-xl">
                            📦 In Transit — Logistics Handling
                          </span>
                        )}
                        {o.status === 'delivered' && (
                          <span className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[15px] px-4 py-3 rounded-xl">
                            ✅ Delivered via OTP
                          </span>
                        )}
                        {(o.status === 'placed' || o.status === 'confirmed') && (
                          <button
                            onClick={() => handleUpdateOrderStatus(o.id, 'cancelled')}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[15px] px-4 py-3 rounded-xl border border-rose-100 transition-all"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[15px]">
                      <div className="space-y-1 col-span-1">
                        <span className="font-bold text-slate-400 uppercase text-[13px]">Shipping Details</span>
                        <p className="font-semibold text-slate-700">Buyer: {o.buyer_username}</p>
                        <p className="text-slate-500 leading-relaxed">{o.shipping_address}</p>
                        <p className="text-slate-500">PIN: {o.shipping_pincode}</p>
                        <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2">
                          <span className="block text-[11px] font-bold uppercase tracking-wide text-blue-700">Delivery Partner</span>
                          {assignedPartner ? (
                            <>
                              <p className="text-sm font-bold text-slate-800 mt-1">{assignedPartner.name}</p>
                              <p className="text-xs text-slate-600">{assignedPartner.phone || 'Contact not available'} · {assignedPartner.district}</p>
                              {!o.shipment?.partner_details && <p className="text-[11px] font-semibold text-blue-700 mt-1">Offer sent · Awaiting driver acceptance</p>}
                            </>
                          ) : (
                            <p className="text-xs font-semibold text-amber-700 mt-1">Awaiting driver assignment</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1 col-span-1">
                        <span className="font-bold text-slate-400 uppercase text-[13px]">Crops Ordered</span>
                        {o.items?.map((item) => (
                          <p key={item.id} className="font-medium text-slate-700">
                            • {item.product_details?.name} (Qty: {item.quantity} {item.product_details?.unit})
                          </p>
                        ))}
                        <p className="font-extrabold text-slate-900 mt-2">Total Value: ₹{parseFloat(o.total_amount).toFixed(2)}</p>
                      </div>

                      {/* Order Status Stepper */}
                      <div className="col-span-1 flex flex-col justify-center">
                        <span className="font-bold text-slate-400 uppercase text-[13px] mb-2 text-center">Tracking Progression</span>
                        <Stepper currentStatus={o.status} />
                      </div>
                    </div>

                    {/* Transportation & Route Visualization toggle */}
                    <div className="border-t border-slate-100 pt-3">
                      <button
                        onClick={() => toggleOrderRoute(o.id)}
                        className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        <Route className="h-4 w-4" />
                        <span>{expandedRoutes[o.id] ? 'Hide Delivery Route Map' : 'View Transportation Route & Weather Map'}</span>
                        {expandedRoutes[o.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>

                      {expandedRoutes[o.id] && (
                        <div className="mt-4 space-y-4 animate-fade-in border-t border-slate-100 pt-3">
                          {routeLoadingOrder[o.id] ? (
                            <div className="flex items-center justify-center p-6 text-sm text-slate-600 leading-relaxed gap-2">
                              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                              Loading authoritative transportation route...
                            </div>
                          ) : orderRoutes[o.id]?.error ? (
                            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-[15px]">
                              ⚠️ {orderRoutes[o.id].error}
                            </div>
                          ) : orderRoutes[o.id]?.route ? (
                            <div className="space-y-4">
                              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border">
                                <div>
                                  <span className="font-bold text-slate-800">Transport Partner: </span>
                                  <span>{orderRoutes[o.id].partner_name}</span>
                                </div>
                                <div>
                                  <span className="font-bold text-slate-800">Vehicle Number: </span>
                                  <span>{orderRoutes[o.id].vehicle_number}</span>
                                </div>
                                <div>
                                  <span className="font-bold text-slate-800">Shipment Status: </span>
                                  <span className="uppercase text-blue-600 font-extrabold">{orderRoutes[o.id].status}</span>
                                </div>
                              </div>

                              <DeliveryMap
                                pickupAddress={orderRoutes[o.id].pickup_address}
                                deliveryAddress={orderRoutes[o.id].delivery_address}
                                pickupCoordinates={orderRoutes[o.id].route?.route_geometry?.[0]}
                                destinationCoordinates={orderRoutes[o.id].route?.route_geometry?.[orderRoutes[o.id].route.route_geometry.length - 1]}
                                routeGeometry={
                                  orderRoutes[o.id].route?.candidate_routes?.find(c => c.route_id === selectedCandidatePerOrder[o.id])?.geometry ||
                                  orderRoutes[o.id].route?.route_geometry || []
                                }
                                weatherCheckpoints={
                                  orderRoutes[o.id].route?.candidate_routes?.find(c => c.route_id === selectedCandidatePerOrder[o.id])?.weather_checkpoints ||
                                  orderRoutes[o.id].route?.weather_snapshot || []
                                }
                                candidateRoutes={orderRoutes[o.id].route?.candidate_routes || []}
                                selectedRouteId={selectedCandidatePerOrder[o.id] || orderRoutes[o.id].route?.route_id || 'R1'}
                                onSelectCandidate={(candId) => setSelectedCandidatePerOrder(prev => ({ ...prev, [o.id]: candId }))}
                                height="380px"
                              />

                              <RouteInfoPanel
                                route={orderRoutes[o.id].route}
                                selectedCandidateId={selectedCandidatePerOrder[o.id] || orderRoutes[o.id].route?.route_id || 'R1'}
                                onSelectCandidate={(candId) => setSelectedCandidatePerOrder(prev => ({ ...prev, [o.id]: candId }))}
                                isDriver={false}
                              />
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })
              )}
            </div>
          )}

          <div className="border-t border-slate-200 pt-6 space-y-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">Packed order transport</p>
              <h4 className="text-lg font-black text-slate-800 mt-1">Assign a Transport Driver</h4>
              <p className="text-sm text-slate-500 mt-1">Select any active driver operating in the delivery area. The driver will receive your ride offer and can accept or decline it.</p>
            </div>
            {transportShipments.filter(shipment => {
              const order = orders.find(item => item.id === shipment.order);
              return order?.status === 'packed';
            }).length === 0 ? (
              <p className="text-xs text-slate-400 rounded-2xl border border-slate-100 bg-slate-50 p-4">No packed orders are waiting for a transport driver.</p>
            ) : (
              transportShipments.filter(shipment => {
                const order = orders.find(item => item.id === shipment.order);
                return order?.status === 'packed';
              }).map(shipment => {
                const shipmentOffers = transportOffers.filter(offer => offer.shipment === shipment.id);
                const existingOffer = shipmentOffers.find(offer => offer.status === 'pending');
                const declinedOffer = shipmentOffers.find(offer => offer.status === 'rejected');
                return (
                  <div key={shipment.id} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-slate-800">Order #{shipment.order}</p>
                        <p className="text-xs text-slate-500">Pickup: {shipment.pickup_address}</p>
                        <p className="text-xs text-slate-500">Delivery: {shipment.delivery_address}</p>
                      </div>
                      <span className="text-xs font-bold text-amber-700 bg-amber-50 rounded-full px-2.5 py-1">Packed · Driver needed</span>
                    </div>
                    {existingOffer ? (
                      <p className="text-xs font-bold text-blue-700 bg-blue-50 rounded-lg px-3 py-2">Offer sent to {existingOffer.partner_details?.name || 'selected driver'} and awaiting response.</p>
                    ) : (
                      <div className="space-y-2">
                        {declinedOffer && <p className="text-xs font-bold text-rose-700 bg-rose-50 rounded-lg px-3 py-2">{declinedOffer.partner_details?.name || 'The selected driver'} declined this task. Please select another driver.</p>}
                        <div className="flex flex-col sm:flex-row gap-2">
                        <select
                          value={selectedTransportPartner[shipment.id] || ''}
                          onChange={(event) => setSelectedTransportPartner(prev => ({ ...prev, [shipment.id]: event.target.value }))}
                          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                        >
                          <option value="">Select any transport driver</option>
                          {(transportPartnersByShipment[shipment.id] || []).map(partner => (
                            <option key={partner.id} value={partner.id}>{partner.name} · {partner.district} · PIN {partner.pincode}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleOfferTransport(shipment.id)}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
                        >
                          Offer Ride
                        </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-slate-200 pt-6">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600">Retail subscription channel</p>
            <h4 className="text-lg font-black text-slate-800 mb-1 mt-1">Retail Subscription Orders</h4>
            <p className="text-sm text-slate-500 mb-3">Recurring subscriptions placed by retail consumers are listed here and kept separate from wholesale bids.</p>
            <SubscriptionWidget role="farmer" buyerRole="consumer" />
          </div>
        </div>
      )}

      {/* 3. Wholesale Bid Negotiations (Quotes) */}
      {activeSection === 'quotes' && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-600">Wholesale channel</p>
            <h3 className="font-black text-xl text-slate-800 mt-1">Wholesale Bids</h3>
            <p className="text-sm text-slate-500 leading-relaxed mt-1">Bulk-buyer quote requests and negotiated prices. Retail consumer orders are kept separate.</p>
          </div>

          <div className="overflow-x-auto text-[15px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-700 text-[15px] font-bold uppercase">
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
                      <td className="py-4 px-2 font-semibold text-slate-800">
                        {q.buyer_username || q.buyer_details?.username || `Buyer #${q.buyer}`}
                      </td>
                      <td className="py-4 px-2 font-medium text-slate-600">{q.product_details?.name}</td>
                      <td className="py-4 px-2">{q.quantity} {q.product_details?.unit}</td>
                      <td className="py-4 px-2 font-bold text-slate-900">₹{parseFloat(q.target_price).toFixed(2)}/{q.product_details?.unit}</td>
                      <td className="py-4 px-2 font-bold text-amber-600">
                        {q.offered_price ? `₹${parseFloat(q.offered_price).toFixed(2)}` : '—'}
                      </td>
                      <td className="py-4 px-2">
                        <span className={`px-2 py-0.5 rounded text-[13px] font-bold uppercase ${
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
                                className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-2 py-1 rounded text-[13px]"
                              >
                                Counter
                              </button>
                            </div>
                            <button
                              onClick={() => handleAcceptQuote(q.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded text-[13px]"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleRejectQuote(q.id)}
                              className="bg-rose-50 border border-rose-100 text-rose-600 font-semibold px-2.5 py-1 rounded text-[13px]"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {q.status === 'offered' && (
                          <span className="text-[13px] text-slate-400 italic">Waiting for buyer response</span>
                        )}
                        {q.status === 'accepted' && (
                          <span className="text-[13px] text-emerald-600 font-bold flex items-center justify-end gap-1">
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

          <div className="border-t border-slate-200 pt-6">
            <h4 className="text-lg font-black text-slate-800 mb-1">Wholesale Subscription Orders</h4>
            <p className="text-sm text-slate-500 mb-3">Recurring subscriptions placed by bulk buyers.</p>
            <SubscriptionWidget role="farmer" buyerRole="bulk_buyer" />
          </div>

          <div className="border-t border-slate-200 pt-6 space-y-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">Transport coordination</p>
              <h4 className="text-lg font-black text-slate-800 mt-1">Offer a Ride to a Driver</h4>
              <p className="text-sm text-slate-500 mt-1">Choose an active driver operating near the shipment area. The selected driver will receive this offer in their dashboard.</p>
            </div>
            {transportShipments.length === 0 ? (
              <p className="text-xs text-slate-400 rounded-2xl border border-slate-100 bg-slate-50 p-4">No unassigned confirmed shipments need a transport partner.</p>
            ) : (
              transportShipments.map(shipment => {
                const existingOffer = transportOffers.find(offer => offer.shipment === shipment.id && offer.status === 'pending');
                return (
                  <div key={shipment.id} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-slate-800">Order #{shipment.order}</p>
                        <p className="text-xs text-slate-500">Pickup: {shipment.pickup_address}</p>
                      </div>
                      <span className="text-xs font-bold text-amber-700 bg-amber-50 rounded-full px-2.5 py-1">Driver needed</span>
                    </div>
                    {existingOffer ? (
                      <p className="text-xs font-bold text-blue-700 bg-blue-50 rounded-lg px-3 py-2">Offer sent to {existingOffer.partner_details?.name || 'selected driver'} and awaiting response.</p>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <select
                          value={selectedTransportPartner[shipment.id] || ''}
                          onChange={(event) => setSelectedTransportPartner(prev => ({ ...prev, [shipment.id]: event.target.value }))}
                          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                        >
                          <option value="">Select transport driver</option>
                          {transportPartners.map(partner => (
                            <option key={partner.id} value={partner.id}>{partner.name} — {partner.district}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleOfferTransport(shipment.id)}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
                        >
                          Offer Ride
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 4. Reverse Sourcing Marketplace */}
      {activeSection === 'sourcing' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sourcing list */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-end justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600">Reverse marketplace</p>
                <h3 className="font-black text-xl text-slate-800 mt-1">Wholesale Buying Demands</h3>
                <p className="text-sm text-slate-500 leading-relaxed mt-1">Review bulk requests and submit competitive offers for crops you can supply.</p>
              </div>
              <span className="hidden sm:inline-flex shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                {bulkReqs.length} {bulkReqs.length === 1 ? 'request' : 'requests'}
              </span>
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
                    <div key={req.id} className="bg-white border border-slate-200 border-l-4 border-l-emerald-500 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <h4 className="font-black text-slate-800 text-lg">{req.crop_name}</h4>
                            <span className="rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-700">Open demand</span>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed">{req.variety || 'Standard'} <span className="mx-1 text-slate-300">•</span> Required by {req.required_date}</p>
                        </div>
                        <div className="sm:text-right rounded-xl bg-slate-50 px-3 py-2 sm:min-w-28">
                          <span className="text-[10px] text-slate-500 block font-black uppercase tracking-wider">Total pool</span>
                          <span className="text-slate-800 font-black text-lg">{totalTarget} <span className="text-xs font-bold text-slate-500">{req.unit}</span></span>
                        </div>
                      </div>

                      {/* Aggregation Progress Bar */}
                      <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-2.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-600">Pool progress</span>
                          <span className="font-bold text-emerald-700">{progressPct}% Pooled</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-600 h-full rounded-full transition-all"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-500 leading-relaxed pt-0.5">
                          <span>Pledged: <strong className="text-emerald-700 font-bold">{totalOffered} {req.unit}</strong></span>
                          <span>Remaining Needed: <strong className="text-amber-700 font-bold">{remainingQty} {req.unit}</strong></span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white border border-slate-200 p-4 rounded-xl text-sm text-slate-700">
                        <div>
                          <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block mb-1">Target budget</span>
                          <span className="font-bold text-slate-900">₹{req.target_price_min} - ₹{req.target_price_max} per {req.unit}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block mb-1">Delivery location</span>
                          <span className="font-bold text-slate-900 flex items-center gap-1">
                            <MapPin className="h-4 w-4 text-slate-500" />
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
                              setOfferError('');
                            } else {
                              handleOpenOfferForm(req);
                            }
                          }}
                          className={`w-full font-bold py-3 rounded-xl text-base flex items-center justify-center gap-1.5 transition shadow-xs ${
                            offerReqId === req.id
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          <Handshake className="h-4 w-4" /> 
                          {offerReqId === req.id ? 'Close Offer Form' : 'Submit Sourcing Contribution'}
                        </button>

                      </div>
                    )}
                  </div>
                );
              })
              )}
            </div>
          </div>

          {/* Submit/Edit Offer panel & my submitted offers */}
          <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-6 lg:self-start">
            {offerReqId && (
              <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-4 animate-fade-in">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Selected demand</p>
                    <h4 className="font-black text-slate-800 text-base mt-1">Submit Sourcing Offer</h4>
                  </div>
                  <button 
                    onClick={() => { setOfferReqId(null); setOfferError(''); }}
                    className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                </div>

                {(() => {
                  const selectedRequirement = bulkReqs.find((req) => req.id === offerReqId);
                  const offered = (selectedRequirement?.offers || []).reduce((sum, offer) => sum + Number(offer.quantity || 0), 0);
                  const remaining = Math.max(0, Number(selectedRequirement?.quantity || 0) - offered);
                  return (
                    <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs">
                      <div><span className="block text-[10px] uppercase font-black tracking-wider text-slate-400">Demand</span><strong className="text-slate-700">{selectedRequirement?.crop_name}</strong></div>
                      <div><span className="block text-[10px] uppercase font-black tracking-wider text-slate-400">Remaining</span><strong className="text-emerald-700">{remaining} {selectedRequirement?.unit}</strong></div>
                    </div>
                  );
                })()}

                {offerError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-700">
                    {offerError}
                  </div>
                )}

                <form onSubmit={handleSubmitSourcingOffer} className="space-y-3 text-[15px]">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Your Offered Qty</label>
                    <input
                      type="number"
                      min="0.01"
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

            {offerSuccess && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">
                {offerSuccess}
              </div>
            )}

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Your activity</p>
                  <h4 className="font-black text-slate-800 text-base mt-1">Sourcing Contributions</h4>
                </div>
                <span className="h-8 min-w-8 px-2 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-black text-slate-600">{myOffers.length}</span>
              </div>
              {myOffers.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6 bg-white border border-slate-100 rounded-3xl">No offers submitted.</p>
              ) : (
                <div className="space-y-3">
                  {myOffers.map(offer => (
                    <div key={offer.id} className="bg-white border border-slate-100 rounded-2xl p-4 space-y-2 text-[15px]">
                      <div className="flex justify-between items-center">
                        <strong className="text-slate-800 text-sm">Pool Requirement #{offer.requirement}</strong>
                        <span className={`px-2 py-0.5 rounded text-[13px] font-bold uppercase ${
                          offer.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' :
                          offer.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {offer.status}
                        </span>
                      </div>
                      <p className="text-slate-600">Qty Offered: {offer.quantity} | Bid Rate: ₹{offer.price_per_unit}</p>
                      <p className="text-slate-400 text-[13px]">Deliver Date: {offer.delivery_date}</p>
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
                <p className="text-sm text-slate-600 leading-relaxed mb-4">Discover markets and government-reported commodity prices around India.</p>
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
        <div className="space-y-7">
          <div className="flex items-end justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600">Forward planning</p>
              <h2 className="font-black text-2xl text-slate-800 mt-1">Pre-Harvest Contracts</h2>
              <p className="text-sm text-slate-500 mt-1">Lock future demand and pricing before your crop is ready to harvest.</p>
            </div>
            <span className="hidden sm:inline-flex rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
              {preHarvestContracts.length} {preHarvestContracts.length === 1 ? 'contract' : 'contracts'}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Propose Contract Form */}
          <div className="lg:col-span-1 bg-white border border-slate-200 border-t-4 border-t-emerald-600 rounded-2xl p-6 shadow-sm h-fit space-y-6 lg:sticky lg:top-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Create agreement</p>
              <h3 className="font-black text-lg text-slate-800 mt-1">Propose Pre-Harvest Yield</h3>
              <p className="text-sm text-slate-500 leading-relaxed mt-1">Guarantee a sale price for your upcoming yield before harvest.</p>
            </div>

            <form onSubmit={handleSubmitContract} className="space-y-4 text-[15px]">
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
            <div className="flex items-end justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Contract portfolio</p>
                <h3 className="font-black text-xl text-slate-800 mt-1">Proposed Yields</h3>
                <p className="text-sm text-slate-500 leading-relaxed mt-1">Track availability and buyer reservations.</p>
              </div>
            </div>

            {preHarvestContracts.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8 bg-white border border-slate-100 rounded-3xl">No pre-harvest agreements listed.</p>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                {preHarvestContracts.map(c => (
                  <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden">
                    <div className={`absolute inset-x-0 top-0 h-1 ${c.status === 'accepted' ? 'bg-emerald-600' : 'bg-slate-300'}`}></div>
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pre-harvest yield</p>
                        <h4 className="font-black text-slate-800 text-base mt-1">{c.crop_name}</h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        c.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {c.status === 'accepted' ? 'Reserved' : 'Available'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl bg-slate-50 p-3"><span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Harvest date</span><strong className="text-slate-700 block mt-1">{c.expected_harvest_date}</strong></div>
                      <div className="rounded-xl bg-slate-50 p-3"><span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Expected volume</span><strong className="text-slate-700 block mt-1">{c.expected_quantity} {c.unit}</strong></div>
                      <div className="col-span-2 rounded-xl bg-emerald-50/70 border border-emerald-100 p-3"><span className="block text-[10px] font-black uppercase tracking-wider text-emerald-700">Locked contract rate</span><strong className="text-emerald-800 block mt-1 text-base">₹{parseFloat(c.contract_price).toFixed(2)}<span className="text-xs font-bold">/{c.unit}</span></strong></div>
                      {c.status === 'accepted' && (
                        <p className="col-span-2 pt-3 border-t border-slate-100 text-emerald-800 font-semibold flex items-center gap-1">
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
        </div>
      )}

      {/* Add Produce Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
              <h3 className="text-xl font-bold text-slate-800">{editingProduct ? 'Edit Crop Listing' : 'Add Crop Listing'}</h3>
              <button 
                onClick={() => { setShowAddModal(false); setEditingProduct(null); }}
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

            <form onSubmit={handleAddProduct} className="space-y-4 text-[15px]">
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

              <div className="grid grid-cols-1 gap-3">
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
                <label className="block text-slate-600 font-bold mb-1 uppercase">Source Land</label>
                <select
                  value={pSourceLand}
                  onChange={(e) => setPSourceLand(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Select land / plot</option>
                  {Array.isArray(farmerProfile?.farm_lands) && farmerProfile.farm_lands.length > 0 ? (
                    farmerProfile.farm_lands.map((land, index) => (
                      <option key={`${land.land_name || 'land'}-${index}`} value={land.land_name}>{land.land_name} ({land.area_value} {land.area_unit})</option>
                    ))
                  ) : (
                    <option value="">Add farm land in profile first</option>
                  )}
                </select>
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

              <label className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-3 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={pColdStorage} onChange={(e) => setPColdStorage(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
                Stored in cold storage
              </label>

              <button
                type="submit"
                disabled={addLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                {addLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : editingProduct ? 'Save Crop Changes' : 'Publish Listing'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default FarmerDashboard;
