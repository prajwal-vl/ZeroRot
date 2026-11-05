import React, { useState, useEffect } from 'react';
import {
  Settings,
  QrCode,
  Smartphone,
  ExternalLink,
  ShieldCheck,
  Key,
  CheckCircle2,
  Copy,
  RefreshCw,
  Cpu,
  Layers,
  AlertTriangle,
  Globe,
  Trash2,
  Radio,
  Clock,
  Sparkles
} from 'lucide-react';
import { DataBadge } from './DataBadge';
import { api, QRConfigStatus } from '../services/api';
import { AccountManagementView } from './AccountManagementView';

interface SettingsTabProps {
  onOpenMobileView: (token: string) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ onOpenMobileView }) => {
  const [assetType, setAssetType] = useState<string>('TRUCK');
  const [qrSession, setQrSession] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [revokedMessage, setRevokedMessage] = useState<string | null>(null);

  // Public URL configuration state
  const [qrConfig, setQrConfig] = useState<QRConfigStatus | null>(null);
  const [publicUrlInput, setPublicUrlInput] = useState<string>('');
  const [isSavingUrl, setIsSavingUrl] = useState<boolean>(false);
  const [configSuccess, setConfigSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const config = await api.getQRConfig();
      setQrConfig(config);
      setPublicUrlInput(config.public_app_url || '');
    } catch (e) {
      console.warn('Failed to load QR config:', e);
    }
  };

  const handleSavePublicUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingUrl(true);
    setConfigSuccess(null);
    try {
      const res = await api.updateQRConfig(publicUrlInput.trim());
      setQrConfig(res);
      setConfigSuccess('Public Application URL saved successfully.');
      setTimeout(() => setConfigSuccess(null), 3000);
    } catch (err: any) {
      alert(`Error saving URL: ${err.message}`);
    } finally {
      setIsSavingUrl(false);
    }
  };

  const handleGenerateQR = async () => {
    setIsGenerating(true);
    setRevokedMessage(null);
    try {
      const assetId = assetType === 'TRUCK' ? 'truck_zr_104' : assetType === 'COLD_STORAGE' ? 'wh_zero_01' : 'trad_store_01';
      const title = assetType === 'TRUCK' ? 'Reefer Truck KA-04-ZR-2026' : assetType === 'COLD_STORAGE' ? 'Multi-Chamber Cold Hub' : 'On-Farm Post-Harvest Store';
      const res = await api.generateQRSession(assetType, assetId, title);
      setQrSession(res);
    } catch (err: any) {
      alert(err.message || 'QR generation failed. Ensure Public Application URL is configured.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevokeSession = async () => {
    if (!qrSession?.token) return;
    try {
      await api.revokeQRSession(qrSession.token);
      setRevokedMessage('Session token has been cryptographically revoked.');
      setQrSession(null);
      setTimeout(() => setRevokedMessage(null), 4000);
    } catch (e) {
      alert('Failed to revoke session token.');
    }
  };

  const handleCopyLink = () => {
    if (!qrSession) return;
    navigator.clipboard.writeText(qrSession.target_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isPublicConfigured = qrConfig?.is_configured ?? false;

  return (
    <div className="space-y-6 text-[#1E293B]">
      {/* Header - Blue SaaS Top Banner */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]">
              <Settings className="w-3.5 h-3.5 text-[#2563EB]" />
              SYSTEM SETTINGS &amp; QR GATEWAY
            </span>
            <DataBadge label="SECURE" sourceText="HMAC Tokenized" />
          </div>
          <h2 className="text-xl font-bold text-[#1E293B] mt-2 tracking-tight">
            System Configuration &amp; Mobile QR Tokenizer
          </h2>
          <p className="text-sm text-[#64748B] mt-1 max-w-2xl">
            Configure external public access URLs and generate cryptographically signed QR tokens granting farmers instant
            mobile browser access to field telemetry and real-time loss alerts without login hurdles.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Public URL Configuration & QR Generator */}
        <div className="lg:col-span-7 space-y-6">
          {/* Public Application URL Card (CRITICAL REQUIREMENT) */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#2563EB]" />
                <h3 className="text-sm font-semibold text-[#1E293B]">Public Application URL Gateway</h3>
              </div>
              <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-medium ${
                isPublicConfigured
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {isPublicConfigured ? 'Gateway Active' : 'Unconfigured'}
              </span>
            </div>

            {!isPublicConfigured && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3 text-xs text-amber-900 leading-relaxed">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">Public QR access is not configured.</strong>
                  Set the <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900 font-mono">PUBLIC_APP_URL</code> environment variable or enter your tunnel URL below to enable mobile QR scanning. ZeroRoot strictly forbids encoding localhost or 127.0.0.1 in QR codes.
                </div>
              </div>
            )}

            <form onSubmit={handleSavePublicUrl} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#1E293B] mb-1">
                  Public Application URL
                </label>
                <input
                  type="text"
                  placeholder="https://xyz.ngrok-free.app or https://zeroroot.agritech.com"
                  value={publicUrlInput}
                  onChange={(e) => setPublicUrlInput(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3.5 py-2 text-xs text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                />
                <span className="block text-[11px] text-[#64748B] mt-1">
                  Enter your ngrok, Cloudflare tunnel, or domain URL. External phones will open <code className="font-mono text-[#2563EB]">/monitor/{'{token}'}</code> through this address.
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="submit"
                  disabled={isSavingUrl}
                  className="px-4 py-2 bg-[#2563EB] hover:bg-[#1E40AF] text-white rounded-lg text-xs font-medium transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSavingUrl ? 'Saving Gateway...' : 'Save Public URL'}
                </button>

                {configSuccess && (
                  <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {configSuccess}
                  </span>
                )}
              </div>
            </form>
          </div>

          {/* QR Generator Card */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-[#2563EB]" />
                <h3 className="text-sm font-semibold text-[#1E293B]">Generate Cryptographic Mobile Token</h3>
              </div>
              <span className="text-xs text-[#64748B]">Route: /monitor/:token</span>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-[#1E293B] font-semibold block mb-1.5">Select Monitored Asset:</label>
                <select
                  value={assetType}
                  onChange={(e) => setAssetType(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3.5 py-2.5 text-[#1E293B] font-medium focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                >
                  <option value="TRUCK">Refrigerated Transit Truck (KA-04-ZR-2026)</option>
                  <option value="COLD_STORAGE">Intelligent Multi-Chamber Cold Hub (wh_zero_01)</option>
                  <option value="BATCH">Traditional On-Farm Mud/Brick Store (trad_store_01)</option>
                </select>
              </div>

              <button
                onClick={handleGenerateQR}
                disabled={isGenerating || !isPublicConfigured}
                className="w-full py-2.5 bg-[#2563EB] hover:bg-[#1E40AF] text-white font-medium text-xs rounded-lg shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <QrCode className="w-4 h-4" />
                <span>{isGenerating ? 'Generating Encrypted Token...' : 'Generate Scannable Farmer QR Code'}</span>
              </button>

              {!isPublicConfigured && (
                <span className="block text-center text-[11px] text-[#DC2626] font-medium">
                  QR generation disabled until Public Application URL is saved.
                </span>
              )}
            </div>

            {/* Generated QR Session Presentation */}
            {qrSession && (
              <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-4">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="bg-white p-2.5 rounded-lg shrink-0 border border-[#E2E8F0] shadow-sm">
                    <img
                      src={qrSession.qr_data_url}
                      alt="Farmer Access QR Code"
                      className="w-36 h-36 object-contain"
                    />
                  </div>

                  <div className="space-y-2 text-xs text-[#1E293B] flex-1">
                    <div>
                      <span className="text-[#64748B] block text-[10px] font-semibold uppercase">MONITORED ASSET</span>
                      <strong className="text-[#1E293B] text-sm font-bold">{qrSession.asset_title}</strong>
                    </div>

                    <div className="text-[11px] text-[#64748B]">
                      <span>Expires: </span>
                      <strong className="text-[#1E293B]">{new Date(qrSession.expires_at).toLocaleString()}</strong>
                    </div>

                    <div className="text-[11px] text-[#64748B] truncate">
                      <span>URL: </span>
                      <code className="text-[#2563EB] font-mono text-[10px]">{qrSession.target_url}</code>
                    </div>

                    <div className="pt-2 flex flex-wrap gap-2">
                      <button
                        onClick={() => onOpenMobileView(qrSession.token)}
                        className="px-3 py-1.5 bg-[#2563EB] hover:bg-[#1E40AF] text-white font-medium rounded-lg flex items-center gap-1.5 text-xs transition-colors shadow-sm"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Launch Mobile View</span>
                      </button>
                      <button
                        onClick={handleCopyLink}
                        className="px-3 py-1.5 bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#1E293B] font-medium rounded-lg flex items-center gap-1.5 text-xs transition-colors shadow-sm"
                      >
                        <Copy className="w-3.5 h-3.5 text-[#64748B]" />
                        <span>{copied ? 'Copied' : 'Copy Link'}</span>
                      </button>
                      <button
                        onClick={handleRevokeSession}
                        className="px-3 py-1.5 bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 font-medium rounded-lg flex items-center gap-1.5 text-xs transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Revoke Pass</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {revokedMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-red-600" />
                <span>{revokedMessage}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Platform Diagnostics & Architecture Details */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#E2E8F0]">
              <Cpu className="w-4 h-4 text-[#2563EB]" />
              <h3 className="text-sm font-semibold text-[#1E293B]">Platform Connectivity Diagnostics</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] flex justify-between items-center">
                <div>
                  <span className="text-[#1E293B] font-semibold block">Open-Meteo Weather API</span>
                  <span className="text-[#64748B] text-[11px]">Real-time solar, temperature &amp; humidity</span>
                </div>
                <DataBadge label="LIVE" sourceText="Synchronized" />
              </div>

              <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] flex justify-between items-center">
                <div>
                  <span className="text-[#1E293B] font-semibold block">Groq AI Reasoning Engine</span>
                  <span className="text-[#64748B] text-[11px]">Llama-3.3-70B NLP agricultural advisory</span>
                </div>
                <DataBadge label="PREDICTED" sourceText="Active" />
              </div>

              <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] flex justify-between items-center">
                <div>
                  <span className="text-[#1E293B] font-semibold block">Computer Vision Pipeline</span>
                  <span className="text-[#64748B] text-[11px]">OpenCV HSV lesion segmentation</span>
                </div>
                <DataBadge label="PREDICTED" sourceText="Ready" />
              </div>

              <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] flex justify-between items-center">
                <div>
                  <span className="text-[#1E293B] font-semibold block">Relational Database Engine</span>
                  <span className="text-[#64748B] text-[11px]">SQLite 3 / PostgreSQL multi-entity store</span>
                </div>
                <DataBadge label="LIVE" sourceText="Persisted" />
              </div>

              <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] flex justify-between items-center">
                <div>
                  <span className="text-[#1E293B] font-semibold block">Digital Twin Simulation Engine</span>
                  <span className="text-[#64748B] text-[11px]">2D Canvas + Arrhenius/Q10 kinetics</span>
                </div>
                <DataBadge label="SIMULATED" sourceText="Running" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-[#1E293B] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Token Security Policy</span>
            </h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Every generated QR code embeds a 256-bit entropy token expiring within 24 hours. No farmer credentials or system passwords are ever transmitted or written to unencrypted storage. Tokens can be instantly revoked by the operator at any time.
            </p>
          </div>
        </div>
      </div>

      {/* Account Management (Admin Privileges) */}
      <AccountManagementView />
    </div>
  );
};
