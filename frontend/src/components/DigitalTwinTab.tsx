import React, { useState } from 'react';
import {
  Warehouse,
  Thermometer,
  Droplets,
  Wind,
  Layers,
  Sparkles,
  CheckCircle2,
  Sliders,
  Flame,
  Activity,
  RefreshCw,
  Gauge,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { SimulationState } from '../types/simulation';
import { WarehouseCanvas } from './three/WarehouseCanvas';
import { DataBadge } from './DataBadge';
import { api } from '../services/api';

interface DigitalTwinTabProps {
  simulationState: SimulationState | null;
  onRefreshState: () => void;
}

export const DigitalTwinTab: React.FC<DigitalTwinTabProps> = ({
  simulationState,
  onRefreshState,
}) => {
  const cold = simulationState?.cold_storage;
  const chambers = cold?.chambers || {};

  const [chATarget, setChATarget] = useState<number>(chambers.chamber_a?.target_temp_c ?? 12.0);
  const [chBTarget, setChBTarget] = useState<number>(chambers.chamber_b?.target_temp_c ?? 8.0);
  const [chCTarget, setChCTarget] = useState<number>(chambers.chamber_c?.target_temp_c ?? 2.0);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [applyMessage, setApplyMessage] = useState<string | null>(null);

  const handleApplySetpoints = async () => {
    setIsApplying(true);
    setApplyMessage(null);
    try {
      await api.updateControls({
        chamber_target_temp: {
          chamber_a: chATarget,
          chamber_b: chBTarget,
          chamber_c: chCTarget,
        },
      });
      setApplyMessage('Thermostat setpoints successfully synchronized with Digital Twin.');
      setTimeout(() => setApplyMessage(null), 4000);
      onRefreshState();
    } catch (err: any) {
      setApplyMessage(err.message || 'Failed to update chamber setpoints');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-6 text-[#1E293B]">
      {/* SaaS Blue Top Banner */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]">
              <Warehouse className="w-3.5 h-3.5 text-[#2563EB]" />
              THREE.JS 3D DIGITAL TWIN
            </span>
            <DataBadge label="SIMULATED" sourceText="3D WebGL / R3F Engine" />
          </div>
          <h2 className="text-xl font-bold text-[#1E293B] mt-2 tracking-tight">
            Cold Storage Warehouse Digital Twin
          </h2>
          <p className="text-sm text-[#64748B] mt-1 max-w-2xl">
            Real-time interactive 3D virtual replica of the multi-zone cold storage warehouse. Procedural produce models dynamically update their surface color and necrotic decay shaders based on numerical deterioration kinetics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#F8FAFC] px-4 py-2 rounded-lg border border-[#E2E8F0] text-xs">
            <span className="text-[#64748B] block text-[10px] uppercase font-bold tracking-wider">Aggregated Quality</span>
            <span className="text-[#1E293B] font-extrabold text-base">
              {((cold as any)?.mean_quality_score ?? 91.8).toFixed(1)}%
            </span>
          </div>
          <button
            onClick={onRefreshState}
            className="p-2.5 rounded-lg bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#1E293B] hover:bg-[#F8FAFC] transition-colors"
            title="Refresh State"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3D Warehouse Canvas Container */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] animate-pulse"></span>
            <span className="font-bold text-[#1E293B]">Interactive 3D WebGL Viewport</span>
            <span className="text-[#64748B]">| Orbit: Left-click drag • Zoom: Scroll • Pan: Right-click</span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[#64748B]">
            <span>Click any crate rack to inspect microclimate sensor telemetry</span>
          </div>
        </div>

        <div className="relative">
          <WarehouseCanvas
            simulationState={simulationState}
            onRefreshState={onRefreshState}
          />
        </div>
      </div>

      {/* Chamber Telemetry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Chamber A */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]"></span>
              <h3 className="font-bold text-sm text-[#1E293B]">Chamber A (Tomatoes &amp; Bananas)</h3>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200">
              Optimal: 12-14°C
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
              <span className="text-[10px] text-[#64748B] block font-semibold">Current Temp</span>
              <span className="text-base font-bold text-[#1E293B]">
                {(chambers.chamber_a?.internal_temp_c ?? 13.0).toFixed(1)} °C
              </span>
            </div>
            <div className="p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
              <span className="text-[10px] text-[#64748B] block font-semibold">Relative Humidity</span>
              <span className="text-base font-bold text-[#1E293B]">
                {(chambers.chamber_a?.internal_rh_pct ?? 90.0).toFixed(1)} %
              </span>
            </div>
            <div className="p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
              <span className="text-[10px] text-[#64748B] block font-semibold">Produce Quality</span>
              <span className="text-base font-bold text-[#16A34A]">
                {(chambers.chamber_a?.quality_score ?? 92.5).toFixed(1)} %
              </span>
            </div>
            <div className="p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
              <span className="text-[10px] text-[#64748B] block font-semibold">Remaining Shelf Life</span>
              <span className="text-base font-bold text-[#2563EB]">
                {(chambers.chamber_a?.remaining_shelf_life_days ?? 14.2).toFixed(1)} Days
              </span>
            </div>
          </div>
        </div>

        {/* Chamber B */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]"></span>
              <h3 className="font-bold text-sm text-[#1E293B]">Chamber B (Potatoes &amp; Mangoes)</h3>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
              Optimal: 8-10°C
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
              <span className="text-[10px] text-[#64748B] block font-semibold">Current Temp</span>
              <span className="text-base font-bold text-[#1E293B]">
                {(chambers.chamber_b?.internal_temp_c ?? 10.5).toFixed(1)} °C
              </span>
            </div>
            <div className="p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
              <span className="text-[10px] text-[#64748B] block font-semibold">Relative Humidity</span>
              <span className="text-base font-bold text-[#1E293B]">
                {(chambers.chamber_b?.internal_rh_pct ?? 89.0).toFixed(1)} %
              </span>
            </div>
            <div className="p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
              <span className="text-[10px] text-[#64748B] block font-semibold">Produce Quality</span>
              <span className="text-base font-bold text-[#16A34A]">
                {(chambers.chamber_b?.quality_score ?? 89.0).toFixed(1)} %
              </span>
            </div>
            <div className="p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
              <span className="text-[10px] text-[#64748B] block font-semibold">Remaining Shelf Life</span>
              <span className="text-base font-bold text-[#2563EB]">
                {(chambers.chamber_b?.remaining_shelf_life_days ?? 28.5).toFixed(1)} Days
              </span>
            </div>
          </div>
        </div>

        {/* Chamber C */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0284C7]"></span>
              <h3 className="font-bold text-sm text-[#1E293B]">Chamber C (Apples, Grapes &amp; Onions)</h3>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 font-bold border border-cyan-200">
              Optimal: 0-3°C
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
              <span className="text-[10px] text-[#64748B] block font-semibold">Current Temp</span>
              <span className="text-base font-bold text-[#1E293B]">
                {(chambers.chamber_c?.internal_temp_c ?? 2.8).toFixed(1)} °C
              </span>
            </div>
            <div className="p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
              <span className="text-[10px] text-[#64748B] block font-semibold">Relative Humidity</span>
              <span className="text-base font-bold text-[#1E293B]">
                {(chambers.chamber_c?.internal_rh_pct ?? 93.5).toFixed(1)} %
              </span>
            </div>
            <div className="p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
              <span className="text-[10px] text-[#64748B] block font-semibold">Produce Quality</span>
              <span className="text-base font-bold text-[#16A34A]">
                {(chambers.chamber_c?.quality_score ?? 95.2).toFixed(1)} %
              </span>
            </div>
            <div className="p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
              <span className="text-[10px] text-[#64748B] block font-semibold">Remaining Shelf Life</span>
              <span className="text-base font-bold text-[#2563EB]">
                {(chambers.chamber_c?.remaining_shelf_life_days ?? 78.0).toFixed(1)} Days
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Thermostat & HVAC Setpoint Controls */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#2563EB]" />
            <h3 className="font-bold text-sm text-[#1E293B]">Digital Twin Microclimate Setpoints</h3>
          </div>
          <span className="text-xs text-[#64748B]">Real-time closed-loop PID thermal control</span>
        </div>

        {applyMessage && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs font-semibold text-blue-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            <span>{applyMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Chamber A slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#1E293B]">Chamber A Target</span>
              <span className="font-bold text-[#2563EB]">{chATarget.toFixed(1)} °C</span>
            </div>
            <input
              type="range"
              min="8"
              max="20"
              step="0.5"
              value={chATarget}
              onChange={(e) => setChATarget(parseFloat(e.target.value))}
              className="w-full accent-[#2563EB]"
            />
            <span className="text-[11px] text-[#64748B] block">Tomato &amp; Banana target range: 10°C - 15°C</span>
          </div>

          {/* Chamber B slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#1E293B]">Chamber B Target</span>
              <span className="font-bold text-[#16A34A]">{chBTarget.toFixed(1)} °C</span>
            </div>
            <input
              type="range"
              min="4"
              max="16"
              step="0.5"
              value={chBTarget}
              onChange={(e) => setChBTarget(parseFloat(e.target.value))}
              className="w-full accent-[#16A34A]"
            />
            <span className="text-[11px] text-[#64748B] block">Potato &amp; Mango target range: 6°C - 12°C</span>
          </div>

          {/* Chamber C slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#1E293B]">Chamber C Target</span>
              <span className="font-bold text-[#0284C7]">{chCTarget.toFixed(1)} °C</span>
            </div>
            <input
              type="range"
              min="0"
              max="8"
              step="0.5"
              value={chCTarget}
              onChange={(e) => setChCTarget(parseFloat(e.target.value))}
              className="w-full accent-[#0284C7]"
            />
            <span className="text-[11px] text-[#64748B] block">Apple, Grape &amp; Onion target range: 0°C - 4°C</span>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={handleApplySetpoints}
            disabled={isApplying}
            className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-blue-300 text-white font-semibold text-xs rounded-lg transition-colors shadow-sm flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isApplying ? 'Applying Setpoints...' : 'Commit Setpoints to Simulation'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
