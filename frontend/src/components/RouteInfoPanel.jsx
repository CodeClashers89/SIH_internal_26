import React, { useState } from 'react';
import { ShieldCheck, CloudRain, Clock, Navigation, AlertTriangle, Cpu, CheckCircle2, ChevronDown, ChevronUp, Layers, Check } from 'lucide-react';

const RouteInfoPanel = ({
  route,
  selectedCandidateId,
  onSelectCandidate,
  onRecalculate,
  isDriver = false
}) => {
  const [showReason, setShowReason] = useState(false);
  const [showCheckpoints, setShowCheckpoints] = useState(false);

  if (!route) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center text-xs text-slate-500">
        No active route plan available.
      </div>
    );
  }

  const candidateRoutes = route.candidate_routes || [];
  const activeRouteId = selectedCandidateId || route.route_id || candidateRoutes[0]?.route_id || 'R1';

  // Find selected candidate details (or fallback to active route details)
  const activeCandidate = candidateRoutes.find(c => c.route_id === activeRouteId) || {
    route_id: route.route_id || 'R1',
    name: 'Main Highway Route',
    distance_km: route.distance_km,
    duration_minutes: route.duration_minutes,
    duration_hours: route.duration_minutes / 60,
    weather_risk: route.weather_risk,
    quality_risk: route.quality_risk,
  };

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

  const weatherCheckpoints = activeCandidate.weather_checkpoints || route.weather_snapshot || [];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 text-xs">

      {/* Header & Status */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <Navigation className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <span>Operational Route ({activeCandidate.name || `Route ${activeCandidate.route_id}`})</span>
            </h4>
            <span className="text-[10px] text-slate-400 font-semibold">Version #{route.route_version || 1} • {candidateRoutes.length} Candidate Route(s) Available</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] border uppercase ${getRiskBadge(activeCandidate.weather_risk || route.weather_risk)}`}>
            🌦️ Weather Risk: {activeCandidate.weather_risk || route.weather_risk || 'UNKNOWN'}
          </span>
          <span className="bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[10px] px-2.5 py-1 rounded-full uppercase">
            {route.status || 'ACTIVE'}
          </span>
        </div>
      </div>

      {/* ── Candidate Routes Selector Section ── */}
      {candidateRoutes.length > 0 && (
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-indigo-600" />
              Generated Candidate Routes ({candidateRoutes.length})
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Click any route to view/switch on map</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {candidateRoutes.map((cand, idx) => {
              const isSelected = cand.route_id === activeRouteId;
              const isRecommended = idx === 0;

              return (
                <button
                  key={cand.route_id || idx}
                  onClick={() => onSelectCandidate && onSelectCandidate(cand.route_id)}
                  className={`p-2.5 rounded-xl border text-left transition-all relative ${
                    isSelected
                      ? 'bg-white border-blue-600 ring-2 ring-blue-100 shadow-xs'
                      : 'bg-white/60 border-slate-200 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black text-slate-800 text-xs flex items-center gap-1">
                      {cand.route_id}: {cand.name || `Route ${cand.route_id}`}
                      {isSelected && <Check className="h-3.5 w-3.5 text-blue-600 stroke-[3]" />}
                    </span>
                    {isRecommended && (
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded">
                        RECOMMENDED
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                    <span>📏 {cand.distance_km} km</span>
                    <span>⏱️ {cand.duration_hours ? `${cand.duration_hours.toFixed(1)}h` : `${cand.duration_minutes}m`}</span>
                    <span className={`font-bold text-[9px] px-1.5 py-0.5 rounded ${
                      cand.weather_risk === 'LOW' ? 'bg-emerald-50 text-emerald-700' :
                      cand.weather_risk === 'MEDIUM' ? 'bg-amber-50 text-amber-700' :
                      cand.weather_risk === 'HIGH' ? 'bg-orange-50 text-orange-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {cand.weather_risk || 'LOW'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Primary Metrics Grid for Selected Candidate */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
          <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
            <Navigation className="h-3 w-3 text-blue-500" /> Distance
          </span>
          <p className="text-base font-black text-slate-800 mt-1">{activeCandidate.distance_km} km</p>
        </div>

        <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
          <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
            <Clock className="h-3 w-3 text-indigo-500" /> Duration
          </span>
          <p className="text-base font-black text-slate-800 mt-1">
            {activeCandidate.duration_hours ? `${activeCandidate.duration_hours.toFixed(1)}h` : `${activeCandidate.duration_minutes}m`}
          </p>
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
          <p className="text-sm font-bold text-slate-800 mt-1 uppercase">{activeCandidate.quality_risk || route.quality_risk || 'LOW'}</p>
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
              Weather Forecast Checkpoints for {activeCandidate.name || `Route ${activeCandidate.route_id}`} ({weatherCheckpoints.length} sampled points)
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
            🔄 Recalculate Routes (Weather / Disruption)
          </button>
        </div>
      )}
    </div>
  );
};

export default RouteInfoPanel;
