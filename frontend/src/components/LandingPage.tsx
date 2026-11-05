import React from 'react';
import {
  ShieldCheck,
  Truck,
  Warehouse,
  ScanLine,
  Snowflake,
  TrendingUp,
  Cpu,
  Layers,
  ArrowRight,
  Sparkles,
  Smartphone,
  CheckCircle2,
  Lock,
  Zap,
  Globe
} from 'lucide-react';

interface LandingPageProps {
  onLaunchDashboard: () => void;
  onExploreSimulations: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onLaunchDashboard,
  onExploreSimulations,
}) => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B]">
      {/* Top Navbar */}
      <nav className="h-16 bg-white border-b border-[#E2E8F0] px-6 max-w-7xl mx-auto flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white font-black text-sm tracking-tighter shadow-sm">
            ZR
          </div>
          <span className="font-bold text-[#1E293B] text-base tracking-tight">
            ZERO ROOT
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={onLaunchDashboard}
            className="px-4 py-2 bg-[#2563EB] hover:bg-[#1E40AF] text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span>Launch Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-6 max-w-6xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFF6FF] text-[#2563EB] text-xs font-semibold border border-[#DBEAFE]">
          <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
          <span>Industrial-Grade 2D AgriTech Digital Twin Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-[#1E293B] leading-tight max-w-4xl mx-auto">
          Intelligent Agriculture.<br />
          <span className="text-[#2563EB]">Reduced Losses.</span> Better Profits.
        </h1>

        <p className="text-sm sm:text-base text-[#64748B] max-w-3xl mx-auto leading-relaxed">
          An AI-powered digital twin platform transforming agricultural post-harvest management through intelligent storage, produce quality assessment, shelf-life prediction, and cold-chain monitoring.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <button
            onClick={onLaunchDashboard}
            className="px-6 py-3 bg-[#2563EB] hover:bg-[#1E40AF] text-white font-semibold text-sm rounded-lg transition-all shadow-sm flex items-center gap-2 hover:scale-[1.01]"
          >
            <span>Launch Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onExploreSimulations}
            className="px-6 py-3 bg-white hover:bg-[#F8FAFC] text-[#1E293B] font-semibold text-sm rounded-lg border border-[#E2E8F0] transition-all flex items-center gap-2 shadow-sm"
          >
            <Layers className="w-4 h-4 text-[#2563EB]" />
            <span>Explore 2D Simulations</span>
          </button>
        </div>
      </section>

      {/* The Complete Agricultural Lifecycle Workflow */}
      <section className="py-12 border-y border-[#E2E8F0] bg-white px-6">
        <div className="max-w-6xl mx-auto">
          <span className="text-xs uppercase text-[#64748B] font-semibold block text-center mb-6">
            End-to-End Post-Harvest Lifecycle Pipeline
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-center text-xs">
            {[
              { step: '01', title: 'Harvest' },
              { step: '02', title: 'Quality Inspection' },
              { step: '03', title: 'Storage Allocation' },
              { step: '04', title: 'Shelf-Life Prediction' },
              { step: '05', title: 'Intelligent Storage' },
              { step: '06', title: 'Transportation' },
              { step: '07', title: 'Price Intelligence' },
              { step: '08', title: 'Selling Optimizer' },
            ].map((item, idx) => (
              <div
                key={item.step}
                className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-1 hover:border-[#2563EB] transition-colors"
              >
                <span className="text-[10px] text-[#2563EB] font-bold block">{item.step}</span>
                <span className="text-[#1E293B] font-semibold block text-[11px] leading-tight">{item.title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Two Core Modules */}
      <section className="py-16 px-6 max-w-6xl mx-auto space-y-10">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#1E293B]">
            Two Interconnected Operational Modules
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] max-w-2xl mx-auto">
            Powered by a unified AI intelligence engine, Arrhenius bio-decay kinetics, and real-time IoT digital twin simulation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Module 1 */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-8 shadow-sm space-y-4 hover:border-[#2563EB] transition-all">
            <div className="w-12 h-12 rounded-lg bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center text-[#2563EB]">
              <Warehouse className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-[#2563EB] font-bold uppercase tracking-wider block">MODULE 01</span>
              <h3 className="text-xl font-bold text-[#1E293B] mt-0.5">Post-Harvest Loss Prevention</h3>
            </div>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Automated 2D optical conveyor camera defect detection, rack chamber allocation, mud/brick traditional storage simulation with Dalton's law gas diffusion, and Arrhenius shelf-life forecasting.
            </p>
            <ul className="space-y-2 text-xs text-[#1E293B] pt-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                <span>OpenCV HSV lesion segmentation &amp; sorting</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                <span>Dynamic humidity, respiration heat &amp; damper control</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                <span>Predictive shelf-life degradation curves</span>
              </li>
            </ul>
          </div>

          {/* Module 2 */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-8 shadow-sm space-y-4 hover:border-[#2563EB] transition-all">
            <div className="w-12 h-12 rounded-lg bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center text-[#2563EB]">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-[#2563EB] font-bold uppercase tracking-wider block">MODULE 02</span>
              <h3 className="text-xl font-bold text-[#1E293B] mt-0.5">Intelligent Cold Chain Monitoring</h3>
            </div>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Multi-zone 2D refrigerated truck simulation, spatial thermal gradients, highway transit telemetry, route ETA calculations, and automatic cold-spot regulation.
            </p>
            <ul className="space-y-2 text-xs text-[#1E293B] pt-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                <span>Front, middle, rear thermal microclimates</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                <span>External heatwave &amp; compressor failure fault injectors</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                <span>Agmarknet mandi profit optimization &amp; QR mobile pass</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E2E8F0] bg-white py-8 px-6 text-center text-xs text-[#64748B]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#2563EB] flex items-center justify-center text-white font-bold text-xs">
              ZR
            </div>
            <span className="font-semibold text-[#1E293B]">ZERO ROOT AgriTech Platform</span>
          </div>
          <span>Built for agricultural loss reduction and cold-chain intelligence.</span>
        </div>
      </footer>
    </div>
  );
};
