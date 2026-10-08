import React, { useState } from 'react';
import { Hospital } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { X, Check, AlertCircle, Phone, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  hospitals: Hospital[];
  onDispatched: () => void;
  initialResource?: string;
  initialHospitalId?: string;
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({
  isOpen,
  onClose,
  hospitals,
  onDispatched,
  initialResource = 'oxygen',
  initialHospitalId,
}) => {
  const { user } = useAuth();
  const [selectedResource, setSelectedResource] = useState(initialResource);
  const [selectedHospitalIds, setSelectedHospitalIds] = useState<string[]>(() =>
    initialHospitalId ? [initialHospitalId] : hospitals.slice(0, 3).map((h) => h.hospital_id)
  );
  const [patientName, setPatientName] = useState(user?.name || 'Kavitha Raman');
  const [patientPhone, setPatientPhone] = useState(user?.phone || '+91 98401 23456');
  const [patientLocation, setPatientLocation] = useState(user?.location || 'Anna Nagar, Chennai');
  const [priority, setPriority] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM'>('CRITICAL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [geminiAdvice, setGeminiAdvice] = useState<string>('');

  if (!isOpen) return null;

  const resourceOptions = [
    { id: 'oxygen', label: 'Oxygen Support', icon: '🫁', desc: 'Critical oxygen cylinder / concentrator' },
    { id: 'emergency_bed', label: 'Emergency Bed', icon: '🛏️', desc: 'Trauma & urgent casualty admission' },
    { id: 'icu_bed', label: 'ICU Bed', icon: '🏥', desc: 'Intensive care with advanced monitoring' },
    { id: 'ambulance', label: 'Ambulance Dispatch', icon: '🚑', desc: 'Immediate GPS emergency transit' },
    { id: 'emergency_doctor', label: 'Emergency Doctor', icon: '👨‍⚕️', desc: 'On-duty trauma physician' },
  ];

  const toggleHospital = (hid: string) => {
    setSelectedHospitalIds((prev) =>
      prev.includes(hid) ? prev.filter((id) => id !== hid) : [...prev, hid]
    );
  };

  const handleSelectAll = () => {
    if (selectedHospitalIds.length === hospitals.length) {
      setSelectedHospitalIds([]);
    } else {
      setSelectedHospitalIds(hospitals.map((h) => h.hospital_id));
    }
  };

  const handleDispatch = async () => {
    if (selectedHospitalIds.length === 0) return;
    setIsSubmitting(true);
    try {
      await api.emergency.create({
        request_type: selectedResource,
        quantity: 1,
        priority,
        target_hospital_ids: selectedHospitalIds,
        user_name: patientName,
        user_phone: patientPhone,
        user_location: patientLocation,
      });

      // Try fetching quick emergency guidance
      try {
        const res = await api.gemini.emergencyGuidance({
          requestType: selectedResource,
          area: patientLocation,
        });
        setGeminiAdvice(res.guidance);
      } catch (e) {}

      onDispatched();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch emergency request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto font-sans">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-red-300 overflow-hidden my-4">
        {/* Header */}
        <div className="bg-[#0f2b48] border-b-4 border-red-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-red-700 flex items-center justify-center text-lg">
              🚨
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Multi-Hospital Emergency Dispatch</h3>
              <p className="text-slate-300 text-xs">Simultaneous notification to Chennai emergency network</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 max-h-[75vh] overflow-y-auto space-y-4">
          {/* Step 1: Select Resource */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              1. What resource do you need right now?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {resourceOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSelectedResource(opt.id)}
                  type="button"
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                    selectedResource === opt.id
                      ? 'bg-red-50 border-red-500 ring-2 ring-red-400 text-red-950 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="text-2xl mb-1">{opt.icon}</div>
                  <div>
                    <div className="font-bold text-xs">{opt.label}</div>
                    <div className="text-[10px] text-slate-500 line-clamp-1">{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Patient Info */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              2. Patient Contact & Location
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500 text-[11px] block mb-0.5">Patient / Contact Name</span>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 focus:outline-sky-500 text-xs font-medium"
                  placeholder="Full Name"
                />
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block mb-0.5">Phone Number (Clickable)</span>
                <input
                  type="tel"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 focus:outline-sky-500 text-xs font-medium"
                  placeholder="+91 98400..."
                />
              </div>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block mb-0.5">Current Area in Chennai</span>
              <input
                type="text"
                value={patientLocation}
                onChange={(e) => setPatientLocation(e.target.value)}
                className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 focus:outline-sky-500 text-xs font-medium"
                placeholder="Area (e.g. Anna Nagar, Central, Adyar)"
              />
            </div>
          </div>

          {/* Step 3: Multi-Hospital Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                3. Broadcast to Hospitals ({selectedHospitalIds.length} selected)
              </label>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs text-sky-600 font-semibold hover:underline cursor-pointer"
              >
                {selectedHospitalIds.length === hospitals.length ? 'Deselect All' : 'Select All 5'}
              </button>
            </div>

            <div className="space-y-2">
              {hospitals.map((hosp) => {
                const isChecked = selectedHospitalIds.includes(hosp.hospital_id);
                return (
                  <div
                    key={hosp.hospital_id}
                    onClick={() => toggleHospital(hosp.hospital_id)}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition ${
                      isChecked
                        ? 'bg-sky-50/70 border-sky-400 ring-1 ring-sky-300'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center border transition ${
                          isChecked
                            ? 'bg-sky-600 border-sky-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900">{hosp.name}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2">
                          <span>📍 {hosp.area}</span>
                          {hosp.distanceKm !== undefined && (
                            <span>• ~{hosp.distanceKm} km</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right text-[11px]">
                      <span className="font-bold text-slate-700 block">
                        🫁 {hosp.overview.oxygen_cylinders} cyl | 🛏️ {hosp.overview.available_beds} beds
                      </span>
                      <span
                        className={`font-semibold ${
                          hosp.status === 'healthy'
                            ? 'text-emerald-600'
                            : hosp.status === 'limited'
                            ? 'text-amber-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {hosp.status === 'healthy' ? '🟢 Ready' : hosp.status === 'limited' ? '🟡 Limited' : '🔴 Alert'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="text-red-500 font-bold">108</span> Ambulance Hotline reminder
          </div>
          <button
            onClick={handleDispatch}
            disabled={isSubmitting || selectedHospitalIds.length === 0}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-sm shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 transition cursor-pointer"
          >
            <span>DISPATCH TO {selectedHospitalIds.length} HOSPITALS</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
