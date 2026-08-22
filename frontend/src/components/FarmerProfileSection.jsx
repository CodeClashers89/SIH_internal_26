import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { 
  User, CheckCircle, Smartphone, MapPin, 
  Leaf, Trees, Award, TrendingUp, Star,
  ShieldCheck, Banknote, Edit3, X, Loader2,
  Info, Image as ImageIcon, Map, Building2, Truck
} from 'lucide-react';

const FarmerProfileSection = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Edit form state
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/v1/farmer/profile/');
      setProfile(res.data);
      setFormData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load profile');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleListChange = (e, field) => {
    const value = e.target.value;
    const list = value.split(',').map(c => c.trim()).filter(c => c);
    setFormData(prev => ({ ...prev, [field]: list }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/v1/farmer/profile/', formData);
      setProfile(res.data);
      setFormData(res.data);
      setIsEditModalOpen(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update profile');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100">
        {error || 'Failed to load profile'}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 p-2 rounded-xl text-emerald-700">
            <User className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">My Farm Profile</h2>
            <p className="text-xs text-slate-500">Public visibility & buyer trust signals</p>
          </div>
        </div>
        <button
          onClick={() => setIsEditModalOpen(true)}
          className="flex items-center gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 font-bold px-5 py-2.5 rounded-xl text-sm shadow-md transition-all transform hover:-translate-y-0.5"
        >
          <Edit3 className="h-4 w-4" /> Edit Profile
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COL 1 & 2: Identity, Certs, Gallery */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Identity & Location Card */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs relative overflow-hidden">
            {/* Decorative background circle */}
            <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 rounded-full bg-emerald-50/50 pointer-events-none"></div>
            
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="h-28 w-28 rounded-2xl bg-slate-100 border-4 border-white shadow-md flex items-center justify-center shrink-0 overflow-hidden relative z-10">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-12 w-12 text-slate-400" />
                )}
              </div>
              <div className="flex-1 space-y-3 relative z-10 w-full">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                    {profile.full_name || profile.username}
                  </h3>
                  {profile.farm_name && (
                    <div className="text-emerald-700 font-bold text-sm mt-0.5 flex items-center gap-1.5">
                      <Trees className="h-4 w-4" /> {profile.farm_name}
                    </div>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-2 text-sm mt-3">
                    <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg text-slate-700 font-medium">
                      <Smartphone className="h-4 w-4 text-emerald-600" /> {profile.phone}
                      {profile.is_verified && <CheckCircle className="h-3.5 w-3.5 text-emerald-500" title="Phone Verified" />}
                    </span>
                    {profile.alternate_whatsapp && (
                      <span className="flex items-center gap-1.5 bg-green-50 border border-green-100 px-2.5 py-1 rounded-lg text-green-800 font-medium">
                        WhatsApp: {profile.alternate_whatsapp}
                        <CheckCircle className="h-3.5 w-3.5 text-green-500" title="WhatsApp Verified" />
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col sm:flex-row gap-4 items-start sm:items-center mt-2">
                  <div className="flex items-start gap-2 flex-1">
                    <MapPin className="h-5 w-5 mt-0.5 text-blue-500 shrink-0" />
                    <div>
                      <div className="text-sm font-semibold text-slate-800">
                        {profile.village ? `${profile.village}, ` : ''}{profile.taluka}
                      </div>
                      <div className="text-xs text-slate-500">
                        {profile.district ? `${profile.district}, ` : ''}{profile.state} {profile.pincode}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-100">
                    <Map className="h-3.5 w-3.5" /> Geo-Verified ✅
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Farming Practices & Commercial Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                <Leaf className="h-5 w-5 text-emerald-500" />
                Farming Practices
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-sm font-medium text-slate-700">Land Size</span>
                  <span className="text-sm font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    {profile.farm_size_value} {profile.farm_size_unit}
                  </span>
                </div>
                
                <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-sm font-medium text-slate-700">Farming Type</span>
                  <span className="text-sm font-bold text-emerald-700 capitalize">
                    {profile.soil_farming_type}
                  </span>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <div className={`flex items-center gap-2 text-sm font-semibold p-2 rounded-lg ${profile.soil_health_verified ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'text-slate-400'}`}>
                    <CheckCircle className={`h-4 w-4 ${profile.soil_health_verified ? 'text-emerald-500' : ''}`} />
                    Soil Health Card Verified
                  </div>
                  <div className={`flex items-center gap-2 text-sm font-semibold p-2 rounded-lg ${profile.zero_chemicals ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'text-slate-400'}`}>
                    <CheckCircle className={`h-4 w-4 ${profile.zero_chemicals ? 'text-emerald-500' : ''}`} />
                    Zero Chemical Pesticides
                  </div>
                  <div className={`flex items-center gap-2 text-sm font-semibold p-2 rounded-lg ${profile.irrigation_source === 'drip' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}>
                    <CheckCircle className={`h-4 w-4 ${profile.irrigation_source === 'drip' ? 'text-blue-500' : 'text-slate-400'}`} />
                    {profile.irrigation_source === 'drip' ? 'Drip Irrigated' : `Irrigation: ${profile.irrigation_source}`}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                <Building2 className="h-5 w-5 text-indigo-500" />
                Commercial Highlights
              </h3>
              
              <div className="space-y-4">
                {profile.regular_supplier_to > 0 && (
                  <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl flex items-center gap-3">
                    <div className="bg-indigo-100 p-2 rounded-lg">
                      <Truck className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <div className="text-xs text-indigo-600 font-bold uppercase tracking-wider">Trusted Supplier</div>
                      <div className="text-sm font-semibold text-indigo-900">Supplying to {profile.regular_supplier_to} Regular Partners</div>
                    </div>
                  </div>
                )}
                
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Production Capacity</span>
                  <div className="text-sm font-bold text-slate-800 bg-slate-50 border border-slate-100 px-3 py-2 rounded-lg">
                    {profile.production_capacity || 'Not specified'}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Primary Crops</span>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.primary_crops?.length > 0 ? (
                      profile.primary_crops.map((crop, idx) => (
                        <span key={idx} className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-md text-xs font-bold border border-emerald-200">
                          {crop}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-400">None specified</span>
                    )}
                  </div>
                </div>
                
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Seasons</span>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.production_seasons?.length > 0 ? (
                      profile.production_seasons.map((season, idx) => (
                        <span key={idx} className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-md text-xs font-bold border border-amber-200">
                          {season}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-400">None specified</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Farm Gallery Carousel */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
              <ImageIcon className="h-5 w-5 text-purple-500" />
              Farm Gallery
            </h3>
            
            {profile.gallery_images?.length > 0 ? (
              <div className="flex overflow-x-auto gap-4 pb-2 snap-x">
                {profile.gallery_images.map((img, idx) => (
                  <div key={idx} className="min-w-[200px] h-32 rounded-xl overflow-hidden shadow-sm shrink-0 snap-start border border-slate-200">
                    <img src={img} alt={`Farm gallery ${idx + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl h-32 flex flex-col items-center justify-center text-slate-400">
                <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
                <span className="text-sm font-medium">No farm photos uploaded</span>
              </div>
            )}
          </div>

        </div>

        {/* COL 3: Trust Score & Bank */}
        <div className="space-y-6">
          
          {/* Trust Score Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden group">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-colors"></div>
            
            <div className="flex items-center justify-between mb-4 relative z-10">
              <h3 className="font-bold flex items-center gap-2 text-slate-100">
                <Award className="h-5 w-5 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" /> Trust Score
                <div className="group/tooltip relative cursor-help">
                  <Info className="h-4 w-4 text-slate-400 hover:text-slate-200" />
                  <div className="absolute hidden group-hover/tooltip:block w-48 bg-slate-800 border border-slate-600 text-xs p-2 rounded-lg -left-20 top-6 shadow-xl z-50 pointer-events-none">
                    Score is calculated based on on-time deliveries, buyer freshness ratings, and successful order completions over the last 90 days.
                  </div>
                </div>
              </h3>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-${profile.trust_color}-500/20 text-${profile.trust_color}-400 border border-${profile.trust_color}-500/40 shadow-[0_0_10px_rgba(var(--color-${profile.trust_color}-500),0.2)]`}>
                {profile.trust_tier}
              </span>
            </div>
            
            <div className="flex flex-col items-center justify-center py-4 relative z-10">
              {/* Fake circular gauge */}
              <div className="relative w-32 h-32 flex items-center justify-center rounded-full border-4 border-slate-700">
                <div className="absolute inset-0 rounded-full border-4 border-amber-400" style={{ clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0)`, transform: `rotate(${(profile.trust_score / 100) * 360 - 90}deg)` }}></div>
                <div className="flex flex-col items-center">
                  <span className="text-4xl font-black text-white">{profile.trust_score}</span>
                  <span className="text-[10px] text-slate-400 font-bold tracking-wider">/ 100</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 mt-4 relative z-10 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-300 flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-blue-400" /> Total Trips</span>
                <span className="font-bold">{profile.total_trips}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-300 flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-emerald-400" /> On-Time Rate</span>
                <span className="font-bold text-emerald-300">{profile.ontime_rate}%</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-300 flex items-center gap-1.5"><Leaf className="h-4 w-4 text-green-400" /> Avg Freshness</span>
                <span className="font-bold text-green-300">{profile.avg_freshness}%</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-300 flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-indigo-400" /> Dispute-Free</span>
                <span className="font-bold text-indigo-300">{profile.dispute_free_rate}%</span>
              </div>
              <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-700 mt-2">
                <span className="text-slate-300 flex items-center gap-1.5"><Star className="h-4 w-4 text-amber-400" /> Avg Rating</span>
                <span className="font-bold flex items-center gap-1">
                  {profile.avg_rating} <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span className="text-[10px] text-slate-400 ml-1">({profile.rating_count})</span>
                </span>
              </div>
            </div>
          </div>

          {/* KYC Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs relative overflow-hidden">
            {profile.govt_id_verified && (
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-50 rounded-full border border-emerald-100 flex items-end justify-start p-4">
                <CheckCircle className="h-6 w-6 text-emerald-500" />
              </div>
            )}
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4 relative z-10">
              <ShieldCheck className={`h-5 w-5 ${profile.govt_id_verified ? 'text-emerald-500' : 'text-slate-400'}`} /> 
              KYC Status
            </h3>
            <div className="flex items-center justify-between relative z-10">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Govt ID ({profile.govt_id_type})</span>
                <span className="text-sm font-medium text-slate-700">{profile.govt_id_number ? `XXXX-XXXX-${profile.govt_id_number.slice(-4)}` : 'Not provided'}</span>
              </div>
              <div>
                {profile.govt_id_verified ? (
                  <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm">
                    Verified
                  </span>
                ) : (
                  <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-lg text-xs font-bold">
                    Pending
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Bank & Payouts Card */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Banknote className="h-5 w-5 text-blue-500" /> Payout Details
              </h3>
              <ShieldCheck className="h-5 w-5 text-slate-300" />
            </div>
            
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Account Name</span>
                <span className="text-sm font-semibold text-slate-800">{profile.bank_account_name || 'Not set'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Account Number</span>
                <span className="text-sm font-mono font-bold text-slate-700 bg-slate-200/50 px-2 py-0.5 rounded inline-block mt-0.5">{profile.masked_account_number || 'Not set'}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 mt-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">IFSC Code</span>
                  <span className="text-sm font-semibold text-slate-800">{profile.ifsc_code || 'Not set'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">UPI ID</span>
                  <span className="text-sm font-semibold text-slate-800">{profile.upi_id || 'Not set'}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Slide-over Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={() => setIsEditModalOpen(false)} />
          
          <div className="fixed inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl flex flex-col transform transition-transform animate-slide-left">
            
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Edit3 className="h-5 w-5 text-emerald-600" /> Edit Farm Profile</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-red-500 bg-white p-1.5 rounded-lg border border-slate-200 transition-colors shadow-sm">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
              <form id="profile-form" onSubmit={handleSave} className="space-y-8">
                
                {/* Personal & Farm Info */}
                <div className="space-y-4">
                  <h3 className="font-black text-slate-800 text-sm border-b border-slate-100 pb-2 uppercase tracking-wide">Identity</h3>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Full Name</label>
                    <input type="text" name="full_name" value={formData.full_name || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow" />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Farm Name</label>
                    <input type="text" name="farm_name" value={formData.farm_name || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow" placeholder="e.g. Patel Organic Farms" />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Avatar URL</label>
                    <input type="url" name="avatar_url" value={formData.avatar_url || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="https://..." />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Alternate WhatsApp</label>
                    <input type="text" name="alternate_whatsapp" value={formData.alternate_whatsapp || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none" />
                  </div>
                </div>

                {/* Location & Land */}
                <div className="space-y-4">
                  <h3 className="font-black text-slate-800 text-sm border-b border-slate-100 pb-2 uppercase tracking-wide">Location & Land</h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Village</label>
                      <input type="text" name="village" value={formData.village || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Taluka</label>
                      <input type="text" name="taluka" value={formData.taluka || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">State</label>
                      <input type="text" name="state" value={formData.state || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Farm Size</label>
                      <div className="flex gap-1">
                        <input type="number" step="0.01" name="farm_size_value" value={formData.farm_size_value || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-l-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none" />
                        <select name="farm_size_unit" value={formData.farm_size_unit || 'acres'} onChange={handleInputChange} className="px-2 py-2 border border-slate-200 rounded-r-lg text-sm bg-slate-50 outline-none">
                          <option value="acres">Acres</option>
                          <option value="bigha">Bigha</option>
                          <option value="hectares">Hectares</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Practices & Certifications */}
                <div className="space-y-4">
                  <h3 className="font-black text-slate-800 text-sm border-b border-slate-100 pb-2 uppercase tracking-wide">Farming Practices</h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Farming Type</label>
                      <select name="soil_farming_type" value={formData.soil_farming_type || 'conventional'} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none">
                        <option value="organic">Organic</option>
                        <option value="natural">Natural</option>
                        <option value="conventional">Conventional</option>
                        <option value="mixed">Mixed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Irrigation</label>
                      <select name="irrigation_source" value={formData.irrigation_source || 'well'} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none">
                        <option value="drip">Drip</option>
                        <option value="canal">Canal</option>
                        <option value="well">Well/Borewell</option>
                        <option value="rainfed">Rainfed</option>
                        <option value="sprinkler">Sprinkler</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" name="soil_health_verified" checked={formData.soil_health_verified || false} onChange={handleInputChange} className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4" />
                      <span className="text-sm font-medium text-slate-700">Soil Health Card Verified</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" name="zero_chemicals" checked={formData.zero_chemicals || false} onChange={handleInputChange} className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4" />
                      <span className="text-sm font-medium text-slate-700">Zero Chemical Pesticides Used</span>
                    </label>
                  </div>
                </div>
                
                {/* Commercial */}
                <div className="space-y-4">
                  <h3 className="font-black text-slate-800 text-sm border-b border-slate-100 pb-2 uppercase tracking-wide">Commercial & Produce</h3>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Production Capacity</label>
                    <input type="text" name="production_capacity" value={formData.production_capacity || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="e.g. 500kg / week" />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Primary Crops (comma separated)</label>
                    <input type="text" value={formData.primary_crops?.join(', ') || ''} onChange={(e) => handleListChange(e, 'primary_crops')} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="Tomato, Cotton, Onion" />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Seasons (comma separated)</label>
                    <input type="text" value={formData.production_seasons?.join(', ') || ''} onChange={(e) => handleListChange(e, 'production_seasons')} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="Rabi, Kharif" />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Gallery Image URLs (comma separated)</label>
                    <textarea value={formData.gallery_images?.join(',\n') || ''} onChange={(e) => handleListChange(e, 'gallery_images')} rows="3" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="https://image1.jpg,&#10;https://image2.jpg" />
                  </div>
                </div>

                {/* Bank Details */}
                <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <h3 className="font-black text-slate-800 text-sm border-b border-slate-200 pb-2 uppercase tracking-wide flex items-center gap-2"><Banknote className="h-4 w-4" /> Payout Details</h3>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Account Name</label>
                    <input type="text" name="bank_account_name" value={formData.bank_account_name || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Account Number <span className="text-[10px] font-normal text-slate-400">(Masked on save)</span></label>
                    <input type="text" name="bank_account_number" value={formData.bank_account_number || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Enter full number to update" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">IFSC Code</label>
                      <input type="text" name="ifsc_code" value={formData.ifsc_code || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none uppercase" placeholder="ABCD0123456" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">UPI ID</label>
                      <input type="text" name="upi_id" value={formData.upi_id || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none" placeholder="name@bank" />
                    </div>
                  </div>
                </div>

                {/* KYC Info */}
                <div className="space-y-4">
                  <h3 className="font-black text-slate-800 text-sm border-b border-slate-100 pb-2 uppercase tracking-wide">Government ID</h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Govt ID Type</label>
                      <select name="govt_id_type" value={formData.govt_id_type || 'aadhaar'} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none">
                        <option value="aadhaar">Aadhaar</option>
                        <option value="kcc">Kisan Credit Card</option>
                        <option value="pmkisan">PM-Kisan ID</option>
                        <option value="voter">Voter ID</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">ID Number</label>
                      <input type="text" name="govt_id_number" value={formData.govt_id_number || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none" />
                    </div>
                  </div>
                </div>

              </form>
            </div>

            <div className="p-5 border-t border-slate-200 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <button 
                type="submit" 
                form="profile-form"
                disabled={saving}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-md transition-all flex justify-center items-center gap-2 transform hover:-translate-y-0.5"
              >
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save Profile Changes'}
              </button>
            </div>

          </div>
        </div>
      )}
      
    </div>
  );
};

export default FarmerProfileSection;
