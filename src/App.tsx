import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PublicHomePage } from './pages/PublicHomePage';
import { MyRequestsPage } from './pages/MyRequestsPage';
import { HospitalDashboardPage } from './pages/HospitalDashboardPage';
import { HospitalAdminLoginPage } from './components/HospitalAdminLoginPage';
import { AccessDenied } from './components/AccessDenied';
import { EmergencyModal } from './components/EmergencyModal';
import { AppointmentModal } from './components/AppointmentModal';
import { HospitalDetailsModal } from './components/HospitalDetailsModal';
import { AuthModal } from './components/AuthModal';
import { MongoConnectionBanner } from './components/MongoConnectionBanner';
import { api } from './services/api';
import { Hospital } from './types';

function isHospitalAdminPath(path: string, search: string, hash: string): boolean {
  const p = path.toLowerCase();
  const s = search.toLowerCase();
  const h = hash.toLowerCase();
  return (
    p.startsWith('/admin') ||
    p.startsWith('/hospital') ||
    p.startsWith('/manage-resources') ||
    s.includes('portal=hospital') ||
    s.includes('portal=admin') ||
    s.includes('admin=true') ||
    h.includes('hospital') ||
    h.includes('admin')
  );
}

function MainApp() {
  const { user, logout } = useAuth();
  const [isAdminPortal, setIsAdminPortal] = useState<boolean>(() => {
    return isHospitalAdminPath(window.location.pathname, window.location.search, window.location.hash);
  });
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [selectedArea, setSelectedArea] = useState<string>('All');
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [isLoadingHospitals, setIsLoadingHospitals] = useState(true);

  // Modals
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [selectedHospitalForDetails, setSelectedHospitalForDetails] = useState<string | null>(null);
  const [selectedHospitalForAppt, setSelectedHospitalForAppt] = useState<Hospital | null>(null);
  const [initialEmergencyResource, setInitialEmergencyResource] = useState('oxygen');
  const [initialTargetHospitalId, setInitialTargetHospitalId] = useState<string | undefined>(undefined);

  // Synchronize browser history / URL changes (e.g. back/forward button or manual URL navigation)
  useEffect(() => {
    const handleLocationChange = () => {
      const isTargetingAdmin = isHospitalAdminPath(
        window.location.pathname,
        window.location.search,
        window.location.hash
      );
      setIsAdminPortal(isTargetingAdmin);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  useEffect(() => {
    loadHospitals();
    const interval = setInterval(loadHospitals, 4000);
    return () => clearInterval(interval);
  }, [selectedArea]);

  const loadHospitals = async () => {
    try {
      const data = await api.hospitals.getAll({
        area: selectedArea === 'All' || selectedArea === 'All Chennai' ? undefined : selectedArea,
      });
      setHospitals(data);
    } catch (e) {
      console.warn('Failed to load hospitals:', e);
    } finally {
      setIsLoadingHospitals(false);
    }
  };

  const navigateToPublic = () => {
    window.history.pushState(null, '', '/');
    setIsAdminPortal(false);
    setCurrentTab('home');
  };

  const navigateToAdmin = () => {
    window.history.pushState(null, '', '/hospital-admin');
    setIsAdminPortal(true);
  };

  const handleOpenEmergency = (resourceType?: string, targetHospitalId?: string) => {
    setInitialEmergencyResource(resourceType || 'oxygen');
    setInitialTargetHospitalId(targetHospitalId);
    setEmergencyModalOpen(true);
  };

  const handleOpenAppointment = (hosp: Hospital) => {
    setSelectedHospitalForAppt(hosp);
  };

  // =========================================================================
  // HOSPITAL ADMIN PORTAL (Completely separate from public / patient side)
  // =========================================================================
  if (isAdminPortal) {
    // SECURITY ENFORCEMENT:
    // A normal patient/public user must NOT be able to access Hospital Admin pages by changing the URL manually.
    // If a patient tries to open an admin page: Show "Access denied." and redirect them back to patient home.
    if (user && user.role !== 'HOSPITAL_ADMIN') {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center">
          <AccessDenied onRedirect={navigateToPublic} />
        </div>
      );
    }

    // If unauthenticated: Show Dedicated Hospital Administration Login
    if (!user) {
      return (
        <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-10">
          <HospitalAdminLoginPage
            onSuccess={() => {
              // Hospital admin logged in, remain in hospital admin console
            }}
            onReturnToPatient={navigateToPublic}
          />
        </div>
      );
    }

    // Logged in as HOSPITAL_ADMIN: Dedicated Hospital Management Application
    return (
      <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900 selection:bg-emerald-600 selection:text-white">
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-5">
          <HospitalDashboardPage
            onLogout={() => {
              logout();
              navigateToPublic();
            }}
            onNavigateToPublic={navigateToPublic}
          />
        </main>
        <OfflineIndicator />
      </div>
    );
  }

  // =========================================================================
  // PUBLIC / PATIENT APPLICATION (Patient view only)
  // =========================================================================
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-sky-500 selection:text-white">
      {/* Public Navigation Header (Patient Features Only) */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        selectedArea={selectedArea}
        onAreaChange={setSelectedArea}
        onOpenEmergency={() => handleOpenEmergency()}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      {/* MongoDB Atlas Connection Banner */}
      <MongoConnectionBanner onConnected={loadHospitals} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-5">
        {currentTab === 'home' && (
          <PublicHomePage
            hospitals={hospitals}
            selectedArea={selectedArea}
            onAreaChange={setSelectedArea}
            onOpenEmergency={handleOpenEmergency}
            onSelectHospital={(h) => setSelectedHospitalForDetails(h.hospital_id)}
            onBookAppointment={handleOpenAppointment}
            onOpenHospitalAdmin={navigateToAdmin}
          />
        )}

        {currentTab === 'appointments' && <MyRequestsPage initialTab="appointments" />}

        {currentTab === 'requests' && <MyRequestsPage initialTab="emergency" />}
      </main>

      {/* Mobile Bottom Navigation (Public Patient Features Only) */}
      <BottomNav
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onOpenEmergency={() => handleOpenEmergency()}
      />

      {/* Offline Indicator */}
      <OfflineIndicator />

      {/* Modals */}
      <EmergencyModal
        isOpen={emergencyModalOpen}
        onClose={() => setEmergencyModalOpen(false)}
        hospitals={hospitals}
        initialResource={initialEmergencyResource}
        initialHospitalId={initialTargetHospitalId}
        onDispatched={() => {
          setCurrentTab('requests');
          loadHospitals();
        }}
      />

      {selectedHospitalForAppt && (
        <AppointmentModal
          isOpen={!!selectedHospitalForAppt}
          onClose={() => setSelectedHospitalForAppt(null)}
          hospital={selectedHospitalForAppt}
          onBooked={() => {
            setCurrentTab('appointments');
          }}
        />
      )}

      {selectedHospitalForDetails && (
        <HospitalDetailsModal
          hospitalId={selectedHospitalForDetails}
          onClose={() => setSelectedHospitalForDetails(null)}
          onRequestEmergency={(h) => {
            setSelectedHospitalForDetails(null);
            handleOpenEmergency('oxygen', h.hospital_id);
          }}
          onBookAppointment={(h) => {
            setSelectedHospitalForDetails(null);
            handleOpenAppointment(h);
          }}
        />
      )}

      {/* Patient Login & Profile Modal (Strictly Patient) */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
