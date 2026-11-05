import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface WarehouseArchitectureProps {
  chamberA: { tempC: number; rhPct: number; o2Pct: number };
  chamberB: { tempC: number; rhPct: number; o2Pct: number };
  chamberC: { tempC: number; rhPct: number; o2Pct: number };
  doorOpen?: boolean;
  coolingActive?: boolean;
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

// Single Evaporator Blower Unit with rotating fan blades
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

  useFrame((_, delta) => {
    if (coolingActive) {
      if (fanLeftRef.current) fanLeftRef.current.rotation.z += delta * 18;
      if (fanRightRef.current) fanRightRef.current.rotation.z += delta * 18;
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
        {/* Wire mesh shroud ring */}
        <mesh>
          <ringGeometry args={[0.62, 0.72, 24]} />
          <meshStandardMaterial color="#0284C7" metalness={0.5} roughness={0.4} />
        </mesh>
        {/* Rotating Blades */}
        <group ref={fanLeftRef}>
          {[0, 60, 120, 180, 240, 300].map((deg, i) => (
            <mesh key={i} rotation={[0, 0, (deg * Math.PI) / 180]}>
              <boxGeometry args={[0.12, 0.58, 0.02]} />
              <meshStandardMaterial color="#1E293B" metalness={0.8} />
            </mesh>
          ))}
          {/* Fan Hub */}
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
    </group>
  );
}

export const WarehouseArchitecture: React.FC<WarehouseArchitectureProps> = ({
  chamberA,
  chamberB,
  chamberC,
  doorOpen = false,
  coolingActive = true,
}) => {
  return (
    <group>
      {/* 1. Industrial Polished Concrete Warehouse Flooring with Epoxy Finish */}
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[48, 36]} />
        <meshStandardMaterial
          color="#E2E8F0"
          roughness={0.22}
          metalness={0.12}
        />
      </mesh>

      {/* Safety Floor Walkway / Forklift Lane Markings */}
      {/* Longitudinal Main Arterial Transit Corridors */}
      {[-8.5, 0, 8.5].map((z, idx) => (
        <group key={`lane-line-${idx}`} position={[0, 0.005, z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[44, 0.18]} />
            <meshBasicMaterial color="#F59E0B" />
          </mesh>
        </group>
      ))}

      {/* Cross-Aisle Safety Walkway Striping (Yellow/Black Hazard Chevron) */}
      <mesh position={[0, 0.006, 6.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[44, 0.8]} />
        <meshBasicMaterial color="#EAB308" />
      </mesh>
      {/* Black Zebra Intermittent Striping */}
      {Array.from({ length: 22 }).map((_, i) => (
        <mesh key={`zebra-${i}`} position={[-21 + i * 2, 0.008, 6.2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.9, 0.76]} />
          <meshBasicMaterial color="#0F172A" />
        </mesh>
      ))}

      {/* Stenciled Floor Bay Boundary Markers */}
      {[
        { x: -16, label: 'BAY 1 - BANANA' },
        { x: -8, label: 'BAY 2 - ORANGE' },
        { x: 0, label: 'BAY 3 - MANGO' },
        { x: 8, label: 'BAY 4 - GUAVA' },
        { x: 16, label: 'BAY 5 - GRAPES' },
      ].map((bay, idx) => (
        <group key={`bay-floor-${idx}`} position={[bay.x, 0.008, -3.2]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[6.2, 0.12]} />
            <meshBasicMaterial color="#3B82F6" />
          </mesh>
          <mesh position={[0, 0, 0.4]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[6.2, 0.08]} />
            <meshBasicMaterial color="#93C5FD" />
          </mesh>
        </group>
      ))}

      {/* 2. Perimeter Insulated Sandwich Walls */}
      {/* Back Wall */}
      <mesh position={[0, 5.5, -17.5]} receiveShadow>
        <boxGeometry args={[48, 11, 0.5]} />
        <meshStandardMaterial color="#E2E8F0" roughness={0.65} metalness={0.15} />
      </mesh>
      {/* Wall Kickplate Protection Baseboard */}
      <mesh position={[0, 0.4, -17.2]}>
        <boxGeometry args={[48, 0.8, 0.1]} />
        <meshStandardMaterial color="#1E293B" roughness={0.5} metalness={0.5} />
      </mesh>

      {/* Front Wall with Loading Dock Openings */}
      <mesh position={[-16, 5.5, 17.5]} receiveShadow>
        <boxGeometry args={[16, 11, 0.5]} />
        <meshStandardMaterial color="#E2E8F0" roughness={0.65} metalness={0.15} />
      </mesh>
      <mesh position={[16, 5.5, 17.5]} receiveShadow>
        <boxGeometry args={[16, 11, 0.5]} />
        <meshStandardMaterial color="#E2E8F0" roughness={0.65} metalness={0.15} />
      </mesh>
      {/* Dock Lintel Wall above door */}
      <mesh position={[0, 9.2, 17.5]}>
        <boxGeometry args={[16, 3.6, 0.5]} />
        <meshStandardMaterial color="#CBD5E1" roughness={0.65} />
      </mesh>

      {/* 3. Sectional Industrial Roll-Up Dock Shutter Door (Animated to Backend Physics) */}
      <AnimatedRollUpDoor doorOpen={doorOpen} />

      {/* 4. Dock Leveler Plate & Heavy Rubber Bumpers */}
      <group position={[0, 0.08, 17.0]}>
        {/* Heavy Steel Ramp Plate */}
        <mesh rotation={[-0.04, 0, 0]}>
          <boxGeometry args={[6.8, 0.1, 2.4]} />
          <meshStandardMaterial color="#475569" roughness={0.4} metalness={0.8} />
        </mesh>
        {/* Yellow Safety Curbs on Leveler Edges */}
        {[-3.45, 3.45].map((x, idx) => (
          <mesh key={`curb-${idx}`} position={[x, 0.08, 0]}>
            <boxGeometry args={[0.1, 0.16, 2.4]} />
            <meshStandardMaterial color="#EAB308" />
          </mesh>
        ))}
        {/* Dual Heavy Rubber Compression Bumpers */}
        {[-4.2, 4.2].map((x, idx) => (
          <mesh key={`bumper-${idx}`} position={[x, 0.4, 0.6]}>
            <boxGeometry args={[0.5, 0.8, 0.35]} />
            <meshStandardMaterial color="#0F172A" roughness={0.9} />
          </mesh>
        ))}
      </group>

      {/* 5. Heavy Steel Protective Safety Bollards at Dock (OSHA Yellow with Black Ring) */}
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
      {/* Left Wall */}
      <mesh position={[-23.8, 5.5, 0]} receiveShadow>
        <boxGeometry args={[0.5, 11, 35]} />
        <meshStandardMaterial color="#CBD5E1" roughness={0.7} />
      </mesh>
      {/* Right Wall */}
      <mesh position={[23.8, 5.5, 0]} receiveShadow>
        <boxGeometry args={[0.5, 11, 35]} />
        <meshStandardMaterial color="#CBD5E1" roughness={0.7} />
      </mesh>

      {/* 7. Structural Open-Web Steel Roof Trusses & Overhead Beams */}
      {[-16, -8, 0, 8, 16].map((x, idx) => (
        <group key={`truss-${idx}`} position={[x, 10.2, 0]}>
          {/* Main Top Chord */}
          <mesh>
            <boxGeometry args={[0.35, 0.45, 34.5]} />
            <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.75} />
          </mesh>
          {/* Main Bottom Chord */}
          <mesh position={[0, -0.9, 0]}>
            <boxGeometry args={[0.28, 0.3, 34.0]} />
            <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.75} />
          </mesh>
          {/* Diagonal Web Struts */}
          {[-12, -8, -4, 0, 4, 8, 12].map((z, zi) => (
            <mesh key={`web-${zi}`} position={[0, -0.45, z]} rotation={[0.5 * (zi % 2 === 0 ? 1 : -1), 0, 0]}>
              <boxGeometry args={[0.1, 0.95, 0.1]} />
              <meshStandardMaterial color="#475569" roughness={0.5} metalness={0.7} />
            </mesh>
          ))}
          {/* Structural Vertical Support Columns with Yellow Base Guards */}
          {[-16.5, 16.5].map((z, colIdx) => (
            <group key={`col-${colIdx}`} position={[0, -5.1, z]}>
              <mesh>
                <boxGeometry args={[0.45, 10.2, 0.45]} />
                <meshStandardMaterial color="#1E293B" roughness={0.4} metalness={0.8} />
              </mesh>
              {/* Yellow Impact Column Guard at Floor */}
              <mesh position={[0, -4.5, 0]}>
                <boxGeometry args={[0.65, 1.2, 0.65]} />
                <meshStandardMaterial color="#EAB308" metalness={0.5} roughness={0.4} />
              </mesh>
            </group>
          ))}
        </group>
      ))}

      {/* 8. Galvanized Spiral HVAC Air Distribution Ductwork */}
      {/* Central High-Capacity Trunk Duct */}
      <group position={[0, 9.4, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.65, 0.65, 33, 20]} />
          <meshStandardMaterial color="#CBD5E1" metalness={0.85} roughness={0.25} />
        </mesh>
        {/* Radial Air Diffusers branching off */}
        {[-12, -6, 0, 6, 12].map((z, idx) => (
          <group key={`diffuser-${idx}`} position={[0, -0.65, z]}>
            <mesh>
              <coneGeometry args={[0.42, 0.35, 16]} />
              <meshStandardMaterial color="#94A3B8" metalness={0.8} roughness={0.3} />
            </mesh>
          </group>
        ))}
      </group>

      {/* 9. Industrial High-Bay LED Light Fixtures (Overhead illumination) */}
      {[
        [-16, 9.8, -8],
        [-16, 9.8, 4],
        [-8, 9.8, -8],
        [-8, 9.8, 4],
        [0, 9.8, -8],
        [0, 9.8, 4],
        [8, 9.8, -8],
        [8, 9.8, 4],
        [16, 9.8, -8],
        [16, 9.8, 4],
      ].map(([x, y, z], idx) => (
        <group key={`light-${idx}`} position={[x, y, z]}>
          <mesh>
            <cylinderGeometry args={[0.45, 0.8, 0.28, 16]} />
            <meshStandardMaterial color="#1E293B" metalness={0.8} />
          </mesh>
          <mesh position={[0, -0.16, 0]}>
            <circleGeometry args={[0.42, 16]} />
            <meshBasicMaterial color="#F8FAFC" />
          </mesh>
          {/* Subtle downlight */}
          <pointLight position={[0, -0.3, 0]} intensity={0.45} distance={14} color="#F0F9FF" />
        </group>
      ))}

      {/* 10. Transparent Acrylic Chamber Partitions (Zone Dividers) */}
      {/* Partition between Chamber A and Chamber B */}
      <mesh position={[-6.2, 5.0, -4.5]}>
        <boxGeometry args={[0.1, 10, 24]} />
        <meshPhysicalMaterial
          color="#BAE6FD"
          transparent
          opacity={0.18}
          roughness={0.08}
          transmission={0.88}
          thickness={0.25}
        />
      </mesh>

      {/* Partition between Chamber B and Chamber C */}
      <mesh position={[6.2, 5.0, -4.5]}>
        <boxGeometry args={[0.1, 10, 24]} />
        <meshPhysicalMaterial
          color="#BAE6FD"
          transparent
          opacity={0.18}
          roughness={0.08}
          transmission={0.88}
          thickness={0.25}
        />
      </mesh>

      {/* 11. Industrial Evaporator & Cooling Condenser Blower Units with Animated Fan Blades */}
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

      {/* 12. Wall Digital Chamber Signage Banners */}
      <group position={[-14, 7.8, -4.5]}>
        <mesh position={[0, 1.8, 0]}>
          <planeGeometry args={[5.2, 0.7]} />
          <meshBasicMaterial color="#1E40AF" />
        </mesh>
      </group>
      <group position={[0, 7.8, -4.5]}>
        <mesh position={[0, 1.8, 0]}>
          <planeGeometry args={[5.2, 0.7]} />
          <meshBasicMaterial color="#047857" />
        </mesh>
      </group>
      <group position={[14, 7.8, -4.5]}>
        <mesh position={[0, 1.8, 0]}>
          <planeGeometry args={[5.2, 0.7]} />
          <meshBasicMaterial color="#4338CA" />
        </mesh>
      </group>
    </group>
  );
};
