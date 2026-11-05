import React, { useState } from 'react';
import {
  History,
  Download,
  Calendar,
  Layers,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  FileSpreadsheet,
  Clock,
  Thermometer,
  Eye
} from 'lucide-react';
import { SimulationState } from '../types/simulation';
import { DataBadge } from './DataBadge';

interface SimulationHistoryTabProps {
  simulationState: SimulationState | null;
  onRefreshState?: () => void;
}

export const SimulationHistoryTab: React.FC<SimulationHistoryTabProps> = ({
  simulationState,
  onRefreshState,
}) => {
  const [filterModule, setFilterModule] = useState<'ALL' | 'COLD_STORAGE' | 'REEFER_TRUCK' | 'TRADITIONAL'>('ALL');

  // Synthetic historical runs generated from live simulation timeline
  const currentSimDays = simulationState?.simulated_days ?? 1.5;
  const historyEntries = Array.from({ length: 12 }, (_, i) => {
    const day = Math.max(0.1, currentSimDays - (12 - i) * 0.2);
    return [
      {
        id: `log_cs_${i}`,
        timestamp: `Day ${day.toFixed(1)} (+${((12 - i) * 4.8).toFixed(0)}h)`,
        module: 'COLD_STORAGE' as const,
        tempC: (11.0 + (i % 3) * 0.4).toFixed(1),
        quality: Math.max(70, 96.0 - (12 - i) * 0.5).toFixed(1),
        shelfLife: Math.max(5, 18.0 - (12 - i) * 0.3).toFixed(1),
        status: 'NOMINAL',
      },
      {
        id: `log_rt_${i}`,
        timestamp: `Day ${day.toFixed(1)} (+${((12 - i) * 4.8).toFixed(0)}h)`,
        module: 'REEFER_TRUCK' as const,
        tempC: (4.2 + (i % 2) * 0.6).toFixed(1),
        quality: Math.max(65, 94.0 - (12 - i) * 0.7).toFixed(1),
        shelfLife: Math.max(4, 15.0 - (12 - i) * 0.4).toFixed(1),
        status: i === 4 ? 'TEMP DRIFT' : 'NOMINAL',
      },
      {
        id: `log_ts_${i}`,
        timestamp: `Day ${day.toFixed(1)} (+${((12 - i) * 4.8).toFixed(0)}h)`,
        module: 'TRADITIONAL' as const,
        tempC: (25.5 + (i % 4) * 0.8).toFixed(1),
        quality: Math.max(40, 88.0 - (12 - i) * 1.8).toFixed(1),
        shelfLife: Math.max(2, 8.0 - (12 - i) * 0.5).toFixed(1),
        status: i > 6 ? 'ELEVATED HEAT' : 'NOMINAL',
      },
    ];
  }).flat();

  const filtered = historyEntries.filter((h) => filterModule === 'ALL' || h.module === filterModule);

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'Module', 'Internal Temp (°C)', 'Produce Freshness (%)', 'Remaining Shelf Life (Days)', 'Operating Status'];
    const rows = filtered.map((f) => [
      f.timestamp,
      f.module,
      f.tempC,
      f.quality,
      f.shelfLife,
      f.status,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `zerorot_simulation_history_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 text-[#1E293B]">
      {/* Top Banner */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]">
              <History className="w-3.5 h-3.5 text-[#2563EB]" />
              SIMULATION TELEMETRY ARCHIVE
            </span>
            <DataBadge label="AUDIT TRAIL" sourceText="Synchronous Snapshot Log" />
          </div>
          <h2 className="text-xl font-bold text-[#1E293B] mt-2 tracking-tight">
            Simulation History &amp; Replay Archive
          </h2>
          <p className="text-sm text-[#64748B] mt-1 max-w-2xl">
            Review time-series telemetry snapshots recorded during the digital twin execution. Export historical runs as CSV for regulatory compliance and scientific post-harvest analysis.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-lg transition-colors shadow-sm flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV Report</span>
          </button>
          {onRefreshState && (
            <button
              onClick={onRefreshState}
              className="p-2 rounded-lg bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#1E293B] hover:bg-[#F8FAFC] transition-colors"
              title="Refresh History"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#64748B]" />
          <span className="text-xs text-[#64748B] font-semibold">Filter by Digital Twin Module:</span>
        </div>

        <div className="flex items-center gap-2">
          {[
            { key: 'ALL', label: 'All Modules' },
            { key: 'COLD_STORAGE', label: 'Cold Warehouse' },
            { key: 'REEFER_TRUCK', label: 'Reefer Truck' },
            { key: 'TRADITIONAL', label: 'Traditional Store' },
          ].map((m) => (
            <button
              key={m.key}
              onClick={() => setFilterModule(m.key as any)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                filterModule === m.key
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'bg-[#F8FAFC] text-[#64748B] hover:bg-[#F1F5F9] border border-[#E2E8F0]'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* History Ledger Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-semibold">
              <tr>
                <th className="py-3.5 px-4">Timeline Index</th>
                <th className="py-3.5 px-4">Digital Twin Module</th>
                <th className="py-3.5 px-4">Mean Temperature</th>
                <th className="py-3.5 px-4">Quality Score</th>
                <th className="py-3.5 px-4">Remaining Shelf Life</th>
                <th className="py-3.5 px-4">Telemetry Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-3 px-4 font-mono font-semibold text-[#1E293B]">
                    {item.timestamp}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.module === 'COLD_STORAGE'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : item.module === 'REEFER_TRUCK'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {item.module.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-[#1E293B]">
                    {item.tempC} °C
                  </td>
                  <td className="py-3 px-4 font-bold text-[#16A34A]">
                    {item.quality}%
                  </td>
                  <td className="py-3 px-4 font-medium text-[#1E293B]">
                    {item.shelfLife} Days
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.status === 'NOMINAL'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

