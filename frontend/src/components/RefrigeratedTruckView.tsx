import React, { useState, useEffect, useRef } from 'react';
import {
  Truck,
  Thermometer,
  Droplets,
  MapPin,
  Clock,
  DoorOpen,
  Power,
  Sliders,
  DollarSign,
  AlertOctagon,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { SimulationState } from '../types/simulation';
import { DataBadge } from './DataBadge';
import { api } from '../services/api';

interface RefrigeratedTruckViewProps {
  simulationState: SimulationState | null;
  simpleMode: boolean;
  onRefreshState: () => void;
}

export const RefrigeratedTruckView: React.FC<RefrigeratedTruckViewProps> = ({
  simulationState,
  simpleMode,
  onRefreshState,
}) => {
  const [viewMode, setViewMode] = useState<'interior' | 'exterior' | 'heatmap'>('interior');
  const [speedSlider, setSpeedSlider] = useState<number>(55);
  const [doorToggle, setDoorToggle] = useState<boolean>(false);
  const [reeferToggle, setReeferToggle] = useState<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const truck = simulationState?.refrigerated_truck;
  const ambient = simulationState?.ambient_environment;

  useEffect(() => {
    if (truck) {
      setSpeedSlider(truck.truck_speed_kmh);
      setDoorToggle(truck.rear_door_open);
      setReeferToggle(truck.reefer_on);
    }
  }, [truck?.truck_speed_kmh, truck?.rear_door_open, truck?.reefer_on]);

  // Render 8x4 cargo cross-section heatmap on Canvas 2D
  useEffect(() => {
    if (!canvasRef.current || !truck?.spatial_heatmap) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (viewMode === 'heatmap') {
      const cols = 8;
      const rows = 4;
      const cellW = canvas.width / cols;
      const cellH = canvas.height / rows;

      truck.spatial_heatmap.forEach((pt) => {
        const x = pt.x * cellW;
        const y = pt.y * cellH;

        const t = pt.temp_c;
        let fill = '';
        if (t < 10.0) fill = 'rgba(37, 99, 235, 0.75)';
        else if (t < 14.0) fill = 'rgba(56, 189, 248, 0.75)';
        else if (t < 17.0) fill = 'rgba(234, 179, 8, 0.75)';
        else if (t < 21.0) fill = 'rgba(249, 115, 22, 0.8)';
        else fill = 'rgba(220, 38, 38, 0.85)';

        ctx.fillStyle = fill;
        ctx.fillRect(x, y, cellW, cellH);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cellW, cellH);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${pt.temp_c.toFixed(1)}°C`, x + cellW / 2, y + cellH / 2);
      });
    }
  }, [viewMode, truck?.spatial_heatmap]);

  const handleUpdateControls = async (speed?: number, door?: boolean, reefer?: boolean) => {
    const s = speed !== undefined ? speed : speedSlider;
    const d = door !== undefined ? door : doorToggle;
    const r = reefer !== undefined ? reefer : reeferToggle;

    await api.updateControls({
      truck_speed_kmh: s,
      truck_door_open: d,
      truck_reefer_on: r,
    });
    onRefreshState();
  };

  if (!truck) {
    return (
      <div className="p-8 text-center text-slate-500 font-medium bg-white border border-slate-200 rounded-xl">
        Loading Refrigerated Truck Digital Twin...
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
              Refrigerated Truck — 2D Logistics Digital Twin
            </h3>
            <DataBadge label={truck.data_label} />
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Corridor telematics for active transit (Bengaluru → Mandya). Simulates multi-compartment cargo temperature
            zones (Front, Mid, Rear), reefer compressor airflow, door open convection, and financial risk tracking.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
          {(['interior', 'heatmap', 'exterior'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 rounded-md uppercase font-semibold transition-colors ${
                viewMode === mode
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Transit Route Progress Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs mb-2 gap-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            <span className="font-bold text-slate-900">{truck.origin}</span>
            <span className="text-slate-400">→</span>
            <span className="font-bold text-blue-600">{truck.destination}</span>
          </div>
          <div className="flex items-center gap-4 text-slate-600">
            <span>Progress: <strong className="text-slate-900">{truck.route_progress_pct}%</strong> ({truck.distance_traveled_km}/{truck.route_distance_km} km)</span>
            <span>Speed: <strong className="text-slate-900">{truck.truck_speed_kmh} km/h</strong></span>
            <span>ETA: <strong className="text-amber-600 font-bold">{truck.eta_minutes.toFixed(0)} mins</strong></span>
          </div>
        </div>

        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-500"
            style={{ width: `${truck.route_progress_pct}%` }}
          />
        </div>
      </div>

      {/* Main 2D Vehicle Environment Viewport & Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 2D Truck Cross-Section (SVG & Canvas) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 flex flex-col items-center justify-center min-h-[460px] shadow-xs">
          <div className="w-full flex items-center justify-between mb-3 text-xs text-slate-500 border-b border-slate-200 pb-2">
            <span className="text-slate-900 flex items-center gap-2 font-semibold">
              <Truck className="w-4 h-4 text-blue-600" />
              Vehicle: {truck.plate_number} ({truck.commodity.toUpperCase()} {truck.quantity_kg} kg)
            </span>
            <div className="flex items-center gap-3">
              <span>Reefer: <strong className={truck.reefer_active ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>{truck.reefer_active ? 'ACTIVE' : 'OFF'}</strong></span>
              <span>Rear Door: <strong className={truck.rear_door_open ? 'text-red-600 font-semibold' : 'text-emerald-600 font-semibold'}>{truck.rear_door_open ? 'OPEN' : 'SECURE'}</strong></span>
            </div>
          </div>

          <div className="relative w-full max-w-[640px] aspect-[16/9] bg-slate-950 border-4 border-slate-800 rounded-xl overflow-hidden flex items-center justify-center shadow-inner">
            {/* SVG 2D Truck Illustration */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 640 360">
              <line x1="0" y1="315" x2="640" y2="315" stroke="#334155" strokeWidth="6" />
              <line x1="0" y1="315" x2="640" y2="315" stroke="#38BDF8" strokeWidth="2" strokeDasharray="15,15" />

              {/* Driver Cab */}
              <g id="driver-cab">
                <path d="M 40 280 L 40 180 L 90 140 L 140 140 L 140 280 Z" fill="#0F172A" stroke="#334155" strokeWidth="3" />
                <path d="M 52 185 L 90 152 L 130 152 L 130 185 Z" fill="#38BDF8" opacity="0.6" />
                <rect x="65" y="195" width="60" height="70" fill="none" stroke="#334155" strokeWidth="2" />
                <rect x="75" y="225" width="10" height="4" fill="#38BDF8" />
              </g>

              {/* Reefer Unit */}
              <rect x="140" y="105" width="35" height="60" fill="#0F172A" stroke="#38BDF8" strokeWidth="2" rx="3" />
              <circle cx="157" cy="130" r="12" fill="#1E293B" stroke="#38BDF8" strokeWidth="1.5" />
              <text x="157" y="158" fill="#38BDF8" fontSize="6" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">
                REEFER
              </text>

              {truck.reefer_active && (
                <path d="M 180 130 Q 280 115 420 125" fill="none" stroke="#38BDF8" strokeWidth="3" strokeDasharray="8,5">
                  <animate attributeName="stroke-dashoffset" from="25" to="0" dur="1.2s" repeatCount="indefinite" />
                </path>
              )}

              {/* Main Insulated Trailer */}
              <rect x="175" y="80" width="415" height="200" fill={viewMode === 'exterior' ? '#0F172A' : '#1E293B'} stroke="#334155" strokeWidth="4" rx="3" />

              {viewMode !== 'exterior' && (
                <>
                  <line x1="315" y1="85" x2="315" y2="275" stroke="#334155" strokeWidth="2" strokeDasharray="4,4" />
                  <text x="245" y="102" fill="#38BDF8" fontSize="10" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">
                    ZONE 1: FRONT ({truck.zone_temps.front.toFixed(1)}°C)
                  </text>

                  <line x1="450" y1="85" x2="450" y2="275" stroke="#334155" strokeWidth="2" strokeDasharray="4,4" />
                  <text x="382" y="102" fill="#FBBF24" fontSize="10" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">
                    ZONE 2: MID ({truck.zone_temps.mid.toFixed(1)}°C)
                  </text>

                  <text x="515" y="102" fill={truck.zone_temps.rear > 16 ? '#EF4444' : '#FB923C'} fontSize="10" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">
                    ZONE 3: REAR ({truck.zone_temps.rear.toFixed(1)}°C)
                  </text>

                  <g id="pallet-crates">
                    <rect x="195" y="165" width="48" height="100" fill="#0F172A" stroke="#334155" strokeWidth="1.5" />
                    <rect x="250" y="165" width="48" height="100" fill="#0F172A" stroke="#334155" strokeWidth="1.5" />
                    <rect x="330" y="165" width="48" height="100" fill="#0F172A" stroke="#334155" strokeWidth="1.5" />
                    <rect x="385" y="165" width="48" height="100" fill="#0F172A" stroke="#334155" strokeWidth="1.5" />
                    <rect x="465" y="165" width="48" height="100" fill="#0F172A" stroke="#334155" strokeWidth="1.5" />
                    <rect x="520" y="165" width="48" height="100" fill="#0F172A" stroke="#334155" strokeWidth="1.5" />
                  </g>
                </>
              )}

              {/* Rear Door */}
              <rect
                x="585"
                y="85"
                width="10"
                height="190"
                fill={truck.rear_door_open ? '#DC2626' : '#2563EB'}
                className="cursor-pointer"
                onClick={() => {
                  const nD = !doorToggle;
                  setDoorToggle(nD);
                  handleUpdateControls(undefined, nD, undefined);
                }}
              />

              {truck.rear_door_open && (
                <path d="M 610 180 Q 550 170 510 200" fill="none" stroke="#DC2626" strokeWidth="3" strokeDasharray="6,4">
                  <animate attributeName="stroke-dashoffset" from="0" to="20" dur="1s" repeatCount="indefinite" />
                </path>
              )}

              {/* Wheels */}
              <circle cx="95" cy="285" r="24" fill="#0F172A" stroke="#334155" strokeWidth="6" />
              <circle cx="95" cy="285" r="10" fill="#64748B" />

              <circle cx="480" cy="285" r="24" fill="#0F172A" stroke="#334155" strokeWidth="6" />
              <circle cx="480" cy="285" r="10" fill="#64748B" />

              <circle cx="540" cy="285" r="24" fill="#0F172A" stroke="#334155" strokeWidth="6" />
              <circle cx="540" cy="285" r="10" fill="#64748B" />
            </svg>

            {/* Canvas Heatmap */}
            {viewMode === 'heatmap' && (
              <canvas
                ref={canvasRef}
                width={415}
                height={200}
                className="absolute left-[175px] top-[80px] w-[64.8%] h-[55.5%] pointer-events-none opacity-85"
              />
            )}
          </div>
        </div>

        {/* Right: Telemetry & Controls */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="text-xs font-semibold uppercase text-slate-500">Financial Telemetry</span>
              <DataBadge label="PREDICTED" />
            </div>

            <div className="grid grid-cols-2 gap-3 my-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500">Cargo Value</span>
                <div className="text-lg font-bold text-slate-900 mt-0.5">
                  INR {truck.total_cargo_value_inr.toLocaleString()}
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  {truck.quantity_kg} kg @ INR 28/kg
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500">Value at Risk</span>
                <div className="text-lg font-bold text-red-600 mt-0.5">
                  INR {truck.value_at_risk_inr.toLocaleString()}
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  {truck.spoilage_risk_pct.toFixed(1)}% Spoilage
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Mean Cargo Temp:</span>
                <strong className="text-slate-900">{truck.mean_cargo_temp_c.toFixed(1)}°C</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Cargo Humidity:</span>
                <strong className="text-slate-900">{truck.internal_rh_pct.toFixed(0)}%</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Remaining Shelf Life:</span>
                <strong className="text-amber-600">{truck.remaining_shelf_life_days.toFixed(1)} Days</strong>
              </div>
            </div>
          </div>

          {/* Interactive Controls */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-blue-700">
              <Sliders className="w-4 h-4" />
              <span>Cold Chain Controls</span>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1 text-slate-800">
                <span>Transit Speed:</span>
                <span className="text-slate-900 font-bold">{speedSlider} km/h</span>
              </div>
              <input
                type="range"
                min="0"
                max="90"
                value={speedSlider}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setSpeedSlider(val);
                  handleUpdateControls(val, undefined, undefined);
                }}
                className="w-full accent-blue-600 bg-slate-200 h-1.5 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <div className="text-xs">
                <span className="text-slate-800 font-medium">Reefer Unit:</span>
                <p className="text-[10px] text-slate-500">Active refrigeration loop.</p>
              </div>
              <button
                onClick={() => {
                  const nR = !reeferToggle;
                  setReeferToggle(nR);
                  handleUpdateControls(undefined, undefined, nR);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs ${
                  reeferToggle
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {reeferToggle ? 'REEFER ON' : 'REEFER OFF'}
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <div className="text-xs">
                <span className="text-slate-800 font-medium">Rear Loading Door:</span>
                <p className="text-[10px] text-slate-500">Convective air influx.</p>
              </div>
              <button
                onClick={() => {
                  const nD = !doorToggle;
                  setDoorToggle(nD);
                  handleUpdateControls(undefined, nD, undefined);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs ${
                  doorToggle
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {doorToggle ? 'DOOR OPEN' : 'DOOR CLOSED'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
