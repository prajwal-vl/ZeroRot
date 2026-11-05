import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  UserX,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  RefreshCw,
  X,
  Lock,
  Mail,
  User as UserIcon,
  Phone
} from 'lucide-react';
import { api, User as UserType } from '../services/api';

export const AccountManagementView: React.FC = () => {
  const [users, setUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New user dialog state
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [newFullName, setNewFullName] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');
  const [newRole, setNewRole] = useState<'FARMER' | 'ADMIN'>('FARMER');
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<UserType | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await api.listUsers();
      setUsers(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load user accounts.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await api.createUserByAdmin({
        full_name: newFullName.trim(),
        email: newEmail.trim().toLowerCase(),
        password: newPassword,
        phone: newPhone.trim() || undefined,
        role: newRole,
      });
      setSuccessMsg(`Account for ${newFullName} created successfully.`);
      setIsAddOpen(false);
      setNewFullName('');
      setNewEmail('');
      setNewPassword('');
      setNewPhone('');
      fetchUsers();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(`Error creating user: ${err.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleStatus = async (user: UserType) => {
    try {
      await api.updateUserStatus(user.id, !user.is_active);
      fetchUsers();
    } catch (err: any) {
      alert(`Error updating account status: ${err.message}`);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.deleteUser(deleteTarget.id);
      setSuccessMsg(`Account ${deleteTarget.email} deleted successfully.`);
      setDeleteTarget(null);
      fetchUsers();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(`Error deleting user: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm space-y-6 text-[#1E293B]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#2563EB]" />
            <h3 className="text-base font-bold text-[#1E293B]">Authorized Account Management</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB] font-semibold border border-[#DBEAFE]">
              Admin Only
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Manually create, manage, disable, or purge user and farmer accounts. Zero automatic accounts exist.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] hover:bg-[#1E40AF] text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Add User Account</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-[#DC2626] rounded-lg text-xs font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#F8FAFC] text-[#64748B] border-b border-[#E2E8F0] font-semibold">
            <tr>
              <th className="p-3">User</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
              <th className="p-3">Registered At</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0] text-[#1E293B]">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-[#64748B]">
                  Loading registered accounts...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-[#64748B]">
                  Zero accounts found in database.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-[#F8FAFC]/60 transition-colors">
                  <td className="p-3 font-semibold text-[#1E293B]">{u.full_name}</td>
                  <td className="p-3 text-[#64748B] font-mono text-[11px]">{u.email}</td>
                  <td className="p-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        u.role === 'ADMIN'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                        u.is_active ? 'text-[#16A34A]' : 'text-[#DC2626]'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-[#16A34A]' : 'bg-[#DC2626]'}`} />
                      {u.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="p-3 text-[#64748B] text-[11px]">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="p-3 text-right space-x-2">
                    <button
                      onClick={() => handleToggleStatus(u)}
                      className={`px-2 py-1 rounded text-[11px] font-semibold border transition-colors ${
                        u.is_active
                          ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      {u.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => setDeleteTarget(u)}
                      className="px-2 py-1 bg-red-50 text-[#DC2626] border border-red-200 rounded text-[11px] font-semibold hover:bg-red-100 transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xl max-w-md w-full overflow-hidden text-[#1E293B]">
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#1E293B] flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#2563EB]" />
                <span>Add User Account (Manual Entry)</span>
              </h3>
              <button onClick={() => setIsAddOpen(false)} className="text-[#64748B] hover:text-[#1E293B]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anand Gowda"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#2563EB] outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="anand@mandya.farm"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#2563EB] outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Temporary Password</label>
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#2563EB] outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-[#2563EB] outline-none"
                >
                  <option value="FARMER">FARMER (Produce Batches &amp; Monitoring)</option>
                  <option value="ADMIN">ADMIN (Full Platform Privileges)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3 py-1.5 border border-[#E2E8F0] rounded-lg text-[#64748B] hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-1.5 bg-[#2563EB] hover:bg-[#1E40AF] text-white rounded-lg font-semibold shadow-sm disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xl max-w-sm w-full p-5 space-y-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-[#DC2626] shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#1E293B]">Delete User Account</h4>
                <p className="text-[#64748B] text-[11px]">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-[#1E293B] leading-relaxed">
              Are you sure you want to permanently delete account <strong>{deleteTarget.email}</strong> ({deleteTarget.full_name})?
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-1.5 border border-[#E2E8F0] rounded-lg text-[#64748B] hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={isDeleting}
                className="px-3 py-1.5 bg-[#DC2626] hover:bg-red-700 text-white rounded-lg font-semibold disabled:opacity-50 shadow-sm"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

