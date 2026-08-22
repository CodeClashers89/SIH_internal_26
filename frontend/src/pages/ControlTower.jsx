import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    AlertTriangle, 
    XCircle, 
    CheckCircle,
    Truck,
    IndianRupee,
    Package
} from 'lucide-react';

const ControlTower = () => {
    const [summary, setSummary] = useState(null);
    const [exceptions, setExceptions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const summaryRes = await axios.get('http://localhost:8000/api/control-tower/summary/');
            const exceptionsRes = await axios.get('http://localhost:8000/api/control-tower/exceptions/');
            setSummary(summaryRes.data);
            setExceptions(exceptionsRes.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching Control Tower data:", error);
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Control Tower...</div>;
    if (!summary) return <div className="p-8 text-center text-red-500">Failed to load Control Tower data.</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Control Tower</h1>
                <p className="text-gray-500 mt-2">Real-time agricultural supply chain monitoring and exception management.</p>
            </header>

            {/* Section A - Operational Summary */}
            <section className="mb-12">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Operational Summary</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Active Orders */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-500">Active Orders</h3>
                            <Package className="w-5 h-5 text-indigo-500" />
                        </div>
                        <p className="text-3xl font-bold text-gray-900 mt-2">{summary.active_orders}</p>
                    </div>

                    {/* Orders At Risk */}
                    <div className="bg-white rounded-xl shadow-sm border border-red-100 p-6 bg-red-50/30">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-red-600">Orders At Risk</h3>
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                        </div>
                        <p className="text-3xl font-bold text-red-700 mt-2">{summary.orders_at_risk}</p>
                    </div>

                    {/* Delayed Orders */}
                    <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 bg-orange-50/30">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-orange-600">Delayed Orders</h3>
                            <AlertTriangle className="w-5 h-5 text-orange-500" />
                        </div>
                        <p className="text-3xl font-bold text-orange-700 mt-2">{summary.delayed_orders}</p>
                    </div>

                    {/* Available Trucks */}
                    <div className="bg-white rounded-xl shadow-sm border border-emerald-100 p-6 bg-emerald-50/30">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-emerald-600">Available Trucks</h3>
                            <Truck className="w-5 h-5 text-emerald-500" />
                        </div>
                        <p className="text-3xl font-bold text-emerald-700 mt-2">{summary.available_trucks}</p>
                    </div>

                    {/* Pending Handovers */}
                    <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6 bg-blue-50/30">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-blue-600">Pending Handovers</h3>
                            <AlertTriangle className="w-5 h-5 text-blue-500" />
                        </div>
                        <p className="text-3xl font-bold text-blue-700 mt-2">{summary.pending_handovers}</p>
                    </div>

                    {/* Completed Handovers */}
                    <div className="bg-white rounded-xl shadow-sm border border-green-100 p-6 bg-green-50/30">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-green-600">Locked & In Transit</h3>
                            <CheckCircle className="w-5 h-5 text-green-500" />
                        </div>
                        <p className="text-3xl font-bold text-green-700 mt-2">{summary.completed_handovers}</p>
                    </div>
                </div>
            </section>

            {/* Section B - Critical Exceptions Queue */}
            <section className="mb-12">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                    Exceptions Queue
                    <span className="ml-3 bg-red-100 text-red-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                        {summary.critical_exceptions} Critical
                    </span>
                </h2>
                
                {exceptions.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-500 flex flex-col items-center">
                        <CheckCircle className="w-12 h-12 text-emerald-400 mb-3" />
                        <p className="font-medium text-gray-900 text-lg">No active exceptions</p>
                        <p>The supply chain is operating smoothly.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {exceptions.map((exc) => (
                            <div key={exc.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className={`mt-1 flex-shrink-0 w-3 h-3 rounded-full ${
                                            exc.severity === 'CRITICAL' ? 'bg-red-500 animate-pulse' : 
                                            exc.severity === 'HIGH' ? 'bg-orange-500' : 
                                            'bg-yellow-400'
                                        }`} />
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-lg font-bold text-gray-900">{exc.title}</h3>
                                                <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                    {exc.entity_type} #{exc.entity_id}
                                                </span>
                                            </div>
                                            <p className="text-gray-600 mt-1">{exc.description}</p>
                                        </div>
                                    </div>
                                    <button className="px-4 py-2 bg-indigo-50 text-indigo-700 text-sm font-semibold rounded-lg hover:bg-indigo-100 transition-colors">
                                        Resolve
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

export default ControlTower;
