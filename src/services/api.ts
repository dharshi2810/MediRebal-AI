import {
  User,
  Hospital,
  BedCategory,
  Doctor,
  Nurse,
  Department,
  Ambulance,
  ResourceItem,
  ResourceReading,
  Appointment,
  EmergencyRequest,
  TransferRequest,
  MLPrediction,
  RebalanceAnalysisResult,
  AppNotification,
} from '../types';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('medirebal_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  // Authentication
  auth: {
    login: (credentials: { email: string; password: string }) =>
      fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      }).then(handleResponse<{ token: string; user: User }>),

    register: (userData: any) =>
      fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      }).then(handleResponse<{ token: string; user: User }>),

    me: () =>
      fetch(`${API_BASE}/auth/me`, {
        headers: { ...getAuthHeader() },
      }).then(handleResponse<{ user: User }>),

    getDemoUsers: () =>
      fetch(`${API_BASE}/auth/demo-users`).then(handleResponse<any>),
  },

  // Hospitals
  hospitals: {
    getAll: (params?: { area?: string; search?: string; userLat?: number; userLng?: number; resource?: string }) => {
      const q = new URLSearchParams();
      if (params?.area) q.append('area', params.area);
      if (params?.search) q.append('search', params.search);
      if (params?.userLat) q.append('userLat', params.userLat.toString());
      if (params?.userLng) q.append('userLng', params.userLng.toString());
      if (params?.resource) q.append('resource', params.resource);
      return fetch(`${API_BASE}/hospitals?${q.toString()}`).then(handleResponse<Hospital[]>);
    },

    getById: (id: string) =>
      fetch(`${API_BASE}/hospitals/${id}`).then(handleResponse<any>),

    update: (id: string, data: Partial<Hospital>) =>
      fetch(`${API_BASE}/hospitals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data),
      }).then(handleResponse<{ message: string }>),
  },

  // Resources
  resources: {
    getAll: () =>
      fetch(`${API_BASE}/resources`).then(handleResponse<ResourceItem[]>),

    get: (hospitalId: string) =>
      fetch(`${API_BASE}/resources/${hospitalId}`).then(handleResponse<ResourceItem[]>),

    update: (hospitalId: string, data: any) =>
      fetch(`${API_BASE}/resources/${hospitalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data),
      }).then(handleResponse<{ message: string }>),

    getHistory: (hospitalId: string, resourceType: string = 'oxygen_cylinders') =>
      fetch(`${API_BASE}/resources/history/${hospitalId}?resourceType=${resourceType}`).then(
        handleResponse<ResourceReading[]>
      ),
  },

  // Beds
  beds: {
    get: (hospitalId: string) =>
      fetch(`${API_BASE}/beds/${hospitalId}`).then(handleResponse<BedCategory[]>),

    update: (hospitalId: string, data: any) =>
      fetch(`${API_BASE}/beds/${hospitalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data),
      }).then(handleResponse<any>),
  },

  // Staff (Doctors, Nurses, Depts, Ambulances)
  doctors: {
    get: (hospitalId: string) =>
      fetch(`${API_BASE}/doctors/${hospitalId}`).then(handleResponse<Doctor[]>),
    create: (data: any) =>
      fetch(`${API_BASE}/doctors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data),
      }).then(handleResponse<{ doctor: Doctor }>),
    update: (id: string, data: any) =>
      fetch(`${API_BASE}/doctors/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data),
      }).then(handleResponse<{ message: string }>),
    delete: (id: string) =>
      fetch(`${API_BASE}/doctors/${id}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() },
      }).then(handleResponse<{ message: string }>),
  },

  nurses: {
    get: (hospitalId: string) =>
      fetch(`${API_BASE}/nurses/${hospitalId}`).then(handleResponse<Nurse[]>),
    create: (data: any) =>
      fetch(`${API_BASE}/nurses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data),
      }).then(handleResponse<{ nurse: Nurse }>),
    update: (id: string, data: any) =>
      fetch(`${API_BASE}/nurses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data),
      }).then(handleResponse<{ message: string }>),
    delete: (id: string) =>
      fetch(`${API_BASE}/nurses/${id}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() },
      }).then(handleResponse<{ message: string }>),
  },

  departments: {
    get: (hospitalId: string) =>
      fetch(`${API_BASE}/departments/${hospitalId}`).then(handleResponse<Department[]>),
    create: (data: any) =>
      fetch(`${API_BASE}/departments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data),
      }).then(handleResponse<{ department: Department }>),
    update: (id: string, data: any) =>
      fetch(`${API_BASE}/departments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data),
      }).then(handleResponse<{ message: string }>),
  },

  ambulances: {
    get: (hospitalId: string) =>
      fetch(`${API_BASE}/ambulances/${hospitalId}`).then(handleResponse<Ambulance[]>),
    create: (data: any) =>
      fetch(`${API_BASE}/ambulances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data),
      }).then(handleResponse<{ ambulance: Ambulance }>),
    update: (id: string, data: any) =>
      fetch(`${API_BASE}/ambulances/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data),
      }).then(handleResponse<{ message: string }>),
    delete: (id: string) =>
      fetch(`${API_BASE}/ambulances/${id}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() },
      }).then(handleResponse<{ message: string }>),
  },

  // Appointments
  appointments: {
    get: (params?: { hospitalId?: string; doctorId?: string; status?: string; date?: string }) => {
      const query = new URLSearchParams();
      if (params?.hospitalId) query.append('hospitalId', params.hospitalId);
      if (params?.doctorId) query.append('doctorId', params.doctorId);
      if (params?.status) query.append('status', params.status);
      if (params?.date) query.append('date', params.date);
      const qs = query.toString() ? `?${query.toString()}` : '';
      return fetch(`${API_BASE}/appointments${qs}`, {
        headers: { ...getAuthHeader() },
      }).then(handleResponse<Appointment[]>);
    },

    create: (data: any) =>
      fetch(`${API_BASE}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data),
      }).then(handleResponse<{ appointment: Appointment; message: string }>),

    update: (id: string, status: string) =>
      fetch(`${API_BASE}/appointments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ status }),
      }).then(handleResponse<{ message: string; status: string; statusLabel: string }>),
  },

  // Emergency Requests
  emergency: {
    get: () =>
      fetch(`${API_BASE}/emergency-requests`, {
        headers: { ...getAuthHeader() },
      }).then(handleResponse<EmergencyRequest[]>),

    create: (data: any) =>
      fetch(`${API_BASE}/emergency-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data),
      }).then(handleResponse<{ request: EmergencyRequest; message: string }>),

    respond: (id: string, data: { status: string; responder_note?: string; hospital_id?: string }) =>
      fetch(`${API_BASE}/emergency-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data),
      }).then(handleResponse<{ request: EmergencyRequest; message: string }>),
  },

  // Cross-Hospital Transfers
  transfers: {
    get: () =>
      fetch(`${API_BASE}/transfers`, {
        headers: { ...getAuthHeader() },
      }).then(handleResponse<TransferRequest[]>),

    create: (data: any) =>
      fetch(`${API_BASE}/transfers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data),
      }).then(handleResponse<{ transfer: TransferRequest; message: string }>),

    update: (id: string, data: { status: string; notes?: string }) =>
      fetch(`${API_BASE}/transfers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data),
      }).then(handleResponse<{ transfer: TransferRequest; message: string }>),
  },

  // ML Predictions
  predictions: {
    getAll: () =>
      fetch(`${API_BASE}/predictions`).then(handleResponse<MLPrediction[]>),

    get: (hospitalId: string) =>
      fetch(`${API_BASE}/predictions/${hospitalId}`).then(handleResponse<MLPrediction>),

    recalculate: (hospitalId?: string) =>
      fetch(`${API_BASE}/predictions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hospital_id: hospitalId }),
      }).then(handleResponse<any>),
  },

  // Rebalancing Analysis
  rebalance: {
    getDistrictAnalysis: () =>
      fetch(`${API_BASE}/rebalance/district-analysis`).then(handleResponse<RebalanceAnalysisResult>),
  },

  // Notifications
  notifications: {
    get: () =>
      fetch(`${API_BASE}/notifications`, {
        headers: { ...getAuthHeader() },
      }).then(handleResponse<{ notifications: AppNotification[]; unreadCount: number }>),

    markRead: (id: string) =>
      fetch(`${API_BASE}/notifications/${id}/read`, {
        method: 'PUT',
        headers: { ...getAuthHeader() },
      }).then(handleResponse<{ message: string }>),

    markAllRead: () =>
      fetch(`${API_BASE}/notifications/read-all`, {
        method: 'PUT',
        headers: { ...getAuthHeader() },
      }).then(handleResponse<{ message: string }>),
  },

  // Live Simulator Controls
  simulation: {
    getStatus: () =>
      fetch(`${API_BASE}/simulation/status`).then(handleResponse<any>),

    start: (speed?: number) =>
      fetch(`${API_BASE}/simulation/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speed }),
      }).then(handleResponse<any>),

    pause: () =>
      fetch(`${API_BASE}/simulation/pause`, { method: 'POST' }).then(handleResponse<any>),

    reset: () =>
      fetch(`${API_BASE}/simulation/reset`, { method: 'POST' }).then(handleResponse<any>),

    tick: () =>
      fetch(`${API_BASE}/simulation/tick`, { method: 'POST' }).then(handleResponse<any>),
  },

  // Gemini AI Services
  gemini: {
    explainTransfer: (data: any) =>
      fetch(`${API_BASE}/gemini/explain-transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(handleResponse<{ justification: string }>),

    explainPrediction: (data: any) =>
      fetch(`${API_BASE}/gemini/explain-prediction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(handleResponse<{ explanation: string }>),

    emergencyGuidance: (data: any) =>
      fetch(`${API_BASE}/gemini/emergency-guidance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(handleResponse<{ guidance: string }>),
  },

  // System Status & Audit
  status: {
    getHealth: () =>
      fetch(`${API_BASE}/status/health`).then(handleResponse<any>),

    configureConnection: (data: { password?: string; uri?: string }) =>
      fetch(`${API_BASE}/status/configure-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(handleResponse<any>),

    retryAtlas: () =>
      fetch(`${API_BASE}/status/retry-atlas`, {
        method: 'POST',
      }).then(handleResponse<any>),

    getAuditLogs: () =>
      fetch(`${API_BASE}/status/audit-logs`, {
        headers: { ...getAuthHeader() },
      }).then(handleResponse<any[]>),
  },
};
