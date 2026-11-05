import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface AirflowParticlesProps {
  speed?: number;
  count?: number;
  color?: string;
  coolingActive?: boolean;
}

export const AirflowParticles: React.FC<AirflowParticlesProps> = ({
  speed = 1.0,
  count = 420,
  color,
  coolingActive = true,
}) => {
  const pointsRef = useRef<THREE.Points>(null!);
  const matRef = useRef<THREE.PointsMaterial>(null!);

  // Generate particle positions distributed along all 5 fruit bay corridors
  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const bays = [-16, -8, 0, 8, 16];

    for (let i = 0; i < count; i++) {
      const bayBaseX = bays[i % bays.length];
      const aisleX = bayBaseX + (Math.random() - 0.5) * 5.5;
      const aisleY = 1.0 + Math.random() * 7.5;
      const aisleZ = -16 + Math.random() * 31;

      pos[i * 3] = aisleX;
      pos[i * 3 + 1] = aisleY;
      pos[i * 3 + 2] = aisleZ;

      // Downward & forward flow from high rear blowers toward front floor
      vel[i * 3] = (Math.random() - 0.5) * 0.05;
      vel[i * 3 + 1] = -0.02 - Math.random() * 0.035;
      vel[i * 3 + 2] = 0.18 + Math.random() * 0.22;
    }

    return { positions: pos, velocities: vel };
  }, [count]);

  const activeColor = useMemo(() => {
    if (color) return color;
    return coolingActive ? '#38BDF8' : '#F97316';
  }, [color, coolingActive]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const geom = pointsRef.current.geometry;
    const posArr = geom.attributes.position.array as Float32Array;

    // When cooling active: fast downward/forward laminar sweep
    // When cooling inactive (fault): sluggish erratic upward thermal buoyancy drift
    const actualSpeed = delta * (coolingActive ? 16 * speed : 5 * speed);

    for (let i = 0; i < count; i++) {
      if (coolingActive) {
        posArr[i * 3] += velocities[i * 3] * actualSpeed;
        posArr[i * 3 + 1] += velocities[i * 3 + 1] * actualSpeed;
        posArr[i * 3 + 2] += velocities[i * 3 + 2] * actualSpeed;

        if (posArr[i * 3 + 2] > 15 || posArr[i * 3 + 1] < 0.35) {
          posArr[i * 3 + 2] = -16.0;
          posArr[i * 3 + 1] = 8.0 + Math.random() * 0.8;
        }
      } else {
        // Slow turbulent thermal rise
        posArr[i * 3] += (Math.sin(posArr[i * 3 + 1] * 2) * 0.02) * actualSpeed;
        posArr[i * 3 + 1] += (0.015 + Math.random() * 0.01) * actualSpeed;
        posArr[i * 3 + 2] += (0.01) * actualSpeed;

        if (posArr[i * 3 + 1] > 9.5) {
          posArr[i * 3 + 1] = 0.5;
        }
      }
    }

    geom.attributes.position.needsUpdate = true;

    // Smoothly transition particle material color and opacity
    if (matRef.current) {
      const targetColor = new THREE.Color(activeColor);
      matRef.current.color.lerp(targetColor, 0.08);
      matRef.current.opacity = coolingActive ? 0.75 : 0.6;
    }
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
        ref={matRef}
        size={0.22}
        color={activeColor}
        transparent
        opacity={0.75}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};
