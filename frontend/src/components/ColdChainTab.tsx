import React, { useState } from 'react';
import {
  Truck,
  MapPin,
  Clock,
  Thermometer,
  Droplets,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { SimulationState } from '../types/simulation';
import { DataBadge } from './DataBadge';
import { RefrigeratedTruckView } from './RefrigeratedTruckView';
import { api } from '../services/api';

interface ColdChainTabProps {
  simulationState: SimulationState | null;
  simpleMode: boolean;
  onRefreshState: () => void;
}

export const ColdChainTab: React.FC<ColdChainTabProps> = ({
  simulationState,
  simpleMode,
  onRefreshState,
}) => {
  const [selectedScenario, setSelectedScenario] = useState<string>('NORMAL');
  const truck = simulationState?.refrigerated_truck;
  const ambient = simulationState?.ambient_environment;

  const handleApplyScenario = async (scKey: string) => {
    setSelectedScenario(scKey);
    await api.updateControls({ scenario_key: scKey });
    onRefreshState();
  };

  if (!truck) {
    return (
      <div className="p-8 text-center text-slate-500 font-medium bg-white border border-slate-200 rounded-xl">
        Loading Cold Chain Digital Twin...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* SaaS Dashboard Title Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
              Module 2 — Cold Chain Logistics
            </span>
            <DataBadge label="SIMULATED" sourceText="Transit Physics" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">
            Intelligent Cold Chain Telematics &amp; 2D Digital Twin
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Active corridor transit: Bengaluru → Mandya. Real-time multi-zone temperatures, door open convection, and loss risk.
          </p>
        </div>

        {/* Live Route Pill */}
        <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs space-y-1">
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <MapPin className="w-3.5 h-3.5 text-blue-600" />
            <span>{truck.origin} → {truck.destination}</span>
          </div>
          <div className="text-slate-500 text-[11px] flex items-center justify-between gap-4">
            <span>Route: <strong className="text-slate-800">{truck.route_distance_km} km</strong></span>
            <span>ETA: <strong className="text-amber-600 font-bold">{truck.eta_minutes.toFixed(0)} mins</strong></span>
            <span>Progress: <strong className="text-slate-800">{truck.route_progress_pct}%</strong></span>
          </div>
        </div>
      </div>

      {/* THREE PRIMARY SIMULATION SCENARIOS */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <span className="text-xs uppercase font-bold text-slate-700">
            Primary Operating Scenarios
          </span>
          <span className="text-xs text-slate-500">
            Active: <strong className="text-blue-600">{simulationState?.active_scenario.name}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Scenario 1: Normal Journey */}
          <button
            onClick={() => handleApplyScenario('NORMAL')}
            className={`p-4 rounded-xl border text-left transition-all ${
              selectedScenario === 'NORMAL'
                ? 'bg-blue-50/50 border-blue-600 ring-1 ring-blue-600 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-slate-900 text-sm">1. NORMAL JOURNEY</span>
              {selectedScenario === 'NORMAL' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Vapor-compression refrigeration functions properly. Cargo chilled to setpoint (11°C).
            </p>
          </button>

          {/* Scenario 2: High External Temperature */}
          <button
            onClick={() => handleApplyScenario('HEATWAVE')}
            className={`p-4 rounded-xl border text-left transition-all ${
              selectedScenario === 'HEATWAVE'
                ? 'bg-amber-50/50 border-amber-500 ring-1 ring-amber-500 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-amber-700 text-sm">2. HIGH EXTERNAL TEMP</span>
              {selectedScenario === 'HEATWAVE' && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Ambient solar radiation surges (+10°C), heavily loading insulation sandwich panels.
            </p>
          </button>

          {/* Scenario 3: Cooling System Failure */}
          <button
            onClick={() => handleApplyScenario('REEFER_FAILURE')}
            className={`p-4 rounded-xl border text-left transition-all ${
              selectedScenario === 'REEFER_FAILURE'
                ? 'bg-red-50/50 border-red-500 ring-1 ring-red-500 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-red-700 text-sm">3. COOLING FAILURE</span>
              {selectedScenario === 'REEFER_FAILURE' && <CheckCircle2 className="w-4 h-4 text-red-600" />}
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Reefer compressor stops. Internal temperature gradually rises via heat conduction.
            </p>
          </button>
        </div>
      </div>

      {/* Live Monitoring KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-500 block text-[10px] uppercase font-semibold">Internal Temp</span>
          <strong className="text-xl font-bold text-slate-900 mt-0.5 block">
            {truck.mean_cargo_temp_c.toFixed(1)}°C
          </strong>
          <span className="text-[10px] text-slate-500">Target: {truck.target_temp_c}°C</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-500 block text-[10px] uppercase font-semibold">Outside Ambient</span>
          <strong className="text-xl font-bold text-slate-900 mt-0.5 block">
            {ambient?.temperature_c ?? 28}°C
          </strong>
          <span className="text-[10px] text-blue-600 font-medium">Open-Meteo Live</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-500 block text-[10px] uppercase font-semibold">Cargo Humidity</span>
          <strong className="text-xl font-bold text-slate-900 mt-0.5 block">
            {truck.internal_rh_pct.toFixed(0)}%
          </strong>
          <span className="text-[10px] text-slate-500">Relative RH</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-500 block text-[10px] uppercase font-semibold">Shelf Life Days</span>
          <strong className="text-xl font-bold text-amber-600 mt-0.5 block">
            {truck.remaining_shelf_life_days.toFixed(1)} Days
          </strong>
          <span className="text-[10px] text-slate-500">~{truck.remaining_shelf_life_hours.toFixed(0)} hrs</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-500 block text-[10px] uppercase font-semibold">Spoilage Risk</span>
          <strong className={`text-xl font-bold mt-0.5 block ${truck.spoilage_category === 'LOW' ? 'text-emerald-600' : 'text-red-600'}`}>
            {truck.spoilage_risk_pct.toFixed(0)}%
          </strong>
          <span className="text-[10px] text-slate-500">{truck.spoilage_category}</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-500 block text-[10px] uppercase font-semibold">Value At Risk</span>
          <strong className="text-lg font-bold text-red-600 mt-0.5 block truncate">
            INR {truck.value_at_risk_inr.toLocaleString()}
          </strong>
          <span className="text-[10px] text-slate-500">of INR {truck.total_cargo_value_inr.toLocaleString()}</span>
        </div>
      </div>

      {/* 2D Cutaway Illustration & Interactive Telematics */}
      <RefrigeratedTruckView
        simulationState={simulationState}
        simpleMode={simpleMode}
        onRefreshState={onRefreshState}
      />
    </div>
  );
};
