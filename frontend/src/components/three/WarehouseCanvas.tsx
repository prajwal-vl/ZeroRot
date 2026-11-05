import React, { useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { WarehouseArchitecture } from './WarehouseArchitecture';
import { StorageRack } from './StorageRack';
import { AirflowParticles } from './AirflowParticles';
import { ThermalHeatmap } from './ThermalHeatmap';
import { Forklift } from './Forklift';
import { HandTruck } from './HandTruck';
import {
  Layers,
  Wind,
  X,
  Compass,
  Truck,
  Eye,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Info,
  Maximize2
} from 'lucide-react';
import { SimulationState } from '../../types/simulation';

interface WarehouseCanvasProps {
  simulationState: SimulationState | null;
  onRefreshState?: () => void;
}

// Camera animator component to smoothly tween camera position and look-at point
function CameraController({
  targetPosition,
  targetLookAt,
}: {
  targetPosition: [number, number, number];
  targetLookAt: [number, number, number];
}) {
  useFrame(({ camera }) => {
    camera.position.lerp(new THREE.Vector3(...targetPosition), 0.065);
    camera.lookAt(new THREE.Vector3(...targetLookAt));
  });
  return null;
}

export const WarehouseCanvas: React.FC<WarehouseCanvasProps> = ({
  simulationState,
}) => {
  // Camera perspective state
  const [cameraView, setCameraView] = useState<
    'overview' | 'banana' | 'orange' | 'mango' | 'guava' | 'grapes' | 'forklift' | 'dock' | 'top_down'
  >('overview');

  // Layer Toggles
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);
  const [showAirflow, setShowAirflow] = useState<boolean>(true);
  const [showLogistics, setShowLogistics] = useState<boolean>(true);
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
    tempC: chambers.chamber_b?.internal_temp_c ?? chambers.chamber_b?.temp_c ?? 8.5,
    rhPct: chambers.chamber_b?.internal_rh_pct ?? chambers.chamber_b?.rh_pct ?? 88.0,
    o2Pct: chambers.chamber_b?.internal_o2_pct ?? chambers.chamber_b?.o2_pct ?? 20.9,
    quality: chambers.chamber_b?.quality_score ?? 93.0,
  };
  const chamberC = {
    tempC: chambers.chamber_c?.internal_temp_c ?? chambers.chamber_c?.temp_c ?? 1.5,
    rhPct: chambers.chamber_c?.internal_rh_pct ?? chambers.chamber_c?.rh_pct ?? 92.0,
    o2Pct: chambers.chamber_c?.internal_o2_pct ?? chambers.chamber_c?.o2_pct ?? 14.5,
    quality: chambers.chamber_c?.quality_score ?? 95.0,
  };

  // Camera targets for each fruit bay and key perspective
  const cameraPresets: Record<string, { pos: [number, number, number]; lookAt: [number, number, number] }> = {
    overview: { pos: [24, 18, 28], lookAt: [0, 2, 0] },
    banana: { pos: [-16, 6.2, 7.5], lookAt: [-16, 2.2, -3] },
    orange: { pos: [-8, 6.2, 7.5], lookAt: [-8, 2.2, -3] },
    mango: { pos: [0, 6.2, 7.5], lookAt: [0, 2.2, -3] },
    guava: { pos: [8, 6.2, 7.5], lookAt: [8, 2.2, -3] },
    grapes: { pos: [16, 6.2, 7.5], lookAt: [16, 2.2, -3] },
    forklift: { pos: [-2, 4.5, 14.5], lookAt: [-2, 1.2, 8.5] },
    dock: { pos: [0, 5.5, 23.5], lookAt: [0, 2.5, 15] },
    top_down: { pos: [0, 40, 0.1], lookAt: [0, 0, 0] },
  };

  const currentCam = cameraPresets[cameraView] || cameraPresets.overview;

  const handleSelectRack = (info: any) => {
    setSelectedZone(info);
    const comm = info.commodity.toLowerCase();
    if (comm.includes('banana')) setCameraView('banana');
    else if (comm.includes('orange')) setCameraView('orange');
    else if (comm.includes('mango')) setCameraView('mango');
    else if (comm.includes('guava')) setCameraView('guava');
    else if (comm.includes('grape')) setCameraView('grapes');
  };

  // Scientific metadata generator for the selected commodity
  const getCommodityScientificInfo = (commodity: string) => {
    const c = commodity.toLowerCase();
    if (c.includes('banana')) {
      return {
        botanicalName: 'Musa acuminata (Cavendish)',
        respirationHeat: '0.075 W/kg',
        decayRateK: '0.055 / day',
        optimalRange: '13.0°C – 15.0°C',
        chillingInjury: '12.0°C (peel browning risk)',
        shelfLifeRemaining: '14.2 days',
        recommendation: 'Maintain Chamber A at 13.5°C with 90% RH. Prevent ethylene cross-exposure.',
      };
    } else if (c.includes('orange')) {
      return {
        botanicalName: 'Citrus × sinensis (Valencia)',
        respirationHeat: '0.025 W/kg',
        decayRateK: '0.0167 / day',
        optimalRange: '6.0°C – 9.0°C',
        chillingInjury: '3.0°C (rind pitting)',
        shelfLifeRemaining: '45.0 days',
        recommendation: 'Chamber B temperature is optimal. Maintain good ventilation to prevent penicillium mold sporulation.',
      };
    } else if (c.includes('mango')) {
      return {
        botanicalName: 'Mangifera indica (Alphonso)',
        respirationHeat: '0.085 W/kg',
        decayRateK: '0.050 / day',
        optimalRange: '12.0°C – 14.0°C',
        chillingInjury: '10.0°C (gray flesh discoloration)',
        shelfLifeRemaining: '11.8 days',
        recommendation: 'High respiration activity detected. Ensure continuous HVAC airflow to evacuate respiratory heat.',
      };
    } else if (c.includes('guava')) {
      return {
        botanicalName: 'Psidium guajava (Allahabad)',
        respirationHeat: '0.070 W/kg',
        decayRateK: '0.0476 / day',
        optimalRange: '8.0°C – 10.0°C',
        chillingInjury: '5.0°C (pulp browning)',
        shelfLifeRemaining: '16.5 days',
        recommendation: 'Maintain high relative humidity (90%+) to prevent epidermal moisture shriveling.',
      };
    } else if (c.includes('grape')) {
      return {
        botanicalName: 'Vitis vinifera (Thompson Seedless)',
        respirationHeat: '0.030 W/kg',
        decayRateK: '0.0160 / day',
        optimalRange: '0.0°C – 2.0°C',
        chillingInjury: 'None (Freezing point: -1.5°C)',
        shelfLifeRemaining: '52.0 days',
        recommendation: 'Controlled Atmosphere Chamber C active. Low oxygen slows metabolic senescence.',
      };
    }
    return {
      botanicalName: 'Solanum lycopersicum',
      respirationHeat: '0.055 W/kg',
      decayRateK: '0.062 / day',
      optimalRange: '10.0°C – 13.0°C',
      chillingInjury: '9.0°C',
      shelfLifeRemaining: '12.0 days',
      recommendation: 'Standard cold storage monitoring active.',
    };
  };

  return (
    <div className="relative w-full h-[660px] bg-slate-950 rounded-xl overflow-hidden border border-slate-700 shadow-xl select-none">
      {/* 1. Top-Left: Camera Navigation Preset Bar */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700 text-xs shadow-lg">
          <span className="text-[10px] text-blue-400 font-extrabold px-2 uppercase tracking-wider flex items-center gap-1">
            <Compass className="w-3.5 h-3.5" />
            Camera:
          </span>
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'banana', label: 'Banana (Bay 1)' },
            { key: 'orange', label: 'Orange (Bay 2)' },
            { key: 'mango', label: 'Mango (Bay 3)' },
            { key: 'guava', label: 'Guava (Bay 4)' },
            { key: 'grapes', label: 'Grapes (Bay 5)' },
            { key: 'forklift', label: 'Forklift' },
            { key: 'dock', label: 'Dock' },
            { key: 'top_down', label: 'Top' },
          ].map((btn) => (
            <button
              key={btn.key}
              onClick={() => {
                setCameraView(btn.key as any);
                if (btn.key === 'overview') setSelectedZone(null);
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                cameraView === btn.key
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Top-Right: Layer Toggles (Heatmap, Airflow, Logistics) */}
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
          <span>Thermal Heatmap: {showHeatmap ? 'ON' : 'OFF'}</span>
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

        <button
          onClick={() => setShowLogistics((prev) => !prev)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border flex items-center gap-1.5 backdrop-blur-md shadow-xs ${
            showLogistics
              ? 'bg-indigo-600/90 text-white border-indigo-500'
              : 'bg-slate-900/85 text-slate-300 border-slate-700 hover:bg-slate-800'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Machinery: {showLogistics ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* 3. Pure Native Three.js WebGL Simulation Canvas */}
      <Canvas
        shadows
        camera={{ position: [24, 18, 28], fov: 46 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
      >
        <CameraController targetPosition={currentCam.pos} targetLookAt={currentCam.lookAt} />
        <OrbitControls
          makeDefault
          maxPolarAngle={Math.PI / 2 - 0.05}
          minDistance={4}
          maxDistance={70}
          dampingFactor={0.05}
        />

        {/* Environmental Fog for Cinematic Atmospheric Depth */}
        <fog attach="fog" args={['#0F172A', 38, 92]} />

        {/* Lighting Architecture */}
        <ambientLight intensity={0.8} color="#E0F2FE" />
        <directionalLight
          position={[20, 32, 22]}
          intensity={1.35}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-bias={-0.0001}
        />
        <directionalLight position={[-18, 16, -14]} intensity={0.4} color="#93C5FD" />
        <pointLight position={[0, 9, 0]} intensity={0.6} color="#60A5FA" />

        {/* Complete Warehouse Architecture with Rotating Evaporators & Structural Framing */}
        <WarehouseArchitecture
          chamberA={chamberA}
          chamberB={chamberB}
          chamberC={chamberC}
        />

        {/* =========================================================================
            5 DESIGNATED FRUIT SECTIONS & RACK SYSTEMS
           ========================================================================= */}

        {/* SECTION 1: BANANA BAY (Chamber A - Tropical Zone: 13.0°C) */}
        <StorageRack
          position={[-16, 0, -8]}
          rackId="BANANA-BAY-01"
          chamberName="Chamber A (Tropical)"
          commodity="banana"
          qualityScore={chamberA.quality}
          temperatureC={chamberA.tempC}
          humidityPct={chamberA.rhPct}
          isSelected={selectedZone?.rackId === 'BANANA-BAY-01'}
          onSelect={handleSelectRack}
        />
        <StorageRack
          position={[-16, 0, 2]}
          rackId="BANANA-BAY-02"
          chamberName="Chamber A (Tropical)"
          commodity="banana"
          qualityScore={Math.max(10, chamberA.quality - 2)}
          temperatureC={chamberA.tempC}
          humidityPct={chamberA.rhPct}
          isSelected={selectedZone?.rackId === 'BANANA-BAY-02'}
          onSelect={handleSelectRack}
        />

        {/* SECTION 2: ORANGE BAY (Chamber B - Citrus Zone: 8.5°C) */}
        <StorageRack
          position={[-8, 0, -8]}
          rackId="ORANGE-BAY-01"
          chamberName="Chamber B (Citrus Zone)"
          commodity="orange"
          qualityScore={chamberB.quality}
          temperatureC={chamberB.tempC}
          humidityPct={chamberB.rhPct}
          isSelected={selectedZone?.rackId === 'ORANGE-BAY-01'}
          onSelect={handleSelectRack}
        />
        <StorageRack
          position={[-8, 0, 2]}
          rackId="ORANGE-BAY-02"
          chamberName="Chamber B (Citrus Zone)"
          commodity="orange"
          qualityScore={Math.max(10, chamberB.quality - 1.5)}
          temperatureC={chamberB.tempC}
          humidityPct={chamberB.rhPct}
          isSelected={selectedZone?.rackId === 'ORANGE-BAY-02'}
          onSelect={handleSelectRack}
        />

        {/* SECTION 3: MANGO BAY (Chamber A - Tropical Zone: 12.5°C) */}
        <StorageRack
          position={[0, 0, -8]}
          rackId="MANGO-BAY-01"
          chamberName="Chamber A (Tropical)"
          commodity="mango"
          qualityScore={chamberA.quality - 1}
          temperatureC={chamberA.tempC}
          humidityPct={chamberA.rhPct}
          isSelected={selectedZone?.rackId === 'MANGO-BAY-01'}
          onSelect={handleSelectRack}
        />
        <StorageRack
          position={[0, 0, 2]}
          rackId="MANGO-BAY-02"
          chamberName="Chamber A (Tropical)"
          commodity="mango"
          qualityScore={chamberA.quality + 1}
          temperatureC={chamberA.tempC}
          humidityPct={chamberA.rhPct}
          isSelected={selectedZone?.rackId === 'MANGO-BAY-02'}
          onSelect={handleSelectRack}
        />

        {/* SECTION 4: GUAVA BAY (Chamber B - Subtropical Zone: 9.0°C) */}
        <StorageRack
          position={[8, 0, -8]}
          rackId="GUAVA-BAY-01"
          chamberName="Chamber B (Subtropical)"
          commodity="guava"
          qualityScore={chamberB.quality - 2}
          temperatureC={chamberB.tempC}
          humidityPct={chamberB.rhPct}
          isSelected={selectedZone?.rackId === 'GUAVA-BAY-01'}
          onSelect={handleSelectRack}
        />
        <StorageRack
          position={[8, 0, 2]}
          rackId="GUAVA-BAY-02"
          chamberName="Chamber B (Subtropical)"
          commodity="guava"
          qualityScore={chamberB.quality}
          temperatureC={chamberB.tempC}
          humidityPct={chamberB.rhPct}
          isSelected={selectedZone?.rackId === 'GUAVA-BAY-02'}
          onSelect={handleSelectRack}
        />

        {/* SECTION 5: GRAPES BAY (Chamber C - Controlled Atmosphere: 1.5°C) */}
        <StorageRack
          position={[16, 0, -8]}
          rackId="GRAPE-BAY-01"
          chamberName="Chamber C (Controlled Atm)"
          commodity="grapes"
          qualityScore={chamberC.quality}
          temperatureC={chamberC.tempC}
          humidityPct={chamberC.rhPct}
          isSelected={selectedZone?.rackId === 'GRAPE-BAY-01'}
          onSelect={handleSelectRack}
        />
        <StorageRack
          position={[16, 0, 2]}
          rackId="GRAPE-BAY-02"
          chamberName="Chamber C (Controlled Atm)"
          commodity="grapes"
          qualityScore={Math.max(10, chamberC.quality - 1)}
          temperatureC={chamberC.tempC}
          humidityPct={chamberC.rhPct}
          isSelected={selectedZone?.rackId === 'GRAPE-BAY-02'}
          onSelect={handleSelectRack}
        />

        {/* =========================================================================
            ANIMATED LOGISTICS MACHINERY & VEHICLES
           ========================================================================= */}
        {showLogistics && (
          <>
            {/* Counterbalanced Electric Forklift in Main Transit Corridor */}
            <Forklift
              position={[-2.2, 0, 8.5]}
              rotation={[0, 1.35, 0]}
              scale={1.05}
              cargoCommodity="orange"
              cargoQuality={93.5}
            />

            {/* Hand Truck 1: Aisle Transit (Loaded with Oranges) */}
            <HandTruck
              position={[-11, 0, 7.2]}
              rotation={[0, 0.45, 0]}
              commodity="orange"
              qualityScore={94.0}
            />

            {/* Hand Truck 2: Aisle Transit (Loaded with Bananas) */}
            <HandTruck
              position={[11, 0, 7.2]}
              rotation={[0, -0.35, 0]}
              commodity="banana"
              qualityScore={92.5}
            />
          </>
        )}

        {/* Recirculating Cold Airflow Stream Dynamics */}
        {showAirflow && <AirflowParticles speed={simulationState?.sim_speed || 1} />}

        {/* Dynamic 5-Bay Thermal Heatmap Floor Blanket */}
        <ThermalHeatmap
          chamberA_temp={chamberA.tempC}
          chamberB_temp={chamberB.tempC}
          chamberC_temp={chamberC.tempC}
          visible={showHeatmap}
        />
      </Canvas>

      {/* 4. Bottom-Left: Live 5-Fruit Storage Microclimate HUD */}
      <div className="absolute bottom-3 left-4 z-20 hidden md:flex items-center gap-2 bg-slate-900/90 backdrop-blur-md p-2.5 rounded-xl border border-slate-700 text-xs shadow-xl overflow-x-auto max-w-[82%]">
        {/* Banana Bay Pill */}
        <button
          onClick={() => setCameraView('banana')}
          className="text-left px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 hover:border-yellow-500/60 transition-all min-w-[130px]"
        >
          <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-yellow-400">
            <span>Banana Bay</span>
            <span className="text-slate-400">Bay 1</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 font-semibold text-slate-200 text-[11px]">
            <span>{chamberA.tempC.toFixed(1)}°C</span>
            <span>{chamberA.rhPct.toFixed(0)}% RH</span>
            <span className="text-emerald-400 font-bold">{chamberA.quality.toFixed(0)}%</span>
          </div>
        </button>

        {/* Orange Bay Pill */}
        <button
          onClick={() => setCameraView('orange')}
          className="text-left px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 hover:border-orange-500/60 transition-all min-w-[130px]"
        >
          <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-orange-400">
            <span>Orange Bay</span>
            <span className="text-slate-400">Bay 2</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 font-semibold text-slate-200 text-[11px]">
            <span>{chamberB.tempC.toFixed(1)}°C</span>
            <span>{chamberB.rhPct.toFixed(0)}% RH</span>
            <span className="text-emerald-400 font-bold">{chamberB.quality.toFixed(0)}%</span>
          </div>
        </button>

        {/* Mango Bay Pill */}
        <button
          onClick={() => setCameraView('mango')}
          className="text-left px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 hover:border-amber-500/60 transition-all min-w-[130px]"
        >
          <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-amber-400">
            <span>Mango Bay</span>
            <span className="text-slate-400">Bay 3</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 font-semibold text-slate-200 text-[11px]">
            <span>{chamberA.tempC.toFixed(1)}°C</span>
            <span>{chamberA.rhPct.toFixed(0)}% RH</span>
            <span className="text-emerald-400 font-bold">{chamberA.quality.toFixed(0)}%</span>
          </div>
        </button>

        {/* Guava Bay Pill */}
        <button
          onClick={() => setCameraView('guava')}
          className="text-left px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 hover:border-lime-500/60 transition-all min-w-[130px]"
        >
          <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-lime-400">
            <span>Guava Bay</span>
            <span className="text-slate-400">Bay 4</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 font-semibold text-slate-200 text-[11px]">
            <span>{chamberB.tempC.toFixed(1)}°C</span>
            <span>{chamberB.rhPct.toFixed(0)}% RH</span>
            <span className="text-emerald-400 font-bold">{chamberB.quality.toFixed(0)}%</span>
          </div>
        </button>

        {/* Grapes Bay Pill */}
        <button
          onClick={() => setCameraView('grapes')}
          className="text-left px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 hover:border-purple-500/60 transition-all min-w-[130px]"
        >
          <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-purple-400">
            <span>Grapes Bay</span>
            <span className="text-slate-400">Bay 5</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 font-semibold text-slate-200 text-[11px]">
            <span>{chamberC.tempC.toFixed(1)}°C</span>
            <span>{chamberC.rhPct.toFixed(0)}% RH</span>
            <span className="text-emerald-400 font-bold">{chamberC.quality.toFixed(0)}%</span>
          </div>
        </button>
      </div>

      {/* 5. Right Drawer: Deep Scientific Produce Health & Microclimate Inspector */}
      {selectedZone && (
        <div className="absolute top-16 right-4 z-30 w-84 bg-slate-900/95 backdrop-blur-md p-4 rounded-xl border border-blue-500 shadow-2xl text-white text-xs space-y-3.5 max-h-[580px] overflow-y-auto">
          {/* Drawer Header */}
          <div className="flex items-center justify-between border-b border-slate-700 pb-2.5">
            <div>
              <span className="text-[10px] text-blue-400 font-extrabold uppercase tracking-wider">
                {selectedZone.chamberName}
              </span>
              <h4 className="text-sm font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>{selectedZone.rackId}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 uppercase">
                  {selectedZone.commodity}
                </span>
              </h4>
            </div>
            <button
              onClick={() => setSelectedZone(null)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scientific Telemetry Table */}
          {(() => {
            const sci = getCommodityScientificInfo(selectedZone.commodity);
            return (
              <div className="space-y-2.5">
                <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/80">
                  <span className="text-[10px] text-slate-400 block font-medium">Cultivar Taxonomy</span>
                  <span className="text-xs font-semibold text-slate-200 italic">{sci.botanicalName}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/80">
                    <span className="text-[10px] text-slate-400 block">Freshness Score</span>
                    <strong className="text-sm text-emerald-400 font-extrabold">
                      {selectedZone.qualityScore.toFixed(1)}%
                    </strong>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/80">
                    <span className="text-[10px] text-slate-400 block">Safe Shelf Life</span>
                    <strong className="text-sm text-blue-400 font-extrabold">
                      {sci.shelfLifeRemaining}
                    </strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/80">
                    <span className="text-[10px] text-slate-400 block">Zone Temperature</span>
                    <strong className="text-xs text-white font-bold">{selectedZone.temperatureC.toFixed(1)} °C</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/80">
                    <span className="text-[10px] text-slate-400 block">Relative Humidity</span>
                    <strong className="text-xs text-white font-bold">{selectedZone.humidityPct.toFixed(0)} % RH</strong>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1 text-[11px] text-slate-300">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Respiration Heat:</span>
                    <span className="font-semibold text-amber-300">{sci.respirationHeat}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Arrhenius Rate k:</span>
                    <span className="font-mono text-slate-200">{sci.decayRateK}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Optimal Range:</span>
                    <span className="font-semibold text-emerald-300">{sci.optimalRange}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Chilling Threshold:</span>
                    <span className="font-semibold text-rose-300">{sci.chillingInjury}</span>
                  </div>
                </div>

                {/* AI Corrective Recommendation */}
                <div className="p-2.5 rounded-lg bg-blue-950/60 border border-blue-500/40 text-[11px] text-blue-200 space-y-1">
                  <span className="text-[10px] font-extrabold text-blue-400 uppercase tracking-wider block">
                    AI Agronomic Preservation Directive
                  </span>
                  <p className="leading-snug">{sci.recommendation}</p>
                </div>
              </div>
            );
          })()}

          <div className="pt-2 border-t border-slate-700 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Left-click drag: Orbit</span>
            <span>Right-click: Pan</span>
            <span>Wheel: Zoom</span>
          </div>
        </div>
      )}
    </div>
  );
};
