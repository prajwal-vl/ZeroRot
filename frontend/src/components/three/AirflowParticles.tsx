import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface AirflowParticlesProps {
  speed?: number;
  count?: number;
  color?: string;
}

export const AirflowParticles: React.FC<AirflowParticlesProps> = ({
  speed = 1.0,
  count = 320,
  color = '#38BDF8',
}) => {
  const pointsRef = useRef<THREE.Points>(null!);

  // Generate particle positions distributed along all 5 fruit bay corridors
  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const bays = [-16, -8, 0, 8, 16];

    for (let i = 0; i < count; i++) {
      const bayBaseX = bays[i % bays.length];
      const aisleX = bayBaseX + (Math.random() - 0.5) * 5.5;
      const aisleY = 1.2 + Math.random() * 6.8;
      const aisleZ = -15 + Math.random() * 29;

      pos[i * 3] = aisleX;
      pos[i * 3 + 1] = aisleY;
      pos[i * 3 + 2] = aisleZ;

      // Downward & forward flow from high rear blowers toward front floor
      vel[i * 3] = (Math.random() - 0.5) * 0.04;
      vel[i * 3 + 1] = -0.02 - Math.random() * 0.03;
      vel[i * 3 + 2] = 0.16 + Math.random() * 0.18;
    }

    return { positions: pos, velocities: vel };
  }, [count]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const geom = pointsRef.current.geometry;
    const posArr = geom.attributes.position.array as Float32Array;

    const actualSpeed = delta * 14 * speed;

    for (let i = 0; i < count; i++) {
      posArr[i * 3] += velocities[i * 3] * actualSpeed;
      posArr[i * 3 + 1] += velocities[i * 3 + 1] * actualSpeed;
      posArr[i * 3 + 2] += velocities[i * 3 + 2] * actualSpeed;

      // When reaching front loading dock or floor, loop back up to rear evaporator intake
      if (posArr[i * 3 + 2] > 14 || posArr[i * 3 + 1] < 0.4) {
        posArr[i * 3 + 2] = -15.5;
        posArr[i * 3 + 1] = 7.5 + Math.random() * 0.8;
      }
    }

    geom.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.18}
        color={color}
        transparent
        opacity={0.7}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};
