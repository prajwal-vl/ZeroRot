import React, { useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { ProduceModel } from './ProduceModel';
import {
  Truck,
  AlertTriangle,
  Play,
  RotateCcw,
  Zap,
  Clock,
  Thermometer,
  ShieldAlert,
  Flame,
  CheckCircle2
} from 'lucide-react';
import { SimulationState } from '../../types/simulation';

interface ReeferTruckCanvasProps {
  simulationState: SimulationState | null;
  onRefreshState?: () => void;
}

// 3D Truck Model Component
function TruckModel({
  isCompressorActive,
  qualityScore,
  cargoTemp,
}: {
  isCompressorActive: boolean;
  qualityScore: number;
  cargoTemp: number;
}) {
  const fanRef = useRef<THREE.Group>(null!);

  useFrame((_, delta) => {
    if (fanRef.current && isCompressorActive) {
      fanRef.current.rotation.z += delta * 15;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* 1. Semi-Truck Tractor Cabin */}
      <group position={[5.2, 1.4, 0]}>
        {/* Main Cab Box */}
        <mesh position={[0, 0.4, 0]}>
          <boxGeometry args={[2.8, 2.2, 2.2]} />
          <meshStandardMaterial color="#1E3A8A" roughness={0.3} metalness={0.6} />
        </mesh>
        {/* Aerodynamic Wind Deflector Roof */}
        <mesh position={[-0.4, 1.7, 0]} rotation={[0, 0, -0.3]}>
          <boxGeometry args={[1.8, 0.5, 2.1]} />
          <meshStandardMaterial color="#2563EB" roughness={0.3} metalness={0.5} />
        </mesh>
        {/* Windshield Glass */}
        <mesh position={[1.41, 0.6, 0]}>
          <planeGeometry args={[0.01, 1.1]} />
          <meshPhysicalMaterial color="#93C5FD" transparent opacity={0.6} roughness={0.1} transmission={0.9} />
        </mesh>
        {/* Front Grille */}
        <mesh position={[1.42, -0.2, 0]}>
          <boxGeometry args={[0.05, 0.8, 1.8]} />
          <meshStandardMaterial color="#E2E8F0" roughness={0.2} metalness={0.9} />
        </mesh>
        {/* Front Wheels */}
        {[-1.15, 1.15].map((z, idx) => (
          <mesh key={`fw-${idx}`} position={[0.6, -0.7, z]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.55, 0.55, 0.35, 20]} />
            <meshStandardMaterial color="#1E293B" roughness={0.9} />
          </mesh>
        ))}
      </group>

      {/* 2. Insulated Refrigerated Trailer (Semi-Cutaway) */}
      <group position={[-1.8, 2.2, 0]}>
        {/* Outer White Insulated Trailer Body */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[10.5, 3.4, 2.4]} />
          <meshPhysicalMaterial
            color="#FFFFFF"
            roughness={0.2}
            metalness={0.1}
            transparent
            opacity={0.35} // Transparent to reveal internal produce crates
          />
        </mesh>

        {/* Solid Chassis Base */}
        <mesh position={[0, -1.75, 0]}>
          <boxGeometry args={[10.6, 0.15, 2.45]} />
          <meshStandardMaterial color="#334155" roughness={0.6} metalness={0.7} />
        </mesh>

        {/* Dual Rear Wheels */}
        {[-3.4, -2.1].map((x, xIdx) =>
          [-1.25, 1.25].map((z, zIdx) => (
            <mesh key={`rw-${xIdx}-${zIdx}`} position={[x, -2.1, z]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.55, 0.55, 0.35, 20]} />
              <meshStandardMaterial color="#1E293B" roughness={0.9} />
            </mesh>
          ))
        )}

        {/* 3. Front Reefer Condenser Unit */}
        <group position={[5.35, 0.4, 0]}>
          <mesh>
            <boxGeometry args={[0.6, 2.2, 1.9]} />
            <meshStandardMaterial
              color={isCompressorActive ? '#0284C7' : '#EF4444'}
              roughness={0.4}
              metalness={0.5}
            />
          </mesh>
          {/* Spinning Fan Grille */}
          <group ref={fanRef} position={[0.31, 0.3, 0]}>
            <mesh>
              <circleGeometry args={[0.45, 16]} />
              <meshBasicMaterial color="#0F172A" />
            </mesh>
            {/* Fan Blades */}
            {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((rot, idx) => (
              <mesh key={`blade-${idx}`} rotation={[0, 0, rot]}>
                <boxGeometry args={[0.12, 0.75, 0.02]} />
                <meshStandardMaterial color="#94A3B8" />
              </mesh>
            ))}
          </group>
          {/* Status Indicator Beacon */}
          <mesh position={[0, 1.15, 0]}>
            <sphereGeometry args={[0.1, 12, 12]} />
            <meshBasicMaterial color={isCompressorActive ? '#22C55E' : '#EF4444'} />
          </mesh>
        </group>

        {/* 4. Inside Cargo: 4 Stacks of Produce Crates with Spoilage */}
        {[-3.6, -1.2, 1.2, 3.6].map((crateX, idx) => (
          <group key={`cstack-${idx}`} position={[crateX, -0.9, 0]}>
            {/* Pallet */}
            <mesh position={[0, -0.45, 0]}>
              <boxGeometry args={[1.5, 0.12, 1.8]} />
              <meshStandardMaterial color="#B45309" roughness={0.9} />
            </mesh>
            {/* Lower Tier Crates */}
            <mesh position={[0, -0.1, 0]}>
              <boxGeometry args={[1.4, 0.5, 1.7]} />
              <meshStandardMaterial color="#1E40AF" roughness={0.3} />
            </mesh>
            <ProduceModel
              commodity={idx % 2 === 0 ? 'tomato' : 'mango'}
              qualityScore={qualityScore}
              position={[0, 0.2, 0]}
              scale={1.1}
            />
            {/* Upper Tier Crates */}
            <mesh position={[0, 0.65, 0]}>
              <boxGeometry args={[1.4, 0.5, 1.7]} />
              <meshStandardMaterial color="#047857" roughness={0.3} />
            </mesh>
            <ProduceModel
              commodity={idx % 2 === 0 ? 'tomato' : 'mango'}
              qualityScore={qualityScore}
              position={[0, 0.95, 0]}
              scale={1.1}
            />
          </group>
        ))}
      </group>
    </group>
  );
}

// Animated Highway Road with Moving Dashed Lines
function HighwayRoad() {
  const roadRef = useRef<THREE.Group>(null!);

  useFrame((_, delta) => {
    if (roadRef.current) {
      roadRef.current.position.x -= delta * 18;
      if (roadRef.current.position.x < -15) {
        roadRef.current.position.x = 15;
      }
    }
  });

  return (
    <group position={[0, -0.05, 0]}>
      {/* Asphalt Surface */}
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[70, 14]} />
        <meshStandardMaterial color="#1E293B" roughness={0.8} />
      </mesh>
      {/* Moving Center Dashed Lines */}
      <group ref={roadRef}>
        {[-30, -20, -10, 0, 10, 20, 30].map((x, i) => (
          <mesh key={i} position={[x, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[4.5, 0.25]} />
            <meshBasicMaterial color="#FACC15" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export const ReeferTruckCanvas: React.FC<ReeferTruckCanvasProps> = ({
  simulationState,
  onRefreshState,
}) => {
  const [compressorActive, setCompressorActive] = useState<boolean>(true);
  const [simulatedTemp, setSimulatedTemp] = useState<number>(4.2);
  const [simulatedQuality, setSimulatedQuality] = useState<number>(94.0);
  const [activeFault, setActiveFault] = useState<string | null>(null);

  const handleTriggerFault = (type: 'compressor' | 'heatwave' | 'delay') => {
    setActiveFault(type);
    if (type === 'compressor') {
      setCompressorActive(false);
      setSimulatedTemp(28.4);
      setSimulatedQuality(58.5);
    } else if (type === 'heatwave') {
      setSimulatedTemp(18.2);
      setSimulatedQuality(76.0);
    } else if (type === 'delay') {
      setSimulatedQuality(81.0);
    }
  };

  const handleResetFault = () => {
    setActiveFault(null);
    setCompressorActive(true);
    setSimulatedTemp(4.2);
    setSimulatedQuality(94.0);
  };

  return (
    <div className="space-y-4">
      {/* 3D Canvas Box */}
      <div className="relative w-full h-[520px] bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-md">
        <Canvas camera={{ position: [11, 6, 12], fov: 44 }} shadows>
          <OrbitControls
            makeDefault
            maxPolarAngle={Math.PI / 2 - 0.05}
            minDistance={6}
            maxDistance={35}
            dampingFactor={0.05}
          />
          <ambientLight intensity={0.7} color="#F1F5F9" />
          <directionalLight position={[12, 18, 14]} intensity={1.3} castShadow />

          {/* 3D Moving Highway */}
          <HighwayRoad />

          {/* 3D Reefer Truck with Produce Crates */}
          <TruckModel
            isCompressorActive={compressorActive}
            qualityScore={simulatedQuality}
            cargoTemp={simulatedTemp}
          />
        </Canvas>

        {/* Top-Left: Live En-Route Status HUD */}
        <div className="absolute top-4 left-4 z-20 bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-700 text-xs text-white space-y-2 shadow-lg">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                compressorActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500 animate-ping'
              }`}
            />
            <span className="font-bold uppercase tracking-wider text-[11px]">
              {compressorActive ? 'Reefer Unit Active' : 'CRITICAL REEFER FAILURE'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-300">
            <span>Cargo Bay Temp:</span>
            <strong className={`font-black ${simulatedTemp > 12 ? 'text-red-400' : 'text-emerald-400'}`}>
              {simulatedTemp.toFixed(1)} °C
            </strong>

            <span>Produce Quality:</span>
            <strong className={`font-black ${simulatedQuality < 70 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {simulatedQuality.toFixed(1)} %
            </strong>

            <span>Transit Speed:</span>
            <strong className="text-white">65 km/h</strong>

            <span>Route Target:</span>
            <strong className="text-blue-400">Kolar APMC Mandi</strong>
          </div>
        </div>

        {/* Top-Right: Failure Injection Toolbar */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
          <div className="bg-slate-900/90 backdrop-blur-md p-2 rounded-xl border border-slate-700 text-xs space-y-1.5 shadow-md">
            <span className="text-[10px] text-slate-400 uppercase font-bold block px-1">
              Simulate Transit Fault:
            </span>
            <button
              onClick={() => handleTriggerFault('compressor')}
              className={`w-full px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
                activeFault === 'compressor'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span>Compressor Breakdown</span>
            </button>
            <button
              onClick={() => handleTriggerFault('heatwave')}
              className={`w-full px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
                activeFault === 'heatwave'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Heatwave Spike (+38°C)</span>
            </button>
            <button
              onClick={handleResetFault}
              className="w-full px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore Optimal Transit</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

