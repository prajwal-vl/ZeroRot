import React, { useState, useEffect } from 'react';
import {
  Warehouse,
  ScanLine,
  Snowflake,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  PackageCheck,
  PlusCircle,
  History,
  Scale,
  Thermometer,
  Droplets,
  AlertTriangle,
  Info,
  Eye,
  Trash2,
  Activity,
  QrCode,
  X,
  RefreshCw,
  Copy,
  Layers,
  ShieldCheck
} from 'lucide-react';
import { SimulationState } from '../types/simulation';
import { DataBadge } from './DataBadge';
import { TraditionalStorageView } from './TraditionalStorageView';
import { ConveyorInspectionView } from './ConveyorInspectionView';
import { ColdStorageView } from './ColdStorageView';
import { api, BatchRecord } from '../services/api';

interface PostHarvestTabProps {
  simulationState: SimulationState | null;
  simpleMode: boolean;
  onRefreshState: () => void;
}

export const PostHarvestTab: React.FC<PostHarvestTabProps> = ({
  simulationState,
  simpleMode,
  onRefreshState,
}) => {
  // Navigation mode: 'WORKFLOW' (Steps 1-4) or 'MANAGEMENT' (Dedicated Batch History & Ledger)
  const [activeTabMode, setActiveTabMode] = useState<'WORKFLOW' | 'MANAGEMENT'>('WORKFLOW');

  // Workflow steps: 1: Batch Entry, 2: Storage Choice, 3: Simulation Twin, 4: AI & Comparison
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Farmer registration fields
  const [farmerName, setFarmerName] = useState<string>('Prajwal V L');
  const [commodity, setCommodity] = useState<string>('tomato');
  const [quantityKg, setQuantityKg] = useState<number>(1200);
  const [harvestDate, setHarvestDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState<string>('Kolar Agricultural District');
  const [initialQuality, setInitialQuality] = useState<number>(95);
  const [storageType, setStorageType] = useState<'TRADITIONAL' | 'ADVANCED'>('TRADITIONAL');

  // Registered batch feedback
  const [createdBatch, setCreatedBatch] = useState<BatchRecord | null>(null);
  const [batchList, setBatchList] = useState<BatchRecord[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedBatchId, setCopiedBatchId] = useState<boolean>(false);

  // Sub-stage for Advanced Storage (Inspection vs Cold Hub)
  const [advancedStage, setAdvancedStage] = useState<'INSPECTION' | 'COLD_STORAGE'>('INSPECTION');

  // Modal states for Batch Management
  const [detailModalBatch, setDetailModalBatch] = useState<any | null>(null);
  const [historyModalBatch, setHistoryModalBatch] = useState<any | null>(null);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [deleteModalBatch, setDeleteModalBatch] = useState<BatchRecord | null>(null);
  const [permanentDeleteOption, setPermanentDeleteOption] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteNotification, setDeleteNotification] = useState<string | null>(null);
  const [resumeNotification, setResumeNotification] = useState<string | null>(null);

  const trad = simulationState?.traditional_storage;
  const cold = simulationState?.cold_storage;

  const loadBatches = async () => {
    try {
      const records = await api.getBatches();
      setBatchList(records);
    } catch (err) {
      console.warn('Failed to fetch batch list:', err);
    }
  };

  useEffect(() => {
    loadBatches();
  }, []);

  const handleRegisterBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const newBatch = await api.createBatch({
        farmer_name: farmerName,
        commodity_name: commodity,
        quantity_kg: quantityKg,
        harvest_date: harvestDate,
        location: location,
        initial_quality_score: initialQuality,
        storage_type: storageType,
      });
      setCreatedBatch(newBatch);
      await loadBatches();
      setCurrentStep(3); // Directly launch the selected storage digital twin simulation
      onRefreshState();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to persist produce batch.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyBatchId = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedBatchId(true);
    setTimeout(() => setCopiedBatchId(false), 2000);
  };

  // Open Details Modal
  const handleOpenDetails = async (batchId: number) => {
    try {
      const det = await api.getBatchDetails(batchId);
      setDetailModalBatch(det);
    } catch (err: any) {
      alert(`Error loading batch details: ${err.message}`);
    }
  };

  // Open Simulation History Modal
  const handleOpenHistory = async (batchId: number) => {
    setHistoryLoading(true);
    try {
      const hist = await api.getBatchHistory(batchId);
      setHistoryModalBatch(hist);
    } catch (err: any) {
      alert(`Error loading simulation history: ${err.message}`);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Resume Monitoring Action
  const handleResumeMonitoring = async (batch: BatchRecord) => {
    try {
      await api.resumeBatchSimulation(batch.id);
      setResumeNotification(`Simulation for batch ${batch.batch_code} is now active.`);
      await loadBatches();
      onRefreshState();

      // Configure current view to load this batch into the twin
      setCommodity(batch.commodity_name);
      setQuantityKg(batch.quantity_kg);
      setStorageType(batch.storage_type.includes('COLD') || batch.storage_type === 'ADVANCED' ? 'ADVANCED' : 'TRADITIONAL');
      setActiveTabMode('WORKFLOW');
      setCurrentStep(3); // Jump to 2D Digital Twin view
      setTimeout(() => setResumeNotification(null), 4000);
    } catch (err: any) {
      alert(`Error resuming simulation: ${err.message}`);
    }
  };

  // Execute Batch Deletion
  const handleConfirmDelete = async () => {
    if (!deleteModalBatch) return;
    setIsDeleting(true);
    try {
      const res = await api.deleteBatch(deleteModalBatch.id, permanentDeleteOption);
      setDeleteNotification(
        `Batch ${deleteModalBatch.batch_code} (${deleteModalBatch.commodity_name}) deleted successfully. Simulations halted and QR tokens revoked.`
      );
      setDeleteModalBatch(null);
      await loadBatches();
      onRefreshState();
      setTimeout(() => setDeleteNotification(null), 4000);
    } catch (err: any) {
      alert(`Error deleting batch: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 text-[#1E293B]">
      {/* SaaS Dashboard Title Header & Section Switcher */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#2563EB] uppercase tracking-wider">
              Module 1 — Post-Harvest Loss Prevention
            </span>
            <DataBadge label="DATABASE / VERIFIED" />
          </div>
          <h1 className="text-2xl font-bold text-[#1E293B] mt-1 tracking-tight">
            Produce Storage, Quality Assessment &amp; Batch Management
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Full agricultural post-harvest lifecycle: Register produce → 2D Digital Twin simulation → Shelf-life prediction → Batch ledger management.
          </p>
        </div>

        {/* Section Mode Switcher: Workflow vs Dedicated Batch Management */}
        <div className="flex items-center gap-1 bg-[#F8FAFC] p-1 rounded-lg border border-[#E2E8F0] text-xs">
          <button
            onClick={() => setActiveTabMode('WORKFLOW')}
            className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-all ${
              activeTabMode === 'WORKFLOW'
                ? 'bg-white text-[#2563EB] shadow-sm font-semibold'
                : 'text-[#64748B] hover:text-[#1E293B]'
            }`}
          >
            <Warehouse className="w-3.5 h-3.5" />
            <span>Digital Twin Workflow</span>
          </button>

          <button
            onClick={() => {
              setActiveTabMode('MANAGEMENT');
              loadBatches();
            }}
            className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-all ${
              activeTabMode === 'MANAGEMENT'
                ? 'bg-white text-[#2563EB] shadow-sm font-semibold'
                : 'text-[#64748B] hover:text-[#1E293B]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Batch Management &amp; Ledger ({batchList.length})</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {deleteNotification && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{deleteNotification}</span>
        </div>
      )}

      {resumeNotification && (
        <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs font-medium flex items-center gap-2">
          <Play className="w-4 h-4 text-[#2563EB] shrink-0" />
          <span>{resumeNotification}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 1: WORKFLOW VIEW (Steps 1 to 4)                  */}
      {/* ======================================================== */}
      {activeTabMode === 'WORKFLOW' && (
        <div className="space-y-6">
          {/* Workflow Progress Breadcrumb Bar */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 shadow-sm flex items-center justify-between text-xs">
            {[
              { num: 1, label: 'Batch Registration' },
              { num: 2, label: 'Storage Allocation' },
              { num: 3, label: '2D Simulation Twin' },
              { num: 4, label: 'AI Results & Comparison' },
            ].map((st) => (
              <button
                key={st.num}
                onClick={() => setCurrentStep(st.num)}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg font-medium transition-all ${
                  currentStep === st.num
                    ? 'bg-[#EFF6FF] text-[#2563EB] font-bold border border-[#DBEAFE]'
                    : currentStep > st.num
                    ? 'text-[#16A34A] hover:bg-[#F8FAFC]'
                    : 'text-[#64748B] hover:bg-[#F8FAFC]'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                    currentStep === st.num
                      ? 'bg-[#2563EB] text-white'
                      : currentStep > st.num
                      ? 'bg-emerald-100 text-[#16A34A]'
                      : 'bg-[#F1F5F9] text-[#64748B]'
                  }`}
                >
                  {currentStep > st.num ? '✓' : st.num}
                </span>
                <span className="hidden sm:inline">{st.label}</span>
              </button>
            ))}
          </div>

          {/* STEP 1: FARMER REGISTRATION & BATCH ENTRY */}
          {currentStep === 1 && (
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 md:p-8 space-y-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
                <div>
                  <span className="text-xs font-semibold text-[#2563EB] uppercase tracking-wider block">Step 01</span>
                  <h2 className="text-xl font-bold text-[#1E293B]">Farmer Produce Batch Registration</h2>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Register newly harvested batch. Generates unique identifier persisted to PostgreSQL / SQLite.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTabMode('MANAGEMENT')}
                  className="text-xs text-[#2563EB] hover:underline font-semibold flex items-center gap-1"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>View All Batches ({batchList.length})</span>
                </button>
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 text-[#DC2626] rounded-lg text-xs font-medium">
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleRegisterBatch} className="space-y-6 text-xs">
                {/* 1. Storage Methodology Selection (Traditional vs Cold Storage) */}
                <div className="space-y-3 pb-4 border-b border-[#E2E8F0]">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB] block">
                        Storage Methodology *
                      </span>
                      <h3 className="text-sm font-bold text-[#1E293B]">
                        Select Storage System: Traditional Store vs Intelligent Cold Storage
                      </h3>
                      <p className="text-xs text-[#64748B]">
                        Choose whether this produce will be stored in an on-farm Traditional Mud/Brick Store or an Intelligent Cold Storage Facility.
                      </p>
                    </div>
                    <span className="hidden sm:inline-block px-2.5 py-1 rounded bg-[#EFF6FF] text-[#2563EB] text-[11px] font-bold border border-[#DBEAFE]">
                      Selected: {storageType === 'TRADITIONAL' ? 'Traditional Mud/Brick' : 'Intelligent Cold Storage'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Option 1: Traditional Mud/Brick Store */}
                    <div
                      onClick={() => setStorageType('TRADITIONAL')}
                      className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${
                        storageType === 'TRADITIONAL'
                          ? 'border-[#2563EB] bg-blue-50/70 shadow-sm ring-2 ring-blue-500/20'
                          : 'border-[#E2E8F0] hover:border-slate-300 bg-[#F8FAFC]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Warehouse className={`w-5 h-5 ${storageType === 'TRADITIONAL' ? 'text-[#2563EB]' : 'text-slate-500'}`} />
                          <h4 className="font-bold text-sm text-[#1E293B]">Traditional Mud/Brick Store</h4>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          storageType === 'TRADITIONAL'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {storageType === 'TRADITIONAL' ? 'Selected' : 'Select'}
                        </span>
                      </div>
                      <p className="text-xs text-[#64748B] leading-relaxed">
                        Passive on-farm ambient storage with mud/brick walls, natural ventilation louvers, and thatch roof. No electrical refrigeration.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold">
                        <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">Zero Power Cost</span>
                        <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">Heatwave Spoilage Risk</span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">Natural Ventilation</span>
                      </div>
                    </div>

                    {/* Option 2: Intelligent Cold Storage Facility */}
                    <div
                      onClick={() => setStorageType('ADVANCED')}
                      className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${
                        storageType === 'ADVANCED'
                          ? 'border-[#2563EB] bg-blue-50/70 shadow-sm ring-2 ring-blue-500/20'
                          : 'border-[#E2E8F0] hover:border-slate-300 bg-[#F8FAFC]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Snowflake className={`w-5 h-5 ${storageType === 'ADVANCED' ? 'text-[#2563EB]' : 'text-slate-500'}`} />
                          <h4 className="font-bold text-sm text-[#1E293B]">Intelligent Cold Storage Facility</h4>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          storageType === 'ADVANCED'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {storageType === 'ADVANCED' ? 'Selected' : 'Select'}
                        </span>
                      </div>
                      <p className="text-xs text-[#64748B] leading-relaxed">
                        Automated 2D optical conveyor camera defect detection, sorting into destination bins, followed by controlled atmosphere cold storage with spatial heatmaps.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">3x–5x Shelf Life</span>
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">Optical CV Sorting</span>
                        <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">Multi-Chamber Thermostat</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  <div>
                    <label className="block font-semibold text-[#1E293B] mb-1.5">Farmer Name</label>
                    <input
                      type="text"
                      required
                      value={farmerName}
                      onChange={(e) => setFarmerName(e.target.value)}
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3.5 py-2 text-xs font-medium text-[#1E293B] focus:ring-2 focus:ring-[#2563EB] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#1E293B] mb-1.5">Commodity / Produce Type</label>
                    <select
                      value={commodity}
                      onChange={(e) => setCommodity(e.target.value)}
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3.5 py-2 text-xs font-semibold text-[#1E293B] focus:ring-2 focus:ring-[#2563EB] outline-none capitalize"
                    >
                      <option value="tomato">Tomato (Solanum lycopersicum)</option>
                      <option value="banana">Banana (Musa acuminata)</option>
                      <option value="orange">Orange (Citrus × sinensis)</option>
                      <option value="mango">Mango (Mangifera indica)</option>
                      <option value="guava">Guava (Psidium guajava)</option>
                      <option value="grape">Grapes (Vitis vinifera)</option>
                      <option value="potato">Potato (Solanum tuberosum)</option>
                      <option value="onion">Onion (Allium cepa)</option>
                      <option value="apple">Apple (Malus domestica)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-[#1E293B] mb-1.5">Batch Quantity (kg)</label>
                    <input
                      type="number"
                      required
                      min="100"
                      max="50000"
                      step="50"
                      value={quantityKg}
                      onChange={(e) => setQuantityKg(Number(e.target.value))}
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3.5 py-2 text-xs font-medium text-[#1E293B] focus:ring-2 focus:ring-[#2563EB] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#1E293B] mb-1.5">Harvest Date</label>
                    <input
                      type="date"
                      required
                      value={harvestDate}
                      onChange={(e) => setHarvestDate(e.target.value)}
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3.5 py-2 text-xs font-medium text-[#1E293B] focus:ring-2 focus:ring-[#2563EB] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#1E293B] mb-1.5">Farm Location / Mandi</label>
                    <input
                      type="text"
                      required
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3.5 py-2 text-xs font-medium text-[#1E293B] focus:ring-2 focus:ring-[#2563EB] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#1E293B] mb-1.5">Initial Quality Score (0–100%)</label>
                    <input
                      type="number"
                      min="50"
                      max="100"
                      step="0.5"
                      value={initialQuality}
                      onChange={(e) => setInitialQuality(Number(e.target.value))}
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3.5 py-2 text-xs font-medium text-[#1E293B] focus:ring-2 focus:ring-[#2563EB] outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-[#2563EB] hover:bg-[#1E40AF] text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <span>
                      {isSubmitting
                        ? 'Persisting to Ledger...'
                        : `Register Batch & Launch ${storageType === 'TRADITIONAL' ? 'Traditional Store' : 'Cold Storage'} Simulation`}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 2: STORAGE SELECTION */}
          {currentStep === 2 && (
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 md:p-8 space-y-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
                <div>
                  <span className="text-xs font-semibold text-[#2563EB] uppercase tracking-wider block">Step 02</span>
                  <h2 className="text-xl font-bold text-[#1E293B]">Storage Path Selection</h2>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Select storage methodology for batch <code className="text-[#2563EB] font-mono font-bold">{createdBatch?.batch_code || 'ZR-ACTIVE'}</code>. Both options evaluate identical central deterioration kinetics.
                  </p>
                </div>

                {createdBatch && (
                  <div className="flex items-center gap-2 bg-[#F8FAFC] px-3 py-1.5 rounded-lg border border-[#E2E8F0]">
                    <span className="text-xs text-[#64748B]">Batch ID:</span>
                    <strong className="text-xs font-mono font-bold text-[#2563EB]">{createdBatch.batch_code}</strong>
                    <button
                      onClick={() => handleCopyBatchId(createdBatch.batch_code)}
                      className="p-1 text-[#64748B] hover:text-[#1E293B]"
                      title="Copy Batch ID"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {copiedBatchId && <span className="text-[10px] text-emerald-600 font-semibold">Copied!</span>}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Option A: Traditional Storage */}
                <div
                  onClick={() => setStorageType('TRADITIONAL')}
                  className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                    storageType === 'TRADITIONAL'
                      ? 'border-[#2563EB] bg-[#EFF6FF]/40 shadow-sm'
                      : 'border-[#E2E8F0] hover:border-[#CBD5E1] bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-amber-700 uppercase">Option A</span>
                    <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200 font-semibold">
                      Passive Airflow
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#1E293B]">Traditional Mud/Brick Store</h3>
                  <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                    On-farm storage with mud and brick walls, natural ventilation through louvers, thatch roofing, and passive heat dissipation. No active refrigeration.
                  </p>
                  <ul className="mt-4 space-y-1.5 text-xs text-[#1E293B]">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Zero electricity operating tariff</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                      <span>Subject to ambient heatwave excursions</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-red-600" />
                      <span>High respiration rate &amp; accelerated decay</span>
                    </li>
                  </ul>
                </div>

                {/* Option B: Advanced Storage */}
                <div
                  onClick={() => setStorageType('ADVANCED')}
                  className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                    storageType === 'ADVANCED'
                      ? 'border-[#2563EB] bg-[#EFF6FF]/40 shadow-sm'
                      : 'border-[#E2E8F0] hover:border-[#CBD5E1] bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-[#2563EB] uppercase">Option B</span>
                    <span className="text-xs bg-[#EFF6FF] text-[#2563EB] px-2 py-0.5 rounded border border-[#DBEAFE] font-semibold">
                      Automated &amp; Refrigerated
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#1E293B]">Intelligent Cold Storage Facility</h3>
                  <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                    Automated 2D optical conveyor camera defect detection, sorting into destination bins, followed by controlled atmosphere cold storage with spatial temperature heatmaps.
                  </p>
                  <ul className="mt-4 space-y-1.5 text-xs text-[#1E293B]">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Computer vision defect extraction</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Thermostatic multi-zone temperature control</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>3x to 5x extended shelf-life preservation</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-[#E2E8F0]">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="text-xs text-[#64748B] hover:text-[#1E293B] font-semibold flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Batch Entry
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-6 py-2.5 bg-[#2563EB] hover:bg-[#1E40AF] text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-2"
                >
                  <span>Launch 2D Digital Twin Simulation</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: INTERACTIVE 2D SIMULATION TWIN */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {/* Top Banner with Switcher between Twin & Comparison */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-[#2563EB] uppercase">Active Twin:</span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]">
                    {storageType === 'TRADITIONAL' ? 'Traditional Store Digital Twin' : 'Advanced Conveyor & Cold Hub Twin'}
                  </span>
                  <span className="text-xs text-[#64748B] hidden sm:inline">
                    Batch: <strong className="text-[#1E293B] font-mono">{createdBatch?.batch_code || 'ZR-TOM-2026'}</strong> ({quantityKg} kg {commodity})
                  </span>
                </div>

                <button
                  onClick={() => setCurrentStep(4)}
                  className="px-4 py-2 bg-[#2563EB] hover:bg-[#1E40AF] text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <span>Inspect AI Shelf-Life &amp; Spoilage Prediction</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Render either Traditional Twin or Advanced Twin */}
              {storageType === 'TRADITIONAL' ? (
                <TraditionalStorageView
                  simulationState={simulationState}
                  simpleMode={simpleMode}
                  onRefreshState={onRefreshState}
                />
              ) : (
                <div className="space-y-6">
                  {/* Sub-selector for Advanced Storage: Conveyor Inspection vs Warehouse */}
                  <div className="flex items-center gap-2 bg-white border border-[#E2E8F0] p-2 rounded-xl shadow-sm text-xs">
                    <button
                      onClick={() => setAdvancedStage('INSPECTION')}
                      className={`flex-1 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                        advancedStage === 'INSPECTION'
                          ? 'bg-[#2563EB] text-white shadow-sm'
                          : 'text-[#64748B] hover:text-[#1E293B] hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <ScanLine className="w-4 h-4" />
                      <span>Stage 1: 2D Conveyor Inspection &amp; Defect Extraction</span>
                    </button>
                    <button
                      onClick={() => setAdvancedStage('COLD_STORAGE')}
                      className={`flex-1 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                        advancedStage === 'COLD_STORAGE'
                          ? 'bg-[#2563EB] text-white shadow-sm'
                          : 'text-[#64748B] hover:text-[#1E293B] hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <Snowflake className="w-4 h-4" />
                      <span>Stage 2: Multi-Chamber Warehouse Blueprint</span>
                    </button>
                  </div>

                  {advancedStage === 'INSPECTION' ? (
                    <ConveyorInspectionView />
                  ) : (
                    <ColdStorageView
                      simulationState={simulationState}
                      simpleMode={simpleMode}
                      onRefreshState={onRefreshState}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 4: AI RESULTS & COUNTERFACTUAL COMPARISON */}
          {currentStep === 4 && trad && (
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 md:p-8 space-y-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
                <div>
                  <span className="text-xs font-semibold text-[#2563EB] uppercase tracking-wider block">Step 04</span>
                  <h2 className="text-xl font-bold text-[#1E293B]">AI Shelf-Life &amp; Comparative Assessment</h2>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Evaluated against Arrhenius degradation kinetics and Dalton&apos;s law gas partial pressures.
                  </p>
                </div>
                <DataBadge label="PREDICTED" sourceText="Arrhenius + Dalton Model" />
              </div>

              {/* 3 Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4">
                  <span className="text-[10px] font-semibold text-[#64748B] uppercase block">PREDICTED SHELF LIFE</span>
                  <div className="text-2xl font-bold text-[#2563EB] mt-1">
                    {trad.remaining_shelf_life_days.toFixed(1)} Days
                  </div>
                  <span className="text-[11px] text-[#64748B] block mt-1">
                    Quality Index: {trad.quality_score.toFixed(1)}%
                  </span>
                </div>

                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4">
                  <span className="text-[10px] font-semibold text-[#64748B] uppercase block">SPOILAGE RISK</span>
                  <div className={`text-2xl font-bold mt-1 ${
                    trad.spoilage_category === 'LOW'
                      ? 'text-[#16A34A]'
                      : trad.spoilage_category === 'MODERATE'
                      ? 'text-[#D97706]'
                      : 'text-[#DC2626]'
                  }`}>
                    {trad.spoilage_risk_pct.toFixed(0)}% ({trad.spoilage_category})
                  </div>
                  <span className="text-[11px] text-[#64748B] block mt-1">
                    Estimated 7-day shrinkage
                  </span>
                </div>

                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4">
                  <span className="text-[10px] font-semibold text-[#64748B] uppercase block">CHAMBER TELEMETRY</span>
                  <div className="text-2xl font-bold text-[#1E293B] mt-1">
                    {trad.internal_temp_c.toFixed(1)}°C / {trad.internal_rh_pct.toFixed(0)}%
                  </div>
                  <span className="text-[11px] text-[#64748B] block mt-1">
                    Dalton O2: {trad.o2_partial_pressure_kpa.toFixed(3)} kPa
                  </span>
                </div>
              </div>

              {/* Groq AI Recommendation Box */}
              <div className="bg-[#EFF6FF]/70 border border-[#DBEAFE] rounded-xl p-5 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-[#2563EB] uppercase">
                  <Sparkles className="w-4 h-4 text-[#2563EB]" />
                  <span>AI Agronomic Recommendation &amp; Explanation</span>
                </div>
                <p className="text-xs text-[#1E293B] leading-relaxed font-medium">
                  &quot;Your {commodity} batch in {location} currently has an estimated {trad.remaining_shelf_life_days.toFixed(1)} days of marketable shelf life remaining.
                  {trad.internal_temp_c > 22
                    ? ' Produce metabolic respiration is generating sensible heat in the storage enclosure. Increasing ventilation dampers or transferring to cold storage will dramatically decelerate cellular decay.'
                    : ' Current conditions remain stable within standard biological holding limits.'}&quot;
                </p>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-[#DBEAFE] text-xs">
                  {trad.recommendations.map((rec, i) => (
                    <span key={i} className="px-2.5 py-1 bg-white text-[#2563EB] border border-[#DBEAFE] rounded-md font-medium text-[11px]">
                      {rec}
                    </span>
                  ))}
                </div>
              </div>

              {/* Counterfactual Comparison Table */}
              <div className="space-y-3 pt-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-[#1E293B]" />
                    <h3 className="text-sm font-bold text-[#1E293B] uppercase">
                      Counterfactual Comparison: Traditional vs Advanced Storage ({quantityKg} kg Benchmark)
                    </h3>
                  </div>
                  <span className="text-[11px] text-[#64748B]">Simulated Estimate</span>
                </div>

                <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#F8FAFC] text-[#64748B] border-b border-[#E2E8F0]">
                      <tr>
                        <th className="py-2.5 px-3.5 font-semibold">Evaluation Metric</th>
                        <th className="py-2.5 px-3.5 font-semibold">Option A: Traditional Storage</th>
                        <th className="py-2.5 px-3.5 font-semibold text-[#2563EB]">Option B: Advanced Cold Storage</th>
                        <th className="py-2.5 px-3.5 font-semibold text-[#16A34A]">Optimization Benefit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] text-[#1E293B]">
                      <tr>
                        <td className="py-2.5 px-3.5 font-medium">Temperature Stability</td>
                        <td className="py-2.5 px-3.5 text-amber-700">{trad.internal_temp_c.toFixed(1)}°C (Subject to ambient swings)</td>
                        <td className="py-2.5 px-3.5 text-[#2563EB] font-semibold">10.0°C (Thermostatic compressor)</td>
                        <td className="py-2.5 px-3.5 text-[#16A34A] font-bold">-{(trad.internal_temp_c - 10.0).toFixed(1)}°C Thermal Reduction</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3.5 font-medium">Daily Deterioration Rate</td>
                        <td className="py-2.5 px-3.5">~3.8% quality loss per day</td>
                        <td className="py-2.5 px-3.5 text-[#2563EB] font-semibold">~0.7% quality loss per day</td>
                        <td className="py-2.5 px-3.5 text-[#16A34A] font-bold">5.4x Slower Spoilage</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3.5 font-medium">Marketable Remaining Shelf Life</td>
                        <td className="py-2.5 px-3.5 font-bold text-amber-700">{trad.remaining_shelf_life_days.toFixed(1)} Days</td>
                        <td className="py-2.5 px-3.5 font-bold text-[#2563EB]">18.5 Days</td>
                        <td className="py-2.5 px-3.5 text-[#16A34A] font-bold">+{(18.5 - trad.remaining_shelf_life_days).toFixed(1)} Extra Market Days</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3.5 font-medium">Estimated Spoilage Loss (7 Days)</td>
                        <td className="py-2.5 px-3.5 text-[#DC2626] font-semibold">{Math.round(quantityKg * 0.22)} kg (₹{Math.round(quantityKg * 0.22 * 28.5).toLocaleString()})</td>
                        <td className="py-2.5 px-3.5 text-[#2563EB] font-semibold">{Math.round(quantityKg * 0.05)} kg (₹{Math.round(quantityKg * 0.05 * 28.5).toLocaleString()})</td>
                        <td className="py-2.5 px-3.5 text-[#16A34A] font-bold">Prevents {Math.round(quantityKg * 0.17)} kg Spoilage (₹{Math.round(quantityKg * 0.17 * 28.5).toLocaleString()})</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex justify-between items-center pt-4 border-t border-[#E2E8F0]">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="text-xs text-[#64748B] hover:text-[#1E293B] font-semibold flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Return to 2D Simulation
                </button>
                <button
                  onClick={() => setActiveTabMode('MANAGEMENT')}
                  className="px-4 py-2 bg-[#2563EB] hover:bg-[#1E40AF] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Go to Batch Management Ledger</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 2: DEDICATED BATCH MANAGEMENT & HISTORY TABLE    */}
      {/* ======================================================== */}
      {activeTabMode === 'MANAGEMENT' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 md:p-8 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
            <div>
              <span className="text-xs font-semibold text-[#2563EB] uppercase tracking-wider block">
                Post-Harvest Batch Ledger
              </span>
              <h2 className="text-xl font-bold text-[#1E293B]">
                Active Produce Batches ({batchList.length})
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Inspect telemetry details, view simulation history curves, resume active digital twins, or delete batches with audit safety.
              </p>
            </div>

            <button
              onClick={() => {
                setActiveTabMode('WORKFLOW');
                setCurrentStep(1);
              }}
              className="px-4 py-2 bg-[#2563EB] hover:bg-[#1E40AF] text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Register New Batch</span>
            </button>
          </div>

          {batchList.length === 0 ? (
            <div className="p-12 text-center text-[#64748B] text-xs flex flex-col items-center justify-center gap-2">
              <PackageCheck className="w-8 h-8 text-[#94A3B8]" />
              <strong className="text-sm font-semibold text-[#1E293B]">Zero batches found in database</strong>
              <p className="max-w-sm">No produce batches have been created yet. Click &lsquo;Register New Batch&rsquo; to begin.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F8FAFC] text-[#64748B] border-b border-[#E2E8F0] font-semibold">
                  <tr>
                    <th className="py-3 px-3.5">Batch ID</th>
                    <th className="py-3 px-3.5">Produce Name</th>
                    <th className="py-3 px-3.5">Quantity</th>
                    <th className="py-3 px-3.5">Harvest Date</th>
                    <th className="py-3 px-3.5">Storage Method</th>
                    <th className="py-3 px-3.5">Simulation Status</th>
                    <th className="py-3 px-3.5">Last Executed</th>
                    <th className="py-3 px-3.5">Quality</th>
                    <th className="py-3 px-3.5">Shelf Life</th>
                    <th className="py-3 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-[#1E293B]">
                  {batchList.map((b) => (
                    <tr key={b.id} className="hover:bg-[#F8FAFC]/70 transition-colors">
                      <td className="py-3 px-3.5 font-mono font-bold text-[#2563EB]">{b.batch_code}</td>
                      <td className="py-3 px-3.5 font-semibold capitalize text-[#1E293B]">{b.commodity_name}</td>
                      <td className="py-3 px-3.5 font-mono">{b.quantity_kg.toLocaleString()} kg</td>
                      <td className="py-3 px-3.5 text-[#64748B]">
                        {b.harvest_date ? new Date(b.harvest_date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-3.5">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                          b.storage_type.includes('COLD') || b.storage_type === 'ADVANCED'
                            ? 'bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {b.storage_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3.5">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          b.simulation_status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : b.simulation_status === 'PAUSED'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            b.simulation_status === 'ACTIVE' ? 'bg-[#16A34A] animate-pulse' : 'bg-slate-400'
                          }`} />
                          {b.simulation_status}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-[#64748B] text-[11px]">
                        {b.last_executed_at ? new Date(b.last_executed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {b.current_quality_score.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-3.5 font-bold text-[#1E293B]">
                        {b.remaining_shelf_life_days.toFixed(1)} Days
                      </td>
                      <td className="py-3 px-3.5 text-right space-x-1.5">
                        {/* 1. View Details */}
                        <button
                          onClick={() => handleOpenDetails(b.id)}
                          title="View Batch Details"
                          className="p-1.5 text-[#64748B] hover:text-[#2563EB] hover:bg-[#EFF6FF] rounded border border-[#E2E8F0] transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* 2. View Simulation History */}
                        <button
                          onClick={() => handleOpenHistory(b.id)}
                          title="View Simulation History Curves"
                          className="p-1.5 text-[#64748B] hover:text-[#2563EB] hover:bg-[#EFF6FF] rounded border border-[#E2E8F0] transition-colors"
                        >
                          <Activity className="w-3.5 h-3.5" />
                        </button>

                        {/* 3. Resume Monitoring */}
                        <button
                          onClick={() => handleResumeMonitoring(b)}
                          title="Resume Digital Twin Monitoring"
                          className="p-1.5 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded border border-emerald-200 transition-colors"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>

                        {/* 4. Delete Batch */}
                        <button
                          onClick={() => setDeleteModalBatch(b)}
                          title="Delete Batch & Disengage Simulation"
                          className="p-1.5 text-[#DC2626] hover:text-red-700 hover:bg-red-50 rounded border border-red-200 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: VIEW DETAILS DIALOG                             */}
      {/* ======================================================== */}
      {detailModalBatch && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xl max-w-lg w-full overflow-hidden text-[#1E293B]">
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#2563EB]" />
                <h3 className="text-sm font-bold text-[#1E293B]">Batch Telemetry &amp; Metadata Details</h3>
              </div>
              <button onClick={() => setDetailModalBatch(null)} className="text-[#64748B] hover:text-[#1E293B]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                <div>
                  <span className="text-[10px] text-[#64748B] uppercase font-semibold">BATCH ID</span>
                  <div className="font-mono font-bold text-sm text-[#2563EB]">{detailModalBatch.batch_code}</div>
                </div>
                <div>
                  <span className="text-[10px] text-[#64748B] uppercase font-semibold">FARMER IDENTITY</span>
                  <div className="font-semibold text-sm">{detailModalBatch.farmer_name}</div>
                </div>
                <div>
                  <span className="text-[10px] text-[#64748B] uppercase font-semibold">COMMODITY</span>
                  <div className="font-semibold capitalize">{detailModalBatch.commodity_name}</div>
                </div>
                <div>
                  <span className="text-[10px] text-[#64748B] uppercase font-semibold">TOTAL WEIGHT</span>
                  <div className="font-semibold font-mono">{detailModalBatch.quantity_kg.toLocaleString()} kg</div>
                </div>
                <div>
                  <span className="text-[10px] text-[#64748B] uppercase font-semibold">HARVEST DATE</span>
                  <div className="font-semibold">{detailModalBatch.harvest_date ? new Date(detailModalBatch.harvest_date).toLocaleDateString() : 'N/A'}</div>
                </div>
                <div>
                  <span className="text-[10px] text-[#64748B] uppercase font-semibold">STORAGE SYSTEM</span>
                  <div className="font-semibold">{detailModalBatch.storage_type}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 border border-[#E2E8F0] rounded-lg">
                  <span className="text-[10px] text-[#64748B] uppercase font-semibold block">CURRENT QUALITY</span>
                  <div className="text-xl font-bold text-emerald-700 mt-0.5">
                    {detailModalBatch.current_quality_score.toFixed(1)}%
                  </div>
                </div>
                <div className="p-3 border border-[#E2E8F0] rounded-lg">
                  <span className="text-[10px] text-[#64748B] uppercase font-semibold block">REMAINING SHELF LIFE</span>
                  <div className="text-xl font-bold text-[#2563EB] mt-0.5">
                    {detailModalBatch.remaining_shelf_life_days.toFixed(1)} Days
                  </div>
                </div>
              </div>

              {detailModalBatch.qr_session ? (
                <div className="p-3 bg-[#EFF6FF] border border-[#DBEAFE] rounded-lg space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#2563EB]">
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Active Mobile QR Token Binding</span>
                  </div>
                  <div className="text-[11px] text-[#1E40AF] truncate font-mono">
                    URL: {detailModalBatch.qr_session.target_url}
                  </div>
                  <div className="text-[10px] text-[#64748B]">
                    Token valid until: {new Date(detailModalBatch.qr_session.expires_at).toLocaleString()}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-center text-[#64748B]">
                  No active QR monitoring token generated yet for this batch.
                </div>
              )}
            </div>

            <div className="px-5 py-3 bg-[#F8FAFC] border-t border-[#E2E8F0] flex justify-end">
              <button
                onClick={() => setDetailModalBatch(null)}
                className="px-4 py-1.5 bg-[#2563EB] text-white rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: SIMULATION HISTORY CURVE DIALOG                 */}
      {/* ======================================================== */}
      {historyModalBatch && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xl max-w-lg w-full overflow-hidden text-[#1E293B]">
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#2563EB]" />
                <h3 className="text-sm font-bold text-[#1E293B]">
                  Simulation History: {historyModalBatch.batch_code}
                </h3>
              </div>
              <button onClick={() => setHistoryModalBatch(null)} className="text-[#64748B] hover:text-[#1E293B]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <span className="text-[11px] text-[#64748B]">
                Progression of quality scores and shelf life under {historyModalBatch.storage_type.replace('_', ' ')} conditions:
              </span>

              <div className="overflow-x-auto border border-[#E2E8F0] rounded-lg max-h-60">
                <table className="w-full text-[11px] text-left">
                  <thead className="bg-[#F8FAFC] text-[#64748B] border-b border-[#E2E8F0] font-semibold sticky top-0">
                    <tr>
                      <th className="p-2">Day</th>
                      <th className="p-2">Date</th>
                      <th className="p-2">Quality</th>
                      <th className="p-2">Est. Shelf Life</th>
                      <th className="p-2">Temp</th>
                      <th className="p-2">RH</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {historyModalBatch.history.map((h: any) => (
                      <tr key={h.day} className="hover:bg-[#F8FAFC]">
                        <td className="p-2 font-bold font-mono">D+{h.day}</td>
                        <td className="p-2 text-[#64748B]">{h.date}</td>
                        <td className="p-2 font-semibold text-emerald-700">{h.quality_score}%</td>
                        <td className="p-2 font-bold text-[#2563EB]">{h.remaining_shelf_life_days}d</td>
                        <td className="p-2 text-[#64748B]">{h.temp_c}°C</td>
                        <td className="p-2 text-[#64748B]">{h.rh_pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-5 py-3 bg-[#F8FAFC] border-t border-[#E2E8F0] flex justify-end">
              <button
                onClick={() => setHistoryModalBatch(null)}
                className="px-4 py-1.5 bg-[#2563EB] text-white rounded-lg text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: DELETE CONFIRMATION DIALOG (STRICT REQUIREMENT) */}
      {/* ======================================================== */}
      {deleteModalBatch && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-[#DC2626] shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-[#1E293B]">Delete Produce Batch</h4>
                <p className="text-[#64748B] text-[11px] mt-0.5">Explicit authorization required</p>
              </div>
            </div>

            {/* Batch Identity Display */}
            <div className="p-3.5 bg-red-50/50 border border-red-200 rounded-lg space-y-1">
              <div className="flex justify-between">
                <span className="text-[#64748B] font-semibold">Batch Code:</span>
                <strong className="font-mono text-[#DC2626] font-bold">{deleteModalBatch.batch_code}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B] font-semibold">Produce Name:</span>
                <strong className="capitalize text-[#1E293B]">{deleteModalBatch.commodity_name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B] font-semibold">Quantity:</span>
                <span className="text-[#1E293B]">{deleteModalBatch.quantity_kg} kg</span>
              </div>
            </div>

            {/* Impact Explanation */}
            <div className="space-y-1.5 text-[#475569] leading-relaxed text-[11px]">
              <p>
                Deleting this batch will immediately execute the following actions:
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-[#1E293B]">
                <li>Halt active digital twin simulation runs for this batch.</li>
                <li>Disconnect and revoke all active mobile QR access passes.</li>
                <li>Clear active threshold alerts and notifications.</li>
                <li>Update platform loss assessment statistics.</li>
              </ul>
            </div>

            {/* Deletion Type Option */}
            <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg space-y-2">
              <span className="text-[11px] font-semibold text-[#1E293B] block">Retention Policy:</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="del_type"
                  checked={!permanentDeleteOption}
                  onChange={() => setPermanentDeleteOption(false)}
                  className="accent-[#2563EB]"
                />
                <span className="text-[11px] font-medium text-[#1E293B]">
                  <strong>Soft Deletion (Recommended)</strong> — Archives record in database, halts simulations, preserves recovery audit trail.
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="radio"
                  name="del_type"
                  checked={permanentDeleteOption}
                  onChange={() => setPermanentDeleteOption(true)}
                  className="accent-[#DC2626]"
                />
                <span className="text-[11px] font-medium text-[#DC2626]">
                  <strong>Permanent Deletion</strong> — Completely purges batch, sensor records, and allocations from database.
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setDeleteModalBatch(null)}
                className="px-4 py-2 border border-[#E2E8F0] rounded-lg text-[#64748B] hover:bg-[#F8FAFC] font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-[#DC2626] hover:bg-red-700 text-white rounded-lg font-semibold shadow-sm transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Batch Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
