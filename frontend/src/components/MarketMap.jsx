import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

function MapBoundsManager({ markets }) {
  const map = useMap();
  
  useEffect(() => {
    if (markets && markets.length > 0) {
      const bounds = L.latLngBounds(markets.map(m => [m.latitude, m.longitude]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [markets, map]);
  
  return null;
}

const MarketMap = ({ markets, onMarketSelect }) => {
  // Default to center of India if no markets
  const defaultCenter = [20.5937, 78.9629];
  const defaultZoom = 5;

  return (
    <div style={{ height: '500px', width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
      <MapContainer 
        center={defaultCenter} 
        zoom={defaultZoom} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {markets.length > 0 && <MapBoundsManager markets={markets} />}

        <MarkerClusterGroup>
          {markets.map((market) => (
            market.latitude && market.longitude ? (
              <Marker 
                key={market.id} 
                position={[market.latitude, market.longitude]}
                eventHandlers={{
                  click: () => onMarketSelect(market)
                }}
              >
                <Popup>
                  <div className="font-semibold text-lg">{market.name}</div>
                  <div className="text-gray-600">{market.district}, {market.state}</div>
                  <div className="mt-2 text-sm text-green-600 font-medium">
                    <button 
                      onClick={() => onMarketSelect(market)}
                      className="text-blue-500 hover:underline"
                    >
                      View Prices
                    </button>
                  </div>
                </Popup>
              </Marker>
            ) : null
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
};

export default MarketMap;
