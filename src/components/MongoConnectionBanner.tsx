import React, { useState, useEffect } from 'react';
import { Database, AlertTriangle, KeyRound, CheckCircle2, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

interface MongoConnectionBannerProps {
  onConnected?: () => void;
}

export const MongoConnectionBanner: React.FC<MongoConnectionBannerProps> = ({ onConnected }) => {
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkHealth = async () => {
    try {
      const res = await api.status.getHealth();
      setDbStatus(res);
    } catch (_) {}
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setStatusMessage({ text: 'Please enter your MongoDB Atlas password', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const response = await fetch('/api/status/configure-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.database === 'connected') {
        setStatusMessage({
          text: 'Connected to MongoDB Atlas! medirebal database and connection_test created.',
          type: 'success',
        });
        await checkHealth();
        if (onConnected) onConnected();
      } else {
        setStatusMessage({
          text: data.error || 'Failed to connect. Verify your Atlas password.',
          type: 'error',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        text: err.message || 'Connection attempt failed',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // If connected, show small green indicator or null
  if (dbStatus?.database?.isConnectedToAtlas) {
    return null;
  }

  const isAuthFailed = dbStatus?.database?.error?.includes('bad auth') || dbStatus?.database?.notice?.includes('<db_password>');

  return (
    <div className="bg-amber-950/80 border-b border-amber-600/40 text-amber-100 text-xs py-2 px-3 sm:px-4 shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div className="flex items-start md:items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 md:mt-0" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-amber-200">MongoDB Atlas Status:</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-900/80 border border-amber-700/60 font-mono text-[11px] text-amber-300">
                {isAuthFailed ? 'Authentication Required (bad auth)' : 'Disconnected'}
              </span>
            </div>
            <p className="text-[11px] text-amber-300/90 mt-0.5">
              {isAuthFailed
                ? 'Your MONGODB_URI contains "<db_password>". Enter your Atlas password for user "dharshinivijay2810_db_user" to write to the medirebal database.'
                : (dbStatus?.database?.error || 'Connecting to MongoDB Atlas cluster...')}
            </p>
          </div>
        </div>

        <form onSubmit={handleConnect} className="flex items-center gap-2 shrink-0 flex-wrap">
          <div className="relative">
            <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              placeholder="Enter Atlas DB password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-900 border border-amber-600/50 text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-400 w-52 sm:w-60"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Database className="w-3.5 h-3.5" />
            )}
            <span>{isSubmitting ? 'Connecting...' : 'Connect to medirebal'}</span>
          </button>
        </form>
      </div>

      {statusMessage && (
        <div
          className={`max-w-7xl mx-auto mt-2 p-2 rounded-lg text-[11px] flex items-center gap-1.5 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/80 text-emerald-200 border border-emerald-600/40'
              : 'bg-rose-950/80 text-rose-200 border border-rose-600/40'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}
    </div>
  );
};
