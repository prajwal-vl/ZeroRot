import React, { useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { WarehouseArchitecture } from './WarehouseArchitecture';
import { StorageRack } from './StorageRack';
import { AirflowParticles } from './AirflowParticles';
import { ThermalHeatmap } from './ThermalHeatmap';
import {
  Maximize2,
  Eye,
  Thermometer,
  Droplets,
  Wind,
  Layers,
  Sparkles,
  CheckCircle2,
  X,
  Compass,
  Activity
} from 'lucide-react';
import { SimulationState } from '../../types/simulation';

interface WarehouseCanvasProps {
  simulationState: SimulationState | null;
  onRefreshState?: () => void;
}

// Camera animator component to smoothly tween camera position
function CameraController({ targetPosition, targetLookAt }: { targetPosition: [number, number, number]; targetLookAt: [number, number, number] }) {
  useFrame(({ camera }) => {
    camera.position.lerp(new THREE.Vector3(...targetPosition), 0.06);
    camera.lookAt(new THREE.Vector3(...targetLookAt));
  });
  return null;
}

export const WarehouseCanvas: React.FC<WarehouseCanvasProps> = ({
  simulationState,
  onRefreshState,
}) => {
  // Camera perspective state
  const [cameraView, setCameraView] = useState<'overview' | 'chamber_a' | 'chamber_b' | 'chamber_c' | 'loading_dock' | 'top_down'>('overview');
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);
  const [showAirflow, setShowAirflow] = useState<boolean>(true);
  const [selectedZone, setSelectedZone] = useState<any | null>(null);

  // Extract microclimate parameters from simulation state
  const cold = simulationState?.cold_storage;
  const chambers = cold?.chambers || {};

  const chamberA = {
    tempC: chambers.chamber_a?.internal_temp_c ?? chambers.chamber_a?.temp_c ?? 13.0,
    rhPct: chambers.chamber_a?.internal_rh_pct ?? chambers.chamber_a?.rh_pct ?? 90.0,
    o2Pct: chambers.chamber_a?.internal_o2_pct ?? chambers.chamber_a?.o2_pct ?? 20.8,
    quality: chambers.chamber_a?.quality_score ?? 91.5,
  };
  const chamberB = {
    tempC: chambers.chamber_b?.internal_temp_c ?? chambers.chamber_b?.temp_c ?? 10.5,
    rhPct: chambers.chamber_b?.internal_rh_pct ?? chambers.chamber_b?.rh_pct ?? 89.0,
    o2Pct: chambers.chamber_b?.internal_o2_pct ?? chambers.chamber_b?.o2_pct ?? 20.9,
    quality: chambers.chamber_b?.quality_score ?? 88.0,
  };
  const chamberC = {
    tempC: chambers.chamber_c?.internal_temp_c ?? chambers.chamber_c?.temp_c ?? 2.2,
    rhPct: chambers.chamber_c?.internal_rh_pct ?? chambers.chamber_c?.rh_pct ?? 74.0,
    o2Pct: chambers.chamber_c?.internal_o2_pct ?? chambers.chamber_c?.o2_pct ?? 14.5,
    quality: chambers.chamber_c?.quality_score ?? 94.0,
  };

  // Camera targets for each view
  const cameraPresets: Record<string, { pos: [number, number, number]; lookAt: [number, number, number] }> = {
    overview: { pos: [22, 17, 24], lookAt: [0, 2, 0] },
    chamber_a: { pos: [-14, 8, 8], lookAt: [-14, 2, -4] },
    chamber_b: { pos: [0, 8, 8], lookAt: [0, 2, -4] },
    chamber_c: { pos: [14, 8, 8], lookAt: [14, 2, -4] },
    loading_dock: { pos: [0, 5, 23], lookAt: [0, 2, 12] },
    top_down: { pos: [0, 36, 0.1], lookAt: [0, 0, 0] },
  };

  const currentCam = cameraPresets[cameraView] || cameraPresets.overview;

  return (
    <div className="relative w-full h-[620px] bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-md">
      {/* 1. Main Three.js R3F Canvas */}
      <Canvas
        shadows
        camera={{ position: [22, 17, 24], fov: 46 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      >
        <CameraController targetPosition={currentCam.pos} targetLookAt={currentCam.lookAt} />
        <OrbitControls
          makeDefault
          maxPolarAngle={Math.PI / 2 - 0.05}
          minDistance={5}
          maxDistance={60}
          dampingFactor={0.05}
        />

        {/* Ambient & Directional Lighting */}
        <ambientLight intensity={0.75} color="#E0F2FE" />
        <directionalLight
          position={[18, 28, 20]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <pointLight position={[0, 9, 0]} intensity={0.5} color="#93C5FD" />

        {/* Warehouse Walls, Floor & Evaporator Architecture */}
        <WarehouseArchitecture
          chamberA={chamberA}
          chamberB={chamberB}
          chamberC={chamberC}
        />

        {/* Chamber A Racks (Mangoes & Bananas) */}
        <StorageRack
          position={[-16, 0, -8]}
          rackId="RACK-A1"
          chamberName="Chamber A (Tropical)"
          commodity="mango"
          qualityScore={chamberA.quality}
          temperatureC={chamberA.tempC}
          humidityPct={chamberA.rhPct}
          isSelected={selectedZone?.rackId === 'RACK-A1'}
          onSelect={setSelectedZone}
        />
        <StorageRack
          position={[-12, 0, -8]}
          rackId="RACK-A2"
          chamberName="Chamber A (Tropical)"
          commodity="banana"
          qualityScore={chamberA.quality - 2}
          temperatureC={chamberA.tempC}
          humidityPct={chamberA.rhPct}
          isSelected={selectedZone?.rackId === 'RACK-A2'}
          onSelect={setSelectedZone}
        />
        <StorageRack
          position={[-14, 0, 2]}
          rackId="RACK-A3"
          chamberName="Chamber A (Tropical)"
          commodity="banana"
          qualityScore={chamberA.quality}
          temperatureC={chamberA.tempC}
          humidityPct={chamberA.rhPct}
          isSelected={selectedZone?.rackId === 'RACK-A3'}
          onSelect={setSelectedZone}
        />

        {/* Chamber B Racks (Tomatoes & Apples) */}
        <StorageRack
          position={[-2, 0, -8]}
          rackId="RACK-B1"
          chamberName="Chamber B (Solanaceous)"
          commodity="tomato"
          qualityScore={chamberB.quality}
          temperatureC={chamberB.tempC}
          humidityPct={chamberB.rhPct}
          isSelected={selectedZone?.rackId === 'RACK-B1'}
          onSelect={setSelectedZone}
        />
        <StorageRack
          position={[2, 0, -8]}
          rackId="RACK-B2"
          chamberName="Chamber B (Solanaceous)"
          commodity="apple"
          qualityScore={chamberB.quality + 2}
          temperatureC={chamberB.tempC}
          humidityPct={chamberB.rhPct}
          isSelected={selectedZone?.rackId === 'RACK-B2'}
          onSelect={setSelectedZone}
        />
        <StorageRack
          position={[0, 0, 2]}
          rackId="RACK-B3"
          chamberName="Chamber B (Solanaceous)"
          commodity="tomato"
          qualityScore={chamberB.quality}
          temperatureC={chamberB.tempC}
          humidityPct={chamberB.rhPct}
          isSelected={selectedZone?.rackId === 'RACK-B3'}
          onSelect={setSelectedZone}
        />

        {/* Chamber C Racks (Potatoes & Grapes) */}
        <StorageRack
          position={[12, 0, -8]}
          rackId="RACK-C1"
          chamberName="Chamber C (Controlled Atm)"
          commodity="potato"
          qualityScore={chamberC.quality}
          temperatureC={chamberC.tempC}
          humidityPct={chamberC.rhPct}
          isSelected={selectedZone?.rackId === 'RACK-C1'}
          onSelect={setSelectedZone}
        />
        <StorageRack
          position={[16, 0, -8]}
          rackId="RACK-C2"
          chamberName="Chamber C (Controlled Atm)"
          commodity="grape"
          qualityScore={chamberC.quality - 1}
          temperatureC={chamberC.tempC}
          humidityPct={chamberC.rhPct}
          isSelected={selectedZone?.rackId === 'RACK-C2'}
          onSelect={setSelectedZone}
        />
        <StorageRack
          position={[14, 0, 2]}
          rackId="RACK-C3"
          chamberName="Chamber C (Controlled Atm)"
          commodity="potato"
          qualityScore={chamberC.quality}
          temperatureC={chamberC.tempC}
          humidityPct={chamberC.rhPct}
          isSelected={selectedZone?.rackId === 'RACK-C3'}
          onSelect={setSelectedZone}
        />

        {/* Airflow Particles Animation */}
        {showAirflow && <AirflowParticles speed={simulationState?.sim_speed || 1} />}

        {/* Dynamic Thermal Heatmap Layer */}
        <ThermalHeatmap
          chamberA_temp={chamberA.tempC}
          chamberB_temp={chamberB.tempC}
          chamberC_temp={chamberC.tempC}
          visible={showHeatmap}
        />
      </Canvas>

      {/* 2. Top-Left: Camera Perspective Quick Switcher */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-1.5 bg-slate-900/85 backdrop-blur-md p-1.5 rounded-lg border border-slate-700 text-xs shadow-md">
        <span className="text-[10px] text-slate-400 font-bold px-2 uppercase flex items-center gap-1">
          <Compass className="w-3.5 h-3.5 text-blue-400" />
          Camera:
        </span>
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'chamber_a', label: 'Chamber A' },
          { key: 'chamber_b', label: 'Chamber B' },
          { key: 'chamber_c', label: 'Chamber C' },
          { key: 'loading_dock', label: 'Dock' },
          { key: 'top_down', label: 'Top-Down' },
        ].map((btn) => (
          <button
            key={btn.key}
            onClick={() => setCameraView(btn.key as any)}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
              cameraView === btn.key
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* 3. Top-Right: Heatmap & Airflow Visualization Toggles */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <button
          onClick={() => setShowHeatmap((prev) => !prev)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border flex items-center gap-1.5 backdrop-blur-md shadow-xs ${
            showHeatmap
              ? 'bg-emerald-600/90 text-white border-emerald-500'
              : 'bg-slate-900/85 text-slate-300 border-slate-700 hover:bg-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>3D Thermal Heatmap: {showHeatmap ? 'ON' : 'OFF'}</span>
        </button>

        <button
          onClick={() => setShowAirflow((prev) => !prev)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border flex items-center gap-1.5 backdrop-blur-md shadow-xs ${
            showAirflow
              ? 'bg-blue-600/90 text-white border-blue-500'
              : 'bg-slate-900/85 text-slate-300 border-slate-700 hover:bg-slate-800'
          }`}
        >
          <Wind className="w-3.5 h-3.5" />
          <span>Airflow: {showAirflow ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* 4. Bottom-Left: Live Chamber Microclimate HUD */}
      <div className="absolute bottom-4 left-4 z-20 hidden md:flex items-center gap-2 bg-slate-900/90 backdrop-blur-md p-2 rounded-xl border border-slate-700 text-xs shadow-lg">
        {/* Chamber A Pill */}
        <div className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700">
          <div className="flex items-center justify-between gap-3 text-[10px] text-slate-400 font-bold uppercase">
            <span>Chamber A (Tropical)</span>
            <span className="text-blue-400">Mango / Banana</span>
          </div>
          <div className="flex items-center gap-3 mt-1 font-semibold text-slate-200">
            <span>{chamberA.tempC.toFixed(1)}°C</span>
            <span>{chamberA.rhPct.toFixed(0)}% RH</span>
            <span className="text-emerald-400 font-bold">{chamberA.quality.toFixed(1)}% Fresh</span>
          </div>
        </div>

        {/* Chamber B Pill */}
        <div className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700">
          <div className="flex items-center justify-between gap-3 text-[10px] text-slate-400 font-bold uppercase">
            <span>Chamber B (Solanaceous)</span>
            <span className="text-emerald-400">Tomato / Apple</span>
          </div>
          <div className="flex items-center gap-3 mt-1 font-semibold text-slate-200">
            <span>{chamberB.tempC.toFixed(1)}°C</span>
            <span>{chamberB.rhPct.toFixed(0)}% RH</span>
            <span className="text-emerald-400 font-bold">{chamberB.quality.toFixed(1)}% Fresh</span>
          </div>
        </div>

        {/* Chamber C Pill */}
        <div className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700">
          <div className="flex items-center justify-between gap-3 text-[10px] text-slate-400 font-bold uppercase">
            <span>Chamber C (Controlled Atm)</span>
            <span className="text-indigo-400">Potato / Grape</span>
          </div>
          <div className="flex items-center gap-3 mt-1 font-semibold text-slate-200">
            <span>{chamberC.tempC.toFixed(1)}°C</span>
            <span>{chamberC.rhPct.toFixed(0)}% RH</span>
            <span className="text-emerald-400 font-bold">{chamberC.quality.toFixed(1)}% Fresh</span>
          </div>
        </div>
      </div>

      {/* 5. Selected Rack Inspection Drawer Modal */}
      {selectedZone && (
        <div className="absolute top-16 right-4 z-30 w-72 bg-slate-900/95 backdrop-blur-md p-4 rounded-xl border border-blue-500 shadow-2xl text-white text-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-700 pb-2">
            <div>
              <span className="text-[10px] text-blue-400 font-bold uppercase">{selectedZone.chamberName}</span>
              <h4 className="text-sm font-bold text-white tracking-tight">{selectedZone.rackId}</h4>
            </div>
            <button
              onClick={() => setSelectedZone(null)}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-slate-300">
              <span>Commodity:</span>
              <strong className="text-white capitalize">{selectedZone.commodity}</strong>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>Freshness Score:</span>
              <strong className="text-emerald-400 font-bold text-sm">
                {selectedZone.qualityScore.toFixed(1)}%
              </strong>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>Zone Temperature:</span>
              <strong className="text-white">{selectedZone.temperatureC.toFixed(1)} °C</strong>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>Relative Humidity:</span>
              <strong className="text-white">{selectedZone.humidityPct.toFixed(0)} % RH</strong>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>Storage Life State:</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                OPTIMAL PRESERVATION
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-700 text-[10px] text-slate-400">
            Rotate camera with left click &bull; Pan with right click &bull; Zoom with scroll wheel.
          </div>
        </div>
      )}
    </div>
  );
};
