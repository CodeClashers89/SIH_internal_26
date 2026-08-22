import React, { useState } from 'react';
import { ShieldCheck, CloudRain, Clock, Navigation, AlertTriangle, Cpu, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

const RouteInfoPanel = ({ route, onRecalculate, isDriver = false }) => {
  const [showReason, setShowReason] = useState(false);
  const [showCheckpoints, setShowCheckpoints] = useState(false);

  if (!route) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center text-xs text-slate-500">
        No active route plan available.
      </div>
    );
  }

  const getRiskBadge = (risk) => {
    switch (risk) {
      case 'LOW':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'HIGH':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'CRITICAL':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const weatherCheckpoints = route.weather_snapshot || [];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 text-xs">

      {/* Header & Status */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <Navigation className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-800 text-sm">Operational Route</h4>
            <span className="text-[10px] text-slate-400 font-semibold">Version #{route.route_version || 1}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] border uppercase ${getRiskBadge(route.weather_risk)}`}>
            🌦️ Weather Risk: {route.weather_risk || 'UNKNOWN'}
          </span>
          <span className="bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[10px] px-2.5 py-1 rounded-full uppercase">
            {route.status || 'ACTIVE'}
          </span>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
          <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
            <Navigation className="h-3 w-3 text-blue-500" /> Distance
          </span>
          <p className="text-base font-black text-slate-800 mt-1">{route.distance_km} km</p>
        </div>

        <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
          <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
            <Clock className="h-3 w-3 text-indigo-500" /> Duration
          </span>
          <p className="text-base font-black text-slate-800 mt-1">{route.duration_hours_formatted || `${route.duration_minutes}m`}</p>
        </div>

        <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
          <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
            <Clock className="h-3 w-3 text-emerald-500" /> Estimated Arrival
          </span>
          <p className="text-sm font-bold text-slate-800 mt-1">
            {route.estimated_arrival ? new Date(route.estimated_arrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
          <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-purple-500" /> Cargo Risk
          </span>
          <p className="text-sm font-bold text-slate-800 mt-1 uppercase">{route.quality_risk || 'LOW'}</p>
        </div>
      </div>

      {/* AI Recommendation Reasoning */}
      {route.llm_reason && (
        <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border border-blue-100 rounded-xl p-3">
          <button
            onClick={() => setShowReason(!showReason)}
            className="w-full flex items-center justify-between text-[11px] font-bold text-blue-800"
          >
            <span className="flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-blue-600" />
              AI Route Recommendation Explanation ({route.selection_method === 'llm_recommendation' ? 'LLM Reasoned' : 'Deterministic Rule Engine'})
            </span>
            {showReason ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {showReason && (
            <p className="text-slate-600 text-[11px] leading-relaxed mt-2 border-t border-blue-100 pt-2 animate-fade-in">
              {route.llm_reason}
            </p>
          )}
        </div>
      )}

      {/* Weather Checkpoints Accordion */}
      {weatherCheckpoints.length > 0 && (
        <div className="border border-slate-100 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowCheckpoints(!showCheckpoints)}
            className="w-full bg-slate-50 px-3 py-2 flex items-center justify-between text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <CloudRain className="h-3.5 w-3.5 text-blue-500" />
              Weather Forecast Checkpoints ({weatherCheckpoints.length} points sampled along route)
            </span>
            {showCheckpoints ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {showCheckpoints && (
            <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
              {weatherCheckpoints.map((pt, i) => (
                <div key={i} className="flex items-center justify-between bg-white border border-slate-100 p-2 rounded-lg text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${
                      pt.risk_level === 'LOW' ? 'bg-emerald-500' :
                      pt.risk_level === 'MEDIUM' ? 'bg-amber-500' :
                      pt.risk_level === 'HIGH' ? 'bg-orange-500' : 'bg-rose-500'
                    }`} />
                    <span className="font-semibold text-slate-700">Checkpoint {i + 1} ({pt.distance_from_origin_km || 0} km)</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500">
                    {pt.weather && (
                      <>
                        <span>🌡️ {pt.weather.temperature_c ?? '--'}°C</span>
                        <span>🌧️ {pt.weather.precipitation_probability ?? 0}% rain</span>
                      </>
                    )}
                    <span className="font-bold uppercase text-[10px] text-slate-700">{pt.risk_level}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recalculate Button */}
      {onRecalculate && (
        <div className="pt-2 flex justify-end">
          <button
            onClick={onRecalculate}
            className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline"
          >
            🔄 Recalculate Route (Weather / Disruption)
          </button>
        </div>
      )}
    </div>
  );
};

export default RouteInfoPanel;
