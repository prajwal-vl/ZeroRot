import React from 'react';
import * as THREE from 'three';
import { ProduceModel } from './ProduceModel';

interface HandTruckProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  commodity?: string;
  qualityScore?: number;
}

export const HandTruck: React.FC<HandTruckProps> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  commodity = 'orange',
  qualityScore = 94.0,
}) => {
  const frameColor = '#DC2626'; // High-visibility industrial crimson red
  const metalColor = '#475569';
  const wheelRubberColor = '#1E293B';

  return (
    <group position={position} rotation={rotation}>
      {/* 1. Wheels & Axle */}
      <mesh position={[0, 0.22, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, 0.65, 8]} />
        <meshStandardMaterial color={metalColor} metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Left Wheel */}
      <mesh position={[-0.32, 0.22, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.18, 0.18, 0.08, 18]} />
        <meshStandardMaterial color={wheelRubberColor} roughness={0.9} />
      </mesh>
      {/* Left Wheel Rim */}
      <mesh position={[-0.32, 0.22, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.09, 0.09, 0.085, 12]} />
        <meshStandardMaterial color="#CBD5E1" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Right Wheel */}
      <mesh position={[0.32, 0.22, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.18, 0.18, 0.08, 18]} />
        <meshStandardMaterial color={wheelRubberColor} roughness={0.9} />
      </mesh>
      {/* Right Wheel Rim */}
      <mesh position={[0.32, 0.22, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.09, 0.09, 0.085, 12]} />
        <meshStandardMaterial color="#CBD5E1" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* 2. Tubular Frame (Slightly tilted back by 15 degrees) */}
      <group position={[0, 0.22, 0]} rotation={[-0.25, 0, 0]}>
        {/* Left Upright Tube */}
        <mesh position={[-0.22, 0.7, 0]}>
          <cylinderGeometry args={[0.022, 0.022, 1.4, 10]} />
          <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.4} />
        </mesh>

        {/* Right Upright Tube */}
        <mesh position={[0.22, 0.7, 0]}>
          <cylinderGeometry args={[0.022, 0.022, 1.4, 10]} />
          <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.4} />
        </mesh>

        {/* Horizontal Crossbars */}
        {[0.3, 0.65, 1.0, 1.35].map((y, i) => (
          <mesh key={i} position={[0, y, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.016, 0.016, 0.44, 8]} />
            <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.4} />
          </mesh>
        ))}

        {/* Ergonomic Loop Handle at Top */}
        <mesh position={[0, 1.45, -0.06]} rotation={[0.4, 0, 0]}>
          <boxGeometry args={[0.46, 0.04, 0.12]} />
          <meshStandardMaterial color="#0F172A" roughness={0.8} />
        </mesh>

        {/* Bottom Lift Toe Plate (Nose) */}
        <mesh position={[0, 0.02, 0.24]} rotation={[0.25, 0, 0]}>
          <boxGeometry args={[0.52, 0.02, 0.42]} />
          <meshStandardMaterial color={frameColor} roughness={0.5} metalness={0.5} />
        </mesh>

        {/* 3. Transport Crate loaded with Fruit on Hand Truck */}
        <group position={[0, 0.22, 0.22]} rotation={[0.25, 0, 0]}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.48, 0.28, 0.38]} />
            <meshStandardMaterial color="#0284C7" roughness={0.4} metalness={0.1} />
          </mesh>
          {/* Fruit inside Hand Truck Crate */}
          <ProduceModel
            commodity={commodity}
            qualityScore={qualityScore}
            position={[0, 0.12, 0]}
            scale={0.9}
          />
        </group>
      </group>
    </group>
  );
};
