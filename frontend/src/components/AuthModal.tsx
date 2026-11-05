import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Lock,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { api, User as UserType } from '../services/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserType) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthSuccess }) => {
  const [isRegister, setIsRegister] = useState<boolean>(true);
  const [hasUsers, setHasUsers] = useState<boolean>(false);
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      checkAuthStatus();
    }
  }, [isOpen]);

  const checkAuthStatus = async () => {
    try {
      const status = await api.getAuthStatus();
      setHasUsers(status.has_users);
      if (!status.has_users) {
        setIsRegister(true);
      }
    } catch (e) {
      console.warn('Auth status check error:', e);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      if (isRegister) {
        if (!fullName.trim()) throw new Error('Full Name is required.');
        if (!email.trim() || !email.includes('@')) throw new Error('Valid email address is required.');
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');

        const res = await api.registerUser({
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
          phone: phone.trim() || undefined
        });
        onAuthSuccess(res.user);
        onClose();
      } else {
        if (!email.trim() || !password) throw new Error('Please enter email and password.');
        const res = await api.loginUser({
          email: email.trim().toLowerCase(),
          password
        });
        onAuthSuccess(res.user);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden text-[#1E293B]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-[#E2E8F0] flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white font-bold text-xs shadow-sm">
              ZR
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1E293B]">
                {!hasUsers
                  ? 'First Administrative Account Setup'
                  : isRegister
                  ? 'Farmer Account Registration'
                  : 'Sign In to ZERO ROOT'}
              </h3>
              <p className="text-xs text-[#64748B]">
                {!hasUsers
                  ? 'Zero users exist in database. First registrant is granted Admin privileges.'
                  : isRegister
                  ? 'Create your verified agricultural account to manage batches.'
                  : 'Access your post-harvest monitoring dashboard.'}
              </p>
            </div>
          </div>

          {hasUsers && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#64748B] hover:text-[#1E293B] hover:bg-[#F8FAFC] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!hasUsers && (
            <div className="p-3 bg-[#EFF6FF] border border-[#DBEAFE] rounded-xl flex items-start gap-2.5 text-xs text-[#1E40AF]">
              <ShieldCheck className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Clean Slate Verification</strong>
                No demo accounts or fake profiles exist in the system. You are creating the authoritative first administrator account.
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-[#DC2626] rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Gowda"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg pl-9 pr-3.5 py-2 text-xs text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#1E293B] mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
              <input
                type="email"
                required
                placeholder="farmer@zeroroot.agri"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg pl-9 pr-3.5 py-2 text-xs text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E293B] mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
              <input
                type="password"
                required
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg pl-9 pr-3.5 py-2 text-xs text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1">
                Phone Number <span className="text-[#94A3B8] font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="+91 98450 12345"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg pl-9 pr-3.5 py-2 text-xs text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-[#2563EB] hover:bg-[#1E40AF] text-white rounded-lg text-xs font-semibold transition-colors shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 mt-2"
          >
            <span>
              {isSubmitting
                ? 'Processing...'
                : !hasUsers
                ? 'Create Administrator Account'
                : isRegister
                ? 'Register Farmer Account'
                : 'Sign In'}
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Modal Footer */}
        {hasUsers && (
          <div className="px-6 py-3.5 bg-[#F8FAFC] border-t border-[#E2E8F0] text-center text-xs text-[#64748B]">
            {isRegister ? (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegister(false)}
                  className="text-[#2563EB] font-semibold hover:underline"
                >
                  Sign In
                </button>
              </span>
            ) : (
              <span>
                Don't have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegister(true)}
                  className="text-[#2563EB] font-semibold hover:underline"
                >
                  Register here
                </button>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

