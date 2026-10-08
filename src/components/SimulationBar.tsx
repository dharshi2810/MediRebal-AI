import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Play, Pause, RotateCcw, Activity, Users, ChevronDown, ChevronUp, Zap, Database, ExternalLink, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SimulationBarProps {
  onDataRefresh?: () => void;
  onOpenAuth?: () => void;
}

export const SimulationBar: React.FC<SimulationBarProps> = ({ onDataRefresh, onOpenAuth }) => {
  const { user, switchDemoUser } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [tickCount, setTickCount] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [demoAccounts, setDemoAccounts] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dbHealth, setDbHealth] = useState<any>(null);
  const [showDbModal, setShowDbModal] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    fetchStatus();
    loadDemoAccounts();
    loadDbHealth();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await api.simulation.getStatus();
      setIsRunning(res.isRunning);
      setTickCount(res.tickCount);
    } catch (e) {}
  };

  const loadDbHealth = async () => {
    try {
      const res = await api.status.getHealth();
      setDbHealth(res);
    } catch (e) {}
  };

  const loadDemoAccounts = async () => {
    try {
      const res = await api.auth.getDemoUsers();
      setDemoAccounts(res);
    } catch (e) {}
  };

  const handleStart = async () => {
    setIsLoading(true);
    try {
      await api.simulation.start(3500);
      setIsRunning(true);
      if (onDataRefresh) onDataRefresh();
    } finally {
      setIsLoading(false);
    }
  };

  const handlePause = async () => {
    setIsLoading(true);
    try {
      await api.simulation.pause();
      setIsRunning(false);
      if (onDataRefresh) onDataRefresh();
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    setIsLoading(true);
    try {
      await api.simulation.reset();
      setIsRunning(false);
      setTickCount(0);
      if (onDataRefresh) onDataRefresh();
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep = async () => {
    try {
      await api.simulation.tick();
      setTickCount((prev) => prev + 1);
      if (onDataRefresh) onDataRefresh();
    } catch (e) {}
  };

  const handleRetryAtlas = async () => {
    setIsReconnecting(true);
    try {
      await fetch('/api/status/retry-atlas', { method: 'POST' });
      await loadDbHealth();
      if (onDataRefresh) onDataRefresh();
    } catch (e) {} finally {
      setIsReconnecting(false);
    }
  };

  return (
    <div className="bg-slate-900 text-white border-b border-slate-800 text-xs shadow-md">
      {/* Top Banner Row */}
      <div className="max-w-7xl mx-auto px-3 py-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-slate-800 text-slate-200 font-bold border border-slate-700 text-[11px] tracking-wide">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>CHENNAI HEALTHCARE NETWORK</span>
          </span>

          {/* Database mode pill */}
          <button
            onClick={() => setShowDbModal(true)}
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold transition cursor-pointer border ${
              dbHealth?.database?.isConnectedToAtlas
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
            }`}
            title="Click to view database connection details"
          >
            <Database className="w-3 h-3 text-emerald-400" />
            <span>
              {dbHealth?.database?.isConnectedToAtlas ? 'MongoDB Atlas: Connected' : 'Database: Active'}
            </span>
          </button>

          <span className="text-slate-300 hidden md:inline">
            Scenario: <strong className="text-white">H001 Rapid Depletion vs H003 Surplus</strong>
          </span>

          {isRunning && (
            <span className="inline-flex items-center gap-1 text-emerald-400 font-mono text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Stream Active (Tick #{tickCount})
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5">
          {isRunning ? (
            <button
              onClick={handlePause}
              disabled={isLoading}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-medium transition active:scale-95 cursor-pointer"
              title="Pause Live Stream"
            >
              <Pause className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pause</span>
            </button>
          ) : (
            <button
              onClick={handleStart}
              disabled={isLoading}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition active:scale-95 cursor-pointer"
              title="Start Live Simulation"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Simulation</span>
            </button>
          )}

          <button
            onClick={handleStep}
            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition active:scale-95 cursor-pointer"
            title="Step 1 Tick"
          >
            <Zap className="w-3 h-3 text-amber-400" />
            <span className="hidden sm:inline">Step</span>
          </button>

          <button
            onClick={handleReset}
            disabled={isLoading}
            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition active:scale-95 cursor-pointer"
            title="Reset Simulation Data"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 transition cursor-pointer"
          >
            <Users className="w-3 h-3" />
            <span className="font-semibold hidden md:inline">Demo Switcher</span>
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Database details modal */}
      {showDbModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs text-slate-900">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-600" />
                MongoDB Atlas Integration
              </h3>
              <button
                onClick={() => setShowDbModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Database Name:</span>
                  <strong className="font-mono text-slate-900">medirebal</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Active Connection:</span>
                  <strong className={dbHealth?.database?.isConnectedToAtlas ? 'text-emerald-600' : 'text-amber-600'}>
                    {dbHealth?.database?.mode || 'In-Memory Resilient Mode'}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Gemini AI Model:</span>
                  <strong className="text-indigo-600">gemini-3.8-flash (Server-Side)</strong>
                </div>
              </div>

              {!dbHealth?.database?.isConnectedToAtlas && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                  <p className="font-bold">Atlas IP Access Notice:</p>
                  <p className="text-[11px] leading-relaxed">
                    MongoDB Atlas drops external TLS handshakes with <em>SSL alert 80</em> if your cluster does not allow access from anywhere.
                  </p>
                  <p className="text-[11px] font-semibold">
                    To enable Atlas connection:
                    <br />1. Open MongoDB Atlas Dashboard
                    <br />2. Go to <strong>Network Access</strong> $\to$ <strong>Add IP Address</strong>
                    <br />3. Click <strong>&ldquo;Allow Access From Anywhere (0.0.0.0/0)&rdquo;</strong> $\to$ Confirm.
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleRetryAtlas}
                  disabled={isReconnecting}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isReconnecting ? 'animate-spin' : ''}`} />
                  <span>{isReconnecting ? 'Testing Connection...' : 'Reconnect to Atlas'}</span>
                </button>
                <button
                  onClick={() => setShowDbModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Quick Demo Role Switcher Tray */}
      {isExpanded && demoAccounts && (
        <div className="bg-slate-950 border-t border-slate-800 px-3 py-3 text-xs animate-in slide-in-from-top-2">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-200 mb-1">
                Quick 1-Click Role Switcher for Hackathon Evaluation:
              </p>
              <p className="text-slate-400 text-[11px]">
                Currently logged in as: <strong className="text-sky-300">{user?.name}</strong> ({user?.role})
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => switchDemoUser(demoAccounts.publicUser.email, demoAccounts.publicUser.password)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                  user?.role === 'PUBLIC_USER'
                    ? 'bg-sky-600 text-white border-sky-400 ring-2 ring-sky-300/40'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                }`}
              >
                👤 Public User (Patient Kavitha)
              </button>

              <button
                onClick={() =>
                  switchDemoUser(
                    demoAccounts.hospitalAdmins[0].email,
                    demoAccounts.hospitalAdmins[0].password
                  )
                }
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                  user?.hospital_id === 'H001'
                    ? 'bg-rose-600 text-white border-rose-400 ring-2 ring-rose-300/40'
                    : 'bg-slate-800 text-rose-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                🚨 Central Admin (H001 Shortage)
              </button>

              <button
                onClick={() =>
                  switchDemoUser(
                    demoAccounts.hospitalAdmins[1].email,
                    demoAccounts.hospitalAdmins[1].password
                  )
                }
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                  user?.hospital_id === 'H003'
                    ? 'bg-emerald-600 text-white border-emerald-400 ring-2 ring-emerald-300/40'
                    : 'bg-slate-800 text-emerald-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                🟢 Adyar Admin (H003 Surplus Donor)
              </button>

              {onOpenAuth && (
                <button
                  onClick={onOpenAuth}
                  className="px-2 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white underline"
                >
                  Other Accounts...
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
