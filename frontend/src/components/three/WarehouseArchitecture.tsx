import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ProduceModel } from './ProduceModel';

interface WarehouseArchitectureProps {
  chamberA: { tempC: number; rhPct: number; o2Pct: number };
  chamberB: { tempC: number; rhPct: number; o2Pct: number };
  chamberC: { tempC: number; rhPct: number; o2Pct: number };
  doorOpen?: boolean;
  coolingActive?: boolean;
  showReeferTruck?: boolean;
}

// Animated Industrial Roll-Up Dock Shutter Door
function AnimatedRollUpDoor({ doorOpen }: { doorOpen: boolean }) {
  const doorGroupRef = useRef<THREE.Group>(null!);

  useFrame((_, delta) => {
    if (doorGroupRef.current) {
      // Slides up from y=3.7 (closed) to y=9.2 (open)
      const targetY = doorOpen ? 9.2 : 3.7;
      doorGroupRef.current.position.y = THREE.MathUtils.damp(
        doorGroupRef.current.position.y,
        targetY,
        4.5,
        delta
      );
    }
  });

  return (
    <group ref={doorGroupRef} position={[0, 3.7, 17.4]}>
      {/* Shutter Door Ribbed Panels */}
      <mesh>
        <boxGeometry args={[13.2, 7.4, 0.12]} />
        <meshStandardMaterial color="#1E40AF" roughness={0.35} metalness={0.65} />
      </mesh>
      {/* Horizontal Shutter Seams */}
      {[-3, -2, -1, 0, 1, 2, 3].map((y, idx) => (
        <mesh key={`seam-${idx}`} position={[0, y, 0.07]}>
          <boxGeometry args={[13.0, 0.04, 0.02]} />
          <meshStandardMaterial color="#172554" metalness={0.8} />
        </mesh>
      ))}
      {/* Vertical Track Guides */}
      {[-6.65, 6.65].map((x, idx) => (
        <mesh key={`track-${idx}`} position={[x, 0, 0]}>
          <boxGeometry args={[0.15, 7.6, 0.18]} />
          <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
}

// 3D Reefer Truck Model Backed into Loading Dock
function DockReeferTruck({ isDockDoorOpen }: { isDockDoorOpen: boolean }) {
  const compressorFanRef = useRef<THREE.Group>(null!);

  useFrame((_, delta) => {
    if (compressorFanRef.current) {
      compressorFanRef.current.rotation.z += delta * 12;
    }
  });

  return (
    <group position={[0, 0, 24.5]} rotation={[0, Math.PI, 0]}>
      {/* 1. Semi-Truck Tractor Cabin */}
      <group position={[0, 1.4, 9.8]}>
        {/* Cab Main Body */}
        <mesh position={[0, 0.4, 0]}>
          <boxGeometry args={[2.7, 2.2, 2.6]} />
          <meshStandardMaterial color="#1D4ED8" roughness={0.3} metalness={0.5} />
        </mesh>
        {/* Windshield */}
        <mesh position={[0, 0.7, 1.31]}>
          <planeGeometry args={[2.2, 0.9]} />
          <meshPhysicalMaterial color="#93C5FD" transparent opacity={0.6} roughness={0.1} />
        </mesh>
        {/* Grille */}
        <mesh position={[0, -0.2, 1.32]}>
          <boxGeometry args={[1.9, 0.75, 0.05]} />
          <meshStandardMaterial color="#334155" roughness={0.3} metalness={0.8} />
        </mesh>
        {/* Front Headlights */}
        {[-0.95, 0.95].map((x, idx) => (
          <mesh key={`hl-${idx}`} position={[x, -0.2, 1.34]}>
            <circleGeometry args={[0.16, 16]} />
            <meshBasicMaterial color="#FEF08A" />
          </mesh>
        ))}
        {/* Wheels */}
        {[-1.2, 1.2].map((x, idx) => (
          <mesh key={`cw-${idx}`} position={[x, -0.75, 0.4]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.55, 0.55, 0.35, 20]} />
            <meshStandardMaterial color="#0F172A" roughness={0.9} />
          </mesh>
        ))}
      </group>

      {/* 2. Insulated Refrigerated Semi-Trailer */}
      <group position={[0, 2.3, 2.5]}>
        {/* Trailer Outer Shell */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[3.0, 3.5, 11.2]} />
          <meshStandardMaterial color="#F8FAFC" roughness={0.25} metalness={0.2} />
        </mesh>
        {/* Blue Livery Stripe on Sides */}
        {[-1.51, 1.51].map((x, idx) => (
          <mesh key={`stripe-${idx}`} position={[x, 0.2, 0]} rotation={[0, x > 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
            <planeGeometry args={[10.8, 0.45]} />
            <meshBasicMaterial color="#2563EB" />
          </mesh>
        ))}

        {/* Trailer Rear Loading Opening Facing Warehouse Dock (at z = -5.6) */}
        {/* Rear Frame */}
        <mesh position={[0, 0, -5.61]}>
          <boxGeometry args={[2.9, 3.4, 0.08]} />
          <meshStandardMaterial color="#334155" roughness={0.5} metalness={0.6} />
        </mesh>

        {/* Reefer Condenser Unit atop Trailer Front (facing cab) */}
        <group position={[0, 0.6, 5.7]}>
          <mesh>
            <boxGeometry args={[1.8, 1.8, 0.5]} />
            <meshStandardMaterial color="#0284C7" roughness={0.4} metalness={0.5} />
          </mesh>
          <group ref={compressorFanRef} position={[0, 0, 0.26]}>
            <mesh>
              <circleGeometry args={[0.4, 16]} />
              <meshBasicMaterial color="#0F172A" />
            </mesh>
            {[0, Math.PI / 2].map((rot, idx) => (
              <mesh key={`fanb-${idx}`} rotation={[0, 0, rot]}>
                <boxGeometry args={[0.1, 0.7, 0.02]} />
                <meshStandardMaterial color="#94A3B8" />
              </mesh>
            ))}
          </group>
          {/* Active LED */}
          <mesh position={[0.6, 0.6, 0.26]}>
            <circleGeometry args={[0.06, 12]} />
            <meshBasicMaterial color="#22C55E" />
          </mesh>
        </group>

        {/* Dual Rear Axle Wheels */}
        {[-3.2, -1.8].map((zOffset, zIdx) =>
          [-1.35, 1.35].map((x, xIdx) => (
            <mesh key={`tw-${zIdx}-${xIdx}`} position={[x, -2.1, zOffset]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.55, 0.55, 0.35, 20]} />
              <meshStandardMaterial color="#0F172A" roughness={0.9} />
            </mesh>
          ))
        )}

        {/* Cargo Crates Visible inside Trailer */}
        {isDockDoorOpen && (
          <group position={[0, -0.9, -3.8]}>
            <ProduceModel commodity="banana" qualityScore={92} position={[0, 0.2, 0]} scale={0.9} />
            <mesh position={[0, -0.3, 0]}>
              <boxGeometry args={[1.2, 0.45, 1.4]} />
              <meshStandardMaterial color="#B45309" roughness={0.8} />
            </mesh>
          </group>
        )}
      </group>
    </group>
  );
}

// Single Evaporator Blower Unit with rotating fan blades & emergency siren
function EvaporatorUnit({
  position,
  chamberName,
  tempC,
  coolingActive = true,
}: {
  position: [number, number, number];
  chamberName: string;
  tempC: number;
  coolingActive?: boolean;
}) {
  const fanLeftRef = useRef<THREE.Group>(null!);
  const fanRightRef = useRef<THREE.Group>(null!);
  const beaconRef = useRef<THREE.PointLight>(null!);

  useFrame((_, delta) => {
    if (coolingActive) {
      if (fanLeftRef.current) fanLeftRef.current.rotation.z += delta * 18;
      if (fanRightRef.current) fanRightRef.current.rotation.z += delta * 18;
    } else {
      // Emergency beacon pulsing red when cooling tripped
      if (beaconRef.current) {
        beaconRef.current.intensity = (Math.sin(Date.now() * 0.008) + 1.1) * 2.5;
      }
    }
  });

  return (
    <group position={position}>
      {/* Heavy Insulated Condenser / Evaporator Cabinet */}
      <mesh>
        <boxGeometry args={[4.4, 2.0, 1.4]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.25} metalness={0.4} />
      </mesh>

      {/* Top Mounting Steel Brackets */}
      {[-1.8, 1.8].map((x, idx) => (
        <mesh key={`mount-${idx}`} position={[x, 1.15, 0]}>
          <boxGeometry args={[0.2, 0.3, 1.2]} />
          <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}

      {/* Copper Refrigerant Supply & Return Lines */}
      <group position={[1.9, 0.4, 0.75]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.04, 0.04, 0.8, 8]} />
          <meshStandardMaterial color="#B45309" metalness={0.85} roughness={0.25} />
        </mesh>
        <mesh position={[0, -0.2, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.03, 0.03, 0.8, 8]} />
          <meshStandardMaterial color="#0284C7" metalness={0.6} roughness={0.4} />
        </mesh>
      </group>

      {/* Dual High-Velocity Fan Assemblies */}
      {/* Left Fan */}
      <group position={[-1.2, -0.05, 0.71]}>
        <mesh>
          <ringGeometry args={[0.62, 0.72, 24]} />
          <meshStandardMaterial color="#0284C7" metalness={0.5} roughness={0.4} />
        </mesh>
        <group ref={fanLeftRef}>
          {[0, 60, 120, 180, 240, 300].map((deg, i) => (
            <mesh key={i} rotation={[0, 0, (deg * Math.PI) / 180]}>
              <boxGeometry args={[0.12, 0.58, 0.02]} />
              <meshStandardMaterial color="#1E293B" metalness={0.8} />
            </mesh>
          ))}
          <mesh position={[0, 0, 0.02]}>
            <sphereGeometry args={[0.12, 12, 12]} />
            <meshStandardMaterial color="#475569" metalness={0.9} />
          </mesh>
        </group>
      </group>

      {/* Right Fan */}
      <group position={[1.2, -0.05, 0.71]}>
        <mesh>
          <ringGeometry args={[0.62, 0.72, 24]} />
          <meshStandardMaterial color="#0284C7" metalness={0.5} roughness={0.4} />
        </mesh>
        <group ref={fanRightRef}>
          {[0, 60, 120, 180, 240, 300].map((deg, i) => (
            <mesh key={i} rotation={[0, 0, (deg * Math.PI) / 180]}>
              <boxGeometry args={[0.12, 0.58, 0.02]} />
              <meshStandardMaterial color="#1E293B" metalness={0.8} />
            </mesh>
          ))}
          <mesh position={[0, 0, 0.02]}>
            <sphereGeometry args={[0.12, 12, 12]} />
            <meshStandardMaterial color="#475569" metalness={0.9} />
          </mesh>
        </group>
      </group>

      {/* Digital Microclimate Status LED Bar on Evaporator */}
      <mesh position={[0, 0.75, 0.71]}>
        <planeGeometry args={[1.6, 0.28]} />
        <meshBasicMaterial color="#0F172A" />
      </mesh>
      {/* Status Power Light: Green = Cooling On, Red = Compressor Fault / Off */}
      <mesh position={[-0.65, 0.75, 0.72]}>
        <circleGeometry args={[0.045, 12]} />
        <meshBasicMaterial color={coolingActive ? '#22C55E' : '#EF4444'} />
      </mesh>

      {/* Emergency Siren Beacon atop Evaporator */}
      <group position={[0, 1.25, 0]}>
        <mesh>
          <cylinderGeometry args={[0.12, 0.16, 0.26, 16]} />
          <meshStandardMaterial color={coolingActive ? '#0284C7' : '#DC2626'} roughness={0.2} metalness={0.7} />
        </mesh>
        {!coolingActive && (
          <pointLight ref={beaconRef} color="#EF4444" intensity={3.5} distance={18} />
        )}
      </group>
    </group>
  );
}

export const WarehouseArchitecture: React.FC<WarehouseArchitectureProps> = ({
  chamberA,
  chamberB,
  chamberC,
  doorOpen = false,
  coolingActive = true,
  showReeferTruck = true,
}) => {
  return (
    <group>
      {/* 1. High-Tech Dark Polished Industrial Epoxy Warehouse Flooring */}
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[52, 38]} />
        <meshStandardMaterial
          color="#0F172A"
          roughness={0.16}
          metalness={0.28}
        />
      </mesh>

      {/* Floor Grid Lines for High-Tech CAD/Digital Twin Look */}
      {Array.from({ length: 13 }).map((_, i) => (
        <mesh key={`grid-x-${i}`} position={[-24 + i * 4, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.04, 36]} />
          <meshBasicMaterial color="#1E293B" />
        </mesh>
      ))}
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh key={`grid-z-${i}`} position={[0, 0.003, -16 + i * 4]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[48, 0.04]} />
          <meshBasicMaterial color="#1E293B" />
        </mesh>
      ))}

      {/* Safety Floor Walkway / Forklift Lane Markings (OSHA Amber) */}
      {[-8.5, 0, 8.5].map((z, idx) => (
        <group key={`lane-line-${idx}`} position={[0, 0.006, z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[44, 0.16]} />
            <meshBasicMaterial color="#F59E0B" />
          </mesh>
        </group>
      ))}

      {/* Cross-Aisle Safety Walkway Striping (Yellow/Black Hazard Chevron) */}
      <mesh position={[0, 0.007, 6.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[44, 0.8]} />
        <meshBasicMaterial color="#EAB308" />
      </mesh>
      {/* Black Zebra Intermittent Striping */}
      {Array.from({ length: 22 }).map((_, i) => (
        <mesh key={`zebra-${i}`} position={[-21 + i * 2, 0.009, 6.2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.9, 0.76]} />
          <meshBasicMaterial color="#0B0F19" />
        </mesh>
      ))}

      {/* 5 Distinctive Luminous Floor Bay Boundaries */}
      {[
        { x: -16, color: '#FACC15', glow: '#FEF08A' }, // Bay 1 - Banana
        { x: -8, color: '#FB923C', glow: '#FFEDD5' },  // Bay 2 - Orange
        { x: 0, color: '#F59E0B', glow: '#FEF3C7' },   // Bay 3 - Mango
        { x: 8, color: '#A3E635', glow: '#ECFCCB' },   // Bay 4 - Guava
        { x: 16, color: '#C084FC', glow: '#F3E8FF' },  // Bay 5 - Grapes
      ].map((bay, idx) => (
        <group key={`bay-floor-${idx}`} position={[bay.x, 0.008, -3.2]}>
          {/* Outer rectangular bounding track */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[6.4, 0.14]} />
            <meshBasicMaterial color={bay.color} />
          </mesh>
          <mesh position={[0, 0, 0.35]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[6.4, 0.06]} />
            <meshBasicMaterial color={bay.glow} />
          </mesh>
        </group>
      ))}

      {/* 2. Perimeter Insulated Sandwich Walls */}
      {/* Back Wall */}
      <mesh position={[0, 5.5, -17.5]} receiveShadow>
        <boxGeometry args={[48, 11, 0.5]} />
        <meshStandardMaterial color="#1E293B" roughness={0.65} metalness={0.25} />
      </mesh>
      {/* Wall Kickplate Protection Baseboard */}
      <mesh position={[0, 0.4, -17.2]}>
        <boxGeometry args={[48, 0.8, 0.1]} />
        <meshStandardMaterial color="#0F172A" roughness={0.5} metalness={0.6} />
      </mesh>

      {/* Front Wall with Loading Dock Openings */}
      <mesh position={[-16, 5.5, 17.5]} receiveShadow>
        <boxGeometry args={[16, 11, 0.5]} />
        <meshStandardMaterial color="#1E293B" roughness={0.65} metalness={0.25} />
      </mesh>
      <mesh position={[16, 5.5, 17.5]} receiveShadow>
        <boxGeometry args={[16, 11, 0.5]} />
        <meshStandardMaterial color="#1E293B" roughness={0.65} metalness={0.25} />
      </mesh>
      {/* Dock Lintel Wall above door */}
      <mesh position={[0, 9.2, 17.5]}>
        <boxGeometry args={[16, 3.6, 0.5]} />
        <meshStandardMaterial color="#334155" roughness={0.65} />
      </mesh>

      {/* 3. Sectional Industrial Roll-Up Dock Shutter Door */}
      <AnimatedRollUpDoor doorOpen={doorOpen} />

      {/* 4. Dock Leveler Plate & Heavy Rubber Bumpers */}
      <group position={[0, 0.08, 17.0]}>
        <mesh rotation={[-0.04, 0, 0]}>
          <boxGeometry args={[6.8, 0.1, 2.4]} />
          <meshStandardMaterial color="#475569" roughness={0.4} metalness={0.8} />
        </mesh>
        {[-3.45, 3.45].map((x, idx) => (
          <mesh key={`curb-${idx}`} position={[x, 0.08, 0]}>
            <boxGeometry args={[0.1, 0.16, 2.4]} />
            <meshStandardMaterial color="#EAB308" />
          </mesh>
        ))}
        {[-4.2, 4.2].map((x, idx) => (
          <mesh key={`bumper-${idx}`} position={[x, 0.4, 0.6]}>
            <boxGeometry args={[0.5, 0.8, 0.35]} />
            <meshStandardMaterial color="#0F172A" roughness={0.9} />
          </mesh>
        ))}
      </group>

      {/* 5. Heavy Steel Protective Safety Bollards at Dock */}
      {[-5.4, 5.4].map((x, idx) => (
        <group key={`bollard-${idx}`} position={[x, 0, 16.0]}>
          <mesh position={[0, 0.7, 0]}>
            <cylinderGeometry args={[0.14, 0.14, 1.4, 16]} />
            <meshStandardMaterial color="#EAB308" metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.95, 0]}>
            <cylinderGeometry args={[0.145, 0.145, 0.22, 16]} />
            <meshStandardMaterial color="#0F172A" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.04, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.08, 16]} />
            <meshStandardMaterial color="#334155" metalness={0.8} />
          </mesh>
        </group>
      ))}

      {/* 6. Side Walls */}
      <mesh position={[-23.8, 5.5, 0]} receiveShadow>
        <boxGeometry args={[0.5, 11, 35]} />
        <meshStandardMaterial color="#1E293B" roughness={0.7} />
      </mesh>
      <mesh position={[23.8, 5.5, 0]} receiveShadow>
        <boxGeometry args={[0.5, 11, 35]} />
        <meshStandardMaterial color="#1E293B" roughness={0.7} />
      </mesh>

      {/* 7. Structural Open-Web Steel Roof Trusses & Overhead Beams */}
      {[-16, -8, 0, 8, 16].map((x, idx) => (
        <group key={`truss-${idx}`} position={[x, 10.2, 0]}>
          <mesh>
            <boxGeometry args={[0.35, 0.45, 34.5]} />
            <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.75} />
          </mesh>
          <mesh position={[0, -0.9, 0]}>
            <boxGeometry args={[0.28, 0.3, 34.0]} />
            <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.75} />
          </mesh>
          {[-12, -8, -4, 0, 4, 8, 12].map((z, zi) => (
            <mesh key={`web-${zi}`} position={[0, -0.45, z]} rotation={[0.5 * (zi % 2 === 0 ? 1 : -1), 0, 0]}>
              <boxGeometry args={[0.1, 0.95, 0.1]} />
              <meshStandardMaterial color="#475569" roughness={0.5} metalness={0.7} />
            </mesh>
          ))}
          {/* High-Bay Linear LED Lighting Fixtures under each truss */}
          {[-10, 0, 10].map((zLum, lIdx) => (
            <group key={`lum-${lIdx}`} position={[0, -1.05, zLum]}>
              <mesh>
                <boxGeometry args={[0.2, 0.08, 3.2]} />
                <meshStandardMaterial color="#1E293B" metalness={0.8} />
              </mesh>
              <mesh position={[0, -0.045, 0]}>
                <boxGeometry args={[0.16, 0.01, 3.0]} />
                <meshBasicMaterial color="#E0F2FE" />
              </mesh>
            </group>
          ))}
        </group>
      ))}

      {/* 8. Galvanized Spiral HVAC Air Distribution Ductwork */}
      <group position={[0, 9.4, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.65, 0.65, 33, 20]} />
          <meshStandardMaterial color="#CBD5E1" metalness={0.85} roughness={0.25} />
        </mesh>
        {[-12, -6, 0, 6, 12].map((z, idx) => (
          <group key={`diffuser-${idx}`} position={[0, -0.65, z]}>
            <mesh>
              <coneGeometry args={[0.42, 0.35, 16]} />
              <meshStandardMaterial color="#94A3B8" metalness={0.8} roughness={0.3} />
            </mesh>
          </group>
        ))}
      </group>

      {/* 9. Transparent Acrylic Chamber Partitions */}
      <mesh position={[-6.2, 5.0, -4.5]}>
        <boxGeometry args={[0.1, 10, 24]} />
        <meshPhysicalMaterial
          color="#38BDF8"
          transparent
          opacity={0.16}
          roughness={0.08}
          transmission={0.88}
          thickness={0.25}
        />
      </mesh>
      <mesh position={[6.2, 5.0, -4.5]}>
        <boxGeometry args={[0.1, 10, 24]} />
        <meshPhysicalMaterial
          color="#38BDF8"
          transparent
          opacity={0.16}
          roughness={0.08}
          transmission={0.88}
          thickness={0.25}
        />
      </mesh>

      {/* 10. Evaporator Blower Units */}
      <EvaporatorUnit
        position={[-14, 8.0, -16.8]}
        chamberName="Chamber A (Tropical Zone)"
        tempC={chamberA.tempC}
        coolingActive={coolingActive}
      />
      <EvaporatorUnit
        position={[0, 8.0, -16.8]}
        chamberName="Chamber B (Citrus/Subtropical)"
        tempC={chamberB.tempC}
        coolingActive={coolingActive}
      />
      <EvaporatorUnit
        position={[14, 8.0, -16.8]}
        chamberName="Chamber C (Controlled Atmosphere)"
        tempC={chamberC.tempC}
        coolingActive={coolingActive}
      />

      {/* 11. Dock Reefer Truck Parked outside Bay */}
      {showReeferTruck && <DockReeferTruck isDockDoorOpen={doorOpen} />}
    </group>
  );
};
