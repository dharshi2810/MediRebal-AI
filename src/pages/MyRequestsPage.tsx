import React, { useState, useEffect } from 'react';
import { EmergencyRequest, Appointment } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ClipboardList,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Phone,
  Navigation,
  Sparkles,
  Building,
} from 'lucide-react';

export const MyRequestsPage: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<'emergency' | 'appointments'>('emergency');
  const [emergencyRequests, setEmergencyRequests] = useState<EmergencyRequest[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000); // live polling
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [emRes, apptRes] = await Promise.all([
        api.emergency.get(),
        api.appointments.get(),
      ]);
      setEmergencyRequests(emRes);
      setAppointments(apptRes);
    } catch (e) {
      console.warn('Failed to load user requests:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelAppointment = async (apptId: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await api.appointments.update(apptId, 'cancelled');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel appointment');
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-sky-600" />
            My Requests & Appointments
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time status updates across Chennai multi-hospital network
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-xl text-xs font-bold self-start">
          <button
            onClick={() => setTab('emergency')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              tab === 'emergency'
                ? 'bg-white text-red-600 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🚨 Emergency SOS ({emergencyRequests.length})</span>
          </button>
          <button
            onClick={() => setTab('appointments')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              tab === 'appointments'
                ? 'bg-white text-sky-600 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📅 Appointments ({appointments.length})</span>
          </button>
        </div>
      </div>

      {/* Emergency Requests Stream Tab */}
      {tab === 'emergency' && (
        <div className="space-y-4">
          {emergencyRequests.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-3xl">📋</span>
              <h3 className="font-bold text-slate-800 text-sm">No Emergency Dispatches Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                When you click the emergency SOS button, your broadcast to multiple hospitals and their responses will appear here live.
              </p>
            </div>
          ) : (
            emergencyRequests.map((req) => {
              const responses = req.hospital_responses ? Object.entries(req.hospital_responses) : [];
              const acceptedResp = responses.find(([_, r]) => r.status === 'accepted');

              return (
                <div
                  key={req._id}
                  className={`rounded-3xl border bg-white p-5 shadow-sm space-y-4 text-xs transition ${
                    req.status === 'accepted'
                      ? 'border-emerald-300 ring-2 ring-emerald-200/50'
                      : 'border-slate-200'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 font-black text-[11px] uppercase tracking-wide">
                          🚨 {req.request_type.toUpperCase().replace('_', ' ')}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          Requested at {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="font-bold text-slate-900 text-sm mt-1">
                        Patient: {req.user_name} ({req.user_location})
                      </p>
                    </div>

                    <div>
                      {req.status === 'accepted' ? (
                        <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs flex items-center gap-1 border border-emerald-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          HOSPITAL ACCEPTED!
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center gap-1 animate-pulse">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          Awaiting Responses ({responses.length} targeted)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* PROMINENT ACCEPTED HOSPITAL HIGHLIGHT */}
                  {acceptedResp && (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                            Immediate Action Required:
                          </span>
                          <h4 className="text-base font-extrabold text-emerald-950">
                            {acceptedResp[1].hospital_name || acceptedResp[0]} has accepted your admission!
                          </h4>
                          <p className="text-[11px] text-emerald-800 mt-0.5">
                            {acceptedResp[1].responder_note || 'Emergency clinical unit and bed prepared. Please head to emergency casualty ward.'}
                          </p>
                        </div>
                        <a
                          href={`tel:${acceptedResp[1].phone ? acceptedResp[1].phone.replace(/[^0-9+]/g, '') : '108'}`}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-md flex items-center gap-1.5 active:scale-95 text-xs whitespace-nowrap"
                        >
                          <Phone className="w-4 h-4" />
                          <span>Call Hospital</span>
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Hospital Responses Breakdown */}
                  <div>
                    <h5 className="font-bold text-slate-700 text-[11px] uppercase tracking-wider mb-2">
                      Response Status by Hospital Hub:
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {responses.map(([hid, r]) => (
                        <div
                          key={hid}
                          className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                            r.status === 'accepted'
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                              : r.status === 'rejected'
                              ? 'bg-slate-50 border-slate-200 text-slate-400'
                              : 'bg-amber-50/60 border-amber-200 text-amber-900'
                          }`}
                        >
                          <div>
                            <p className="font-bold truncate max-w-[150px]">{r.hospital_name || hid}</p>
                            <span className="text-[10px] opacity-75">
                              {r.status === 'accepted' ? '✅ Accepted' : r.status === 'rejected' ? '❌ Unavailable' : '⏳ Pending review'}
                            </span>
                          </div>
                          {r.phone && (
                            <a
                              href={`tel:${r.phone.replace(/[^0-9+]/g, '')}`}
                              className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-white rounded-lg transition"
                              title="Call"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Appointments Tab */}
      {tab === 'appointments' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div>
              <h3 className="font-bold text-sm text-slate-800">My Appointments</h3>
              <p className="text-[11px] text-slate-500">Live consultation status synced directly with MongoDB</p>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold">
              {appointments.length} Total
            </span>
          </div>

          {appointments.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-3xl">📅</span>
              <h3 className="font-bold text-slate-800 text-sm">No Scheduled Appointments</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Explore hospital specialists on the home map and book your consultations online.
              </p>
            </div>
          ) : (
            appointments.map((appt) => {
              const s = (appt.status || 'Pending').toLowerCase();
              const isApproved = s === 'approved' || s === 'confirmed';
              const isPending = s === 'pending';
              const isRejected = s === 'rejected';
              const isCompleted = s === 'completed';
              const isCancelled = s === 'cancelled';

              const hospitalName = appt.hospitalName || appt.hospital_name || 'Hospital';
              const department = appt.departmentName || appt.department || 'General Medicine';
              const doctor = appt.doctorName || appt.doctor_name || 'Specialist Doctor';
              const date = appt.appointmentDate || appt.date;
              const time = appt.appointmentTime || appt.time;

              // Exact patient-facing labels per specification:
              // Pending -> "Pending Review"
              // Approved -> "Appointment Approved"
              // Rejected -> "Appointment Rejected"
              // Completed -> "Appointment Completed"
              // Cancelled -> "Appointment Cancelled"
              const statusText =
                isApproved
                  ? 'Appointment Approved'
                  : isRejected
                  ? 'Appointment Rejected'
                  : isCompleted
                  ? 'Appointment Completed'
                  : isCancelled
                  ? 'Appointment Cancelled'
                  : 'Pending Review';

              return (
                <div
                  key={appt._id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3 text-xs"
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-slate-900">{hospitalName}</h4>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                            isApproved
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : isPending
                              ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                              : isCompleted
                              ? 'bg-sky-100 text-sky-800 border border-sky-300'
                              : isRejected
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-slate-100 text-slate-500 line-through border border-slate-200'
                          }`}
                        >
                          {statusText}
                        </span>
                      </div>
                      <p className="text-slate-600 text-xs mt-1">
                        Department: <strong className="text-emerald-800">{department}</strong> &bull; Doctor: <strong>{doctor}</strong>
                      </p>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        Date & Slot: <strong className="text-slate-800">{date} at {time}</strong>
                      </p>
                      {appt.symptoms && (
                        <p className="text-slate-400 text-[11px] italic mt-0.5">Note: {appt.symptoms}</p>
                      )}
                    </div>

                    {(isPending || isApproved) && (
                      <button
                        onClick={() => handleCancelAppointment(appt._id!)}
                        className="px-3 py-1 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-bold transition cursor-pointer"
                      >
                        Cancel Appointment
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
