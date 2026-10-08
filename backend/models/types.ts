export type UserRole = 'PUBLIC_USER' | 'HOSPITAL_ADMIN' | 'DOCTOR';

export interface User {
  _id?: string;
  name: string;
  email: string;
  phone: string;
  password?: string;
  role: UserRole;
  hospital_id?: string; // H001..H005 for HOSPITAL_ADMIN
  doctorId?: string;
  doctor_id?: string;
  location?: string;
  createdAt: string;
}

export type HospitalStatus = 'healthy' | 'limited' | 'high_risk' | 'critical';

export interface Hospital {
  _id?: string;
  hospital_id: string; // e.g. H001
  name: string;
  area: string;
  address: string;
  phone: string;
  emergency_phone: string;
  latitude: number;
  longitude: number;
  is_demo: boolean;
  status: HospitalStatus;
  overview?: {
    total_beds: number;
    available_beds: number;
    icu_beds: number;
    oxygen_cylinders: number;
    ventilators: number;
    doctors_available: number;
    nurses_available: number;
    ambulances_available: number;
  };
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

export interface ResourceItem {
  _id?: string;
  hospital_id: string;
  resource_type: 'oxygen_cylinders' | 'oxygen_concentrators' | 'ventilators' | 'icu_beds' | 'emergency_beds' | 'general_beds';
  current_stock: number;
  critical_threshold: number;
  unit: string;
  daily_consumption: number;
  consumption_rate: number; // units / hour
  updated_at: string;
}

export interface ResourceReading {
  _id?: string;
  hospital_id: string;
  resource_type: string;
  quantity: number;
  timestamp: string;
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

export type AppointmentStatus =
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
  | 'no_show';

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
  status: AppointmentStatus;
  symptoms?: string;
  createdAt: string;
  updatedAt?: string;
}

export type EmergencyPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'NORMAL';
export type EmergencyStatus = 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';

export interface HospitalResponseItem {
  status: EmergencyStatus;
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
  priority: EmergencyPriority;
  target_hospital_ids: string[];
  hospital_responses: Record<string, HospitalResponseItem>;
  status: EmergencyStatus;
  accepted_hospital_id?: string;
  createdAt: string;
}

export type TransferStatus =
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
  status: TransferStatus;
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

export interface AppNotification {
  _id?: string;
  user_id: string; // specific user_id, 'all', or hospital_id
  title: string;
  message: string;
  type: 'emergency' | 'transfer' | 'prediction' | 'appointment' | 'alert';
  read: boolean;
  createdAt: string;
  action_url?: string;
}

export interface AuditLog {
  _id?: string;
  user_id: string;
  role: string;
  action: string;
  hospital_id?: string;
  details?: Record<string, any>;
  timestamp: string;
}
