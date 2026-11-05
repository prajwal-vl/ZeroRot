import React, { useState, useEffect } from 'react';
import {
  Layers,
  Truck,
  TrendingUp,
  AlertTriangle,
  Play,
  RotateCcw,
  CheckCircle2,
  DollarSign,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building2,
  Activity,
  Warehouse
} from 'lucide-react';
import { SupplyChainNetworkCanvas, NetworkNodeState } from './three/SupplyChainNetworkCanvas';

export const SupplyChainTab: React.FC = () => {
  const [nodes, setNodes] = useState<NetworkNodeState[]>([]);
  const [activeDisruption, setActiveDisruption] = useState<string | null>(null);
  const [selectedCommodity, setSelectedCommodity] = useState<string>('tomato');
  const [batchQuantityKg, setBatchQuantityKg] = useState<number>(2000.0);
  const [journeyResult, setJourneyResult] = useState<any | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [disruptionImpact, setDisruptionImpact] = useState<any | null>(null);

  // Fetch initial network state
  const fetchNetwork = async () => {
    try {
      const res = await fetch('/api/v1/supply-chain/network');
      if (res.ok) {
        const data = await res.json();
        setNodes(data.nodes || []);
      }
    } catch (e) {
      console.warn('Failed to load supply chain network:', e);
    }
  };

  useEffect(() => {
    fetchNetwork();
  }, []);

  const handleInjectDisruption = async (scenarioKey: string) => {
    try {
      setActiveDisruption(scenarioKey === 'RESET_NORMAL' ? null : scenarioKey);
      const res = await fetch('/api/v1/supply-chain/disrupt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario_key: scenarioKey })
      });
      if (res.ok) {
        const data = await res.json();
        setDisruptionImpact(data.impact);
        if (data.network_state?.nodes) {
          setNodes(data.network_state.nodes);
        }
      }
    } catch (e) {
      console.error('Error injecting disruption:', e);
    }
  };

  const handleRunJourneySimulation = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch('/api/v1/supply-chain/simulate-journey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commodity: selectedCommodity,
          quantity_kg: batchQuantityKg,
          initial_quality_score: 98.0,
          farmgate_rate_inr_kg: selectedCommodity === 'tomato' ? 32.0 : 50.0
        })
      });
      if (res.ok) {
        const data = await res.json();
        setJourneyResult(data.journey_simulation);
      }
    } catch (e) {
      console.error('Error running journey simulation:', e);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded uppercase tracking-wider">
              ISOMORPH Architecture
            </span>
            <span className="text-xs text-slate-400 font-mono">AGR007-SC-01</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Supply Chain Digital Twin & Disruption Simulator
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Full 7-stage multi-facility network tracking transit corridors, cascading delays, and terminal mandi grade realization.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleInjectDisruption('HEATWAVE_TRANSIT_DELAY')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all flex items-center gap-2 ${
              activeDisruption === 'HEATWAVE_TRANSIT_DELAY'
                ? 'bg-amber-600 text-white border-amber-500'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Highway Heatwave
          </button>
          <button
            onClick={() => handleInjectDisruption('COLD_HUB_POWER_OUTAGE')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all flex items-center gap-2 ${
              activeDisruption === 'COLD_HUB_POWER_OUTAGE'
                ? 'bg-red-600 text-white border-red-500'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            Cold Hub Blackout
          </button>
          <button
            onClick={() => handleInjectDisruption('RESET_NORMAL')}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-all flex items-center gap-1.5 shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Baseline
          </button>
        </div>
      </div>

      {/* Disruption Impact Notification Alert */}
      {disruptionImpact && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
            disruptionImpact.scenario === 'RESET_NORMAL'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
        >
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
          <div className="flex-1">
            <h4 className="text-sm font-bold">{disruptionImpact.title}</h4>
            <p className="text-xs mt-0.5 leading-relaxed">{disruptionImpact.cascading_impact}</p>
          </div>
        </div>
      )}

      {/* 3D WebGL Network Twin */}
      <SupplyChainNetworkCanvas
        nodes={nodes.length > 0 ? nodes : undefined}
        activeDisruption={activeDisruption}
        onInjectDisruption={handleInjectDisruption}
      />

      {/* 7-Stage Facility Corridor Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {nodes.map((n) => (
          <div
            key={n.node_id}
            className={`p-3.5 rounded-xl border bg-white shadow-xs flex flex-col justify-between transition-all ${
              n.health_status === 'NORMAL'
                ? 'border-slate-200 hover:border-blue-400'
                : 'border-red-300 ring-1 ring-red-200'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Stage {n.stage_number}
                </span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    n.health_status === 'NORMAL' ? 'bg-blue-600' : 'bg-red-500 animate-pulse'
                  }`}
                />
              </div>
              <h4 className="text-xs font-bold text-slate-900 leading-tight truncate">
                {n.stage_name}
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">{n.name}</p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="font-mono font-medium text-slate-700">
                {n.storage_temp_c.toFixed(1)}°C
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {n.current_inventory_tonnes.toFixed(0)} T
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Produce Journey Simulation Runner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 mb-4 border-b border-slate-100 gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Batch Transit Simulation Across All 7 Stages
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Traverse Farm Origin to Mandi Terminal to compute Arrhenius deterioration, weight shrinkage, and realized profit.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedCommodity}
              onChange={(e) => setSelectedCommodity(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white"
            >
              <option value="tomato">Tomato (Solanum lycopersicum)</option>
              <option value="mango">Mango (Alphonso)</option>
              <option value="banana">Banana (Robusta)</option>
              <option value="apple">Apple (Royal Gala)</option>
              <option value="potato">Potato (Kufri Jyoti)</option>
              <option value="onion">Onion (Nashik Red)</option>
              <option value="grapes">Grapes (Thompson Seedless)</option>
              <option value="guava">Guava (Allahabad Safeda)</option>
            </select>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500">Quantity:</span>
              <input
                type="number"
                value={batchQuantityKg}
                onChange={(e) => setBatchQuantityKg(Number(e.target.value))}
                className="w-24 px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                step="500"
                min="500"
              />
              <span className="text-slate-400">kg</span>
            </div>

            <button
              onClick={handleRunJourneySimulation}
              disabled={isSimulating}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {isSimulating ? 'Simulating...' : 'Run Journey'}
            </button>
          </div>
        </div>

        {/* Simulation Output Waterfall */}
        {journeyResult ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Terminal Quality & Grade
                </span>
                <div className="text-xl font-bold text-slate-900 mt-1">
                  {journeyResult.final_quality.toFixed(1)}%
                </div>
                <div className="text-xs font-medium text-blue-600 mt-0.5">
                  {journeyResult.final_grade.replace(/_/g, ' ')}
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Weight Shrinkage Loss
                </span>
                <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
                  {journeyResult.shrinkage_loss_pct.toFixed(2)}%
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {journeyResult.final_quantity_kg} kg of {journeyResult.initial_quantity_kg} kg
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Transit Duration
                </span>
                <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
                  {journeyResult.total_transit_hours} hrs
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Logistics Cost: ₹{journeyResult.logistics_cost_inr.toLocaleString()}
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Terminal Net Margin
                </span>
                <div
                  className={`text-xl font-bold font-mono mt-1 ${
                    journeyResult.net_margin_inr >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  ₹{journeyResult.net_margin_inr.toLocaleString()}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Revenue: ₹{journeyResult.final_revenue_inr.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Stage-by-Stage Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Stage</th>
                    <th className="px-4 py-3">Facility Node</th>
                    <th className="px-4 py-3">Dwell Hours</th>
                    <th className="px-4 py-3">Temp / RH</th>
                    <th className="px-4 py-3">Health</th>
                    <th className="px-4 py-3">Produce Quality</th>
                    <th className="px-4 py-3">Remaining Mass</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {journeyResult.stage_traces.map((trace: any) => (
                    <tr key={trace.stage_number} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2.5 font-bold text-blue-600">
                        Stage {trace.stage_number}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-900">
                        {trace.stage_name} ({trace.node_name})
                      </td>
                      <td className="px-4 py-2.5 font-mono text-slate-600">
                        +{trace.dwell_hours}h ({trace.cumulative_hours}h total)
                      </td>
                      <td className="px-4 py-2.5 font-mono text-slate-700">
                        {trace.temperature_c.toFixed(1)}°C / {trace.rh_pct.toFixed(0)}%
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            trace.health_status === 'NORMAL'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {trace.health_status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-bold font-mono text-slate-900">
                        {trace.quality_score.toFixed(1)}%
                      </td>
                      <td className="px-4 py-2.5 font-mono text-slate-600">
                        {trace.mass_remaining_kg} kg
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400">
            <Layers className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-xs">Click "Run Journey" to step the produce batch through the 7 supply chain stages.</p>
          </div>
        )}
      </div>
    </div>
  );
};
