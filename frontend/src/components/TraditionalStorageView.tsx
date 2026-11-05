import React, { useState, useEffect, useRef } from 'react';
import {
  Thermometer,
  Droplets,
  Wind,
  Gauge,
  DoorOpen,
  Sliders,
  Sparkles,
  Info,
  Layers,
  ArrowRight,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import { SimulationState } from '../types/simulation';
import { DataBadge } from './DataBadge';
import { api } from '../services/api';

interface TraditionalStorageViewProps {
  simulationState: SimulationState | null;
  simpleMode: boolean;
  onRefreshState: () => void;
}

export const TraditionalStorageView: React.FC<TraditionalStorageViewProps> = ({
  simulationState,
  simpleMode,
  onRefreshState,
}) => {
  const [activeLayer, setActiveLayer] = useState<'layout' | 'heatmap' | 'humidity' | 'airflow' | 'sensors'>('layout');
  const [selectedSensor, setSelectedSensor] = useState<string | null>(null);
  const [damperSlider, setDamperSlider] = useState<number>(50);
  const [doorToggled, setDoorToggled] = useState<boolean>(false);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const trad = simulationState?.traditional_storage;
  const ambient = simulationState?.ambient_environment;

  // Sync initial controls from state
  useEffect(() => {
    if (trad) {
      setDamperSlider(trad.damper_open_pct);
      setDoorToggled(trad.door_open);
    }
  }, [trad?.damper_open_pct, trad?.door_open]);

  // Render 2D Canvas Heatmap (Interpolated Grid)
  useEffect(() => {
    if (!canvasRef.current || !trad?.spatial_grid) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (activeLayer === 'heatmap' || activeLayer === 'humidity') {
      const rows = 5;
      const cols = 5;
      const cellW = canvas.width / cols;
      const cellH = canvas.height / rows;

      trad.spatial_grid.forEach((pt) => {
        const x = pt.col * cellW;
        const y = pt.row * cellH;

        let fillStyle = '';
        if (activeLayer === 'heatmap') {
          // Temperature color mapping:
          // Blue: Cold (<15°C)
          // Light Blue: (15-20°C)
          // Yellow: Warning (20-24°C)
          // Orange: Abnormal (24-28°C)
          // Red: Critical (>28°C)
          const t = pt.temp_c;
          if (t < 15.0) fillStyle = 'rgba(37, 99, 235, 0.75)';
          else if (t < 20.0) fillStyle = 'rgba(56, 189, 248, 0.75)';
          else if (t < 24.0) fillStyle = 'rgba(234, 179, 8, 0.75)';
          else if (t < 28.0) fillStyle = 'rgba(249, 115, 22, 0.8)';
          else fillStyle = 'rgba(220, 38, 38, 0.85)';
        } else {
          // Humidity color mapping:
          const rh = pt.rh_pct;
          if (rh < 65) fillStyle = 'rgba(245, 158, 11, 0.65)';
          else if (rh < 90) fillStyle = 'rgba(14, 165, 233, 0.7)';
          else fillStyle = 'rgba(79, 70, 229, 0.75)';
        }

        ctx.fillStyle = fillStyle;
        ctx.fillRect(x, y, cellW, cellH);

        // Grid border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cellW, cellH);

        // Value text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const text = activeLayer === 'heatmap' ? `${pt.temp_c.toFixed(1)}°C` : `${pt.rh_pct.toFixed(0)}%`;
        ctx.fillText(text, x + cellW / 2, y + cellH / 2);
      });
    }
  }, [activeLayer, trad?.spatial_grid]);

  const handleApplyControls = async (damperVal?: number, doorVal?: boolean) => {
    const dVal = damperVal !== undefined ? damperVal : damperSlider;
    const drVal = doorVal !== undefined ? doorVal : doorToggled;
    await api.updateControls({
      traditional_damper_open_pct: dVal,
      traditional_door_open: drVal,
    });
    onRefreshState();
  };

  if (!trad) {
    return (
      <div className="p-8 text-center text-slate-500 font-medium bg-white border border-slate-200 rounded-xl">
        Loading Traditional Storage Digital Twin...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Traditional Farm Storage — 2D Interactive Digital Twin
            </h3>
            <DataBadge label={trad.data_label} />
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Simulates a passively ventilated brick/mud agricultural room. Evaluates conductive wall heat flux,
            respiration thermal output, ventilation air changes, and Dalton&apos;s Law oxygen partial pressures.
          </p>
        </div>

        {/* Layer View Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
          {(['layout', 'heatmap', 'humidity', 'airflow', 'sensors'] as const).map((layer) => (
            <button
              key={layer}
              onClick={() => setActiveLayer(layer)}
              className={`px-3 py-1.5 rounded-md uppercase font-semibold transition-colors ${
                activeLayer === layer
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              {layer}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: 2D Digital Twin & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 2D Architectural Canvas */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 relative overflow-hidden flex flex-col items-center justify-center min-h-[460px] shadow-xs">
          {/* Status Overlay Banner */}
          <div className="w-full flex items-center justify-between mb-3 text-xs text-slate-500 border-b border-slate-200 pb-2">
            <span className="flex items-center gap-2 text-slate-900 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              {trad.name} ({trad.commodity.toUpperCase()})
            </span>
            <div className="flex items-center gap-3">
              <span>Ventilation: <strong className="text-slate-900">{trad.air_changes_per_hour} ACH</strong></span>
              <span>Damper: <strong className="text-slate-900">{trad.damper_open_pct}%</strong></span>
              <span>Door: <strong className={trad.door_open ? 'text-red-600 font-bold' : 'text-emerald-600 font-bold'}>{trad.door_open ? 'OPEN' : 'CLOSED'}</strong></span>
            </div>
          </div>

          {/* 2D Architectural Floorplan Container */}
          <div className="relative w-full max-w-[620px] aspect-[4/3] bg-slate-900 border-4 border-slate-800 rounded-xl shadow-inner overflow-hidden flex items-center justify-center">
            {/* SVG Base Architectural Geometry */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 600 450">
              <defs>
                <pattern id="floor-grid-blue" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1E293B" strokeWidth="1" />
                </pattern>
                <marker id="arrow-blue" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#38BDF8" />
                </marker>
              </defs>
              <rect width="600" height="450" fill="url(#floor-grid-blue)" />

              {/* Room Outer Boundaries (Adobe/Brick Walls) */}
              <rect x="20" y="20" width="560" height="410" fill="none" stroke="#475569" strokeWidth="16" />

              {/* Ventilation Openings: Top-Right Louver */}
              <rect x="420" y="12" width="100" height="16" fill="#2563EB" />
              <text x="470" y="8" fill="#93C5FD" fontSize="10" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">
                VENT LOUVER ({trad.damper_open_pct}%)
              </text>

              {/* Ceiling Exhaust Outlet: Top-Center */}
              <rect x="250" y="12" width="60" height="16" fill="#38BDF8" />
              <text x="280" y="8" fill="#38BDF8" fontSize="9" fontFamily="sans-serif" textAnchor="middle">
                EXHAUST
              </text>

              {/* Main Access Door: Bottom Left */}
              <rect
                x="60"
                y="422"
                width="90"
                height="16"
                fill={trad.door_open ? '#DC2626' : '#2563EB'}
                className="cursor-pointer"
                onClick={() => {
                  const nVal = !doorToggled;
                  setDoorToggled(nVal);
                  handleApplyControls(undefined, nVal);
                }}
              />
              <text x="105" y="445" fill={trad.door_open ? '#DC2626' : '#93C5FD'} fontSize="10" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">
                DOOR {trad.door_open ? '(OPEN - INGRESS)' : '(CLOSED)'}
              </text>

              {/* Produce Crate Stacks */}
              <g id="crates">
                {/* Stack 1 */}
                <rect x="120" y="120" width="130" height="190" fill="#1E293B" stroke="#334155" strokeWidth="2" rx="4" />
                <rect x="130" y="130" width="110" height="50" fill="#334155" rx="2" />
                <rect x="130" y="190" width="110" height="50" fill="#334155" rx="2" />
                <rect x="130" y="250" width="110" height="50" fill="#334155" rx="2" />
                <text x="185" y="160" fill="#93C5FD" fontSize="10" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">
                  STACK A (400 kg)
                </text>
                <text x="185" y="220" fill="#FFFFFF" fontSize="10" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">
                  {trad.commodity.toUpperCase()}
                </text>
                <text x="185" y="280" fill="#94A3B8" fontSize="9" fontFamily="sans-serif" textAnchor="middle">
                  CORE RESIDUAL HEAT
                </text>

                {/* Stack 2 */}
                <rect x="330" y="120" width="130" height="190" fill="#1E293B" stroke="#334155" strokeWidth="2" rx="4" />
                <rect x="340" y="130" width="110" height="50" fill="#334155" rx="2" />
                <rect x="340" y="190" width="110" height="50" fill="#334155" rx="2" />
                <rect x="340" y="250" width="110" height="50" fill="#334155" rx="2" />
                <text x="395" y="160" fill="#93C5FD" fontSize="10" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">
                  STACK B (800 kg)
                </text>
                <text x="395" y="220" fill="#FFFFFF" fontSize="10" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">
                  {trad.commodity.toUpperCase()}
                </text>
                <text x="395" y="280" fill="#94A3B8" fontSize="9" fontFamily="sans-serif" textAnchor="middle">
                  TRANSPIRATION
                </text>
              </g>

              {/* Airflow Particles Animation */}
              {(activeLayer === 'layout' || activeLayer === 'airflow') && (
                <g id="airflow-vectors" opacity="0.85">
                  <path
                    d="M 470 30 Q 420 180 280 200"
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth="2.5"
                    strokeDasharray="6,4"
                    markerEnd="url(#arrow-blue)"
                  >
                    <animate attributeName="stroke-dashoffset" from="30" to="0" dur="2s" repeatCount="indefinite" />
                  </path>
                  <path
                    d="M 280 200 Q 185 240 105 420"
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth="2"
                    strokeDasharray="6,4"
                    markerEnd="url(#arrow-blue)"
                  >
                    <animate attributeName="stroke-dashoffset" from="30" to="0" dur="2.5s" repeatCount="indefinite" />
                  </path>
                  <path
                    d="M 470 30 Q 300 80 280 30"
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    markerEnd="url(#arrow-blue)"
                  >
                    <animate attributeName="stroke-dashoffset" from="20" to="0" dur="1.8s" repeatCount="indefinite" />
                  </path>
                </g>
              )}

              {/* Virtual IoT Sensors Overlay */}
              {(activeLayer === 'sensors' || activeLayer === 'layout') && (
                <g id="virtual-sensors">
                  {trad.sensors.map((s, idx) => {
                    const cx = 50 + idx * 115;
                    const cy = 70 + (idx % 2) * 290;
                    const isSel = selectedSensor === s.id;
                    return (
                      <g
                        key={s.id}
                        className="cursor-pointer"
                        onClick={() => setSelectedSensor(s.id === selectedSensor ? null : s.id)}
                      >
                        <circle
                          cx={cx}
                          cy={cy}
                          r={isSel ? 16 : 12}
                          fill="#0F172A"
                          stroke={isSel ? '#2563EB' : '#38BDF8'}
                          strokeWidth="2"
                        />
                        <circle cx={cx} cy={cy} r="4" fill={isSel ? '#2563EB' : '#38BDF8'} />
                        <text
                          x={cx}
                          y={cy - 16}
                          fill="#F8FAFC"
                          fontSize="9"
                          fontFamily="sans-serif"
                          textAnchor="middle"
                          fontWeight="bold"
                        >
                          {s.type.slice(0, 4)}: {s.value}{s.unit}
                        </text>
                      </g>
                    );
                  })}
                </g>
              )}
            </svg>

            {/* Canvas Thermal Heatmap Overlay */}
            {(activeLayer === 'heatmap' || activeLayer === 'humidity') && (
              <canvas
                ref={canvasRef}
                width={560}
                height={410}
                className="absolute inset-0 w-full h-full pointer-events-none opacity-85"
              />
            )}
          </div>

          {/* Interactive Inspection Tooltip */}
          {selectedSensor && (
            <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 w-full flex items-center justify-between shadow-xs">
              <span>
                Sensor Selected: <strong className="text-blue-600">{selectedSensor}</strong>
              </span>
              <DataBadge label="SIMULATED" />
            </div>
          )}
        </div>

        {/* Right Column: Physical Controls & Mathematical Physics Panel */}
        <div className="lg:col-span-4 space-y-4">
          {/* Produce Health Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="text-xs font-semibold uppercase text-slate-500">Produce Condition</span>
              <DataBadge label="PREDICTED" />
            </div>

            <div className="grid grid-cols-2 gap-3 my-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 font-medium">Quality Score</span>
                <div className="text-2xl font-bold text-slate-900 mt-0.5">
                  {trad.quality_score.toFixed(1)}
                  <span className="text-xs text-slate-500 font-normal">/100</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-blue-600"
                    style={{ width: `${Math.min(100, trad.quality_score)}%` }}
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 font-medium">Remaining Shelf Life</span>
                <div className="text-2xl font-bold text-amber-600 mt-0.5">
                  {trad.remaining_shelf_life_days.toFixed(1)}
                  <span className="text-xs text-slate-500 font-normal ml-1">Days</span>
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  (~{trad.remaining_shelf_life_hours.toFixed(0)} hrs)
                </span>
              </div>
            </div>

            {/* Spoilage Risk Badge */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              <span className="text-slate-600">Biological Spoilage Risk:</span>
              <span
                className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                  trad.spoilage_category === 'LOW'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                {trad.spoilage_risk_pct.toFixed(1)}% ({trad.spoilage_category})
              </span>
            </div>
          </div>

          {/* Environmental Readout Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
              <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                <Thermometer className="w-4 h-4 text-blue-600" />
                <span>Internal Temp</span>
              </div>
              <div className="text-xl font-bold text-slate-900">
                {trad.internal_temp_c.toFixed(1)}°C
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Ambient: {ambient?.temperature_c ?? 28}°C
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
              <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                <Droplets className="w-4 h-4 text-cyan-600" />
                <span>Relative Humidity</span>
              </div>
              <div className="text-xl font-bold text-slate-900">
                {trad.internal_rh_pct.toFixed(1)}%
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Ambient: {ambient?.relative_humidity_pct ?? 65}%
              </span>
            </div>
          </div>

          {/* Dalton's Law Oxygen Partial Pressure */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold uppercase text-slate-800">Dalton&apos;s Law Model</span>
              </div>
              <DataBadge label="SIMULATED" />
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="p-2 bg-slate-50 rounded border border-slate-200 font-mono text-[11px] text-slate-600">
                P_O2 = 0.2095 × (P_atm - P_H2O)
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Oxygen Partial Pressure:</span>
                <strong className="text-slate-900 font-mono">{trad.o2_partial_pressure_kpa.toFixed(3)} kPa</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>O2 Concentration:</span>
                <strong className="text-slate-900 font-mono">{trad.internal_o2_pct.toFixed(2)}%</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>CO2 Level:</span>
                <strong className="text-slate-900 font-mono">{trad.internal_co2_ppm.toFixed(0)} ppm</strong>
              </div>
            </div>
          </div>

          {/* Interactive Simulation Controls */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-blue-700">
              <Sliders className="w-4 h-4" />
              <span>Storage Controls</span>
            </div>

            {/* Damper Slider */}
            <div>
              <div className="flex justify-between text-xs mb-1 text-slate-800">
                <span>Ventilation Damper:</span>
                <span className="text-blue-600 font-bold">{damperSlider}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={damperSlider}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setDamperSlider(val);
                  handleApplyControls(val, undefined);
                }}
                className="w-full accent-blue-600 bg-slate-200 h-1.5 rounded cursor-pointer"
              />
            </div>

            {/* Door Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <div className="text-xs">
                <span className="text-slate-800 font-medium">Access Door:</span>
                <p className="text-[10px] text-slate-500">Convective heat influx when open.</p>
              </div>
              <button
                onClick={() => {
                  const nDoor = !doorToggled;
                  setDoorToggled(nDoor);
                  handleApplyControls(undefined, nDoor);
                }}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-all shadow-xs ${
                  doorToggled
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {doorToggled ? 'DOOR OPEN' : 'DOOR CLOSED'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
