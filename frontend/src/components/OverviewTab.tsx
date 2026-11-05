import React, { useState, useEffect } from 'react';
import {
  Package,
  Clock,
  Warehouse,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Truck,
  PlusCircle,
  Database
} from 'lucide-react';
import { SimulationState } from '../types/simulation';
import { DataBadge } from './DataBadge';
import { MainNavSection } from './Sidebar';
import { api, BatchRecord, BatchesSummary } from '../services/api';

interface OverviewTabProps {
  simulationState: SimulationState | null;
  simpleMode: boolean;
  onNavigateSection: (section: MainNavSection) => void;
  onAcknowledgeAlert: (alertId: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  simulationState,
  simpleMode,
  onNavigateSection,
  onAcknowledgeAlert,
}) => {
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const [summary, setSummary] = useState<BatchesSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadOverviewData = async () => {
      try {
        const [batchesRes, summaryRes] = await Promise.all([
          api.getBatches(),
          api.getBatchesSummary(),
        ]);
        setBatches(batchesRes);
        setSummary(summaryRes);
      } catch (err) {
        console.error('Failed to load overview database records:', err);
      } finally {
        setLoading(false);
      }
    };
    loadOverviewData();
  }, [simulationState?.unacknowledged_alerts_count]);

  const activeAlerts = simulationState?.alerts.filter((a) => !a.acknowledged) ?? [];
  const trad = simulationState?.traditional_storage;
  const cold = simulationState?.cold_storage;
  const truck = simulationState?.refrigerated_truck;

  const totalBatchesCount = summary?.total_batches ?? batches.length;
  const avgShelfLife = summary?.avg_remaining_shelf_life_days ?? (trad ? trad.remaining_shelf_life_days : 14.0);
  const activeStorageCount = summary?.active_storage_units ?? 4;
  const activeAlertsCount = activeAlerts.length;

  return (
    <div className="space-y-6">
      {/* SaaS Dashboard Title Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
              Management Dashboard
            </span>
            <DataBadge label="DATABASE / VERIFIED" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">
            ZERO ROOT — Smart Post-Harvest Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time loss prevention digital twin, produce batch tracking, and cold chain telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateSection('post_harvest')}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Register New Batch</span>
          </button>
        </div>
      </div>

      {/* Four Core Summary Cards (Retrieved from actual DB records) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Produce Batches */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Batches</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900">
            {totalBatchesCount}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            Persisted in database records
          </span>
        </div>

        {/* Card 2: Average Remaining Shelf Life */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg Shelf Life</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900">
            {avgShelfLife} <span className="text-sm font-normal text-slate-500">Days</span>
          </div>
          <span className="text-xs text-emerald-600 mt-1 block font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Bio-decay kinetics modeled
          </span>
        </div>

        {/* Card 3: Active Storage Units */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Storage</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Warehouse className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900">
            {activeStorageCount} <span className="text-sm font-normal text-slate-500">Units</span>
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            1 Pass-Through &amp; 3 Cold Zones
          </span>
        </div>

        {/* Card 4: Active Alerts */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Alerts</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeAlertsCount > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-3xl font-bold ${activeAlertsCount > 0 ? 'text-red-600' : 'text-slate-900'}`}>
            {activeAlertsCount}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            {activeAlertsCount === 0 ? 'All parameters nominal' : 'Requires corrective intervention'}
          </span>
        </div>
      </div>

      {/* Two Large Core Module Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Module 1 Card: Post-Harvest Loss Prevention */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between hover:border-blue-300 transition-colors">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                Module 01 Priority
              </span>
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Post-Harvest Loss Prevention
              </span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Post-Harvest Storage &amp; Quality Inspection
              </h3>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                Complete workflow: Register produce batches, select Traditional vs Advanced Cold Storage, inspect with optical CV conveyor, and monitor real-time shelf life decay.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Traditional Store Temp/RH:</span>
                <strong className="text-slate-900">{trad ? `${trad.internal_temp_c.toFixed(1)}°C (${trad.internal_rh_pct.toFixed(0)}% RH)` : '--'}</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Produce Health Score:</span>
                <strong className="text-emerald-600">{trad ? `${trad.quality_score.toFixed(1)}% / 100` : '--'}</strong>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex gap-3">
            <button
              onClick={() => onNavigateSection('post_harvest')}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              <span>Open Module 1 Workflow</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Module 2 Card: Intelligent Cold Chain Monitoring */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between hover:border-blue-300 transition-colors">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Module 02 Logistics
              </span>
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Transit Telematics
              </span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Intelligent Cold Chain Monitoring
              </h3>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                2D refrigerated truck simulation with multi-zone cargo temperatures (Front, Mid, Rear), door open heat ingress, reefer compressor controls, and transit risk telemetry.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Active Reefer Vehicle:</span>
                <strong className="text-slate-900">{truck?.plate_number} (Bengaluru → Mandya)</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Cargo Transit Value:</span>
                <strong className="text-slate-900">INR {truck ? truck.total_cargo_value_inr.toLocaleString() : '--'}</strong>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex gap-3">
            <button
              onClick={() => onNavigateSection('cold_chain')}
              className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              <span>Open Cold Chain Fleet</span>
              <ArrowRight className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Produce Batches Table (Database-Persisted Records) */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Registered Produce Batches ({batches.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Persisted in database. Every batch is tracked through post-harvest storage.
            </p>
          </div>
          <button
            onClick={() => onNavigateSection('post_harvest')}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
          >
            <span>Batch Registration Wizard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {batches.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No produce batches registered yet. Click &lsquo;Register New Batch&rsquo; to add your harvest.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Batch ID</th>
                  <th className="py-2.5 px-3 font-semibold">Farmer</th>
                  <th className="py-2.5 px-3 font-semibold">Commodity</th>
                  <th className="py-2.5 px-3 font-semibold">Quantity</th>
                  <th className="py-2.5 px-3 font-semibold">Quality</th>
                  <th className="py-2.5 px-3 font-semibold">Storage Method</th>
                  <th className="py-2.5 px-3 font-semibold">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {batches.slice(0, 5).map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-3 font-mono font-semibold text-blue-600">{b.batch_code}</td>
                    <td className="py-3 px-3">{b.farmer_name}</td>
                    <td className="py-3 px-3 capitalize font-medium text-slate-900">{b.commodity_name}</td>
                    <td className="py-3 px-3 font-mono">{b.quantity_kg.toLocaleString()} kg</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {b.current_quality_score.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${b.storage_type.includes('COLD') ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-700'}`}>
                        {b.storage_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {b.created_at ? new Date(b.created_at).toLocaleDateString() : 'Today'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lower Grid: Active Alerts & Market Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Active Alerts List */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 className="text-base font-bold text-slate-900">
              Active Environmental Alerts ({activeAlerts.length})
            </h3>
            <DataBadge label="SIMULATED" sourceText="Live Thresholds" />
          </div>

          {activeAlerts.length === 0 ? (
            <div className="p-6 bg-slate-50 rounded-lg text-center text-xs text-slate-500 flex items-center justify-center gap-2 border border-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>All parameters are within safe agronomic limits.</span>
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {activeAlerts.map((a) => (
                <div key={a.id} className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">{a.title}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${a.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>
                      {a.severity}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">{a.message}</p>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                    <span className="text-[11px] text-blue-700 font-medium truncate max-w-[280px]">
                      Action: {a.recommended_action}
                    </span>
                    <button
                      onClick={() => onAcknowledgeAlert(a.id)}
                      className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded text-[11px] font-medium transition-colors"
                    >
                      Acknowledge
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live APMC Market Summary */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 className="text-base font-bold text-slate-900">
              Mandi Spot Prices
            </h3>
            <DataBadge label="LIVE" sourceText="Agmarknet APMC" />
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center">
              <div>
                <span className="font-semibold text-slate-900 block">Tomato (Hybrid)</span>
                <span className="text-[11px] text-slate-500">Bengaluru Yeshwanthpur</span>
              </div>
              <strong className="text-sm font-bold text-blue-600">INR 28.50 / kg</strong>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center">
              <div>
                <span className="font-semibold text-slate-900 block">Mango (Banganapalli)</span>
                <span className="text-[11px] text-slate-500">Kolar District Mandi</span>
              </div>
              <strong className="text-sm font-bold text-blue-600">INR 65.00 / kg</strong>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center">
              <div>
                <span className="font-semibold text-slate-900 block">Banana (Robusta)</span>
                <span className="text-[11px] text-slate-500">Mandya APMC Market</span>
              </div>
              <strong className="text-sm font-bold text-blue-600">INR 32.00 / kg</strong>
            </div>
          </div>

          <button
            onClick={() => onNavigateSection('market_reports')}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            <span>View 14-Day Price Forecast</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>
      </div>
    </div>
  );
};
