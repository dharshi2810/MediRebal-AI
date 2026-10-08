import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Shield, Lock, Mail, Building, ArrowLeft, CheckCircle2, AlertTriangle, KeyRound } from 'lucide-react';

interface HospitalAdminLoginPageProps {
  onSuccess: () => void;
  onReturnToPatient: () => void;
}

export const HospitalAdminLoginPage: React.FC<HospitalAdminLoginPageProps> = ({
  onSuccess,
  onReturnToPatient,
}) => {
  const { login, switchDemoUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [demoAccounts, setDemoAccounts] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadDemoAccounts();
  }, []);

  const loadDemoAccounts = async () => {
    try {
      const res = await api.auth.getDemoUsers();
      setDemoAccounts(res);
    } catch (_) {}
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await login(email, password);
      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Hospital Admin authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickHospitalDemo = async (demoEmail: string, demoPass: string) => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await switchDemoUser(demoEmail, demoPass);
      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Hospital login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-300 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-[#0f2b48] p-6 text-white text-center relative border-b-4 border-emerald-600">
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Shield className="w-7 h-7" />
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black uppercase tracking-wider">
            Restricted Staff Portal
          </span>
          <h1 className="text-xl font-black mt-2 tracking-tight">Hospital Administration Login</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
            Authorized portal for hospital medical directors, casualty in-charges, and bed resource managers.
          </p>
        </div>

        <div className="p-6 space-y-5 text-xs">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-3.5">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Hospital Administrator Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin.central@medirebal.org"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-emerald-600 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-emerald-600 font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4" />
              <span>{isSubmitting ? 'Authenticating...' : 'Sign In to Hospital Console'}</span>
            </button>
          </form>

          {/* 1-Click Demo Accounts for Hackathon / Evaluation */}
          {demoAccounts?.hospitalAdmins && (
            <div className="pt-3 border-t border-slate-200 space-y-2">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                Quick 1-Click Hospital Staff Access:
              </span>
              <div className="space-y-1.5">
                {demoAccounts.hospitalAdmins.slice(0, 3).map((admin: any) => (
                  <button
                    key={admin.hospital_id}
                    type="button"
                    onClick={() => handleQuickHospitalDemo(admin.email, admin.password)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 transition cursor-pointer flex items-center justify-between text-left group"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-slate-200 group-hover:bg-emerald-200 text-slate-800 font-bold text-[10px]">
                          {admin.hospital_id}
                        </span>
                        <strong className="text-slate-900 text-xs">{admin.name.split('(')[0].trim()}</strong>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">{admin.note || 'Hospital Administrator'}</p>
                    </div>
                    <span className="text-emerald-700 font-bold text-xs group-hover:translate-x-0.5 transition">Enter →</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Return link */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={onReturnToPatient}
              className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 font-semibold text-xs transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Public Patient Portal</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
