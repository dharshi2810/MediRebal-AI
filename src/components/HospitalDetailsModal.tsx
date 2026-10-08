import React, { useState, useEffect } from 'react';
import { Hospital, Doctor, Nurse, Ambulance } from '../types';
import { api } from '../services/api';
import {
  X,
  Phone,
  Navigation,
  Calendar,
  AlertTriangle,
  Stethoscope,
  HeartPulse,
  Activity,
  BedDouble,
  Users,
  Truck,
  CheckCircle2,
} from 'lucide-react';

interface HospitalDetailsModalProps {
  hospitalId: string | null;
  onClose: () => void;
  onRequestEmergency: (hospital: Hospital) => void;
  onBookAppointment: (hospital: Hospital) => void;
}

function getDoctorStatusDisplay(status: string) {
  const s = (status || '').toLowerCase().trim();
  if (s === 'available') {
    return { text: 'Available', badgeClass: 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold' };
  }
  if (s === 'busy') {
    return { text: 'Currently Busy', badgeClass: 'bg-amber-50 text-amber-900 border border-amber-300 font-bold' };
  }
  if (s === 'on leave' || s === 'on_leave') {
    return { text: 'On Leave', badgeClass: 'bg-slate-100 text-slate-700 border border-slate-300 font-medium' };
  }
  if (s === 'off duty' || s === 'off_duty') {
    return { text: 'Off Duty', badgeClass: 'bg-slate-100 text-slate-600 border border-slate-300 font-medium' };
  }
  return { text: status, badgeClass: 'bg-slate-100 text-slate-700 border border-slate-300' };
}

function getNurseStatusDisplay(status: string) {
  const s = (status || '').toLowerCase().trim();
  if (s === 'available') {
    return { text: 'Available', badgeClass: 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold' };
  }
  if (s === 'on duty' || s === 'on_duty') {
    return { text: 'On Duty', badgeClass: 'bg-sky-50 text-sky-800 border border-sky-300 font-bold' };
  }
  if (s === 'on leave' || s === 'on_leave') {
    return { text: 'On Leave', badgeClass: 'bg-slate-100 text-slate-700 border border-slate-300 font-medium' };
  }
  if (s === 'off duty' || s === 'off_duty') {
    return { text: 'Off Duty', badgeClass: 'bg-slate-100 text-slate-600 border border-slate-300 font-medium' };
  }
  return { text: status, badgeClass: 'bg-slate-100 text-slate-700 border border-slate-300' };
}

export const HospitalDetailsModal: React.FC<HospitalDetailsModalProps> = ({
  hospitalId,
  onClose,
  onRequestEmergency,
  onBookAppointment,
}) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (hospitalId) {
      loadDetails();
      const interval = setInterval(loadDetails, 3000);
      return () => clearInterval(interval);
    }
  }, [hospitalId]);

  const loadDetails = async () => {
    if (!hospitalId) return;
    try {
      const res = await api.hospitals.getById(hospitalId);
      setData(res);
    } catch (e) {
      console.warn('Failed to load hospital details:', e);
    } finally {
      setIsLoading(false);
    }
  };

  if (!hospitalId) return null;

  // Filter available ambulances (must be strictly available)
  const availableAmbulances: Ambulance[] = (data?.ambulances || []).filter(
    (a: Ambulance) => (a.status || '').toLowerCase() === 'available'
  );

  const availableDoctorsCount = (data?.doctors || []).filter(
    (d: Doctor) => (d.status || '').toLowerCase() === 'available'
  ).length;

  const availableNursesCount = (data?.nurses || []).filter((n: Nurse) =>
    ['available', 'on duty', 'on_duty'].includes((n.status || '').toLowerCase())
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-300 overflow-hidden my-4">
        {/* Header - Professional Healthcare Navy Blue */}
        <div className="bg-[#0f2b48] px-6 py-5 text-white flex items-start justify-between border-b-4 border-emerald-600">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2 py-0.5 rounded bg-white/20 text-xs font-mono font-bold tracking-wide">
                {data?.hospital_id}
              </span>
              <span className="text-slate-200 text-xs">
                Location: {data?.area}, Chennai
              </span>
              <span
                className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                  data?.status === 'critical'
                    ? 'bg-red-600 text-white'
                    : data?.status === 'high_risk'
                    ? 'bg-orange-500 text-white'
                    : data?.status === 'limited'
                    ? 'bg-amber-400 text-slate-900'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                Status: {data?.status ? data.status.replace('_', ' ') : 'Healthy'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {data?.name}
            </h2>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {data?.address}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer ml-3"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading && !data ? (
          <div className="p-12 text-center text-slate-600 text-sm">
            <Activity className="w-8 h-8 text-[#0f2b48] animate-spin mx-auto mb-2" />
            Loading latest MongoDB hospital records...
          </div>
        ) : (
          <div className="p-6 max-h-[78vh] overflow-y-auto space-y-6 text-sm">
            {/* Quick Contact & Action Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <a
                href={`tel:${(data?.emergency_phone || '').replace(/[^0-9+]/g, '')}`}
                className="p-2.5 rounded-lg bg-red-700 hover:bg-red-800 text-white font-bold flex items-center justify-center gap-1.5 shadow-xs text-center text-xs"
              >
                <Phone className="w-4 h-4" />
                <span>Call Emergency</span>
              </a>

              <button
                onClick={() => onBookAppointment(data)}
                className="p-2.5 rounded-lg bg-[#0f2b48] hover:bg-[#1a3d60] text-white font-bold flex items-center justify-center gap-1.5 shadow-xs text-center text-xs cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>Book Doctor</span>
              </button>

              <button
                onClick={() => onRequestEmergency(data)}
                className="p-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer text-xs"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Request SOS</span>
              </button>

              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${data?.latitude},${data?.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center justify-center gap-1.5 text-center text-xs border border-slate-300"
              >
                <Navigation className="w-4 h-4 text-slate-700" />
                <span>Directions</span>
              </a>
            </div>

            {/* SECTION: AVAILABLE NOW */}
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 mb-3.5">
                <h3 className="font-bold text-base text-[#0f2b48] tracking-tight uppercase flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>AVAILABLE NOW</span>
                </h3>
                <span className="text-xs text-slate-500">
                  Live data synced from MongoDB
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
                {/* 1. Beds */}
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-xs text-slate-500 block mb-1">Total Beds</span>
                  <div className="text-xl font-bold text-slate-900 leading-none">
                    {data?.overview?.available_beds ?? 0}
                  </div>
                  <span className="text-[11px] text-emerald-700 font-bold block mt-1">
                    Available Beds
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    of {data?.overview?.total_beds ?? 0} total
                  </span>
                </div>

                {/* 2. ICU Beds */}
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-xs text-slate-500 block mb-1">ICU Beds</span>
                  <div className="text-xl font-bold text-slate-900 leading-none">
                    {data?.overview?.icu_beds ?? 0}
                  </div>
                  <span className="text-[11px] text-emerald-700 font-bold block mt-1">
                    Available ICU
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Trauma ready
                  </span>
                </div>

                {/* 3. Oxygen */}
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-xs text-slate-500 block mb-1">Oxygen</span>
                  <div className={`text-xl font-bold leading-none ${
                    (data?.overview?.oxygen_cylinders ?? 0) <= 30 ? 'text-red-600' : 'text-slate-900'
                  }`}>
                    {data?.overview?.oxygen_cylinders ?? 0}
                  </div>
                  <span className="text-[11px] text-emerald-700 font-bold block mt-1">
                    Cylinders
                  </span>
                  <span className={`text-[10px] font-bold block mt-0.5 ${
                    data?.overview?.oxygen_status === 'Critical'
                      ? 'text-red-600'
                      : data?.overview?.oxygen_status === 'Low'
                      ? 'text-orange-600'
                      : data?.overview?.oxygen_status === 'Limited'
                      ? 'text-amber-600'
                      : 'text-emerald-700'
                  }`}>
                    {data?.overview?.oxygen_status || 'Good'}
                  </span>
                </div>

                {/* 4. Doctors */}
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-xs text-slate-500 block mb-1">Doctors</span>
                  <div className="text-xl font-bold text-slate-900 leading-none">
                    {availableDoctorsCount}
                  </div>
                  <span className="text-[11px] text-emerald-700 font-bold block mt-1">
                    Available
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    of {data?.doctors?.length || 0} total
                  </span>
                </div>

                {/* 5. Nurses */}
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-xs text-slate-500 block mb-1">Nurses</span>
                  <div className="text-xl font-bold text-slate-900 leading-none">
                    {availableNursesCount}
                  </div>
                  <span className="text-[11px] text-emerald-700 font-bold block mt-1">
                    On Duty
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    of {data?.nurses?.length || 0} staff
                  </span>
                </div>

                {/* 6. Ambulances */}
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-xs text-slate-500 block mb-1">Ambulances</span>
                  <div className={`text-xl font-bold leading-none ${
                    availableAmbulances.length === 0 ? 'text-red-600' : 'text-slate-900'
                  }`}>
                    {availableAmbulances.length}
                  </div>
                  <span className="text-[11px] text-emerald-700 font-bold block mt-1">
                    Available
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Standby units
                  </span>
                </div>
              </div>
            </div>

            {/* Ward Bed Inventory Breakdown */}
            {data?.beds && data.beds.length > 0 && (
              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-2.5 flex items-center gap-2 border-b border-slate-200 pb-1">
                  <BedDouble className="w-4 h-4 text-[#0f2b48]" />
                  <span>Bed Category Inventory</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {data.beds.map((b: any) => (
                    <div key={b.category} className="p-3 rounded-lg border border-slate-200 bg-white">
                      <p className="font-bold text-slate-800 text-xs truncate">{b.category}</p>
                      <div className="flex items-baseline justify-between mt-1.5">
                        <span className="text-emerald-700 font-bold text-sm">
                          {b.available} Available
                        </span>
                        <span className="text-slate-500 text-xs">
                          {b.occupied}/{b.total}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DOCTOR DIRECTORY & AVAILABILITY */}
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-2.5">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-[#0f2b48]" />
                  <span>Doctors Directory ({data?.doctors?.length || 0})</span>
                </h4>
                <button
                  onClick={() => onBookAppointment(data)}
                  className="text-xs text-[#0f2b48] font-bold hover:underline cursor-pointer"
                >
                  Book Available Specialist →
                </button>
              </div>

              {(!data?.doctors || data.doctors.length === 0) ? (
                <p className="text-slate-500 text-xs italic py-2">No doctors currently listed for this hospital.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {data.doctors.map((doc: any) => {
                    const statusInfo = getDoctorStatusDisplay(doc.status);
                    return (
                      <div
                        key={doc._id || doc.name}
                        className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between gap-3"
                      >
                        <div>
                          <p className="font-bold text-slate-900 text-sm leading-tight">{doc.name}</p>
                          <p className="text-xs text-slate-600 mt-0.5">
                            {doc.specialization} &bull; {doc.department}
                          </p>
                          {doc.phone && (
                            <p className="text-[11px] text-slate-500 mt-0.5">Ph: {doc.phone}</p>
                          )}
                        </div>
                        <span className={`px-2.5 py-1 rounded text-xs whitespace-nowrap ${statusInfo.badgeClass}`}>
                          {statusInfo.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* NURSE DIRECTORY & AVAILABILITY */}
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-2.5">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#0f2b48]" />
                  <span>Nurses On Duty ({data?.nurses?.length || 0})</span>
                </h4>
              </div>

              {(!data?.nurses || data.nurses.length === 0) ? (
                <p className="text-slate-500 text-xs italic py-2">No nursing staff currently listed for this hospital.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {data.nurses.map((nurse: any) => {
                    const statusInfo = getNurseStatusDisplay(nurse.status);
                    return (
                      <div
                        key={nurse._id || nurse.name}
                        className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between gap-3"
                      >
                        <div>
                          <p className="font-bold text-slate-900 text-sm leading-tight">{nurse.name}</p>
                          <p className="text-xs text-slate-600 mt-0.5">
                            {nurse.department} &bull; Shift: {nurse.shift || 'General'}
                          </p>
                          {nurse.phone && (
                            <p className="text-[11px] text-slate-500 mt-0.5">Ph: {nurse.phone}</p>
                          )}
                        </div>
                        <span className={`px-2.5 py-1 rounded text-xs whitespace-nowrap ${statusInfo.badgeClass}`}>
                          {statusInfo.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* AMBULANCES ON STANDBY */}
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-2.5">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#0f2b48]" />
                  <span>Ambulance Fleet Status ({availableAmbulances.length} Currently Available)</span>
                </h4>
              </div>

              {availableAmbulances.length === 0 ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                  ⚠️ No ambulances currently available at this hub (vehicles currently on active trips or under maintenance). For urgent dispatch, broadcast an SOS request.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {availableAmbulances.map((amb) => (
                    <div
                      key={amb._id || amb.ambulance_id}
                      className="p-3 rounded-lg border border-emerald-300 bg-emerald-50/50 flex items-center justify-between gap-3"
                    >
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{amb.ambulance_id}</p>
                        <p className="text-xs text-slate-600">
                          Driver: {amb.driver_name} {amb.phone ? `(${amb.phone})` : ''}
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold">
                        Available
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
