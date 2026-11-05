import React from 'react';
import {
  LayoutDashboard,
  Warehouse,
  Truck,
  TrendingUp,
  Settings,
  Sliders,
  Layers,
  Bell,
  CheckCircle2,
  PackageCheck,
  Activity,
  Sparkles,
  ShieldCheck,
  History,
  Radio
} from 'lucide-react';

export type MainNavSection =
  | 'overview'
  | 'digital_twin'
  | 'batch_management'
  | 'transportation'
  | 'predictions'
  | 'ai_recommendations'
  | 'mandi_prices'
  | 'preservation'
  | 'simulation_lab'
  | 'alerts'
  | 'history'
  | 'settings'
  // Legacy aliases for backward compatibility
  | 'post_harvest'
  | 'cold_chain'
  | 'market_reports';

interface SidebarProps {
  currentSection: MainNavSection;
  onSelectSection: (section: MainNavSection) => void;
  unreadAlertCount: number;
}

interface NavCategory {
  title: string;
  items: Array<{
    key: MainNavSection;
    label: string;
    description: string;
    icon: React.ElementType;
    badge?: number;
  }>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  onSelectSection,
  unreadAlertCount,
}) => {
  const categories: NavCategory[] = [
    {
      title: 'Digital Twin Operations',
      items: [
        {
          key: 'overview',
          label: 'Overview',
          description: 'Platform summary & health',
          icon: LayoutDashboard,
        },
        {
          key: 'digital_twin',
          label: '3D Digital Twin',
          description: 'Warehouse & produce shaders',
          icon: Warehouse,
        },
        {
          key: 'batch_management',
          label: 'Batch Management',
          description: 'Traceability & lifecycle',
          icon: PackageCheck,
        },
        {
          key: 'transportation',
          label: '3D Transportation',
          description: 'Reefer truck & transit corridor',
          icon: Truck,
        },
      ],
    },
    {
      title: 'Intelligence & Economics',
      items: [
        {
          key: 'predictions',
          label: 'ML Predictions',
          description: 'Arrhenius kinetics & XAI',
          icon: Activity,
        },
        {
          key: 'ai_recommendations',
          label: 'AI Decision Agent',
          description: 'Sell, Store, or Ship solver',
          icon: Sparkles,
        },
        {
          key: 'mandi_prices',
          label: 'Mandi Prices',
          description: 'Live APMC & 14-day forecast',
          icon: TrendingUp,
        },
        {
          key: 'preservation',
          label: 'Preservation Hub',
          description: 'CA & 1-MCP counterfactuals',
          icon: ShieldCheck,
        },
      ],
    },
    {
      title: 'Lab & Platform',
      items: [
        {
          key: 'simulation_lab',
          label: 'Simulation Lab',
          description: 'Disruption shock injector',
          icon: Sliders,
        },
        {
          key: 'alerts',
          label: 'Alerts & Telegram',
          description: 'Push alerts & digest dispatch',
          icon: Bell,
          badge: unreadAlertCount > 0 ? unreadAlertCount : undefined,
        },
        {
          key: 'history',
          label: 'Simulation History',
          description: 'Audit trails & CSV export',
          icon: History,
        },
        {
          key: 'settings',
          label: 'Settings & QR Pass',
          description: 'User access & public URL',
          icon: Settings,
        },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 select-none shadow-xs overflow-y-auto">
      <div className="py-4 space-y-4">
        {categories.map((cat, idx) => (
          <div key={idx} className="space-y-1">
            <div className="px-5 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {cat.title}
              </span>
            </div>

            <nav className="space-y-0.5 px-3">
              {cat.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  currentSection === item.key ||
                  (item.key === 'digital_twin' && currentSection === 'post_harvest') ||
                  (item.key === 'transportation' && currentSection === 'cold_chain') ||
                  (item.key === 'mandi_prices' && currentSection === 'market_reports');

                return (
                  <button
                    key={item.key}
                    onClick={() => onSelectSection(item.key)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-all ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                          isActive ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate">
                        <span className="text-xs block font-bold leading-tight truncate">{item.label}</span>
                        <span className="text-[10px] text-slate-400 block leading-tight font-normal truncate">
                          {item.description}
                        </span>
                      </div>
                    </div>

                    {item.badge !== undefined && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-600 text-white shrink-0 ml-1">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Footer Branding */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[11px] font-bold text-slate-700">ZERO ROT Digital Twin</span>
        </div>
        <span className="text-[10px] text-slate-400 block mt-0.5">Project Code: AGR007 • v1.0.0</span>
      </div>
    </aside>
  );
};
