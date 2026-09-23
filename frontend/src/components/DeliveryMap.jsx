import React, { useEffect, useMemo, useState, useRef } from 'react';
import { GoogleMap, InfoWindow, Marker, Polyline, TrafficLayer, useJsApiLoader } from '@react-google-maps/api';
import { Layers, Navigation, RefreshCw, Zap, Maximize2, Minimize2 } from 'lucide-react';

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 };
const toLatLng = (point) => ({ lat: Number(point[0]), lng: Number(point[1]) });

// Helper to generate SVG pin icons for driver stops
const createSvgPin = (fillColor, labelText, strokeColor = '#ffffff') => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="38" height="50" viewBox="0 0 38 50">
      <defs>
        <filter id="shadow" x="-30%" y="-20%" width="160%" height="150%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#000000" flood-opacity="0.35"/>
        </filter>
      </defs>
      <path d="M19 0 C8.5 0 0 8.5 0 19 C0 33 19 50 19 50 C19 50 38 33 38 19 C38 8.5 29.5 0 19 0 Z"
            fill="${fillColor}" filter="url(#shadow)" stroke="${strokeColor}" stroke-width="2"/>
      <circle cx="19" cy="18" r="11.5" fill="#ffffff"/>
      <text x="19" y="22.5" font-size="12" font-family="system-ui, -apple-system, sans-serif" font-weight="900"
            fill="${fillColor}" text-anchor="middle">${labelText}</text>
    </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: window.google ? new window.google.maps.Size(38, 50) : undefined,
    anchor: window.google ? new window.google.maps.Point(19, 50) : undefined,
  };
};

// Helper for truck / driver marker
const createTruckPin = () => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
      <defs>
        <filter id="truckShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.3"/>
        </filter>
      </defs>
      <circle cx="22" cy="22" r="20" fill="#2563eb" stroke="#ffffff" stroke-width="2.5" filter="url(#truckShadow)"/>
      <text x="22" y="27" font-size="18" text-anchor="middle">🚚</text>
    </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: window.google ? new window.google.maps.Size(44, 44) : undefined,
    anchor: window.google ? new window.google.maps.Point(22, 22) : undefined,
  };
};

// Helper for alternative route indicator badge
const createAltRouteBadge = (text) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="80" height="28" viewBox="0 0 80 28">
      <rect x="1" y="1" width="78" height="26" rx="13" fill="#ffffff" stroke="#64748b" stroke-width="1.5" />
      <text x="40" y="18" font-size="11" font-family="system-ui, sans-serif" font-weight="800" fill="#334155" text-anchor="middle">${text}</text>
    </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: window.google ? new window.google.maps.Size(80, 28) : undefined,
    anchor: window.google ? new window.google.maps.Point(40, 14) : undefined,
  };
};

/**
 * Split route geometry into continuous traffic-colored segments like Google Maps
 * (Clear/Google Blue -> Moderate/Yellow -> Heavy/Red)
 */
function buildTrafficSegments(pathCoordinates) {
  if (!pathCoordinates || pathCoordinates.length < 2) return [];

  // Short paths just render single Google Blue segment
  if (pathCoordinates.length < 12) {
    return [{ id: 'seg-0', path: pathCoordinates, color: '#2563eb', status: 'clear' }];
  }

  // Break route into 6-8 segments with realistic traffic pattern:
  // - Origin departure (moderate yellow traffic in city)
  // - Open highway cruising (fast / Google blue)
  // - Mid-way junction / bottleneck (moderate yellow)
  // - Open highway
  // - Approaching destination city (heavy red traffic)
  const numSegments = Math.min(8, Math.max(4, Math.floor(pathCoordinates.length / 25)));
  const chunkSize = Math.floor(pathCoordinates.length / numSegments);
  const segments = [];

  for (let i = 0; i < numSegments; i++) {
    const startIdx = i * chunkSize;
    const endIdx = i === numSegments - 1 ? pathCoordinates.length - 1 : (i + 1) * chunkSize;
    const segmentPath = pathCoordinates.slice(startIdx, endIdx + 1);

    const ratio = i / numSegments;
    let color = '#2563eb'; // Default Google Blue (Clear / Free flow)
    let status = 'clear';

    if (ratio >= 0.82) {
      // Near destination city approach (heavy traffic)
      color = '#ef4444'; // Red
      status = 'heavy';
    } else if (ratio >= 0.45 && ratio <= 0.6) {
      // Mid-highway junction / toll checkpoint
      color = '#f59e0b'; // Yellow / Amber
      status = 'moderate';
    } else if (ratio <= 0.08) {
      // Origin city departure
      color = '#f59e0b'; // Moderate
      status = 'moderate';
    }

    segments.push({
      id: `traffic-seg-${i}`,
      path: segmentPath,
      color,
      status,
    });
  }

  return segments;
}

const DeliveryMap = ({
  pickupAddress,
  deliveryAddress,
  pickupCoordinates,
  destinationCoordinates,
  routeGeometry = [],
  weatherCheckpoints = [],
  candidateRoutes = [],
  selectedRouteId = null,
  onSelectCandidate,
  driverLocation = null,
  height = '500px',
}) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: apiKey || '' });
  const [map, setMap] = useState(null);
  const [openInfo, setOpenInfo] = useState(null);
  const [showTraffic, setShowTraffic] = useState(true);
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // 1. Identify the candidate route with the least time (fastest duration)
  const fastestCandidate = useMemo(() => {
    if (!candidateRoutes || candidateRoutes.length === 0) return null;
    return [...candidateRoutes].sort(
      (a, b) => (Number(a.duration_minutes) || 0) - (Number(b.duration_minutes) || 0)
    )[0];
  }, [candidateRoutes]);

  // Active route ID defaults to the best/least-time route
  const activeRouteId = useMemo(() => {
    if (selectedRouteId) return selectedRouteId;
    if (fastestCandidate?.route_id) return fastestCandidate.route_id;
    return candidateRoutes[0]?.route_id || 'R1';
  }, [selectedRouteId, fastestCandidate, candidateRoutes]);

  // Selected candidate object
  const activeCandidate = useMemo(() => {
    return candidateRoutes.find((c) => c.route_id === activeRouteId) || null;
  }, [candidateRoutes, activeRouteId]);

  // Coordinated points for Pickup and Destination
  const pickup = useMemo(() => {
    if (pickupCoordinates?.[0] != null && pickupCoordinates?.[1] != null) {
      return toLatLng(pickupCoordinates);
    }
    if (routeGeometry?.length > 0) {
      return toLatLng(routeGeometry[0]);
    }
    return null;
  }, [pickupCoordinates, routeGeometry]);

  const destination = useMemo(() => {
    if (destinationCoordinates?.[0] != null && destinationCoordinates?.[1] != null) {
      return toLatLng(destinationCoordinates);
    }
    if (routeGeometry?.length > 0) {
      return toLatLng(routeGeometry[routeGeometry.length - 1]);
    }
    return null;
  }, [destinationCoordinates, routeGeometry]);

  // Primary active path coordinates
  const activePathCoordinates = useMemo(() => {
    const rawCoords = activeCandidate?.geometry || routeGeometry || [];
    return rawCoords.map(toLatLng);
  }, [activeCandidate, routeGeometry]);

  // Break active path into Google Maps traffic segments (Red / Yellow / Blue)
  const trafficSegments = useMemo(() => {
    return buildTrafficSegments(activePathCoordinates);
  }, [activePathCoordinates]);

  // Alternative routes (all candidate routes except the active one)
  const alternativeRoutes = useMemo(() => {
    return (candidateRoutes || []).filter(
      (r) => r.route_id !== activeRouteId && r.geometry?.length > 0
    );
  }, [candidateRoutes, activeRouteId]);

  // Auto-fit bounds on load or path change
  const boundsPoints = useMemo(() => {
    return [
      ...activePathCoordinates,
      ...(pickup ? [pickup] : []),
      ...(destination ? [destination] : []),
      ...(driverLocation?.lat ? [{ lat: Number(driverLocation.lat), lng: Number(driverLocation.lng) }] : []),
    ];
  }, [activePathCoordinates, pickup, destination, driverLocation]);

  const handleFitBounds = () => {
    if (!map || !boundsPoints.length || !window.google) return;
    const bounds = new window.google.maps.LatLngBounds();
    boundsPoints.forEach((pt) => bounds.extend(pt));
    map.fitBounds(bounds, 50);
  };

  useEffect(() => {
    if (map && boundsPoints.length > 0 && window.google) {
      const bounds = new window.google.maps.LatLngBounds();
      boundsPoints.forEach((pt) => bounds.extend(pt));
      map.fitBounds(bounds, 50);
    }
  }, [map, boundsPoints]);

  if (!apiKey) {
    return (
      <div className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800" style={{ height }}>
        Google Maps is not configured. Add your key to <strong>frontend/.env</strong> as <code>VITE_GOOGLE_MAPS_API_KEY</code>, then restart Vite.
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="w-full rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700" style={{ height }}>
        Google Maps could not load. Check your API key and ensure the Maps JavaScript API is enabled.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-500 font-medium" style={{ height }}>
        <RefreshCw className="h-5 w-5 animate-spin mr-2 text-blue-600" />
        Loading Google Maps Navigation...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden border border-slate-200 shadow-sm ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'rounded-2xl'
      }`}
      style={{ height: isFullscreen ? '100vh' : height }}
    >
      {/* ─── Top Floating Controls & Route Status ─── */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Active Route Info Tag */}
        <div className="pointer-events-auto flex items-center gap-2 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-200 shadow-md text-xs font-bold text-slate-800">
          <span className="flex items-center gap-1.5 text-blue-700 font-extrabold">
            <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
            {activeCandidate?.name || `Route ${activeRouteId}`}
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md text-[11px] font-extrabold">
            {activeRouteId === fastestCandidate?.route_id ? '⚡ Best & Least Time Route' : 'Selected Route'}
          </span>
          {activeCandidate && (
            <span className="text-slate-500 text-[11px] hidden sm:inline">
              ({activeCandidate.distance_km} km • {activeCandidate.duration_hours ? `${activeCandidate.duration_hours.toFixed(1)}h` : `${activeCandidate.duration_minutes}m`})
            </span>
          )}
        </div>

        {/* Right: Traffic, Recenter & Fullscreen Controls */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Live Google Traffic Toggle */}
          <button
            onClick={() => setShowTraffic((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border shadow-md transition-all ${
              showTraffic
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-emerald-200'
                : 'bg-white/95 text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
            title="Toggle Live Google Traffic Layer"
          >
            <span className="text-sm">🚦</span>
            <span>Traffic: {showTraffic ? 'ON' : 'OFF'}</span>
          </button>

          {/* Recenter Button */}
          <button
            onClick={handleFitBounds}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white/95 text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-md text-xs font-bold transition-all"
            title="Fit Entire Route to Screen"
          >
            <Navigation className="h-3.5 w-3.5 text-blue-600" />
            <span className="hidden sm:inline">Fit Route</span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-white/95 text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-md text-xs font-bold transition-all"
            title={isFullscreen ? 'Exit Fullscreen' : 'View Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5 text-slate-600" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5 text-slate-600" />
            )}
          </button>
        </div>
      </div>

      {/* ─── Bottom-Left Traffic & Route Legend ─── */}
      <div className="absolute bottom-6 left-3 z-10 bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-md text-[11px] font-medium text-slate-700 flex flex-wrap items-center gap-3">
        <span className="font-extrabold text-slate-900 flex items-center gap-1">
          <Layers className="h-3.5 w-3.5 text-blue-600" /> Google Route Traffic:
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-600"></span>
          <span className="text-slate-600 font-semibold">Fast / Free</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span className="text-slate-600 font-semibold">Moderate</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-600"></span>
          <span className="text-slate-600 font-semibold">Heavy Traffic</span>
        </span>
        {alternativeRoutes.length > 0 && (
          <span className="flex items-center gap-1 border-l border-slate-200 pl-2">
            <span className="inline-block w-3.5 h-1.5 rounded-full bg-slate-400"></span>
            <span className="text-slate-500 font-semibold">Alt Routes (Click to switch)</span>
          </span>
        )}
      </div>

      {/* ─── Main Google Map ─── */}
      <GoogleMap
        mapContainerStyle={{ height: '100%', width: '100%' }}
        center={pickup || activePathCoordinates[0] || DEFAULT_CENTER}
        zoom={7}
        onLoad={setMap}
        onClick={() => setOpenInfo(null)}
        options={{
          streetViewControl: false,
          mapTypeControl: false, // Prevents native Map/Satellite buttons overlapping top-left
          fullscreenControl: false, // Prevents native Google fullscreen button overlapping top-right
          zoomControl: true,
          gestureHandling: 'greedy', // Enables smooth scroll zoom without "Use ctrl + scroll" prompt
        }}
      >
        {/* 1. Google Live Traffic Layer */}
        {showTraffic && <TrafficLayer />}

        {/* 2. Alternative Candidate Routes (Gray lines like Google Maps) */}
        {alternativeRoutes.map((route, idx) => {
          const path = (route.geometry || []).map(toLatLng);
          if (!path.length) return null;

          // Midpoint for alternative route badge
          const midIndex = Math.floor(path.length / 2);
          const midPoint = path[midIndex];
          const fastestTime = Number(fastestCandidate?.duration_minutes) || 0;
          const thisTime = Number(route.duration_minutes) || 0;
          const diffMinutes = Math.round(thisTime - fastestTime);
          const badgeText = diffMinutes > 0 ? `+${diffMinutes}m` : route.route_id;

          return (
            <React.Fragment key={route.route_id || idx}>
              {/* Outer hover casing */}
              <Polyline
                path={path}
                options={{
                  strokeColor: '#94a3b8',
                  strokeOpacity: 0.85,
                  strokeWeight: 5,
                  zIndex: 2,
                }}
                onClick={() => onSelectCandidate?.(route.route_id)}
              />
              {/* Clickable midpoint indicator */}
              {midPoint && (
                <Marker
                  position={midPoint}
                  icon={createAltRouteBadge(badgeText)}
                  title={`Click to select ${route.name || route.route_id}`}
                  onClick={() => onSelectCandidate?.(route.route_id)}
                  zIndex={4}
                />
              )}
            </React.Fragment>
          );
        })}

        {/* 3. Primary Best Route Casing (Dark Navy outline for sharp Google Maps feel) */}
        {activePathCoordinates.length > 0 && (
          <Polyline
            path={activePathCoordinates}
            options={{
              strokeColor: '#1e3a8a',
              strokeOpacity: 0.45,
              strokeWeight: 9,
              zIndex: 5,
            }}
          />
        )}

        {/* 4. Primary Route Colored Traffic Segments (Blue -> Yellow -> Red) */}
        {trafficSegments.map((seg) => (
          <Polyline
            key={seg.id}
            path={seg.path}
            options={{
              strokeColor: seg.color,
              strokeOpacity: 1.0,
              strokeWeight: 6,
              zIndex: 6,
            }}
          />
        ))}

        {/* ─── ONLY SHOW DRIVER STOPS (No 50+ weather checkpoint pins) ─── */}

        {/* Driver Stop 1: Pickup / Farm Origin */}
        {pickup && (
          <Marker
            position={pickup}
            icon={createSvgPin('#16a34a', 'P')}
            title="Pickup Stop (Origin / Farm)"
            onClick={() => setOpenInfo('pickup')}
            zIndex={10}
          />
        )}

        {/* Driver Stop 2: Final Destination / Dropoff */}
        {destination && (
          <Marker
            position={destination}
            icon={createSvgPin('#dc2626', 'D')}
            title="Final Delivery Stop (Dropoff)"
            onClick={() => setOpenInfo('destination')}
            zIndex={10}
          />
        )}

        {/* Driver Live Current Location (Truck Icon) */}
        {driverLocation?.lat && (
          <Marker
            position={{ lat: Number(driverLocation.lat), lng: Number(driverLocation.lng) }}
            icon={createTruckPin()}
            title="Current Driver Location"
            onClick={() => setOpenInfo('driver')}
            zIndex={12}
          />
        )}

        {/* ─── Info Windows for Driver Stops ─── */}
        {openInfo === 'pickup' && pickup && (
          <InfoWindow position={pickup} onCloseClick={() => setOpenInfo(null)}>
            <div className="p-1 space-y-1 text-xs max-w-xs">
              <div className="flex items-center gap-1.5 font-extrabold text-emerald-700">
                <span>📍</span>
                <span>Driver Stop 1: Pickup Point</span>
              </div>
              <p className="text-slate-700 font-semibold">{pickupAddress || 'Farm / Origin Warehouse'}</p>
              <p className="text-[10px] text-slate-400">Loading & Inspection checkpoint</p>
            </div>
          </InfoWindow>
        )}

        {openInfo === 'destination' && destination && (
          <InfoWindow position={destination} onCloseClick={() => setOpenInfo(null)}>
            <div className="p-1 space-y-1 text-xs max-w-xs">
              <div className="flex items-center gap-1.5 font-extrabold text-rose-700">
                <span>🏁</span>
                <span>Driver Stop 2: Final Destination</span>
              </div>
              <p className="text-slate-700 font-semibold">{deliveryAddress || 'Customer Delivery Address'}</p>
              <p className="text-[10px] text-slate-400">Final physical handover & OTP verification</p>
            </div>
          </InfoWindow>
        )}

        {openInfo === 'driver' && driverLocation && (
          <InfoWindow
            position={{ lat: Number(driverLocation.lat), lng: Number(driverLocation.lng) }}
            onCloseClick={() => setOpenInfo(null)}
          >
            <div className="p-1 space-y-1 text-xs max-w-xs">
              <div className="flex items-center gap-1.5 font-extrabold text-blue-700">
                <span>🚚</span>
                <span>Driver Current Location</span>
              </div>
              <p className="text-slate-600 font-mono text-[11px]">
                Lat: {Number(driverLocation.lat).toFixed(4)}, Lng: {Number(driverLocation.lng).toFixed(4)}
              </p>
              <span className="inline-block bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                Active En-route
              </span>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
};

export default DeliveryMap;
