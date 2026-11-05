import React, { useState } from 'react';
import {
  Flame,
  Zap,
  Wind,
  Droplets,
  AlertTriangle,
  Play,
  RotateCcw,
  CheckCircle2,
  Sliders,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Clock
} from 'lucide-react';
import { SimulationState } from '../types/simulation';
import { DataBadge } from './DataBadge';
import { api } from '../services/api';

interface ScenarioBuilderTabProps {
  simulationState: SimulationState | null;
  onRefreshState?: () => void;
}

interface DisruptionOption {
  id: string;
  name: string;
  category: string;
  icon: React.ElementType;
  severity: 'HIGH' | 'CRITICAL' | 'MODERATE';
  description: string;
  tempImpact: string;
  spoilageMultiplier: number;
  mitigation: string;
}

const DISRUPTIONS: DisruptionOption[] = [
  {
    id: 'HEATWAVE',
    name: 'Sudden Ambient Heatwave (+12°C)',
    category: 'CLIMATIC',
    icon: Flame,
    severity: 'HIGH',
    description: 'Heat dome raises external ambient temperature to 39.0°C. Conductive ceiling flux spikes.',
    tempImpact: '+12.0 °C ambient spike',
    spoilageMultiplier: 2.8,
    mitigation: 'Activate night louver ventilation and reflective ceiling misting.',
  },
  {
    id: 'GRID_BLACKOUT',
    name: 'Storage Power Grid Blackout (6h)',
    category: 'INFRASTRUCTURE',
    icon: Zap,
    severity: 'CRITICAL',
    description: 'Transformer failure cuts primary grid power. Chilling plant halts until backup engages.',
    tempImpact: 'Zero cooling power (+2.4°C/h rise)',
    spoilageMultiplier: 3.5,
    mitigation: 'Engage secondary diesel backup generator and seal thermal vestibule.',
  },
  {
    id: 'REEFER_FAULT',
    name: 'Reefer Compressor Seizure in Transit',
    category: 'LOGISTICS',
    icon: AlertTriangle,
    severity: 'CRITICAL',
    description: 'Electric compressor fan locks up on highway transit. Convective solar load heats trailer.',
    tempImpact: '+3.1 °C/h in transit cargo',
    spoilageMultiplier: 4.1,
    mitigation: 'Divert immediately to nearest cold storage hub within 45 km radius.',
  },
  {
    id: 'VENT_JAM',
    name: 'Ventilation Flap Jam (CO₂ / Hypoxia)',
    category: 'ATMOSPHERE',
    icon: Wind,
    severity: 'HIGH',
    description: 'Exhaust damper fails closed. O₂ falls below 2.0% and CO₂ exceeds 15,000 ppm.',
    tempImpact: 'Anaerobic fermentation cascade',
    spoilageMultiplier: 3.0,
    mitigation: 'Force-open manual emergency exhaust shutter to restore fresh air exchange.',
  },
  {
    id: 'RH_DROP',
    name: 'Severe Humidity Drop & Desiccation',
    category: 'VAPOR PRESSURE',
    icon: Droplets,
    severity: 'MODERATE',
    description: 'RH drops to 55%. High vapor pressure deficit causes moisture loss and skin wrinkling.',
    tempImpact: 'Transpirational weight loss (-7%)',
    spoilageMultiplier: 1.9,
    mitigation: 'Activate ultrasonic cold-water misting nozzles across crate rows.',
  },
];

export const ScenarioBuilderTab: React.FC<ScenarioBuilderTabProps> = ({
  simulationState,
  onRefreshState,
}) => {
  const [selectedDisruption, setSelectedDisruption] = useState<DisruptionOption>(DISRUPTIONS[0]);
  const [activeDisruptions, setActiveDisruptions] = useState<string[]>([]);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleApplyDisruption = async (disruption: DisruptionOption) => {
    setIsApplying(true);
    try {
      if (disruption.id === 'HEATWAVE') {
        await api.updateControls({ ambient_temp_override: 39.0 });
      } else if (disruption.id === 'GRID_BLACKOUT') {
        await api.updateControls({ truck_reefer_on: false });
      } else if (disruption.id === 'REEFER_FAULT') {
        await api.updateControls({ truck_reefer_on: false, scenario_key: 'REEFER_FAULT' });
      } else if (disruption.id === 'VENT_JAM') {
        await api.updateControls({ traditional_damper_open_pct: 0.0 });
      } else if (disruption.id === 'RH_DROP') {
        await api.updateControls({ ambient_rh_override: 55.0 });
      }

      if (!activeDisruptions.includes(disruption.id)) {
        setActiveDisruptions([...activeDisruptions, disruption.id]);
      }
      setStatusMessage(`Disruption "${disruption.name}" successfully injected into physics engine.`);
      setTimeout(() => setStatusMessage(null), 4000);
      if (onRefreshState) onRefreshState();
    } catch (err: any) {
      setStatusMessage(err.message || 'Failed to inject disruption');
    } finally {
      setIsApplying(false);
    }
  };

  const handleClearAll = async () => {
    setIsApplying(true);
    try {
      await api.updateControls({
        scenario_key: 'NORMAL',
        ambient_temp_override: 26.0,
        ambient_rh_override: 75.0,
        truck_reefer_on: true,
        truck_door_open: false,
        traditional_damper_open_pct: 45.0,
      });
      setActiveDisruptions([]);
      setStatusMessage('All environmental disruptions cleared. Regulated baseline restored.');
      setTimeout(() => setStatusMessage(null), 4000);
      if (onRefreshState) onRefreshState();
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-6 text-[#1E293B]">
      {/* Top Banner */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]">
              <Sliders className="w-3.5 h-3.5 text-[#2563EB]" />
              STRESS TESTING &amp; DISRUPTION INJECTOR
            </span>
            <DataBadge label="SIMULATION LAB" sourceText="Differential Equation Perturbations" />
          </div>
          <h2 className="text-xl font-bold text-[#1E293B] mt-2 tracking-tight">
            Drag-and-Drop Scenario Disruption Lab
          </h2>
          <p className="text-sm text-[#64748B] mt-1 max-w-2xl">
            Simulate unpredictable climate extremes, logistics delays, equipment failures, and atmospheric hypoxia. Observe real-time physical reaction and evaluate automated mitigation protocols.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeDisruptions.length > 0 && (
            <button
              onClick={handleClearAll}
              disabled={isApplying}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-sm flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Clear All Active Disruptions</span>
            </button>
          )}
          {onRefreshState && (
            <button
              onClick={onRefreshState}
              className="p-2 rounded-lg bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#1E293B] hover:bg-[#F8FAFC] transition-colors"
              title="Refresh State"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs font-semibold text-blue-800 flex items-center gap-2.5 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Disruption Cards Grid */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase text-[#64748B] tracking-wider">
          Available Environmental &amp; Equipment Disruptions (Click to Select &amp; Inject)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {DISRUPTIONS.map((dis) => {
            const Icon = dis.icon;
            const isSelected = selectedDisruption.id === dis.id;
            const isActive = activeDisruptions.includes(dis.id);
            return (
              <div
                key={dis.id}
                onClick={() => setSelectedDisruption(dis)}
                className={`p-5 rounded-xl border cursor-pointer transition-all shadow-sm ${
                  isActive
                    ? 'bg-red-50/60 border-red-300 ring-2 ring-red-400/20'
                    : isSelected
                    ? 'bg-blue-50/50 border-[#2563EB] ring-2 ring-blue-500/20'
                    : 'bg-white border-[#E2E8F0] hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${
                    dis.severity === 'CRITICAL' ? 'bg-red-100 text-[#DC2626]' : 'bg-amber-100 text-[#D97706]'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {isActive ? 'SHOCK ENGAGED' : dis.severity}
                  </span>
                </div>

                <h4 className="font-bold text-sm text-[#1E293B] mt-3">{dis.name}</h4>
                <p className="text-xs text-[#64748B] mt-1 line-clamp-2">{dis.description}</p>

                <div className="mt-3 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
                  <span className="text-[#64748B]">Decay Acceleration:</span>
                  <span className="font-extrabold text-red-600">+{dis.spoilageMultiplier}x Rate</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Disruption Deep-Dive & Action Bay */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-blue-100 text-[#2563EB]">
              <selectedDisruption.icon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-[#1E293B]">{selectedDisruption.name}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold uppercase">
                  {selectedDisruption.category}
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">{selectedDisruption.description}</p>
            </div>
          </div>

          <button
            onClick={() => handleApplyDisruption(selectedDisruption)}
            disabled={isApplying}
            className="px-5 py-2.5 bg-[#DC2626] hover:bg-red-700 disabled:bg-red-300 text-white font-semibold text-xs rounded-lg transition-colors shadow-sm flex items-center gap-2 self-start sm:self-center shrink-0"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{isApplying ? 'Injecting...' : 'Inject Disruption Shock'}</span>
          </button>
        </div>

        {/* Counterfactual Timeline Impact */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2">
          <div className="p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] space-y-1">
            <span className="text-[#64748B] block font-semibold text-[10px] uppercase">Immediate Thermodynamic Impact</span>
            <span className="font-bold text-sm text-[#DC2626]">{selectedDisruption.tempImpact}</span>
            <span className="text-[11px] text-[#64748B] block">Spikes respiration heat load exponentially</span>
          </div>

          <div className="p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] space-y-1">
            <span className="text-[#64748B] block font-semibold text-[10px] uppercase">Shelf-Life Degradation Penalty</span>
            <span className="font-bold text-sm text-[#DC2626]">-{((selectedDisruption.spoilageMultiplier - 1) * 35).toFixed(0)}% Nominal Days</span>
            <span className="text-[11px] text-[#64748B] block">Kinetics decay factor accelerated to {selectedDisruption.spoilageMultiplier}x</span>
          </div>

          <div className="p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] space-y-1">
            <span className="text-[#64748B] block font-semibold text-[10px] uppercase">Recommended Field Mitigation</span>
            <span className="font-bold text-xs text-[#1E293B] block leading-snug">{selectedDisruption.mitigation}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

