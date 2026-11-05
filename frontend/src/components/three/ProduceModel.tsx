import React, { useMemo } from 'react';
import * as THREE from 'three';

interface ProduceModelProps {
  commodity: 'banana' | 'orange' | 'mango' | 'guava' | 'grape' | 'grapes' | 'tomato' | 'potato' | 'apple' | string;
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
  const comm = commodity.toLowerCase();

  // Spoilage calculation:
  // 100% -> freshFactor = 1.0 (vibrant, shiny, healthy hue)
  // 0%   -> freshFactor = 0.0 (dark necrotic spots, withered brown/black)
  const freshness = Math.max(0, Math.min(100, qualityScore)) / 100.0;

  const { baseColor, decayColor, roughness, metalness, tipColor } = useMemo(() => {
    let freshHex = '#EF4444'; // Red default (Tomato)
    let rotHex = '#451A03';   // Dark rotten brown
    let freshTipHex = '#15803D'; // Green stem/tip

    if (comm.includes('tomato')) {
      freshHex = '#EF4444'; // Bright glossy red
      rotHex = '#3B1A10';   // Decayed brownish-black
      freshTipHex = '#15803D';
    } else if (comm.includes('banana')) {
      freshHex = '#FACC15'; // Golden yellow
      rotHex = '#271B04';   // Blackened banana skin
      freshTipHex = '#65A30D'; // Lime green crown tip
    } else if (comm.includes('mango')) {
      freshHex = '#F59E0B'; // Rich mango amber/orange
      rotHex = '#451A03';   // Soft rot brown
      freshTipHex = '#D97706';
    } else if (comm.includes('potato')) {
      freshHex = '#D97706'; // Earthy potato skin
      rotHex = '#292524';   // Moldy dark gray-black
      freshTipHex = '#78350F';
    } else if (comm.includes('apple')) {
      freshHex = '#DC2626'; // Deep apple red
      rotHex = '#422006';   // Bruised browning
      freshTipHex = '#451A03';
    } else if (comm.includes('grape')) {
      freshHex = '#7C3AED'; // Deep translucent purple
      rotHex = '#1E1B4B';   // Shriveled raisin dark
      freshTipHex = '#78350F';
    } else if (comm.includes('orange')) {
      freshHex = '#EA580C'; // Vibrant citrus orange
      rotHex = '#1C1917';   // Moldy dark greenish-black decay
      freshTipHex = '#166534';
    } else if (comm.includes('guava')) {
      freshHex = '#84CC16'; // Crisp light green turning lime
      rotHex = '#3B2F2F';   // Soft brown necrotic skin
      freshTipHex = '#365314';
    }

    const cFresh = new THREE.Color(freshHex);
    const cRot = new THREE.Color(rotHex);
    const cTip = new THREE.Color(freshTipHex);

    // Color lerp based on freshness
    const finalColor = new THREE.Color().lerpColors(cRot, cFresh, Math.pow(freshness, 0.7));
    const finalTipColor = new THREE.Color().lerpColors(cRot, cTip, freshness);

    // Fresh produce is glossier; decayed produce is rough and dull
    const r = THREE.MathUtils.lerp(0.92, 0.28, freshness);
    const m = THREE.MathUtils.lerp(0.04, 0.12, freshness);

    return {
      baseColor: finalColor,
      decayColor: cRot,
      roughness: r,
      metalness: m,
      tipColor: finalTipColor,
    };
  }, [comm, freshness]);

  // Procedural geometries for each produce type

  // 1. BANANA: Realistic curved fingers in commercial bunch
  if (comm.includes('banana')) {
    return (
      <group position={position} scale={[scale, scale, scale]}>
        {/* Crown Stalk junction */}
        <mesh position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.035, 0.04, 0.08, 8]} />
          <meshStandardMaterial color={freshness > 0.6 ? '#65A30D' : '#3F2005'} roughness={0.8} />
        </mesh>
        {/* 4 Curved banana fingers radiating from stalk */}
        {[-0.14, -0.05, 0.05, 0.14].map((offset, i) => (
          <group key={i} position={[offset, 0, Math.sin(offset * 8) * 0.04]} rotation={[0.25, 0.12 * (i - 1.5), 0.28 * (i - 1.5)]}>
            {/* Main fruit body */}
            <mesh>
              <cylinderGeometry args={[0.042, 0.034, 0.38, 12]} />
              <meshStandardMaterial
                color={baseColor}
                roughness={roughness}
                metalness={metalness}
              />
            </mesh>
            {/* Green tip when fresh / dark tip when aging */}
            <mesh position={[0, -0.19, 0]}>
              <coneGeometry args={[0.032, 0.05, 10]} />
              <meshStandardMaterial
                color={freshness > 0.65 ? tipColor : '#1C1917'}
                roughness={0.7}
              />
            </mesh>
            {/* Sugar specks / senescence flecks when quality < 80% */}
            {freshness < 0.8 && freshness > 0.3 && (
              <mesh position={[0.03, 0.04, 0.03]}>
                <sphereGeometry args={[0.015, 6, 6]} />
                <meshStandardMaterial color="#451A03" roughness={0.9} />
              </mesh>
            )}
          </group>
        ))}
      </group>
    );
  }

  // 2. ORANGE: Dimpled citrus sphere with green stem button and mold spore decay
  if (comm.includes('orange')) {
    return (
      <group position={position} scale={[scale, scale, scale]}>
        <mesh scale={[1.06, 1.0, 1.06]}>
          <sphereGeometry args={[0.135, 26, 26]} />
          <meshStandardMaterial
            color={baseColor}
            roughness={Math.max(0.36, roughness)}
            metalness={metalness * 0.4}
          />
        </mesh>
        {/* Green star calyx stem button */}
        <mesh position={[0, 0.134, 0]}>
          <cylinderGeometry args={[0.015, 0.022, 0.016, 6]} />
          <meshStandardMaterial color={freshness > 0.4 ? '#166534' : '#3F2005'} roughness={0.8} />
        </mesh>
        {/* 5-point star sepals */}
        {freshness > 0.3 && (
          <mesh position={[0, 0.136, 0]}>
            <circleGeometry args={[0.032, 5]} />
            <meshStandardMaterial color="#15803D" roughness={0.9} side={THREE.DoubleSide} />
          </mesh>
        )}
        {/* Penicillium mold spore patch when quality < 50% */}
        {freshness < 0.5 && (
          <mesh position={[0.065, 0.05, 0.08]} rotation={[0.4, 0.2, 0.1]}>
            <circleGeometry args={[0.06, 14]} />
            <meshStandardMaterial color="#064E3B" roughness={0.95} transparent opacity={0.88 * (1 - freshness)} />
          </mesh>
        )}
      </group>
    );
  }

  // 3. MANGO: Asymmetric tropical drupe with blushing gradient & stem indentation
  if (comm.includes('mango')) {
    return (
      <group position={position} scale={[scale, scale, scale]}>
        <mesh scale={[1.05, 1.38, 0.88]} rotation={[0, 0, 0.12]}>
          <sphereGeometry args={[0.13, 24, 24]} />
          <meshStandardMaterial
            color={baseColor}
            roughness={roughness}
            metalness={metalness}
          />
        </mesh>
        {/* Sunset Red/Orange Blush on shoulder when fresh */}
        {freshness > 0.5 && (
          <mesh position={[0.04, 0.06, 0.05]} scale={[0.8, 0.9, 0.7]}>
            <sphereGeometry args={[0.10, 16, 16]} />
            <meshStandardMaterial
              color="#DC2626"
              transparent
              opacity={0.32 * freshness}
              roughness={roughness}
            />
          </mesh>
        )}
        {/* Woody pedicel stem at top */}
        <mesh position={[-0.02, 0.165, 0]} rotation={[0.1, 0, -0.2]}>
          <cylinderGeometry args={[0.01, 0.014, 0.045, 6]} />
          <meshStandardMaterial color="#78350F" roughness={0.9} />
        </mesh>
        {/* Soft rot anthracnose spots when degraded */}
        {freshness < 0.55 && (
          <mesh position={[0.02, -0.06, 0.07]} rotation={[0.2, 0.1, 0]}>
            <circleGeometry args={[0.045, 10]} />
            <meshStandardMaterial color="#271B04" roughness={0.95} transparent opacity={0.8 * (1 - freshness)} />
          </mesh>
        )}
      </group>
    );
  }

  // 4. GUAVA: Pear-shaped ribbed guava with persistent 5-lobed floral calyx crown
  if (comm.includes('guava')) {
    return (
      <group position={position} scale={[scale, scale, scale]}>
        {/* Main pear-shaped body */}
        <mesh scale={[0.96, 1.18, 0.96]}>
          <sphereGeometry args={[0.13, 24, 24]} />
          <meshStandardMaterial
            color={baseColor}
            roughness={roughness}
            metalness={metalness * 0.25}
          />
        </mesh>
        {/* Subtle longitudinal ribbed contours */}
        {[0, 60, 120].map((deg, idx) => (
          <mesh key={`rib-${idx}`} rotation={[0, (deg * Math.PI) / 180, 0]} scale={[0.98, 1.19, 0.93]}>
            <sphereGeometry args={[0.128, 16, 16]} />
            <meshStandardMaterial color={baseColor} roughness={roughness} transparent opacity={0.15} />
          </mesh>
        ))}
        {/* Persistent dried floral calyx crown at blossom base */}
        <mesh position={[0, -0.145, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.04, 0.035, 5]} />
          <meshStandardMaterial color="#365314" roughness={0.9} />
        </mesh>
        {/* Pedicel stalk at top */}
        <mesh position={[0, 0.14, 0]}>
          <cylinderGeometry args={[0.009, 0.012, 0.035, 6]} />
          <meshStandardMaterial color="#451A03" roughness={0.85} />
        </mesh>
      </group>
    );
  }

  // 5. GRAPES: Dense conical cluster of 14 individual grape spheres on a woody rachis
  if (comm.includes('grape')) {
    return (
      <group position={position} scale={[scale, scale, scale]}>
        {/* Central woody rachis stem */}
        <mesh position={[0, 0.06, 0]}>
          <cylinderGeometry args={[0.008, 0.012, 0.18, 6]} />
          <meshStandardMaterial color="#57381A" roughness={0.9} />
        </mesh>
        {/* 14 Individual grape berries arranged in conical bunch */}
        {[
          // Top layer (wide)
          [-0.06, 0.08, 0.04],
          [0.06, 0.08, 0.04],
          [-0.06, 0.08, -0.04],
          [0.06, 0.08, -0.04],
          [0, 0.09, 0.07],
          // Mid-upper layer
          [-0.05, 0.03, 0.05],
          [0.05, 0.03, 0.05],
          [-0.05, 0.03, -0.05],
          [0.05, 0.03, -0.05],
          [0, 0.03, 0.08],
          // Mid-lower layer
          [-0.03, -0.02, 0.03],
          [0.03, -0.02, 0.03],
          [0, -0.02, -0.04],
          // Bottom apex berry
          [0, -0.07, 0],
        ].map((pos, idx) => (
          <mesh key={idx} position={pos as [number, number, number]}>
            <sphereGeometry args={[0.042, 16, 16]} />
            <meshStandardMaterial
              color={baseColor}
              roughness={roughness * 0.75}
              metalness={metalness * 0.5}
            />
          </mesh>
        ))}
      </group>
    );
  }

  // Default: Tomato / Solanaceous produce
  return (
    <group position={position} scale={[scale, scale, scale]}>
      <mesh scale={[1.12, 0.96, 1.12]}>
        <sphereGeometry args={[0.13, 24, 24]} />
        <meshStandardMaterial
          color={baseColor}
          roughness={roughness}
          metalness={metalness}
        />
      </mesh>
      {/* Green 5-point calyx on top */}
      <mesh position={[0, 0.128, 0]} rotation={[0, 0, 0]}>
        <coneGeometry args={[0.055, 0.028, 5]} />
        <meshStandardMaterial
          color={freshness > 0.4 ? '#15803D' : '#57534E'}
          roughness={0.7}
        />
      </mesh>
    </group>
  );
};
