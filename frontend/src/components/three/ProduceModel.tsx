import React, { useMemo } from 'react';
import * as THREE from 'three';

interface ProduceModelProps {
  commodity: 'banana' | 'orange' | 'mango' | 'guava' | 'grape' | 'tomato' | 'potato' | 'apple' | string;
  qualityScore: number; // 0 to 100
  position?: [number, number, number];
  scale?: number;
}

export const ProduceModel: React.FC<ProduceModelProps> = ({
  commodity,
  qualityScore,
  position = [0, 0, 0],
  scale = 1.0,
}) => {
  // Normalize commodity name
  const comm = commodity.toLowerCase();

  // Spoilage calculation:
  // 100% -> freshFactor = 1.0 (vibrant, shiny, healthy hue)
  // 0%   -> freshFactor = 0.0 (dark necrotic spots, withered brown/black)
  const freshness = Math.max(0, Math.min(100, qualityScore)) / 100.0;

  const { baseColor, decayColor, roughness, metalness } = useMemo(() => {
    let freshHex = '#EF4444'; // Red default (Tomato)
    let rotHex = '#451A03';   // Dark rotten brown

    if (comm.includes('tomato')) {
      freshHex = '#EF4444'; // Bright glossy red
      rotHex = '#3B1A10';   // Decayed brownish-black
    } else if (comm.includes('banana')) {
      freshHex = '#FACC15'; // Golden yellow
      rotHex = '#271B04';   // Blackened banana skin
    } else if (comm.includes('mango')) {
      freshHex = '#F59E0B'; // Rich mango amber/orange
      rotHex = '#451A03';   // Soft rot brown
    } else if (comm.includes('potato')) {
      freshHex = '#D97706'; // Earthy potato skin
      rotHex = '#292524';   // Moldy dark gray-black
    } else if (comm.includes('apple')) {
      freshHex = '#DC2626'; // Deep apple red
      rotHex = '#422006';   // Bruised browning
    } else if (comm.includes('grape')) {
      freshHex = '#7C3AED'; // Deep translucent purple
      rotHex = '#1E1B4B';   // Shriveled raisin dark
    } else if (comm.includes('orange')) {
      freshHex = '#EA580C'; // Vibrant citrus orange
      rotHex = '#1C1917';   // Moldy dark greenish-black decay
    } else if (comm.includes('guava')) {
      freshHex = '#84CC16'; // Crisp light green turning lime
      rotHex = '#3B2F2F';   // Soft brown necrotic skin
    }

    const cFresh = new THREE.Color(freshHex);
    const cRot = new THREE.Color(rotHex);

    // Color lerp based on freshness
    const finalColor = new THREE.Color().lerpColors(cRot, cFresh, Math.pow(freshness, 0.7));

    // Fresh produce is glossier; decayed produce is rough and dull
    const r = THREE.MathUtils.lerp(0.92, 0.25, freshness);
    const m = THREE.MathUtils.lerp(0.05, 0.15, freshness);

    return {
      baseColor: finalColor,
      decayColor: cRot,
      roughness: r,
      metalness: m,
    };
  }, [comm, freshness]);

  // Procedural geometries for each produce type
  if (comm.includes('banana')) {
    // Curved banana cluster
    return (
      <group position={position} scale={[scale, scale, scale]}>
        {[-0.12, 0, 0.12].map((offset, i) => (
          <mesh key={i} position={[offset, 0, Math.sin(offset) * 0.05]} rotation={[0.2, 0.1 * i, 0.3 * (i - 1)]}>
            <cylinderGeometry args={[0.045, 0.035, 0.38, 12]} />
            <meshStandardMaterial
              color={baseColor}
              roughness={roughness}
              metalness={metalness}
            />
          </mesh>
        ))}
      </group>
    );
  }

  if (comm.includes('mango')) {
    // Ovoid asymmetrical mango
    return (
      <group position={position} scale={[scale, scale, scale]}>
        <mesh scale={[1.0, 1.35, 0.85]}>
          <sphereGeometry args={[0.13, 20, 20]} />
          <meshStandardMaterial
            color={baseColor}
            roughness={roughness}
            metalness={metalness}
          />
        </mesh>
      </group>
    );
  }

  if (comm.includes('orange')) {
    // Citrus sphere with peel texture and green stem button
    return (
      <group position={position} scale={[scale, scale, scale]}>
        <mesh scale={[1.05, 1.0, 1.05]}>
          <sphereGeometry args={[0.13, 24, 24]} />
          <meshStandardMaterial
            color={baseColor}
            roughness={Math.max(0.38, roughness)}
            metalness={metalness * 0.5}
          />
        </mesh>
        {/* Tiny green stem button */}
        <mesh position={[0, 0.13, 0]}>
          <cylinderGeometry args={[0.012, 0.018, 0.015, 6]} />
          <meshStandardMaterial color={freshness > 0.4 ? '#166534' : '#451A03'} roughness={0.8} />
        </mesh>
        {/* Mold patch visible when decayed */}
        {freshness < 0.5 && (
          <mesh position={[0.06, 0.05, 0.08]} rotation={[0.4, 0.2, 0.1]}>
            <circleGeometry args={[0.055, 12]} />
            <meshStandardMaterial color="#064E3B" roughness={0.95} transparent opacity={0.85 * (1 - freshness)} />
          </mesh>
        )}
      </group>
    );
  }

  if (comm.includes('guava')) {
    // Pear-shaped ribbed guava with persistent bottom calyx
    return (
      <group position={position} scale={[scale, scale, scale]}>
        <mesh scale={[0.95, 1.15, 0.95]}>
          <sphereGeometry args={[0.13, 22, 22]} />
          <meshStandardMaterial
            color={baseColor}
            roughness={roughness}
            metalness={metalness * 0.2}
          />
        </mesh>
        {/* Persistent bottom calyx crown */}
        <mesh position={[0, -0.14, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.035, 0.03, 5]} />
          <meshStandardMaterial color="#365314" roughness={0.9} />
        </mesh>
      </group>
    );
  }

  if (comm.includes('potato')) {
    // Lumpy elongated potato
    return (
      <group position={position} scale={[scale, scale, scale]}>
        <mesh scale={[1.2, 0.85, 0.95]} rotation={[0.1, 0.3, 0]}>
          <dodecahedronGeometry args={[0.12, 2]} />
          <meshStandardMaterial
            color={baseColor}
            roughness={roughness}
            metalness={0.0}
          />
        </mesh>
      </group>
    );
  }

  if (comm.includes('apple')) {
    // Apple with indented top and stem
    return (
      <group position={position} scale={[scale, scale, scale]}>
        <mesh scale={[1.05, 0.95, 1.05]}>
          <sphereGeometry args={[0.13, 24, 24]} />
          <meshStandardMaterial
            color={baseColor}
            roughness={roughness}
            metalness={metalness}
          />
        </mesh>
        {/* Tiny apple stem */}
        <mesh position={[0, 0.13, 0]}>
          <cylinderGeometry args={[0.008, 0.01, 0.05, 6]} />
          <meshStandardMaterial color="#451A03" roughness={0.9} />
        </mesh>
      </group>
    );
  }

  if (comm.includes('grape')) {
    // Clustered bunch of grapes
    return (
      <group position={position} scale={[scale, scale, scale]}>
        {[
          [0, 0.08, 0],
          [-0.05, 0.04, 0.04],
          [0.05, 0.04, -0.04],
          [0.05, 0.04, 0.04],
          [-0.05, 0.04, -0.04],
          [-0.03, -0.02, 0.02],
          [0.03, -0.02, -0.02],
          [0, -0.06, 0],
        ].map((pos, idx) => (
          <mesh key={idx} position={pos as [number, number, number]}>
            <sphereGeometry args={[0.04, 14, 14]} />
            <meshStandardMaterial
              color={baseColor}
              roughness={roughness * 0.8}
              metalness={metalness}
            />
          </mesh>
        ))}
      </group>
    );
  }

  // Default: Tomato (glossy indented sphere with green calyx)
  return (
    <group position={position} scale={[scale, scale, scale]}>
      <mesh scale={[1.1, 0.95, 1.1]}>
        <sphereGeometry args={[0.13, 22, 22]} />
        <meshStandardMaterial
          color={baseColor}
          roughness={roughness}
          metalness={metalness}
        />
      </mesh>
      {/* Green 5-point calyx on top */}
      <mesh position={[0, 0.125, 0]} rotation={[0, 0, 0]}>
        <coneGeometry args={[0.05, 0.025, 5]} />
        <meshStandardMaterial
          color={freshness > 0.4 ? '#15803D' : '#57534E'}
          roughness={0.7}
        />
      </mesh>
    </group>
  );
};

