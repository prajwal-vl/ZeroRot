import React, { useState, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
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
  CheckCircle2,
  Building2,
  Warehouse,
  ShoppingBag,
  TrendingUp,
  Activity,
  Layers,
  ArrowRight
} from 'lucide-react';

export interface NetworkNodeState {
  node_id: string;
  name: string;
  stage_number: number;
  stage_name: string;
  city: string;
  facility_type: string;
  capacity_tonnes: number;
  current_inventory_tonnes: number;
  storage_temp_c: number;
  storage_rh_pct: number;
  health_status: 'NORMAL' | 'DEGRADED' | 'FAILED' | 'CONGESTED';
  disruptions: string[];
}

interface SupplyChainNetworkCanvasProps {
  nodes?: NetworkNodeState[];
  activeDisruption?: string | null;
  onInjectDisruption?: (key: string) => void;
  onSelectNode?: (nodeId: string) => void;
}

const DEFAULT_NODES: NetworkNodeState[] = [
  {
    node_id: 'NODE_FARM',
    name: 'Khed Farm Gate',
    stage_number: 1,
    stage_name: 'Farm Origin',
    city: 'Khed, Pune',
    facility_type: 'FARM',
    capacity_tonnes: 50.0,
    current_inventory_tonnes: 15.0,
    storage_temp_c: 28.0,
    storage_rh_pct: 60.0,
    health_status: 'NORMAL',
    disruptions: []
  },
  {
    node_id: 'NODE_COLL',
    name: 'Manchar Aggregation Center',
    stage_number: 2,
    stage_name: 'Collection Center',
    city: 'Manchar',
    facility_type: 'COLLECTION',
    capacity_tonnes: 80.0,
    current_inventory_tonnes: 24.5,
    storage_temp_c: 24.0,
    storage_rh_pct: 65.0,
    health_status: 'NORMAL',
    disruptions: []
  },
  {
    node_id: 'NODE_COOL',
    name: 'Narayangaon Pre-Cooling Hub',
    stage_number: 3,
    stage_name: 'Pre-Cooling & Grading',
    city: 'Narayangaon',
    facility_type: 'PRECOOLING',
    capacity_tonnes: 120.0,
    current_inventory_tonnes: 42.0,
    storage_temp_c: 3.5,
    storage_rh_pct: 92.0,
    health_status: 'NORMAL',
    disruptions: []
  },
  {
    node_id: 'NODE_HUB',
    name: 'Chakan Mega Cold Storage Hub',
    stage_number: 4,
    stage_name: 'Cold Storage Hub',
    city: 'Chakan',
    facility_type: 'COLD_HUB',
    capacity_tonnes: 500.0,
    current_inventory_tonnes: 310.0,
    storage_temp_c: 4.0,
    storage_rh_pct: 90.0,
    health_status: 'NORMAL',
    disruptions: []
  },
  {
    node_id: 'NODE_TRANSIT',
    name: 'NH48 Reefer Logistics Corridor',
    stage_number: 5,
    stage_name: 'Reefer Transit Corridor',
    city: 'NH48 Expressway',
    facility_type: 'TRANSIT',
    capacity_tonnes: 100.0,
    current_inventory_tonnes: 32.0,
    storage_temp_c: 4.5,
    storage_rh_pct: 85.0,
    health_status: 'NORMAL',
    disruptions: []
  },
  {
    node_id: 'NODE_RDC',
    name: 'Vashi Cross-Docking Terminal',
    stage_number: 6,
    stage_name: 'Regional Distribution Center',
    city: 'Navi Mumbai',
    facility_type: 'DISTRIBUTION',
    capacity_tonnes: 250.0,
    current_inventory_tonnes: 140.0,
    storage_temp_c: 6.0,
    storage_rh_pct: 85.0,
    health_status: 'NORMAL',
    disruptions: []
  },
  {
    node_id: 'NODE_MANDI',
    name: 'APMC Central Auction Terminal',
    stage_number: 7,
    stage_name: 'Mandi / Retail Destination',
    city: 'Vashi APMC',
    facility_type: 'MANDI',
    capacity_tonnes: 800.0,
    current_inventory_tonnes: 480.0,
    storage_temp_c: 22.0,
    storage_rh_pct: 60.0,
    health_status: 'NORMAL',
    disruptions: []
  }
];

// Node 3D positions across the logistics corridor
const NODE_POSITIONS: Record<string, [number, number, number]> = {
  NODE_FARM: [-15, 0, -2],
  NODE_COLL: [-10, 0, 2],
  NODE_COOL: [-5, 0, -2],
  NODE_HUB: [0, 0, 2],
  NODE_TRANSIT: [5, 0, -2],
  NODE_RDC: [10, 0, 2],
  NODE_MANDI: [15, 0, -2]
};

// 3D Facility Building Model
function FacilityNode3D({
  node,
  isSelected,
  onClick
}: {
  node: NetworkNodeState;
  isSelected: boolean;
  onClick: () => void;
}) {
  const pos = NODE_POSITIONS[node.node_id] || [0, 0, 0];
  const beaconRef = useRef<THREE.Mesh>(null!);

  useFrame((_, delta) => {
    if (beaconRef.current) {
      beaconRef.current.rotation.y += delta * 2;
    }
  });

  const statusColor = useMemo(() => {
    switch (node.health_status) {
      case 'NORMAL':
        return '#2563EB'; // SaaS Blue
      case 'DEGRADED':
        return '#D97706'; // Amber Warning
      case 'FAILED':
      case 'CONGESTED':
        return '#DC2626'; // Red Alert
      default:
        return '#2563EB';
    }
  }, [node.health_status]);

  return (
    <group position={pos} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      {/* Ground Pedestal / Foundation */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[2.0, 2.2, 0.2, 32]} />
        <meshStandardMaterial
          color={isSelected ? '#1E40AF' : '#F1F5F9'}
          metalness={0.2}
          roughness={0.8}
        />
      </mesh>

      {/* Stage Number Ring */}
      <mesh position={[0, 0.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.7, 1.9, 32]} />
        <meshBasicMaterial color={statusColor} />
      </mesh>

      {/* Facility Architecture Building */}
      {node.stage_number === 1 && (
        // Farm Greenhouse / Packhouse
        <group position={[0, 0.8, 0]}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[1.8, 1.2, 1.8]} />
            <meshStandardMaterial color="#059669" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.9, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[1.4, 0.8, 4]} />
            <meshStandardMaterial color="#10B981" roughness={0.4} />
          </mesh>
        </group>
      )}

      {node.stage_number === 2 && (
        // Collection Center Shed
        <group position={[0, 0.9, 0]}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[2.2, 1.4, 1.6]} />
            <meshStandardMaterial color="#0284C7" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.8, 0]}>
            <boxGeometry args={[2.4, 0.2, 1.8]} />
            <meshStandardMaterial color="#38BDF8" roughness={0.3} metalness={0.5} />
          </mesh>
        </group>
      )}

      {node.stage_number === 3 && (
        // Pre-Cooling Unit
        <group position={[0, 1.0, 0]}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[2.0, 1.6, 2.0]} />
            <meshStandardMaterial color="#2563EB" roughness={0.3} metalness={0.6} />
          </mesh>
          {/* Chiller Evaporator Grille */}
          <mesh position={[0, 0.9, 0]}>
            <cylinderGeometry args={[0.6, 0.6, 0.3, 16]} />
            <meshStandardMaterial color="#93C5FD" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      )}

      {node.stage_number === 4 && (
        // Mega Cold Hub (Multi-Chamber Warehouse)
        <group position={[0, 1.3, 0]}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[2.8, 2.2, 2.4]} />
            <meshStandardMaterial color="#1E3A8A" roughness={0.4} metalness={0.5} />
          </mesh>
          {/* Chamber A / B / C Rooftop HVAC Chiller Pods */}
          <mesh position={[-0.8, 1.25, 0]}>
            <boxGeometry args={[0.6, 0.3, 0.8]} />
            <meshStandardMaterial color="#60A5FA" />
          </mesh>
          <mesh position={[0.8, 1.25, 0]}>
            <boxGeometry args={[0.6, 0.3, 0.8]} />
            <meshStandardMaterial color="#60A5FA" />
          </mesh>
        </group>
      )}

      {node.stage_number === 5 && (
        // Expressway Reefer Corridor
        <group position={[0, 0.5, 0]}>
          {/* Asphalt Strip */}
          <mesh position={[0, -0.2, 0]}>
            <boxGeometry args={[3.2, 0.1, 1.6]} />
            <meshStandardMaterial color="#334155" roughness={0.9} />
          </mesh>
          {/* Miniature Reefer Truck in Transit */}
          <mesh position={[0, 0.4, 0]}>
            <boxGeometry args={[1.8, 0.9, 0.8]} />
            <meshStandardMaterial color="#2563EB" metalness={0.5} roughness={0.3} />
          </mesh>
        </group>
      )}

      {node.stage_number === 6 && (
        // Distribution Center (Cross-docking bays)
        <group position={[0, 1.1, 0]}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[2.6, 1.8, 2.2]} />
            <meshStandardMaterial color="#0369A1" roughness={0.4} />
          </mesh>
          {/* Docking Shutters */}
          <mesh position={[0, -0.4, 1.11]}>
            <planeGeometry args={[1.6, 0.8]} />
            <meshStandardMaterial color="#94A3B8" metalness={0.8} />
          </mesh>
        </group>
      )}

      {node.stage_number === 7 && (
        // APMC Mandi Auction Terminal
        <group position={[0, 1.2, 0]}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[3.0, 1.8, 2.6]} />
            <meshStandardMaterial color="#1E293B" roughness={0.5} />
          </mesh>
          {/* Covered Arch Canopy */}
          <mesh position={[0, 1.1, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[1.6, 1.6, 3.1, 16, 1, false, 0, Math.PI]} />
            <meshStandardMaterial color="#2563EB" roughness={0.3} metalness={0.4} />
          </mesh>
        </group>
      )}

      {/* Floating Status Beacon Pulsing Orb */}
      <mesh ref={beaconRef} position={[0, 3.2, 0]}>
        <octahedronGeometry args={[0.25, 0]} />
        <meshStandardMaterial
          color={statusColor}
          emissive={statusColor}
          emissiveIntensity={0.8}
        />
      </mesh>

      {/* 3D Label & Microclimate HUD */}
      <Html position={[0, 4.0, 0]} center distanceFactor={18}>
        <div
          className={`px-2.5 py-1.5 rounded-lg shadow-md border text-center transition-all cursor-pointer pointer-events-auto select-none ${
            isSelected
              ? 'bg-blue-600 border-blue-400 text-white ring-2 ring-blue-300'
              : 'bg-white/95 border-slate-200 text-slate-800 backdrop-blur-xs'
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Stage {node.stage_number}
          </div>
          <div className="text-xs font-semibold whitespace-nowrap">
            {node.stage_name}
          </div>
          <div className="flex items-center justify-center gap-2 mt-0.5 text-[10px]">
            <span className="font-mono font-medium">
              {node.storage_temp_c.toFixed(1)}°C
            </span>
            <span className="text-slate-300">|</span>
            <span className="font-mono font-medium">
              {node.storage_rh_pct.toFixed(0)}% RH
            </span>
          </div>
        </div>
      </Html>
    </group>
  );
}

// Connecting Transit Pipelines & Moving Cargo Particles
function TransportLinkPath({
  fromId,
  toId,
  isDisrupted
}: {
  fromId: string;
  toId: string;
  isDisrupted: boolean;
}) {
  const p1 = NODE_POSITIONS[fromId] || [-15, 0, 0];
  const p2 = NODE_POSITIONS[toId] || [15, 0, 0];

  const curve = useMemo(() => {
    const v1 = new THREE.Vector3(p1[0], 0.2, p1[2]);
    const v2 = new THREE.Vector3(p2[0], 0.2, p2[2]);
    const midX = (v1.x + v2.x) / 2;
    const midZ = (v1.z + v2.z) / 2;
    const midY = 1.2;
    const vMid = new THREE.Vector3(midX, midY, midZ);
    return new THREE.QuadraticBezierCurve3(v1, vMid, v2);
  }, [p1, p2]);

  const points = useMemo(() => curve.getPoints(30), [curve]);
  const lineGeo = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);

  const particleRef = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (particleRef.current) {
      const t = (clock.getElapsedTime() * 0.2) % 1.0;
      const pt = curve.getPoint(t);
      particleRef.current.position.set(pt.x, pt.y, pt.z);
    }
  });

  return (
    <group>
      {/* Curved Highway Pipe Line */}
      <primitive object={new THREE.Line(lineGeo, new THREE.LineBasicMaterial({
        color: isDisrupted ? '#DC2626' : '#93C5FD',
        linewidth: 2,
        transparent: true,
        opacity: 0.75
      }))} />

      {/* Moving Logistics Flow Bead */}
      <mesh ref={particleRef}>
        <sphereGeometry args={[0.15, 12, 12]} />
        <meshBasicMaterial color={isDisrupted ? '#EF4444' : '#2563EB'} />
      </mesh>
    </group>
  );
}

export const SupplyChainNetworkCanvas: React.FC<SupplyChainNetworkCanvasProps> = ({
  nodes = DEFAULT_NODES,
  activeDisruption = null,
  onInjectDisruption,
  onSelectNode
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>('NODE_HUB');

  const selectedNode = useMemo(
    () => nodes.find((n) => n.node_id === selectedNodeId) || nodes[3],
    [nodes, selectedNodeId]
  );

  const handleSelect = (id: string) => {
    setSelectedNodeId(id);
    if (onSelectNode) onSelectNode(id);
  };

  return (
    <div className="relative w-full h-[620px] bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-sm">
      {/* 3D WebGL Canvas */}
      <Canvas camera={{ position: [0, 16, 22], fov: 42 }}>
        <color attach="background" args={['#0F172A']} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 20, 15]} intensity={1.2} />
        <directionalLight position={[-10, 10, -10]} intensity={0.5} />

        {/* Ground Logistics Terrain Grid */}
        <gridHelper args={[40, 40, '#1E293B', '#1E293B']} position={[0, -0.05, 0]} />

        {/* 7 Facility Nodes */}
        {nodes.map((node) => (
          <FacilityNode3D
            key={node.node_id}
            node={node}
            isSelected={selectedNodeId === node.node_id}
            onClick={() => handleSelect(node.node_id)}
          />
        ))}

        {/* Connecting Transport Links */}
        <TransportLinkPath fromId="NODE_FARM" toId="NODE_COLL" isDisrupted={false} />
        <TransportLinkPath fromId="NODE_COLL" toId="NODE_COOL" isDisrupted={false} />
        <TransportLinkPath fromId="NODE_COOL" toId="NODE_HUB" isDisrupted={false} />
        <TransportLinkPath fromId="NODE_HUB" toId="NODE_TRANSIT" isDisrupted={false} />
        <TransportLinkPath
          fromId="NODE_TRANSIT"
          toId="NODE_RDC"
          isDisrupted={activeDisruption === 'HEATWAVE_TRANSIT_DELAY'}
        />
        <TransportLinkPath fromId="NODE_RDC" toId="NODE_MANDI" isDisrupted={false} />

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          maxPolarAngle={Math.PI / 2.1}
          minDistance={10}
          maxDistance={35}
        />
      </Canvas>

      {/* Top Banner: Scenario Controls HUD */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        <div className="bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-lg border border-slate-800 shadow-lg pointer-events-auto flex items-center gap-2.5">
          <Layers className="w-4 h-4 text-blue-400" />
          <div>
            <div className="text-xs font-bold text-white uppercase tracking-wider">
              ISOMORPH 7-Stage Agri-Logistics Digital Twin
            </div>
            <div className="text-[11px] text-slate-400">
              Interactive Network Graph & Cascading Disruption Simulator
            </div>
          </div>
        </div>

        {/* Disruption Injection Bar */}
        <div className="bg-slate-900/90 backdrop-blur-md p-1.5 rounded-lg border border-slate-800 shadow-lg pointer-events-auto flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
            Disruption Simulator:
          </span>
          <button
            onClick={() => onInjectDisruption && onInjectDisruption('HEATWAVE_TRANSIT_DELAY')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
              activeDisruption === 'HEATWAVE_TRANSIT_DELAY'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Heatwave Delay (NH48)
          </button>
          <button
            onClick={() => onInjectDisruption && onInjectDisruption('COLD_HUB_POWER_OUTAGE')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
              activeDisruption === 'COLD_HUB_POWER_OUTAGE'
                ? 'bg-red-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Cold Hub Blackout
          </button>
          <button
            onClick={() => onInjectDisruption && onInjectDisruption('ETHYLENE_CROSS_CONTAMINATION')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
              activeDisruption === 'ETHYLENE_CROSS_CONTAMINATION'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Ethylene Cross-Exposure
          </button>
          <button
            onClick={() => onInjectDisruption && onInjectDisruption('RESET_NORMAL')}
            className="px-2.5 py-1 rounded text-xs font-medium bg-slate-800 text-emerald-400 hover:bg-slate-700 transition-all flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Reset Baseline
          </button>
        </div>
      </div>

      {/* Bottom Floating Card: Selected Stage Details */}
      {selectedNode && (
        <div className="absolute bottom-3 left-3 w-96 bg-slate-900/95 backdrop-blur-md p-4 rounded-xl border border-slate-800 shadow-xl pointer-events-auto text-white">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <div>
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                Stage {selectedNode.stage_number} of 7
              </span>
              <h3 className="text-sm font-bold text-white">{selectedNode.name}</h3>
              <p className="text-[11px] text-slate-400">{selectedNode.city}</p>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                selectedNode.health_status === 'NORMAL'
                  ? 'bg-blue-900/60 text-blue-300 border border-blue-700'
                  : 'bg-red-900/60 text-red-300 border border-red-700'
              }`}
            >
              {selectedNode.health_status}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 py-2 text-center">
            <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/50">
              <div className="text-[10px] text-slate-400">Microclimate</div>
              <div className="text-sm font-bold font-mono text-blue-400">
                {selectedNode.storage_temp_c.toFixed(1)}°C
              </div>
              <div className="text-[10px] text-slate-400">
                {selectedNode.storage_rh_pct.toFixed(0)}% RH
              </div>
            </div>

            <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/50">
              <div className="text-[10px] text-slate-400">Capacity</div>
              <div className="text-sm font-bold font-mono text-emerald-400">
                {selectedNode.current_inventory_tonnes.toFixed(1)} T
              </div>
              <div className="text-[10px] text-slate-400">
                of {selectedNode.capacity_tonnes.toFixed(0)} T
              </div>
            </div>

            <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/50">
              <div className="text-[10px] text-slate-400">Utilization</div>
              <div className="text-sm font-bold font-mono text-purple-400">
                {((selectedNode.current_inventory_tonnes / selectedNode.capacity_tonnes) * 100).toFixed(0)}%
              </div>
              <div className="text-[10px] text-slate-400">Occupancy</div>
            </div>
          </div>

          {selectedNode.disruptions && selectedNode.disruptions.length > 0 && (
            <div className="mt-2 p-2 bg-red-950/60 border border-red-800/60 rounded-lg text-xs text-red-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Active Disruption:</span>{' '}
                {selectedNode.disruptions.join(', ')}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
