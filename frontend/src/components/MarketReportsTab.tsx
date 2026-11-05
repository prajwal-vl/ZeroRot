import React, { useState } from 'react';
import {
  TrendingUp,
  BarChart3,
  QrCode,
  DollarSign,
  Download,
  Printer,
  Scale,
  Sparkles,
  Smartphone,
  Layers,
  ArrowRight
} from 'lucide-react';
import { DataBadge } from './DataBadge';
import { PriceIntelligenceView } from './PriceIntelligenceView';
import { AnalyticsTab } from './AnalyticsTab';
import { SettingsTab } from './SettingsTab';

interface MarketReportsTabProps {
  onOpenMobileView: (token: string) => void;
}

export const MarketReportsTab: React.FC<MarketReportsTabProps> = ({ onOpenMobileView }) => {
  const [activeSubTab, setActiveSubTab] = useState<'market' | 'analytics' | 'qr'>('market');

  return (
    <div className="space-y-6 text-[#1E293B]">
      {/* Header - Blue SaaS Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]">
              <TrendingUp className="w-3.5 h-3.5 text-[#2563EB]" />
              SECTION 4 — MARKET INTELLIGENCE &amp; REPORTS
            </span>
          </div>
          <h2 className="text-xl font-bold text-[#1E293B] mt-2 tracking-tight">
            Agricultural Market Forecasting &amp; Economic Reports
          </h2>
          <p className="text-sm text-[#64748B] mt-1 max-w-2xl">
            Real-time APMC mandi spot rates, 14-day price forecasting, Sell Now vs Store Later optimizer, and comparative loss prevention analytics.
          </p>
        </div>

        {/* Sub-tab Navigation Switcher */}
        <div className="flex items-center gap-1 bg-[#F8FAFC] p-1 rounded-lg border border-[#E2E8F0] text-xs">
          <button
            onClick={() => setActiveSubTab('market')}
            className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-all ${
              activeSubTab === 'market'
                ? 'bg-white text-[#2563EB] shadow-sm font-semibold'
                : 'text-[#64748B] hover:text-[#1E293B]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Market &amp; Optimizer</span>
          </button>

          <button
            onClick={() => setActiveSubTab('analytics')}
            className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-all ${
              activeSubTab === 'analytics'
                ? 'bg-white text-[#2563EB] shadow-sm font-semibold'
                : 'text-[#64748B] hover:text-[#1E293B]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Loss Analytics</span>
          </button>

          <button
            onClick={() => setActiveSubTab('qr')}
            className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-all ${
              activeSubTab === 'qr'
                ? 'bg-white text-[#2563EB] shadow-sm font-semibold'
                : 'text-[#64748B] hover:text-[#1E293B]'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>QR Mobile Pass</span>
          </button>
        </div>
      </div>

      {/* Sub-view Rendering */}
      {activeSubTab === 'market' && <PriceIntelligenceView />}
      {activeSubTab === 'analytics' && <AnalyticsTab />}
      {activeSubTab === 'qr' && <SettingsTab onOpenMobileView={onOpenMobileView} />}
    </div>
  );
};
