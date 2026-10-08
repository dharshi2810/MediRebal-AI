import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { X, Lock, Mail, User as UserIcon, Phone, MapPin, Building, ShieldCheck } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register, switchDemoUser } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'demo'>('demo');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('Anna Nagar, Chennai');
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
    } catch (e) {}
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      if (mode === 'login') {
        await login(email, password);
      } else if (mode === 'register') {
        await register({ name, email, phone, password, location });
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemo = async (demoEmail: string, demoPass: string) => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await switchDemoUser(demoEmail, demoPass);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Demo login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-sky-400" />
            <div>
              <h3 className="font-extrabold text-base leading-tight">MediRebal AI Authentication</h3>
              <p className="text-slate-400 text-xs">Role-based healthcare portal</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-800 transition cursor-pointer">
            <X className="w-5 h-5 text-slate-400 hover:text-white" />
          </button>
        </div>

        {/* Tab switchers */}
        <div className="grid grid-cols-3 p-1.5 bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => setMode('demo')}
            className={`py-2 rounded-xl transition cursor-pointer ${
              mode === 'demo' ? 'bg-white text-sky-700 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            ⚡ Demo Accounts
          </button>
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`py-2 rounded-xl transition cursor-pointer ${
              mode === 'login' ? 'bg-white text-sky-700 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`py-2 rounded-xl transition cursor-pointer ${
              mode === 'register' ? 'bg-white text-sky-700 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            Register
          </button>
        </div>

        <div className="p-5 max-h-[75vh] overflow-y-auto">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              ⚠️ {errorMessage}
            </div>
          )}

          {/* Quick Demo Accounts Selection */}
          {mode === 'demo' && demoAccounts && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Click any role to test with authentic simulated MongoDB records & permissions:
              </p>

              {/* Public User */}
              <div
                onClick={() =>
                  handleQuickDemo(demoAccounts.publicUser.email, demoAccounts.publicUser.password)
                }
                className="p-3.5 rounded-2xl border border-sky-200 bg-sky-50/60 hover:bg-sky-50 transition cursor-pointer flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-sky-600 text-white font-extrabold text-[10px]">
                      PUBLIC USER
                    </span>
                    <strong className="text-xs text-slate-900">{demoAccounts.publicUser.name}</strong>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Patient portal: emergency SOS requests, bookings, track status
                  </p>
                </div>
                <span className="text-sky-600 font-bold text-xs">Switch →</span>
              </div>

              {/* Hospital Admins */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Hospital Administrators
                </span>
                {demoAccounts.hospitalAdmins.map((admin: any) => (
                  <div
                    key={admin.hospital_id}
                    onClick={() => handleQuickDemo(admin.email, admin.password)}
                    className="p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition cursor-pointer flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-bold text-[10px]">
                          {admin.hospital_id}
                        </span>
                        <strong className="text-slate-800 truncate max-w-[200px]">{admin.name}</strong>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{admin.note}</p>
                    </div>
                    <span className="text-slate-600 font-bold text-xs">Login →</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Regular Login Form */}
          {mode === 'login' && (
            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="patient@medirebal.org"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-sky-500 font-medium"
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
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-sky-500 font-medium"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-[11px] pt-1">
                <span className="text-slate-500">Demo password: patient123 or hospital123</span>
                <button
                  type="button"
                  onClick={() => alert('For password reset, please contact district coordination or use the demo accounts.')}
                  className="text-sky-600 hover:underline"
                >
                  Forgot?
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm shadow-md shadow-sky-600/30 transition cursor-pointer mt-2"
              >
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          )}

          {/* Registration Form */}
          {mode === 'register' && (
            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ramesh Krishnan"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-sky-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ramesh@gmail.com"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-sky-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98401 23456"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-sky-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Area in Chennai</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Velachery, Chennai"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-sky-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Create Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-sky-500 font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm shadow-md shadow-sky-600/30 transition cursor-pointer mt-2"
              >
                {isSubmitting ? 'Creating account...' : 'Create Public Account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
