import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const DemandForecastingChart = ({ data = [] }) => {
  const formattedData = data.map(item => ({
    ...item,
    // Format date for label readability (e.g., Aug 21)
    label: new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }));

  return (
    <div className="w-full bg-white border border-slate-100 rounded-3xl p-5 shadow-xs">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-800 mb-1">Sales Volume Trend (Last 30 Days)</h3>
          <p className="text-xs text-slate-500">Aggregated daily orders (quantity) for listed crops.</p>
        </div>
        <span className="text-[10px] bg-blue-50 text-blue-700 font-extrabold px-2 py-0.5 rounded-full border border-blue-100">
          Rule-Based Aggregation
        </span>
      </div>

      <div className="h-64 w-full text-xs">
        {formattedData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400">
            No sales records available in the selected range.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={formattedData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" stroke="#64748b" tickLine={false} />
              <YAxis stroke="#64748b" tickLine={false} />
              <Tooltip 
                contentStyle={{ background: '#0f172a', borderRadius: '12px', border: 'none', color: '#white' }}
                labelStyle={{ fontWeight: 'bold', color: '#38bdf8' }}
              />
              <Area type="monotone" dataKey="quantity" name="Qty Sold" stroke="#0ea5e9" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSales)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-[10px] text-slate-500">
        <strong>💡 Note:</strong> Showing historical totals. A prediction curve (ML forecast models like ARIMA/Prophet) can be overlaid here when backend forecasting modules are activated.
      </div>
    </div>
  );
};

export default DemandForecastingChart;
