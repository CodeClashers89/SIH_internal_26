import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const B2B_API = 'http://localhost:8001/api/v1/subscription';

const STATUS_BADGE = {
  PENDING: { bg: 'bg-amber-100', text: 'text-amber-700', label: '⏳ Pending Approval' },
  ACCEPTED: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '✅ Accepted' },
  REJECTED: { bg: 'bg-rose-100', text: 'text-rose-700', label: '❌ Rejected' },
};

const SubscriptionWidget = ({ role = 'buyer' }) => {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState([]);
  const [products, setProducts] = useState([]);
  const [subProduct, setSubProduct] = useState('');
  const [subQty, setSubQty] = useState('');
  const [subDays, setSubDays] = useState('Daily');
  const [submittingSub, setSubmittingSub] = useState(false);
  const [subError, setSubError] = useState('');
  const [respondingId, setRespondingId] = useState(null);

  const fetchSubscriptions = async () => {
    if (!user) return;
    try {
      const param = role === 'farmer' ? `farmer_id=${user.id}` : `buyer_id=${user.id}`;
      const res = await fetch(`${B2B_API}/list?${param}`);
      if (res.ok) {
        const data = await res.json();
        setSubscriptions(data);
      }
    } catch (err) {
      console.error('Failed to fetch subscriptions', err);
    }
  };

  const fetchProducts = async () => {
    if (role !== 'buyer') return;
    try {
      const res = await api.get('/products/');
      const prodData = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      setProducts(prodData);
    } catch (err) {
      console.error('Failed to fetch products', err);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
    fetchProducts();
  }, [user]);

  const handleCreateSubscription = async (e) => {
    e.preventDefault();
    setSubmittingSub(true);
    setSubError('');

    const selectedProduct = products.find(p => p.id === parseInt(subProduct));
    if (!selectedProduct) {
      setSubError('Please select a product.');
      setSubmittingSub(false);
      return;
    }

    const payload = {
      farmer_id: String(selectedProduct.farmer),
      buyer_profile: {
        buyer_id: String(user.id),
        name: user.username || "Buyer",
        delivery_address: "Registered Address"
      },
      schedule_matrix: {
        recurring_days: [subDays]
      },
      items_breakdown: [
        {
          commodity_name: selectedProduct.name,
          quantity: parseFloat(subQty),
          unit: selectedProduct.unit || "kg",
          price_per_unit: parseFloat(selectedProduct.price_per_unit)
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
        setSubProduct('');
        setSubQty('');
        alert('Subscription request sent to the farmer for approval!');
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
      if (res.ok) fetchSubscriptions();
    } catch (err) {
      alert('Failed to toggle subscription status');
    }
  };

  const handleRespond = async (subId, accept) => {
    setRespondingId(subId);
    try {
      const res = await fetch(`${B2B_API}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription_id: subId, accept })
      });
      if (res.ok) {
        fetchSubscriptions();
      } else {
        alert('Failed to respond to subscription.');
      }
    } catch (err) {
      alert('Network error.');
    } finally {
      setRespondingId(null);
    }
  };

  if (!user) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
      {/* LEFT PANEL: Create form (buyer only) */}
      {role === 'buyer' && (
        <div className="lg:col-span-1 bg-white border border-slate-100 rounded-3xl p-6 shadow-xs h-fit space-y-6">
          <div>
            <h3 className="font-bold text-base text-slate-800">New Regular Subscription</h3>
            <p className="text-[10px] text-slate-500 mt-1">Select a farmer's product and set a recurring schedule.</p>
          </div>
          
          {subError && (
            <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-xs text-rose-600 font-semibold">
              {subError}
            </div>
          )}

          <form onSubmit={handleCreateSubscription} className="space-y-4 text-sm">
            <div>
              <label className="block text-slate-600 font-bold mb-1 text-xs uppercase">Select Product / Farmer</label>
              <select required value={subProduct} onChange={e => setSubProduct(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs">
                <option value="">-- Choose a product --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} — ₹{parseFloat(p.price_per_unit).toFixed(2)}/{p.unit} (by {p.farmer_details?.username || `Farmer #${p.farmer}`})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-600 font-bold mb-1 text-xs uppercase">Quantity ({products.find(p => p.id === parseInt(subProduct))?.unit || 'kg'})</label>
              <input required type="number" min="1" value={subQty} onChange={e => setSubQty(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
            </div>
            <div>
              <label className="block text-slate-600 font-bold mb-1 text-xs uppercase">Schedule</label>
              <select value={subDays} onChange={e => setSubDays(e.target.value)} className="w-full px-3 py-2 border rounded-xl">
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
            <button disabled={submittingSub} type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all shadow-md">
              {submittingSub ? 'Sending Request...' : 'Request Subscription'}
            </button>
          </form>
        </div>
      )}

      {/* RIGHT PANEL: Subscription list */}
      <div className={role === 'buyer' ? 'lg:col-span-2 space-y-4' : 'lg:col-span-3 space-y-4'}>
        {subscriptions.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center text-slate-400">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>{role === 'farmer' ? 'No subscription requests received yet.' : 'No recurring subscriptions found.'}</p>
          </div>
        ) : (
          subscriptions.map(sub => {
            const badge = STATUS_BADGE[sub.approval_status] || STATUS_BADGE.PENDING;
            return (
              <div key={sub.subscription_id} className={`bg-white rounded-3xl border ${sub.approval_status === 'ACCEPTED' ? 'border-emerald-200' : sub.approval_status === 'REJECTED' ? 'border-rose-200' : 'border-amber-200'} p-5 shadow-xs`}>
                <div className="flex justify-between items-start flex-wrap gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </span>
                      {sub.is_active ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">ACTIVE</span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">PAUSED</span>
                      )}
                    </div>
                    <h4 className="font-bold text-lg text-slate-800">
                      {sub.items_breakdown[0].quantity} {sub.items_breakdown[0].unit} {sub.items_breakdown[0].commodity_name}
                    </h4>
                    <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {sub.schedule_matrix.recurring_days.join(', ')}
                    </p>
                    {role === 'farmer' && (
                      <p className="text-xs text-slate-500 mt-1">
                        <strong>Buyer:</strong> {sub.buyer_profile.name} (ID: {sub.buyer_profile.buyer_id})
                      </p>
                    )}
                  </div>
                  <div className="text-right space-y-2">
                    <div className="text-sm font-black text-slate-800">
                      ₹{sub.billing_summary.weekly_estimate.toFixed(2)} <span className="text-[10px] text-slate-400 font-medium">/ week</span>
                    </div>
                    {sub.billing_summary.discount_applied_pct > 0 && (
                      <div className="text-[10px] text-emerald-600 font-bold">10% Volume Discount!</div>
                    )}

                    {/* Farmer: Accept / Reject buttons for PENDING */}
                    {role === 'farmer' && sub.approval_status === 'PENDING' && (
                      <div className="flex gap-2 justify-end mt-2">
                        <button
                          disabled={respondingId === sub.subscription_id}
                          onClick={() => handleRespond(sub.subscription_id, true)}
                          className="flex items-center gap-1 text-xs font-bold px-4 py-1.5 rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                        >
                          {respondingId === sub.subscription_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                          Accept
                        </button>
                        <button
                          disabled={respondingId === sub.subscription_id}
                          onClick={() => handleRespond(sub.subscription_id, false)}
                          className="flex items-center gap-1 text-xs font-bold px-4 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Reject
                        </button>
                      </div>
                    )}

                    {/* Buyer: Pause/Resume for ACCEPTED */}
                    {role === 'buyer' && sub.approval_status === 'ACCEPTED' && (
                      <button 
                        onClick={() => handleToggleSubscription(sub.subscription_id, sub.is_active)}
                        className={`text-xs font-bold px-4 py-1.5 rounded-lg border ${sub.is_active ? 'border-rose-200 text-rose-600 hover:bg-rose-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}
                      >
                        {sub.is_active ? 'Pause Schedule' : 'Resume Schedule'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default SubscriptionWidget;
