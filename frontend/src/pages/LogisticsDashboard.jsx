import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import {
  Truck, Package, MapPin, CheckCircle, Navigation,
  Key, ArrowRight, ShieldCheck, RefreshCw, AlertCircle,
  IndianRupee, BarChart3, Route, Settings, Clock,
  TrendingUp, Zap, Star, Edit3, Save, X, ChevronRight,
  Loader2, Circle, CheckCircle2, PackageCheck
} from 'lucide-react';
import DeliveryMap from '../components/DeliveryMap';
import RouteInfoPanel from '../components/RouteInfoPanel';

const EARNINGS_PER_KM = 12;

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, color }) => (
  <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex items-center gap-4 hover:shadow-sm transition-shadow">
    <div className={`p-3 rounded-xl ${color}`}>
      <Icon className="h-5 w-5" />
    </div>
    <div className="min-w-0">
      <p className="text-2xl font-black text-slate-900 truncate">{value}</p>
      <p className="text-[11px] font-semibold text-slate-500 truncate">{label}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{sub}</p>}
    </div>
  </div>
);

// ─── Step Indicator ───────────────────────────────────────────────────────────
const ShipmentStepper = ({ status }) => {
  const steps = [
    { key: 'assigned', label: 'Assigned' },
    { key: 'picked_up', label: 'Picked Up' },
    { key: 'delivered', label: 'Delivered' },
  ];
  const idx = steps.findIndex(s => s.key === status);
  return (
    <div className="flex items-center gap-0 text-[10px]">
      {steps.map((step, i) => (
        <React.Fragment key={step.key}>
          <div className="flex flex-col items-center gap-1">
            <div className={`h-6 w-6 rounded-full flex items-center justify-center font-bold transition-all ${
              i < idx ? 'bg-emerald-500 text-white' :
              i === idx ? 'bg-emerald-600 text-white ring-4 ring-emerald-100' :
              'bg-slate-100 text-slate-400'
            }`}>
              {i < idx ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span>{i + 1}</span>}
            </div>
            <span className={`font-semibold whitespace-nowrap ${i <= idx ? 'text-emerald-700' : 'text-slate-400'}`}>
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-0.5 w-8 mx-1 mb-4 rounded-full ${i < idx ? 'bg-emerald-400' : 'bg-slate-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// ─── Route Suggestion ─────────────────────────────────────────────────────────
const RouteSuggestion = ({ pickup, drop, distanceKm }) => (
  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-3 text-xs space-y-2">
    <div className="flex items-center gap-1.5 font-bold text-blue-700">
      <Navigation className="h-3.5 w-3.5" />
      Route Suggestion
    </div>
    <div className="space-y-1.5 text-slate-600">
      <div className="flex items-start gap-2">
        <div className="h-2 w-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
        <span><strong>Pickup:</strong> {pickup}</span>
      </div>
      <div className="border-l-2 border-dashed border-blue-200 ml-1 h-4" />
      <div className="flex items-start gap-2">
        <div className="h-2 w-2 rounded-full bg-blue-500 mt-1 shrink-0" />
        <span><strong>Drop:</strong> {drop}</span>
      </div>
    </div>
    <div className="flex items-center justify-between pt-1 border-t border-blue-100">
      <span className="text-blue-600 font-bold">{distanceKm} km estimated</span>
      <span className="text-emerald-600 font-bold">₹{(parseFloat(distanceKm) * EARNINGS_PER_KM).toFixed(0)} est. earning</span>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const LogisticsDashboard = () => {
  const { user, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [shipments, setShipments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [otpInputs, setOtpInputs] = useState({});
  const [otpErrors, setOtpErrors] = useState({});
  const [handoverLoading, setHandoverLoading] = useState(null);

  // Route Planning & Geolocation state
  const [activeDeliveryData, setActiveDeliveryData] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);

  // Vehicle edit state
  const [editingVehicle, setEditingVehicle] = useState(false);
  const [vehicleSaving, setVehicleSaving] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({
    vehicle_number: '',
    vehicle_type: '',
    capacity: '',
    service_area: '',
    district: '',
    pincode: '',
    address: '',
  });

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };
  const showError = (msg) => {
    setError(msg);
    setTimeout(() => setError(''), 5000);
  };

  const fetchShipments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/logistics/shipments/');
      setShipments(res.data);
    } catch (err) {
      showError('Failed to fetch delivery shipments.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await api.get('/logistics/stats/');
      setStats(res.data);
    } catch (err) {
      console.error('Stats fetch error:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchActiveDeliveryRoute = useCallback(async () => {
    try {
      setRouteLoading(true);
      const res = await api.get('/route-planning/driver/active-delivery/');
      setActiveDeliveryData(res.data.active_delivery);
    } catch (err) {
      console.error('Active delivery route fetch error:', err);
    } finally {
      setRouteLoading(false);
    }
  }, []);

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setDriverLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          showSuccess('📍 Driver location updated on map!');
        },
        (err) => {
          showError('Geolocation unavailable or permission denied.');
        }
      );
    } else {
      showError('Geolocation is not supported by your browser.');
    }
  };

  useEffect(() => {
    fetchShipments();
    fetchStats();
    fetchActiveDeliveryRoute();
    if (user) {
      setVehicleForm({
        vehicle_number: user.vehicle_number || '',
        vehicle_type: user.vehicle_type || '',
        capacity: user.capacity || '',
        service_area: user.service_area || '',
        district: user.district || '',
        pincode: user.pincode || '',
        address: user.address || '',
      });
    }
  }, [user]);

  const handleRefresh = () => {
    fetchShipments();
    fetchStats();
    fetchActiveDeliveryRoute();
  };

  const handleAcceptJob = async (shipmentId) => {
    try {
      await api.post(`/logistics/shipments/${shipmentId}/accept-job/`);
      showSuccess('🎉 Job accepted! Check Active Shipments tab to proceed.');
      fetchShipments();
      fetchStats();
    } catch (err) {
      const httpStatus = err.response?.status;
      const errorMsg = err.response?.data?.error || 'Failed to accept delivery job.';
      if (httpStatus === 409) {
        // Race condition — another driver won. Refresh so the job disappears.
        showError(`⚡ ${errorMsg}`);
        fetchShipments(); // remove the job from Available list for this driver too
      } else if (httpStatus === 400) {
        showError(errorMsg);
        fetchShipments(); // might be delivered — refresh to clear it
      } else {
        showError(errorMsg);
      }
    }
  };

  const handleConfirmHandover = async (shipmentId) => {
    setHandoverLoading(shipmentId);
    try {
      const res = await api.post(`/logistics/shipments/${shipmentId}/confirm-handover/`);
      showSuccess(res.data.message || '🤝 Physical handover confirmed! Order cancellation is locked.');
      fetchShipments();
      fetchStats();
      fetchActiveDeliveryRoute();
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to confirm physical handover.');
    } finally {
      setHandoverLoading(null);
    }
  };

  const handleMarkPickedUp = async (shipmentId) => {
    try {
      const res = await api.post(`/logistics/shipments/${shipmentId}/update-status/`, { status: 'picked_up' });
      const emailNote = res.data.email_notification ? ` (${res.data.email_notification})` : '';
      showSuccess(`📦 Package picked up! OTP sent to consumer email.${emailNote}`);
      fetchShipments();
      fetchStats();
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to update delivery status.');
    }
  };

  const handleResendOtpEmail = async (shipmentId) => {
    try {
      const res = await api.post(`/logistics/shipments/${shipmentId}/send-otp-email/`);
      showSuccess(res.data.message || '📧 Delivery OTP has been emailed to the consumer!');
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to send OTP email.');
    }
  };

  const handleVerifyOtp = async (shipmentId) => {
    const otp = otpInputs[shipmentId];
    if (!otp || otp.length < 4) {
      setOtpErrors(p => ({ ...p, [shipmentId]: 'Please enter the 6-digit OTP from the buyer.' }));
      return;
    }
    setOtpErrors(p => ({ ...p, [shipmentId]: '' }));
    try {
      await api.post(`/logistics/shipments/${shipmentId}/verify-otp/`, { otp });
      showSuccess('✅ Delivery verified via OTP! Order completed successfully.');
      setOtpInputs(p => ({ ...p, [shipmentId]: '' }));
      fetchShipments();
      fetchStats();
    } catch (err) {
      setOtpErrors(p => ({ ...p, [shipmentId]: err.response?.data?.error || 'Invalid OTP. Please try again.' }));
    }
  };

  const handleSaveVehicle = async () => {
    setVehicleSaving(true);
    try {
      const res = await api.patch('/logistics/vehicle/update/', vehicleForm);
      const updatedUser = res.data.user;
      if (setUser) setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      showSuccess('🚗 Vehicle profile saved successfully!');
      setEditingVehicle(false);
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to save vehicle details.');
    } finally {
      setVehicleSaving(false);
    }
  };

  // Derived lists
  // NOTE: s.partner = integer FK | s.partner_details = nested {id, user, name, ...}
  // Available = partner is null AND not delivered (open broadcast jobs any driver can accept)
  const availableJobs = shipments.filter(s => !s.partner && s.status !== 'delivered');
  // My shipments = where partner_details.user matches logged-in user id
  const myActiveShipments = shipments.filter(
    s => s.partner_details && s.partner_details.user === user?.id && s.status !== 'delivered'
  );
  const myCompletedShipments = shipments.filter(
    s => s.partner_details && s.partner_details.user === user?.id && s.status === 'delivered'
  );

  const tabs = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'available', label: 'Available Jobs', icon: Zap, badge: availableJobs.length },
    { key: 'active', label: 'Active Shipments', icon: Truck, badge: myActiveShipments.length },
    { key: 'delivery_map', label: 'Delivery Map & Route', icon: Route, badge: activeDeliveryData ? 1 : 0 },
    { key: 'completed', label: 'Completed', icon: CheckCircle },
    { key: 'vehicle', label: 'Vehicle Profile', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="p-4 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg shadow-emerald-200">
                  <Truck className="h-8 w-8 text-white" />
                </div>
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-emerald-400 rounded-full border-2 border-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                  Driver Dashboard
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Welcome back, <span className="font-bold text-slate-700">{user?.username}</span>
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-100">
                    🚚 {user?.vehicle_type || 'No vehicle set'} {user?.vehicle_number ? `· ${user.vehicle_number}` : ''}
                  </span>
                  <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-blue-100">
                    📦 Capacity: {user?.capacity ? `${user.capacity} kg` : 'Not set'}
                  </span>
                  <span className="bg-purple-50 text-purple-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-purple-100">
                    📍 {user?.service_area || user?.district || 'Service area not set'}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 font-semibold text-xs transition-all active:scale-95"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* ── Alerts ── */}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-sm text-emerald-800 font-semibold flex items-center gap-2 animate-fade-in">
            <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
            {successMsg}
          </div>
        )}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-sm text-rose-700 font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />
            {error}
          </div>
        )}

        {/* ── Navigation Tabs ── */}
        <div className="flex border-b border-slate-200 gap-1 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 pb-3 px-3 text-sm font-bold border-b-2 whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
              {tab.badge > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold text-white ${
                  tab.key === 'active' ? 'bg-emerald-600' : 'bg-amber-500'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════════════════
            TAB 1: OVERVIEW
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {statsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
              </div>
            ) : stats ? (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <StatCard
                    icon={IndianRupee}
                    label="Total Earnings"
                    value={`₹${stats.total_earnings.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                    sub={`@₹${stats.earnings_per_km}/km`}
                    color="bg-emerald-50 text-emerald-600"
                  />
                  <StatCard
                    icon={PackageCheck}
                    label="Deliveries Done"
                    value={stats.completed_deliveries}
                    sub="Successfully delivered"
                    color="bg-blue-50 text-blue-600"
                  />
                  <StatCard
                    icon={Route}
                    label="Total KM Driven"
                    value={`${stats.total_km_driven} km`}
                    sub="Across all deliveries"
                    color="bg-purple-50 text-purple-600"
                  />
                  <StatCard
                    icon={Truck}
                    label="Active Shipments"
                    value={stats.active_deliveries}
                    sub="In progress"
                    color="bg-amber-50 text-amber-600"
                  />
                  <StatCard
                    icon={Zap}
                    label="Available Jobs"
                    value={stats.pending_jobs}
                    sub="Waiting for pickup"
                    color="bg-rose-50 text-rose-500"
                  />
                  <StatCard
                    icon={TrendingUp}
                    label="Avg per Delivery"
                    value={stats.completed_deliveries > 0
                      ? `₹${(stats.total_earnings / stats.completed_deliveries).toFixed(0)}`
                      : '₹0'}
                    sub="Earnings average"
                    color="bg-teal-50 text-teal-600"
                  />
                </div>

                {/* Earnings Banner */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-6 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <p className="text-emerald-100 text-sm font-semibold">Total Lifetime Earnings</p>
                    <p className="text-4xl font-black mt-1">
                      ₹{stats.total_earnings.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-emerald-100 text-xs mt-1">
                      {stats.completed_deliveries} deliveries · {stats.total_km_driven} km driven
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 text-right">
                    <div className="bg-white/20 rounded-2xl px-4 py-2 text-center">
                      <p className="text-xs text-emerald-100 font-semibold">Rate</p>
                      <p className="text-xl font-black">₹{stats.earnings_per_km}/km</p>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                {availableJobs.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🔔</span>
                      <div>
                        <p className="font-bold text-amber-900 text-sm">
                          {availableJobs.length} New Job{availableJobs.length > 1 ? 's' : ''} Available
                        </p>
                        <p className="text-amber-700 text-xs">Accept now to start earning</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('available')}
                      className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all"
                    >
                      View Jobs <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <BarChart3 className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                <p className="font-semibold text-sm">No stats available yet.</p>
                <p className="text-xs mt-1">Complete deliveries to see your earnings here.</p>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            TAB 2: AVAILABLE JOBS
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'available' && (
          <div>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
              </div>
            ) : availableJobs.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-xs">
                <Truck className="h-14 w-14 text-slate-200 mx-auto mb-4" />
                <p className="font-bold text-slate-700 text-base">No delivery jobs available right now</p>
                <p className="text-xs text-slate-400 mt-1">Jobs appear here when farmers mark orders as packed.</p>
                <button
                  onClick={handleRefresh}
                  className="mt-4 text-xs text-emerald-600 font-bold hover:underline"
                >
                  Refresh to check
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {availableJobs.map(job => (
                  <div key={job.id} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all space-y-4 relative overflow-hidden">
                    {/* Top accent */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-400" />

                    <div className="flex justify-between items-start pt-1">
                      <div>
                        <span className="bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                          📋 New Job
                        </span>
                        <h3 className="text-slate-800 font-bold text-base mt-2">
                          Order #{job.order} Delivery
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Assigned: {new Date(job.assigned_at).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-slate-400 font-semibold">Distance</p>
                        <p className="text-xl font-black text-slate-800">{job.distance_km} <span className="text-sm font-bold">km</span></p>
                        <p className="text-emerald-600 font-bold text-sm">
                          ≈ ₹{(parseFloat(job.distance_km) * EARNINGS_PER_KM).toFixed(0)}
                        </p>
                      </div>
                    </div>

                    <RouteSuggestion
                      pickup={job.pickup_address}
                      drop={job.delivery_address}
                      distanceKm={job.distance_km}
                    />

                    <button
                      onClick={() => handleAcceptJob(job.id)}
                      className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-3 rounded-2xl shadow-sm shadow-emerald-200 transition-all flex items-center justify-center gap-2 text-sm active:scale-[0.99]"
                    >
                      <Zap className="h-4 w-4" />
                      Accept Delivery Job
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            TAB 3: ACTIVE SHIPMENTS
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'active' && (
          <div>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
              </div>
            ) : myActiveShipments.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-xs">
                <Package className="h-14 w-14 text-slate-200 mx-auto mb-4" />
                <p className="font-bold text-slate-700 text-base">No active shipments</p>
                <p className="text-xs text-slate-400 mt-1">Accept a job to see it here.</p>
                <button
                  onClick={() => setActiveTab('available')}
                  className="mt-4 text-xs text-emerald-600 font-bold hover:underline flex items-center gap-1 mx-auto"
                >
                  Browse available jobs <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {myActiveShipments.map(job => (
                  <div key={job.id} className="bg-white border border-slate-100 rounded-3xl shadow-xs overflow-hidden">
                    {/* Accent bar */}
                    <div className={`h-1.5 w-full ${
                      job.status === 'picked_up' ? 'bg-gradient-to-r from-blue-400 to-purple-500'
                      : 'bg-gradient-to-r from-emerald-400 to-teal-500'
                    }`} />

                    <div className="p-5 space-y-5">
                      {/* Header row */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border ${
                            job.status === 'picked_up'
                              ? 'bg-blue-50 border-blue-200 text-blue-700'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          }`}>
                            {job.status === 'picked_up' ? '🚚 In Transit' : '📋 Assigned — Pickup Pending'}
                          </span>
                          <h3 className="text-slate-800 font-bold text-lg mt-2">
                            Shipment for Order #{job.order}
                          </h3>
                          <p className="text-xs text-slate-400">
                            Accepted on {new Date(job.assigned_at).toLocaleDateString('en-IN')}
                          </p>
                        </div>
                        <div className="text-center bg-slate-50 rounded-2xl px-4 py-2 border border-slate-100">
                          <p className="text-xs text-slate-400 font-semibold">Distance</p>
                          <p className="text-2xl font-black text-slate-800">{job.distance_km}<span className="text-sm"> km</span></p>
                          <p className="text-emerald-600 font-bold text-sm">₹{(parseFloat(job.distance_km) * EARNINGS_PER_KM).toFixed(0)} est.</p>
                        </div>
                      </div>

                      {/* Step tracker */}
                      <div className="flex justify-center py-2">
                        <ShipmentStepper status={job.status} />
                      </div>

                      {/* Route info */}
                      <RouteSuggestion
                        pickup={job.pickup_address}
                        drop={job.delivery_address}
                        distanceKm={job.distance_km}
                      />

                      {/* Action: Confirm Pickup */}
                      {job.status === 'assigned' && (
                        <div className="space-y-3 pt-2 border-t border-slate-100">
                          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800 font-medium">
                            📝 <strong>Next step:</strong> Head to the pickup address and collect the package from the farmer. Then confirm handover below to lock cancellation.
                          </div>
                          <button
                            onClick={() => handleConfirmHandover(job.id)}
                            disabled={handoverLoading === job.id}
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 text-sm active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                          >
                            {handoverLoading === job.id ? (
                              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Package className="h-4 w-4" />
                            )}
                            {handoverLoading === job.id ? 'Confirming Handover...' : 'Confirm Physical Handover'}
                          </button>
                        </div>
                      )}

                      {job.status === 'handover_completed' && (
                        <div className="space-y-3 pt-2 border-t border-slate-100">
                          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800 font-medium">
                            🚚 <strong>Next step:</strong> Start your journey. Tap to mark as in-transit and notify buyer.
                          </div>
                          <button
                            onClick={() => handleMarkPickedUp(job.id)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 text-sm active:scale-[0.99]"
                          >
                            <Truck className="h-4 w-4" />
                            Start Transit (Pick Up)
                          </button>
                        </div>
                      )}

                      {/* Action: OTP Delivery Verification */}
                      {job.status === 'picked_up' && (
                        <div className="space-y-3 pt-2 border-t border-slate-100">
                          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800 font-medium">
                            📦 <strong>Package in transit.</strong> On arrival, ask the buyer for their 6-digit OTP to complete delivery.
                          </div>

                          {/* Email OTP Notice Box */}
                          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 flex items-start gap-2">
                            <span className="text-base leading-none">📧</span>
                            <div>
                              <p className="font-bold">OTP sent to Consumer's Email</p>
                              <p className="text-[11px] text-emerald-700 mt-0.5">
                                Ask the consumer for their 6-digit verification code received on their registered email upon delivery.
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">
                              <Key className="inline h-3.5 w-3.5 mr-1 text-slate-400" />
                              Buyer Delivery OTP
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                maxLength="6"
                                placeholder="● ● ● ● ● ●"
                                value={otpInputs[job.id] || ''}
                                onChange={(e) => setOtpInputs(p => ({ ...p, [job.id]: e.target.value.replace(/\D/g, '') }))}
                                className="flex-1 px-4 py-3 border border-slate-200 rounded-2xl text-center font-black tracking-[0.4em] text-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50"
                              />
                              <button
                                onClick={() => handleVerifyOtp(job.id)}
                                className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-3 rounded-2xl text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-sm shadow-emerald-200"
                              >
                                <ShieldCheck className="h-4 w-4" />
                                Verify & Deliver
                              </button>
                            </div>
                            <div className="flex justify-between items-center pt-1">
                              <button
                                onClick={() => handleResendOtpEmail(job.id)}
                                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 transition-colors"
                              >
                                📧 Resend OTP to Consumer Email
                              </button>
                            </div>
                            {otpErrors[job.id] && (
                              <p className="text-rose-600 text-xs font-semibold flex items-center gap-1">
                                <AlertCircle className="h-3.5 w-3.5" />
                                {otpErrors[job.id]}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            TAB 4: COMPLETED
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'completed' && (
          <div className="space-y-4">
            {myCompletedShipments.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-xs">
                <Star className="h-14 w-14 text-slate-200 mx-auto mb-4" />
                <p className="font-bold text-slate-700 text-base">No completed deliveries yet</p>
                <p className="text-xs text-slate-400 mt-1">Once you verify OTPs, they'll appear here with earnings.</p>
              </div>
            ) : (
              <>
                {/* Earnings summary header */}
                <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-3xl p-5 text-white flex justify-between items-center">
                  <div>
                    <p className="text-slate-300 text-xs font-semibold">Total Completed</p>
                    <p className="text-3xl font-black mt-0.5">{myCompletedShipments.length} deliveries</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-300 text-xs font-semibold">Total Earned</p>
                    <p className="text-3xl font-black text-emerald-400 mt-0.5">
                      ₹{myCompletedShipments.reduce((acc, j) => acc + parseFloat(j.distance_km) * EARNINGS_PER_KM, 0).toFixed(0)}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {myCompletedShipments.map((job, idx) => (
                    <div key={job.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row justify-between gap-4 hover:shadow-sm transition-all">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Delivered
                          </span>
                          <span className="text-xs text-slate-400 font-medium">Order #{job.order}</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-700">
                          📍 {job.delivery_address}
                        </p>
                        <p className="text-xs text-slate-400">
                          🕐 {job.delivered_at ? new Date(job.delivered_at).toLocaleString('en-IN') : '—'}
                        </p>
                        <p className="text-xs text-slate-400">
                          📏 {job.distance_km} km
                        </p>
                      </div>
                      <div className="text-right shrink-0 flex flex-col justify-center">
                        <p className="text-2xl font-black text-emerald-600">
                          ₹{(parseFloat(job.distance_km) * EARNINGS_PER_KM).toFixed(0)}
                        </p>
                        <p className="text-[10px] text-slate-400 font-semibold">earned</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            TAB: DELIVERY MAP & ROUTE
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'delivery_map' && (
          <div className="space-y-6">
            {!activeDeliveryData ? (
              <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center space-y-3 shadow-xs">
                <div className="p-4 bg-slate-50 text-slate-400 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                  <Route className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">No active delivery</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Your active delivery route will appear here when a shipment is assigned and accepted.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Active delivery order info header */}
                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                        Active Delivery {activeDeliveryData.order_number}
                      </span>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                        {activeDeliveryData.status}
                      </span>
                    </div>
                    <h2 className="text-xl font-black text-slate-800">
                      {activeDeliveryData.commodity} ({activeDeliveryData.quantity})
                    </h2>
                    <p className="text-xs text-slate-500">
                      📍 {activeDeliveryData.pickup} ➔ 🏁 {activeDeliveryData.destination}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleGetLocation}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition-all"
                    >
                      <MapPin className="h-4 w-4 text-blue-600" />
                      Locate Me on Map
                    </button>
                    {activeDeliveryData.status === 'assigned' && (
                      <button
                        onClick={() => handleMarkPickedUp(activeDeliveryData.shipment_id)}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm"
                      >
                        Start Delivery (Pick Up)
                      </button>
                    )}
                  </div>
                </div>

                {/* Leaflet Delivery Map */}
                <DeliveryMap
                  pickupAddress={activeDeliveryData.pickup}
                  deliveryAddress={activeDeliveryData.destination}
                  pickupCoordinates={activeDeliveryData.pickup_coordinates}
                  destinationCoordinates={activeDeliveryData.destination_coordinates}
                  routeGeometry={
                    activeDeliveryData.route?.candidate_routes?.find(c => c.route_id === selectedCandidateId)?.geometry ||
                    activeDeliveryData.route?.route_geometry || []
                  }
                  weatherCheckpoints={
                    activeDeliveryData.route?.candidate_routes?.find(c => c.route_id === selectedCandidateId)?.weather_checkpoints ||
                    activeDeliveryData.route?.weather_snapshot || []
                  }
                  candidateRoutes={activeDeliveryData.route?.candidate_routes || []}
                  selectedRouteId={selectedCandidateId || activeDeliveryData.route?.route_id || 'R1'}
                  onSelectCandidate={(candId) => setSelectedCandidateId(candId)}
                  driverLocation={driverLocation}
                  height="480px"
                />

                {/* Route Information & Weather Checkpoints Panel */}
                <RouteInfoPanel
                  route={activeDeliveryData.route}
                  selectedCandidateId={selectedCandidateId || activeDeliveryData.route?.route_id || 'R1'}
                  onSelectCandidate={(candId) => setSelectedCandidateId(candId)}
                  isDriver={true}
                  onRecalculate={() => {
                    api.post(`/route-planning/shipments/${activeDeliveryData.shipment_id}/recalculate-route/`)
                      .then(() => {
                        showSuccess('Route recalculated with latest weather data!');
                        fetchActiveDeliveryRoute();
                      })
                      .catch(err => showError(err.response?.data?.error || 'Recalculation failed.'));
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            TAB 5: VEHICLE PROFILE
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'vehicle' && (
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg text-slate-800">Vehicle & Profile Registration</h3>
                <p className="text-xs text-slate-500 mt-0.5">Keep your vehicle details updated for accurate job matching.</p>
              </div>
              {!editingVehicle ? (
                <button
                  onClick={() => setEditingVehicle(true)}
                  className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs px-4 py-2.5 rounded-xl border border-emerald-200 transition-all"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Edit Profile
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingVehicle(false)}
                    className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-200 transition-all"
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveVehicle}
                    disabled={vehicleSaving}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all"
                  >
                    {vehicleSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save Changes
                  </button>
                </div>
              )}
            </div>

            {/* Vehicle card (view mode) */}
            {!editingVehicle && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { icon: '🚛', label: 'Vehicle Type', value: user?.vehicle_type || 'Not set' },
                  { icon: '🔢', label: 'Vehicle Number', value: user?.vehicle_number || 'Not set' },
                  { icon: '⚖️', label: 'Load Capacity', value: user?.capacity ? `${user.capacity} kg` : 'Not set' },
                  { icon: '📍', label: 'Service Area', value: user?.service_area || 'Not set' },
                  { icon: '🏙️', label: 'District', value: user?.district || 'Not set' },
                  { icon: '📮', label: 'Pincode', value: user?.pincode || 'Not set' },
                  { icon: '🏠', label: 'Address', value: user?.address || 'Not set' },
                ].map(({ icon, label, value }) => (
                  <div key={label} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{icon} {label}</p>
                    <p className={`font-bold text-sm ${value === 'Not set' ? 'text-slate-400 italic' : 'text-slate-800'}`}>{value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Edit form */}
            {editingVehicle && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { key: 'vehicle_type', label: 'Vehicle Type', placeholder: 'e.g. Tempo, Mini Truck, Bike', type: 'text' },
                    { key: 'vehicle_number', label: 'Vehicle Number', placeholder: 'e.g. MH12AB1234', type: 'text' },
                    { key: 'capacity', label: 'Load Capacity (kg)', placeholder: 'e.g. 1000', type: 'text' },
                    { key: 'service_area', label: 'Service Area', placeholder: 'e.g. Pune City, Nashik District', type: 'text' },
                    { key: 'district', label: 'District', placeholder: 'e.g. Nashik', type: 'text' },
                    { key: 'pincode', label: 'Pincode', placeholder: 'e.g. 422001', type: 'text' },
                  ].map(({ key, label, placeholder, type }) => (
                    <div key={key}>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5">{label}</label>
                      <input
                        type={type}
                        placeholder={placeholder}
                        value={vehicleForm[key]}
                        onChange={(e) => setVehicleForm(p => ({ ...p, [key]: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all"
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5">Full Address</label>
                  <textarea
                    rows="2"
                    placeholder="Your operational base address..."
                    value={vehicleForm.address}
                    onChange={(e) => setVehicleForm(p => ({ ...p, address: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all resize-none"
                  />
                </div>
              </div>
            )}

            {/* Info note */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-xs text-blue-700 font-medium">
              <strong>ℹ️ How job matching works:</strong> Your district and pincode are used to match you with nearby delivery jobs. Partners in the same district as the farmer get priority assignment.
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default LogisticsDashboard;
