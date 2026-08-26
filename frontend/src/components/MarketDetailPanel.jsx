import React, { useState, useEffect } from 'react';
import api from '../utils/api';

const MarketDetailPanel = ({ market, onClose }) => {
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!market) return;
    
    const fetchPrices = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/market-prices/markets/${market.id}/prices/`);
        const data = response.data;
        setPrices(data);
      } catch (err) {
        setError("Unable to retrieve latest government data.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchPrices();
  }, [market]);

  const filteredPrices = prices.filter(p => 
    p.commodity.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!market) return null;

  return (
    <div className="bg-white border rounded-lg shadow-lg p-6 max-h-[600px] overflow-y-auto flex flex-col">
      <div className="flex justify-between items-start mb-4 border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 uppercase">{market.name}</h2>
          <p className="text-gray-600">{market.district}, {market.state}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="mb-4">
        <input 
          type="text"
          placeholder="Search commodity..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full p-2 border rounded border-gray-300 focus:ring focus:ring-green-200 focus:border-green-500"
        />
      </div>

      <div className="flex-grow overflow-x-auto">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading market data...</div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">{error}</div>
        ) : filteredPrices.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No price data available for this market.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commodity</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Variety</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Price</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Max Price</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-green-600 uppercase tracking-wider">Modal Price</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPrices.map(price => (
                <tr key={price.id} className="hover:bg-gray-50">
                  <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{price.commodity}</td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{price.variety || "—"}</td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{price.grade || "—"}</td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">₹{price.min_price || "—"}</td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">₹{price.max_price || "—"}</td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm font-semibold text-green-600">₹{price.modal_price || "—"}</td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{price.reported_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-medium">Government Data</span>
          <span className="font-semibold text-gray-700">AGMARKNET</span>
        </div>
        <div className="group relative">
          <svg className="w-4 h-4 text-gray-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="absolute bottom-full right-0 mb-2 w-64 bg-gray-800 text-white p-2 rounded shadow-lg text-xs hidden group-hover:block z-50">
            These are government-reported market prices and may differ from the final transaction price received by a farmer.
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketDetailPanel;
