import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../utils/api';
import { 
  MapPin, Loader2, Search, AlertTriangle, CheckCircle, 
  RefreshCw, Key, Navigation, ExternalLink, ShieldCheck,
  Building2, Sparkles, ChevronRight
} from 'lucide-react';

const DISTRICT_COORDINATES = {
  'ahmedabad': { latitude: 22.986745, longitude: 72.381290, label: 'Ahmedabad / Sanand, Gujarat' },
  'karnal': { latitude: 29.6857, longitude: 76.9905, label: 'Karnal, Haryana' },
  'vadodara': { latitude: 22.3072, longitude: 73.1812, label: 'Vadodara, Gujarat' },
  'surat': { latitude: 21.1702, longitude: 72.8311, label: 'Surat, Gujarat' },
  'rajkot': { latitude: 22.3039, longitude: 70.8022, label: 'Rajkot, Gujarat' },
  'pune': { latitude: 18.5204, longitude: 73.8567, label: 'Pune, Maharashtra' },
  'nashik': { latitude: 19.9975, longitude: 73.7898, label: 'Nashik, Maharashtra' },
  'panipat': { latitude: 29.3909, longitude: 76.9635, label: 'Panipat, Haryana' },
  'kurukshetra': { latitude: 29.9695, longitude: 76.8783, label: 'Kurukshetra, Haryana' },
  'anand': { latitude: 22.5645, longitude: 72.9289, label: 'Anand, Gujarat' },
  'kheda': { latitude: 22.6916, longitude: 72.8634, label: 'Kheda / Nadiad, Gujarat' },
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const NearestMandiExplorer = ({ markets: propMarkets = [], onSelectMarketOnMap, user, farmerProfile }) => {
  const [internalMarkets, setInternalMarkets] = useState([]);
  const [selectedLocationMode, setSelectedLocationMode] = useState('farm'); // 'farm' | 'gps'
  const [activeLocation, setActiveLocation] = useState(null);
  const [nearestMarket, setNearestMarket] = useState(null);
  const [distance, setDistance] = useState(null);
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState('');
  
  // Prices state
  const [prices, setPrices] = useState([]);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [uniqueCommodities, setUniqueCommodities] = useState([]);
  const [selectedCommodity, setSelectedCommodity] = useState('');
  const [commodityPrices, setCommodityPrices] = useState([]);

  // Agmarknet API Health & Key Management
  const [apiHealth, setApiHealth] = useState(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [newApiKey, setNewApiKey] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const [keyMessage, setKeyMessage] = useState({ text: '', type: '' });

  // 1. Resolve Farmer Location
  const farmerFarmLocation = useMemo(() => {
    // A) Check user.farm_coordinates (e.g. "22.986745, 72.381290")
    if (user?.farm_coordinates) {
      const parts = user.farm_coordinates.split(',').map(s => parseFloat(s.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return {
          latitude: parts[0],
          longitude: parts[1],
          label: `${user.username || 'Farmer'}'s Farm (${user.district || 'Registered Land'})`,
          address: user.address || `${user.district || ''}, India`
        };
      }
    }

    // B) Check district mapping
    const distKey = (user?.district || farmerProfile?.state || '').toLowerCase().trim();
    if (DISTRICT_COORDINATES[distKey]) {
      const d = DISTRICT_COORDINATES[distKey];
      return {
        latitude: d.latitude,
        longitude: d.longitude,
        label: `${user?.username || 'Farmer'}'s Farm (${d.label})`,
        address: user?.address || d.label
      };
    }

    // Default to Ahmedabad / Gujarat if user is neeraj_patel or in Gujarat
    return {
      latitude: 22.986745,
      longitude: 72.381290,
      label: "Neeraj Patel's Farm (Sanand, Ahmedabad)",
      address: user?.address || 'Patel Organic Agro Farms, Sanand Highway, Ahmedabad'
    };
  }, [user, farmerProfile]);

  // Ensure markets are available (fetch if propMarkets is empty)
  useEffect(() => {
    if (propMarkets && propMarkets.length > 0) {
      setInternalMarkets(propMarkets);
    } else {
      api.get('/market-prices/markets/')
        .then(res => {
          if (Array.isArray(res.data)) {
            setInternalMarkets(res.data);
          }
        })
        .catch(err => console.error("Failed to fetch markets list:", err));
    }
  }, [propMarkets]);

  // Fetch Agmarknet API status
  const fetchApiStatus = useCallback(async () => {
    try {
      const res = await api.get('/market-prices/status/');
      setApiHealth(res.data);
    } catch (err) {
      setApiHealth({
        status: 'error',
        healthy: false,
        message: 'Could not contact AGMARKNET status service.'
      });
    }
  }, []);

  useEffect(() => {
    fetchApiStatus();
  }, [fetchApiStatus]);

  // Find nearest market given a coordinate
  const locateNearestToCoord = useCallback((coord, allMarkets) => {
    setLocLoading(true);
    setLocError('');

    const targetMarkets = allMarkets && allMarkets.length > 0 ? allMarkets : internalMarkets;
    const validMarkets = targetMarkets.filter(m => m.latitude != null && m.longitude != null);

    if (validMarkets.length === 0) {
      // Retry fetching from backend if empty
      api.get('/market-prices/markets/')
        .then(res => {
          const freshMarkets = res.data.filter(m => m.latitude != null && m.longitude != null);
          if (freshMarkets.length > 0) {
            setInternalMarkets(res.data);
            locateNearestToCoord(coord, res.data);
          } else {
            setLocError('No active mandis found in the database. Please sync market data.');
            setLocLoading(false);
          }
        })
        .catch(() => {
          setLocError('Could not connect to markets database.');
          setLocLoading(false);
        });
      return;
    }

    let closest = null;
    let minDistance = Infinity;

    validMarkets.forEach(m => {
      const dist = calculateDistance(coord.latitude, coord.longitude, Number(m.latitude), Number(m.longitude));
      if (dist < minDistance) {
        minDistance = dist;
        closest = m;
      }
    });

    if (closest) {
      setNearestMarket(closest);
      setDistance(minDistance);
      setActiveLocation(coord);
      fetchMarketPrices(closest.id);

      if (onSelectMarketOnMap) {
        onSelectMarketOnMap(closest, coord);
      }
    } else {
      setLocError('Could not determine nearest mandi from your location.');
    }
    setLocLoading(false);
  }, [internalMarkets, onSelectMarketOnMap]);

  // Run automatically on first load using the farmer's farm location
  useEffect(() => {
    if (farmerFarmLocation && (!nearestMarket || selectedLocationMode === 'farm')) {
      setActiveLocation(farmerFarmLocation);
      locateNearestToCoord(farmerFarmLocation, internalMarkets);
    }
  }, [farmerFarmLocation, internalMarkets.length]);

  // Handle Find Nearest button click
  const handleFindNearest = () => {
    setLocError('');
    if (selectedLocationMode === 'farm') {
      locateNearestToCoord(farmerFarmLocation, internalMarkets);
      return;
    }

    // GPS Mode
    setLocLoading(true);
    if (!navigator.geolocation) {
      setLocError('Geolocation is not supported by your browser. Using your registered farm location instead.');
      locateNearestToCoord(farmerFarmLocation, internalMarkets);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const gpsCoord = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          label: 'Your Current GPS Location'
        };
        locateNearestToCoord(gpsCoord, internalMarkets);
      },
      (err) => {
        let msg = 'Failed to retrieve live GPS location. Defaulted to your registered farm location.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location access denied in browser. Using your registered farm location instead.';
        }
        setLocError(msg);
        locateNearestToCoord(farmerFarmLocation, internalMarkets);
      },
      { timeout: 7000, enableHighAccuracy: true }
    );
  };

  // Fetch prices for a market
  const fetchMarketPrices = async (marketId) => {
    setPricesLoading(true);
    try {
      const response = await api.get(`/market-prices/${marketId}/prices/`);
      const data = response.data || [];
      setPrices(data);
      
      const commodities = [...new Set(data.map(p => p.commodity))];
      setUniqueCommodities(commodities);
      if (commodities.length > 0) {
        setSelectedCommodity(commodities[0]);
      }
    } catch (err) {
      console.error("Failed to fetch nearest market prices", err);
    } finally {
      setPricesLoading(false);
    }
  };

  // Filter prices when selected commodity changes
  useEffect(() => {
    if (selectedCommodity) {
      const filtered = prices.filter(p => p.commodity === selectedCommodity);
      setCommodityPrices(filtered);
    } else {
      setCommodityPrices(prices);
    }
  }, [selectedCommodity, prices]);

  // Save new API key
  const handleSaveApiKey = async (e) => {
    e.preventDefault();
    if (!newApiKey.trim()) return;
    setSavingKey(true);
    setKeyMessage({ text: '', type: '' });

    try {
      const res = await api.post('/market-prices/update-api-key/', { api_key: newApiKey.trim() });
      if (res.data.success) {
        setKeyMessage({ text: 'API Key updated and validated with AGMARKNET successfully!', type: 'success' });
        setApiHealth(res.data.health);
        setTimeout(() => {
          setShowKeyModal(false);
          setNewApiKey('');
          setKeyMessage({ text: '', type: '' });
          if (nearestMarket) fetchMarketPrices(nearestMarket.id);
        }, 1500);
      } else {
        setKeyMessage({ text: res.data.message || 'Key validation failed.', type: 'error' });
      }
    } catch (err) {
      setKeyMessage({ text: err.response?.data?.error || 'Failed to update API key.', type: 'error' });
    } finally {
      setSavingKey(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 border border-emerald-100 rounded-3xl p-6 shadow-xs space-y-6">
      {/* Top Banner: Header + Status & Key Button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
              <MapPin className="h-5 w-5" />
            </span>
            <div>
              <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                Nearest Mandi Finder
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                  Agmarknet Geospatial
                </span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically detects nearest wholesale markets around your farm location with real-time APMC rates.
              </p>
            </div>
          </div>
        </div>

        {/* API Health Pill & Upload Key */}
        <div className="flex items-center gap-2 flex-wrap">
          {apiHealth && (
            <div 
              title={apiHealth.message}
              className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border shadow-2xs ${
                apiHealth.healthy 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${apiHealth.healthy ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span>{apiHealth.healthy ? 'AGMARKNET Live Connected' : 'AGMARKNET Offline (Using Benchmarks)'}</span>
            </div>
          )}

          <button
            onClick={() => setShowKeyModal(true)}
            className="text-[11px] font-bold text-slate-600 hover:text-emerald-700 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all shadow-2xs"
            title="Upload or update Government data.gov.in API Key"
          >
            <Key className="h-3 w-3 text-emerald-600" />
            Upload / Change API Key
          </button>
        </div>
      </div>

      {/* Location Origin Mode Picker & Trigger Button */}
      <div className="bg-white/80 backdrop-blur-xs border border-emerald-100 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-xs">
          <span className="font-bold text-slate-600 uppercase text-[10px] tracking-wider">Search Origin:</span>
          <div className="inline-flex rounded-xl p-0.5 bg-slate-100 border border-slate-200">
            <button
              onClick={() => setSelectedLocationMode('farm')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                selectedLocationMode === 'farm'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🚜 My Farm Location ({user?.district || 'Ahmedabad'})
            </button>
            <button
              onClick={() => setSelectedLocationMode('gps')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                selectedLocationMode === 'gps'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Navigation className="h-3 w-3" /> Live GPS
            </button>
          </div>
        </div>

        <button
          onClick={handleFindNearest}
          disabled={locLoading}
          className="bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all shrink-0"
        >
          {locLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Find Nearest Mandi
        </button>
      </div>

      {/* Information or Warning Alert */}
      {locError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-3 rounded-2xl flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <span>{locError}</span>
        </div>
      )}

      {/* Nearest Mandi Result Card */}
      {nearestMarket && (
        <div className="bg-white border border-emerald-100 rounded-3xl p-6 space-y-5 shadow-xs">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Nearest APMC Market
                </span>
                {distance != null && (
                  <span className="bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-2xs">
                    📍 {distance.toFixed(1)} km away
                  </span>
                )}
              </div>
              <h5 className="font-extrabold text-slate-800 text-xl mt-1">{nearestMarket.name}</h5>
              <p className="text-xs text-slate-500">{nearestMarket.district}, {nearestMarket.state}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (onSelectMarketOnMap) onSelectMarketOnMap(nearestMarket, activeLocation);
                }}
                className="bg-slate-50 hover:bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                Center on Map
              </button>
            </div>
          </div>

          {/* Commodity Selector & Live Prices Table */}
          {pricesLoading ? (
            <div className="text-center py-8 text-slate-400 text-xs flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
              Fetching verified prices from AGMARKNET...
            </div>
          ) : prices.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              No prices recorded for this mandi today. Check adjacent district APMCs on the map below.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-600 uppercase">Crop Item:</label>
                  <select
                    value={selectedCommodity}
                    onChange={(e) => setSelectedCommodity(e.target.value)}
                    className="px-3 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-xs font-semibold text-slate-800"
                  >
                    {uniqueCommodities.map(comm => (
                      <option key={comm} value={comm}>{comm}</option>
                    ))}
                  </select>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Source: <strong>{commodityPrices[0]?.source || 'AGMARKNET'}</strong></span>
                  {commodityPrices[0]?.reported_date && (
                    <span className="text-slate-400">({commodityPrices[0].reported_date})</span>
                  )}
                </div>
              </div>

              {commodityPrices.length > 0 && (
                <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-100 text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Mandi / Yard</th>
                        <th className="py-2.5 px-3">Variety</th>
                        <th className="py-2.5 px-3">Grade</th>
                        <th className="py-2.5 px-3">Min Price</th>
                        <th className="py-2.5 px-3">Max Price</th>
                        <th className="py-2.5 px-3 text-emerald-700">Modal Price (Benchmark)</th>
                        <th className="py-2.5 px-3">Arrival Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {commodityPrices.map(price => (
                        <tr key={price.id} className="hover:bg-emerald-50/30 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{price.market || nearestMarket.name}</td>
                          <td className="py-2.5 px-3">{price.variety || "Standard"}</td>
                          <td className="py-2.5 px-3">
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                              {price.grade || "FAQ"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">₹{price.min_price}</td>
                          <td className="py-2.5 px-3">₹{price.max_price}</td>
                          <td className="py-2.5 px-3 font-extrabold text-emerald-600 text-sm">
                            ₹{price.modal_price} <span className="text-[10px] text-slate-400 font-normal">/{price.unit || 'Qtl'}</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{price.reported_date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal: Upload / Change AGMARKNET API Key */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                  <Key className="h-5 w-5 text-emerald-600" />
                  AGMARKNET (data.gov.in) API Key
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Upload an active Open Government Data (OGD) API key to enable live price queries from Indian Mandis.
                </p>
              </div>
              <button 
                onClick={() => setShowKeyModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveApiKey} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Enter Data.gov.in API Key:
                </label>
                <input
                  type="text"
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  placeholder="e.g. 579b464db66ec23bdd000001..."
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                />
              </div>

              {keyMessage.text && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  keyMessage.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  {keyMessage.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  <span>{keyMessage.text}</span>
                </div>
              )}

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-[11px] text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800">Don't have an API Key?</p>
                <p>Register for a free key on the Government Open Data portal:</p>
                <a 
                  href="https://data.gov.in/user/register" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-emerald-700 font-bold hover:underline inline-flex items-center gap-1 mt-1"
                >
                  Register on data.gov.in <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingKey || !newApiKey.trim()}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {savingKey ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                  Save & Validate Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NearestMandiExplorer;
