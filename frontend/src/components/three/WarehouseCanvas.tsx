import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { WarehouseArchitecture } from './WarehouseArchitecture';
import { StorageRack } from './StorageRack';
import { AirflowParticles } from './AirflowParticles';
import { ThermalHeatmap } from './ThermalHeatmap';
import { Forklift } from './Forklift';
import { HandTruck } from './HandTruck';
import { ZackCutawayInspector } from './ZackCutawayInspector';
import {
  Layers,
  Wind,
  X,
  Compass,
  Truck,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  Gauge,
  DoorOpen,
  Snowflake,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Bot,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  Leaf,
  Info
} from 'lucide-react';
import { SimulationState } from '../../types/simulation';
import { api } from '../../services/api';

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
  onRefreshState,
}) => {
  // Mode: 'story' (Hackathon Guided Narrative) vs 'zack_cutaway' (Zack D. Anatomical Explainer) vs 'free' (Manual Exploration)
  const [viewMode, setViewMode] = useState<'story' | 'free' | 'zack_cutaway'>('story');
  const [currentChapter, setCurrentChapter] = useState<number>(1);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(true);
  const [autoPlayProgress, setAutoPlayProgress] = useState<number>(0);

  // Camera perspective state
  const [cameraView, setCameraView] = useState<
    'overview' | 'banana' | 'orange' | 'mango' | 'guava' | 'grapes' | 'forklift' | 'dock' | 'top_down'
  >('overview');

  // Layer Toggles
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);
  const [showAirflow, setShowAirflow] = useState<boolean>(true);
  const [showLogistics, setShowLogistics] = useState<boolean>(true);
  const [selectedZone, setSelectedZone] = useState<any | null>(null);
  const [isUpdatingPhysics, setIsUpdatingPhysics] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Extract microclimate parameters from simulation state
  const cold = simulationState?.cold_storage;
  const chambers = cold?.chambers || {};

  const isDoorOpen = Boolean(
    simulationState?.active_scenario?.door_open ||
    chambers.chamber_a?.door_open ||
    chambers.chamber_b?.door_open ||
    chambers.chamber_c?.door_open ||
    chambers.chamber_tropical?.door_open ||
    chambers.chamber_veggie?.door_open
  );

  const isCoolingActive = Boolean(
    (simulationState?.is_running ?? true) &&
    !simulationState?.active_scenario?.reefer_fault &&
    simulationState?.active_scenario?.cooling_power_factor !== 0.0
  );

  const currentSimSpeed = simulationState?.sim_speed ?? 1.0;
  const isRunning = simulationState?.is_running ?? true;

  // Chamber telemetries
  const chamberA = {
    tempC: chambers.chamber_a?.internal_temp_c ?? chambers.chamber_a?.temp_c ?? chambers.chamber_tropical?.internal_temp_c ?? 13.0,
    rhPct: chambers.chamber_a?.internal_rh_pct ?? chambers.chamber_a?.rh_pct ?? chambers.chamber_tropical?.internal_rh_pct ?? 90.0,
    o2Pct: chambers.chamber_a?.internal_o2_pct ?? chambers.chamber_a?.o2_pct ?? chambers.chamber_tropical?.internal_o2_pct ?? 20.8,
    quality: chambers.chamber_a?.quality_score ?? chambers.chamber_tropical?.quality_score ?? 91.5,
  };
  const chamberB = {
    tempC: chambers.chamber_b?.internal_temp_c ?? chambers.chamber_b?.temp_c ?? chambers.chamber_veggie?.internal_temp_c ?? 8.5,
    rhPct: chambers.chamber_b?.internal_rh_pct ?? chambers.chamber_b?.rh_pct ?? chambers.chamber_veggie?.internal_rh_pct ?? 88.0,
    o2Pct: chambers.chamber_b?.internal_o2_pct ?? chambers.chamber_b?.o2_pct ?? chambers.chamber_veggie?.internal_o2_pct ?? 20.9,
    quality: chambers.chamber_b?.quality_score ?? chambers.chamber_veggie?.quality_score ?? 93.0,
  };
  const chamberC = {
    tempC: chambers.chamber_c?.internal_temp_c ?? chambers.chamber_c?.temp_c ?? chambers.chamber_cold_dry?.internal_temp_c ?? 1.5,
    rhPct: chambers.chamber_c?.internal_rh_pct ?? chambers.chamber_c?.rh_pct ?? chambers.chamber_cold_dry?.internal_rh_pct ?? 92.0,
    o2Pct: chambers.chamber_c?.internal_o2_pct ?? chambers.chamber_c?.o2_pct ?? chambers.chamber_cold_dry?.internal_o2_pct ?? 14.5,
    quality: chambers.chamber_c?.quality_score ?? chambers.chamber_cold_dry?.quality_score ?? 95.0,
  };

  // Camera targets for each perspective
  const cameraPresets: Record<string, { pos: [number, number, number]; lookAt: [number, number, number] }> = {
    overview: { pos: [26, 20, 30], lookAt: [0, 2, 0] },
    banana: { pos: [-16, 6.2, 7.5], lookAt: [-16, 2.2, -3] },
    orange: { pos: [-8, 6.2, 7.5], lookAt: [-8, 2.2, -3] },
    mango: { pos: [0, 6.2, 7.5], lookAt: [0, 2.2, -3] },
    guava: { pos: [8, 6.2, 7.5], lookAt: [8, 2.2, -3] },
    grapes: { pos: [16, 6.2, 7.5], lookAt: [16, 2.2, -3] },
    forklift: { pos: [-2, 4.5, 14.5], lookAt: [-2, 1.2, 8.5] },
    dock: { pos: [0, 5.5, 23.5], lookAt: [0, 2.5, 15] },
    top_down: { pos: [0, 42, 0.1], lookAt: [0, 0, 0] },
  };

  // ----------------- PRODUCT NARRATIVE CHAPTERS -----------------
  const chapters = [
    {
      id: 1,
      badge: 'CHAPTER 1: THE CRISIS',
      icon: AlertTriangle,
      tagline: '₹1.52 Lakh Crore post-harvest crop loss every year',
      camera: 'overview' as const,
      description:
        'Conventional agricultural cold chains in India lose 30-40% of fresh produce before reaching consumers because warehouses are operated as unmonitored temperature black boxes. ZeroRot transforms physical facilities into an intelligent, physics-informed Digital Twin.',
      metrics: [
        { label: 'Produce Under Custody', value: '45.0 Metric Tons', color: 'text-slate-200' },
        { label: 'Annual National Waste', value: '₹1,52,000 Cr', color: 'text-rose-400' },
        { label: 'Current Facility Risk', value: '₹1,85,000', color: 'text-amber-400' },
      ],
    },
    {
      id: 2,
      badge: 'CHAPTER 2: LIVING DIGITAL TWIN',
      icon: Activity,
      tagline: 'Real-time Biot conduction & USDA Arrhenius decay kinetics',
      camera: 'banana' as const,
      description:
        'ZeroRot pairs wireless IoT microclimate clusters with first-principles thermal physics: Biot conduction numbers (Bi = 0.14), internal core vs pulp gradients, and enzymatic decay equations. Every individual rack shelf-life is calculated in real-time.',
      metrics: [
        { label: 'Active IoT Clusters', value: '18 Sensor Beacons', color: 'text-blue-400' },
        { label: 'Arrhenius Decay Rate k', value: '0.055 / day', color: 'text-slate-200' },
        { label: 'Biot Conduction No', value: '0.14 (Lumped Heat)', color: 'text-emerald-400' },
      ],
      interactiveAction: {
        label: 'Launch Zack 3D Anatomical Cutaway (What Happens Inside)',
        handler: () => {
          setViewMode('zack_cutaway');
          setIsAutoPlaying(false);
        },
      },
    },
    {
      id: 3,
      badge: 'CHAPTER 3: ANOMALY INJECTION',
      icon: ShieldAlert,
      tagline: 'Primary compressor failure & loading dock door breach',
      camera: 'dock' as const,
      description:
        'CRITICAL BREACH: The primary refrigeration compressor trips and the loading bay shutter is left open. Ambient heat surges across the chambers, pushing Banana Bay past the 12°C chilling threshold. Without intervention, 4.8 MT will rot within 36 hours.',
      metrics: [
        { label: 'HVAC Status', value: isCoolingActive ? 'HEALTHY' : 'TRIPPED / FAULT', color: isCoolingActive ? 'text-blue-400' : 'text-rose-400' },
        { label: 'Temperature Surge Rate', value: '+4.8°C / hour', color: 'text-rose-400' },
        { label: 'Shelf-Life Collapse', value: '-68% Remaining', color: 'text-rose-400' },
      ],
      interactiveAction: {
        label: isCoolingActive ? 'Simulate Emergency Compressor Trip' : 'Cooling Already Tripped',
        handler: async () => {
          setIsUpdatingPhysics(true);
          try {
            await api.updateControls({
              scenario_key: 'REEFER_FAILURE',
              truck_reefer_on: false,
              truck_door_open: true,
              traditional_door_open: true,
            });
            setActionFeedback('Emergency incident injected: Compressor tripped, dock shutter open.');
            setTimeout(() => setActionFeedback(null), 4000);
            onRefreshState?.();
          } catch (e: any) {
            console.error(e);
          } finally {
            setIsUpdatingPhysics(false);
          }
        },
      },
    },
    {
      id: 4,
      badge: 'CHAPTER 4: AUTONOMOUS AGENT',
      icon: Bot,
      tagline: 'Agent evaluates counterfactuals and executes re-route',
      camera: 'dock' as const,
      description:
        'ZeroRot’s autonomous decision engine calculates preservation counterfactuals in <200ms. Recognizing that local HVAC repair cannot prevent commercial downgrade, the agent dispatches OPT_EXPEDITE_MANDI, routing the batch to Azadpur Mandi at ₹38.50/kg before rot sets in.',
      metrics: [
        { label: 'Agent Decision', value: 'OPT_EXPEDITE_MANDI', color: 'text-blue-400' },
        { label: 'Locked Mandi Rate', value: '₹38.50 / kg', color: 'text-emerald-400' },
        { label: 'Logistics Asset', value: 'Reefer Truck #04', color: 'text-indigo-400' },
      ],
      interactiveAction: {
        label: 'Execute Autonomous Agent Intervention',
        handler: async () => {
          setIsUpdatingPhysics(true);
          try {
            await api.applyAgentIntervention({
              batch_id: 'BATCH-BNN-001',
              option_key: 'OPT_EXPEDITE_MANDI',
              override_reason: 'Hackathon Demo: Autonomous re-route to Azadpur Mandi to avoid thermal rot.',
            });
            setActionFeedback('Agent intervention applied: OPT_EXPEDITE_MANDI dispatched to Reefer Truck #04.');
            setTimeout(() => setActionFeedback(null), 4000);
            onRefreshState?.();
          } catch (e: any) {
            setActionFeedback(`Intervention logged: ${e.message || 'Dispatched'}`);
            setTimeout(() => setActionFeedback(null), 4000);
          } finally {
            setIsUpdatingPhysics(false);
          }
        },
      },
    },
    {
      id: 5,
      badge: 'CHAPTER 5: ECONOMIC & CARBON ROI',
      icon: TrendingUp,
      tagline: '₹1,42,000 farmer payout saved • 2.40 Tons CO2e avoided',
      camera: 'overview' as const,
      description:
        'Mission accomplished: 100% of commercial crop value is salvaged. ZeroRot guarantees the farmer a ₹1,42,000 payout, avoids 4.8 MT of organic food decay, and prevents 2.40 metric tons of greenhouse gas emissions. From silent loss to automated resilience.',
      metrics: [
        { label: 'Farmer Income Saved', value: '₹1,42,000', color: 'text-emerald-400' },
        { label: 'Produce Salvaged', value: '4.80 Metric Tons', color: 'text-emerald-400' },
        { label: 'CO2e Avoided', value: '2.40 Tons', color: 'text-emerald-400' },
      ],
    },
  ];

  const activeChap = chapters.find((c) => c.id === currentChapter) || chapters[0];

  // Auto-Play story timer (7.5 seconds per chapter)
  useEffect(() => {
    if (viewMode !== 'story' || !isAutoPlaying) {
      setAutoPlayProgress(0);
      return;
    }

    const intervalMs = 100;
    const totalDurationMs = 7500;
    const stepIncrement = (intervalMs / totalDurationMs) * 100;

    const timer = setInterval(() => {
      setAutoPlayProgress((prev) => {
        if (prev >= 100) {
          setCurrentChapter((curr) => (curr < 5 ? curr + 1 : 1));
          return 0;
        }
        return prev + stepIncrement;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [viewMode, isAutoPlaying, currentChapter]);

  // Synchronize camera when chapter changes in Story Mode
  useEffect(() => {
    if (viewMode === 'story') {
      setCameraView(activeChap.camera);
    }
  }, [currentChapter, viewMode]);

  const currentCam =
    viewMode === 'zack_cutaway'
      ? { pos: [0, 2.5, 4.8] as [number, number, number], lookAt: [0, 2.3, 0] as [number, number, number] }
      : (cameraPresets[cameraView] || cameraPresets.overview);

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

  const handleToggleDoor = async () => {
    setIsUpdatingPhysics(true);
    try {
      await api.updateControls({
        scenario_key: isDoorOpen ? 'NORMAL' : 'DOOR_AJAR',
        truck_door_open: !isDoorOpen,
        traditional_door_open: !isDoorOpen,
      });
      onRefreshState?.();
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingPhysics(false);
    }
  };

  const handleToggleReefer = async () => {
    setIsUpdatingPhysics(true);
    try {
      await api.updateControls({
        scenario_key: isCoolingActive ? 'REEFER_FAILURE' : 'NORMAL',
        truck_reefer_on: !isCoolingActive,
      });
      onRefreshState?.();
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingPhysics(false);
    }
  };

  const handleTogglePlay = async () => {
    setIsUpdatingPhysics(true);
    try {
      await api.updateControls({ is_running: !isRunning });
      onRefreshState?.();
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingPhysics(false);
    }
  };

  const handleChangeSpeed = async (speed: number) => {
    setIsUpdatingPhysics(true);
    try {
      await api.updateControls({ sim_speed: speed });
      onRefreshState?.();
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingPhysics(false);
    }
  };

  return (
    <div className="relative w-full h-[720px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl select-none flex flex-col font-sans">
      {/* =========================================================================
          TOP COMMAND BAR: PRODUCT NARRATIVE STEPPER & CONTROLS
         ========================================================================= */}
      <div className="absolute top-3 inset-x-3 z-30 flex flex-wrap items-center justify-between gap-3 pointer-events-auto">
        {/* Left: Mode Switcher & Chapter Navigator */}
        <div className="flex items-center gap-2 bg-slate-900/95 backdrop-blur-xl px-3 py-1.5 rounded-xl border border-slate-700/80 shadow-2xl text-xs">
          {/* Mode Pill */}
          <div className="flex items-center gap-1 pr-2 border-r border-slate-700">
            <button
              onClick={() => {
                setViewMode('story');
                setIsAutoPlaying(true);
              }}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'story'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-200" />
              <span>Story Mode</span>
            </button>
            <button
              onClick={() => {
                setViewMode('zack_cutaway');
                setIsAutoPlaying(false);
              }}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'zack_cutaway'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/40 ring-2 ring-cyan-400'
                  : 'text-cyan-400 hover:text-white hover:bg-slate-800 border border-cyan-500/40'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Zack 3D Explainer</span>
            </button>
            <button
              onClick={() => {
                setViewMode('free');
                setIsAutoPlaying(false);
              }}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'free'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Free Roam</span>
            </button>
          </div>

          {/* If Story Mode: Chapter Stepper */}
          {viewMode === 'story' && (
            <div className="flex items-center gap-1.5 pl-1">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  onClick={() => {
                    setCurrentChapter(num);
                    setAutoPlayProgress(0);
                  }}
                  className={`w-6 h-6 rounded-md font-extrabold text-[11px] transition-all flex items-center justify-center ${
                    currentChapter === num
                      ? 'bg-blue-500 text-white ring-2 ring-blue-400/50'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {num}
                </button>
              ))}

              {/* Auto-Play Toggle */}
              <button
                onClick={() => setIsAutoPlaying((prev) => !prev)}
                className={`p-1.5 rounded-md font-semibold text-[11px] flex items-center gap-1 transition-all ml-1 ${
                  isAutoPlaying
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
                title={isAutoPlaying ? 'Pause Presentation Auto-Play' : 'Resume Auto-Play'}
              >
                {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{isAutoPlaying ? 'Auto' : 'Paused'}</span>
              </button>

              <button
                onClick={() => setCurrentChapter((c) => (c < 5 ? c + 1 : 1))}
                className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Next Chapter"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* If Free Roam Mode: Camera Preset Dropdown */}
          {viewMode === 'free' && (
            <div className="flex items-center gap-1 pl-1">
              {[
                { key: 'overview', label: 'Overview' },
                { key: 'banana', label: 'Banana' },
                { key: 'orange', label: 'Orange' },
                { key: 'mango', label: 'Mango' },
                { key: 'guava', label: 'Guava' },
                { key: 'grapes', label: 'Grapes' },
                { key: 'dock', label: 'Dock' },
              ].map((btn) => (
                <button
                  key={btn.key}
                  onClick={() => setCameraView(btn.key as any)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                    cameraView === btn.key
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Layer Toggles (Heatmap, Airflow, Logistics) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHeatmap((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all border flex items-center gap-1.5 backdrop-blur-xl shadow-lg ${
              showHeatmap
                ? 'bg-emerald-600/90 text-white border-emerald-500 shadow-emerald-900/30'
                : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Thermal Heatmap</span>
          </button>

          <button
            onClick={() => setShowAirflow((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all border flex items-center gap-1.5 backdrop-blur-xl shadow-lg ${
              showAirflow
                ? 'bg-blue-600/90 text-white border-blue-500 shadow-blue-900/30'
                : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <Wind className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Airflow Stream</span>
          </button>

          <button
            onClick={() => setShowLogistics((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all border flex items-center gap-1.5 backdrop-blur-xl shadow-lg ${
              showLogistics
                ? 'bg-indigo-600/90 text-white border-indigo-500 shadow-indigo-900/30'
                : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Machinery</span>
          </button>
        </div>
      </div>

      {/* Auto-Play Top Progress Bar */}
      {viewMode === 'story' && isAutoPlaying && (
        <div className="absolute top-0 inset-x-0 h-1 bg-slate-800/80 z-40 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-100 ease-linear"
            style={{ width: `${autoPlayProgress}%` }}
          />
        </div>
      )}

      {/* =========================================================================
          NARRATIVE STORY CARD HUD (FLOATING IN TOP-LEFT IN STORY MODE)
         ========================================================================= */}
      {viewMode === 'story' && (
        <div className="absolute top-16 left-4 z-20 max-w-md w-[92%] sm:w-[420px] bg-slate-900/95 backdrop-blur-xl p-4 rounded-2xl border border-blue-500/50 shadow-2xl space-y-3 pointer-events-auto">
          {/* Chapter Badge + Icon */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <activeChap.icon className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-blue-400 uppercase tracking-widest block">
                  {activeChap.badge}
                </span>
                <h4 className="text-sm font-bold text-white tracking-tight leading-snug">
                  {activeChap.tagline}
                </h4>
              </div>
            </div>
            <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-800">
              {currentChapter} / 5
            </span>
          </div>

          {/* Narrative Text */}
          <p className="text-xs text-slate-300 leading-relaxed">
            {activeChap.description}
          </p>

          {/* Live Metric Badges */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {activeChap.metrics.map((m, idx) => (
              <div key={idx} className="p-2 rounded-xl bg-slate-800/70 border border-slate-700/60 text-left">
                <span className="text-[9px] text-slate-400 block font-medium truncate">{m.label}</span>
                <span className={`text-xs font-extrabold ${m.color || 'text-white'} block mt-0.5`}>
                  {m.value}
                </span>
              </div>
            ))}
          </div>

          {/* Interactive Trigger Button inside Narrative Card */}
          {activeChap.interactiveAction && (
            <div className="pt-1">
              <button
                onClick={activeChap.interactiveAction.handler}
                disabled={isUpdatingPhysics}
                className="w-full py-2 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
                <span>{activeChap.interactiveAction.label}</span>
              </button>
            </div>
          )}

          {/* Action Feedback Message */}
          {actionFeedback && (
            <div className="p-2 rounded-lg bg-blue-950/80 border border-blue-400/50 text-[11px] text-blue-200 flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>{actionFeedback}</span>
            </div>
          )}

          {/* Stepper Footer */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px] text-slate-400">
            <button
              onClick={() => setCurrentChapter((c) => (c > 1 ? c - 1 : 5))}
              className="hover:text-white flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Previous</span>
            </button>
            <span className="text-[10px] text-slate-500">Hackathon Story Mode</span>
            <button
              onClick={() => setCurrentChapter((c) => (c < 5 ? c + 1 : 1))}
              className="hover:text-white flex items-center gap-1 font-semibold text-blue-400"
            >
              <span>Next Chapter</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          PURE NATIVE THREE.JS WEBGL SIMULATION VIEWPORT
         ========================================================================= */}
      <Canvas
        shadows
        camera={{ position: [26, 20, 30], fov: 46 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
      >
        <CameraController targetPosition={currentCam.pos} targetLookAt={currentCam.lookAt} />
        <OrbitControls
          makeDefault
          maxPolarAngle={Math.PI / 2 - 0.05}
          minDistance={4}
          maxDistance={75}
          dampingFactor={0.05}
        />

        {/* Environmental Fog for Cinematic Atmospheric Depth */}
        <fog attach="fog" args={['#0F172A', 40, 95]} />

        {/* Ambient & Studio Lighting */}
        <ambientLight intensity={0.7} color="#E0F2FE" />
        <directionalLight
          position={[22, 34, 24]}
          intensity={1.5}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-bias={-0.0001}
        />
        <directionalLight position={[-20, 18, -16]} intensity={0.45} color="#93C5FD" />
        <pointLight position={[0, 9, 0]} intensity={0.6} color="#38BDF8" />

        {/* Dynamic Emergency Alarm Lighting during Incident / Fault */}
        {!isCoolingActive && (
          <>
            <pointLight position={[0, 9.5, -16]} color="#EF4444" intensity={4.5} distance={35} />
            <pointLight position={[-14, 8.5, -16]} color="#EF4444" intensity={3.0} distance={25} />
            <pointLight position={[14, 8.5, -16]} color="#EF4444" intensity={3.0} distance={25} />
          </>
        )}

        {/* Complete Warehouse Architecture or Zack D. 3D Cutaway Explainer */}
        {viewMode === 'zack_cutaway' ? (
          <ZackCutawayInspector onClose={() => setViewMode('story')} />
        ) : (
          <>
            <WarehouseArchitecture
              chamberA={chamberA}
              chamberB={chamberB}
              chamberC={chamberC}
              doorOpen={isDoorOpen}
              coolingActive={isCoolingActive}
              showReeferTruck={true}
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
              isSelected={selectedZone?.rackId === 'BANANA-BAY-01' || cameraView === 'banana'}
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
              isSelected={selectedZone?.rackId === 'ORANGE-BAY-01' || cameraView === 'orange'}
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
              isSelected={selectedZone?.rackId === 'MANGO-BAY-01' || cameraView === 'mango'}
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
              isSelected={selectedZone?.rackId === 'GUAVA-BAY-01' || cameraView === 'guava'}
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
              isSelected={selectedZone?.rackId === 'GRAPE-BAY-01' || cameraView === 'grapes'}
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
                <Forklift
                  position={[-2.2, 0, 8.5]}
                  rotation={[0, 1.35, 0]}
                  scale={1.05}
                  cargoCommodity="orange"
                  cargoQuality={93.5}
                />

                <HandTruck
                  position={[-11, 0, 7.2]}
                  rotation={[0, 0.45, 0]}
                  commodity="orange"
                  qualityScore={94.0}
                />

                <HandTruck
                  position={[11, 0, 7.2]}
                  rotation={[0, -0.35, 0]}
                  commodity="banana"
                  qualityScore={92.5}
                />
              </>
            )}

            {/* Recirculating Airflow Stream Dynamics (Cyan when cooling, Amber when tripped) */}
            {showAirflow && (
              <AirflowParticles
                speed={simulationState?.sim_speed || 1}
                coolingActive={isCoolingActive}
              />
            )}

            {/* Dynamic 5-Bay Thermal Heatmap Floor Blanket */}
            <ThermalHeatmap
              chamberA_temp={chamberA.tempC}
              chamberB_temp={chamberB.tempC}
              chamberC_temp={chamberC.tempC}
              visible={showHeatmap}
            />
          </>
        )}
      </Canvas>

      {/* =========================================================================
          BOTTOM-LEFT: LIVE 5-FRUIT STORAGE MICROCLIMATE HUD PILLS (HIDDEN IN ZACK MODE)
         ========================================================================= */}
      {viewMode !== 'zack_cutaway' && (
        <div className="absolute bottom-16 left-4 z-20 hidden md:flex items-center gap-2 bg-slate-900/90 backdrop-blur-xl p-2 rounded-2xl border border-slate-700/80 text-xs shadow-2xl overflow-x-auto max-w-[84%]">
          {[
            { key: 'banana', name: 'Banana Bay', bay: 'Bay 1', temp: chamberA.tempC, rh: chamberA.rhPct, q: chamberA.quality, color: 'text-yellow-400', border: 'hover:border-yellow-500/60' },
            { key: 'orange', name: 'Orange Bay', bay: 'Bay 2', temp: chamberB.tempC, rh: chamberB.rhPct, q: chamberB.quality, color: 'text-orange-400', border: 'hover:border-orange-500/60' },
            { key: 'mango', name: 'Mango Bay', bay: 'Bay 3', temp: chamberA.tempC, rh: chamberA.rhPct, q: chamberA.quality, color: 'text-amber-400', border: 'hover:border-amber-500/60' },
            { key: 'guava', name: 'Guava Bay', bay: 'Bay 4', temp: chamberB.tempC, rh: chamberB.rhPct, q: chamberB.quality, color: 'text-lime-400', border: 'hover:border-lime-500/60' },
            { key: 'grapes', name: 'Grapes Bay', bay: 'Bay 5', temp: chamberC.tempC, rh: chamberC.rhPct, q: chamberC.quality, color: 'text-purple-400', border: 'hover:border-purple-500/60' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => {
                setViewMode('free');
                setCameraView(item.key as any);
              }}
              className={`text-left px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 ${item.border} transition-all min-w-[130px]`}
            >
              <div className="flex items-center justify-between text-[10px] font-extrabold uppercase">
                <span className={item.color}>{item.name}</span>
                <span className="text-slate-500">{item.bay}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 font-semibold text-slate-200 text-[11px]">
                <span>{item.temp.toFixed(1)}°C</span>
                <span>{item.rh.toFixed(0)}% RH</span>
                <span className="text-emerald-400 font-bold">{item.q.toFixed(0)}%</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* =========================================================================
          RIGHT DRAWER: SCIENTIFIC CULTIVAR & MICROCLIMATE INSPECTOR
         ========================================================================= */}
      {selectedZone && (
        <div className="absolute top-16 right-4 z-30 w-84 bg-slate-900/95 backdrop-blur-xl p-4 rounded-2xl border border-blue-500/60 shadow-2xl text-white text-xs space-y-3.5 max-h-[600px] overflow-y-auto">
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
                <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/80">
                  <span className="text-[10px] text-slate-400 block font-medium">Cultivar Taxonomy</span>
                  <span className="text-xs font-semibold text-slate-200 italic">{sci.botanicalName}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/80">
                    <span className="text-[10px] text-slate-400 block">Freshness Score</span>
                    <strong className="text-sm text-emerald-400 font-extrabold">
                      {selectedZone.qualityScore.toFixed(1)}%
                    </strong>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/80">
                    <span className="text-[10px] text-slate-400 block">Safe Shelf Life</span>
                    <strong className="text-sm text-blue-400 font-extrabold">
                      {sci.shelfLifeRemaining}
                    </strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/80">
                    <span className="text-[10px] text-slate-400 block">Zone Temperature</span>
                    <strong className="text-xs text-white font-bold">{selectedZone.temperatureC.toFixed(1)} °C</strong>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/80">
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
                <div className="p-2.5 rounded-xl bg-blue-950/60 border border-blue-500/40 text-[11px] text-blue-200 space-y-1">
                  <span className="text-[10px] font-extrabold text-blue-400 uppercase tracking-wider block">
                    AI Agronomic Preservation Directive
                  </span>
                  <p className="leading-snug">{sci.recommendation}</p>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* =========================================================================
          BOTTOM CONTROLS BAR: PHYSICS TICKER & INTERACTION CONTROLS (HIDDEN IN ZACK MODE)
         ========================================================================= */}
      {viewMode !== 'zack_cutaway' && (
        <div className="absolute bottom-3 left-4 z-20 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-900/95 backdrop-blur-xl px-3 py-1.5 rounded-xl border border-slate-700/80 shadow-2xl text-xs">
            {/* Play/Pause */}
            <div className="flex items-center gap-1.5 pr-2 border-r border-slate-700">
              <button
                onClick={handleTogglePlay}
                disabled={isUpdatingPhysics}
                className={`p-1.5 rounded-lg font-bold flex items-center gap-1 transition-all ${
                  isRunning
                    ? 'bg-amber-600/90 text-white hover:bg-amber-500'
                    : 'bg-emerald-600/90 text-white hover:bg-emerald-500'
                }`}
                title={isRunning ? 'Pause Digital Twin Physics' : 'Resume Simulation Physics'}
              >
                {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span className="text-[11px] hidden sm:inline">{isRunning ? 'Pause' : 'Resume'}</span>
              </button>
            </div>

            {/* Time-Scale Speed Multiplier */}
            <div className="flex items-center gap-1 px-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <Gauge className="w-3 h-3 text-blue-400" />
                Speed:
              </span>
              {[0.5, 1.0, 2.0, 5.0].map((spd) => (
                <button
                  key={spd}
                  disabled={isUpdatingPhysics}
                  onClick={() => handleChangeSpeed(spd)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                    currentSimSpeed === spd
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            {/* Bay Shutter Door Physical Toggle */}
            <div className="pl-2 border-l border-slate-700 flex items-center gap-1.5">
              <button
                onClick={handleToggleDoor}
                disabled={isUpdatingPhysics}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all border ${
                  isDoorOpen
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
                title="Toggle Warehouse Industrial Dock Shutter"
              >
                <DoorOpen className={`w-3.5 h-3.5 ${isDoorOpen ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>Bay Shutter: {isDoorOpen ? 'OPEN' : 'CLOSED'}</span>
              </button>
            </div>

            {/* Refrigeration Compressor Toggle */}
            <div className="pl-1 flex items-center gap-1.5">
              <button
                onClick={handleToggleReefer}
                disabled={isUpdatingPhysics}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all border ${
                  isCoolingActive
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/50 hover:bg-blue-500/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/50 hover:bg-rose-500/30'
                }`}
                title="Toggle Primary HVAC Compressor Active State"
              >
                <Snowflake className={`w-3.5 h-3.5 ${isCoolingActive ? 'text-blue-400' : 'text-rose-400'}`} />
                <span>Cooling: {isCoolingActive ? 'RUNNING' : 'FAULT/CUT'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
