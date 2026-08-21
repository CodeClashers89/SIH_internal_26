import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const PriceComparisonChart = () => {
  // Static pricing benchmark data showing middleman cost elimination impact
  const data = [
    { name: 'Tomato (Local)', MandiPrice: 20.00, KisanConnect: 25.00, RetailPrice: 40.00 },
    { name: 'Potato (Jyoti)', MandiPrice: 14.00, KisanConnect: 18.00, RetailPrice: 30.00 },
    { name: 'Onion (Red)', MandiPrice: 18.00, KisanConnect: 22.00, RetailPrice: 35.00 },
    { name: 'Rice (Basmati)', MandiPrice: 65.00, KisanConnect: 78.00, RetailPrice: 110.00 },
    { name: 'Wheat (Lokwan)', MandiPrice: 22.00, KisanConnect: 26.00, RetailPrice: 42.00 },
  ];

  return (
    <div className="w-full bg-white border border-slate-100 rounded-3xl p-5 shadow-xs">
      <h3 className="text-base font-bold text-slate-800 mb-1">Pricing Benchmark Index</h3>
      <p className="text-xs text-slate-500 mb-6">Comparing prices (per kg) across traditional Mandi, KisanConnect, and Retail.</p>
      
      <div className="h-72 w-full text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" stroke="#64748b" tickLine={false} />
            <YAxis stroke="#64748b" tickLine={false} />
            <Tooltip 
              contentStyle={{ background: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff' }}
              labelStyle={{ fontWeight: 'bold', color: '#38bdf8' }}
            />
            <Legend verticalAlign="top" height={36} iconType="circle" />
            <Bar dataKey="MandiPrice" name="Traditional Mandi" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
            <Bar dataKey="KisanConnect" name="KisanConnect (Direct)" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="RetailPrice" name="Retail Store" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 p-3 bg-emerald-50 rounded-2xl text-[11px] text-emerald-800 leading-relaxed">
        <strong>💡 Key Insight:</strong> Farmers sell above wholesale Mandi rates, while consumers buy below retail market price by bypassing middleman fees.
      </div>
    </div>
  );
};

export default PriceComparisonChart;
