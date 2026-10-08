import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { X, Lock, Mail, User as UserIcon, Phone, MapPin, HeartPulse } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { user, login, register, switchDemoUser, logout } = useAuth();
  const [mode, setMode] = useState<'demo' | 'login' | 'register'>('demo');
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
    } catch (_) {}
  };

  if (!isOpen) return null;

  // If already logged in, show Patient Profile card
  if (user) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
        <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95">
          <div className="bg-sky-700 p-5 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
                <HeartPulse className="w-6 h-6 text-sky-200" />
              </div>
              <div>
                <h3 className="font-extrabold text-base leading-tight">Patient Profile</h3>
                <p className="text-sky-200 text-xs">Public user account & medical care portal</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-sky-600 transition cursor-pointer">
              <X className="w-5 h-5 text-sky-200 hover:text-white" />
            </button>
          </div>

          <div className="p-6 space-y-4 text-xs">
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-sky-50 border border-sky-200">
              <div className="w-12 h-12 rounded-xl bg-sky-600 text-white font-extrabold text-lg flex items-center justify-center">
                {user.name.charAt(0)}
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">{user.name}</h4>
                <p className="text-slate-500 text-[11px]">{user.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-bold">
                  ● Verified Public Patient
                </span>
              </div>
            </div>

            <div className="space-y-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Account Role:</span>
                <strong className="text-slate-800 capitalize">{user.role.replace('_', ' ').toLowerCase()}</strong>
              </div>
              {user.phone && (
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Phone Number:</span>
                  <strong className="text-slate-800">{user.phone}</strong>
                </div>
              )}
              {user.location && (
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Preferred Area:</span>
                  <strong className="text-slate-800">{user.location}</strong>
                </div>
              )}
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 font-medium">Emergency Care:</span>
                <span className="text-emerald-700 font-bold">Active in Chennai District</span>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => {
                  logout();
                  onClose();
                }}
                className="w-full py-2.5 rounded-xl border border-red-200 hover:bg-red-50 text-red-600 font-bold text-xs transition cursor-pointer"
              >
                Sign Out
              </button>
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
        <div className="bg-sky-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <HeartPulse className="w-6 h-6 text-sky-200" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">Patient Portal Login</h3>
              <p className="text-sky-200 text-xs">Public user account for medical care & bookings</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-sky-600 transition cursor-pointer">
            <X className="w-5 h-5 text-sky-200 hover:text-white" />
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
            ⚡ Demo Patient
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
            New Patient
          </button>
        </div>

        <div className="p-5 max-h-[75vh] overflow-y-auto">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              ⚠️ {errorMessage}
            </div>
          )}

          {/* Quick Demo Patient */}
          {mode === 'demo' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Log in as a verified patient to explore hospital search, emergency requests, and consultation bookings:
              </p>

              {/* Public User Card */}
              <div
                onClick={() =>
                  handleQuickDemo(
                    demoAccounts?.publicUser?.email || 'patient@medirebal.org',
                    demoAccounts?.publicUser?.password || 'patient123'
                  )
                }
                className="p-4 rounded-2xl border border-sky-300 bg-sky-50/70 hover:bg-sky-100/60 transition cursor-pointer flex items-center justify-between shadow-2xs group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-sky-600 text-white font-black text-[10px] uppercase">
                      Patient Account
                    </span>
                    <strong className="text-sm text-slate-900">
                      {demoAccounts?.publicUser?.name || 'Kavitha Raman'}
                    </strong>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Location: Anna Nagar, Chennai &bull; Full patient features
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Credentials: patient@medirebal.org
                  </p>
                </div>
                <span className="text-sky-700 font-bold text-xs group-hover:translate-x-1 transition">
                  Sign In →
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                💡 Patients can search available ICU/oxygen beds across Chennai, book specialist appointments, and submit emergency admission requests.
              </div>
            </div>
          )}

          {/* Regular Patient Login Form */}
          {mode === 'login' && (
            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Patient Email Address</label>
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

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Signing in...' : 'Sign In as Patient'}
              </button>
            </form>
          )}

          {/* Patient Registration Form */}
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
                    placeholder="e.g. Kavitha Raman"
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
                    placeholder="patient@gmail.com"
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
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98401 23456"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-sky-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Area / Location (Chennai)</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Anna Nagar, Chennai"
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
                    placeholder="Create a password"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-sky-500 font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Registering...' : 'Create Patient Account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
