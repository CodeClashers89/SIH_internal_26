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

// Helper component to fit map to route bounds
function MapBoundsController({ geometry, pickupCoords, destCoords }) {
  const map = useMap();

  useEffect(() => {
    const points = [];
    if (geometry && geometry.length > 0) {
      geometry.forEach(pt => points.push([pt[0], pt[1]]));
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
  }, [geometry, pickupCoords, destCoords, map]);

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
    case 'LOW': return '#10b981';      // Emerald
    case 'MEDIUM': return '#eab308';   // Amber
    case 'HIGH': return '#f97316';     // Orange
    case 'CRITICAL': return '#ef4444'; // Red
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

const DeliveryMap = ({
  pickupAddress,
  deliveryAddress,
  pickupCoordinates,
  destinationCoordinates,
  routeGeometry,
  weatherCheckpoints = [],
  driverLocation = null,
  height = '450px',
}) => {
  // Default to center of India if coordinates are missing
  const defaultCenter = pickupCoordinates && pickupCoordinates[0]
    ? pickupCoordinates
    : [20.5937, 78.9629];

  const polylineCoords = routeGeometry ? routeGeometry.map(pt => [pt[0], pt[1]]) : [];

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-sm border border-slate-200" style={{ height }}>
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
          geometry={routeGeometry}
          pickupCoords={pickupCoordinates}
          destCoords={destinationCoordinates}
        />

        {/* Route Polyline */}
        {polylineCoords.length > 0 && (
          <Polyline
            positions={polylineCoords}
            pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.85, lineJoin: 'round' }}
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

        {/* Weather Checkpoints */}
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
