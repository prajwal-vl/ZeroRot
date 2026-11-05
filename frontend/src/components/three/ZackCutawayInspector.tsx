import React, { useState, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  Flame,
  Wind,
  Activity,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Zap,
  Info,
  CheckCircle2,
  ChevronRight,
  Eye,
  Sliders
} from 'lucide-react';

interface ZackCutawayInspectorProps {
  initialCommodity?: 'banana' | 'mango' | 'tomato' | 'orange' | 'grapes';
  onClose?: () => void;
}

// ----------------- FLOATING ETHYLENE & GAS PARTICLES -----------------
function GasMolecules({ intensity, color = '#C084FC' }: { intensity: number; color?: string }) {
  const pointsRef = useRef<THREE.Points>(null!);
  const count = 120;

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Emanate from around the fruit center
      pos[i * 3] = (Math.random() - 0.5) * 0.8;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 0.8;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.8;

      vel[i * 3] = (Math.random() - 0.5) * 0.015;
      vel[i * 3 + 1] = 0.01 + Math.random() * 0.025; // rising gas
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.015;
    }
    return { positions: pos, velocities: vel };
  }, [count]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const geom = pointsRef.current.geometry;
    const posArr = geom.attributes.position.array as Float32Array;
    const speed = delta * (1.0 + intensity * 2.5);

    for (let i = 0; i < count; i++) {
      posArr[i * 3] += velocities[i * 3] * speed;
      posArr[i * 3 + 1] += velocities[i * 3 + 1] * speed;
      posArr[i * 3 + 2] += velocities[i * 3 + 2] * speed;

      // Loop back to fruit surface if dissipated
      if (posArr[i * 3 + 1] > 2.0 || Math.abs(posArr[i * 3]) > 1.8) {
        posArr[i * 3] = (Math.random() - 0.5) * 0.6;
        posArr[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
        posArr[i * 3 + 2] = (Math.random() - 0.5) * 0.6;
      }
    }
    geom.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        color={color}
        transparent
        opacity={Math.min(0.9, 0.2 + intensity * 0.7)}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// ----------------- THERMAL CONDUCTION WAVE RINGS -----------------
function ThermalWaveRings({ active }: { active: boolean }) {
  const ring1 = useRef<THREE.Mesh>(null!);
  const ring2 = useRef<THREE.Mesh>(null!);
  const ring3 = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    if (!active) return;
    const t = clock.getElapsedTime() * 1.8;
    if (ring1.current) {
      const s1 = 1.0 + Math.sin(t) * 0.15;
      ring1.current.scale.set(s1, s1, s1);
    }
    if (ring2.current) {
      const s2 = 1.0 + Math.sin(t + 1.2) * 0.15;
      ring2.current.scale.set(s2, s2, s2);
    }
    if (ring3.current) {
      const s3 = 1.0 + Math.sin(t + 2.4) * 0.15;
      ring3.current.scale.set(s3, s3, s3);
    }
  });

  if (!active) return null;

  return (
    <group position={[0, 0, 0]}>
      <mesh ref={ring1} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.75, 0.78, 36]} />
        <meshBasicMaterial color="#F97316" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ring2} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.58, 36]} />
        <meshBasicMaterial color="#FBBF24" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ring3} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.35, 0.38, 36]} />
        <meshBasicMaterial color="#38BDF8" transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ----------------- ANATOMICAL CUTAWAY MESHES -----------------

// 1. BANANA CUTAWAY: Half peel sliced open revealing creamy pulp & central vascular core
function BananaCutaway({ rotFactor }: { rotFactor: number }) {
  // rotFactor: 0.0 (fresh) -> 1.0 (rotten)
  const pulpColor = useMemo(() => {
    const freshPulp = new THREE.Color('#FEF9C3'); // Creamy pale yellow
    const rotPulp = new THREE.Color('#3B1A10');   // Dark oxidized brown
    return new THREE.Color().lerpColors(freshPulp, rotPulp, Math.pow(rotFactor, 0.65));
  }, [rotFactor]);

  const peelColor = useMemo(() => {
    const freshPeel = new THREE.Color('#FACC15'); // Bright golden banana yellow
    const rotPeel = new THREE.Color('#1C1917');   // Black necrotic banana peel
    return new THREE.Color().lerpColors(freshPeel, rotPeel, Math.pow(rotFactor, 0.8));
  }, [rotFactor]);

  return (
    <group position={[0, 0, 0]} rotation={[0.2, 0.4, 0]}>
      {/* Intact Outer Peel Shell (Back & Left half) */}
      <mesh position={[-0.12, 0, -0.05]} rotation={[0, 0, 0.15]}>
        <cylinderGeometry args={[0.32, 0.28, 1.8, 16, 1, false, 0, Math.PI * 1.2]} />
        <meshStandardMaterial
          color={peelColor}
          roughness={THREE.MathUtils.lerp(0.35, 0.85, rotFactor)}
          metalness={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Peeled-Back Flap (Zack D. Style Dynamic Peel Section) */}
      <mesh position={[0.28, 0.3, 0.15]} rotation={[0.4, -0.6, -0.8]}>
        <planeGeometry args={[0.38, 0.9]} />
        <meshStandardMaterial color={peelColor} roughness={0.4} side={THREE.DoubleSide} />
      </mesh>

      {/* Sliced Internal Pulp (Visible in cross-section) */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.26, 0.23, 1.7, 24, 1, false, 0, Math.PI * 2]} />
        <meshStandardMaterial
          color={pulpColor}
          roughness={THREE.MathUtils.lerp(0.2, 0.9, rotFactor)}
          metalness={0.02}
        />
      </mesh>

      {/* Central Vascular Fiber Core (Pith line) */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.035, 1.72, 12]} />
        <meshStandardMaterial
          color={rotFactor > 0.4 ? '#451A03' : '#CA8A04'}
          roughness={0.7}
        />
      </mesh>

      {/* Melanin Enzymatic Browning Spots on Pulp Surface */}
      {rotFactor > 0.25 && (
        <group>
          {[-0.4, -0.1, 0.2, 0.5].map((yOffset, i) => (
            <mesh key={`spot-${i}`} position={[0.23, yOffset, 0.08]} rotation={[0, 0.8, 0]}>
              <circleGeometry args={[0.04 + rotFactor * 0.05, 12]} />
              <meshBasicMaterial color="#2E1005" />
            </mesh>
          ))}
        </group>
      )}

      {/* Green/Brown Crown Stalk */}
      <mesh position={[0, 0.95, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 0.22, 10]} />
        <meshStandardMaterial
          color={rotFactor > 0.5 ? '#292524' : '#65A30D'}
          roughness={0.8}
        />
      </mesh>
    </group>
  );
}

// 2. MANGO CUTAWAY: Half sphere revealing succulent mesocarp, fibrous seed pit & spongy tissue
function MangoCutaway({ rotFactor }: { rotFactor: number }) {
  const fleshColor = useMemo(() => {
    const fresh = new THREE.Color('#F59E0B'); // Deep rich alphonso amber
    const rot = new THREE.Color('#451A03');   // Decayed soft brown
    return new THREE.Color().lerpColors(fresh, rot, rotFactor);
  }, [rotFactor]);

  const skinColor = useMemo(() => {
    const fresh = new THREE.Color('#EAB308'); // Golden yellow/red blush
    const rot = new THREE.Color('#1C1917');
    return new THREE.Color().lerpColors(fresh, rot, rotFactor);
  }, [rotFactor]);

  return (
    <group position={[0, 0, 0]} rotation={[0.3, 0.5, 0]}>
      {/* Outer Skin Shell (Half sphere) */}
      <mesh scale={[1.1, 1.3, 0.9]}>
        <sphereGeometry args={[0.8, 28, 28, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={skinColor} roughness={0.3} metalness={0.1} side={THREE.DoubleSide} />
      </mesh>

      {/* Sliced Cut Face (Flat cross-section revealing flesh) */}
      <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1.1, 0.9, 1.0]}>
        <circleGeometry args={[0.79, 32]} />
        <meshStandardMaterial color={fleshColor} roughness={0.25} metalness={0.05} />
      </mesh>

      {/* Central Large Fibrous Stone/Pit */}
      <mesh position={[0, 0, 0.02]} scale={[0.42, 0.65, 0.12]}>
        <sphereGeometry args={[0.5, 20, 20]} />
        <meshStandardMaterial color="#FEF3C7" roughness={0.75} />
      </mesh>

      {/* Spongy Tissue Anomaly / Cavity Breakdown (Classic Mango post-harvest defect) */}
      {rotFactor > 0.35 && (
        <mesh position={[0.28, 0.22, 0.04]} scale={[0.18, 0.18, 0.08]}>
          <sphereGeometry args={[0.5, 12, 12]} />
          <meshBasicMaterial color="#27150A" />
        </mesh>
      )}
    </group>
  );
}

// 3. TOMATO CUTAWAY: Transverse slice showing pericarp, 4 locular gel cavities with seeds
function TomatoCutaway({ rotFactor }: { rotFactor: number }) {
  const fleshColor = useMemo(() => {
    const fresh = new THREE.Color('#EF4444'); // Crimson red
    const rot = new THREE.Color('#3B1A10');   // Decayed brown
    return new THREE.Color().lerpColors(fresh, rot, rotFactor);
  }, [rotFactor]);

  return (
    <group position={[0, 0, 0]} rotation={[0.4, 0.3, 0]}>
      {/* Lower Hemispherical Outer Pericarp */}
      <mesh scale={[1.2, 0.9, 1.2]}>
        <sphereGeometry args={[0.75, 26, 26, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshStandardMaterial color={rotFactor > 0.6 ? '#5F281E' : '#DC2626'} roughness={0.2} metalness={0.1} />
      </mesh>

      {/* Flat Cut Transverse Face */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[1.2, 1.2, 1.0]}>
        <circleGeometry args={[0.74, 32]} />
        <meshStandardMaterial color={fleshColor} roughness={0.2} metalness={0.08} />
      </mesh>

      {/* 4 Internal Locular Gel Cavities with Seeds */}
      {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((angle, idx) => (
        <group key={`locule-${idx}`} position={[Math.cos(angle) * 0.42, 0.02, Math.sin(angle) * 0.42]}>
          <mesh scale={[0.22, 0.04, 0.16]}>
            <cylinderGeometry args={[1, 1, 1, 16]} />
            <meshStandardMaterial
              color={rotFactor > 0.5 ? '#3F2213' : '#F59E0B'}
              roughness={0.1}
              transparent
              opacity={0.85}
            />
          </mesh>
          {/* Seeds inside locular gel */}
          {[-0.08, 0.08].map((sOffset, si) => (
            <mesh key={si} position={[sOffset, 0.03, 0]} scale={[0.045, 0.02, 0.03]}>
              <sphereGeometry args={[1, 8, 8]} />
              <meshStandardMaterial color="#FEF08A" roughness={0.6} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Central Columella Junction */}
      <mesh position={[0, 0.02, 0]} scale={[0.16, 0.03, 0.16]}>
        <cylinderGeometry args={[1, 1, 1, 16]} />
        <meshStandardMaterial color="#FCA5A5" roughness={0.4} />
      </mesh>
    </group>
  );
}

// ----------------- MAIN COMPONENT -----------------
export const ZackCutawayInspector: React.FC<ZackCutawayInspectorProps> = ({
  initialCommodity = 'banana',
  onClose,
}) => {
  const [commodity, setCommodity] = useState<'banana' | 'mango' | 'tomato' | 'orange' | 'grapes'>(initialCommodity);
  const [dayOffset, setDayOffset] = useState<number>(3.5); // Day 0 to Day 14
  const [isPlayingTimeLapse, setIsPlayingTimeLapse] = useState<boolean>(true);
  const [activeLayer, setActiveLayer] = useState<'all' | 'thermal' | 'ethylene' | 'cellular'>('all');

  // rotFactor: 0.0 (fresh) to 1.0 (rotten)
  const rotFactor = Math.min(1.0, Math.max(0.0, dayOffset / 12.0));
  const qualityScore = Math.max(12, Math.round(98 - rotFactor * 84));

  // Time-lapse auto-scrubber
  useFrame((_, delta) => {
    if (!isPlayingTimeLapse) return;
    setDayOffset((prev) => {
      const next = prev + delta * 1.8;
      return next > 14 ? 0 : next;
    });
  });

  // Scientific data based on commodity and current day offset
  const data = useMemo(() => {
    if (commodity === 'banana') {
      return {
        title: 'WHAT REALLY HAPPENS INSIDE A BANANA WHEN COLD FAILS?',
        botanical: 'Musa acuminata (Cavendish)',
        coreTempC: (13.2 + rotFactor * 9.8).toFixed(1),
        surfaceTempC: (14.5 + rotFactor * 11.2).toFixed(1),
        ethylenePpm: (0.12 + rotFactor * rotFactor * 14.5).toFixed(2),
        biotNumber: '0.14 (Conduction Gradient)',
        primaryDefect: 'Polyphenol Oxidase Enzymatic Browning & Lysis',
        voiceoverText:
          'When temperature crosses 14°C, respiration quadruples. Inside the pulp cells, polyphenol oxidase reacts with oxygen, converting phenols into dark melanin pigments. Simultaneously, an autocatalytic burst of Ethylene gas is pumped into the air—signaling neighboring crates to rot twice as fast!',
        callouts: [
          { pos: [0.75, 0.45, 0] as [number, number, number], label: 'Polyphenol Oxidase', sub: 'Melanin Browning Enzymes' },
          { pos: [-0.65, 0.25, 0] as [number, number, number], label: 'Outer Peel Barrier', sub: 'Conducts heat at 0.15 W/m-K' },
          { pos: [0, -0.65, 0] as [number, number, number], label: 'Vascular Fiber Core', sub: 'Sugar-starch hydrolysis locus' },
        ],
      };
    } else if (commodity === 'mango') {
      return {
        title: 'WHAT HAPPENS INSIDE AN ALPHONSO MANGO UNDER HEAT STRESS?',
        botanical: 'Mangifera indica (Alphonso)',
        coreTempC: (12.0 + rotFactor * 10.4).toFixed(1),
        surfaceTempC: (13.5 + rotFactor * 12.8).toFixed(1),
        ethylenePpm: (0.08 + rotFactor * 9.2).toFixed(2),
        biotNumber: '0.22 (Internal Thermal Lag)',
        primaryDefect: 'Spongy Tissue Cavitation & Acid Breakdown',
        voiceoverText:
          'High ambient heat traps respiratory carbon dioxide inside the thick mesocarp flesh. Anaerobic fermentation begins around the fibrous pit, creating acidic soft rot pockets and spongy tissue cavities before peel symptoms appear!',
        callouts: [
          { pos: [0.65, 0.35, 0] as [number, number, number], label: 'Spongy Tissue Anomaly', sub: 'Anaerobic enzymatic breakdown' },
          { pos: [0, -0.45, 0] as [number, number, number], label: 'Fibrous Stone Pit', sub: 'Heat retention core' },
          { pos: [-0.7, 0.15, 0] as [number, number, number], label: 'Exocarp Peel Blush', sub: 'Transpiration pore desiccation' },
        ],
      };
    }
    // Tomato default
    return {
      title: 'WHAT HAPPENS INSIDE A TOMATO DURING TEMPERATURE ABUSE?',
      botanical: 'Solanum lycopersicum',
      coreTempC: (11.0 + rotFactor * 11.5).toFixed(1),
      surfaceTempC: (12.5 + rotFactor * 13.0).toFixed(1),
      ethylenePpm: (0.18 + rotFactor * 8.6).toFixed(2),
      biotNumber: '0.18 (Spherical Diffusion)',
      primaryDefect: 'Pectin Depolymerization & Locular Gel Lysis',
      voiceoverText:
        'Warm storage triggers polygalacturonase enzymes to dissolve the cellular pectin glue holding the pericarp cell walls together. The firm fruit collapses into water-soaked pulp while fungi invade the stem scar.',
      callouts: [
        { pos: [0.65, 0.25, 0] as [number, number, number], label: 'Locular Gel Cavities', sub: 'Pectin cell wall breakdown' },
        { pos: [0, -0.55, 0] as [number, number, number], label: 'Pericarp Wall', sub: 'Water-soaked tissue collapse' },
        { pos: [-0.65, 0.35, 0] as [number, number, number], label: 'Stem Scar Ingress', sub: 'Pathogen spore penetration' },
      ],
    };
  }, [commodity, rotFactor]);

  return (
    <group position={[0, 2.5, 0]}>
      {/* Diagnostic Illuminated Stage Pedestal */}
      <group position={[0, -1.2, 0]}>
        <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[2.2, 2.4, 0.25, 36]} />
          <meshStandardMaterial color="#0B1120" roughness={0.2} metalness={0.7} />
        </mesh>
        {/* Glowing Concentric Target Rings */}
        <mesh position={[0, 0.13, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.6, 1.75, 36]} />
          <meshBasicMaterial color="#38BDF8" transparent opacity={0.7} />
        </mesh>
        <mesh position={[0, 0.13, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.9, 0.98, 36]} />
          <meshBasicMaterial color="#0284C7" transparent opacity={0.5} />
        </mesh>
      </group>

      {/* Render Selected Cutaway Fruit Mesh */}
      {commodity === 'banana' && <BananaCutaway rotFactor={rotFactor} />}
      {commodity === 'mango' && <MangoCutaway rotFactor={rotFactor} />}
      {commodity === 'tomato' && <TomatoCutaway rotFactor={rotFactor} />}

      {/* Thermal Conduction Infiltration Wave Rings */}
      {(activeLayer === 'all' || activeLayer === 'thermal') && (
        <ThermalWaveRings active={rotFactor > 0.15} />
      )}

      {/* Ethylene Gas Molecular Cloud Wafting from Fruit */}
      {(activeLayer === 'all' || activeLayer === 'ethylene') && (
        <GasMolecules intensity={rotFactor} color="#C084FC" />
      )}

      {/* Zack D. Style Floating 3D Leader Lines with Callout Labels */}
      {data.callouts.map((c, idx) => (
        <Html key={`callout-${idx}`} position={c.pos} center distanceFactor={14}>
          <div className="flex items-center gap-2 select-none pointer-events-none whitespace-nowrap">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 ring-4 ring-cyan-500/40 animate-pulse shadow-lg" />
            <div className="bg-slate-950/90 border border-cyan-500/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-left shadow-xl">
              <span className="text-[10px] font-extrabold text-cyan-300 block uppercase tracking-wider">
                {c.label}
              </span>
              <span className="text-[9px] text-slate-300 font-medium block">
                {c.sub}
              </span>
            </div>
          </div>
        </Html>
      ))}

      {/* =========================================================================
          ZACK D. FILMS EXPLAINER HUD OVERLAY (FLOATING IN 3D SPACE)
         ========================================================================= */}
      <Html position={[0, -2.1, 0]} center distanceFactor={16}>
        <div className="w-[92vw] max-w-2xl bg-slate-900/95 border border-cyan-500/60 rounded-2xl p-4 shadow-2xl backdrop-blur-xl text-white space-y-3 pointer-events-auto select-none">
          {/* Top Bar: Zack Style Header + Commodity Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-cyan-400 uppercase tracking-widest block">
                  ZACK D. 3D EXPLAINER SIMULATION
                </span>
                <h4 className="text-sm font-extrabold text-white tracking-tight">
                  {data.title}
                </h4>
              </div>
            </div>

            {/* Commodity Selectors */}
            <div className="flex items-center gap-1">
              {[
                { key: 'banana', label: 'Banana' },
                { key: 'mango', label: 'Mango' },
                { key: 'tomato', label: 'Tomato' },
              ].map((c) => (
                <button
                  key={c.key}
                  onClick={() => setCommodity(c.key as any)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    commodity === c.key
                      ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {c.label}
                </button>
              ))}
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 ml-1"
                >
                  Return to Warehouse
                </button>
              )}
            </div>
          </div>

          {/* Voiceover Style Script Text (Zack D. Hook Style) */}
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-200 leading-relaxed font-normal">
            <span className="text-cyan-400 font-extrabold mr-1">HOW IT ROTS:</span>
            {data.voiceoverText}
          </div>

          {/* Live Micro-Biophysical Telemetry Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60">
              <span className="text-[9px] text-slate-400 block font-semibold">Pulp Surface Temp</span>
              <strong className="text-sm text-amber-400 font-extrabold">{data.surfaceTempC} °C</strong>
            </div>
            <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60">
              <span className="text-[9px] text-slate-400 block font-semibold">Core Biot Lag Temp</span>
              <strong className="text-sm text-cyan-400 font-extrabold">{data.coreTempC} °C</strong>
            </div>
            <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60">
              <span className="text-[9px] text-slate-400 block font-semibold">Ethylene Gas Release</span>
              <strong className="text-sm text-purple-400 font-extrabold">{data.ethylenePpm} ppm</strong>
            </div>
            <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60">
              <span className="text-[9px] text-slate-400 block font-semibold">Freshness Score</span>
              <strong className={`text-sm font-extrabold ${qualityScore > 75 ? 'text-emerald-400' : qualityScore > 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                {qualityScore}%
              </strong>
            </div>
          </div>

          {/* Interactive Time-Lapse Scrubber & Controls */}
          <div className="pt-1 space-y-2 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlayingTimeLapse((prev) => !prev)}
                  className={`p-1.5 rounded-lg font-bold flex items-center gap-1 transition-all ${
                    isPlayingTimeLapse
                      ? 'bg-amber-600 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {isPlayingTimeLapse ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span className="text-[10px]">{isPlayingTimeLapse ? 'Pause Time-Lapse' : 'Play Time-Lapse'}</span>
                </button>
                <button
                  onClick={() => setDayOffset(0)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="Reset to Day 0 (Fresh Harvest)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-300">
                <span className="text-slate-400">Timeline:</span>
                <span className="text-cyan-400 font-extrabold">Day {dayOffset.toFixed(1)}</span>
                <span className="text-slate-500">/ 14 Days</span>
              </div>
            </div>

            {/* Slider */}
            <input
              type="range"
              min="0"
              max="14"
              step="0.1"
              value={dayOffset}
              onChange={(e) => {
                setIsPlayingTimeLapse(false);
                setDayOffset(parseFloat(e.target.value));
              }}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
            />
          </div>
        </div>
      </Html>
    </group>
  );
};
