import React, { useEffect } from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface AccessDeniedProps {
  onRedirect: () => void;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({ onRedirect }) => {
  useEffect(() => {
    // Automatically redirect back to patient home page after a brief moment
    const timer = setTimeout(() => {
      onRedirect();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onRedirect]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-red-200 p-8 shadow-xl text-center space-y-5 animate-in fade-in zoom-in-95">
        <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Access denied.
          </h1>
          <p className="text-sm text-slate-600">
            You do not have permission to view Hospital Administration pages. This portal is strictly restricted to authorized medical hospital personnel.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 font-medium">
          Redirecting you back to the patient home page...
        </div>

        <div>
          <button
            onClick={onRedirect}
            className="w-full py-2.5 px-4 rounded-xl bg-[#0f2b48] hover:bg-[#1a3d60] text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Patient Home</span>
          </button>
        </div>
      </div>
    </div>
  );
};
