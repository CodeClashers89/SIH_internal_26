import React, { useEffect, useMemo, useState } from 'react';
import { GoogleMap, InfoWindow, Marker, Polyline, useJsApiLoader } from '@react-google-maps/api';

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 };
const ALT_COLORS = ['#9333ea', '#d97706', '#0891b2', '#4b5563'];
const toLatLng = (point) => ({ lat: Number(point[0]), lng: Number(point[1]) });

const DeliveryMap = ({ pickupAddress, deliveryAddress, pickupCoordinates, destinationCoordinates, routeGeometry, weatherCheckpoints = [], candidateRoutes = [], selectedRouteId = null, onSelectCandidate, driverLocation = null, height = '480px' }) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: apiKey || '' });
  const [map, setMap] = useState(null);
  const [openInfo, setOpenInfo] = useState(null);
  const pickup = pickupCoordinates?.[0] != null ? toLatLng(pickupCoordinates) : null;
  const destination = destinationCoordinates?.[0] != null ? toLatLng(destinationCoordinates) : null;
  const primaryPath = useMemo(() => (routeGeometry || []).map(toLatLng), [routeGeometry]);
  const boundsPoints = useMemo(() => [...primaryPath, ...(pickup ? [pickup] : []), ...(destination ? [destination] : [])], [primaryPath, pickup, destination]);

  useEffect(() => {
    if (!map || !boundsPoints.length || !window.google) return;
    const bounds = new window.google.maps.LatLngBounds();
    boundsPoints.forEach(point => bounds.extend(point));
    map.fitBounds(bounds, 40);
  }, [map, boundsPoints]);

  if (!apiKey) return <div className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800" style={{ height }}>Google Maps is not configured. Add your key to <strong>frontend/.env</strong> as <code>VITE_GOOGLE_MAPS_API_KEY</code>, then restart Vite.</div>;
  if (loadError) return <div className="w-full rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700" style={{ height }}>Google Maps could not load. Check the API key and Maps JavaScript API.</div>;
  if (!isLoaded) return <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500" style={{ height }}>Loading Google Maps...</div>;

  return <div className="relative w-full overflow-hidden rounded-2xl border border-slate-200 shadow-sm" style={{ height }}>
    <div className="absolute right-3 top-3 z-10 rounded-xl border border-slate-200 bg-white/95 p-2.5 text-[11px] font-bold text-slate-700 shadow-md">Selected Route</div>
    <GoogleMap mapContainerStyle={{ height: '100%', width: '100%' }} center={pickup || primaryPath[0] || DEFAULT_CENTER} zoom={7} onLoad={setMap} onClick={() => setOpenInfo(null)} options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: true }}>
      {candidateRoutes.map((route, index) => {
        const selected = selectedRouteId ? route.route_id === selectedRouteId : index === 0;
        if (selected || !route.geometry?.length) return null;
        return <Polyline key={route.route_id || index} path={route.geometry.map(toLatLng)} options={{ strokeColor: ALT_COLORS[index % ALT_COLORS.length], strokeOpacity: 0.7, strokeWeight: 4 }} onClick={() => onSelectCandidate?.(route.route_id)} />;
      })}
      {primaryPath.length > 0 && <Polyline path={primaryPath} options={{ strokeColor: '#2563eb', strokeOpacity: 0.9, strokeWeight: 6 }} />}
      {pickup && <Marker position={pickup} label={{ text: 'P', color: 'white', fontWeight: 'bold' }} onClick={() => setOpenInfo('pickup')} />}
      {destination && <Marker position={destination} label={{ text: 'D', color: 'white', fontWeight: 'bold' }} onClick={() => setOpenInfo('destination')} />}
      {driverLocation?.lat && <Marker position={{ lat: Number(driverLocation.lat), lng: Number(driverLocation.lng) }} label={{ text: 'T', color: 'white', fontWeight: 'bold' }} onClick={() => setOpenInfo('driver')} />}
      {weatherCheckpoints.map((point, index) => point.latitude && point.longitude && <Marker key={point.point_id || index} position={{ lat: Number(point.latitude), lng: Number(point.longitude) }} onClick={() => setOpenInfo(`weather-${index}`)} />)}
      {openInfo === 'pickup' && pickup && <InfoWindow position={pickup} onCloseClick={() => setOpenInfo(null)}><div><strong>Pickup Location</strong><p>{pickupAddress || 'Pickup Point'}</p></div></InfoWindow>}
      {openInfo === 'destination' && destination && <InfoWindow position={destination} onCloseClick={() => setOpenInfo(null)}><div><strong>Destination</strong><p>{deliveryAddress || 'Destination Point'}</p></div></InfoWindow>}
      {openInfo === 'driver' && driverLocation && <InfoWindow position={{ lat: Number(driverLocation.lat), lng: Number(driverLocation.lng) }} onCloseClick={() => setOpenInfo(null)}><strong>Driver Position</strong></InfoWindow>}
    </GoogleMap>
  </div>;
};

export default DeliveryMap;
