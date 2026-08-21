import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sprout, Phone, Lock, User, Mail, MapPin, Loader2, ArrowRight } from 'lucide-react';

const LoginSignup = () => {
  const { login, register, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') || 'consumer';

  // Toggle View
  const [isLogin, setIsLogin] = useState(true);
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  // Form Fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [district, setDistrict] = useState('');
  const [role, setRole] = useState(initialRole);
  
  // OTP Verification Field
  const [otp, setOtp] = useState('');

  // Role Specific Onboarding Fields
  const [farmSize, setFarmSize] = useState('');
  const [cropsGrown, setCropsGrown] = useState('');
  const [farmCoordinates, setFarmCoordinates] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('retailer');
  const [gstNumber, setGstNumber] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('tempo');
  const [capacity, setCapacity] = useState('');
  const [serviceArea, setServiceArea] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setAuthLoading(true);
    
    const result = await login(username, password);
    setAuthLoading(false);

    if (result.success) {
      // Redirect based on role
      const userRole = result.user.role;
      if (userRole === 'farmer') navigate('/farmer-dashboard');
      else if (userRole === 'bulk_buyer') navigate('/bulk-portal');
      else if (userRole === 'logistics_partner') navigate('/logistics-dashboard');
      else if (userRole === 'admin') navigate('/admin-panel');
      else navigate('/marketplace');
    } else {
      setErrorMessage(result.error);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setAuthLoading(true);

    const payload = {
      username,
      password,
      email,
      role,
      phone,
      address,
      pincode,
      district,
      farm_size: farmSize || null,
      crops_grown: cropsGrown || null,
      farm_coordinates: farmCoordinates || null,
      business_name: businessName || null,
      business_type: businessType || null,
      gst_number: gstNumber || null,
      vehicle_number: vehicleNumber || null,
      vehicle_type: vehicleType || null,
      capacity: capacity || null,
      service_area: serviceArea || null
    };

    const result = await register(payload);
    setAuthLoading(false);

    if (result.success) {
      setInfoMessage(`Registration initiated. Please enter the OTP sent to ${phone}.`);
      setShowOtpScreen(true);
    } else {
      // Parse multi-field serializer error objects
      if (typeof result.error === 'object') {
        const errorMsg = Object.entries(result.error)
          .map(([key, val]) => `${key.toUpperCase()}: ${val.join(', ')}`)
          .join(' | ');
        setErrorMessage(errorMsg);
      } else {
        setErrorMessage(result.error || 'Signup failed.');
      }
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setAuthLoading(true);

    const result = await verifyOtp(phone, otp);
    setAuthLoading(false);

    if (result.success) {
      alert('Verification successful! You can now log into your account.');
      setShowOtpScreen(false);
      setIsLogin(true);
      setInfoMessage('Account verified successfully. Please log in.');
    } else {
      setErrorMessage(result.error);
    }
  };

  return (
    <div className="min-height-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-tr from-emerald-50 via-green-50/20 to-amber-50/30">
      <div className="max-w-md w-full bg-white border border-slate-100 p-8 rounded-3xl shadow-lg space-y-6">
        
        {/* Brand header */}
        <div className="text-center">
          <div className="flex justify-center mb-2">
            <Sprout className="h-10 w-10 text-emerald-600 animate-pulse-soft" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-800">
            {showOtpScreen ? 'Account Verification' : isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            {showOtpScreen ? 'Direct Connection Verification Gateway' : 'Connecting rural producers directly with retail & bulk buyers'}
          </p>
        </div>

        {/* Global info and error boxes */}
        {infoMessage && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-800 font-semibold leading-relaxed">
            {infoMessage}
          </div>
        )}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-xs text-rose-600 font-semibold leading-relaxed">
            {errorMessage}
          </div>
        )}

        {showOtpScreen ? (
          /* OTP Screen */
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-[10px] text-slate-500">
              <strong>💡 Demo Tip:</strong> Check your backend terminal for the generated mock OTP, or type the master test OTP <strong>123456</strong>.
            </div>

            <div className="relative">
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Enter 6-digit OTP</label>
              <input
                type="text"
                required
                maxLength="6"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full pl-3 pr-3 py-2.5 border border-slate-200 rounded-xl text-center font-bold tracking-[0.5em] text-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold py-3 rounded-xl shadow transition-all flex items-center justify-center gap-1"
            >
              {authLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Verify Account'}
            </button>
          </form>
        ) : isLogin ? (
          /* Login Form */
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="relative">
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Username</label>
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none mt-5">
                <User className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                required
                placeholder="farmer1 or consumer1"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="relative">
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Password</label>
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none mt-5">
                <Lock className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold py-3 rounded-xl shadow-md transition-all flex items-center justify-center"
            >
              {authLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Log In'}
            </button>

            <p className="text-xs text-center text-slate-500 mt-4">
              Don't have an account?{' '}
              <button 
                type="button" 
                onClick={() => { setIsLogin(false); setErrorMessage(''); }}
                className="text-emerald-600 font-bold hover:underline"
              >
                Sign Up
              </button>
            </p>
          </form>
        ) : (
          /* Signup Form */
          <form onSubmit={handleSignupSubmit} className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">Username</label>
                <input
                  type="text"
                  required
                  placeholder="john_doe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="relative">
                <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">Email</label>
                <input
                  type="email"
                  required
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="relative">
                <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">Phone Number</label>
                <input
                  type="tel"
                  required
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">Select User Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="consumer">Consumer (Buy Retail)</option>
                <option value="farmer">Farmer/FPO (Sell Produce)</option>
                <option value="bulk_buyer">Bulk Buyer (Buy Wholesale)</option>
                <option value="logistics_partner">Logistics Partner (Deliver Produce)</option>
              </select>
            </div>

            {/* Conditionally Render Farmer Fields */}
            {role === 'farmer' && (
              <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100/50 space-y-3">
                <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Farmer Onboarding details</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Farm Size (Acres)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 5.5"
                      value={farmSize}
                      onChange={(e) => setFarmSize(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Crops Grown</label>
                    <input
                      type="text"
                      placeholder="e.g. Wheat, Tomato"
                      value={cropsGrown}
                      onChange={(e) => setCropsGrown(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Farm Location coordinates</label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      placeholder="e.g. 23.0225, 72.5714"
                      value={farmCoordinates}
                      onChange={(e) => setFarmCoordinates(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition((pos) => {
                            setFarmCoordinates(`${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`);
                          });
                        } else {
                          alert("Geolocation not supported");
                        }
                      }}
                      className="bg-emerald-600 text-white px-2 py-1 rounded text-[10px] font-semibold hover:bg-emerald-700 active:scale-95 transition-all"
                    >
                      Locate
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Conditionally Render Bulk Buyer Fields */}
            {role === 'bulk_buyer' && (
              <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100/50 space-y-3">
                <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Wholesaler Verification details</p>
                <div>
                  <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Business Name</label>
                  <input
                    type="text"
                    placeholder="e.g. FreshMart Distributors"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Business Type</label>
                    <select
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                    >
                      <option value="retailer">Retailer</option>
                      <option value="wholesaler">Wholesaler</option>
                      <option value="exporter">Exporter</option>
                      <option value="processor">Processor</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-600 mb-0.5">GSTIN Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 24AAAAB1111C1Z1"
                      value={gstNumber}
                      onChange={(e) => setGstNumber(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Conditionally Render Logistics Partner Fields */}
            {role === 'logistics_partner' && (
              <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100/50 space-y-3">
                <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Delivery Fleet details</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Vehicle Number</label>
                    <input
                      type="text"
                      placeholder="e.g. MH12AB1234"
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Vehicle Type</label>
                    <select
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    >
                      <option value="tempo">Tempo (Chota Hathi)</option>
                      <option value="truck">Large Truck</option>
                      <option value="tractor">Tractor</option>
                      <option value="motorcycle">Motorcycle (Local)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Payload capacity (kg)</label>
                    <input
                      type="number"
                      placeholder="e.g. 1500"
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Service Pincodes</label>
                    <input
                      type="text"
                      placeholder="e.g. 411001, 411002"
                      value={serviceArea}
                      onChange={(e) => setServiceArea(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="border-t border-slate-100 pt-3">
              <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">Address (Warehouse / Shipping)</label>
              <textarea
                rows="2"
                required
                placeholder="Street address, Village/Town"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">District</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pune"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">Pincode</label>
                <input
                  type="text"
                  required
                  maxLength="6"
                  placeholder="e.g. 411001"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-1 mt-2"
            >
              {authLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                <>
                  Register & Request OTP
                  <ArrowRight className="h-4.5 w-4.5" />
                </>
              )}
            </button>

            <p className="text-xs text-center text-slate-500 mt-4">
              Already have an account?{' '}
              <button 
                type="button" 
                onClick={() => { setIsLogin(true); setErrorMessage(''); }}
                className="text-emerald-600 font-bold hover:underline"
              >
                Log In
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginSignup;
