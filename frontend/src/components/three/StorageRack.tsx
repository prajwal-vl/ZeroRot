import React, { useState } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { ProduceModel } from './ProduceModel';

interface StorageRackProps {
  position: [number, number, number];
  rackId: string;
  chamberName: string;
  commodity: string;
  qualityScore: number;
  temperatureC: number;
  humidityPct: number;
  sectionTitle?: string;
  isSelected?: boolean;
  onSelect?: (info: {
    rackId: string;
    chamberName: string;
    commodity: string;
    qualityScore: number;
    temperatureC: number;
    humidityPct: number;
  }) => void;
}

export const StorageRack: React.FC<StorageRackProps> = ({
  position,
  rackId,
  chamberName,
  commodity,
  qualityScore,
  temperatureC,
  humidityPct,
  isSelected = false,
  onSelect,
}) => {
  const [hovered, setHovered] = useState(false);

  // Pallet & crate tiers (3 vertical tiers)
  const tiers = [0.4, 1.85, 3.3];
  const crateOffsetsX = [-0.92, 0, 0.92];

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect({
        rackId,
        chamberName,
        commodity,
        qualityScore,
        temperatureC,
        humidityPct,
      });
    }
  };

  const frameColor = isSelected ? '#3B82F6' : hovered ? '#60A5FA' : '#1E3A8A';
  const beamColor = '#EA580C'; // OSHA safety orange

  const commColors: Record<string, { bg: string; text: string; border: string }> = {
    banana: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/50' },
    orange: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/50' },
    mango: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/50' },
    guava: { bg: 'bg-lime-500/20', text: 'text-lime-400', border: 'border-lime-500/50' },
    grape: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/50' },
    grapes: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/50' },
  };
  const activeColor = commColors[commodity.toLowerCase()] || { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/50' };

  return (
    <group
      position={position}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {/* Overhead Section Header Billboard */}
      <Html position={[0, 5.1, 0]} center distanceFactor={22}>
        <div
          onClick={handleClick}
          className={`cursor-pointer transition-all duration-200 select-none px-3.5 py-1.5 rounded-lg border backdrop-blur-md shadow-2xl flex items-center gap-2.5 whitespace-nowrap ${
            isSelected
              ? 'bg-blue-950/95 border-blue-400 ring-2 ring-blue-500/60 scale-105'
              : hovered
              ? 'bg-slate-900/95 border-slate-400 scale-102'
              : 'bg-slate-950/90 border-slate-700/80'
          }`}
        >
          <span className={`w-2.5 h-2.5 rounded-full animate-pulse shadow-sm ${
            qualityScore > 80 ? 'bg-emerald-400' : qualityScore > 60 ? 'bg-amber-400' : 'bg-red-500'
          }`} />
          <div className="flex flex-col text-left">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
              <span>{commodity.toUpperCase()} SECTION</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${activeColor.bg} ${activeColor.text} border ${activeColor.border}`}>
                {rackId}
              </span>
            </span>
            <span className="text-[9px] text-slate-300 font-medium flex items-center gap-2">
              <span>{temperatureC.toFixed(1)}°C &bull; {humidityPct.toFixed(0)}% RH</span>
              <span className="text-emerald-400 font-bold">{qualityScore.toFixed(0)}% Fresh</span>
            </span>
          </div>
        </div>
      </Html>

      {/* Top Header Signboard Mount Plate */}
      <mesh position={[0, 4.65, 0]}>
        <boxGeometry args={[2.8, 0.22, 0.04]} />
        <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.6} />
      </mesh>

      {/* 4 Vertical Teardrop Steel Upright Columns */}
      {[
        [-1.4, -0.7],
        [1.4, -0.7],
        [-1.4, 0.7],
        [1.4, 0.7],
      ].map(([x, z], idx) => (
        <group key={`col-${idx}`} position={[x, 2.35, z]}>
          <mesh castShadow>
            <boxGeometry args={[0.08, 4.7, 0.08]} />
            <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.7} />
          </mesh>
          {/* Base Footplate / Anchor */}
          <mesh position={[0, -2.33, 0]}>
            <boxGeometry args={[0.18, 0.04, 0.18]} />
            <meshStandardMaterial color="#334155" metalness={0.9} />
          </mesh>
          {/* Safety Column Protector at Floor */}
          <mesh position={[0, -1.9, 0]}>
            <boxGeometry args={[0.14, 0.7, 0.14]} />
            <meshStandardMaterial color="#F59E0B" roughness={0.5} />
          </mesh>
        </group>
      ))}

      {/* Diagonal Cross-Bracing Struts */}
      {[-1.4, 1.4].map((x, idx) => (
        <group key={`brace-${idx}`} position={[x, 2.35, 0]}>
          <mesh rotation={[0, 0, 0.52]}>
            <boxGeometry args={[0.03, 4.3, 0.03]} />
            <meshStandardMaterial color={frameColor} roughness={0.5} metalness={0.6} />
          </mesh>
          <mesh rotation={[0, 0, -0.52]}>
            <boxGeometry args={[0.03, 4.3, 0.03]} />
            <meshStandardMaterial color={frameColor} roughness={0.5} metalness={0.6} />
          </mesh>
        </group>
      ))}

      {/* 3 Horizontal Shelf Beam Levels */}
      {tiers.map((y, tierIdx) => (
        <group key={`tier-${tierIdx}`} position={[0, y, 0]}>
          {/* Front & Back Orange Roll-Formed Step Load Beams */}
          <mesh position={[0, 0, -0.68]} castShadow>
            <boxGeometry args={[2.88, 0.12, 0.05]} />
            <meshStandardMaterial color={beamColor} roughness={0.45} metalness={0.5} />
          </mesh>
          <mesh position={[0, 0, 0.68]} castShadow>
            <boxGeometry args={[2.88, 0.12, 0.05]} />
            <meshStandardMaterial color={beamColor} roughness={0.45} metalness={0.5} />
          </mesh>

          {/* Heavy Wire Mesh Decking across tier */}
          <mesh position={[0, 0.04, 0]} receiveShadow>
            <boxGeometry args={[2.84, 0.02, 1.36]} />
            <meshStandardMaterial color="#94A3B8" roughness={0.5} metalness={0.6} />
          </mesh>

          {/* Crates on this tier */}
          {crateOffsetsX.map((cx, cIdx) => (
            <group key={`crate-${cIdx}`} position={[cx, 0.26, 0]}>
              {/* Wooden EURO Mini Pallet with Woodgrain Tone */}
              <group position={[0, -0.11, 0]}>
                {/* Runners */}
                {[-0.32, 0, 0.32].map((rx, ri) => (
                  <mesh key={ri} position={[rx, 0.02, 0]}>
                    <boxGeometry args={[0.06, 0.04, 0.82]} />
                    <meshStandardMaterial color="#B45309" roughness={0.9} />
                  </mesh>
                ))}
                {/* Top deck boards */}
                {[-0.35, -0.17, 0, 0.17, 0.35].map((rz, rzi) => (
                  <mesh key={rzi} position={[0, 0.05, rz]}>
                    <boxGeometry args={[0.76, 0.02, 0.12]} />
                    <meshStandardMaterial color="#D97706" roughness={0.85} />
                  </mesh>
                ))}
              </group>

              {/* Plastic High-Density Ventilated Storage Crate */}
              <group position={[0, 0.1, 0]}>
                <mesh castShadow>
                  <boxGeometry args={[0.72, 0.34, 0.82]} />
                  <meshStandardMaterial
                    color={tierIdx === 0 ? '#1E40AF' : tierIdx === 1 ? '#047857' : '#D97706'}
                    roughness={0.35}
                    metalness={0.15}
                  />
                </mesh>
                {/* Crate Corner Reinforced Stacking Lugs */}
                {[
                  [-0.34, -0.39],
                  [0.34, -0.39],
                  [-0.34, 0.39],
                  [0.34, 0.39],
                ].map(([lx, lz], li) => (
                  <mesh key={li} position={[lx, 0.17, lz]}>
                    <boxGeometry args={[0.04, 0.05, 0.04]} />
                    <meshStandardMaterial color="#0F172A" roughness={0.5} />
                  </mesh>
                ))}
              </group>

              {/* Interior Fruit Produce */}
              <ProduceModel
                commodity={commodity}
                qualityScore={qualityScore}
                position={[0, 0.28, 0]}
                scale={1.05}
              />
            </group>
          ))}
        </group>
      ))}

      {/* Active Selection / Hover Indicator Ring on Floor */}
      {(hovered || isSelected) && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[3.2, 1.8]} />
          <meshBasicMaterial
            color={isSelected ? '#3B82F6' : '#93C5FD'}
            transparent
            opacity={isSelected ? 0.38 : 0.18}
          />
        </mesh>
      )}
    </group>
  );
};
