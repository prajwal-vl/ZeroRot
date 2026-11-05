import React, { useState } from 'react';
import {
  ShieldCheck,
  Sparkles,
  Layers,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Sliders,
  RefreshCw,
  Clock,
  DollarSign,
  AlertTriangle,
  Flame,
  Wind
} from 'lucide-react';
import { SimulationState } from '../types/simulation';
import { DataBadge } from './DataBadge';

interface PreservationModuleTabProps {
  simulationState: SimulationState | null;
  onRefreshState?: () => void;
}

export const PreservationModuleTab: React.FC<PreservationModuleTabProps> = ({
  simulationState,
  onRefreshState,
}) => {
  const [commodity, setCommodity] = useState<string>('tomato');
  const [has1MCP, setHas1MCP] = useState<boolean>(true);
  const [atmType, setAtmType] = useState<'AIR' | 'CA_LOW_O2' | 'CA_ULTRA_LOW'>('CA_LOW_O2');
  const [packaging, setPackaging] = useState<'OPEN' | 'PERFORATED' | 'MAP_FILM'>('MAP_FILM');

  // Multiplier kinetics
  let shelfLifeMultiplier = 1.0;
  let lossReductionPct = 0.0;

  if (atmType === 'CA_LOW_O2') {
    shelfLifeMultiplier += 0.85;
    lossReductionPct += 45;
  } else if (atmType === 'CA_ULTRA_LOW') {
    shelfLifeMultiplier += 1.4;
    lossReductionPct += 65;
  }

  if (has1MCP) {
    shelfLifeMultiplier += 0.75;
    lossReductionPct += 25;
  }

  if (packaging === 'MAP_FILM') {
    shelfLifeMultiplier += 0.5;
    lossReductionPct += 15;
  } else if (packaging === 'PERFORATED') {
    shelfLifeMultiplier += 0.2;
    lossReductionPct += 8;
  }

  const baselineDays = commodity === 'tomato' ? 14 : commodity === 'banana' ? 16 : commodity === 'mango' ? 18 : 25;
  const enhancedDays = Math.round(baselineDays * shelfLifeMultiplier);
  const daysGained = enhancedDays - baselineDays;
  const baselineLossKg = 1500 * 0.28; // 28% baseline loss = 420 kg
  const finalLossPct = Math.max(3.5, 28 - (28 * (lossReductionPct / 100)));
  const finalLossKg = Math.round(1500 * (finalLossPct / 100));
  const savedKg = Math.round(baselineLossKg - finalLossKg);
  const savedValueInr = Math.round(savedKg * 28.5);

  return (
    <div className="space-y-6 text-[#1E293B]">
      {/* Top Banner */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#2563EB]" />
              COUNTERFACTUAL PRESERVATION ENGINE
            </span>
            <DataBadge label="SCIENTIFIC MODEL" sourceText="Controlled Atmosphere &amp; 1-MCP Kinetics" />
          </div>
          <h2 className="text-xl font-bold text-[#1E293B] mt-2 tracking-tight">
            Advanced Preservation &amp; Loss Reduction Analysis
          </h2>
          <p className="text-sm text-[#64748B] mt-1 max-w-2xl">
            Compare post-harvest produce outcomes under standard baseline storage versus advanced multi-barrier hurdles (Controlled Atmosphere, 1-MCP ethylene blocking, and Modified Atmosphere Packaging).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={commodity}
            onChange={(e) => setCommodity(e.target.value)}
            className="px-3.5 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs font-bold text-[#1E293B] focus:outline-none focus:border-[#2563EB] capitalize"
          >
            <option value="tomato">Tomato (1,500 kg batch)</option>
            <option value="banana">Banana (1,500 kg batch)</option>
            <option value="mango">Mango (1,500 kg batch)</option>
            <option value="apple">Apple (1,500 kg batch)</option>
          </select>
          {onRefreshState && (
            <button
              onClick={onRefreshState}
              className="p-2.5 rounded-lg bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#1E293B] hover:bg-[#F8FAFC] transition-colors"
              title="Refresh State"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Before vs After Counterfactual Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Baseline Card (Without Advanced Preservation) */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#DC2626]"></div>
              <h3 className="font-bold text-sm text-[#1E293B]">Baseline: Standard Ambient Farm Bay</h3>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-bold border border-red-200">
              Uncontrolled Storage
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
              <span className="text-[#64748B] block text-[10px] uppercase font-bold">Nominal Shelf Life</span>
              <span className="text-xl font-extrabold text-[#1E293B]">{baselineDays} Days</span>
              <span className="text-[10px] text-[#64748B] block mt-0.5">Rapid senescence at 26°C</span>
            </div>

            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
              <span className="text-[#64748B] block text-[10px] uppercase font-bold">Post-Harvest Loss Rate</span>
              <span className="text-xl font-extrabold text-[#DC2626]">28.0%</span>
              <span className="text-[10px] text-[#64748B] block mt-0.5">420 kg spoiled</span>
            </div>

            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
              <span className="text-[#64748B] block text-[10px] uppercase font-bold">Atmosphere</span>
              <span className="text-xs font-bold text-[#1E293B]">20.9% O₂ • 420 ppm CO₂</span>
              <span className="text-[10px] text-[#64748B] block mt-0.5">Ambient uninhibited</span>
            </div>

            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
              <span className="text-[#64748B] block text-[10px] uppercase font-bold">Economic Spoilage Loss</span>
              <span className="text-xl font-extrabold text-[#DC2626]">-₹11,970</span>
              <span className="text-[10px] text-[#64748B] block mt-0.5">Lost gross margin</span>
            </div>
          </div>
        </div>

        {/* Counterfactual Card (With Active Interventions) */}
        <div className="bg-white border-2 border-[#2563EB] rounded-xl p-6 shadow-md space-y-4 relative">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#16A34A] animate-pulse"></div>
              <h3 className="font-bold text-sm text-[#1E293B]">With ZERO ROT Multi-Barrier Interventions</h3>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
              Active Optimization
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
              <span className="text-[#64748B] block text-[10px] uppercase font-bold">Extended Shelf Life</span>
              <span className="text-xl font-extrabold text-[#2563EB]">{enhancedDays} Days</span>
              <span className="text-[10px] text-[#16A34A] font-bold block mt-0.5">+{daysGained} Days Gained (+{Math.round((daysGained / baselineDays) * 100)}%)</span>
            </div>

            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
              <span className="text-[#64748B] block text-[10px] uppercase font-bold">Mitigated Spoilage Rate</span>
              <span className="text-xl font-extrabold text-[#16A34A]">{finalLossPct.toFixed(1)}%</span>
              <span className="text-[10px] text-[#16A34A] font-bold block mt-0.5">{finalLossKg} kg (Saved {savedKg} kg)</span>
            </div>

            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
              <span className="text-[#64748B] block text-[10px] uppercase font-bold">Gas Regime</span>
              <span className="text-xs font-bold text-[#2563EB]">
                {atmType === 'CA_LOW_O2' ? '2.5% O₂ • 4.0% CO₂' : atmType === 'CA_ULTRA_LOW' ? '1.2% O₂ • 2.0% CO₂' : 'Ambient Air'}
              </span>
              <span className="text-[10px] text-[#64748B] block mt-0.5">{has1MCP ? '1-MCP Ethylene Block Active' : 'No Ethylene Blocker'}</span>
            </div>

            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
              <span className="text-[#64748B] block text-[10px] uppercase font-bold">Net Economic Value Preserved</span>
              <span className="text-xl font-extrabold text-[#16A34A]">+₹{savedValueInr.toLocaleString()}</span>
              <span className="text-[10px] text-[#16A34A] font-bold block mt-0.5">ROI: 4.8x on Treatment Cost</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Hurdle Intervention Configurator */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#2563EB]" />
          <h3 className="font-bold text-sm text-[#1E293B]">Intervention Parameter Configurator</h3>
        </div>
        <p className="text-xs text-[#64748B]">
          Adjust preservation treatments in real time to calculate counterfactual changes in shelf-life kinetics and financial returns.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Hurdle 1: Controlled Atmosphere */}
          <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-3 text-xs">
            <span className="font-bold text-[#1E293B] block">1. Atmospheric Composition</span>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setAtmType('AIR')}
                className={`w-full p-2.5 rounded-lg border text-left font-semibold transition-all ${
                  atmType === 'AIR'
                    ? 'border-[#2563EB] bg-blue-50 text-[#2563EB]'
                    : 'border-[#E2E8F0] bg-white text-[#64748B]'
                }`}
              >
                Standard Ambient Air (21% O₂)
              </button>
              <button
                type="button"
                onClick={() => setAtmType('CA_LOW_O2')}
                className={`w-full p-2.5 rounded-lg border text-left font-semibold transition-all ${
                  atmType === 'CA_LOW_O2'
                    ? 'border-[#2563EB] bg-blue-50 text-[#2563EB]'
                    : 'border-[#E2E8F0] bg-white text-[#64748B]'
                }`}
              >
                Controlled Atmosphere (2.5% O₂, 4% CO₂)
              </button>
              <button
                type="button"
                onClick={() => setAtmType('CA_ULTRA_LOW')}
                className={`w-full p-2.5 rounded-lg border text-left font-semibold transition-all ${
                  atmType === 'CA_ULTRA_LOW'
                    ? 'border-[#2563EB] bg-blue-50 text-[#2563EB]'
                    : 'border-[#E2E8F0] bg-white text-[#64748B]'
                }`}
              >
                Ultra-Low Oxygen ULO (1.2% O₂)
              </button>
            </div>
          </div>

          {/* Hurdle 2: 1-MCP Ethylene Block */}
          <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-3 text-xs">
            <span className="font-bold text-[#1E293B] block">2. 1-MCP Receptor Blocker</span>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setHas1MCP(true)}
                className={`w-full p-2.5 rounded-lg border text-left font-semibold transition-all ${
                  has1MCP
                    ? 'border-[#2563EB] bg-blue-50 text-[#2563EB]'
                    : 'border-[#E2E8F0] bg-white text-[#64748B]'
                }`}
              >
                Apply 1-MCP Gas Treatment (1 ppm)
              </button>
              <button
                type="button"
                onClick={() => setHas1MCP(false)}
                className={`w-full p-2.5 rounded-lg border text-left font-semibold transition-all ${
                  !has1MCP
                    ? 'border-[#2563EB] bg-blue-50 text-[#2563EB]'
                    : 'border-[#E2E8F0] bg-white text-[#64748B]'
                }`}
              >
                No Ethylene Blocker Applied
              </button>
            </div>
            <span className="text-[11px] text-[#64748B] block">
              Inhibits ethylene receptors irreversibly, halting the climacteric ripening peak.
            </span>
          </div>

          {/* Hurdle 3: Packaging Barrier */}
          <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-3 text-xs">
            <span className="font-bold text-[#1E293B] block">3. Packaging Barrier Membrane</span>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setPackaging('MAP_FILM')}
                className={`w-full p-2.5 rounded-lg border text-left font-semibold transition-all ${
                  packaging === 'MAP_FILM'
                    ? 'border-[#2563EB] bg-blue-50 text-[#2563EB]'
                    : 'border-[#E2E8F0] bg-white text-[#64748B]'
                }`}
              >
                Modified Atmosphere Packaging (MAP Film)
              </button>
              <button
                type="button"
                onClick={() => setPackaging('PERFORATED')}
                className={`w-full p-2.5 rounded-lg border text-left font-semibold transition-all ${
                  packaging === 'PERFORATED'
                    ? 'border-[#2563EB] bg-blue-50 text-[#2563EB]'
                    : 'border-[#E2E8F0] bg-white text-[#64748B]'
                }`}
              >
                Micro-Perforated LDPE Liner
              </button>
              <button
                type="button"
                onClick={() => setPackaging('OPEN')}
                className={`w-full p-2.5 rounded-lg border text-left font-semibold transition-all ${
                  packaging === 'OPEN'
                    ? 'border-[#2563EB] bg-blue-50 text-[#2563EB]'
                    : 'border-[#E2E8F0] bg-white text-[#64748B]'
                }`}
              >
                Open Corrugated Crate (Unsealed)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

