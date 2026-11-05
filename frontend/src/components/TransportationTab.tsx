import React, { useState } from 'react';
import {
  Truck,
  AlertTriangle,
  Play,
  RotateCcw,
  Zap,
  Clock,
  Thermometer,
  ShieldAlert,
  Flame,
  CheckCircle2,
  RefreshCw,
  Sliders,
  Navigation,
  Wind
} from 'lucide-react';
import { SimulationState } from '../types/simulation';
import { ReeferTruckCanvas } from './three/ReeferTruckCanvas';
import { DataBadge } from './DataBadge';
import { api } from '../services/api';

interface TransportationTabProps {
  simulationState: SimulationState | null;
  onRefreshState: () => void;
}

export const TransportationTab: React.FC<TransportationTabProps> = ({
  simulationState,
  onRefreshState,
}) => {
  const truck = simulationState?.refrigerated_truck;
  const [speedVal, setSpeedVal] = useState<number>(truck?.truck_speed_kmh ?? 65);
  const [targetTemp, setTargetTemp] = useState<number>(truck?.target_temp_c ?? 4.0);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [activeFault, setActiveFault] = useState<string | null>(null);

  const isCompressorOn = truck?.reefer_on ?? true;
  const isDoorOpen = truck?.rear_door_open ?? false;

  const handleToggleCompressor = async () => {
    setIsUpdating(true);
    try {
      await api.updateControls({ truck_reefer_on: !isCompressorOn });
      onRefreshState();
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleDoor = async () => {
    setIsUpdating(true);
    try {
      await api.updateControls({ truck_door_open: !isDoorOpen });
      onRefreshState();
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSpeedCommit = async () => {
    setIsUpdating(true);
    try {
      await api.updateControls({ truck_speed_kmh: speedVal });
      onRefreshState();
    } finally {
      setIsUpdating(false);
    }
  };

  const handleInjectFault = async (faultType: string) => {
    setActiveFault(faultType);
    try {
      if (faultType === 'REEFER_FAIL') {
        await api.updateControls({ truck_reefer_on: false });
      } else if (faultType === 'HEATWAVE') {
        await api.updateControls({ ambient_temp_override: 39.5 });
      } else if (faultType === 'DOOR_BREACH') {
        await api.updateControls({ truck_door_open: true });
      } else if (faultType === 'CLEAR') {
        await api.updateControls({
          truck_reefer_on: true,
          truck_door_open: false,
          ambient_temp_override: 26.0,
        });
        setActiveFault(null);
      }
      onRefreshState();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 text-[#1E293B]">
      {/* SaaS Blue Top Banner */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]">
              <Truck className="w-3.5 h-3.5 text-[#2563EB]" />
              COLD CHAIN 3D TRANSPORTATION TWIN
            </span>
            <DataBadge label="SIMULATED" sourceText="Moving Reefer Semi-Trailer" />
          </div>
          <h2 className="text-xl font-bold text-[#1E293B] mt-2 tracking-tight">
            Active Cold Chain Transit Simulation
          </h2>
          <p className="text-sm text-[#64748B] mt-1 max-w-2xl">
            Simulates long-distance produce transport across national highway corridors. Inspect convective air cooling, cargo thermal insulation, animated condenser fans, and real-time failure shocks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#F8FAFC] px-4 py-2 rounded-lg border border-[#E2E8F0] text-xs">
            <span className="text-[#64748B] block text-[10px] uppercase font-bold tracking-wider">Cargo Freshness</span>
            <span className={`font-extrabold text-base ${
              (truck?.quality_score ?? 91) > 80 ? 'text-[#16A34A]' : (truck?.quality_score ?? 91) > 60 ? 'text-[#D97706]' : 'text-[#DC2626]'
            }`}>
              {truck?.quality_score?.toFixed(1) ?? '91.2'}%
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

      {/* 3D Reefer Truck Viewport */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] animate-pulse"></span>
            <span className="font-bold text-[#1E293B]">Live 3D Reefer Cutaway Trailer</span>
            <span className="text-[#64748B]">| Route: NH-48 Express Cargo Corridor</span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
              isCompressorOn ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              Condenser: {isCompressorOn ? 'SPINNING / ACTIVE' : 'STOPPED'}
            </span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
              !isDoorOpen ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              Cargo Door: {!isDoorOpen ? 'HERMETICALLY SEALED' : 'BREACHED / OPEN'}
            </span>
          </div>
        </div>

        <div className="relative">
          <ReeferTruckCanvas
            simulationState={simulationState}
            onRefreshState={onRefreshState}
          />
        </div>
      </div>

      {/* Real-time Transit Telemetry & Control Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span className="font-semibold">Cargo Temperature</span>
            <Thermometer className="w-4 h-4 text-[#2563EB]" />
          </div>
          <span className="text-2xl font-black text-[#1E293B] block mt-1">
            {truck?.mean_cargo_temp_c?.toFixed(1) ?? '4.2'} °C
          </span>
          <span className="text-[11px] text-[#64748B] block mt-0.5">
            Target Setpoint: {targetTemp.toFixed(1)} °C
          </span>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span className="font-semibold">Transit Velocity</span>
            <Navigation className="w-4 h-4 text-[#16A34A]" />
          </div>
          <span className="text-2xl font-black text-[#1E293B] block mt-1">
            {truck?.truck_speed_kmh?.toFixed(0) ?? '65'} km/h
          </span>
          <span className="text-[11px] text-[#64748B] block mt-0.5">
            Convective Heat Exch. Coeff: 45 W/(m²·K)
          </span>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span className="font-semibold">Cargo Spoilage Risk</span>
            <AlertTriangle className="w-4 h-4 text-[#D97706]" />
          </div>
          <span className={`text-2xl font-black block mt-1 ${
            (truck?.spoilage_risk_pct ?? 4.5) > 20 ? 'text-[#DC2626]' : 'text-[#16A34A]'
          }`}>
            {truck?.spoilage_risk_pct?.toFixed(1) ?? '4.5'} %
          </span>
          <span className="text-[11px] text-[#64748B] block mt-0.5">
            Arrhenius Thermal Acceleration
          </span>
        </div>

        {/* Metric 4 */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span className="font-semibold">Shelf Life Remaining</span>
            <Clock className="w-4 h-4 text-[#0284C7]" />
          </div>
          <span className="text-2xl font-black text-[#1E293B] block mt-1">
            {truck?.remaining_shelf_life_days?.toFixed(1) ?? '15.8'} Days
          </span>
          <span className="text-[11px] text-[#64748B] block mt-0.5">
            At Current Respiration Kinetics
          </span>
        </div>
      </div>

      {/* Transit Controls & Fault Injectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#2563EB]" />
            <h3 className="font-bold text-sm text-[#1E293B]">Cold Chain Vehicle Controls</h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
              <div>
                <span className="text-xs font-bold text-[#1E293B] block">Thermo King Reefer Unit</span>
                <span className="text-[11px] text-[#64748B]">Electric condenser &amp; evaporator fans</span>
              </div>
              <button
                onClick={handleToggleCompressor}
                disabled={isUpdating}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  isCompressorOn
                    ? 'bg-[#16A34A] text-white hover:bg-emerald-700'
                    : 'bg-[#DC2626] text-white hover:bg-red-700'
                }`}
              >
                {isCompressorOn ? 'COMPRESSOR: ACTIVE' : 'COMPRESSOR: OFF'}
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
              <div>
                <span className="text-xs font-bold text-[#1E293B] block">Rear Cargo Door Latch</span>
                <span className="text-[11px] text-[#64748B]">Insulated roll-up rear door</span>
              </div>
              <button
                onClick={handleToggleDoor}
                disabled={isUpdating}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  !isDoorOpen
                    ? 'bg-[#2563EB] text-white hover:bg-blue-700'
                    : 'bg-[#D97706] text-white hover:bg-amber-700'
                }`}
              >
                {!isDoorOpen ? 'DOOR: SEALED' : 'DOOR: OPEN'}
              </button>
            </div>

            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#1E293B]">Highway Cruise Speed</span>
                <span className="font-bold text-[#2563EB]">{speedVal} km/h</span>
              </div>
              <input
                type="range"
                min="0"
                max="90"
                step="5"
                value={speedVal}
                onChange={(e) => setSpeedVal(parseInt(e.target.value))}
                onMouseUp={handleSpeedCommit}
                className="w-full accent-[#2563EB]"
              />
            </div>
          </div>
        </div>

        {/* Cold Chain Failure Stress Testing */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#DC2626]" />
              <h3 className="font-bold text-sm text-[#1E293B]">Failure Simulation Lab</h3>
            </div>
            {activeFault && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold border border-red-200 animate-pulse">
                ACTIVE SHOCK: {activeFault}
              </span>
            )}
          </div>

          <p className="text-xs text-[#64748B]">
            Inject realistic transit disruptions to test the digital twin's predictive deterioration curves and alert escalation.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={() => handleInjectFault('REEFER_FAIL')}
              className="p-3 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-left transition-colors group"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-red-700">
                <Zap className="w-3.5 h-3.5 text-red-600" />
                <span>Compressor Breakdown</span>
              </div>
              <span className="text-[11px] text-red-600 block mt-1">
                Zero cooling capacity; internal temp climbs at +3.2°C/hr
              </span>
            </button>

            <button
              onClick={() => handleInjectFault('HEATWAVE')}
              className="p-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-left transition-colors group"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
                <Flame className="w-3.5 h-3.5 text-amber-600" />
                <span>Heatwave Spike (+39.5°C)</span>
              </div>
              <span className="text-[11px] text-amber-700 block mt-1">
                Extreme highway solar radiation and conductive roof influx
              </span>
            </button>

            <button
              onClick={() => handleInjectFault('DOOR_BREACH')}
              className="p-3 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg text-left transition-colors group"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-orange-800">
                <Wind className="w-3.5 h-3.5 text-orange-600" />
                <span>Cargo Door Breach</span>
              </div>
              <span className="text-[11px] text-orange-700 block mt-1">
                Turbulent warm air inflow destroys interior chilling boundary
              </span>
            </button>

            <button
              onClick={() => handleInjectFault('CLEAR')}
              className="p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-left transition-colors group"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Restore Normal Transit</span>
              </div>
              <span className="text-[11px] text-emerald-700 block mt-1">
                Re-engage 4°C thermostat and seal trailer cargo doors
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
