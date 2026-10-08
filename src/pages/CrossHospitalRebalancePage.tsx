import React, { useState, useEffect } from 'react';
import { RebalanceAnalysisResult, TransferRequest } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  RotateCcw,
  Sparkles,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Truck,
  Activity,
  AlertTriangle,
  Building,
  RefreshCw,
  Send,
} from 'lucide-react';

export const CrossHospitalRebalancePage: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<RebalanceAnalysisResult | null>(null);
  const [activeTransfers, setActiveTransfers] = useState<TransferRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [notificationMsg, setNotificationMsg] = useState('');

  useEffect(() => {
    loadRebalanceData();
    const interval = setInterval(loadRebalanceData, 4000);
    return () => clearInterval(interval);
  }, []);

  const loadRebalanceData = async () => {
    try {
      const [rebalRes, transferRes] = await Promise.all([
        api.rebalance.getDistrictAnalysis(),
        api.transfers.get(),
      ]);
      setData(rebalRes);
      setActiveTransfers(transferRes);
    } catch (e) {
      console.warn('Failed to load district rebalance analysis:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestTransfer = async (rec: TransferRequest) => {
    setSubmittingId(rec._id!);
    try {
      await api.transfers.create({
        requester_hospital_id: rec.to_hospital_id,
        requester_hospital_name: rec.to_hospital_name,
        requested_from_hospital_id: rec.from_hospital_id,
        requested_from_hospital_name: rec.from_hospital_name,
        target_hospital_id: rec.from_hospital_id,
        target_hospital_name: rec.from_hospital_name,
        from_hospital_id: rec.from_hospital_id,
        from_hospital_name: rec.from_hospital_name,
        to_hospital_id: rec.to_hospital_id,
        to_hospital_name: rec.to_hospital_name,
        resource_type: rec.resource_type || 'Oxygen Cylinders',
        quantity: rec.quantity,
        priority: 'High',
        status: 'Pending',
        deadline: rec.deadline,
        reason: rec.reason || `AI Rebalance: ${rec.to_hospital_name} needs ${rec.quantity} units from ${rec.from_hospital_name}`,
        ai_justification: rec.ai_justification,
        estimated_transit_time: rec.estimated_transit_time,
      });

      setNotificationMsg(`Resource request for ${rec.quantity} ${rec.resource_type || 'Oxygen Cylinders'} created! Appears in ${rec.to_hospital_name} → "My Requests" and ${rec.from_hospital_name} → "Resource Requests".`);
      setTimeout(() => setNotificationMsg(''), 5000);
      loadRebalanceData();
    } catch (err: any) {
      alert(err.message || 'Failed to request resource');
    } finally {
      setSubmittingId(null);
    }
  };

  const handleUpdateTransferStatus = async (id: string, status: string) => {
    setSubmittingId(id);
    try {
      await api.transfers.update(id, { status });
      setNotificationMsg(`Transfer status updated to: ${status.toUpperCase()}!`);
      setTimeout(() => setNotificationMsg(''), 4000);
      loadRebalanceData();
    } catch (err: any) {
      alert(err.message || 'Failed to update transfer');
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-6xl mx-auto font-sans">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white p-6 shadow-xl space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-sky-500/20 text-sky-400">
              <RotateCcw className="w-6 h-6 animate-spin-slow" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                  Cross-Hospital Resource Rebalancing
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-black tracking-wider uppercase border border-sky-400/30">
                  HN-AI-05
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Predictive shortage mitigation & dynamic inter-facility surplus rebalancing across Chennai
              </p>
            </div>
          </div>

          <button
            onClick={loadRebalanceData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Analysis</span>
          </button>
        </div>

        {/* Workflow breadcrumb */}
        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-400">
          <span className="text-sky-400">1. ML PREDICT</span>
          <span>→</span>
          <span className="text-amber-400">2. DETECT SURPLUS</span>
          <span>→</span>
          <span className="text-emerald-400">3. RECOMMEND TRANSFER</span>
          <span>→</span>
          <span className="text-purple-400">4. HOSPITAL APPROVAL</span>
          <span>→</span>
          <span className="text-teal-400">5. RESOURCE TRANSIT & RESTOCK</span>
        </div>
      </div>

      {notificationMsg && (
        <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Grid: Shortage vs Surplus Hubs Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Shortage Hospitals Card */}
        <div className="bg-white rounded-3xl border border-red-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-red-100">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-600" />
              <h2 className="font-extrabold text-sm text-slate-900">Shortage Hospitals (Recipients)</h2>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold text-[11px]">
              {data?.shortageHospitals.length || 0} urgent
            </span>
          </div>

          <div className="space-y-2.5">
            {data?.shortageHospitals.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No hospitals currently in critical deficit.</p>
            ) : (
              data?.shortageHospitals.map((h) => (
                <div key={h.hospital_id} className="p-3 rounded-2xl bg-red-50/60 border border-red-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-900">{h.name}</strong>
                    <span className="font-extrabold text-red-600">
                      {h.risk_level === 'CRITICAL' ? '🔴 CRITICAL' : '🟠 HIGH RISK'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600">
                    <div>Stock: <strong className="text-red-700">{h.current_stock} cyl</strong></div>
                    <div>Rate: <strong>{h.consumption_rate} /hr</strong></div>
                    <div>Critical in: <strong className="text-red-700">~{h.time_to_critical_minutes} mins</strong></div>
                  </div>
                  <div className="text-[11px] font-semibold text-red-800">
                    Deficit to safe reserve: +{h.deficit_units} cylinders needed
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Surplus Hospitals Card */}
        <div className="bg-white rounded-3xl border border-emerald-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <h2 className="font-extrabold text-sm text-slate-900">Surplus Hospitals (Potential Donors)</h2>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[11px]">
              {data?.surplusHospitals.length || 0} healthy
            </span>
          </div>

          <div className="space-y-2.5">
            {data?.surplusHospitals.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No surplus hubs with transferable reserves.</p>
            ) : (
              data?.surplusHospitals.map((h) => (
                <div key={h.hospital_id} className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-900">{h.name}</strong>
                    <span className="font-extrabold text-emerald-700">🟢 SURPLUS HUB</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600">
                    <div>Stock: <strong className="text-emerald-800">{h.current_stock} cyl</strong></div>
                    <div>Rate: <strong>{h.consumption_rate} /hr</strong></div>
                    <div>Surplus buffer: <strong className="text-emerald-800">~{h.surplus_hours}h</strong></div>
                  </div>
                  <div className="text-[11px] font-semibold text-emerald-800">
                    Transferable capacity: +{h.surplus_units} units above threshold
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* AI TRANSFER RECOMMENDATIONS SECTION */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-sky-600" />
            <h2 className="font-extrabold text-base text-slate-900">
              AI-Ranked Transfer Recommendations
            </h2>
          </div>
          <span className="text-xs text-slate-500">Calculated by Backend ML Optimization</span>
        </div>

        {data?.recommendations.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 text-xs">
            All hospitals currently balanced. Run simulation or deplete H001 to observe live rebalance trigger.
          </div>
        ) : (
          <div className="space-y-4">
            {data?.recommendations.map((rec, idx) => (
              <div
                key={rec._id}
                className="bg-white rounded-3xl border border-sky-300 p-5 shadow-md hover:shadow-lg transition space-y-3 text-xs"
              >
                {/* Priority Badge & Route Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-sky-600 text-white font-black text-[11px] uppercase tracking-wide">
                      Recommendation #{idx + 1}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        rec.priority === 'URGENT'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {rec.priority} PRIORITY
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Deadline: <strong>{rec.deadline}</strong></span>
                    {rec.estimated_transit_time && (
                      <span>• {rec.estimated_transit_time}</span>
                    )}
                  </div>
                </div>

                {/* Transfer Flow Route (From -> To) */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="sm:col-span-5 space-y-0.5">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                      Donor (Surplus Hub)
                    </span>
                    <p className="font-extrabold text-sm text-slate-900">{rec.from_hospital_name}</p>
                    <span className="text-[10px] text-slate-500 font-mono">ID: {rec.from_hospital_id}</span>
                  </div>

                  <div className="sm:col-span-2 text-center flex flex-col items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-black mx-auto">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                    <span className="font-black text-sky-700 text-sm mt-1">
                      {rec.quantity} Cylinders
                    </span>
                  </div>

                  <div className="sm:col-span-5 space-y-0.5 text-left sm:text-right">
                    <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">
                      Recipient (Critical Shortage)
                    </span>
                    <p className="font-extrabold text-sm text-slate-900">{rec.to_hospital_name}</p>
                    <span className="text-[10px] text-slate-500 font-mono">ID: {rec.to_hospital_id}</span>
                  </div>
                </div>

                {/* Gemini AI Justification Banner */}
                <div className="p-3 rounded-2xl bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-bold text-sky-900">Gemini Logistics Justification: </span>
                    <span className="text-sky-800 leading-snug">{rec.ai_justification}</span>
                  </div>
                </div>

                {/* Dispatch Button */}
                <div className="flex items-center justify-end pt-1">
                  <button
                    onClick={() => handleRequestTransfer(rec)}
                    disabled={submittingId === rec._id}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-500 hover:to-sky-600 text-white font-extrabold text-xs shadow-md shadow-sky-600/30 flex items-center gap-2 active:scale-95 transition cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {submittingId === rec._id ? 'Sending Request...' : 'Request Resource'}
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ACTIVE & HISTORICAL TRANSFERS STREAM */}
      <div className="space-y-3 pt-4 border-t border-slate-200">
        <h2 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
          <Truck className="w-5 h-5 text-sky-600" />
          Active Cross-Hospital Transfer Pipeline ({activeTransfers.length})
        </h2>

        {activeTransfers.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 text-xs">
            No transfer requests in transit yet. Click &ldquo;Dispatch Inter-Hospital Transfer Request&rdquo; above to initiate.
          </div>
        ) : (
          <div className="space-y-3">
            {activeTransfers.map((t) => (
              <div
                key={t._id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3 text-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 text-sm">
                      {t.quantity} Oxygen Cylinders: {t.from_hospital_name} → {t.to_hospital_name}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {t.status === 'requested' && (
                      <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" />
                        Awaiting Donor Approval
                      </span>
                    )}
                    {t.status === 'accepted' && (
                      <span className="px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 font-bold text-[11px] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-sky-600" />
                        Donor Approved (Preparing Dispatch)
                      </span>
                    )}
                    {t.status === 'in_transit' && (
                      <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 font-bold text-[11px] flex items-center gap-1 animate-pulse">
                        <Truck className="w-3 h-3 text-purple-600" />
                        In Transit on Road
                      </span>
                    )}
                    {t.status === 'delivered' && (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Delivered & Restocked!
                      </span>
                    )}
                    {t.status === 'rejected' && (
                      <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-800 font-bold text-[11px]">
                        Rejected
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-3">
                  <span>Priority: <strong>{t.priority}</strong></span>
                  <span>Deadline: <strong>{t.deadline}</strong></span>
                  <span>Est Transit: <strong>{t.estimated_transit_time}</strong></span>
                  <span>Logged: <strong>{new Date(t.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
                </div>

                {t.ai_justification && (
                  <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl italic">
                    AI Note: {t.ai_justification}
                  </p>
                )}

                {/* Action Pipeline Buttons for simulation & approval */}
                <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  {t.status === 'requested' && (
                    <>
                      <button
                        onClick={() => handleUpdateTransferStatus(t._id!, 'accepted')}
                        disabled={submittingId === t._id}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
                      >
                        Accept Request (Donor Hospital)
                      </button>
                      <button
                        onClick={() => handleUpdateTransferStatus(t._id!, 'rejected')}
                        disabled={submittingId === t._id}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {t.status === 'accepted' && (
                    <button
                      onClick={() => handleUpdateTransferStatus(t._id!, 'in_transit')}
                      disabled={submittingId === t._id}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Dispatch Ambulance / Transit</span>
                    </button>
                  )}

                  {t.status === 'in_transit' && (
                    <button
                      onClick={() => handleUpdateTransferStatus(t._id!, 'delivered')}
                      disabled={submittingId === t._id}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm Delivery & Restock Hospital!</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
