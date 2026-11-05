import React from 'react';
import * as THREE from 'three';

interface WarehouseArchitectureProps {
  chamberA: { tempC: number; rhPct: number; o2Pct: number };
  chamberB: { tempC: number; rhPct: number; o2Pct: number };
  chamberC: { tempC: number; rhPct: number; o2Pct: number };
}

export const WarehouseArchitecture: React.FC<WarehouseArchitectureProps> = ({
  chamberA,
  chamberB,
  chamberC,
}) => {
  return (
    <group>
      {/* 1. Polished Concrete Warehouse Flooring */}
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[44, 34]} />
        <meshStandardMaterial
          color="#F1F5F9"
          roughness={0.25}
          metalness={0.15}
        />
      </mesh>

      {/* Safety Floor Walkway / Forklift Lane Lines */}
      {[-8, 0, 8].map((z, idx) => (
        <mesh key={`lane-${idx}`} position={[0, 0.005, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[42, 0.15]} />
          <meshBasicMaterial color="#EAB308" />
        </mesh>
      ))}

      {/* 2. Perimeter Walls */}
      {/* Back Wall */}
      <mesh position={[0, 5, -16.5]}>
        <boxGeometry args={[44, 10, 0.4]} />
        <meshStandardMaterial color="#E2E8F0" roughness={0.7} />
      </mesh>

      {/* Front Wall (with Loading Dock Openings) */}
      <mesh position={[-14, 5, 16.5]}>
        <boxGeometry args={[16, 10, 0.4]} />
        <meshStandardMaterial color="#E2E8F0" roughness={0.7} />
      </mesh>
      <mesh position={[14, 5, 16.5]}>
        <boxGeometry args={[16, 10, 0.4]} />
        <meshStandardMaterial color="#E2E8F0" roughness={0.7} />
      </mesh>
      {/* Roll-up Dock Shutter Doors */}
      <mesh position={[0, 3.2, 16.4]}>
        <boxGeometry args={[10, 6.4, 0.15]} />
        <meshStandardMaterial color="#1E40AF" roughness={0.4} metalness={0.6} />
      </mesh>

      {/* Left Wall */}
      <mesh position={[-21.8, 5, 0]}>
        <boxGeometry args={[0.4, 10, 33]} />
        <meshStandardMaterial color="#CBD5E1" roughness={0.7} />
      </mesh>

      {/* Right Wall */}
      <mesh position={[21.8, 5, 0]}>
        <boxGeometry args={[0.4, 10, 33]} />
        <meshStandardMaterial color="#CBD5E1" roughness={0.7} />
      </mesh>

      {/* 3. Roof Steel Trusses & Structural Overhead Beams */}
      {[-12, -4, 4, 12].map((x, idx) => (
        <group key={`truss-${idx}`} position={[x, 9.2, 0]}>
          <mesh>
            <boxGeometry args={[0.3, 0.4, 32.5]} />
            <meshStandardMaterial color="#475569" roughness={0.5} metalness={0.7} />
          </mesh>
          {/* Vertical Columns */}
          <mesh position={[0, -4.6, -15.5]}>
            <boxGeometry args={[0.4, 9.2, 0.4]} />
            <meshStandardMaterial color="#334155" roughness={0.5} metalness={0.8} />
          </mesh>
          <mesh position={[0, -4.6, 15.5]}>
            <boxGeometry args={[0.4, 9.2, 0.4]} />
            <meshStandardMaterial color="#334155" roughness={0.5} metalness={0.8} />
          </mesh>
        </group>
      ))}

      {/* 4. Industrial High-Bay LED Light Fixtures (Overhead illumination) */}
      {[
        [-10, 8.8, -8],
        [-10, 8.8, 4],
        [0, 8.8, -8],
        [0, 8.8, 4],
        [10, 8.8, -8],
        [10, 8.8, 4],
      ].map(([x, y, z], idx) => (
        <group key={`light-${idx}`} position={[x, y, z]}>
          <mesh>
            <cylinderGeometry args={[0.4, 0.7, 0.25, 16]} />
            <meshStandardMaterial color="#1E293B" metalness={0.8} />
          </mesh>
          <mesh position={[0, -0.15, 0]}>
            <circleGeometry args={[0.35, 16]} />
            <meshBasicMaterial color="#EFF6FF" />
          </mesh>
        </group>
      ))}

      {/* 5. Transparent Acrylic Chamber Partitions */}
      {/* Partition between Chamber A and Chamber B */}
      <mesh position={[-6.5, 4.5, -4]}>
        <boxGeometry args={[0.1, 9, 23]} />
        <meshPhysicalMaterial
          color="#93C5FD"
          transparent
          opacity={0.16}
          roughness={0.1}
          transmission={0.85}
          thickness={0.2}
        />
      </mesh>

      {/* Partition between Chamber B and Chamber C */}
      <mesh position={[6.5, 4.5, -4]}>
        <boxGeometry args={[0.1, 9, 23]} />
        <meshPhysicalMaterial
          color="#93C5FD"
          transparent
          opacity={0.16}
          roughness={0.1}
          transmission={0.85}
          thickness={0.2}
        />
      </mesh>

      {/* 6. Industrial Evaporator & Cooling Condenser Blower Units (Rear Wall) */}
      {[
        { x: -14, name: 'Chamber A Evaporator', temp: chamberA.tempC },
        { x: 0, name: 'Chamber B Evaporator', temp: chamberB.tempC },
        { x: 14, name: 'Chamber C Evaporator', temp: chamberC.tempC },
      ].map((ch, idx) => (
        <group key={`evap-${idx}`} position={[ch.x, 7.5, -15.8]}>
          {/* Main Housing */}
          <mesh>
            <boxGeometry args={[4.2, 1.8, 1.2]} />
            <meshStandardMaterial color="#F8FAFC" roughness={0.3} metalness={0.4} />
          </mesh>
          {/* Dual Blowers Grille */}
          <mesh position={[-1.1, 0, 0.61]}>
            <circleGeometry args={[0.65, 24]} />
            <meshBasicMaterial color="#0284C7" />
          </mesh>
          <mesh position={[1.1, 0, 0.61]}>
            <circleGeometry args={[0.65, 24]} />
            <meshBasicMaterial color="#0284C7" />
          </mesh>
          {/* Active status LED */}
          <mesh position={[1.8, 0.65, 0.62]}>
            <sphereGeometry args={[0.06, 12, 12]} />
            <meshBasicMaterial color="#22C55E" />
          </mesh>
        </group>
      ))}

      {/* 7. Wall Signage Banners */}
      {/* Chamber A Banner */}
      <group position={[-14, 7, -4]}>
        <mesh position={[0, 1.8, 0]}>
          <planeGeometry args={[4.8, 0.65]} />
          <meshBasicMaterial color="#1E40AF" />
        </mesh>
      </group>

      {/* Chamber B Banner */}
      <group position={[0, 7, -4]}>
        <mesh position={[0, 1.8, 0]}>
          <planeGeometry args={[4.8, 0.65]} />
          <meshBasicMaterial color="#047857" />
        </mesh>
      </group>

      {/* Chamber C Banner */}
      <group position={[14, 7, -4]}>
        <mesh position={[0, 1.8, 0]}>
          <planeGeometry args={[4.8, 0.65]} />
          <meshBasicMaterial color="#4338CA" />
        </mesh>
      </group>
    </group>
  );
};

