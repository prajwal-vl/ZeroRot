import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  ShieldCheck,
  TrendingDown,
  DollarSign,
  Scale,
  Layers,
  ArrowRight
} from 'lucide-react';
import { DataBadge } from './DataBadge';
import { api } from '../services/api';

export const AnalyticsTab: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.getAnalyticsComparison();
        setAnalytics(res);
      } catch (e) {
        console.error('Analytics fetch error:', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const handleDownloadCsv = () => {
    window.open('/api/v1/analytics/export/csv', '_blank');
  };

  const handleDownloadPdf = () => {
    window.open('/api/v1/analytics/export/pdf', '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  if (!analytics) {
    return (
      <div className="p-12 text-center text-[#64748B] text-xs font-mono">
        Loading Comparative Loss Prevention &amp; Economic Analytics...
      </div>
    );
  }

  const { traditional_baseline: trad, intelligent_storage_solution: cold } = analytics;

  return (
    <div className="space-y-6 text-[#1E293B]">
      {/* Header - Blue SaaS Top Banner */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]">
              <BarChart3 className="w-3.5 h-3.5 text-[#2563EB]" />
              ECONOMIC IMPACT ASSESSMENT
            </span>
            <DataBadge label="SIMULATED" sourceText="Differential Kinetics Engine" />
          </div>
          <h2 className="text-xl font-bold text-[#1E293B] mt-2 tracking-tight">
            Comparative Loss Prevention Analytics
          </h2>
          <p className="text-sm text-[#64748B] mt-1 max-w-2xl">
            Counterfactual evaluation quantifying harvest shrinkage, bio-chemical decay, and net farmer financial returns across traditional storage versus ZERO ROOT intelligent digital twin storage.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] hover:bg-[#1E40AF] text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>
          <button
            onClick={handleDownloadCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#1E293B] rounded-lg text-xs font-semibold transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-[#64748B]" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#1E293B] rounded-lg text-xs font-semibold transition-colors shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Primary Impact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-[#64748B] text-xs font-semibold uppercase">
            <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
            <span>Produce Loss Prevented</span>
          </div>
          <div className="text-3xl font-extrabold text-[#16A34A]">
            {analytics.loss_prevented_kg} kg
          </div>
          <span className="text-xs text-[#64748B] block">
            Reduction of <strong className="text-[#16A34A]">{analytics.loss_prevented_pct}%</strong> in aggregate harvest shrinkage
          </span>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-[#64748B] text-xs font-semibold uppercase">
            <DollarSign className="w-4 h-4 text-[#2563EB]" />
            <span>Net Economic Benefit</span>
          </div>
          <div className="text-3xl font-extrabold text-[#2563EB]">
            ₹{analytics.net_economic_benefit_inr.toLocaleString()}
          </div>
          <span className="text-xs text-[#64748B] block">
            Net return after deducting all refrigeration and power handling costs
          </span>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-[#64748B] text-xs font-semibold uppercase">
            <TrendingDown className="w-4 h-4 text-[#1E293B]" />
            <span>Benchmark Commodity</span>
          </div>
          <div className="text-2xl font-bold text-[#1E293B] capitalize">
            {analytics.benchmark_commodity}
          </div>
          <span className="text-xs text-[#64748B] block">
            Sample batch: 1,000 kg harvest over 7-day storage horizon
          </span>
        </div>
      </div>

      {/* Head-to-Head Comparison Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] mb-4">
          <span className="text-xs font-semibold uppercase text-[#1E293B]">
            Counterfactual System Comparison Matrix
          </span>
          <DataBadge label="SIMULATED" sourceText="7-Day Comparative Model" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F8FAFC] text-[#64748B] border-b border-[#E2E8F0] font-semibold">
              <tr>
                <th className="p-3.5">Performance Dimension</th>
                <th className="p-3.5 text-amber-700">Traditional Storage Baseline</th>
                <th className="p-3.5 text-[#2563EB]">Intelligent Digital Twin Hub</th>
                <th className="p-3.5 text-[#16A34A] font-bold">Net Optimization Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-[#1E293B]">
              <tr>
                <td className="p-3.5 font-semibold">Initial Harvest Inflow</td>
                <td className="p-3.5">{analytics.initial_quantity_kg} kg</td>
                <td className="p-3.5">{analytics.initial_quantity_kg} kg</td>
                <td className="p-3.5 text-[#64748B]">—</td>
              </tr>
              <tr className="bg-[#F8FAFC]/50">
                <td className="p-3.5 font-semibold">Final Saleable Quantity</td>
                <td className="p-3.5 text-[#64748B]">{trad.saleable_quantity_kg} kg</td>
                <td className="p-3.5 text-[#2563EB] font-bold">{cold.saleable_quantity_kg} kg</td>
                <td className="p-3.5 text-[#16A34A] font-bold">+{analytics.loss_prevented_kg} kg</td>
              </tr>
              <tr>
                <td className="p-3.5 font-semibold">Spoilage / Weight Shrink</td>
                <td className="p-3.5 text-[#DC2626] font-bold">{trad.lost_quantity_kg} kg ({trad.loss_percentage}%)</td>
                <td className="p-3.5 text-[#16A34A] font-semibold">{cold.lost_quantity_kg} kg ({cold.loss_percentage}%)</td>
                <td className="p-3.5 text-[#16A34A] font-bold">-{analytics.loss_prevented_pct}% Loss</td>
              </tr>
              <tr className="bg-[#F8FAFC]/50">
                <td className="p-3.5 font-semibold">Gross APMC Realization</td>
                <td className="p-3.5">₹{trad.gross_revenue_inr.toLocaleString()}</td>
                <td className="p-3.5 font-semibold">₹{cold.gross_revenue_inr.toLocaleString()}</td>
                <td className="p-3.5 text-[#16A34A] font-bold">
                  +₹{(cold.gross_revenue_inr - trad.gross_revenue_inr).toLocaleString()}
                </td>
              </tr>
              <tr>
                <td className="p-3.5 font-semibold">Storage Operating Tariff</td>
                <td className="p-3.5 text-[#64748B]">₹0 (Passive holding)</td>
                <td className="p-3.5 text-[#1E293B]">₹{cold.storage_cost_inr.toLocaleString()}</td>
                <td className="p-3.5 text-[#64748B]">₹{cold.storage_cost_inr.toLocaleString()}</td>
              </tr>
              <tr className="bg-[#EFF6FF] text-[#1E293B]">
                <td className="p-4 font-bold text-sm">Net Realized Profit</td>
                <td className="p-4 text-amber-700 font-bold text-sm">
                  ₹{trad.net_profit_inr.toLocaleString()}
                </td>
                <td className="p-4 text-[#2563EB] font-bold text-sm">
                  ₹{cold.net_profit_inr.toLocaleString()}
                </td>
                <td className="p-4 text-[#16A34A] font-extrabold text-base">
                  +₹{analytics.net_economic_benefit_inr.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
