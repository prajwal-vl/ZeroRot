import React, { useState, useEffect } from 'react';
import {
  PackageCheck,
  PlusCircle,
  History,
  Scale,
  Calendar,
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
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Search,
  Filter
} from 'lucide-react';
import { api, BatchRecord } from '../services/api';
import { DataBadge } from './DataBadge';

interface BatchManagementTabProps {
  onRefreshState?: () => void;
  onOpenMobileQR?: (token: string) => void;
}

export const BatchManagementTab: React.FC<BatchManagementTabProps> = ({
  onRefreshState,
  onOpenMobileQR,
}) => {
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [detailModalBatch, setDetailModalBatch] = useState<any | null>(null);
  const [historyModalBatch, setHistoryModalBatch] = useState<any | null>(null);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [deleteModalBatch, setDeleteModalBatch] = useState<BatchRecord | null>(null);
  const [permanentDeleteOption, setPermanentDeleteOption] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New Batch Form State
  const [newFarmer, setNewFarmer] = useState<string>('Prajwal V L');
  const [newCommodity, setNewCommodity] = useState<string>('tomato');
  const [newQuantity, setNewQuantity] = useState<number>(1500);
  const [newHarvestDate, setNewHarvestDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newLocation, setNewLocation] = useState<string>('Kolar Agricultural District');
  const [newQuality, setNewQuality] = useState<number>(95);
  const [newStorage, setNewStorage] = useState<'TRADITIONAL' | 'ADVANCED'>('ADVANCED');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const records = await api.getBatches();
      setBatches(records);
    } catch (err) {
      console.error('Failed to load batches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.createBatch({
        farmer_name: newFarmer.trim(),
        commodity_name: newCommodity,
        quantity_kg: newQuantity,
        harvest_date: newHarvestDate,
        initial_quality_score: newQuality,
        storage_type: newStorage,
        location: newLocation,
      });
      setIsCreateOpen(false);
      setNotification({ type: 'success', message: 'Produce batch created successfully and registered in system ledger.' });
      setTimeout(() => setNotification(null), 4000);
      fetchBatches();
      if (onRefreshState) onRefreshState();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to create batch' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDetails = async (batch: BatchRecord) => {
    try {
      const details = await api.getBatchDetails(batch.id);
      setDetailModalBatch(details);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to fetch details' });
    }
  };

  const handleOpenHistory = async (batch: BatchRecord) => {
    setHistoryLoading(true);
    setHistoryModalBatch({ batch_code: batch.batch_code, commodity_name: batch.commodity_name, history: [] });
    try {
      const hist = await api.getBatchHistory(batch.id);
      setHistoryModalBatch(hist);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to load simulation history' });
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleResumeSimulation = async (batch: BatchRecord) => {
    try {
      const res = await api.resumeBatchSimulation(batch.id);
      setNotification({
        type: 'success',
        message: `Simulation for batch ${batch.batch_code} resumed. State synchronized.`,
      });
      setTimeout(() => setNotification(null), 4000);
      fetchBatches();
      if (onRefreshState) onRefreshState();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to resume simulation' });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalBatch) return;
    setIsDeleting(true);
    try {
      const res = await api.deleteBatch(deleteModalBatch.id, permanentDeleteOption);
      setNotification({
        type: 'success',
        message: `Batch ${deleteModalBatch.batch_code} successfully removed (${permanentDeleteOption ? 'Permanent Purge' : 'Soft Deleted'}). Associated telemetry archived.`,
      });
      setTimeout(() => setNotification(null), 5000);
      setDeleteModalBatch(null);
      fetchBatches();
      if (onRefreshState) onRefreshState();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to delete batch' });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredBatches = batches.filter((b) => {
    const matchesSearch =
      b.batch_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.commodity_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.farmer_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || b.simulation_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 text-[#1E293B]">
      {/* Top Banner */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]">
              <PackageCheck className="w-3.5 h-3.5 text-[#2563EB]" />
              BATCH LEDGER &amp; AUDIT LOG
            </span>
            <DataBadge label="DATABASE" sourceText="SQLite Persistent Store" />
          </div>
          <h2 className="text-xl font-bold text-[#1E293B] mt-2 tracking-tight">
            Produce Batch Management
          </h2>
          <p className="text-sm text-[#64748B] mt-1 max-w-2xl">
            Track, inspect, resume, or securely decommission harvest batches. Maintain complete traceability across storage regimes, quality grading, and dynamic shelf-life trajectories.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-lg transition-colors shadow-sm flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Produce Batch</span>
          </button>
          <button
            onClick={fetchBatches}
            className="p-2 rounded-lg bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#1E293B] hover:bg-[#F8FAFC] transition-colors"
            title="Refresh Ledger"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2.5 border shadow-sm ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by Batch Code, Commodity, or Farmer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-xs focus:outline-none focus:border-[#2563EB]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-[#64748B]" />
          <span className="text-xs text-[#64748B] font-semibold">Status:</span>
          {['ALL', 'ACTIVE', 'PAUSED', 'COMPLETED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                statusFilter === st
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'bg-[#F8FAFC] text-[#64748B] hover:bg-[#F1F5F9] border border-[#E2E8F0]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Batch Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-semibold">
              <tr>
                <th className="py-3.5 px-4">Batch ID</th>
                <th className="py-3.5 px-4">Commodity</th>
                <th className="py-3.5 px-4">Quantity</th>
                <th className="py-3.5 px-4">Harvest Date</th>
                <th className="py-3.5 px-4">Storage Method</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Freshness</th>
                <th className="py-3.5 px-4">Shelf Life</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[#64748B]">
                    Loading batches from database...
                  </td>
                </tr>
              ) : filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#64748B]">
                    <PackageCheck className="w-8 h-8 text-[#94A3B8] mx-auto mb-2 opacity-50" />
                    <span className="block font-semibold text-sm text-[#1E293B]">No Produce Batches Found</span>
                    <span className="text-xs text-[#64748B]">Create a new batch or adjust your search filter</span>
                  </td>
                </tr>
              ) : (
                filteredBatches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#2563EB]">
                      {batch.batch_code}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#1E293B] capitalize">
                      {batch.commodity_name}
                    </td>
                    <td className="py-3 px-4 font-medium text-[#1E293B]">
                      {batch.quantity_kg.toLocaleString()} kg
                    </td>
                    <td className="py-3 px-4 text-[#64748B]">
                      {batch.harvest_date || 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        batch.storage_type === 'ADVANCED'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {batch.storage_type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        batch.simulation_status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-300'
                      }`}>
                        {batch.simulation_status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-bold ${
                        batch.current_quality_score > 80 ? 'text-[#16A34A]' : batch.current_quality_score > 60 ? 'text-[#D97706]' : 'text-[#DC2626]'
                      }`}>
                        {batch.current_quality_score.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#1E293B]">
                      {batch.remaining_shelf_life_days.toFixed(1)} Days
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenDetails(batch)}
                          className="p-1.5 rounded hover:bg-[#E2E8F0] text-[#64748B] hover:text-[#1E293B] transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenHistory(batch)}
                          className="p-1.5 rounded hover:bg-[#E2E8F0] text-[#64748B] hover:text-[#1E293B] transition-colors"
                          title="View Simulation History"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                        {batch.simulation_status === 'PAUSED' && (
                          <button
                            onClick={() => handleResumeSimulation(batch)}
                            className="p-1.5 rounded hover:bg-emerald-50 text-[#16A34A] transition-colors"
                            title="Resume Monitoring"
                          >
                            <Activity className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteModalBatch(batch)}
                          className="p-1.5 rounded hover:bg-red-50 text-[#DC2626] transition-colors"
                          title="Delete Batch"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Batch Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-[#2563EB]" />
                <h3 className="font-bold text-base text-[#1E293B]">Create New Produce Batch</h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 text-[#64748B] hover:text-[#1E293B] rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#1E293B] mb-1">Farmer / Producer Name</label>
                <input
                  type="text"
                  required
                  value={newFarmer}
                  onChange={(e) => setNewFarmer(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#1E293B] mb-1">Commodity</label>
                  <select
                    value={newCommodity}
                    onChange={(e) => setNewCommodity(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#2563EB] capitalize"
                  >
                    <option value="tomato">Tomato</option>
                    <option value="banana">Banana</option>
                    <option value="mango">Mango</option>
                    <option value="potato">Potato</option>
                    <option value="onion">Onion</option>
                    <option value="apple">Apple</option>
                    <option value="grape">Grape</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#1E293B] mb-1">Quantity (kg)</label>
                  <input
                    type="number"
                    min="100"
                    max="10000"
                    required
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#1E293B] mb-1">Harvest Date</label>
                  <input
                    type="date"
                    required
                    value={newHarvestDate}
                    onChange={(e) => setNewHarvestDate(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#1E293B] mb-1">Initial Quality (%)</label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    required
                    value={newQuality}
                    onChange={(e) => setNewQuality(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#1E293B] mb-1">Target Storage Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewStorage('ADVANCED')}
                    className={`p-2.5 rounded-lg border text-left font-bold transition-all ${
                      newStorage === 'ADVANCED'
                        ? 'border-[#2563EB] bg-blue-50 text-[#2563EB]'
                        : 'border-[#E2E8F0] bg-white text-[#64748B]'
                    }`}
                  >
                    Advanced Cold Storage
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewStorage('TRADITIONAL')}
                    className={`p-2.5 rounded-lg border text-left font-bold transition-all ${
                      newStorage === 'TRADITIONAL'
                        ? 'border-[#2563EB] bg-blue-50 text-[#2563EB]'
                        : 'border-[#E2E8F0] bg-white text-[#64748B]'
                    }`}
                  >
                    Traditional Farm Bay
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#1E293B] mb-1">Farm / Region Location</label>
                <input
                  type="text"
                  required
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-[#E2E8F0] rounded-lg text-[#64748B] hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg font-semibold"
                >
                  {isSubmitting ? 'Registering...' : 'Register Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 rounded-lg bg-red-100">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#1E293B]">Decommission Batch</h3>
                <span className="text-xs text-red-600 font-mono font-bold">
                  {deleteModalBatch.batch_code}
                </span>
              </div>
            </div>

            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Produce:</span>
                <span className="font-bold text-[#1E293B] capitalize">{deleteModalBatch.commodity_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Quantity:</span>
                <span className="font-bold text-[#1E293B]">{deleteModalBatch.quantity_kg.toLocaleString()} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Storage:</span>
                <span className="font-bold text-[#1E293B]">{deleteModalBatch.storage_type}</span>
              </div>
            </div>

            <p className="text-xs text-[#64748B] leading-relaxed">
              Confirming deletion will halt any active digital twin simulation for this batch, invalidate linked QR monitoring passes, and archive associated telemetry.
            </p>

            <label className="flex items-center gap-2 text-xs font-semibold text-[#1E293B] cursor-pointer">
              <input
                type="checkbox"
                checked={permanentDeleteOption}
                onChange={(e) => setPermanentDeleteOption(e.target.checked)}
                className="rounded accent-red-600"
              />
              <span>Permanent Database Purge (Irreversible)</span>
            </label>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setDeleteModalBatch(null)}
                className="px-4 py-2 border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold"
              >
                {isDeleting ? 'Decommissioning...' : 'Confirm Decommission'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {detailModalBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-[#2563EB]" />
                <h3 className="font-bold text-base text-[#1E293B]">Batch Inspection Dossier</h3>
              </div>
              <button
                onClick={() => setDetailModalBatch(null)}
                className="p-1 text-[#64748B] hover:text-[#1E293B] rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                <span className="text-[#64748B] block text-[10px] uppercase font-bold">Batch Code</span>
                <span className="font-mono font-bold text-sm text-[#2563EB]">{detailModalBatch.batch_code}</span>
              </div>
              <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                <span className="text-[#64748B] block text-[10px] uppercase font-bold">Produce</span>
                <span className="font-bold text-sm text-[#1E293B] capitalize">{detailModalBatch.commodity_name}</span>
              </div>
              <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                <span className="text-[#64748B] block text-[10px] uppercase font-bold">Quantity</span>
                <span className="font-bold text-sm text-[#1E293B]">{detailModalBatch.quantity_kg?.toLocaleString()} kg</span>
              </div>
              <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                <span className="text-[#64748B] block text-[10px] uppercase font-bold">Current Freshness</span>
                <span className="font-bold text-sm text-[#16A34A]">{detailModalBatch.current_quality_score?.toFixed(1)}%</span>
              </div>
              <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                <span className="text-[#64748B] block text-[10px] uppercase font-bold">Shelf Life</span>
                <span className="font-bold text-sm text-[#2563EB]">{detailModalBatch.remaining_shelf_life_days?.toFixed(1)} Days</span>
              </div>
              <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                <span className="text-[#64748B] block text-[10px] uppercase font-bold">Storage Type</span>
                <span className="font-bold text-sm text-[#1E293B]">{detailModalBatch.storage_type}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setDetailModalBatch(null)}
                className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-xs font-semibold"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyModalBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-[#2563EB]" />
                <h3 className="font-bold text-base text-[#1E293B]">
                  Simulation Run History — {historyModalBatch.batch_code}
                </h3>
              </div>
              <button
                onClick={() => setHistoryModalBatch(null)}
                className="p-1 text-[#64748B] hover:text-[#1E293B] rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto text-xs space-y-2">
              {historyLoading ? (
                <div className="py-6 text-center text-[#64748B]">Loading historical snapshots...</div>
              ) : historyModalBatch.history && historyModalBatch.history.length > 0 ? (
                historyModalBatch.history.map((h: any, idx: number) => (
                  <div key={idx} className="p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] flex justify-between items-center">
                    <div>
                      <span className="font-bold text-[#1E293B] block">Snapshot #{idx + 1}</span>
                      <span className="text-[11px] text-[#64748B]">Sim Day: {h.sim_day ?? '1.0'}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-[#16A34A] block">{h.quality_score?.toFixed(1) ?? '92.0'}% Quality</span>
                      <span className="text-[11px] text-[#2563EB]">{h.shelf_life_days?.toFixed(1) ?? '14.0'}d remaining</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-[#64748B]">
                  No historical execution snapshots recorded for this batch yet.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setHistoryModalBatch(null)}
                className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-xs font-semibold"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
