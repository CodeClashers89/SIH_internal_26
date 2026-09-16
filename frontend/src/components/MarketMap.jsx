import React, { useEffect, useState } from 'react';
import { GoogleMap, InfoWindow, Marker, useJsApiLoader } from '@react-google-maps/api';

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 };

const MarketMap = ({ markets, onMarketSelect }) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: apiKey || '' });
  const [map, setMap] = useState(null);
  const [selectedMarket, setSelectedMarket] = useState(null);

  useEffect(() => {
    if (!map || !markets?.length || !window.google) return;
    const validMarkets = markets.filter(market => market.latitude != null && market.longitude != null);
    if (!validMarkets.length) return;
    const bounds = new window.google.maps.LatLngBounds();
    validMarkets.forEach(market => bounds.extend({ lat: Number(market.latitude), lng: Number(market.longitude) }));
    map.fitBounds(bounds, 50);
  }, [map, markets]);

  if (!apiKey) return <div className="w-full rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800" style={{ height: '500px' }}>Google Maps is not configured. Add your key to <strong>frontend/.env</strong> as <code>VITE_GOOGLE_MAPS_API_KEY</code>, then restart Vite.</div>;
  if (loadError) return <div className="w-full rounded-lg border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700" style={{ height: '500px' }}>Google Maps could not load. Check the API key and Maps JavaScript API.</div>;
  if (!isLoaded) return <div className="w-full rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500" style={{ height: '500px' }}>Loading Google Maps...</div>;

  return <div style={{ height: '500px', width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
    <GoogleMap mapContainerStyle={{ height: '100%', width: '100%' }} center={DEFAULT_CENTER} zoom={5} onLoad={setMap} options={{ streetViewControl: false, mapTypeControl: false }}>
      {markets?.map(market => market.latitude != null && market.longitude != null && (
        <Marker
          key={market.id}
          position={{ lat: Number(market.latitude), lng: Number(market.longitude) }}
          onClick={() => { setSelectedMarket(market); onMarketSelect(market); }}
        />
      ))}
      {selectedMarket && <InfoWindow position={{ lat: Number(selectedMarket.latitude), lng: Number(selectedMarket.longitude) }} onCloseClick={() => setSelectedMarket(null)}>
        <div className="font-semibold"><div className="text-lg">{selectedMarket.name}</div><div className="text-gray-600">{selectedMarket.district}, {selectedMarket.state}</div><button onClick={() => onMarketSelect(selectedMarket)} className="mt-2 text-blue-500 hover:underline">View Prices</button></div>
      </InfoWindow>}
    </GoogleMap>
  </div>;
};

export default MarketMap;
