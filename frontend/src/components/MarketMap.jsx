import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { GoogleMap, InfoWindow, Marker, Polyline, Circle, useJsApiLoader } from '@react-google-maps/api';
import { LocateFixed, MapPin, Layers, Navigation, Sparkles } from 'lucide-react';

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 };

const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const RADIUS_OPTIONS = [
  { label: '100 km', value: 100 },
  { label: '300 km (Default)', value: 300 },
  { label: '500 km', value: 500 },
  { label: 'All India', value: 'all' },
];

const CLEAN_MAP_STYLES = [
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }]
  },
  {
    featureType: 'transit',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }]
  }
];

const MarketMap = ({ markets = [], selectedMarket: propSelectedMarket, farmerLocation, onMarketSelect }) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: apiKey || '' });
  const [map, setMap] = useState(null);
  const [selectedMarket, setSelectedMarket] = useState(propSelectedMarket || null);
  const [showFarmerInfo, setShowFarmerInfo] = useState(false);
  
  // Radius filter state (Default 300 km)
  const [radiusKm, setRadiusKm] = useState(300);

  // Sync internal selected market when prop updates
  useEffect(() => {
    if (propSelectedMarket) {
      setSelectedMarket(propSelectedMarket);
    }
  }, [propSelectedMarket]);

  // Filter markets within the selected radius around the farmer
  const visibleMarkets = useMemo(() => {
    if (!markets || !markets.length) return [];
    const valid = markets.filter(m => m.latitude != null && m.longitude != null);

    if (!farmerLocation || radiusKm === 'all') {
      return valid;
    }

    const farmLat = Number(farmerLocation.latitude);
    const farmLng = Number(farmerLocation.longitude);
    const maxDist = Number(radiusKm);

    return valid.filter(m => {
      if (selectedMarket && selectedMarket.id === m.id) return true;
      const d = calculateDistanceKm(farmLat, farmLng, Number(m.latitude), Number(m.longitude));
      return d <= maxDist;
    });
  }, [markets, farmerLocation, radiusKm, selectedMarket]);

  // Adjust camera view
  useEffect(() => {
    if (!map || !window.google) return;

    // Case 1: Specific market selected -> Focus on Farmer + Selected Market
    if (propSelectedMarket && propSelectedMarket.latitude && propSelectedMarket.longitude) {
      const marketLat = Number(propSelectedMarket.latitude);
      const marketLng = Number(propSelectedMarket.longitude);

      if (farmerLocation && farmerLocation.latitude && farmerLocation.longitude) {
        const farmLat = Number(farmerLocation.latitude);
        const farmLng = Number(farmerLocation.longitude);

        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend({ lat: farmLat, lng: farmLng });
        bounds.extend({ lat: marketLat, lng: marketLng });
        map.fitBounds(bounds, { top: 70, right: 70, bottom: 70, left: 70 });
      } else {
        map.panTo({ lat: marketLat, lng: marketLng });
        map.setZoom(12);
      }
      return;
    }

    // Case 2: Radius filtering active around Farmer Location -> Zoom into region
    if (farmerLocation && farmerLocation.latitude && farmerLocation.longitude && radiusKm !== 'all') {
      const farmLat = Number(farmerLocation.latitude);
      const farmLng = Number(farmerLocation.longitude);

      if (visibleMarkets.length > 0) {
        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend({ lat: farmLat, lng: farmLng });
        visibleMarkets.forEach(m => {
          bounds.extend({ lat: Number(m.latitude), lng: Number(m.longitude) });
        });
        map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
      } else {
        map.panTo({ lat: farmLat, lng: farmLng });
        map.setZoom(9);
      }
      return;
    }

    // Case 3: All India view
    if (visibleMarkets.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      visibleMarkets.forEach(m => bounds.extend({ lat: Number(m.latitude), lng: Number(m.longitude) }));
      map.fitBounds(bounds, 50);
    }
  }, [map, propSelectedMarket, farmerLocation, visibleMarkets, radiusKm]);

  // Recenter explicitly on farmer
  const handleCenterOnFarmer = useCallback(() => {
    if (!map || !farmerLocation) return;
    map.panTo({ lat: Number(farmerLocation.latitude), lng: Number(farmerLocation.longitude) });
    map.setZoom(11);
    setShowFarmerInfo(true);
  }, [map, farmerLocation]);

  if (!apiKey) {
    return (
      <div className="w-full rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 flex flex-col justify-center items-center text-center" style={{ height: '520px' }}>
        <p className="font-bold text-base mb-1">Google Maps API Key Required</p>
        <p className="text-xs max-w-md text-amber-700">Add your key to <strong>frontend/.env</strong> as <code>VITE_GOOGLE_MAPS_API_KEY</code> to enable live geospatial mandi tracking.</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="w-full rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 flex flex-col justify-center items-center text-center" style={{ height: '520px' }}>
        <p className="font-bold text-base mb-1">Google Maps could not load</p>
        <p className="text-xs text-rose-600">Please verify internet connection and API key permissions.</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500 flex items-center justify-center" style={{ height: '520px' }}>
        <span className="animate-pulse font-medium">Loading interactive Agmarknet Map...</span>
      </div>
    );
  }

  const distanceToFarmer = (selectedMarket && farmerLocation)
    ? calculateDistanceKm(
        Number(farmerLocation.latitude),
        Number(farmerLocation.longitude),
        Number(selectedMarket.latitude),
        Number(selectedMarket.longitude)
      ).toFixed(1)
    : null;

  return (
    <div className="space-y-3.5">
      {/* ─── Modern Map Control Toolbar (Outside & Above Map to prevent clutter) ─── */}
      <div className="bg-slate-50/90 border border-slate-200/80 rounded-2xl p-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-2xs backdrop-blur-xs">
        
        {/* Radius Segmented Control */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5 pl-1">
            <MapPin className="h-3.5 w-3.5 text-emerald-600" />
            Radius Range:
          </span>
          <div className="inline-flex rounded-xl bg-white p-1 border border-slate-200 shadow-2xs">
            {RADIUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setRadiusKm(opt.value)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  radiusKm === opt.value
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status Pill & My Farm Recenter Action */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-between md:justify-end">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-200 px-3 py-1.5 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {visibleMarkets.length} Mandis Found
          </span>

          {farmerLocation && (
            <button
              onClick={handleCenterOnFarmer}
              className="text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 active:scale-98 border border-slate-200 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              title="Recenter camera on your farm"
            >
              <LocateFixed className="h-3.5 w-3.5 text-emerald-600" />
              Center My Farm
            </button>
          )}
        </div>
      </div>

      {/* ─── Clean Map Viewport ─── */}
      <div className="relative shadow-sm border border-slate-200/90 rounded-3xl overflow-hidden bg-slate-100" style={{ height: '520px', width: '100%' }}>
        <GoogleMap
          mapContainerStyle={{ height: '100%', width: '100%' }}
          center={DEFAULT_CENTER}
          zoom={5}
          onLoad={setMap}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
            zoomControl: true,
            styles: CLEAN_MAP_STYLES
          }}
        >
          {/* Radius Perimeter Zone (e.g. 300 km around farm) */}
          {farmerLocation && radiusKm !== 'all' && (
            <Circle
              center={{ lat: Number(farmerLocation.latitude), lng: Number(farmerLocation.longitude) }}
              radius={Number(radiusKm) * 1000}
              options={{
                strokeColor: '#059669',
                strokeOpacity: 0.6,
                strokeWeight: 2,
                fillColor: '#10b981',
                fillOpacity: 0.05,
                clickable: false,
              }}
            />
          )}

          {/* Polyline Route to Selected Mandi */}
          {farmerLocation && selectedMarket && selectedMarket.latitude && selectedMarket.longitude && (
            <Polyline
              path={[
                { lat: Number(farmerLocation.latitude), lng: Number(farmerLocation.longitude) },
                { lat: Number(selectedMarket.latitude), lng: Number(selectedMarket.longitude) }
              ]}
              options={{
                strokeColor: '#059669',
                strokeOpacity: 0.9,
                strokeWeight: 4,
                geodesic: true,
              }}
            />
          )}

          {/* Farmer's Location Marker */}
          {farmerLocation && farmerLocation.latitude && farmerLocation.longitude && (
            <Marker
              position={{ lat: Number(farmerLocation.latitude), lng: Number(farmerLocation.longitude) }}
              title={farmerLocation.label || "Your Farm Location"}
              onClick={() => setShowFarmerInfo(true)}
              zIndex={1000}
              icon={{
                url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
              }}
            />
          )}

          {/* Farmer Location InfoWindow */}
          {showFarmerInfo && farmerLocation && (
            <InfoWindow
              position={{ lat: Number(farmerLocation.latitude), lng: Number(farmerLocation.longitude) }}
              onCloseClick={() => setShowFarmerInfo(false)}
            >
              <div className="p-1 max-w-xs">
                <div className="font-extrabold text-emerald-800 text-xs flex items-center gap-1">
                  🚜 {farmerLocation.label || "Your Farm Location"}
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                  {farmerLocation.address || "Registered Farmer Land"}
                </p>
              </div>
            </InfoWindow>
          )}

          {/* Filtered Mandi Markers (Only within 300 km) */}
          {visibleMarkets.map(market => {
            if (market.latitude == null || market.longitude == null) return null;
            const isSelected = selectedMarket && selectedMarket.id === market.id;
            
            return (
              <Marker
                key={market.id}
                position={{ lat: Number(market.latitude), lng: Number(market.longitude) }}
                zIndex={isSelected ? 999 : 100}
                icon={isSelected ? {
                  url: 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
                } : undefined}
                onClick={() => {
                  setSelectedMarket(market);
                  if (onMarketSelect) onMarketSelect(market);
                }}
              />
            );
          })}

          {/* Selected Mandi InfoWindow */}
          {selectedMarket && selectedMarket.latitude != null && selectedMarket.longitude != null && (
            <InfoWindow
              position={{ lat: Number(selectedMarket.latitude), lng: Number(selectedMarket.longitude) }}
              onCloseClick={() => setSelectedMarket(null)}
            >
              <div className="p-1.5 max-w-xs space-y-1.5">
                <div className="font-extrabold text-slate-900 text-sm">{selectedMarket.name}</div>
                <div className="text-xs text-slate-500 font-medium">{selectedMarket.district}, {selectedMarket.state}</div>
                
                {distanceToFarmer && (
                  <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold px-2 py-0.5 rounded-md">
                    📍 {distanceToFarmer} km from your farm
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onMarketSelect && onMarketSelect(selectedMarket)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition-colors cursor-pointer w-full text-center"
                  >
                    View Live Prices →
                  </button>
                </div>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>

      {/* ─── Bottom Legend Ribbon ─── */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 px-2 pt-0.5 gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 font-bold text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-2xs"></span>
            <span>🚜 Your Farm ({farmerLocation?.label?.split('(')[1]?.replace(')', '') || 'Registered Land'})</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shadow-2xs"></span>
            <span>⭐ Selected Mandi</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
            <span>📍 Regional Mandis</span>
          </div>
        </div>
        <span className="text-[11px] text-slate-400 hidden sm:inline">
          Tip: Click any marker to view live Agmarknet prices
        </span>
      </div>
    </div>
  );
};

export default MarketMap;
