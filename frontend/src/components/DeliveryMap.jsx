import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Helper component to fit map bounds covering all routes
function MapBoundsController({ candidateRoutes, routeGeometry, pickupCoords, destCoords }) {
  const map = useMap();

  useEffect(() => {
    const points = [];

    // Add points from main route
    if (routeGeometry && routeGeometry.length > 0) {
      routeGeometry.forEach(pt => points.push([pt[0], pt[1]]));
    }

    // Add points from all candidate routes if provided
    if (candidateRoutes && candidateRoutes.length > 0) {
      candidateRoutes.forEach(cand => {
        if (cand.geometry) {
          cand.geometry.forEach(pt => points.push([pt[0], pt[1]]));
        }
      });
    }

    if (pickupCoords && pickupCoords[0]) points.push(pickupCoords);
    if (destCoords && destCoords[0]) points.push(destCoords);

    if (points.length > 0) {
      try {
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [40, 40] });
      } catch (err) {
        console.warn('Map bounds fit error:', err);
      }
    }
  }, [candidateRoutes, routeGeometry, pickupCoords, destCoords, map]);

  return null;
}

// Custom Marker Icons
const createCustomIcon = (bgColor, iconText) => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        background-color: ${bgColor};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 14px;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);
        border: 2px solid white;
      ">
        ${iconText}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

const pickupIcon = createCustomIcon('#10b981', '📍'); // Emerald
const destIcon = createCustomIcon('#ef4444', '🏁');   // Red
const driverIcon = createCustomIcon('#3b82f6', '🚚'); // Blue

const getRiskColor = (risk) => {
  switch (risk) {
    case 'LOW': return '#10b981';
    case 'MEDIUM': return '#eab308';
    case 'HIGH': return '#f97316';
    case 'CRITICAL': return '#ef4444';
    default: return '#6b7280';
  }
};

const createCheckpointIcon = (risk) => {
  const color = getRiskColor(risk);
  return L.divIcon({
    className: 'custom-checkpoint-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 10px;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.25);
      ">
        🌤️
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

// Route color palette for alternatives
const ALTERNATIVE_COLORS = ['#9333ea', '#d97706', '#0891b2', '#4b5563'];

const DeliveryMap = ({
  pickupAddress,
  deliveryAddress,
  pickupCoordinates,
  destinationCoordinates,
  routeGeometry,
  weatherCheckpoints = [],
  candidateRoutes = [],
  selectedRouteId = null,
  onSelectCandidate = null,
  driverLocation = null,
  height = '480px',
}) => {
  const defaultCenter = pickupCoordinates && pickupCoordinates[0]
    ? pickupCoordinates
    : [20.5937, 78.9629];

  const primaryCoords = routeGeometry ? routeGeometry.map(pt => [pt[0], pt[1]]) : [];

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-sm border border-slate-200" style={{ height }}>

      {/* Map Legend Overlay */}
      <div className="absolute top-3 right-3 z-[1000] bg-white/95 backdrop-blur-xs p-2.5 rounded-xl border border-slate-200 shadow-md text-[11px] font-bold text-slate-700 space-y-1">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-6 rounded bg-blue-600 inline-block" />
          <span>Selected Route</span>
        </div>
        {candidateRoutes.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-6 rounded border-2 border-dashed border-purple-600 bg-purple-100 inline-block" />
            <span>Alternative Routes ({candidateRoutes.length - 1})</span>
          </div>
        )}
      </div>

      <MapContainer
        center={defaultCenter}
        zoom={7}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapBoundsController
          candidateRoutes={candidateRoutes}
          routeGeometry={routeGeometry}
          pickupCoords={pickupCoordinates}
          destCoords={destinationCoordinates}
        />

        {/* Render Alternative Non-Selected Routes first (so primary route sits on top) */}
        {candidateRoutes.map((cand, idx) => {
          if (!cand.geometry || cand.geometry.length === 0) return null;
          const isSelected = selectedRouteId ? (cand.route_id === selectedRouteId) : (idx === 0);
          if (isSelected) return null; // rendered as primary below

          const candCoords = cand.geometry.map(pt => [pt[0], pt[1]]);
          const altColor = ALTERNATIVE_COLORS[idx % ALTERNATIVE_COLORS.length];

          return (
            <Polyline
              key={cand.route_id || idx}
              positions={candCoords}
              pathOptions={{
                color: altColor,
                weight: 4,
                opacity: 0.7,
                dashArray: '8, 8',
                lineJoin: 'round',
              }}
              eventHandlers={{
                click: () => onSelectCandidate && onSelectCandidate(cand.route_id),
              }}
            >
              <Popup>
                <div className="p-1 text-xs space-y-1 max-w-xs">
                  <div className="flex items-center justify-between border-b pb-1">
                    <span className="font-extrabold text-purple-700">{cand.name || `Alternative Route ${cand.route_id}`}</span>
                    <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-bold">ALTERNATIVE</span>
                  </div>
                  <p className="text-slate-600"><strong>Distance:</strong> {cand.distance_km} km</p>
                  <p className="text-slate-600"><strong>Duration:</strong> {cand.duration_hours ? `${cand.duration_hours.toFixed(1)}h` : `${cand.duration_minutes}m`}</p>
                  <p className="text-slate-600"><strong>Weather Risk:</strong> <span className="font-bold">{cand.weather_risk || 'LOW'}</span></p>
                  {onSelectCandidate && (
                    <button
                      onClick={() => onSelectCandidate(cand.route_id)}
                      className="mt-2 w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-1 px-2 rounded text-[11px] transition-colors"
                    >
                      View / Switch to Route {cand.route_id}
                    </button>
                  )}
                </div>
              </Popup>
            </Polyline>
          );
        })}

        {/* Render Active Selected Polyline */}
        {primaryCoords.length > 0 && (
          <Polyline
            positions={primaryCoords}
            pathOptions={{ color: '#2563eb', weight: 6, opacity: 0.9, lineJoin: 'round' }}
          />
        )}

        {/* Pickup Marker */}
        {pickupCoordinates && pickupCoordinates[0] && (
          <Marker position={pickupCoordinates} icon={pickupIcon}>
            <Popup>
              <div className="p-1 max-w-xs">
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Pickup Location</span>
                <p className="font-bold text-sm text-slate-800 mt-1">{pickupAddress || 'Pickup Point'}</p>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{pickupCoordinates[0]?.toFixed(4)}, {pickupCoordinates[1]?.toFixed(4)}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Destination Marker */}
        {destinationCoordinates && destinationCoordinates[0] && (
          <Marker position={destinationCoordinates} icon={destIcon}>
            <Popup>
              <div className="p-1 max-w-xs">
                <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Destination</span>
                <p className="font-bold text-sm text-slate-800 mt-1">{deliveryAddress || 'Destination Point'}</p>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{destinationCoordinates[0]?.toFixed(4)}, {destinationCoordinates[1]?.toFixed(4)}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Driver Current Location Marker */}
        {driverLocation && driverLocation.lat && (
          <Marker position={[driverLocation.lat, driverLocation.lng]} icon={driverIcon}>
            <Popup>
              <div className="p-1">
                <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Driver Position</span>
                <p className="font-bold text-sm text-slate-800 mt-1">🚚 You are here</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Weather Checkpoints on Selected Route */}
        {weatherCheckpoints.map((pt, idx) => (
          pt.latitude && pt.longitude ? (
            <Marker
              key={pt.point_id || idx}
              position={[pt.latitude, pt.longitude]}
              icon={createCheckpointIcon(pt.risk_level)}
            >
              <Popup>
                <div className="p-1 text-xs space-y-1 min-w-[180px]">
                  <div className="flex items-center justify-between border-b pb-1">
                    <span className="font-bold text-slate-700">Checkpoint #{idx + 1}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold text-white ${
                      pt.risk_level === 'LOW' ? 'bg-emerald-500' :
                      pt.risk_level === 'MEDIUM' ? 'bg-amber-500' :
                      pt.risk_level === 'HIGH' ? 'bg-orange-500' : 'bg-rose-600'
                    }`}>
                      {pt.risk_level || 'LOW'} RISK
                    </span>
                  </div>
                  <p className="text-slate-600"><strong>Distance:</strong> {pt.distance_from_origin_km || 0} km from origin</p>
                  {pt.estimated_arrival && (
                    <p className="text-slate-600"><strong>Expected Arrival:</strong> {new Date(pt.estimated_arrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  )}
                  {pt.weather && (
                    <div className="bg-slate-50 p-2 rounded text-[11px] space-y-0.5 mt-1 border">
                      <p>🌡️ <strong>Temp:</strong> {pt.weather.temperature_c ?? 'N/A'} °C</p>
                      <p>🌧️ <strong>Rain Prob:</strong> {pt.weather.precipitation_probability ?? 0}% ({pt.weather.precipitation_mm ?? 0} mm)</p>
                      <p>💨 <strong>Wind:</strong> {pt.weather.wind_speed_kmh ?? 0} km/h</p>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ) : null
        ))}
      </MapContainer>
    </div>
  );
};

export default DeliveryMap;
