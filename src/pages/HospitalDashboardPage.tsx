import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Hospital,
  BedCategory,
  Doctor,
  Nurse,
  Department,
  Ambulance,
  ResourceItem,
  EmergencyRequest,
  Appointment,
  TransferRequest,
} from '../types';
import {
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Stethoscope,
  Users,
  BedDouble,
  Activity,
  Truck,
  Building,
  Calendar,
  Phone,
  ShieldAlert,
  ArrowRightLeft,
} from 'lucide-react';

export const HospitalDashboardPage: React.FC = () => {
  const { user } = useAuth();
  // Allow switching hospital for admin inspection / demo hospitals H001..H005
  const [currentHospitalId, setCurrentHospitalId] = useState<string>(
    user?.hospital_id || 'H001'
  );

  const [activeTab, setActiveTab] = useState<
    'doctors' | 'nurses' | 'beds' | 'oxygen' | 'ambulances' | 'emergency' | 'appointments' | 'departments'
  >('doctors');

  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [beds, setBeds] = useState<BedCategory[]>([]);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [emergencyReqs, setEmergencyReqs] = useState<EmergencyRequest[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentStatusFilter, setAppointmentStatusFilter] = useState<string>('all');
  const [transfers, setTransfers] = useState<TransferRequest[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Form states - Beds
  const [bedForm, setBedForm] = useState({
    total_beds: 200,
    available_beds: 22,
    icu_beds: 4,
    emergency_beds: 5,
    isolation_beds: 2,
  });

  // Form states - Oxygen
  const [oxygenForm, setOxygenForm] = useState({
    total_oxygen: 150,
    available_oxygen: 45,
    status: 'Limited' as 'Good' | 'Limited' | 'Low' | 'Critical',
  });

  // Form states - Doctors
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [doctorForm, setDoctorForm] = useState({
    name: '',
    specialization: '',
    department: 'General Medicine',
    phone: '',
    status: 'Available' as 'Available' | 'Busy' | 'On Leave' | 'Off Duty',
  });

  // Form states - Nurses
  const [showAddNurse, setShowAddNurse] = useState(false);
  const [editingNurse, setEditingNurse] = useState<Nurse | null>(null);
  const [nurseForm, setNurseForm] = useState({
    name: '',
    department: 'General Ward',
    phone: '',
    status: 'Available' as 'Available' | 'On Duty' | 'On Leave' | 'Off Duty',
  });

  // Form states - Ambulances
  const [showAddAmbulance, setShowAddAmbulance] = useState(false);
  const [editingAmbulance, setEditingAmbulance] = useState<Ambulance | null>(null);
  const [ambulanceForm, setAmbulanceForm] = useState({
    ambulance_id: '',
    driver_name: '',
    phone: '',
    status: 'Available' as 'Available' | 'On Trip' | 'Maintenance',
  });

  useEffect(() => {
    loadHospitalData();
    const interval = setInterval(loadHospitalData, 3500);
    return () => clearInterval(interval);
  }, [currentHospitalId]);

  const loadHospitalData = async () => {
    try {
      const [hospData, bedData, resData, docData, nurseData, deptData, ambData, emData, apptData, transferData] =
        await Promise.all([
          api.hospitals.getById(currentHospitalId),
          api.beds.get(currentHospitalId),
          api.resources.get(currentHospitalId),
          api.doctors.get(currentHospitalId),
          api.nurses.get(currentHospitalId),
          api.departments.get(currentHospitalId),
          api.ambulances.get(currentHospitalId),
          api.emergency.get(),
          api.appointments.get({ hospitalId: currentHospitalId }),
          api.transfers.get().catch(() => []),
        ]);

      setHospital(hospData);
      setBeds(bedData);
      setResources(resData);
      setDoctors(docData);
      setNurses(nurseData);
      setDepartments(deptData);
      setAmbulances(ambData);
      setEmergencyReqs(emData.filter((r) => r.target_hospital_ids?.includes(currentHospitalId)));
      // Filter appointments belonging ONLY to this hospital
      setAppointments(
        apptData.filter(
          (a) => (a.hospitalId || a.hospital_id) === currentHospitalId
        )
      );
      setTransfers(transferData || []);

      // Sync Bed Form
      const icu = bedData.find((b) => b.category === 'ICU Beds')?.available ?? hospData.overview?.icu_beds ?? 4;
      const emBed = bedData.find((b) => b.category === 'Emergency Beds')?.available ?? hospData.overview?.emergency_beds ?? 5;
      const isoBed = bedData.find((b) => b.category === 'Isolation Beds')?.available ?? hospData.overview?.isolation_beds ?? 2;
      const totalB = hospData.overview?.total_beds ?? 200;
      const availB = hospData.overview?.available_beds ?? 22;

      setBedForm({
        total_beds: totalB,
        available_beds: availB,
        icu_beds: icu,
        emergency_beds: emBed,
        isolation_beds: isoBed,
      });

      // Sync Oxygen Form
      const oxy = resData.find((r) => r.resource_type === 'oxygen_cylinders');
      const oxyStock = oxy ? oxy.current_stock : (hospData.overview?.oxygen_cylinders ?? 45);
      const oxyTotal = (oxy as any)?.total_stock ?? (hospData.overview?.total_oxygen ?? 150);
      let oxyStat = (oxy as any)?.status || hospData.overview?.oxygen_status;
      if (!oxyStat) {
        oxyStat = oxyStock <= 30 ? 'Critical' : oxyStock <= 60 ? 'Low' : oxyStock <= 100 ? 'Limited' : 'Good';
      }

      setOxygenForm({
        total_oxygen: oxyTotal,
        available_oxygen: oxyStock,
        status: (['Good', 'Limited', 'Low', 'Critical'].includes(oxyStat) ? oxyStat : 'Limited') as any,
      });
    } catch (e) {
      console.warn('Dashboard fetch error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(''), 4000);
  };

  // ==========================================
  // 1. DOCTOR MANAGEMENT CRUD
  // ==========================================
  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorForm.name.trim()) return;
    try {
      await api.doctors.create({
        hospital_id: currentHospitalId,
        name: doctorForm.name.trim(),
        specialization: doctorForm.specialization.trim() || 'General Physician',
        department: doctorForm.department,
        phone: doctorForm.phone.trim(),
        status: doctorForm.status,
      });
      setShowAddDoctor(false);
      setDoctorForm({ name: '', specialization: '', department: 'General Medicine', phone: '', status: 'Available' });
      showToast('Doctor availability updated successfully.');
      loadHospitalData();
    } catch (err: any) {
      alert(err.message || 'Failed to add doctor');
    }
  };

  const handleUpdateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoctor?._id) return;
    try {
      await api.doctors.update(editingDoctor._id, {
        name: editingDoctor.name.trim(),
        specialization: editingDoctor.specialization.trim(),
        department: editingDoctor.department,
        phone: editingDoctor.phone,
        status: editingDoctor.status,
      });
      setEditingDoctor(null);
      showToast('Doctor availability updated successfully.');
      loadHospitalData();
    } catch (err: any) {
      alert(err.message || 'Failed to update doctor');
    }
  };

  const handleDoctorStatusChange = async (docId: string, newStatus: string) => {
    try {
      await api.doctors.update(docId, { status: newStatus });
      showToast('Doctor availability updated successfully.');
      loadHospitalData();
    } catch (err: any) {
      alert(err.message || 'Failed to change doctor status');
    }
  };

  const handleDeleteDoctor = async (docId: string) => {
    if (!window.confirm('Delete doctor record from database?')) return;
    try {
      await api.doctors.delete(docId);
      showToast('Doctor record removed successfully.');
      loadHospitalData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete doctor');
    }
  };

  // ==========================================
  // 2. NURSE MANAGEMENT CRUD
  // ==========================================
  const handleAddNurse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nurseForm.name.trim()) return;
    try {
      await api.nurses.create({
        hospital_id: currentHospitalId,
        name: nurseForm.name.trim(),
        department: nurseForm.department,
        phone: nurseForm.phone.trim(),
        status: nurseForm.status,
      });
      setShowAddNurse(false);
      setNurseForm({ name: '', department: 'General Ward', phone: '', status: 'Available' });
      showToast('Nurse availability updated successfully.');
      loadHospitalData();
    } catch (err: any) {
      alert(err.message || 'Failed to add nurse');
    }
  };

  const handleUpdateNurse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNurse?._id) return;
    try {
      await api.nurses.update(editingNurse._id, {
        name: editingNurse.name.trim(),
        department: editingNurse.department,
        phone: editingNurse.phone,
        status: editingNurse.status,
      });
      setEditingNurse(null);
      showToast('Nurse availability updated successfully.');
      loadHospitalData();
    } catch (err: any) {
      alert(err.message || 'Failed to update nurse');
    }
  };

  const handleNurseStatusChange = async (nurseId: string, newStatus: string) => {
    try {
      await api.nurses.update(nurseId, { status: newStatus });
      showToast('Nurse availability updated successfully.');
      loadHospitalData();
    } catch (err: any) {
      alert(err.message || 'Failed to update nurse status');
    }
  };

  const handleDeleteNurse = async (nurseId: string) => {
    if (!window.confirm('Delete nurse record from database?')) return;
    try {
      await api.nurses.delete(nurseId);
      showToast('Nurse record removed successfully.');
      loadHospitalData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete nurse');
    }
  };

  // ==========================================
  // 3. BED AVAILABILITY CRUD
  // ==========================================
  const handleSaveBeds = async (e: React.FormEvent) => {
    e.preventDefault();
    const { total_beds, available_beds, icu_beds, emergency_beds, isolation_beds } = bedForm;
    if (available_beds > total_beds) {
      alert('Available beds cannot exceed Total Beds.');
      return;
    }

    try {
      // Calculate category breakdown
      const otherBedsAvail = Math.max(0, available_beds - (icu_beds + emergency_beds + isolation_beds));
      const otherBedsTotal = Math.max(0, total_beds - (icu_beds + emergency_beds + isolation_beds));

      const updatedBeds = [
        {
          category: 'General Beds',
          total: otherBedsTotal,
          available: otherBedsAvail,
          occupied: Math.max(0, otherBedsTotal - otherBedsAvail),
        },
        {
          category: 'ICU Beds',
          total: icu_beds + 4,
          available: icu_beds,
          occupied: 4,
        },
        {
          category: 'Emergency Beds',
          total: emergency_beds + 2,
          available: emergency_beds,
          occupied: 2,
        },
        {
          category: 'Isolation Beds',
          total: isolation_beds + 1,
          available: isolation_beds,
          occupied: 1,
        },
      ];

      await api.beds.update(currentHospitalId, { beds: updatedBeds });
      showToast(`Bed availability updated successfully. Available Beds now set to ${available_beds}.`);
      loadHospitalData();
    } catch (err: any) {
      alert(err.message || 'Failed to update beds in MongoDB');
    }
  };

  // ==========================================
  // 4. OXYGEN AVAILABILITY CRUD
  // ==========================================
  const handleSaveOxygen = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.resources.update(currentHospitalId, {
        resource_type: 'oxygen_cylinders',
        available_oxygen: oxygenForm.available_oxygen,
        total_oxygen: oxygenForm.total_oxygen,
        status: oxygenForm.status,
      });
      showToast(`Oxygen availability updated successfully. Available: ${oxygenForm.available_oxygen}, Status: ${oxygenForm.status}`);
      loadHospitalData();
    } catch (err: any) {
      alert(err.message || 'Failed to update oxygen');
    }
  };

  // ==========================================
  // 5. AMBULANCE MANAGEMENT CRUD
  // ==========================================
  const handleAddAmbulance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ambulanceForm.ambulance_id.trim()) return;
    try {
      await api.ambulances.create({
        hospital_id: currentHospitalId,
        ambulance_id: ambulanceForm.ambulance_id.trim(),
        driver_name: ambulanceForm.driver_name.trim() || 'Duty Driver',
        phone: ambulanceForm.phone.trim(),
        status: ambulanceForm.status,
      });
      setShowAddAmbulance(false);
      setAmbulanceForm({ ambulance_id: '', driver_name: '', phone: '', status: 'Available' });
      showToast('Ambulance registered successfully.');
      loadHospitalData();
    } catch (err: any) {
      alert(err.message || 'Failed to register ambulance');
    }
  };

  const handleUpdateAmbulance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAmbulance?._id) return;
    try {
      await api.ambulances.update(editingAmbulance._id, {
        ambulance_id: editingAmbulance.ambulance_id.trim(),
        driver_name: editingAmbulance.driver_name.trim(),
        phone: editingAmbulance.phone,
        status: editingAmbulance.status,
      });
      setEditingAmbulance(null);
      showToast('Ambulance availability updated successfully.');
      loadHospitalData();
    } catch (err: any) {
      alert(err.message || 'Failed to update ambulance');
    }
  };

  const handleAmbulanceStatusChange = async (ambId: string, newStatus: string) => {
    try {
      await api.ambulances.update(ambId, { status: newStatus });
      showToast(`Ambulance status changed to ${newStatus}.`);
      loadHospitalData();
    } catch (err: any) {
      alert(err.message || 'Failed to update ambulance status');
    }
  };

  const handleDeleteAmbulance = async (ambId: string) => {
    if (!window.confirm('Delete ambulance vehicle from database?')) return;
    try {
      await api.ambulances.delete(ambId);
      showToast('Ambulance record removed successfully.');
      loadHospitalData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete ambulance');
    }
  };

  // ==========================================
  // 6. EMERGENCY RESPONSES CRUD
  // ==========================================
  const handleEmergencyAction = async (reqId: string, status: string) => {
    try {
      await api.emergency.respond(reqId, {
        status,
        hospital_id: currentHospitalId,
        responder_note: status === 'accepted' ? 'Bed & emergency medical team ready.' : 'No immediate capacity.',
      });
      showToast(`Emergency request marked ${status.toUpperCase()}.`);
      loadHospitalData();
    } catch (err: any) {
      alert(err.message || 'Failed to respond to emergency');
    }
  };

  // ==========================================
  // 7. APPOINTMENTS CRUD
  // ==========================================
  const handleAppointmentStatus = async (apptId: string, newStatus: string) => {
    try {
      await api.appointments.update(apptId, newStatus);
      showToast(`Appointment status updated to ${newStatus.toUpperCase()}.`);
      loadHospitalData();
    } catch (err: any) {
      alert(err.message || 'Failed to update appointment');
    }
  };

  // ==========================================
  // 8. DEPARTMENTS CRUD
  // ==========================================
  const handleDepartmentStatus = async (deptId: string, newStatus: string) => {
    try {
      await api.departments.update(deptId, { status: newStatus });
      showToast(`Department status updated to ${newStatus}.`);
      loadHospitalData();
    } catch (err: any) {
      alert(err.message || 'Failed to update department');
    }
  };

  // Attention Needed Condition Checks
  const oxyVal = hospital?.overview?.oxygen_cylinders ?? oxygenForm.available_oxygen;
  const icuVal = hospital?.overview?.icu_beds ?? bedForm.icu_beds;
  const availDocs = doctors.filter((d) => (d.status || '').toLowerCase() === 'available').length;
  const availNurses = nurses.filter((n) => ['available', 'on duty', 'on_duty'].includes((n.status || '').toLowerCase())).length;
  const availAmbs = ambulances.filter((a) => (a.status || '').toLowerCase() === 'available').length;
  const pendingEmergency = emergencyReqs.filter((r) => r.hospital_responses?.[currentHospitalId]?.status === 'pending').length;
  const pendingTransfers = transfers.filter((t) => t.status === 'requested' && t.to_hospital_id === currentHospitalId).length;

  const attentionItems: { label: string; desc: string; type: 'red' | 'orange' | 'amber' }[] = [];

  if (oxyVal <= 30 || oxygenForm.status === 'Critical' || oxygenForm.status === 'Low') {
    attentionItems.push({
      label: 'Low Oxygen Alert',
      desc: `Current available oxygen is ${oxyVal} cylinders (Status: ${oxygenForm.status}). Re-supply recommended.`,
      type: 'red',
    });
  }

  if (icuVal <= 2) {
    attentionItems.push({
      label: 'Low ICU Beds',
      desc: `Only ${icuVal} ICU beds currently unoccupied. Critical patient capacity limited.`,
      type: 'red',
    });
  }

  if (pendingEmergency > 0) {
    attentionItems.push({
      label: 'Pending Emergency Requests',
      desc: `${pendingEmergency} incoming emergency patient admission request(s) waiting for response.`,
      type: 'red',
    });
  }

  if (pendingTransfers > 0) {
    attentionItems.push({
      label: 'Pending Transfer Requests',
      desc: `${pendingTransfers} cross-hospital resource transfer request(s) awaiting authorization.`,
      type: 'orange',
    });
  }

  if (availDocs <= 2 && doctors.length > 0) {
    attentionItems.push({
      label: 'Doctor Shortage',
      desc: `Only ${availDocs} specialist doctor(s) marked Available out of ${doctors.length} staff.`,
      type: 'orange',
    });
  }

  if (availNurses <= 4 && nurses.length > 0) {
    attentionItems.push({
      label: 'Nurse Shortage',
      desc: `Only ${availNurses} nurse(s) currently on duty out of ${nurses.length} total staff.`,
      type: 'amber',
    });
  }

  if (availAmbs === 0 && ambulances.length > 0) {
    attentionItems.push({
      label: 'No Ambulance Available',
      desc: `All ${ambulances.length} hospital ambulances are currently on trips or under maintenance.`,
      type: 'red',
    });
  }

  // Hospital Dashboard Summary Counts (Computed live from MongoDB records for this hospital)
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayApptsCount = appointments.filter(
    (a) => (a.appointmentDate || a.date) === todayDateStr
  ).length;
  const pendingApptsCount = appointments.filter(
    (a) => (a.status || '').toLowerCase() === 'pending'
  ).length;
  const approvedApptsCount = appointments.filter(
    (a) => ['approved', 'confirmed'].includes((a.status || '').toLowerCase())
  ).length;
  const completedApptsCount = appointments.filter(
    (a) => (a.status || '').toLowerCase() === 'completed'
  ).length;
  const cancelledApptsCount = appointments.filter(
    (a) => (a.status || '').toLowerCase() === 'cancelled'
  ).length;
  const rejectedApptsCount = appointments.filter(
    (a) => (a.status || '').toLowerCase() === 'rejected'
  ).length;
  const emergencyReqsCount = emergencyReqs.length;
  const resourceReqsCount = transfers.filter(
    (t) => t.to_hospital_id === currentHospitalId || t.from_hospital_id === currentHospitalId
  ).length;

  return (
    <div className="space-y-6 pb-20 max-w-6xl mx-auto font-sans">
      {/* Hospital Identity & Admin Selector Header */}
      <div className="bg-[#0f2b48] text-white rounded-2xl p-5 shadow-md border-b-4 border-emerald-600">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2 py-0.5 rounded bg-white/20 text-xs font-mono font-bold">
                {currentHospitalId}
              </span>
              <span className="text-slate-200 text-xs">
                Location: {hospital?.area || 'Chennai'}, Chennai
              </span>
              <span className="px-2.5 py-0.5 rounded bg-emerald-600 text-white text-xs font-bold uppercase tracking-wide">
                HOSPITAL ADMIN CONSOLE
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              {hospital?.name || 'Hospital Administration'}
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">{hospital?.address}</p>
          </div>

          {/* Demo Hospital Switcher */}
          <div className="bg-white/10 p-2.5 rounded-xl border border-white/20 flex flex-col gap-1 text-xs">
            <span className="text-slate-300 font-bold uppercase tracking-wider text-[10px]">
              Switch Hospital Hub:
            </span>
            <select
              value={currentHospitalId}
              onChange={(e) => setCurrentHospitalId(e.target.value)}
              className="bg-white text-slate-900 px-3 py-1.5 rounded-lg font-bold text-xs focus:outline-none"
            >
              <option value="H001">H001 - Chennai Central Hospital</option>
              <option value="H002">H002 - Anna Nagar Hospital</option>
              <option value="H003">H003 - Adyar Hospital</option>
              <option value="H004">H004 - Velachery Hospital</option>
              <option value="H005">H005 - Tambaram Hospital</option>
            </select>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="pt-4 mt-4 border-t border-slate-700/80 flex overflow-x-auto gap-1 text-xs no-scrollbar">
          {[
            { id: 'doctors', label: `Doctors (${doctors.length})` },
            { id: 'nurses', label: `Nurses (${nurses.length})` },
            { id: 'beds', label: 'Beds' },
            { id: 'oxygen', label: 'Oxygen' },
            { id: 'ambulances', label: `Ambulances (${ambulances.length})` },
            { id: 'emergency', label: `Emergency Requests (${emergencyReqs.length})` },
            { id: 'appointments', label: `Appointments (${appointments.length})` },
            { id: 'departments', label: 'Departments' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-lg whitespace-nowrap transition cursor-pointer font-bold ${
                activeTab === tab.id
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Success Notification Banner */}
      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* HOSPITAL DASHBOARD SUMMARY (MONGODB LIVE METRICS) */}
      {/* ========================================================= */}
      <div className="bg-white rounded-2xl border border-slate-300 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div>
            <h2 className="font-bold text-base text-[#0f2b48] tracking-tight uppercase flex items-center gap-2">
              <Activity className="w-5 h-5 text-sky-600" />
              <span>HOSPITAL DASHBOARD SUMMARY</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live database counts for <strong>{hospital?.name || currentHospitalId}</strong>
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
            ● MongoDB Live
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Today's Appointments */}
          <div
            onClick={() => setActiveTab('appointments')}
            className="p-3.5 bg-slate-50 hover:bg-sky-50/50 rounded-xl border border-slate-200 hover:border-sky-300 transition cursor-pointer text-center"
          >
            <span className="text-slate-500 text-xs block mb-1 font-medium">Today&apos;s Appointments</span>
            <strong className="text-2xl text-slate-900 font-extrabold block">{todayApptsCount}</strong>
            <span className="text-[11px] text-sky-600 font-semibold block mt-1">Scheduled Today</span>
          </div>

          {/* Pending Appointments */}
          <div
            onClick={() => setActiveTab('appointments')}
            className="p-3.5 bg-amber-50/60 hover:bg-amber-100/60 rounded-xl border border-amber-200 transition cursor-pointer text-center"
          >
            <span className="text-amber-800 text-xs block mb-1 font-medium">Pending Appointments</span>
            <strong className="text-2xl text-amber-700 font-extrabold block">{pendingApptsCount}</strong>
            <span className="text-[11px] text-amber-600 font-semibold block mt-1">Awaiting Review</span>
          </div>

          {/* Approved Appointments */}
          <div
            onClick={() => setActiveTab('appointments')}
            className="p-3.5 bg-emerald-50/60 hover:bg-emerald-100/60 rounded-xl border border-emerald-200 transition cursor-pointer text-center"
          >
            <span className="text-emerald-800 text-xs block mb-1 font-medium">Approved Appointments</span>
            <strong className="text-2xl text-emerald-700 font-extrabold block">{approvedApptsCount}</strong>
            <span className="text-[11px] text-emerald-600 font-semibold block mt-1">Confirmed / Active</span>
          </div>

          {/* Emergency Requests */}
          <div
            onClick={() => setActiveTab('emergency')}
            className="p-3.5 bg-rose-50/60 hover:bg-rose-100/60 rounded-xl border border-rose-200 transition cursor-pointer text-center"
          >
            <span className="text-rose-800 text-xs block mb-1 font-medium">Emergency Requests</span>
            <strong className="text-2xl text-rose-700 font-extrabold block">{emergencyReqsCount}</strong>
            <span className="text-[11px] text-rose-600 font-semibold block mt-1">Admissions</span>
          </div>

          {/* Resource Requests */}
          <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-200 text-center">
            <span className="text-indigo-800 text-xs block mb-1 font-medium">Resource Requests</span>
            <strong className="text-2xl text-indigo-700 font-extrabold block">{resourceReqsCount}</strong>
            <span className="text-[11px] text-indigo-600 font-semibold block mt-1">Cross-Hospital</span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SECTION 1: ATTENTION NEEDED */}
      {/* ========================================================= */}
      <div className="bg-white rounded-2xl border border-slate-300 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h2 className="font-bold text-base text-[#0f2b48] tracking-tight uppercase flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            <span>ATTENTION NEEDED</span>
          </h2>
          <span className="text-xs text-slate-500">
            Automatic real-time condition monitor
          </span>
        </div>

        {attentionItems.length === 0 ? (
          <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>All hospital resources operating within safe operational levels.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {attentionItems.map((item, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                  item.type === 'red'
                    ? 'bg-red-50 border-red-300 text-red-900'
                    : item.type === 'orange'
                    ? 'bg-orange-50 border-orange-300 text-orange-900'
                    : 'bg-amber-50 border-amber-300 text-amber-900'
                }`}
              >
                <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                  item.type === 'red' ? 'text-red-600' : 'text-orange-600'
                }`} />
                <div>
                  <strong className="font-bold block uppercase tracking-wide text-[11px]">
                    {item.label}
                  </strong>
                  <p className="mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* SECTION 2: RESOURCE SUMMARY */}
      {/* ========================================================= */}
      <div className="bg-slate-50 rounded-2xl border border-slate-300 p-5 shadow-xs space-y-3">
        <div className="border-b border-slate-200 pb-2">
          <h2 className="font-bold text-sm text-[#0f2b48] tracking-tight uppercase">
            Resource Summary (MongoDB Live)
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center text-xs">
          {/* Beds */}
          <div className="p-3 bg-white rounded-lg border border-slate-200">
            <span className="text-slate-500 block mb-0.5">Beds</span>
            <strong className="text-lg text-slate-900 font-bold block">
              {hospital?.overview?.available_beds ?? bedForm.available_beds}
            </strong>
            <span className="text-emerald-700 font-bold block text-[11px]">Available</span>
            <span className="text-slate-400 block text-[10px]">
              of {hospital?.overview?.total_beds ?? bedForm.total_beds} Total
            </span>
          </div>

          {/* ICU */}
          <div className="p-3 bg-white rounded-lg border border-slate-200">
            <span className="text-slate-500 block mb-0.5">ICU Beds</span>
            <strong className="text-lg text-slate-900 font-bold block">
              {hospital?.overview?.icu_beds ?? bedForm.icu_beds}
            </strong>
            <span className="text-emerald-700 font-bold block text-[11px]">Available</span>
            <span className="text-slate-400 block text-[10px]">Critical Ready</span>
          </div>

          {/* Oxygen */}
          <div className="p-3 bg-white rounded-lg border border-slate-200">
            <span className="text-slate-500 block mb-0.5">Oxygen</span>
            <strong className={`text-lg font-bold block ${
              (hospital?.overview?.oxygen_cylinders ?? oxygenForm.available_oxygen) <= 30
                ? 'text-red-600'
                : 'text-slate-900'
            }`}>
              {hospital?.overview?.oxygen_cylinders ?? oxygenForm.available_oxygen}
            </strong>
            <span className="text-emerald-700 font-bold block text-[11px]">Cylinders</span>
            <span className={`text-[10px] font-bold block ${
              (hospital?.overview?.oxygen_status || oxygenForm.status) === 'Critical'
                ? 'text-red-600'
                : (hospital?.overview?.oxygen_status || oxygenForm.status) === 'Low'
                ? 'text-orange-600'
                : (hospital?.overview?.oxygen_status || oxygenForm.status) === 'Limited'
                ? 'text-amber-600'
                : 'text-emerald-700'
            }`}>
              Status: {hospital?.overview?.oxygen_status || oxygenForm.status}
            </span>
          </div>

          {/* Doctors */}
          <div className="p-3 bg-white rounded-lg border border-slate-200">
            <span className="text-slate-500 block mb-0.5">Doctors</span>
            <strong className="text-lg text-slate-900 font-bold block">
              {availDocs}
            </strong>
            <span className="text-emerald-700 font-bold block text-[11px]">Available</span>
            <span className="text-slate-400 block text-[10px]">
              of {doctors.length} Total
            </span>
          </div>

          {/* Nurses */}
          <div className="p-3 bg-white rounded-lg border border-slate-200">
            <span className="text-slate-500 block mb-0.5">Nurses</span>
            <strong className="text-lg text-slate-900 font-bold block">
              {availNurses}
            </strong>
            <span className="text-emerald-700 font-bold block text-[11px]">On Duty</span>
            <span className="text-slate-400 block text-[10px]">
              of {nurses.length} Total
            </span>
          </div>

          {/* Ambulances */}
          <div className="p-3 bg-white rounded-lg border border-slate-200">
            <span className="text-slate-500 block mb-0.5">Ambulances</span>
            <strong className={`text-lg font-bold block ${
              availAmbs === 0 ? 'text-red-600' : 'text-slate-900'
            }`}>
              {availAmbs}
            </strong>
            <span className="text-emerald-700 font-bold block text-[11px]">Available</span>
            <span className="text-slate-400 block text-[10px]">
              of {ambulances.length} Fleet
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SECTION 3: DETAILED MANAGEMENT PAGES */}
      {/* ========================================================= */}

      {/* TAB 1: DOCTOR MANAGEMENT */}
      {activeTab === 'doctors' && (
        <div className="bg-white rounded-2xl border border-slate-300 p-5 shadow-xs space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="font-bold text-base text-[#0f2b48]">Doctor Management</h3>
              <p className="text-slate-500 mt-0.5">
                Add, edit, remove doctors, and update availability status in MongoDB.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingDoctor(null);
                setShowAddDoctor(!showAddDoctor);
              }}
              className="px-3.5 py-2 rounded-lg bg-[#0f2b48] hover:bg-[#1a3d60] text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Doctor</span>
            </button>
          </div>

          {/* Add Doctor Form */}
          {showAddDoctor && (
            <form onSubmit={handleAddDoctor} className="p-4 bg-slate-50 rounded-xl border border-slate-300 space-y-3">
              <h4 className="font-bold text-slate-800 text-sm">Add New Doctor</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 font-bold">Doctor Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Priya Soundararajan"
                    value={doctorForm.name}
                    onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-bold">Specialization *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pulmonologist / Cardiologist"
                    value={doctorForm.specialization}
                    onChange={(e) => setDoctorForm({ ...doctorForm, specialization: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-bold">Department</label>
                  <select
                    value={doctorForm.department}
                    onChange={(e) => setDoctorForm({ ...doctorForm, department: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="Emergency & Trauma">Emergency & Trauma</option>
                    <option value="General Medicine">General Medicine</option>
                    <option value="Pulmonology">Pulmonology</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Intensive Care Unit (ICU)">Intensive Care Unit (ICU)</option>
                    <option value="Pediatrics">Pediatrics</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-bold">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98401 23456"
                    value={doctorForm.phone}
                    onChange={(e) => setDoctorForm({ ...doctorForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-bold">Initial Status</label>
                  <select
                    value={doctorForm.status}
                    onChange={(e) => setDoctorForm({ ...doctorForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="Available">Available</option>
                    <option value="Busy">Busy</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Off Duty">Off Duty</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg cursor-pointer"
                >
                  Save Doctor
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddDoctor(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Edit Doctor Modal / Form */}
          {editingDoctor && (
            <form onSubmit={handleUpdateDoctor} className="p-4 bg-amber-50/70 rounded-xl border border-amber-300 space-y-3">
              <h4 className="font-bold text-slate-800 text-sm">Edit Doctor: {editingDoctor.name}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 font-bold">Doctor Name</label>
                  <input
                    type="text"
                    required
                    value={editingDoctor.name}
                    onChange={(e) => setEditingDoctor({ ...editingDoctor, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-bold">Specialization</label>
                  <input
                    type="text"
                    required
                    value={editingDoctor.specialization}
                    onChange={(e) => setEditingDoctor({ ...editingDoctor, specialization: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-bold">Department</label>
                  <input
                    type="text"
                    value={editingDoctor.department}
                    onChange={(e) => setEditingDoctor({ ...editingDoctor, department: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-bold">Phone Number</label>
                  <input
                    type="text"
                    value={editingDoctor.phone || ''}
                    onChange={(e) => setEditingDoctor({ ...editingDoctor, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-bold">Status</label>
                  <select
                    value={editingDoctor.status}
                    onChange={(e) => setEditingDoctor({ ...editingDoctor, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="Available">Available</option>
                    <option value="Busy">Busy</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Off Duty">Off Duty</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg cursor-pointer"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingDoctor(null)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Doctor Directory Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3">Doctor Name</th>
                  <th className="p-3">Specialization</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {doctors.map((doc) => (
                  <tr key={doc._id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">{doc.name}</td>
                    <td className="p-3 text-slate-700">{doc.specialization}</td>
                    <td className="p-3 text-slate-600">{doc.department}</td>
                    <td className="p-3 text-slate-600">{doc.phone || '—'}</td>
                    <td className="p-3">
                      <select
                        value={
                          ['Available', 'available'].includes(doc.status)
                            ? 'Available'
                            : ['Busy', 'busy'].includes(doc.status)
                            ? 'Busy'
                            : ['On Leave', 'on_leave'].includes(doc.status)
                            ? 'On Leave'
                            : 'Off Duty'
                        }
                        onChange={(e) => handleDoctorStatusChange(doc._id!, e.target.value)}
                        className={`px-2.5 py-1 rounded text-xs font-bold border ${
                          ['Available', 'available'].includes(doc.status)
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : ['Busy', 'busy'].includes(doc.status)
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}
                      >
                        <option value="Available">Available</option>
                        <option value="Busy">Busy</option>
                        <option value="On Leave">On Leave</option>
                        <option value="Off Duty">Off Duty</option>
                      </select>
                    </td>
                    <td className="p-3 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => setEditingDoctor(doc)}
                        className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteDoctor(doc._id!)}
                        className="px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: NURSE MANAGEMENT */}
      {activeTab === 'nurses' && (
        <div className="bg-white rounded-2xl border border-slate-300 p-5 shadow-xs space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="font-bold text-base text-[#0f2b48]">Nurse Management</h3>
              <p className="text-slate-500 mt-0.5">
                Add, edit, remove nurses, and update shift duty status in MongoDB.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingNurse(null);
                setShowAddNurse(!showAddNurse);
              }}
              className="px-3.5 py-2 rounded-lg bg-[#0f2b48] hover:bg-[#1a3d60] text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Nurse</span>
            </button>
          </div>

          {/* Add Nurse Form */}
          {showAddNurse && (
            <form onSubmit={handleAddNurse} className="p-4 bg-slate-50 rounded-xl border border-slate-300 space-y-3">
              <h4 className="font-bold text-slate-800 text-sm">Add New Nurse</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 font-bold">Nurse Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Nurse Priya"
                    value={nurseForm.name}
                    onChange={(e) => setNurseForm({ ...nurseForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-bold">Department</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ICU Ward / Emergency"
                    value={nurseForm.department}
                    onChange={(e) => setNurseForm({ ...nurseForm, department: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-bold">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98402 34567"
                    value={nurseForm.phone}
                    onChange={(e) => setNurseForm({ ...nurseForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-bold">Status</label>
                  <select
                    value={nurseForm.status}
                    onChange={(e) => setNurseForm({ ...nurseForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="Available">Available</option>
                    <option value="On Duty">On Duty</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Off Duty">Off Duty</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg cursor-pointer"
                >
                  Save Nurse
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddNurse(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Edit Nurse Form */}
          {editingNurse && (
            <form onSubmit={handleUpdateNurse} className="p-4 bg-amber-50/70 rounded-xl border border-amber-300 space-y-3">
              <h4 className="font-bold text-slate-800 text-sm">Edit Nurse: {editingNurse.name}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 font-bold">Nurse Name</label>
                  <input
                    type="text"
                    required
                    value={editingNurse.name}
                    onChange={(e) => setEditingNurse({ ...editingNurse, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-bold">Department</label>
                  <input
                    type="text"
                    required
                    value={editingNurse.department}
                    onChange={(e) => setEditingNurse({ ...editingNurse, department: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-bold">Phone Number</label>
                  <input
                    type="text"
                    value={editingNurse.phone || ''}
                    onChange={(e) => setEditingNurse({ ...editingNurse, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-bold">Status</label>
                  <select
                    value={editingNurse.status}
                    onChange={(e) => setEditingNurse({ ...editingNurse, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="Available">Available</option>
                    <option value="On Duty">On Duty</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Off Duty">Off Duty</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg cursor-pointer"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingNurse(null)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Nurse Directory Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3">Nurse Name</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {nurses.map((nurse) => (
                  <tr key={nurse._id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">{nurse.name}</td>
                    <td className="p-3 text-slate-700">{nurse.department}</td>
                    <td className="p-3 text-slate-600">{nurse.phone || '—'}</td>
                    <td className="p-3">
                      <select
                        value={
                          ['Available', 'available'].includes(nurse.status)
                            ? 'Available'
                            : ['On Duty', 'on_duty'].includes(nurse.status)
                            ? 'On Duty'
                            : ['On Leave', 'on_leave'].includes(nurse.status)
                            ? 'On Leave'
                            : 'Off Duty'
                        }
                        onChange={(e) => handleNurseStatusChange(nurse._id!, e.target.value)}
                        className={`px-2.5 py-1 rounded text-xs font-bold border ${
                          ['Available', 'available'].includes(nurse.status)
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : ['On Duty', 'on_duty'].includes(nurse.status)
                            ? 'bg-sky-50 text-sky-800 border-sky-300'
                            : ['On Leave', 'on_leave'].includes(nurse.status)
                            ? 'bg-slate-100 text-slate-700 border-slate-300'
                            : 'bg-slate-100 text-slate-600 border-slate-300'
                        }`}
                      >
                        <option value="Available">Available</option>
                        <option value="On Duty">On Duty</option>
                        <option value="On Leave">On Leave</option>
                        <option value="Off Duty">Off Duty</option>
                      </select>
                    </td>
                    <td className="p-3 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => setEditingNurse(nurse)}
                        className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteNurse(nurse._id!)}
                        className="px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: BED AVAILABILITY */}
      {activeTab === 'beds' && (
        <div className="bg-white rounded-2xl border border-slate-300 p-5 shadow-xs space-y-4 text-xs">
          <div className="border-b border-slate-200 pb-3">
            <h3 className="font-bold text-base text-[#0f2b48]">Bed Inventory Management</h3>
            <p className="text-slate-500 mt-0.5">
              Edit Total Beds, Available Beds, ICU Beds, Emergency Beds, and Isolation Beds. Immediately synced to patient view.
            </p>
          </div>

          <form onSubmit={handleSaveBeds} className="max-w-xl space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 mb-1 font-bold">Total Hospital Beds</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={bedForm.total_beds}
                  onChange={(e) => setBedForm({ ...bedForm, total_beds: parseInt(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-bold">
                  Available Beds (Total Unoccupied) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={bedForm.available_beds}
                  onChange={(e) => setBedForm({ ...bedForm, available_beds: parseInt(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-emerald-500 rounded-lg font-bold text-sm text-emerald-800"
                />
                <span className="text-[11px] text-slate-500 block mt-1">
                  Example: change 30 &rarr; 18, patient sees 18 Beds Available immediately.
                </span>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-bold">ICU Beds (Available)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={bedForm.icu_beds}
                  onChange={(e) => setBedForm({ ...bedForm, icu_beds: parseInt(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-bold">Emergency Beds (Available)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={bedForm.emergency_beds}
                  onChange={(e) => setBedForm({ ...bedForm, emergency_beds: parseInt(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-bold">Isolation Beds (Available)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={bedForm.isolation_beds}
                  onChange={(e) => setBedForm({ ...bedForm, isolation_beds: parseInt(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-sm"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg cursor-pointer shadow-xs"
              >
                Save Bed Inventory to MongoDB
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: OXYGEN AVAILABILITY */}
      {activeTab === 'oxygen' && (
        <div className="bg-white rounded-2xl border border-slate-300 p-5 shadow-xs space-y-4 text-xs">
          <div className="border-b border-slate-200 pb-3">
            <h3 className="font-bold text-base text-[#0f2b48]">Oxygen Availability Management</h3>
            <p className="text-slate-500 mt-0.5">
              Update Total Oxygen, Available Oxygen, and Status (Good, Limited, Low, Critical).
            </p>
          </div>

          <form onSubmit={handleSaveOxygen} className="max-w-md space-y-4">
            <div>
              <label className="block text-slate-700 mb-1 font-bold">Total Oxygen Stock (Capacity)</label>
              <input
                type="number"
                min="0"
                required
                value={oxygenForm.total_oxygen}
                onChange={(e) => setOxygenForm({ ...oxygenForm, total_oxygen: parseInt(e.target.value) || 0 })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-sm"
              />
            </div>

            <div>
              <label className="block text-slate-700 mb-1 font-bold">
                Available Oxygen Cylinders *
              </label>
              <input
                type="number"
                min="0"
                required
                value={oxygenForm.available_oxygen}
                onChange={(e) => setOxygenForm({ ...oxygenForm, available_oxygen: parseInt(e.target.value) || 0 })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-emerald-500 rounded-lg font-bold text-sm text-emerald-800"
              />
            </div>

            <div>
              <label className="block text-slate-700 mb-1 font-bold">Oxygen Status Level *</label>
              <select
                value={oxygenForm.status}
                onChange={(e) => setOxygenForm({ ...oxygenForm, status: e.target.value as any })}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg font-bold text-sm"
              >
                <option value="Good">Good</option>
                <option value="Limited">Limited</option>
                <option value="Low">Low</option>
                <option value="Critical">Critical</option>
              </select>
              <span className="text-[11px] text-slate-500 block mt-1">
                Patient side will display: Oxygen Available: {oxygenForm.available_oxygen}, {oxygenForm.status}.
              </span>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg cursor-pointer shadow-xs"
              >
                Save Oxygen Status to MongoDB
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 5: AMBULANCE MANAGEMENT */}
      {activeTab === 'ambulances' && (
        <div className="bg-white rounded-2xl border border-slate-300 p-5 shadow-xs space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="font-bold text-base text-[#0f2b48]">Ambulance Fleet Management</h3>
              <p className="text-slate-500 mt-0.5">
                Add, edit, delete, and change status (Available, On Trip, Maintenance). Patient side only shows available ambulances.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingAmbulance(null);
                setShowAddAmbulance(!showAddAmbulance);
              }}
              className="px-3.5 py-2 rounded-lg bg-[#0f2b48] hover:bg-[#1a3d60] text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Ambulance</span>
            </button>
          </div>

          {/* Add Ambulance Form */}
          {showAddAmbulance && (
            <form onSubmit={handleAddAmbulance} className="p-4 bg-slate-50 rounded-xl border border-slate-300 space-y-3">
              <h4 className="font-bold text-slate-800 text-sm">Add New Ambulance</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 font-bold">Vehicle / Ambulance ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TN-01-AB-1234"
                    value={ambulanceForm.ambulance_id}
                    onChange={(e) => setAmbulanceForm({ ...ambulanceForm, ambulance_id: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-bold">Driver Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. S. Kumar"
                    value={ambulanceForm.driver_name}
                    onChange={(e) => setAmbulanceForm({ ...ambulanceForm, driver_name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-bold">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98403 45678"
                    value={ambulanceForm.phone}
                    onChange={(e) => setAmbulanceForm({ ...ambulanceForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-bold">Status</label>
                  <select
                    value={ambulanceForm.status}
                    onChange={(e) => setAmbulanceForm({ ...ambulanceForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="Available">Available</option>
                    <option value="On Trip">On Trip</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg cursor-pointer"
                >
                  Save Ambulance
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddAmbulance(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Edit Ambulance Form */}
          {editingAmbulance && (
            <form onSubmit={handleUpdateAmbulance} className="p-4 bg-amber-50/70 rounded-xl border border-amber-300 space-y-3">
              <h4 className="font-bold text-slate-800 text-sm">Edit Ambulance: {editingAmbulance.ambulance_id}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 font-bold">Vehicle ID</label>
                  <input
                    type="text"
                    required
                    value={editingAmbulance.ambulance_id}
                    onChange={(e) => setEditingAmbulance({ ...editingAmbulance, ambulance_id: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-bold">Driver Name</label>
                  <input
                    type="text"
                    required
                    value={editingAmbulance.driver_name}
                    onChange={(e) => setEditingAmbulance({ ...editingAmbulance, driver_name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-bold">Phone Number</label>
                  <input
                    type="text"
                    value={editingAmbulance.phone || ''}
                    onChange={(e) => setEditingAmbulance({ ...editingAmbulance, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-bold">Status</label>
                  <select
                    value={editingAmbulance.status}
                    onChange={(e) => setEditingAmbulance({ ...editingAmbulance, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="Available">Available</option>
                    <option value="On Trip">On Trip</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg cursor-pointer"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingAmbulance(null)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Ambulances Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3">Ambulance ID</th>
                  <th className="p-3">Driver Name</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ambulances.map((amb) => (
                  <tr key={amb._id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">{amb.ambulance_id}</td>
                    <td className="p-3 text-slate-700">{amb.driver_name}</td>
                    <td className="p-3 text-slate-600">{amb.phone || '—'}</td>
                    <td className="p-3">
                      <select
                        value={
                          ['Available', 'available'].includes(amb.status)
                            ? 'Available'
                            : ['On Trip', 'on_trip'].includes(amb.status)
                            ? 'On Trip'
                            : 'Maintenance'
                        }
                        onChange={(e) => handleAmbulanceStatusChange(amb._id!, e.target.value)}
                        className={`px-2.5 py-1 rounded text-xs font-bold border ${
                          ['Available', 'available'].includes(amb.status)
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : ['On Trip', 'on_trip'].includes(amb.status)
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-slate-100 text-slate-600 border-slate-300'
                        }`}
                      >
                        <option value="Available">Available</option>
                        <option value="On Trip">On Trip</option>
                        <option value="Maintenance">Maintenance</option>
                      </select>
                    </td>
                    <td className="p-3 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => setEditingAmbulance(amb)}
                        className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteAmbulance(amb._id!)}
                        className="px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: EMERGENCY REQUESTS */}
      {activeTab === 'emergency' && (
        <div className="bg-white rounded-2xl border border-slate-300 p-5 shadow-xs space-y-4 text-xs">
          <div className="border-b border-slate-200 pb-3">
            <h3 className="font-bold text-base text-[#0f2b48]">Incoming Emergency Requests</h3>
            <p className="text-slate-500 mt-0.5">
              Urgent admission and emergency resource requests from patients.
            </p>
          </div>

          {emergencyReqs.length === 0 ? (
            <p className="text-slate-500 py-6 text-center">No incoming emergency requests for this hospital.</p>
          ) : (
            <div className="space-y-3">
              {emergencyReqs.map((req) => {
                const myResponse = req.hospital_responses?.[currentHospitalId]?.status || 'pending';
                return (
                  <div
                    key={req._id}
                    className={`p-4 rounded-xl border space-y-2 ${
                      myResponse === 'accepted'
                        ? 'bg-emerald-50/60 border-emerald-300'
                        : myResponse === 'rejected'
                        ? 'bg-slate-50 border-slate-300 text-slate-500'
                        : 'bg-white border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded bg-red-100 text-red-800 font-bold text-xs uppercase">
                          🚨 {req.request_type.replace('_', ' ')}
                        </span>
                        <strong className="text-slate-900 text-sm">{req.user_name}</strong>
                        <span className="text-slate-600">Location: {req.user_location}</span>
                      </div>
                      <span className="text-slate-500 text-xs">
                        {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-slate-700">
                      <span>Phone: <strong>{req.user_phone}</strong></span>
                      <span>Priority: <strong className="text-red-700">{req.priority}</strong></span>
                      <span>Response Status: <strong className="uppercase">{myResponse}</strong></span>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      {myResponse === 'pending' && (
                        <>
                          <button
                            onClick={() => handleEmergencyAction(req._id!, 'accepted')}
                            className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold cursor-pointer"
                          >
                            Accept Admission
                          </button>
                          <button
                            onClick={() => handleEmergencyAction(req._id!, 'rejected')}
                            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold cursor-pointer"
                          >
                            Decline
                          </button>
                        </>
                      )}
                      {myResponse === 'accepted' && (
                        <button
                          onClick={() => handleEmergencyAction(req._id!, 'completed')}
                          className="px-4 py-1.5 rounded-lg bg-[#0f2b48] hover:bg-[#1a3d60] text-white font-bold cursor-pointer"
                        >
                          Mark Arrived & Completed
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 7: APPOINTMENTS MANAGEMENT */}
      {activeTab === 'appointments' && (
        <div className="bg-white rounded-2xl border border-slate-300 p-5 shadow-xs space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
            <div>
              <h3 className="font-bold text-base text-[#0f2b48] flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-700" />
                <span>Hospital Appointment Management</span>
              </h3>
              <p className="text-slate-500 mt-0.5">
                Showing appointment requests belonging strictly to <strong>{hospital?.name || currentHospitalId}</strong> (hospitalId: {currentHospitalId})
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-xs">
                {appointments.length} Total Requests
              </span>
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-slate-100">
            {[
              { id: 'all', label: `All (${appointments.length})` },
              { id: 'pending', label: `Pending (${pendingApptsCount})` },
              { id: 'approved', label: `Approved (${approvedApptsCount})` },
              { id: 'completed', label: `Completed (${completedApptsCount})` },
              { id: 'cancelled', label: `Cancelled (${cancelledApptsCount})` },
              { id: 'rejected', label: `Rejected (${rejectedApptsCount})` },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setAppointmentStatusFilter(f.id)}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                  appointmentStatusFilter === f.id
                    ? 'bg-[#0f2b48] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {(() => {
            const filteredAppts = appointments.filter((appt) => {
              if (appointmentStatusFilter === 'all') return true;
              const s = (appt.status || '').toLowerCase();
              if (appointmentStatusFilter === 'pending') return s === 'pending';
              if (appointmentStatusFilter === 'approved') return s === 'approved' || s === 'confirmed';
              if (appointmentStatusFilter === 'completed') return s === 'completed';
              if (appointmentStatusFilter === 'cancelled') return s === 'cancelled';
              if (appointmentStatusFilter === 'rejected') return s === 'rejected';
              return true;
            });

            if (filteredAppts.length === 0) {
              return (
                <div className="py-12 text-center text-slate-500 space-y-1">
                  <p className="font-bold text-sm text-slate-700">No appointments found</p>
                  <p className="text-xs">
                    {appointmentStatusFilter === 'all'
                      ? 'No patient appointments booked for this hospital yet.'
                      : `No appointments currently marked "${appointmentStatusFilter.toUpperCase()}".`}
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-3">
                {filteredAppts.map((appt) => {
                  const s = (appt.status || 'Pending').toLowerCase();
                  const isPending = s === 'pending';
                  const isApproved = s === 'approved' || s === 'confirmed';
                  const isCompleted = s === 'completed';
                  const isCancelled = s === 'cancelled';
                  const isRejected = s === 'rejected';

                  const patientName = appt.patientName || appt.patient_name || 'Patient';
                  const patientPhone = appt.patientPhone || appt.patient_phone || 'Not provided';
                  const department = appt.departmentName || appt.department || 'General Medicine';
                  const doctor = appt.doctorName || appt.doctor_name || 'Specialist Doctor';
                  const date = appt.appointmentDate || appt.date;
                  const time = appt.appointmentTime || appt.time;
                  const statusLabel =
                    isApproved
                      ? 'Approved'
                      : isPending
                      ? 'Pending'
                      : isCompleted
                      ? 'Completed'
                      : isCancelled
                      ? 'Cancelled'
                      : isRejected
                      ? 'Rejected'
                      : appt.status;

                  return (
                    <div
                      key={appt._id}
                      className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3 hover:border-slate-300 transition"
                    >
                      {/* Top Header Row */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-sm text-slate-900">
                              {patientName}
                            </span>
                            <span className="text-slate-400">&bull;</span>
                            <span className="text-slate-600 font-mono text-[11px]">
                              📞 {patientPhone}
                            </span>
                          </div>
                          <p className="text-slate-700 text-xs mt-0.5">
                            Specialist: <strong className="text-slate-900">{doctor}</strong> &bull; Department: <span className="font-semibold text-emerald-800">{department}</span>
                          </p>
                        </div>

                        {/* Status Badge */}
                        <div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 ${
                              isApproved
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                : isPending
                                ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                                : isCompleted
                                ? 'bg-sky-100 text-sky-900 border border-sky-300'
                                : isRejected
                                ? 'bg-rose-100 text-rose-900 border border-rose-300'
                                : 'bg-slate-100 text-slate-600 border border-slate-300'
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isApproved
                                  ? 'bg-emerald-600'
                                  : isPending
                                  ? 'bg-amber-600'
                                  : isCompleted
                                  ? 'bg-sky-600'
                                  : isRejected
                                  ? 'bg-rose-600'
                                  : 'bg-slate-400'
                              }`}
                            />
                            <span>{statusLabel}</span>
                          </span>
                        </div>
                      </div>

                      {/* Middle Details Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Appointment Date</span>
                          <strong className="text-slate-800 font-semibold">{date}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Time Slot</span>
                          <strong className="text-slate-800 font-semibold">{time}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Hospital ID</span>
                          <span className="font-mono text-slate-700">{appt.hospitalId || appt.hospital_id}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Patient ID</span>
                          <span className="truncate block text-slate-700" title={appt.patientId || appt.patient_id}>
                            {appt.patientId || appt.patient_id || 'Registered Patient'}
                          </span>
                        </div>
                      </div>

                      {appt.symptoms && (
                        <p className="text-slate-500 text-[11px] italic">
                          Patient Consultation Note: &ldquo;{appt.symptoms}&rdquo;
                        </p>
                      )}

                      {/* Actions Toolbar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        <span className="text-[10px] text-slate-400">
                          {appt.createdAt ? `Booked: ${new Date(appt.createdAt).toLocaleString()}` : ''}
                        </span>

                        <div className="flex items-center gap-2">
                          {/* When Admin clicks APPROVE: Pending -> Approved */}
                          {isPending && (
                            <>
                              <button
                                onClick={() => handleAppointmentStatus(appt._id!, 'Approved')}
                                className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>APPROVE</span>
                              </button>
                              <button
                                onClick={() => handleAppointmentStatus(appt._id!, 'Rejected')}
                                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>REJECT</span>
                              </button>
                              <button
                                onClick={() => handleAppointmentStatus(appt._id!, 'Cancelled')}
                                className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs cursor-pointer"
                              >
                                Cancel
                              </button>
                            </>
                          )}

                          {/* When Admin clicks COMPLETE: Approved -> Completed */}
                          {isApproved && (
                            <>
                              <button
                                onClick={() => handleAppointmentStatus(appt._id!, 'Completed')}
                                className="px-3.5 py-1.5 rounded-lg bg-[#0f2b48] hover:bg-[#1a3d60] text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>COMPLETE</span>
                              </button>
                              <button
                                onClick={() => handleAppointmentStatus(appt._id!, 'Cancelled')}
                                className="px-3 py-1.5 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 font-semibold text-xs cursor-pointer"
                              >
                                Cancel
                              </button>
                            </>
                          )}

                          {/* When Rejected: allow Re-Approve if needed */}
                          {isRejected && (
                            <button
                              onClick={() => handleAppointmentStatus(appt._id!, 'Approved')}
                              className="px-3 py-1.5 rounded-lg border border-emerald-300 text-emerald-800 hover:bg-emerald-50 font-bold text-xs cursor-pointer"
                            >
                              Re-Approve
                            </button>
                          )}

                          {isCompleted && (
                            <span className="text-xs font-bold text-sky-800 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4 text-sky-600" />
                              <span>Consultation Completed</span>
                            </span>
                          )}

                          {isCancelled && (
                            <span className="text-xs font-bold text-slate-500">
                              Cancelled
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 8: DEPARTMENTS */}
      {activeTab === 'departments' && (
        <div className="bg-white rounded-2xl border border-slate-300 p-5 shadow-xs space-y-4 text-xs">
          <div className="border-b border-slate-200 pb-3">
            <h3 className="font-bold text-base text-[#0f2b48]">Hospital Departments</h3>
            <p className="text-slate-500 mt-0.5">
              Toggle operational status (Open, Limited, Closed) across specialized wards.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {departments.map((dept) => (
              <div key={dept._id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">{dept.name}</h4>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    dept.status === 'Open'
                      ? 'bg-emerald-100 text-emerald-800'
                      : dept.status === 'Limited'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {dept.status}
                  </span>
                </div>
                <p className="text-slate-600 text-xs">Head Doctor: {dept.head_doctor}</p>
                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    onClick={() => handleDepartmentStatus(dept._id!, 'Open')}
                    className="px-2 py-1 rounded bg-white hover:bg-slate-100 border border-slate-300 font-bold cursor-pointer"
                  >
                    Open
                  </button>
                  <button
                    onClick={() => handleDepartmentStatus(dept._id!, 'Limited')}
                    className="px-2 py-1 rounded bg-white hover:bg-slate-100 border border-slate-300 font-bold cursor-pointer"
                  >
                    Limited
                  </button>
                  <button
                    onClick={() => handleDepartmentStatus(dept._id!, 'Closed')}
                    className="px-2 py-1 rounded bg-white hover:bg-slate-100 border border-slate-300 font-bold cursor-pointer"
                  >
                    Closed
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
