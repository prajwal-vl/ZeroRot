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
  const tiers = [0.4, 1.8, 3.2];
  const crateOffsetsX = [-0.9, 0, 0.9];

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
  const beamColor = '#EA580C'; // Industrial OSHA safety orange

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
      <Html position={[0, 4.95, 0]} center distanceFactor={22}>
        <div
          onClick={handleClick}
          className={`cursor-pointer transition-all duration-200 select-none px-3 py-1.5 rounded-lg border backdrop-blur-md shadow-xl flex items-center gap-2 whitespace-nowrap ${
            isSelected
              ? 'bg-blue-950/95 border-blue-400 ring-2 ring-blue-500/50 scale-105'
              : hovered
              ? 'bg-slate-900/95 border-slate-500 scale-102'
              : 'bg-slate-950/90 border-slate-700/80'
          }`}
        >
          <span className={`w-2 h-2 rounded-full animate-pulse ${
            qualityScore > 80 ? 'bg-emerald-400' : qualityScore > 60 ? 'bg-amber-400' : 'bg-red-500'
          }`} />
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
              <span>{commodity.toUpperCase()} SECTION</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${activeColor.bg} ${activeColor.text} border ${activeColor.border}`}>
                {rackId}
              </span>
            </span>
            <span className="text-[9px] text-slate-400 font-medium">
              {temperatureC.toFixed(1)}°C &bull; {qualityScore.toFixed(0)}% Fresh
            </span>
          </div>
        </div>
      </Html>

      {/* Top Header Signboard Mount Plate */}
      <mesh position={[0, 4.55, 0]}>
        <boxGeometry args={[2.5, 0.22, 0.04]} />
        <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.6} />
      </mesh>

      {/* 4 Vertical Steel Columns */}
      {[
        [-1.4, -0.7],
        [1.4, -0.7],
        [-1.4, 0.7],
        [1.4, 0.7],
      ].map(([x, z], idx) => (
        <mesh key={`col-${idx}`} position={[x, 2.3, z]}>
          <boxGeometry args={[0.08, 4.6, 0.08]} />
          <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.7} />
        </mesh>
      ))}

      {/* Cross Bracing Struts */}
      {[-1.4, 1.4].map((x, idx) => (
        <group key={`brace-${idx}`} position={[x, 2.3, 0]}>
          <mesh rotation={[0, 0, 0.5]}>
            <boxGeometry args={[0.03, 4.2, 0.03]} />
            <meshStandardMaterial color={frameColor} roughness={0.5} metalness={0.6} />
          </mesh>
          <mesh rotation={[0, 0, -0.5]}>
            <boxGeometry args={[0.03, 4.2, 0.03]} />
            <meshStandardMaterial color={frameColor} roughness={0.5} metalness={0.6} />
          </mesh>
        </group>
      ))}

      {/* 3 Horizontal Shelf Beam Levels */}
      {tiers.map((y, tierIdx) => (
        <group key={`tier-${tierIdx}`} position={[0, y, 0]}>
          {/* Front & Back Orange Load Beams */}
          <mesh position={[0, 0, -0.68]}>
            <boxGeometry args={[2.85, 0.12, 0.05]} />
            <meshStandardMaterial color={beamColor} roughness={0.5} metalness={0.4} />
          </mesh>
          <mesh position={[0, 0, 0.68]}>
            <boxGeometry args={[2.85, 0.12, 0.05]} />
            <meshStandardMaterial color={beamColor} roughness={0.5} metalness={0.4} />
          </mesh>

          {/* Wire Decking / Wood Slats */}
          <mesh position={[0, 0.04, 0]}>
            <boxGeometry args={[2.8, 0.02, 1.35]} />
            <meshStandardMaterial color="#94A3B8" roughness={0.6} metalness={0.5} />
          </mesh>

          {/* Crates on this tier */}
          {crateOffsetsX.map((cx, cIdx) => (
            <group key={`crate-${cIdx}`} position={[cx, 0.25, 0]}>
              {/* Wooden Mini Pallet */}
              <mesh position={[0, -0.12, 0]}>
                <boxGeometry args={[0.75, 0.08, 0.85]} />
                <meshStandardMaterial color="#B45309" roughness={0.9} />
              </mesh>

              {/* Plastic Vented Storage Crate */}
              <mesh position={[0, 0.1, 0]}>
                <boxGeometry args={[0.7, 0.35, 0.8]} />
                <meshStandardMaterial
                  color={tierIdx === 0 ? '#1D4ED8' : tierIdx === 1 ? '#047857' : '#B45309'}
                  roughness={0.3}
                  metalness={0.1}
                />
              </mesh>

              {/* Interior Produce Pile */}
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
            opacity={isSelected ? 0.35 : 0.18}
          />
        </mesh>
      )}
    </group>
  );
};

