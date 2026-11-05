import React from 'react';
import { Cpu, Radio, Sparkles, AlertCircle, Database } from 'lucide-react';
import { DataLabel } from '../types/simulation';

interface DataBadgeProps {
  label: DataLabel | string;
  sourceText?: string;
  className?: string;
}

export const DataBadge: React.FC<DataBadgeProps> = ({ label, sourceText, className = '' }) => {
  if (label === 'LIVE' || label?.startsWith('LIVE')) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 shadow-xs ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
        <Radio className="w-3 h-3 text-blue-600" />
        <span>LIVE{sourceText ? ` (${sourceText})` : ''}</span>
      </span>
    );
  }

  if (label === 'PREDICTED' || label?.startsWith('PREDICTED')) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs ${className}`}>
        <Sparkles className="w-3 h-3 text-indigo-600" />
        <span>PREDICTED{sourceText ? ` (${sourceText})` : ''}</span>
      </span>
    );
  }

  if (label === 'DATABASE / VERIFIED' || label === 'DATABASE') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs ${className}`}>
        <Database className="w-3 h-3 text-emerald-600" />
        <span>DATABASE VERIFIED</span>
      </span>
    );
  }

  if (label === 'DATA UNAVAILABLE') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-200 shadow-xs ${className}`}>
        <AlertCircle className="w-3 h-3 text-red-600" />
        <span>DATA UNAVAILABLE</span>
      </span>
    );
  }

  // Default: SIMULATED
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 shadow-xs ${className}`}>
      <Cpu className="w-3 h-3 text-slate-500" />
      <span>SIMULATED{sourceText ? ` (${sourceText})` : ''}</span>
    </span>
  );
};
