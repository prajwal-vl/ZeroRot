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
  count = 180,
  color = '#60A5FA',
}) => {
  const pointsRef = useRef<THREE.Points>(null!);

  // Generate initial particle positions
  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Scatter particles across 3 aisles
      const aisleX = (i % 3 === 0 ? -14 : i % 3 === 1 ? 0 : 14) + (Math.random() - 0.5) * 6;
      const aisleY = 6.8 - Math.random() * 4.5;
      const aisleZ = -14 + Math.random() * 26;

      pos[i * 3] = aisleX;
      pos[i * 3 + 1] = aisleY;
      pos[i * 3 + 2] = aisleZ;

      // Velocity forward along Z axis
      vel[i * 3] = (Math.random() - 0.5) * 0.05;
      vel[i * 3 + 1] = -0.015 - Math.random() * 0.02;
      vel[i * 3 + 2] = 0.12 + Math.random() * 0.15;
    }

    return { positions: pos, velocities: vel };
  }, [count]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const geom = pointsRef.current.geometry;
    const posArr = geom.attributes.position.array as Float32Array;

    const actualSpeed = delta * 12 * speed;

    for (let i = 0; i < count; i++) {
      posArr[i * 3 + 2] += velocities[i * 3 + 2] * actualSpeed;
      posArr[i * 3 + 1] += velocities[i * 3 + 1] * actualSpeed;

      // Loop back to condenser vent when reaching front of warehouse
      if (posArr[i * 3 + 2] > 12) {
        posArr[i * 3 + 2] = -14;
        posArr[i * 3 + 1] = 6.8;
      }
      if (posArr[i * 3 + 1] < 0.6) {
        posArr[i * 3 + 1] = 6.8;
        posArr[i * 3 + 2] = -14;
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
        size={0.16}
        color={color}
        transparent
        opacity={0.65}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};

