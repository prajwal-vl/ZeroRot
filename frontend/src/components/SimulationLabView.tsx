import React, { useState } from 'react';
import {
  FlaskConical,
  Zap,
  Sliders,
  AlertTriangle,
  Flame,
  DoorOpen,
  Gauge,
  Clock,
  Layers,
  Code2,
  CheckCircle2
} from 'lucide-react';
import { SimulationState } from '../types/simulation';
import { DataBadge } from './DataBadge';
import { api } from '../services/api';

interface SimulationLabViewProps {
  simulationState: SimulationState | null;
  onRefreshState: () => void;
}

export const SimulationLabView: React.FC<SimulationLabViewProps> = ({
  simulationState,
  onRefreshState,
}) => {
  const [ambientTempSlider, setAmbientTempSlider] = useState<number>(32);
  const [ambientRhSlider, setAmbientRhSlider] = useState<number>(65);
  const [selectedScenario, setSelectedScenario] = useState<string>('NORMAL');
  const [showJsonInspector, setShowJsonInspector] = useState<boolean>(false);

  const scenarioPresets = [
    { key: 'NORMAL', name: 'Normal Transit & Storage', desc: 'Nominal regulated environment. All refrigeration loops functional.' },
    { key: 'HEATWAVE', name: 'External Heatwave (+10°C)', desc: 'Outside ambient climbs to 42°C, stressing thermal insulation.' },
    { key: 'REEFER_FAILURE', name: 'Compressor Breakdown', desc: 'Refrigeration compressor cuts off. Cargo relies solely on insulation.' },
    { key: 'DOOR_AJAR', name: 'Loading Door Left Open', desc: 'Massive convective air ingress flooding ambient heat into cargo.' },
    { key: 'EFFICIENCY_DEGRADED', name: 'Refrigerant Leak (40% Capacity)', desc: 'Cooling capacity drops to 40% due to condenser pressure loss.' },
    { key: 'HIGH_HUMIDITY', name: 'Monsoon Moisture Surge (95% RH)', desc: 'Excess humidity triggers condensation and rapid fungal mold spores.' },
    { key: 'HIGHWAY_DELAY', name: 'Highway Traffic Stoppage', desc: 'Truck speed drops to 5 km/h, extending road exposure by 4 hours.' },
  ];

  const handleApplyScenario = async (scKey: string) => {
    setSelectedScenario(scKey);
    await api.updateControls({ scenario_key: scKey });
    onRefreshState();
  };

  const handleApplyAmbient = async () => {
    await api.updateControls({
      ambient_temp_override: ambientTempSlider,
      ambient_rh_override: ambientRhSlider,
    });
    onRefreshState();
  };

  return (
    <div className="space-y-6 text-[#1E293B]">
      {/* Header - Blue SaaS Top Banner */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]">
              <FlaskConical className="w-3.5 h-3.5 text-[#2563EB]" />
              TECHNICAL SIMULATION LAB
            </span>
            <DataBadge label="SIMULATED" sourceText="Central Physics Engine" />
          </div>
          <h2 className="text-xl font-bold text-[#1E293B] mt-2 tracking-tight">
            Fault Injection &amp; Mathematical Verification Lab
          </h2>
          <p className="text-sm text-[#64748B] mt-1 max-w-2xl">
            Technical sandbox for evaluators and engineers. Inject severe environmental stresses, hardware breakdowns, and inspect step-by-step differential equations governing post-harvest bio-preservation.
          </p>
        </div>

        <button
          onClick={() => setShowJsonInspector(!showJsonInspector)}
          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#64748B] hover:text-[#1E293B] hover:bg-[#F8FAFC] transition-colors shadow-sm"
        >
          <Code2 className="w-3.5 h-3.5 text-[#2563EB]" />
          <span>{showJsonInspector ? 'Hide Raw State' : 'Inspect Authoritative State'}</span>
        </button>
      </div>

      {/* Preset Scenario Injectors */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
          <span className="text-xs font-semibold uppercase text-[#1E293B] flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#2563EB]" />
            Fault Scenarios &amp; Operational Stress Presets
          </span>
          <span className="text-xs text-[#64748B]">
            Active: <strong className="text-[#2563EB]">{simulationState?.active_scenario.name}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {scenarioPresets.map((sc) => {
            const isSelected = simulationState?.active_scenario.key === sc.key;
            return (
              <button
                key={sc.key}
                onClick={() => handleApplyScenario(sc.key)}
                className={`text-left p-3.5 rounded-lg border text-xs transition-all ${
                  isSelected
                    ? 'bg-[#EFF6FF] border-[#2563EB] shadow-sm ring-1 ring-[#2563EB]'
                    : 'bg-[#F8FAFC] border-[#E2E8F0] hover:bg-white hover:border-[#CBD5E1]'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span className={isSelected ? 'text-[#2563EB]' : 'text-[#1E293B]'}>{sc.name}</span>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#2563EB]" />}
                </div>
                <p className="text-[11px] text-[#64748B] mt-1 leading-relaxed">{sc.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Manual Environment Injector Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E2E8F0] text-xs font-semibold uppercase text-[#1E293B]">
            <Sliders className="w-4 h-4 text-[#2563EB]" />
            <span>Manual Environmental Stress Injection</span>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-[#64748B]">Ambient Temperature Override:</span>
                <strong className="text-[#1E293B] font-bold">{ambientTempSlider}°C</strong>
              </div>
              <input
                type="range"
                min="10"
                max="50"
                value={ambientTempSlider}
                onChange={(e) => setAmbientTempSlider(Number(e.target.value))}
                className="w-full accent-[#2563EB]"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-[#64748B]">Ambient Relative Humidity:</span>
                <strong className="text-[#1E293B] font-bold">{ambientRhSlider}%</strong>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                value={ambientRhSlider}
                onChange={(e) => setAmbientRhSlider(Number(e.target.value))}
                className="w-full accent-[#2563EB]"
              />
            </div>

            <button
              onClick={handleApplyAmbient}
              className="w-full py-2 bg-[#2563EB] hover:bg-[#1E40AF] text-white font-semibold text-xs rounded-lg transition-colors shadow-sm"
            >
              Inject Environmental Parameters
            </button>
          </div>
        </div>

        {/* Governing Mathematical Formulation Summary */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm space-y-3 text-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E2E8F0] text-xs font-semibold uppercase text-[#1E293B]">
            <Layers className="w-4 h-4 text-[#2563EB]" />
            <span>Underlying Numerical Models</span>
          </div>

          <div className="space-y-2 text-[#64748B] text-[11px] leading-relaxed">
            <div className="p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
              <strong className="text-[#1E293B] block">Arrhenius Spoilage Kinetics:</strong>
              <code className="text-[#2563EB] font-mono">k = A * exp(-Ea / (R * T))</code>
              <p className="mt-0.5">Determines commodity biological degradation rate as temperature rises.</p>
            </div>

            <div className="p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
              <strong className="text-[#1E293B] block">Q10 Biological Acceleration:</strong>
              <code className="text-[#2563EB] font-mono">Rate_T2 = Rate_T1 * Q10^((T2 - T1) / 10)</code>
              <p className="mt-0.5">Captures exponential respiration surge per 10°C thermal excursion.</p>
            </div>

            <div className="p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
              <strong className="text-[#1E293B] block">Convective Heat Exchange:</strong>
              <code className="text-[#2563EB] font-mono">Q_convection = h * A * (T_ambient - T_internal)</code>
              <p className="mt-0.5">Wall conduction and door ajar thermal intrusion dynamics.</p>
            </div>
          </div>
        </div>
      </div>

      {/* JSON Inspector Collapsible */}
      {showJsonInspector && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-2">
          <span className="text-xs font-mono font-bold uppercase text-[#64748B] block">
            Authoritative Simulation State (JSON Feed)
          </span>
          <pre className="p-4 bg-[#0F172A] text-[#38BDF8] rounded-lg text-[11px] font-mono overflow-x-auto max-h-96">
            {JSON.stringify(simulationState, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
