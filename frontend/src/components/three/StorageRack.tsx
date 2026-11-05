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

  const commColors: Record<string, { bg: string; text: string; border: string; glow: string }> = {
    banana: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/50', glow: '#FACC15' },
    orange: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/50', glow: '#FB923C' },
    mango: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/50', glow: '#F59E0B' },
    guava: { bg: 'bg-lime-500/20', text: 'text-lime-400', border: 'border-lime-500/50', glow: '#A3E635' },
    grape: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/50', glow: '#C084FC' },
    grapes: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/50', glow: '#C084FC' },
  };
  const activeColor = commColors[commodity.toLowerCase()] || { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/50', glow: '#38BDF8' };

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
      {/* Floor Selection & Proximity Halo */}
      {(isSelected || hovered) && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.8, 2.1, 32]} />
          <meshBasicMaterial color={activeColor.glow} transparent opacity={isSelected ? 0.8 : 0.4} />
        </mesh>
      )}

      {/* Overhead Section Header Billboard */}
      <Html position={[0, 5.15, 0]} center distanceFactor={24}>
        <div
          onClick={handleClick}
          className={`cursor-pointer transition-all duration-300 select-none px-3.5 py-2 rounded-xl border backdrop-blur-xl shadow-2xl flex flex-col gap-1.5 whitespace-nowrap min-w-[190px] ${
            isSelected
              ? 'bg-slate-950/95 border-blue-400 ring-2 ring-blue-500/80 scale-105'
              : hovered
              ? 'bg-slate-900/95 border-slate-400 scale-102'
              : 'bg-slate-950/90 border-slate-700/80'
          }`}
        >
          {/* Top Bar: Live Sensor Pulse + Rack ID */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  qualityScore > 80 ? 'bg-emerald-400' : qualityScore > 60 ? 'bg-amber-400' : 'bg-rose-500'
                }`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  qualityScore > 80 ? 'bg-emerald-500' : qualityScore > 60 ? 'bg-amber-500' : 'bg-rose-600'
                }`}></span>
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-200">
                {commodity.toUpperCase()}
              </span>
            </div>
            <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${activeColor.bg} ${activeColor.text} border ${activeColor.border}`}>
              {rackId}
            </span>
          </div>

          {/* Microclimate Telemetry Grid */}
          <div className="flex items-center justify-between gap-3 text-[10px]">
            <span className="font-semibold text-slate-300">
              {temperatureC.toFixed(1)}°C <span className="text-slate-500">|</span> {humidityPct.toFixed(0)}% RH
            </span>
            <span className={`font-extrabold ${
              qualityScore > 80 ? 'text-emerald-400' : qualityScore > 60 ? 'text-amber-400' : 'text-rose-400'
            }`}>
              {qualityScore.toFixed(0)}% Fresh
            </span>
          </div>

          {/* Freshness Bar */}
          <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                qualityScore > 80 ? 'bg-emerald-500' : qualityScore > 60 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(5, qualityScore))}%` }}
            />
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
                {[-0.32, 0, 0.32].map((rx, ri) => (
                  <mesh key={`runner-${ri}`} position={[rx, 0, 0]}>
                    <boxGeometry args={[0.07, 0.08, 0.82]} />
                    <meshStandardMaterial color="#A16207" roughness={0.85} />
                  </mesh>
                ))}
                {[-0.35, -0.17, 0, 0.17, 0.35].map((sz, si) => (
                  <mesh key={`slat-${si}`} position={[0, 0.045, sz]}>
                    <boxGeometry args={[0.76, 0.018, 0.1]} />
                    <meshStandardMaterial color="#CA8A04" roughness={0.8} />
                  </mesh>
                ))}
              </group>

              {/* Perforated HDPE Plastic Produce Crate with Ribbing */}
              <mesh position={[0, 0.08, 0]} castShadow>
                <boxGeometry args={[0.78, 0.32, 0.78]} />
                <meshStandardMaterial
                  color={
                    commodity.includes('banana')
                      ? '#0284C7'
                      : commodity.includes('orange')
                      ? '#047857'
                      : commodity.includes('mango')
                      ? '#7C3AED'
                      : commodity.includes('guava')
                      ? '#0D9488'
                      : '#1E40AF'
                  }
                  roughness={0.3}
                  metalness={0.1}
                />
              </mesh>

              {/* Inside Produce with Dynamic Spoilage Visual Feedback */}
              <ProduceModel
                commodity={commodity}
                qualityScore={qualityScore}
                position={[0, 0.16, 0]}
                scale={1.05}
              />
            </group>
          ))}
        </group>
      ))}
    </group>
  );
};
