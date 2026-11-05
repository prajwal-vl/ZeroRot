import React, { useMemo } from 'react';
import * as THREE from 'three';

interface ThermalHeatmapProps {
  chamberA_temp: number;
  chamberB_temp: number;
  chamberC_temp: number;
  visible?: boolean;
}

export const ThermalHeatmap: React.FC<ThermalHeatmapProps> = ({
  chamberA_temp,
  chamberB_temp,
  chamberC_temp,
  visible = true,
}) => {
  if (!visible) return null;

  // Temperature color helper
  const getTempColor = (tempC: number) => {
    if (tempC <= 4) return '#2563EB'; // Cold Blue
    if (tempC <= 14) return '#10B981'; // Optimal Green
    if (tempC <= 22) return '#F59E0B'; // Warning Yellow
    return '#EF4444'; // Danger Red
  };

  const colorA = getTempColor(chamberA_temp);
  const colorB = getTempColor(chamberB_temp);
  const colorC = getTempColor(chamberC_temp);

  return (
    <group position={[0, 0.05, -3]}>
      {/* Chamber A Heatmap Zone */}
      <mesh position={[-14, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12.5, 22]} />
        <meshBasicMaterial
          color={colorA}
          transparent
          opacity={0.28}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Chamber B Heatmap Zone */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12.5, 22]} />
        <meshBasicMaterial
          color={colorB}
          transparent
          opacity={0.28}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Chamber C Heatmap Zone */}
      <mesh position={[14, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12.5, 22]} />
        <meshBasicMaterial
          color={colorC}
          transparent
          opacity={0.28}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};

