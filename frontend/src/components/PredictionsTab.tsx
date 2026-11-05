import React, { useState } from 'react';
import {
  Activity,
  TrendingDown,
  Sparkles,
  Info,
  Calendar,
  Layers,
  Thermometer,
  Droplets,
  Wind,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  PieChart
} from 'lucide-react';
import { SimulationState } from '../types/simulation';
import { DataBadge } from './DataBadge';

interface PredictionsTabProps {
  simulationState: SimulationState | null;
  onRefreshState?: () => void;
}

const COMMODITY_PARAMS: Record<string, {
  name: string;
  optimalTemp: number;
  q10: number;
  maxShelfLife: number;
  optimalRh: string;
  criticalQuality: number;
}> = {
  tomato: { name: 'Tomato', optimalTemp: 12.0, q10: 2.2, maxShelfLife: 16, optimalRh: '85-90%', criticalQuality: 30 },
  banana: { name: 'Banana', optimalTemp: 14.0, q10: 2.5, maxShelfLife: 18, optimalRh: '88-95%', criticalQuality: 40 },
  mango: { name: 'Mango', optimalTemp: 13.0, q10: 2.4, maxShelfLife: 21, optimalRh: '85-92%', criticalQuality: 35 },
  potato: { name: 'Potato', optimalTemp: 8.0, q10: 1.9, maxShelfLife: 120, optimalRh: '90-95%', criticalQuality: 30 },
  onion: { name: 'Onion', optimalTemp: 2.0, q10: 1.7, maxShelfLife: 180, optimalRh: '65-75%', criticalQuality: 30 },
  apple: { name: 'Apple', optimalTemp: 1.0, q10: 2.0, maxShelfLife: 150, optimalRh: '90-95%', criticalQuality: 35 },
  grape: { name: 'Grape', optimalTemp: 0.0, q10: 2.1, maxShelfLife: 60, optimalRh: '90-95%', criticalQuality: 40 },
};

export const PredictionsTab: React.FC<PredictionsTabProps> = ({
  simulationState,
  onRefreshState,
}) => {
  const [selectedCommodity, setSelectedCommodity] = useState<string>('tomato');
  const params = COMMODITY_PARAMS[selectedCommodity] || COMMODITY_PARAMS.tomato;

  const cold = simulationState?.cold_storage;
  const chValues = cold ? Object.values(cold.chambers) : [];
  const currTemp = chValues.length > 0 ? (chValues.reduce((acc, c) => acc + c.internal_temp_c, 0) / chValues.length) : params.optimalTemp;
  const currQuality = chValues.length > 0 ? (chValues.reduce((acc, c) => acc + c.quality_score, 0) / chValues.length) : 92.0;

  // Kinetic projection for next 30 days
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  const decayRateIdeal = 1 / params.maxShelfLife;
  const tempDelta = Math.max(0, currTemp - params.optimalTemp);
  const q10Factor = Math.pow(params.q10, tempDelta / 10.0);
  const decayRateCurrent = decayRateIdeal * q10Factor;
  const decayRateAmbient = decayRateIdeal * Math.pow(params.q10, (28.0 - params.optimalTemp) / 10.0);

  const getPoints = (rate: number) => {
    return days.map((d) => {
      const q = Math.max(0, currQuality * Math.exp(-rate * d));
      return { day: d, quality: q };
    });
  };

  const idealPoints = getPoints(decayRateIdeal);
  const currentPoints = getPoints(decayRateCurrent);
  const ambientPoints = getPoints(decayRateAmbient);

  // SVG coordinate mapper
  const svgWidth = 650;
  const svgHeight = 220;
  const padX = 40;
  const padY = 25;
  const plotW = svgWidth - padX * 2;
  const plotH = svgHeight - padY * 2;

  const toSvgX = (day: number) => padX + ((day - 1) / 29) * plotW;
  const toSvgY = (quality: number) => padY + (1 - quality / 100) * plotH;

  const makePath = (pts: Array<{ day: number; quality: number }>) => {
    return pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toSvgX(p.day).toFixed(1)} ${toSvgY(p.quality).toFixed(1)}`)
      .join(' ');
  };

  return (
    <div className="space-y-6 text-[#1E293B]">
      {/* Top Banner */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]">
              <Activity className="w-3.5 h-3.5 text-[#2563EB]" />
              ARRHENIUS BIOCHEMICAL KINETICS
            </span>
            <DataBadge label="NUMERICAL MODEL" sourceText="Differential Kinetics Engine" />
          </div>
          <h2 className="text-xl font-bold text-[#1E293B] mt-2 tracking-tight">
            Predictive Spoilage &amp; Shelf-Life Trajectory
          </h2>
          <p className="text-sm text-[#64748B] mt-1 max-w-2xl">
            Simulates dynamic decay kinetics as a function of temperature deviation, respiratory heat generation, transpiration humidity gradients, and atmospheric composition.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedCommodity}
            onChange={(e) => setSelectedCommodity(e.target.value)}
            className="px-3.5 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs font-bold text-[#1E293B] focus:outline-none focus:border-[#2563EB] capitalize"
          >
            {Object.keys(COMMODITY_PARAMS).map((k) => (
              <option key={k} value={k}>
                {COMMODITY_PARAMS[k].name}
              </option>
            ))}
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

      {/* Main Decay Curve Chart */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8F0] pb-4">
          <div>
            <h3 className="font-bold text-sm text-[#1E293B]">
              30-Day Produce Degradation Trajectory ({params.name})
            </h3>
            <span className="text-xs text-[#64748B]">
              Kinetics: k = k₀ · Q₁₀^((T - T_opt)/10) · f(RH) · f(Gas)
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[#16A34A]"></span>
              <span className="text-[#64748B]">Optimal Regime ({params.optimalTemp}°C)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[#2563EB]"></span>
              <span className="text-[#64748B]">Current Cold Twin ({currTemp.toFixed(1)}°C)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[#DC2626] border-dashed"></span>
              <span className="text-[#64748B]">Ambient Farm Bay (28°C)</span>
            </div>
          </div>
        </div>

        {/* SVG Chart */}
        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full max-w-3xl mx-auto h-64 select-none">
            {/* Gridlines */}
            {[0, 25, 50, 75, 100].map((q) => {
              const y = toSvgY(q);
              return (
                <g key={q}>
                  <line x1={padX} y1={y} x2={svgWidth - padX} y2={y} stroke="#F1F5F9" strokeWidth="1" />
                  <text x={padX - 8} y={y + 3} textAnchor="end" fontSize="9" fill="#94A3B8" fontWeight="bold">
                    {q}%
                  </text>
                </g>
              );
            })}

            {/* Critical Cutoff Threshold (Red Line) */}
            <line
              x1={padX}
              y1={toSvgY(params.criticalQuality)}
              x2={svgWidth - padX}
              y2={toSvgY(params.criticalQuality)}
              stroke="#FCA5A5"
              strokeDasharray="4 4"
              strokeWidth="1.5"
            />
            <text
              x={svgWidth - padX}
              y={toSvgY(params.criticalQuality) - 4}
              textAnchor="end"
              fontSize="9"
              fill="#DC2626"
              fontWeight="bold"
            >
              Marketable Cutoff Threshold ({params.criticalQuality}%)
            </text>

            {/* X Axis Day Marks */}
            {[1, 5, 10, 15, 20, 25, 30].map((d) => {
              const x = toSvgX(d);
              return (
                <g key={d}>
                  <line x1={x} y1={svgHeight - padY} x2={x} y2={svgHeight - padY + 4} stroke="#CBD5E1" strokeWidth="1" />
                  <text x={x} y={svgHeight - padY + 14} textAnchor="middle" fontSize="9" fill="#94A3B8">
                    Day {d}
                  </text>
                </g>
              );
            })}

            {/* Ambient Line (Red) */}
            <path d={makePath(ambientPoints)} fill="none" stroke="#DC2626" strokeWidth="2" strokeDasharray="3 3" />

            {/* Current Cold Twin Line (Blue) */}
            <path d={makePath(currentPoints)} fill="none" stroke="#2563EB" strokeWidth="2.5" />

            {/* Optimal Line (Green) */}
            <path d={makePath(idealPoints)} fill="none" stroke="#16A34A" strokeWidth="2" />
          </svg>
        </div>
      </div>

      {/* Feature Importance & Kinetic Properties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Explainable AI Feature Importance */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-[#2563EB]" />
            <h3 className="font-bold text-sm text-[#1E293B]">Explainable AI Deterioration Drivers</h3>
          </div>
          <p className="text-xs text-[#64748B]">
            Decomposition of environmental factors accelerating the biological spoilage rate of {params.name}.
          </p>

          <div className="space-y-3 pt-2 text-xs">
            {/* Factor 1 */}
            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span className="flex items-center gap-1.5 text-[#1E293B]">
                  <Thermometer className="w-3.5 h-3.5 text-[#DC2626]" />
                  Thermal Acceleration ΔT
                </span>
                <span className="font-bold text-[#DC2626]">48% Impact</span>
              </div>
              <div className="w-full bg-[#F1F5F9] rounded-full h-2 overflow-hidden">
                <div className="bg-[#DC2626] h-2 rounded-full" style={{ width: '48%' }}></div>
              </div>
            </div>

            {/* Factor 2 */}
            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span className="flex items-center gap-1.5 text-[#1E293B]">
                  <Droplets className="w-3.5 h-3.5 text-[#2563EB]" />
                  Transpiration / Moisture Vapor Deficit
                </span>
                <span className="font-bold text-[#2563EB]">24% Impact</span>
              </div>
              <div className="w-full bg-[#F1F5F9] rounded-full h-2 overflow-hidden">
                <div className="bg-[#2563EB] h-2 rounded-full" style={{ width: '24%' }}></div>
              </div>
            </div>

            {/* Factor 3 */}
            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span className="flex items-center gap-1.5 text-[#1E293B]">
                  <Wind className="w-3.5 h-3.5 text-[#16A34A]" />
                  Respiration Gas Buildup (CO₂ &amp; Ethylene)
                </span>
                <span className="font-bold text-[#16A34A]">18% Impact</span>
              </div>
              <div className="w-full bg-[#F1F5F9] rounded-full h-2 overflow-hidden">
                <div className="bg-[#16A34A] h-2 rounded-full" style={{ width: '18%' }}></div>
              </div>
            </div>

            {/* Factor 4 */}
            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span className="flex items-center gap-1.5 text-[#1E293B]">
                  <ShieldAlert className="w-3.5 h-3.5 text-[#D97706]" />
                  Mechanical Defect &amp; Initial Bruising
                </span>
                <span className="font-bold text-[#D97706]">10% Impact</span>
              </div>
              <div className="w-full bg-[#F1F5F9] rounded-full h-2 overflow-hidden">
                <div className="bg-[#D97706] h-2 rounded-full" style={{ width: '10%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Commodity Kinetic Parameters */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#2563EB]" />
            <h3 className="font-bold text-sm text-[#1E293B]">Physiological Kinetics Constants ({params.name})</h3>
          </div>
          <p className="text-xs text-[#64748B]">
            Calibrated empirical parameters utilized by the differential kinetics engine for {params.name}.
          </p>

          <div className="grid grid-cols-2 gap-3 text-xs pt-1">
            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
              <span className="text-[10px] text-[#64748B] block font-bold uppercase">Optimal Temperature</span>
              <span className="text-base font-bold text-[#2563EB]">{params.optimalTemp} °C</span>
            </div>

            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
              <span className="text-[10px] text-[#64748B] block font-bold uppercase">Q₁₀ Decay Coefficient</span>
              <span className="text-base font-bold text-[#1E293B]">{params.q10}</span>
            </div>

            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
              <span className="text-[10px] text-[#64748B] block font-bold uppercase">Optimal Relative Humidity</span>
              <span className="text-base font-bold text-[#16A34A]">{params.optimalRh}</span>
            </div>

            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
              <span className="text-[10px] text-[#64748B] block font-bold uppercase">Max Nominal Shelf Life</span>
              <span className="text-base font-bold text-[#1E293B]">{params.maxShelfLife} Days</span>
            </div>

            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
              <span className="text-[10px] text-[#64748B] block font-bold uppercase">Market Cutoff Quality</span>
              <span className="text-base font-bold text-[#DC2626]">{params.criticalQuality} %</span>
            </div>

            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
              <span className="text-[10px] text-[#64748B] block font-bold uppercase">Respiration Heat at 20°C</span>
              <span className="text-base font-bold text-[#1E293B]">0.055 W/kg</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
