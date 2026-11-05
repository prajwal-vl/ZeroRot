import React, { useState, useEffect, useRef } from 'react';
import {
  Snowflake,
  Layers,
  Thermometer,
  Droplets,
  PackageCheck,
  Zap,
  Sliders,
  PlusCircle,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { SimulationState } from '../types/simulation';
import { DataBadge } from './DataBadge';
import { api } from '../services/api';

interface ColdStorageViewProps {
  simulationState: SimulationState | null;
  simpleMode: boolean;
  onRefreshState: () => void;
}

export const ColdStorageView: React.FC<ColdStorageViewProps> = ({
  simulationState,
  simpleMode,
  onRefreshState,
}) => {
  const [selectedChamberId, setSelectedChamberId] = useState<string>('chamber_veggie');
  const [activeLayer, setActiveLayer] = useState<'layout' | 'heatmap' | 'sensors'>('layout');
  
  const [allocCommodity, setAllocCommodity] = useState<string>('tomato');
  const [allocKg, setAllocKg] = useState<number>(1000);
  const [allocCrates, setAllocCrates] = useState<number>(50);
  const [allocMessage, setAllocMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cold = simulationState?.cold_storage;
  const ambient = simulationState?.ambient_environment;

  const currentChamber = cold?.chambers[selectedChamberId] || cold?.chambers['chamber_veggie'];

  // Render 2D Canvas Heatmap for the selected chamber (6x6 grid)
  useEffect(() => {
    if (!canvasRef.current || !currentChamber?.spatial_grid) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (activeLayer === 'heatmap') {
      const rows = 6;
      const cols = 6;
      const cellW = canvas.width / cols;
      const cellH = canvas.height / rows;

      currentChamber.spatial_grid.forEach((pt) => {
        const x = pt.col * cellW;
        const y = pt.row * cellH;

        const t = pt.temp_c;
        let fill = '';
        if (t < 4.0) fill = 'rgba(37, 99, 235, 0.75)';
        else if (t < 11.0) fill = 'rgba(56, 189, 248, 0.75)';
        else if (t < 15.0) fill = 'rgba(234, 179, 8, 0.75)';
        else if (t < 18.0) fill = 'rgba(249, 115, 22, 0.8)';
        else fill = 'rgba(220, 38, 38, 0.85)';

        ctx.fillStyle = fill;
        ctx.fillRect(x, y, cellW, cellH);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cellW, cellH);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${pt.temp_c.toFixed(1)}°C`, x + cellW / 2, y + cellH / 2);
      });
    }
  }, [activeLayer, currentChamber]);

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateControls({
        chamber_target_temp: { [selectedChamberId]: currentChamber?.target_temp_c },
      });
      const res = await fetch('/api/v1/storage/cold/allocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chamber_id: selectedChamberId,
          commodity_name: allocCommodity,
          quantity_kg: allocKg,
          crates: allocCrates,
        }),
      });
      if (res.ok) {
        setAllocMessage(`Allocated ${allocKg}kg (${allocCrates} crates) to ${currentChamber?.name}!`);
        onRefreshState();
        setTimeout(() => setAllocMessage(null), 4000);
      } else {
        const err = await res.json();
        setAllocMessage(`Allocation failed: ${err.detail || 'Capacity exceeded'}`);
      }
    } catch (err) {
      setAllocMessage('Failed to execute allocation.');
    }
  };

  if (!cold || !currentChamber) {
    return (
      <div className="p-8 text-center text-slate-500 font-medium bg-white border border-slate-200 rounded-xl">
        Loading Cold Storage Warehouse Twin...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Intelligent Cold Storage — 2D Multi-Zone Twin
            </h3>
            <DataBadge label={cold.data_label} />
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Multi-chamber industrial cold warehouse. Features thermostatic compressor modulation, PIR insulation
            boundary calculations, spatial temperature gradients, and produce allocation capacity management.
          </p>
        </div>

        {/* Layer View Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
          {(['layout', 'heatmap', 'sensors'] as const).map((layer) => (
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

      {/* Chamber Selection Pills */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(cold.chambers).map(([cid, ch]) => {
          const isSelected = selectedChamberId === cid;
          return (
            <button
              key={cid}
              onClick={() => setSelectedChamberId(cid)}
              className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden shadow-xs ${
                isSelected
                  ? 'bg-blue-50/50 border-blue-600 ring-1 ring-blue-600'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">{cid}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                    ch.compressor_running
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {ch.compressor_running ? 'COOLING ACTIVE' : 'IDLE'}
                </span>
              </div>
              <div className="text-sm font-bold text-slate-900 mt-1 truncate">{ch.name}</div>
              <div className="flex items-center gap-4 mt-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">TEMP</span>
                  <span className="text-slate-900 font-bold">{ch.internal_temp_c.toFixed(1)}°C</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">RH</span>
                  <span className="text-slate-900 font-bold">{ch.internal_rh_pct.toFixed(0)}%</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">CAPACITY</span>
                  <span className="text-blue-600 font-bold">
                    {ch.allocated_crates}/{ch.capacity_crates} crates
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Simulation Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 2D Warehouse Floorplan & Chamber Canvas */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 flex flex-col items-center justify-center min-h-[460px] shadow-xs">
          <div className="w-full flex items-center justify-between mb-3 text-xs text-slate-500 border-b border-slate-200 pb-2">
            <span className="text-slate-900 flex items-center gap-2 font-semibold">
              <Snowflake className="w-4 h-4 text-blue-600" />
              {currentChamber.name} — 2D Top-Down View
            </span>
            <div className="flex items-center gap-3">
              <span>Target: <strong className="text-blue-600">{currentChamber.target_temp_c}°C</strong></span>
              <span>Utilization: <strong className="text-slate-900">{currentChamber.utilization_pct}%</strong></span>
            </div>
          </div>

          <div className="relative w-full max-w-[620px] aspect-[4/3] bg-slate-950 border-4 border-slate-800 rounded-xl overflow-hidden flex items-center justify-center shadow-inner">
            {/* SVG Cold Chamber Blueprint */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 600 450">
              <defs>
                <pattern id="ch-grid-blue" width="25" height="25" patternUnits="userSpaceOnUse">
                  <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#1E293B" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="600" height="450" fill="url(#ch-grid-blue)" />

              {/* Insulated PIR Wall */}
              <rect x="25" y="25" width="550" height="400" fill="none" stroke="#2563EB" strokeWidth="14" rx="4" />

              {/* Evaporator Unit */}
              <rect x="230" y="25" width="140" height="45" fill="#0F172A" stroke="#38BDF8" strokeWidth="2" rx="4" />
              <circle cx="270" cy="47" r="14" fill="#1E293B" stroke="#38BDF8" strokeWidth="1.5" />
              <circle cx="330" cy="47" r="14" fill="#1E293B" stroke="#38BDF8" strokeWidth="1.5" />
              <text x="300" y="62" fill="#38BDF8" fontSize="8" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">
                REFRIGERATION EVAPORATOR {currentChamber.compressor_running ? '(ACTIVE)' : '(STANDBY)'}
              </text>

              {/* Chilled Airflow Vectors */}
              {currentChamber.compressor_running && (
                <g id="chilled-flow-blue" opacity="0.8">
                  <path d="M 270 70 L 270 180" stroke="#38BDF8" strokeWidth="2" strokeDasharray="5,4">
                    <animate attributeName="stroke-dashoffset" from="20" to="0" dur="1s" repeatCount="indefinite" />
                  </path>
                  <path d="M 330 70 L 330 180" stroke="#38BDF8" strokeWidth="2" strokeDasharray="5,4">
                    <animate attributeName="stroke-dashoffset" from="20" to="0" dur="1s" repeatCount="indefinite" />
                  </path>
                </g>
              )}

              {/* Pallet Racks */}
              <g id="rack-left">
                <rect x="55" y="100" width="160" height="260" fill="#0F172A" stroke="#334155" strokeWidth="2" />
                <rect x="65" y="115" width="140" height="65" fill="#1E293B" rx="2" />
                <rect x="65" y="195" width="140" height="65" fill="#1E293B" rx="2" />
                <rect x="65" y="275" width="140" height="65" fill="#1E293B" rx="2" />
                <text x="135" y="152" fill="#93C5FD" fontSize="9" fontFamily="sans-serif" textAnchor="middle">
                  RACK ROW 1A (PALLETIZED)
                </text>
                <text x="135" y="232" fill="#93C5FD" fontSize="9" fontFamily="sans-serif" textAnchor="middle">
                  RACK ROW 1B (PALLETIZED)
                </text>
                <text x="135" y="312" fill="#93C5FD" fontSize="9" fontFamily="sans-serif" textAnchor="middle">
                  RACK ROW 1C (PALLETIZED)
                </text>
              </g>

              <g id="rack-right">
                <rect x="385" y="100" width="160" height="260" fill="#0F172A" stroke="#334155" strokeWidth="2" />
                <rect x="395" y="115" width="140" height="65" fill="#1E293B" rx="2" />
                <rect x="395" y="195" width="140" height="65" fill="#1E293B" rx="2" />
                <rect x="395" y="275" width="140" height="65" fill="#1E293B" rx="2" />
                <text x="465" y="152" fill="#93C5FD" fontSize="9" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">
                  {currentChamber.commodity.toUpperCase()} ({currentChamber.allocated_crates} CRATES)
                </text>
                <text x="465" y="232" fill="#38BDF8" fontSize="9" fontFamily="sans-serif" textAnchor="middle">
                  RESERVED ALLOCATION
                </text>
                <text x="465" y="312" fill="#94A3B8" fontSize="9" fontFamily="sans-serif" textAnchor="middle">
                  EMPTY BAYS AVAILABLE
                </text>
              </g>

              {/* Air-Lock Door */}
              <rect x="250" y="418" width="100" height="14" fill="#2563EB" />
              <text x="300" y="440" fill="#93C5FD" fontSize="9" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">
                AIR-LOCK DOOR (SEALED)
              </text>
            </svg>

            {/* Canvas 2D Spatial Heatmap Overlay */}
            {activeLayer === 'heatmap' && (
              <canvas
                ref={canvasRef}
                width={550}
                height={400}
                className="absolute inset-0 w-full h-full pointer-events-none opacity-80"
              />
            )}
          </div>
        </div>

        {/* Right Column: Telemetry & Produce Allocation Panel */}
        <div className="lg:col-span-4 space-y-4">
          {/* Chamber Status Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="text-xs font-semibold uppercase text-slate-500">Chamber Telemetry</span>
              <DataBadge label="SIMULATED" />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500">Current Temp</span>
                <div className="text-2xl font-bold text-slate-900 mt-0.5">
                  {currentChamber.internal_temp_c.toFixed(1)}°C
                </div>
                <span className="text-[10px] text-slate-500">
                  Target: {currentChamber.target_temp_c}°C
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500">Humidity</span>
                <div className="text-2xl font-bold text-slate-900 mt-0.5">
                  {currentChamber.internal_rh_pct.toFixed(0)}%
                </div>
                <span className="text-[10px] text-slate-500">
                  Target: {currentChamber.target_rh_pct}%
                </span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Produce Quality:</span>
                <strong className="text-emerald-700 font-bold">{currentChamber.quality_score.toFixed(1)}/100</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Estimated Shelf Life:</span>
                <strong className="text-blue-600 font-bold">{currentChamber.remaining_shelf_life_days.toFixed(1)} Days</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Compressor State:</span>
                <strong className={currentChamber.compressor_running ? 'text-blue-600 font-bold' : 'text-slate-500'}>
                  {currentChamber.compressor_running ? 'RUNNING (14.0 kW)' : 'THERMOSTAT IDLE'}
                </strong>
              </div>
            </div>
          </div>

          {/* Allocation Action Box */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase text-blue-700">
              <PlusCircle className="w-4 h-4 text-blue-600" />
              <span>Allocate Produce to Chamber</span>
            </div>

            <form onSubmit={handleAllocate} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-600 block mb-1">Produce Commodity:</label>
                <select
                  value={allocCommodity}
                  onChange={(e) => setAllocCommodity(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="tomato">Tomato (Solanaceous Veg)</option>
                  <option value="mango">Mango (Tropical Fruit)</option>
                  <option value="banana">Banana (Tropical Fruit)</option>
                  <option value="potato">Potato (Tuber)</option>
                  <option value="onion">Onion (Bulb)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 block mb-1">Weight (kg):</label>
                  <input
                    type="number"
                    min="100"
                    max="10000"
                    step="50"
                    value={allocKg}
                    onChange={(e) => setAllocKg(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-medium"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block mb-1">Crates:</label>
                  <input
                    type="number"
                    min="5"
                    max={currentChamber.capacity_crates - currentChamber.allocated_crates}
                    value={allocCrates}
                    onChange={(e) => setAllocCrates(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-colors mt-2 shadow-xs"
              >
                Confirm Rack Allocation
              </button>

              {allocMessage && (
                <div className="p-2.5 bg-blue-50 text-blue-700 font-medium rounded-lg text-center text-xs mt-2 border border-blue-200">
                  {allocMessage}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
