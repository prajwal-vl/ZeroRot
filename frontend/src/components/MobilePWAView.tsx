import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  Thermometer,
  Droplets,
  Clock,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  DollarSign,
  Bell,
  RefreshCw,
  Radio,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';
import { DataBadge } from './DataBadge';

interface MobilePWAViewProps {
  token: string;
  onBackToDashboard: () => void;
}

export const MobilePWAView: React.FC<MobilePWAViewProps> = ({ token, onBackToDashboard }) => {
  const [mobileData, setMobileData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [ackMessage, setAckMessage] = useState<string | null>(null);
  const [notificationState, setNotificationState] = useState<'default' | 'granted' | 'denied'>('default');

  const wsRef = useRef<WebSocket | null>(null);

  // Check browser notification permission
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationState(Notification.permission as any);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setNotificationState(perm as any);
        if (perm === 'granted') {
          new Notification('ZERO ROOT Mobile Connected', {
            body: 'You will receive real-time temperature and shelf-life alert notifications.',
          });
        }
      } catch (e) {
        console.warn('Notification permission error:', e);
      }
    }
  };

  const fetchAsset = async () => {
    try {
      const res = await api.getMobileAsset(token);
      setMobileData(res);
      setErrorMsg(null);
    } catch (err: any) {
      console.error('Mobile fetch error:', err);
      setErrorMsg(err.message || 'Access session invalid or expired.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAsset();

    // Setup live WebSocket with polling fallback
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/simulation`;

    let isSubscribed = true;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = () => {
        if (!isSubscribed) return;
        // When simulation ticks, fetch fresh bound asset data
        fetchAsset();
      };
    } catch (e) {
      console.warn('Mobile WS init error:', e);
    }

    const interval = setInterval(fetchAsset, 2500);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
      if (wsRef.current) wsRef.current.close();
    };
  }, [token]);

  const handleAcknowledge = async (alertId: string) => {
    try {
      await api.acknowledgeAlert(alertId);
      setAckMessage('Alert acknowledged and logged to ledger.');
      fetchAsset();
      setTimeout(() => setAckMessage(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] flex flex-col items-center justify-center p-6 text-center">
        <Smartphone className="w-10 h-10 text-[#2563EB] animate-bounce mb-3" />
        <h2 className="text-base font-bold text-[#1E293B]">Connecting to Mobile Node...</h2>
        <p className="text-xs text-[#64748B] mt-1 font-mono">Verifying cryptographic session token</p>
      </div>
    );
  }

  if (errorMsg || !mobileData) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-[#DC2626] mb-3">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-[#1E293B]">Mobile Pass Inactive</h2>
        <p className="text-xs text-[#64748B] mt-2 max-w-sm">
          {errorMsg || 'This QR session token is expired or has been revoked by the system administrator.'}
        </p>
        <button
          onClick={onBackToDashboard}
          className="mt-6 px-4 py-2 bg-[#2563EB] text-white rounded-lg text-xs font-semibold"
        >
          Return to Platform
        </button>
      </div>
    );
  }

  const { asset_data: asset, session, alerts, ambient } = mobileData;
  const isTruck = session.asset_type === 'TRUCK';
  const temp = isTruck ? asset.mean_cargo_temp_c : asset.internal_temp_c;
  const rh = asset.internal_rh_pct;
  const activeAlerts = (alerts || []).filter((a: any) => !a.acknowledged);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] flex flex-col max-w-md mx-auto shadow-xl border-x border-[#E2E8F0] font-sans pb-10">
      {/* Mobile Top Header */}
      <div className="bg-white border-b border-[#E2E8F0] p-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white font-black text-xs shadow-sm">
            ZR
          </div>
          <div>
            <h1 className="text-xs font-bold tracking-tight text-[#1E293B] uppercase">ZERO ROOT MOBILE</h1>
            <span className="text-[10px] text-[#2563EB] font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-pulse" />
              Live Field Link Active
            </span>
          </div>
        </div>

        <button
          onClick={onBackToDashboard}
          className="text-xs font-medium text-[#64748B] hover:text-[#1E293B] bg-[#F8FAFC] px-2.5 py-1.5 rounded-md border border-[#E2E8F0]"
        >
          Exit
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Notification Permission Prompt if not granted */}
        {notificationState !== 'granted' && 'Notification' in window && (
          <div className="p-3 bg-[#EFF6FF] border border-[#DBEAFE] rounded-xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#2563EB] shrink-0" />
              <span className="text-[#1E40AF] text-[11px] font-medium leading-tight">
                Enable mobile push alerts for immediate spoilage warnings.
              </span>
            </div>
            <button
              onClick={requestNotificationPermission}
              className="px-2.5 py-1 bg-[#2563EB] text-white rounded-md text-[11px] font-semibold whitespace-nowrap"
            >
              Enable
            </button>
          </div>
        )}

        {/* CRITICAL REQUIREMENT: Live Alert Section at Top of Dashboard */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-[#1E293B] flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-[#2563EB]" />
              Live Alerts &amp; Directives ({activeAlerts.length})
            </span>
            <span className="text-[10px] text-[#64748B]">Real-time Feed</span>
          </div>

          {activeAlerts.length === 0 ? (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs text-emerald-800 flex items-center justify-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>All environmental limits nominal. No warnings.</span>
            </div>
          ) : (
            activeAlerts.map((alert: any) => {
              const isCrit = alert.severity === 'CRITICAL';
              return (
                <div
                  key={alert.id}
                  className={`p-4 rounded-xl border space-y-2.5 text-xs transition-all shadow-sm ${
                    isCrit ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isCrit ? (
                        <AlertOctagon className="w-4 h-4 text-[#DC2626]" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-[#D97706]" />
                      )}
                      <strong className={`font-semibold ${isCrit ? 'text-[#DC2626]' : 'text-[#D97706]'}`}>
                        {alert.title}
                      </strong>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isCrit ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'
                    }`}>
                      {alert.severity}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#475569] leading-relaxed">
                    {alert.message}
                  </p>

                  {/* AI Suggested Action */}
                  <div className="p-2.5 bg-white rounded-lg border border-[#E2E8F0] space-y-1">
                    <span className="text-[10px] text-[#2563EB] font-bold uppercase flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#2563EB]" />
                      AI Suggested Directive
                    </span>
                    <p className="text-[11px] text-[#1E293B] font-medium leading-tight">
                      {alert.title.includes('High Temperature')
                        ? 'Transfer Produce: Move batch to refrigerated warehouse zone (4°C) within 24h to arrest respiration.'
                        : alert.title.includes('Door')
                        ? 'Close Cargo Hatch: Ingress rate 0.42 kW/m² will elevate core temperature within 20 mins.'
                        : 'Adjust Damper: Increase vent aperture to 35% to lower CO2 concentration below 2.0%.'}
                    </p>
                  </div>

                  <button
                    onClick={() => handleAcknowledge(alert.id)}
                    className="w-full py-2 bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#1E293B] font-semibold rounded-lg text-xs transition-colors shadow-sm"
                  >
                    Acknowledge &amp; Dismiss
                  </button>
                </div>
              );
            })
          )}

          {ackMessage && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs text-center rounded-lg font-medium">
              {ackMessage}
            </div>
          )}
        </div>

        {/* Monitored Asset Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#64748B] uppercase font-semibold">BOUND ASSET</span>
            <span className="text-[10px] bg-[#EFF6FF] text-[#2563EB] px-2 py-0.5 rounded-full font-bold">
              {session.asset_type}
            </span>
          </div>
          <h2 className="text-sm font-bold text-[#1E293B]">{session.asset_title}</h2>
          <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
            <span>Commodity: <strong className="text-[#1E293B] capitalize">{asset.commodity}</strong></span>
            <span>Batch Load: <strong className="text-[#1E293B]">{asset.quantity_kg} kg</strong></span>
          </div>
        </div>

        {/* Big Health & Shelf-Life Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 text-center space-y-3 shadow-sm">
          <span className="text-xs uppercase text-[#64748B] font-semibold block">Produce Biological Index</span>
          <div className="text-4xl font-extrabold text-[#2563EB] tracking-tight">
            {asset.quality_score.toFixed(1)}%
          </div>

          <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] flex items-center justify-between text-xs">
            <div className="text-left">
              <span className="text-[#64748B] text-[10px] font-semibold block uppercase">REMAINING SHELF LIFE</span>
              <strong className="text-[#1E293B] text-base font-bold">{asset.remaining_shelf_life_days.toFixed(1)} Days</strong>
            </div>
            <div className="text-right">
              <span className="text-[#64748B] text-[10px] font-semibold block uppercase">SPOILAGE RISK</span>
              <strong
                className={`text-sm font-bold ${
                  asset.spoilage_category === 'LOW'
                    ? 'text-[#16A34A]'
                    : asset.spoilage_category === 'MODERATE'
                    ? 'text-[#D97706]'
                    : 'text-[#DC2626]'
                }`}
              >
                {asset.spoilage_risk_pct.toFixed(0)}% ({asset.spoilage_category})
              </strong>
            </div>
          </div>
        </div>

        {/* Environmental Telemetry Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-1.5 text-[#64748B] text-xs mb-1 font-semibold">
              <Thermometer className="w-4 h-4 text-[#2563EB]" />
              <span>Internal Temp</span>
            </div>
            <div className="text-2xl font-bold text-[#1E293B]">
              {temp.toFixed(1)}°C
            </div>
            <span className="text-[10px] text-[#64748B] block mt-0.5">Outside: {ambient?.temperature_c ?? 28}°C</span>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-1.5 text-[#64748B] text-xs mb-1 font-semibold">
              <Droplets className="w-4 h-4 text-[#2563EB]" />
              <span>Air Humidity</span>
            </div>
            <div className="text-2xl font-bold text-[#1E293B]">
              {rh.toFixed(0)}%
            </div>
            <span className="text-[10px] text-[#64748B] block mt-0.5">Outside: {ambient?.relative_humidity_pct ?? 65}%</span>
          </div>
        </div>

        {/* Transit Telematics if truck */}
        {isTruck && (
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 space-y-2 text-xs shadow-sm">
            <span className="text-[#64748B] uppercase text-[10px] font-semibold block">Transit Fleet Status</span>
            <div className="flex justify-between border-b border-[#E2E8F0] pb-1">
              <span className="text-[#64748B]">Route Completion:</span>
              <strong className="text-[#1E293B]">{asset.route_progress_pct}%</strong>
            </div>
            <div className="flex justify-between border-b border-[#E2E8F0] pb-1">
              <span className="text-[#64748B]">ETA to Destination Mandi:</span>
              <strong className="text-[#2563EB]">{asset.eta_minutes.toFixed(0)} Minutes</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Reefer Door:</span>
              <strong className={asset.rear_door_open ? 'text-[#DC2626]' : 'text-[#16A34A]'}>
                {asset.rear_door_open ? 'DOOR OPEN' : 'SECURE / CLOSED'}
              </strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
