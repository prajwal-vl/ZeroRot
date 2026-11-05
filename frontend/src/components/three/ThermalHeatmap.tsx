import React from 'react';
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

  // Temperature color helper: Deep cold blue -> Cyan -> Emerald optimal -> Amber warning -> Red danger
  const getTempColor = (tempC: number) => {
    if (tempC <= 2.5) return '#2563EB'; // Cryo / Sub-zero Cold (Grape)
    if (tempC <= 7.0) return '#06B6D4'; // Citrus Chill (Orange)
    if (tempC <= 10.5) return '#10B981'; // Subtropical Optimal (Guava)
    if (tempC <= 14.5) return '#F59E0B'; // Tropical Safe Zone (Banana / Mango)
    return '#EF4444'; // Hot Thermal Danger
  };

  const bayHeatmaps = [
    { x: -16, temp: chamberA_temp, label: 'Banana (13.0°C)' },
    { x: -8, temp: chamberB_temp, label: 'Orange (8.5°C)' },
    { x: 0, temp: chamberA_temp, label: 'Mango (12.5°C)' },
    { x: 8, temp: chamberB_temp, label: 'Guava (9.0°C)' },
    { x: 16, temp: chamberC_temp, label: 'Grapes (1.5°C)' },
  ];

  return (
    <group position={[0, 0.04, -3]}>
      {bayHeatmaps.map((bay, idx) => (
        <mesh key={`heat-bay-${idx}`} position={[bay.x, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[7.4, 23]} />
          <meshBasicMaterial
            color={getTempColor(bay.temp)}
            transparent
            opacity={0.24}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
};
