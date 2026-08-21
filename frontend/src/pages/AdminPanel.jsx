import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, UserCheck, AlertOctagon, Loader2, Sparkles } from 'lucide-react';

const AdminPanel = () => {
  const { user } = useAuth();
  const [pendingFarmers, setPendingFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null);

  const fetchPendingFarmers = async () => {
    try {
      const response = await api.get('/admin/kyc-pending/');
      setPendingFarmers(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchPendingFarmers();
    }
  }, [user]);

  const handleKycStatus = async (farmerId, status) => {
    setActioningId(farmerId);
    try {
      await api.post(`/admin/kyc-verify/${farmerId}/`, { status });
      alert(`Farmer KYC status updated to ${status}.`);
      setPendingFarmers(pendingFarmers.filter(f => f.id !== farmerId));
    } catch (err) {
      alert('Failed to update KYC status.');
    } finally {
      setActioningId(null);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      
      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Platform Admin Console</h1>
        <p className="text-sm text-slate-500">Oversight of FPO verify queues, dispute arbitrations, and local driver allocations.</p>
      </div>

      {/* KYC Queue Section */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-6">
        <div>
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-1.5">
            <UserCheck className="h-5.5 w-5.5 text-emerald-600" />
            Farmer KYC Verification Queue
          </h3>
          <p className="text-xs text-slate-500 mt-1">Review farm deeds and FPO registration documentation uploads.</p>
        </div>

        <div className="space-y-4">
          {pendingFarmers.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">All farmer profiles are verified. KYC queue is empty.</p>
          ) : (
            pendingFarmers.map((f) => (
              <div key={f.id} className="border border-slate-100 rounded-2xl p-5 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-sm">{f.username}</span>
                    <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded">Pending Approval</span>
                  </div>
                  <p className="text-slate-600"><strong className="text-slate-700">Contact:</strong> {f.phone} | {f.email}</p>
                  <p className="text-slate-600"><strong className="text-slate-700">Location:</strong> {f.address}, {f.district} ({f.pincode})</p>
                  <div className="mt-3 bg-white p-3 rounded-xl border border-slate-100 max-w-xl text-[11px] text-slate-500 leading-relaxed">
                    <strong>📄 Uploaded Document / Declaration:</strong><br />
                    {f.kyc_document || 'No documentation details uploaded.'}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleKycStatus(f.id, 'approved')}
                    disabled={actioningId === f.id}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm transition-colors"
                  >
                    {actioningId === f.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Approve Profile'}
                  </button>
                  <button
                    onClick={() => handleKycStatus(f.id, 'rejected')}
                    disabled={actioningId === f.id}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold px-4 py-2 rounded-xl text-xs border border-rose-100 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Disputes and Oversight Mock Logs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-1.5">
            <AlertOctagon className="h-5 w-5 text-amber-500" />
            Active Dispute Arbitrations
          </h3>
          <p className="text-slate-500 text-[10px]">Interventions regarding weight differences or logistics delays.</p>
          <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50 text-slate-500 italic text-center py-8">
            No unresolved purchase disputes recorded.
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-1.5">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            Admin System Diagnostics
          </h3>
          <p className="text-slate-500 text-[10px]">Real-time audit records of platform activity logs.</p>
          <div className="space-y-2.5 font-mono text-[10px] text-slate-500">
            <div className="flex gap-2">
              <span className="text-emerald-600">[OK]</span>
              <span>Razorpay API Webhooks connected (sandbox mode)</span>
            </div>
            <div className="flex gap-2">
              <span className="text-emerald-600">[OK]</span>
              <span>Logistics Assigned: Pincode distance calculator online</span>
            </div>
            <div className="flex gap-2">
              <span className="text-emerald-600">[OK]</span>
              <span>Daily MandiPrice scraper matching reference benchmarks</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
