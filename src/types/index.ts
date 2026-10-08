export type UserRole = 'PUBLIC_USER' | 'HOSPITAL_ADMIN' | 'DOCTOR';

export interface User {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  hospital_id?: string;
  doctorId?: string;
  doctor_id?: string;
  location?: string;
}

export type HospitalStatus = 'healthy' | 'limited' | 'high_risk' | 'critical';

export interface HospitalOverview {
  total_beds: number;
  available_beds: number;
  icu_beds: number;
  emergency_beds?: number;
  isolation_beds?: number;
  oxygen_cylinders: number;
  total_oxygen?: number;
  oxygen_status?: string;
  ventilators: number;
  doctors_available: number;
  nurses_available: number;
  ambulances_available: number;
}

export interface Hospital {
  _id?: string;
  hospital_id: string;
  name: string;
  area: string;
  address: string;
  phone: string;
  emergency_phone: string;
  latitude: number;
  longitude: number;
  is_demo: boolean;
  status: HospitalStatus;
  distanceKm?: number | null;
  overview: HospitalOverview;
}

export interface Doctor {
  _id?: string;
  hospital_id: string;
  name: string;
  specialization: string;
  department: string;
  phone: string;
  shift_start: string;
  shift_end: string;
  status: 'available' | 'busy' | 'on_leave' | 'off_duty';
}

export interface Nurse {
  _id?: string;
  hospital_id: string;
  name: string;
  department: string;
  shift: string;
  phone: string;
  category: 'general' | 'icu' | 'emergency';
  status: 'available' | 'on_duty' | 'on_leave' | 'off_duty';
}

export interface Department {
  _id?: string;
  hospital_id: string;
  name: string;
  status: 'Open' | 'Limited' | 'Closed';
  head_doctor: string;
  bed_count: number;
}

export interface BedCategory {
  _id?: string;
  hospital_id: string;
  category: 'General Beds' | 'ICU Beds' | 'Emergency Beds' | 'Isolation Beds';
  total: number;
  occupied: number;
  available: number;
}

export interface Ambulance {
  _id?: string;
  hospital_id: string;
  ambulance_id: string;
  driver_name: string;
  phone: string;
  status: 'available' | 'on_trip' | 'maintenance';
}

export interface ResourceItem {
  _id?: string;
  hospital_id: string;
  resource_type: string;
  current_stock: number;
  critical_threshold: number;
  unit: string;
  daily_consumption: number;
  consumption_rate: number;
  updated_at: string;
}

export interface ResourceReading {
  _id?: string;
  hospital_id: string;
  resource_type: string;
  quantity: number;
  timestamp: string;
}

export interface Appointment {
  _id?: string;
  patientId?: string;
  patientName?: string;
  patientPhone?: string;
  hospitalId?: string;
  hospitalName?: string;
  departmentId?: string;
  departmentName?: string;
  doctorId?: string;
  doctorName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  patient_id?: string;
  patient_name?: string;
  patient_phone?: string;
  hospital_id?: string;
  hospital_name?: string;
  doctor_id?: string;
  doctor_name?: string;
  department?: string;
  date?: string;
  time?: string;
  status:
    | 'Pending'
    | 'Approved'
    | 'Rejected'
    | 'Completed'
    | 'Cancelled'
    | 'pending'
    | 'confirmed'
    | 'rejected'
    | 'completed'
    | 'cancelled'
    | string;
  symptoms?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface HospitalResponseItem {
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
  responder_note?: string;
  updated_at: string;
  hospital_name?: string;
  phone?: string;
}

export interface EmergencyRequest {
  _id?: string;
  user_id: string;
  user_name: string;
  user_phone: string;
  user_location: string;
  request_type: 'oxygen' | 'emergency_bed' | 'icu_bed' | 'ambulance' | 'emergency_doctor';
  quantity: number;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'NORMAL';
  target_hospital_ids: string[];
  hospital_responses: Record<string, HospitalResponseItem>;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
  accepted_hospital_id?: string;
  createdAt: string;
}

export interface TransferRequest {
  _id?: string;
  requester_hospital_id?: string;
  requester_hospital_name?: string;
  requested_from_hospital_id?: string;
  requested_from_hospital_name?: string;
  target_hospital_id?: string;
  target_hospital_name?: string;
  from_hospital_id: string;
  from_hospital_name: string;
  to_hospital_id: string;
  to_hospital_name: string;
  resource_type: string;
  quantity: number;
  priority: 'High' | 'Medium' | 'Low' | 'Urgent' | 'URGENT' | 'HIGH' | 'MEDIUM' | string;
  status:
    | 'Pending'
    | 'Accepted'
    | 'Rejected'
    | 'In Transit'
    | 'Delivered'
    | 'Cancelled'
    | 'recommended'
    | 'requested'
    | 'accepted'
    | 'rejected'
    | 'in_transit'
    | 'delivered'
    | 'cancelled'
    | string;
  requested_on?: string;
  deadline?: string;
  reason?: string;
  ai_justification?: string;
  estimated_transit_time?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MLPrediction {
  _id?: string;
  hospital_id: string;
  hospital_name: string;
  resource_type: string;
  current_stock: number;
  consumption_rate: number;
  time_to_critical_minutes: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  predicted_1h: number;
  predicted_3h: number;
  predicted_6h: number;
  predicted_12h: number;
  mae: number;
  rmse: number;
  r2: number;
  confidence: number;
  explanation: string;
  historical_readings?: { time: string; stock: number }[];
  regression_slope: number;
  regression_intercept: number;
  timestamp: string;
}

export interface HospitalAnalysis {
  hospital_id: string;
  name: string;
  area: string;
  current_stock: number;
  consumption_rate: number;
  critical_threshold: number;
  time_to_critical_minutes: number;
  surplus_units: number;
  deficit_units: number;
  surplus_hours: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  role: 'SHORTAGE' | 'SURPLUS' | 'BALANCED';
}

export interface RebalanceAnalysisResult {
  shortageHospitals: HospitalAnalysis[];
  surplusHospitals: HospitalAnalysis[];
  balancedHospitals: HospitalAnalysis[];
  recommendations: TransferRequest[];
  timestamp: string;
}

export interface AppNotification {
  _id: string;
  title: string;
  message: string;
  type: 'emergency' | 'transfer' | 'prediction' | 'appointment' | 'alert';
  read: boolean;
  createdAt: string;
}
