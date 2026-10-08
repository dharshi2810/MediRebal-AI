import React, { useState, useEffect } from 'react';
import { Hospital, Doctor } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { X, Calendar, Clock, Stethoscope, CheckCircle2 } from 'lucide-react';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  hospital: Hospital;
  onBooked?: () => void;
}

export const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  hospital,
  onBooked,
}) => {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const tomorrow = new Date(Date.now() + 86400000);
    return tomorrow.toISOString().split('T')[0];
  });
  const [selectedSlot, setSelectedSlot] = useState('10:00 AM');
  const [symptoms, setSymptoms] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const timeSlots = [
    '09:00 AM',
    '09:30 AM',
    '10:00 AM',
    '10:30 AM',
    '11:00 AM',
    '11:30 AM',
    '02:00 PM',
    '02:30 PM',
    '03:00 PM',
    '03:30 PM',
    '04:00 PM',
  ];

  useEffect(() => {
    if (hospital) {
      loadHospitalStaff();
    }
  }, [hospital]);

  const loadHospitalStaff = async () => {
    try {
      const [deptList, docList] = await Promise.all([
        api.departments.get(hospital.hospital_id),
        api.doctors.get(hospital.hospital_id),
      ]);
      const deptNames = deptList.map((d) => d.name);
      setDepartments(deptNames.length > 0 ? deptNames : ['Emergency & Trauma', 'Cardiology', 'General Medicine']);
      if (deptNames.length > 0) setSelectedDept(deptNames[0]);

      setDoctors(docList);
      const avail = docList.filter((d) => (d.status || '').toLowerCase() === 'available');
      if (avail.length > 0) setSelectedDoctor(avail[0]);
      else setSelectedDoctor(null);
    } catch (e) {
      console.warn('Failed to load doctors:', e);
    }
  };

  if (!isOpen) return null;

  const availableDoctors = doctors.filter(
    (d) =>
      (d.status || '').toLowerCase() === 'available' &&
      (!selectedDept || d.department.toLowerCase().includes(selectedDept.toLowerCase()))
  );

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor) {
      setErrorMsg('Please select an available doctor.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const docId = (selectedDoctor as any).doctor_id || selectedDoctor._id || selectedDoctor.name;
      await api.appointments.create({
        hospital_id: hospital.hospital_id,
        hospitalId: hospital.hospital_id,
        hospitalName: hospital.name,
        doctor_id: docId,
        doctorId: docId,
        doctor_name: selectedDoctor.name,
        doctorName: selectedDoctor.name,
        department: selectedDept || selectedDoctor.department,
        departmentName: selectedDept || selectedDoctor.department,
        departmentId: selectedDept || selectedDoctor.department,
        date: selectedDate,
        appointmentDate: selectedDate,
        time: selectedSlot,
        appointmentTime: selectedSlot,
        symptoms: symptoms || 'General Medical Consultation',
        patient_name: user?.name || 'Patient',
        patientName: user?.name || 'Patient',
        patient_phone: user?.phone || '+91 98401 23456',
        patientPhone: user?.phone || '+91 98401 23456',
        patientId: user?.email || user?.id || 'patient@medirebal.org',
      });

      setSuccessMsg(`Appointment booked with ${selectedDoctor.name} on ${selectedDate} at ${selectedSlot}!`);
      setTimeout(() => {
        if (onBooked) onBooked();
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to book appointment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95">
        <div className="bg-sky-700 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-sky-200" />
            <div>
              <h3 className="font-bold text-base leading-tight">Book Doctor Appointment</h3>
              <p className="text-sky-200 text-xs truncate max-w-[260px]">{hospital.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-sky-600 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {successMsg ? (
          <div className="p-8 text-center space-y-3">
            <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
            <h4 className="text-lg font-bold text-slate-900">Appointment Confirmed!</h4>
            <p className="text-xs text-slate-600">{successMsg}</p>
          </div>
        ) : (
          <form onSubmit={handleConfirm} className="p-5 space-y-4 text-xs">
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                ⚠️ {errorMsg}
              </div>
            )}

            {/* Department */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Select Department</label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-sky-500 font-medium"
              >
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Doctor */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Select Available Specialist</label>
              {availableDoctors.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-medium">
                  No doctors currently marked Available in this department. Please choose another department or check back later.
                </div>
              ) : (
                <select
                  value={selectedDoctor?.name || ''}
                  onChange={(e) => {
                    const doc = availableDoctors.find((d) => d.name === e.target.value);
                    if (doc) setSelectedDoctor(doc);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-sky-500 font-medium"
                >
                  {availableDoctors.map((doc) => (
                    <option key={doc.name} value={doc.name}>
                      {doc.name} ({doc.specialization}) — Available
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Date & Time Slot */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-sky-500 font-medium"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Time Slot</label>
                <select
                  value={selectedSlot}
                  onChange={(e) => setSelectedSlot(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-sky-500 font-medium"
                >
                  {timeSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Symptoms */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Reason for Visit / Symptoms</label>
              <textarea
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                rows={2}
                placeholder="e.g. Fever, persistent cough, chest discomfort..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-sky-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm shadow-md shadow-sky-600/30 transition cursor-pointer"
              >
                {isSubmitting ? 'Confirming...' : 'Confirm Appointment'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
