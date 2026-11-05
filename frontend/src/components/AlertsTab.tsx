import React, { useState, useEffect } from 'react';
import {
  Bell,
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  X,
  Send,
  MessageSquare,
  RefreshCw,
  Clock,
  Radio
} from 'lucide-react';
import { AlertItem } from '../types/simulation';
import { DataBadge } from './DataBadge';
import { api } from '../services/api';

interface AlertsTabProps {
  alerts: AlertItem[];
  onAcknowledge: (alertId: string) => void;
  onClose?: () => void;
}

export const AlertsTab: React.FC<AlertsTabProps> = ({ alerts, onAcknowledge, onClose }) => {
  const unreadAlerts = alerts.filter((a) => !a.acknowledged);
  const acknowledgedAlerts = alerts.filter((a) => a.acknowledged);

  const [telegramStatus, setTelegramStatus] = useState<any | null>(null);
  const [telegramLoading, setTelegramLoading] = useState<boolean>(false);
  const [telegramActionMsg, setTelegramActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadTelegramStatus = async () => {
    try {
      const data = await api.getTelegramStatus();
      setTelegramStatus(data);
    } catch (e) {
      console.warn('Failed to fetch Telegram status:', e);
    }
  };

  useEffect(() => {
    loadTelegramStatus();
  }, []);

  const handleTestPing = async () => {
    setTelegramLoading(true);
    setTelegramActionMsg(null);
    try {
      const res = await api.sendTelegramTest();
      setTelegramActionMsg({ type: 'success', text: 'Diagnostic ping successfully delivered to your Telegram chat!' });
      setTimeout(() => setTelegramActionMsg(null), 5000);
    } catch (err: any) {
      setTelegramActionMsg({ type: 'error', text: err.message || 'Failed to dispatch test ping to Telegram' });
    } finally {
      setTelegramLoading(false);
    }
  };

  const handleManualDigest = async () => {
    setTelegramLoading(true);
    setTelegramActionMsg(null);
    try {
      const res = await api.sendTelegramDigest();
      setTelegramActionMsg({ type: 'success', text: '10-minute simulation telemetry digest delivered to Telegram!' });
      setTimeout(() => setTelegramActionMsg(null), 5000);
    } catch (err: any) {
      setTelegramActionMsg({ type: 'error', text: err.message || 'Failed to dispatch digest to Telegram' });
    } finally {
      setTelegramLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-[#1E293B]">
      {/* Header - Blue SaaS Top Banner */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]">
              <Bell className="w-3.5 h-3.5 text-[#2563EB]" />
              REAL-TIME ALERT INTELLIGENCE
            </span>
            <DataBadge label="SIMULATED" sourceText="Boundary Monitoring" />
          </div>
          <h2 className="text-xl font-bold text-[#1E293B] mt-2 tracking-tight">
            Storage &amp; Transit Threshold Alerts
          </h2>
          <p className="text-sm text-[#64748B] mt-1 max-w-2xl">
            Continuously evaluates thermal boundaries, hypoxia risks, compressor states, and transit breaches. Provides automated AI natural language mitigation plans for immediate field deployment.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#F8FAFC] px-3.5 py-1.5 rounded-lg border border-[#E2E8F0] text-xs">
            <span className="text-[#64748B]">Unacknowledged: </span>
            <strong className="text-[#DC2626] font-bold ml-1">{unreadAlerts.length}</strong>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#1E293B] hover:bg-[#F8FAFC] transition-colors"
              title="Close Alerts"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Telegram Bot Live Dispatch & Status Panel */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#2563EB] animate-pulse" />
            <h3 className="font-bold text-sm text-[#1E293B]">Telegram Bot Alert Dispatch System</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              telegramStatus?.is_configured
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              {telegramStatus?.status_label ?? 'CHECKING STATUS...'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTestPing}
              disabled={telegramLoading}
              className="px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-slate-100 disabled:opacity-50 text-[#1E293B] font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>{telegramLoading ? 'Dispatching...' : 'Send Test Ping'}</span>
            </button>

            <button
              onClick={handleManualDigest}
              disabled={telegramLoading}
              className="px-3 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Dispatch 10-Min Digest</span>
            </button>
          </div>
        </div>

        {telegramActionMsg && (
          <div className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
            telegramActionMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {telegramActionMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{telegramActionMsg.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
            <span className="text-[10px] text-[#64748B] block font-semibold uppercase">Configured Telegram Bot</span>
            <span className="font-mono font-bold text-xs text-[#1E293B]">
              {telegramStatus?.bot_token_masked || 'Not Configured in .env'}
            </span>
          </div>

          <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
            <span className="text-[10px] text-[#64748B] block font-semibold uppercase">Target Chat / Group ID</span>
            <span className="font-mono font-bold text-xs text-[#1E293B]">
              {telegramStatus?.chat_id_masked || 'Not Configured in .env'}
            </span>
          </div>

          <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
            <span className="text-[10px] text-[#64748B] block font-semibold uppercase">Cadence &amp; Throttling</span>
            <span className="font-bold text-xs text-[#2563EB]">
              10-Min Telemetry Digest • 3-Min Alert Throttling
            </span>
          </div>
        </div>
      </div>

      {/* Active Unacknowledged Alerts */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase text-[#1E293B]">
          Active Alerts ({unreadAlerts.length})
        </h3>

        {unreadAlerts.length === 0 ? (
          <div className="p-8 bg-white border border-[#E2E8F0] rounded-xl text-center text-[#64748B] text-xs flex flex-col items-center justify-center gap-2 shadow-sm">
            <ShieldCheck className="w-8 h-8 text-[#16A34A]" />
            <span className="text-[#1E293B] font-semibold text-sm">All Systems Regulated</span>
            <p className="text-[#64748B] max-w-md">
              No active thermal or environmental excursions. Storage facilities and cold chain transit operating within nominal safety specifications.
            </p>
          </div>
        ) : (
          unreadAlerts.map((alert) => {
            const isCritical = alert.severity === 'CRITICAL';
            return (
              <div
                key={alert.id}
                className={`p-5 rounded-xl border transition-all shadow-sm ${
                  isCritical
                    ? 'bg-red-50/50 border-red-200'
                    : 'bg-amber-50/50 border-amber-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2.5 rounded-lg shrink-0 mt-0.5 ${
                        isCritical ? 'bg-red-100 text-[#DC2626]' : 'bg-amber-100 text-[#D97706]'
                      }`}
                    >
                      {isCritical ? <AlertOctagon className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-[#1E293B]">{alert.title}</h4>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            isCritical ? 'bg-[#DC2626] text-white' : 'bg-[#D97706] text-white'
                          }`}
                        >
                          {alert.severity}
                        </span>
                        <span className="text-[11px] text-[#64748B]">
                          Source: <strong className="text-[#1E293B] uppercase">{alert.module}</strong>
                        </span>
                      </div>
                      <p className="text-xs text-[#475569] mt-1 leading-relaxed">{alert.message}</p>

                      {/* AI Recommendation Box */}
                      {alert.recommended_action && (
                        <div className="mt-3 p-3 bg-white rounded-lg border border-[#E2E8F0] space-y-1">
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#2563EB]">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>AI Corrective Action Recommendation</span>
                          </div>
                          <p className="text-xs text-[#1E293B] leading-relaxed">
                            {alert.recommended_action}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => onAcknowledge(alert.id)}
                    className="self-end sm:self-center px-4 py-2 bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#1E293B] font-semibold text-xs rounded-lg transition-colors whitespace-nowrap shadow-sm shrink-0"
                  >
                    Acknowledge
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Acknowledged History */}
      {acknowledgedAlerts.length > 0 && (
        <div className="space-y-3 pt-4">
          <h3 className="text-xs font-semibold uppercase text-[#64748B]">
            Acknowledged Alerts History ({acknowledgedAlerts.length})
          </h3>

          <div className="bg-white border border-[#E2E8F0] rounded-xl divide-y divide-[#E2E8F0] overflow-hidden shadow-sm">
            {acknowledgedAlerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className="p-4 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                  <div>
                    <span className="font-semibold text-[#1E293B] block">{alert.title}</span>
                    <span className="text-[11px] text-[#64748B]">{alert.message}</span>
                  </div>
                </div>
                <span className="text-[11px] text-[#16A34A] font-semibold shrink-0">Resolved</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
