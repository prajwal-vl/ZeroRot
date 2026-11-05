import React from 'react';
import { Play, Pause, RotateCcw, FastForward, CloudSun, Bell, User as UserIcon, LogOut, CheckCircle2 } from 'lucide-react';
import { SimulationState } from '../types/simulation';
import { DataBadge } from './DataBadge';
import { User } from '../services/api';

interface NavbarProps {
  simulationState: SimulationState | null;
  simpleMode: boolean;
  setSimpleMode: (mode: boolean) => void;
  onTogglePlay: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  onOpenAlerts: () => void;
  activeTabTitle?: string;
  currentUser?: User | null;
  onOpenAuth?: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  simulationState,
  simpleMode,
  setSimpleMode,
  onTogglePlay,
  onReset,
  onSpeedChange,
  onOpenAlerts,
  activeTabTitle = 'Dashboard',
  currentUser,
  onOpenAuth,
  onLogout,
}) => {
  const isRunning = simulationState?.is_running ?? true;
  const speed = simulationState?.sim_speed ?? 1;
  const unreadAlerts = simulationState?.unacknowledged_alerts_count ?? 0;
  const ambient = simulationState?.ambient_environment;

  const initials = currentUser?.full_name
    ? currentUser.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'ZR';

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between select-none sticky top-0 z-40 shadow-xs">
      {/* Left: Brand & Breadcrumb */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm tracking-tight shadow-xs">
            ZR
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm tracking-tight">
                ZERO ROOT
              </span>
              <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium border border-blue-200">
                SaaS v1.0
              </span>
            </div>
          </div>
        </div>

        {/* Breadcrumb divider */}
        <div className="hidden md:flex items-center text-xs text-slate-400 pl-3 border-l border-slate-200">
          <span>Platform</span>
          <span className="mx-1.5">/</span>
          <span className="font-medium text-slate-700">{activeTabTitle}</span>
        </div>
      </div>

      {/* Center: Live Weather & Simulation Engine Speed */}
      <div className="hidden lg:flex items-center gap-3">
        {/* Live Weather pill */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
          <CloudSun className="w-4 h-4 text-blue-600" />
          <div className="text-xs">
            <span className="text-slate-500">Bengaluru: </span>
            <span className="font-semibold text-slate-800">
              {ambient ? `${ambient.temperature_c}°C` : '--'}
            </span>
            <span className="text-slate-500 ml-1.5">
              {ambient ? `${ambient.relative_humidity_pct}% RH` : ''}
            </span>
          </div>
          <DataBadge label={ambient?.source_label.includes('LIVE') ? 'LIVE' : 'SIMULATED'} sourceText="Open-Meteo" className="ml-1" />
        </div>

        {/* Global Simulation Master Controls */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-lg">
          <button
            onClick={onTogglePlay}
            title={isRunning ? 'Pause Simulation' : 'Resume Simulation'}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${
              isRunning
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-xs'
                : 'bg-amber-600 text-white hover:bg-amber-700 shadow-xs'
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isRunning ? 'RUNNING' : 'PAUSED'}</span>
          </button>

          <button
            onClick={onReset}
            title="Reset Simulation State"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Speed selector */}
          <div className="flex items-center text-xs text-slate-500 px-1.5 border-l border-slate-200 ml-1">
            <FastForward className="w-3 h-3 mr-1 text-slate-400" />
            {[1, 5, 20].map((s) => (
              <button
                key={s}
                onClick={() => onSpeedChange(s)}
                className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  speed === s ? 'bg-blue-600 text-white' : 'hover:text-slate-900'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Notifications & User Profile */}
      <div className="flex items-center gap-3">
        {/* Simple Mode Switch */}
        <button
          onClick={() => setSimpleMode(!simpleMode)}
          className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
            simpleMode
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${simpleMode ? 'bg-blue-600' : 'bg-slate-400'}`} />
          <span>{simpleMode ? 'Simple Farmer Mode' : 'Standard Mode'}</span>
        </button>

        {/* Alerts Bell Button */}
        <button
          onClick={onOpenAlerts}
          title="View Active System Alerts"
          className="relative p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-slate-200 bg-white"
        >
          <Bell className="w-4 h-4" />
          {unreadAlerts > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
              {unreadAlerts}
            </span>
          )}
        </button>

        {/* User Account / Profile */}
        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
          {currentUser ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs">
                {initials}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-slate-800 leading-tight flex items-center gap-1.5">
                  <span>{currentUser.full_name}</span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                    currentUser.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {currentUser.role}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 leading-tight">{currentUser.email}</div>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  title="Sign Out"
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Sign In / Register</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
