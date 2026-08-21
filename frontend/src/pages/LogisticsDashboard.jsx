import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { 
  Truck, Package, MapPin, CheckCircle, Navigation, 
  Key, ArrowRight, ShieldCheck, RefreshCw, AlertCircle, Calendar 
} from 'lucide-react';

const LogisticsDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('available');
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [otpInputs, setOtpInputs] = useState({});
  const [successMsg, setSuccessMsg] = useState('');

  const fetchShipments = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/logistics/shipments/');
      setShipments(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch delivery shipments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, []);

  const handleAcceptJob = async (shipmentId) => {
    try {
      setError('');
      setSuccessMsg('');
      await api.post(`/logistics/shipments/${shipmentId}/accept-job/`);
      setSuccessMsg('Job accepted successfully! Drive safely.');
      fetchShipments();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to accept delivery job.');
    }
  };

  const handleMarkPickedUp = async (shipmentId) => {
    try {
      setError('');
      setSuccessMsg('');
      await api.post(`/logistics/shipments/${shipmentId}/update-status/`, { status: 'picked_up' });
      setSuccessMsg('Package marked as Picked Up. Please head to delivery location.');
      fetchShipments();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update delivery status.');
    }
  };

  const handleVerifyOtp = async (shipmentId) => {
    const otp = otpInputs[shipmentId];
    if (!otp) {
      setError('Please enter the verification OTP.');
      return;
    }

    try {
      setError('');
      setSuccessMsg('');
      await api.post(`/logistics/shipments/${shipmentId}/verify-otp/`, { otp });
      setSuccessMsg('Delivery verified! Order completed.');
      // Clear OTP input
      setOtpInputs(prev => ({ ...prev, [shipmentId]: '' }));
      fetchShipments();
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP. Please try again.');
    }
  };

  const handleOtpChange = (shipmentId, val) => {
    setOtpInputs(prev => ({
      ...prev,
      [shipmentId]: val
    }));
  };

  // Filter shipments based on tab
  const availableJobs = shipments.filter(s => !s.partner);
  const myActiveShipments = shipments.filter(s => s.partner && s.partner.user === user?.id && s.status !== 'delivered');
  const myCompletedShipments = shipments.filter(s => s.partner && s.partner.user === user?.id && s.status === 'delivered');

  const activeJobsCount = myActiveShipments.length;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Profile Dashboard */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-emerald-50 rounded-2xl">
              <Truck className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Driver Dashboard</h1>
              <p className="text-xs text-slate-500 mt-0.5">Welcome, <span className="font-semibold text-slate-700">{user?.username}</span></p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
                  🚚 {user?.vehicle_type || 'Tempo'} ({user?.vehicle_number || 'N/A'})
                </span>
                <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
                  📦 Cap: {user?.capacity ? `${user.capacity} kg` : 'N/A'}
                </span>
                <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2.5 py-1 rounded-full">
                  📍 Service Area: {user?.service_area || 'District Local'}
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={fetchShipments}
            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-semibold text-xs hover:bg-slate-50 active:scale-95 transition-all"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        {/* Global Success / Error Alerts */}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-sm text-emerald-800 font-semibold flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
            {successMsg}
          </div>
        )}
        {error && (
          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-sm text-rose-600 font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />
            {error}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 gap-6">
          <button
            onClick={() => setActiveTab('available')}
            className={`pb-4 text-sm font-bold border-b-2 transition-all relative ${
              activeTab === 'available'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Available Jobs
            {availableJobs.length > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {availableJobs.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('my_jobs')}
            className={`pb-4 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'my_jobs'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            My Active Shipments
            {activeJobsCount > 0 && (
              <span className="ml-1.5 bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {activeJobsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`pb-4 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'completed'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Completed Shipments
          </button>
        </div>

        {/* Tab Contents */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeTab === 'available' && (
              availableJobs.length === 0 ? (
                <div className="col-span-2 text-center py-12 bg-white rounded-3xl border border-slate-100 text-slate-500">
                  <Truck className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="font-semibold text-sm">No delivery jobs currently available in your region.</p>
                  <p className="text-xs text-slate-400 mt-1">We will notify you when farmers place confirmable shipments.</p>
                </div>
              ) : (
                availableJobs.map(job => (
                  <div key={job.id} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4 hover:shadow-md transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="bg-amber-50 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">
                          New Job Request
                        </span>
                        <h3 className="text-slate-800 font-bold text-base mt-2">Order #{job.order} Delivery</h3>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-400 block font-semibold">Distance</span>
                        <span className="text-slate-800 font-extrabold text-sm">{job.distance_km} km</span>
                      </div>
                    </div>

                    <div className="space-y-3 bg-slate-50 p-3 rounded-2xl text-xs text-slate-600">
                      <div className="flex gap-2">
                        <MapPin className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-slate-700 block">Pickup (Farmer Farm/FPO)</strong>
                          {job.pickup_address}
                        </div>
                      </div>
                      <div className="border-t border-slate-200/60 my-2"></div>
                      <div className="flex gap-2">
                        <MapPin className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-slate-700 block">Delivery (Buyer Hub)</strong>
                          {job.delivery_address}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAcceptJob(job.id)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl shadow transition-all flex items-center justify-center gap-1 text-sm"
                    >
                      Accept Delivery Job
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )
            )}

            {activeTab === 'my_jobs' && (
              myActiveShipments.length === 0 ? (
                <div className="col-span-2 text-center py-12 bg-white rounded-3xl border border-slate-100 text-slate-500">
                  <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="font-semibold text-sm">You do not have any active delivery shipments assigned.</p>
                  <p className="text-xs text-slate-400 mt-1">Accept a job from the "Available Jobs" tab to get started.</p>
                </div>
              ) : (
                myActiveShipments.map(job => (
                  <div key={job.id} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-500"></div>
                    
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                          job.status === 'picked_up' 
                            ? 'bg-blue-50 text-blue-800' 
                            : 'bg-emerald-50 text-emerald-800'
                        }`}>
                          {job.status === 'picked_up' ? 'In Transit / Shipped' : 'Assigned (Pickup Pending)'}
                        </span>
                        <h3 className="text-slate-800 font-bold text-base mt-2">Shipment for Order #{job.order}</h3>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-400 block font-semibold">Distance</span>
                        <span className="text-slate-800 font-extrabold text-sm">{job.distance_km} km</span>
                      </div>
                    </div>

                    <div className="space-y-3 bg-slate-50 p-3 rounded-2xl text-xs text-slate-600">
                      <div className="flex gap-2">
                        <MapPin className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-slate-700 block">Pickup Location</strong>
                          {job.pickup_address}
                        </div>
                      </div>
                      <div className="border-t border-slate-200/60 my-2"></div>
                      <div className="flex gap-2">
                        <MapPin className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-slate-700 block">Delivery Location</strong>
                          {job.delivery_address}
                        </div>
                      </div>
                    </div>

                    {/* Step Actions */}
                    {job.status === 'assigned' && (
                      <button
                        onClick={() => handleMarkPickedUp(job.id)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl shadow transition-all flex items-center justify-center gap-1.5 text-sm"
                      >
                        <Package className="h-4 w-4" />
                        Confirm Pickup from Farmer
                      </button>
                    )}

                    {job.status === 'picked_up' && (
                      <div className="border-t border-slate-100 pt-4 space-y-3">
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-[10px] text-slate-500">
                          <strong>💡 Demo Tip:</strong> Check your database (or use master OTP <strong>123456</strong>) to verify delivery.
                        </div>
                        <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Buyer Delivery OTP Code</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            maxLength="6"
                            placeholder="000000"
                            value={otpInputs[job.id] || ''}
                            onChange={(e) => handleOtpChange(job.id, e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-center font-bold tracking-[0.2em] text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                          <button
                            onClick={() => handleVerifyOtp(job.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs shrink-0 flex items-center gap-1 transition-all active:scale-95"
                          >
                            <ShieldCheck className="h-4 w-4" />
                            Verify & Deliver
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )
            )}

            {activeTab === 'completed' && (
              myCompletedShipments.length === 0 ? (
                <div className="col-span-2 text-center py-12 bg-white rounded-3xl border border-slate-100 text-slate-500">
                  <CheckCircle className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="font-semibold text-sm">You haven't completed any deliveries yet.</p>
                  <p className="text-xs text-slate-400 mt-1">Once you verify delivery OTPs, they will appear here.</p>
                </div>
              ) : (
                myCompletedShipments.map(job => (
                  <div key={job.id} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase flex items-center gap-1 w-max">
                          <CheckCircle className="h-3 w-3 text-emerald-600" />
                          Delivered Successfully
                        </span>
                        <h3 className="text-slate-800 font-bold text-base mt-2">Order #{job.order} Delivery Completed</h3>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-400 block font-semibold">Distance</span>
                        <span className="text-slate-800 font-extrabold text-sm">{job.distance_km} km</span>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs text-slate-500">
                      <p>🚚 Delivered on: <span className="font-bold text-slate-700">{new Date(job.delivered_at).toLocaleString()}</span></p>
                      <p>📍 Address: <span className="font-semibold text-slate-700">{job.delivery_address}</span></p>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LogisticsDashboard;
