import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { MapPin, Loader2, Search, Table, AlertTriangle } from 'lucide-react';

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

const NearestMandiExplorer = ({ markets, onSelectMarketOnMap }) => {
  const [userLocation, setUserLocation] = useState(null);
  const [nearestMarket, setNearestMarket] = useState(null);
  const [distance, setDistance] = useState(null);
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState('');
  
  const [prices, setPrices] = useState([]);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [uniqueCommodities, setUniqueCommodities] = useState([]);
  const [selectedCommodity, setSelectedCommodity] = useState('');
  const [commodityPrices, setCommodityPrices] = useState([]);

  // Find nearest market based on user location
  const handleFindNearest = () => {
    setLocLoading(true);
    setLocError('');
    setNearestMarket(null);
    setPrices([]);
    setUniqueCommodities([]);
    setSelectedCommodity('');

    if (!navigator.geolocation) {
      setLocError('Geolocation is not supported by your browser.');
      setLocLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ latitude, longitude });

        // Filter markets with valid coords
        const validMarkets = markets.filter(m => m.latitude && m.longitude);
        if (validMarkets.length === 0) {
          setLocError('No markets with coordinates found in database.');
          setLocLoading(false);
          return;
        }

        let closest = null;
        let minDistance = Infinity;

        validMarkets.forEach(m => {
          const dist = calculateDistance(latitude, longitude, m.latitude, m.longitude);
          if (dist < minDistance) {
            minDistance = dist;
            closest = m;
          }
        });

        if (closest) {
          setNearestMarket(closest);
          setDistance(minDistance);
          fetchMarketPrices(closest.id);
        } else {
          setLocError('Could not determine nearest market.');
        }
        setLocLoading(false);
      },
      (error) => {
        setLocError('Location permission denied. Please allow location access to find nearest mandis.');
        setLocLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const fetchMarketPrices = async (marketId) => {
    setPricesLoading(true);
    try {
      const response = await api.get(`/market-prices/markets/${marketId}/prices/`);
      const data = response.data;
      setPrices(data);
      
      // Get unique commodities
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
      setCommodityPrices([]);
    }
  }, [selectedCommodity, prices]);

  return (
    <div className="bg-emerald-50/50 border border-emerald-100 rounded-3xl p-6 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5 text-emerald-600" />
            Nearest Mandi Finder
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">Detect your location to discover the nearest agricultural market.</p>
        </div>
        <button
          onClick={handleFindNearest}
          disabled={locLoading}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm transition-all shrink-0"
        >
          {locLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5" />}
          Find Nearest Mandi
        </button>
      </div>

      {locError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-3 rounded-2xl flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <span>{locError}</span>
        </div>
      )}

      {nearestMarket && (
        <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4 shadow-2xs">
          <div className="flex justify-between items-start border-b border-slate-100 pb-3">
            <div>
              <h5 className="font-bold text-slate-800 text-base">{nearestMarket.name}</h5>
              <p className="text-xs text-slate-400">{nearestMarket.district}, {nearestMarket.state}</p>
            </div>
            <div className="text-right">
              <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-200">
                📍 {distance.toFixed(1)} km away
              </span>
              {onSelectMarketOnMap && (
                <button
                  onClick={() => onSelectMarketOnMap(nearestMarket)}
                  className="block text-[10px] text-blue-500 font-semibold hover:underline mt-1.5"
                >
                  Locate on Map
                </button>
              )}
            </div>
          </div>

          {pricesLoading ? (
            <div className="text-center py-6 text-slate-400 text-xs flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
              Loading nearest mandi prices...
            </div>
          ) : prices.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              No prices reported for this mandi recently.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <label className="text-xs font-bold text-slate-600 uppercase shrink-0">Select Crop Item:</label>
                <select
                  value={selectedCommodity}
                  onChange={(e) => setSelectedCommodity(e.target.value)}
                  className="w-full sm:w-64 px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-xs font-semibold text-slate-800"
                >
                  {uniqueCommodities.map(comm => (
                    <option key={comm} value={comm}>{comm}</option>
                  ))}
                </select>
              </div>

              {commodityPrices.length > 0 && (
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-100">
                      <tr>
                        <th className="py-2.5 px-3">Variety</th>
                        <th className="py-2.5 px-3">Min Price</th>
                        <th className="py-2.5 px-3">Max Price</th>
                        <th className="py-2.5 px-3 text-emerald-600">Modal Price</th>
                        <th className="py-2.5 px-3">Reported Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-slate-700 font-medium">
                      {commodityPrices.map(price => (
                        <tr key={price.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3">{price.variety || "—"}</td>
                          <td className="py-2.5 px-3">₹{price.min_price}</td>
                          <td className="py-2.5 px-3">₹{price.max_price}</td>
                          <td className="py-2.5 px-3 font-bold text-emerald-600">₹{price.modal_price}</td>
                          <td className="py-2.5 px-3 text-slate-400">{price.reported_date}</td>
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
    </div>
  );
};

export default NearestMandiExplorer;
