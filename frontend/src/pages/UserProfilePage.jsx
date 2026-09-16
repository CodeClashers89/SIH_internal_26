import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import FarmerProfileSection from '../components/FarmerProfileSection';
import { 
  User, Mail, Phone, MapPin, Building, Award, CheckCircle, 
  ShieldCheck, Loader2, Save, Pencil, X, Lock, RefreshCw
} from 'lucide-react';

const UserProfilePage = () => {
  const { user, setUser } = useAuth();

  // Profile Form States
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [district, setDistrict] = useState(user?.district || '');
  const [pincode, setPincode] = useState(user?.pincode || '');
  const [farmSize, setFarmSize] = useState(user?.farm_size || '');
  const [cropsGrown, setCropsGrown] = useState(user?.crops_grown || '');
  const [farmCoordinates, setFarmCoordinates] = useState(user?.farm_coordinates || '');
  const [vehicleNumber, setVehicleNumber] = useState(user?.vehicle_number || '');
  const [vehicleType, setVehicleType] = useState(user?.vehicle_type || 'tempo');
  const [capacity, setCapacity] = useState(user?.capacity || '');
  const [serviceArea, setServiceArea] = useState(user?.service_area || '');

  // Wholesaler / Bulk Buyer specific fields
  const [businessName, setBusinessName] = useState(user?.business_name || '');
  const [businessType, setBusinessType] = useState(user?.business_type || 'wholesaler');
  const [gstNumber, setGstNumber] = useState(user?.gst_number || '');

  // UI States
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Mode Toggle
  const [isEditing, setIsEditing] = useState(false);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400">
        Please log in to view your profile.
      </div>
    );
  }

  // If user is a farmer, restore the original rich FarmerProfileSection UI/UX
  if (user.role === 'farmer') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <FarmerProfileSection />
      </div>
    );
  }

  const handleCancelEdit = () => {
    // Revert form state back to user data
    setEmail(user?.email || '');
    setPhone(user?.phone || '');
    setAddress(user?.address || '');
    setDistrict(user?.district || '');
    setPincode(user?.pincode || '');
    setBusinessName(user?.business_name || '');
    setBusinessType(user?.business_type || 'wholesaler');
    setGstNumber(user?.gst_number || '');
    setFarmSize(user?.farm_size || '');
    setCropsGrown(user?.crops_grown || '');
    setFarmCoordinates(user?.farm_coordinates || '');
    setVehicleNumber(user?.vehicle_number || '');
    setVehicleType(user?.vehicle_type || 'tempo');
    setCapacity(user?.capacity || '');
    setServiceArea(user?.service_area || '');
    
    setError('');
    setIsEditing(false);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    const payload = {
      email,
      phone,
      address,
      district,
      pincode,
      business_name: businessName,
      business_type: businessType,
      gst_number: gstNumber,
      farm_size: farmSize,
      crops_grown: cropsGrown,
      farm_coordinates: farmCoordinates,
      vehicle_number: vehicleNumber,
      vehicle_type: vehicleType,
      capacity,
      service_area: serviceArea,
    };

    try {
      const response = await api.patch('/users/profile/', payload);
      const updatedUser = response.data.user;
      
      // Update AuthContext & localStorage
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      setMessage('Profile details updated successfully!');
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'bulk_buyer': return { label: '🏢 Bulk Buyer / Wholesaler', color: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 'farmer': return { label: '🌾 Verified Farmer / FPO', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'consumer': return { label: '🛒 Retail Consumer', color: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'logistics_partner': return { label: '🚚 Logistics Partner', color: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'admin': return { label: '🛡️ System Administrator', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' };
      default: return { label: role, color: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  const roleInfo = getRoleBadge(user.role);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      
      {/* Profile Header */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-purple-500/20">
            {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-slate-800">{user.username}</h1>
              <span className={`text-xs font-bold px-3 py-1 rounded-full border ${roleInfo.color}`}>
                {roleInfo.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>OTP Verified Account</span>
              <span>•</span>
              <span>Joined {new Date(user.date_joined || Date.now()).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
            </p>
          </div>
        </div>

        {/* Edit / Protection Toggle Button */}
        <div className="flex items-center gap-3">
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-2xl shadow-sm shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Pencil className="h-4 w-4" />
              Edit Profile Info
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
                ✏️ Edit Mode Unlocked
              </span>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          {message}
        </div>
      )}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs font-bold text-rose-700">
          {error}
        </div>
      )}

      {/* Profile Details Form */}
      <form onSubmit={handleSaveProfile} className="space-y-8">
        
        {/* Section 1: Account Credentials & Contact Details */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
            <div>
              <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
                <User className="h-4 w-4 text-emerald-600" />
                Account Credentials & Contact Information
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Basic authentication details registered during signup.</p>
            </div>
            {!isEditing && (
              <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                <Lock className="h-3 w-3 text-slate-400" /> Read-Only
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-500 font-bold mb-1 uppercase text-[10px]">Username</label>
              <input
                type="text"
                disabled
                value={user.username}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-100 text-slate-500 font-bold cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-slate-500 font-bold mb-1 uppercase text-[10px]">Email Address</label>
              {isEditing ? (
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 border border-emerald-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
                />
              ) : (
                <div className="px-3 py-2.5 border border-slate-200/70 rounded-xl bg-slate-50/70 text-slate-800 font-semibold">
                  {email || 'Not provided'}
                </div>
              )}
            </div>
            <div>
              <label className="block text-slate-500 font-bold mb-1 uppercase text-[10px]">Phone Number</label>
              {isEditing ? (
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2.5 border border-emerald-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
                />
              ) : (
                <div className="px-3 py-2.5 border border-slate-200/70 rounded-xl bg-slate-50/70 text-slate-800 font-semibold">
                  {phone || 'Not provided'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Wholesaler & Business Verification Details */}
        {user.role === 'bulk_buyer' && (
          <div className="bg-white border border-purple-100 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="border-b border-purple-100 pb-3 flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
                  <Building className="h-4 w-4 text-purple-600" />
                  Wholesaler & Business Verification Details
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Details filled during wholesaler registration.</p>
              </div>
              {!isEditing && (
                <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 bg-purple-50/60 text-purple-700 px-2.5 py-1 rounded-full border border-purple-100">
                  <Lock className="h-3 w-3" /> Read-Only Protection
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[10px]">Business Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    placeholder="e.g. FreshMart Wholesalers Ltd"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full px-3 py-2.5 border border-purple-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-medium"
                  />
                ) : (
                  <div className="px-3 py-2.5 border border-slate-200/70 rounded-xl bg-slate-50/70 text-slate-800 font-bold">
                    {businessName || 'Not provided'}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[10px]">Business Type</label>
                {isEditing ? (
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    className="w-full px-3 py-2.5 border border-purple-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-medium capitalize"
                  >
                    <option value="retailer">Retailer</option>
                    <option value="wholesaler">Wholesaler</option>
                    <option value="exporter">Exporter</option>
                    <option value="processor">Processor</option>
                  </select>
                ) : (
                  <div className="px-3 py-2.5 border border-slate-200/70 rounded-xl bg-slate-50/70 text-purple-900 font-bold capitalize">
                    {businessType || 'Wholesaler'}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[10px]">GSTIN Number</label>
                {isEditing ? (
                  <input
                    type="text"
                    placeholder="e.g. 24AAAAB1111C1Z1"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value)}
                    className="w-full px-3 py-2.5 border border-purple-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-mono font-bold"
                  />
                ) : (
                  <div className="px-3 py-2.5 border border-slate-200/70 rounded-xl bg-slate-50/70 text-slate-800 font-mono font-bold">
                    {gstNumber || 'Not provided'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Farmer Specific Details */}
        {user.role === 'farmer' && (
          <div className="bg-white border border-emerald-100 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="border-b border-emerald-100 pb-3 flex justify-between items-center">
              <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
                <Award className="h-4 w-4 text-emerald-600" />
                Farmer Onboarding Details
              </h3>
              {!isEditing && (
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 flex items-center gap-1 font-semibold">
                  <Lock className="h-3 w-3" /> Read-Only
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[10px]">Farm Size (Acres)</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={farmSize}
                    onChange={(e) => setFarmSize(e.target.value)}
                    className="w-full px-3 py-2.5 border border-emerald-300 rounded-xl bg-white"
                  />
                ) : (
                  <div className="px-3 py-2.5 border border-slate-200/70 rounded-xl bg-slate-50/70 text-slate-800 font-semibold">
                    {farmSize || 'Not provided'}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[10px]">Crops Grown</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={cropsGrown}
                    onChange={(e) => setCropsGrown(e.target.value)}
                    className="w-full px-3 py-2.5 border border-emerald-300 rounded-xl bg-white"
                  />
                ) : (
                  <div className="px-3 py-2.5 border border-slate-200/70 rounded-xl bg-slate-50/70 text-slate-800 font-semibold">
                    {cropsGrown || 'Not provided'}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[10px]">Farm Coordinates</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={farmCoordinates}
                    onChange={(e) => setFarmCoordinates(e.target.value)}
                    className="w-full px-3 py-2.5 border border-emerald-300 rounded-xl bg-white"
                  />
                ) : (
                  <div className="px-3 py-2.5 border border-slate-200/70 rounded-xl bg-slate-50/70 text-slate-800 font-semibold">
                    {farmCoordinates || 'Not provided'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Logistics Specific Details */}
        {user.role === 'logistics_partner' && (
          <div className="bg-white border border-amber-100 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="border-b border-amber-100 pb-3 flex justify-between items-center">
              <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
                <Building className="h-4 w-4 text-amber-600" />
                Delivery Fleet & Vehicle Details
              </h3>
              {!isEditing && (
                <span className="text-[10px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100 flex items-center gap-1 font-semibold">
                  <Lock className="h-3 w-3" /> Read-Only
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[10px]">Vehicle Number</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    className="w-full px-3 py-2.5 border border-amber-300 rounded-xl bg-white"
                  />
                ) : (
                  <div className="px-3 py-2.5 border border-slate-200/70 rounded-xl bg-slate-50/70 text-slate-800 font-semibold">
                    {vehicleNumber || 'Not provided'}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[10px]">Vehicle Type</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full px-3 py-2.5 border border-amber-300 rounded-xl bg-white"
                  />
                ) : (
                  <div className="px-3 py-2.5 border border-slate-200/70 rounded-xl bg-slate-50/70 text-slate-800 font-semibold">
                    {vehicleType || 'Not provided'}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[10px]">Payload Capacity (kg)</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full px-3 py-2.5 border border-amber-300 rounded-xl bg-white"
                  />
                ) : (
                  <div className="px-3 py-2.5 border border-slate-200/70 rounded-xl bg-slate-50/70 text-slate-800 font-semibold">
                    {capacity || 'Not provided'}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[10px]">Service Area Pincodes</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={serviceArea}
                    onChange={(e) => setServiceArea(e.target.value)}
                    className="w-full px-3 py-2.5 border border-amber-300 rounded-xl bg-white"
                  />
                ) : (
                  <div className="px-3 py-2.5 border border-slate-200/70 rounded-xl bg-slate-50/70 text-slate-800 font-semibold">
                    {serviceArea || 'Not provided'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Registered Shipping & Warehouse Location */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
            <div>
              <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-600" />
                Registered Warehouse / Shipping Address
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Used for calculating transport charges and delivery routing.</p>
            </div>
            {!isEditing && (
              <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                <Lock className="h-3 w-3 text-slate-400" /> Read-Only
              </span>
            )}
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-500 font-bold mb-1 uppercase text-[10px]">Street Address</label>
              {isEditing ? (
                <textarea
                  rows="2"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2.5 border border-emerald-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
                />
              ) : (
                <div className="px-3 py-2.5 border border-slate-200/70 rounded-xl bg-slate-50/70 text-slate-800 font-medium leading-relaxed">
                  {address || 'Not provided'}
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[10px]">District</label>
                {isEditing ? (
                  <input
                    type="text"
                    required
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-3 py-2.5 border border-emerald-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
                  />
                ) : (
                  <div className="px-3 py-2.5 border border-slate-200/70 rounded-xl bg-slate-50/70 text-slate-800 font-semibold">
                    {district || 'Not provided'}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[10px]">Pincode</label>
                {isEditing ? (
                  <input
                    type="text"
                    required
                    maxLength="6"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="w-full px-3 py-2.5 border border-emerald-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
                  />
                ) : (
                  <div className="px-3 py-2.5 border border-slate-200/70 rounded-xl bg-slate-50/70 text-slate-800 font-semibold">
                    {pincode || 'Not provided'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Submit Actions (Only visible when Edit Mode is Unlocked) */}
        {isEditing && (
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleCancelEdit}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm px-5 py-3 rounded-2xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm px-6 py-3 rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Save Profile Changes
                </>
              )}
            </button>
          </div>
        )}

      </form>
    </div>
  );
};

export default UserProfilePage;
