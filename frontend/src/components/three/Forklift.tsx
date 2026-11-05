import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ProduceModel } from './ProduceModel';

interface ForkliftProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  cargoCommodity?: string;
  cargoQuality?: number;
}

export const Forklift: React.FC<ForkliftProps> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1.0,
  cargoCommodity = 'orange',
  cargoQuality = 94.0,
}) => {
  const beaconRef = useRef<THREE.PointLight>(null!);
  const beaconMeshRef = useRef<THREE.Mesh>(null!);

  // Flashing amber beacon animation
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const flash = Math.sin(t * 8) > 0.2;
    if (beaconRef.current) {
      beaconRef.current.intensity = flash ? 1.5 : 0.1;
    }
    if (beaconMeshRef.current) {
      const mat = beaconMeshRef.current.material as THREE.MeshBasicMaterial;
      mat.color.setHex(flash ? 0xF59E0B : 0x78350F);
    }
  });

  // Industrial Colors
  const chassisYellow = '#F59E0B'; // OSHA Safety Amber
  const counterweightColor = '#1E293B'; // Heavy cast iron slate
  const mastSteel = '#334155'; // Dark structural steel
  const tireRubber = '#0F172A'; // Treaded black rubber
  const wheelRim = '#94A3B8'; // Steel rim
  const forkSteel = '#475569'; // Forged alloy steel
  const safetyCage = '#0F172A'; // Black tubular rollover bar

  return (
    <group position={position} rotation={rotation} scale={[scale, scale, scale]}>
      {/* 1. Main Chassis & Counterweight Body */}
      <group position={[0, 0.75, 0]}>
        {/* Lower Chassis Base */}
        <mesh position={[0, 0, -0.2]}>
          <boxGeometry args={[1.6, 0.65, 2.2]} />
          <meshStandardMaterial color={chassisYellow} roughness={0.35} metalness={0.4} />
        </mesh>

        {/* Heavy Rear Counterweight with Curved Profile */}
        <mesh position={[0, 0.2, -1.2]}>
          <boxGeometry args={[1.58, 0.9, 0.7]} />
          <meshStandardMaterial color={counterweightColor} roughness={0.6} metalness={0.7} />
        </mesh>

        {/* Hazard Stripes on Counterweight */}
        <mesh position={[0, -0.05, -1.56]} rotation={[0, 0, 0]}>
          <planeGeometry args={[1.4, 0.25]} />
          <meshStandardMaterial color="#EAB308" roughness={0.5} />
        </mesh>

        {/* Engine Cowling / Battery Compartment Hood */}
        <mesh position={[0, 0.45, -0.3]}>
          <boxGeometry args={[1.4, 0.4, 1.2]} />
          <meshStandardMaterial color={chassisYellow} roughness={0.3} metalness={0.4} />
        </mesh>

        {/* Front Dashboard Console */}
        <mesh position={[0, 0.6, 0.45]}>
          <boxGeometry args={[1.2, 0.5, 0.35]} />
          <meshStandardMaterial color="#0F172A" roughness={0.7} />
        </mesh>

        {/* Steering Column & Wheel */}
        <group position={[-0.2, 0.9, 0.4]} rotation={[0.4, 0, 0]}>
          <mesh>
            <cylinderGeometry args={[0.03, 0.03, 0.4, 8]} />
            <meshStandardMaterial color="#334155" metalness={0.8} />
          </mesh>
          <mesh position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.18, 0.025, 8, 20]} />
            <meshStandardMaterial color="#0F172A" roughness={0.8} />
          </mesh>
        </group>

        {/* Ergonomic Operator Seat */}
        <group position={[0, 0.75, -0.2]}>
          {/* Seat Cushion */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.65, 0.12, 0.6]} />
            <meshStandardMaterial color="#1E293B" roughness={0.8} />
          </mesh>
          {/* Seat Backrest */}
          <mesh position={[0, 0.35, -0.28]} rotation={[-0.1, 0, 0]}>
            <boxGeometry args={[0.6, 0.6, 0.12]} />
            <meshStandardMaterial color="#1E293B" roughness={0.8} />
          </mesh>
        </group>
      </group>

      {/* 2. Overhead Protective Guard (ROPS / FOPS Cage) */}
      <group position={[0, 1.9, -0.2]}>
        {/* 4 Corner Tubular Uprights */}
        {[
          [-0.68, -0.85],
          [0.68, -0.85],
          [-0.68, 0.75],
          [0.68, 0.75],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, -0.3, z]}>
            <cylinderGeometry args={[0.035, 0.035, 1.45, 8]} />
            <meshStandardMaterial color={safetyCage} roughness={0.5} metalness={0.6} />
          </mesh>
        ))}

        {/* Overhead Roof Grid */}
        <mesh position={[0, 0.45, -0.05]}>
          <boxGeometry args={[1.42, 0.05, 1.7]} />
          <meshStandardMaterial color={safetyCage} roughness={0.5} metalness={0.6} />
        </mesh>
        {/* Roof Cross Slats */}
        {[-0.6, -0.3, 0, 0.3, 0.6].map((z, idx) => (
          <mesh key={`slat-${idx}`} position={[0, 0.48, z]}>
            <boxGeometry args={[1.35, 0.03, 0.06]} />
            <meshStandardMaterial color="#334155" metalness={0.7} />
          </mesh>
        ))}

        {/* Amber Flashing Safety Strobe Beacon on Roof */}
        <group position={[0, 0.58, -0.7]}>
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.07, 0.14, 12]} />
            <meshStandardMaterial color="#1E293B" metalness={0.8} />
          </mesh>
          <mesh ref={beaconMeshRef} position={[0, 0.1, 0]}>
            <sphereGeometry args={[0.075, 12, 12]} />
            <meshBasicMaterial color="#F59E0B" />
          </mesh>
          <pointLight ref={beaconRef} color="#F59E0B" intensity={1.2} distance={8} />
        </group>
      </group>

      {/* 3. Telescopic Dual-Stage Mast Assembly (Front) */}
      <group position={[0, 1.5, 0.95]}>
        {/* Left Outer Mast I-Beam */}
        <mesh position={[-0.45, 0, 0]}>
          <boxGeometry args={[0.08, 2.8, 0.12]} />
          <meshStandardMaterial color={mastSteel} roughness={0.4} metalness={0.8} />
        </mesh>
        {/* Right Outer Mast I-Beam */}
        <mesh position={[0.45, 0, 0]}>
          <boxGeometry args={[0.08, 2.8, 0.12]} />
          <meshStandardMaterial color={mastSteel} roughness={0.4} metalness={0.8} />
        </mesh>

        {/* Horizontal Mast Braces */}
        {[-0.9, 0, 0.9, 1.35].map((y, idx) => (
          <mesh key={`brace-${idx}`} position={[0, y, 0]}>
            <boxGeometry args={[0.92, 0.06, 0.05]} />
            <meshStandardMaterial color={mastSteel} roughness={0.4} metalness={0.8} />
          </mesh>
        ))}

        {/* Hydraulic Lift Cylinder in Center */}
        <mesh position={[0, -0.1, -0.02]}>
          <cylinderGeometry args={[0.045, 0.045, 2.1, 12]} />
          <meshStandardMaterial color="#0284C7" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.8, -0.02]}>
          <cylinderGeometry args={[0.03, 0.03, 1.0, 12]} />
          <meshStandardMaterial color="#CBD5E1" metalness={0.95} roughness={0.1} />
        </mesh>

        {/* 4. Fork Carriage & Forged Steel Forks */}
        <group position={[0, -0.9, 0.1]}>
          {/* Carriage Plate */}
          <mesh position={[0, 0.35, 0]}>
            <boxGeometry args={[0.98, 0.45, 0.06]} />
            <meshStandardMaterial color={forkSteel} metalness={0.8} roughness={0.3} />
          </mesh>

          {/* Left Fork */}
          <group position={[-0.28, 0, 0]}>
            {/* Vertical Shank */}
            <mesh position={[0, 0.28, 0.03]}>
              <boxGeometry args={[0.08, 0.58, 0.04]} />
              <meshStandardMaterial color={forkSteel} metalness={0.8} roughness={0.3} />
            </mesh>
            {/* Horizontal Blade extending forward */}
            <mesh position={[0, 0.02, 0.65]}>
              <boxGeometry args={[0.08, 0.035, 1.25]} />
              <meshStandardMaterial color={forkSteel} metalness={0.85} roughness={0.25} />
            </mesh>
          </group>

          {/* Right Fork */}
          <group position={[0.28, 0, 0]}>
            {/* Vertical Shank */}
            <mesh position={[0, 0.28, 0.03]}>
              <boxGeometry args={[0.08, 0.58, 0.04]} />
              <meshStandardMaterial color={forkSteel} metalness={0.8} roughness={0.3} />
            </mesh>
            {/* Horizontal Blade */}
            <mesh position={[0, 0.02, 0.65]}>
              <boxGeometry args={[0.08, 0.035, 1.25]} />
              <meshStandardMaterial color={forkSteel} metalness={0.85} roughness={0.25} />
            </mesh>
          </group>

          {/* 5. Loaded Wooden EURO Pallet on Forks */}
          <group position={[0, 0.08, 0.68]}>
            {/* Pallet Stringer Runners (Bottom) */}
            {[-0.45, 0, 0.45].map((x, idx) => (
              <mesh key={`runner-${idx}`} position={[x, 0.035, 0]}>
                <boxGeometry args={[0.08, 0.07, 1.1]} />
                <meshStandardMaterial color="#B45309" roughness={0.85} />
              </mesh>
            ))}
            {/* Pallet Top Deck Boards */}
            {[-0.45, -0.22, 0, 0.22, 0.45].map((z, idx) => (
              <mesh key={`deck-${idx}`} position={[0, 0.085, z]}>
                <boxGeometry args={[1.08, 0.03, 0.16]} />
                <meshStandardMaterial color="#D97706" roughness={0.8} />
              </mesh>
            ))}

            {/* Produce Transport Crate stacked on pallet */}
            <group position={[0, 0.28, 0]}>
              <mesh>
                <boxGeometry args={[0.92, 0.32, 0.92]} />
                <meshStandardMaterial color="#0284C7" roughness={0.4} metalness={0.2} />
              </mesh>
              {/* Fresh produce cargo loaded in crate */}
              {[-0.22, 0.22].map((x, xi) =>
                [-0.22, 0.22].map((z, zi) => (
                  <ProduceModel
                    key={`fruit-${xi}-${zi}`}
                    commodity={cargoCommodity}
                    qualityScore={cargoQuality}
                    position={[x, 0.14, z]}
                    scale={0.85}
                  />
                ))
              )}
            </group>
          </group>
        </group>
      </group>

      {/* 6. Heavy-Duty Wheels */}
      {/* Front Left Drive Wheel */}
      <group position={[-0.78, 0.42, 0.65]} rotation={[0, 0, Math.PI / 2]}>
        <mesh>
          <cylinderGeometry args={[0.42, 0.42, 0.26, 20]} />
          <meshStandardMaterial color={tireRubber} roughness={0.9} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.22, 0.22, 0.265, 14]} />
          <meshStandardMaterial color={wheelRim} metalness={0.7} roughness={0.3} />
        </mesh>
      </group>

      {/* Front Right Drive Wheel */}
      <group position={[0.78, 0.42, 0.65]} rotation={[0, 0, Math.PI / 2]}>
        <mesh>
          <cylinderGeometry args={[0.42, 0.42, 0.26, 20]} />
          <meshStandardMaterial color={tireRubber} roughness={0.9} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.22, 0.22, 0.265, 14]} />
          <meshStandardMaterial color={wheelRim} metalness={0.7} roughness={0.3} />
        </mesh>
      </group>

      {/* Rear Left Steer Wheel */}
      <group position={[-0.65, 0.32, -0.9]} rotation={[0, 0.2, Math.PI / 2]}>
        <mesh>
          <cylinderGeometry args={[0.32, 0.32, 0.2, 18]} />
          <meshStandardMaterial color={tireRubber} roughness={0.9} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.16, 0.16, 0.205, 12]} />
          <meshStandardMaterial color={wheelRim} metalness={0.7} roughness={0.3} />
        </mesh>
      </group>

      {/* Rear Right Steer Wheel */}
      <group position={[0.65, 0.32, -0.9]} rotation={[0, 0.2, Math.PI / 2]}>
        <mesh>
          <cylinderGeometry args={[0.32, 0.32, 0.2, 18]} />
          <meshStandardMaterial color={tireRubber} roughness={0.9} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.16, 0.16, 0.205, 12]} />
          <meshStandardMaterial color={wheelRim} metalness={0.7} roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
};

