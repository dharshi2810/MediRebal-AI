import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PublicHomePage } from './pages/PublicHomePage';
import { CrossHospitalRebalancePage } from './pages/CrossHospitalRebalancePage';
import { MyRequestsPage } from './pages/MyRequestsPage';
import { HospitalDashboardPage } from './pages/HospitalDashboardPage';
import { EmergencyModal } from './components/EmergencyModal';
import { AppointmentModal } from './components/AppointmentModal';
import { HospitalDetailsModal } from './components/HospitalDetailsModal';
import { AuthModal } from './components/AuthModal';
import { MongoConnectionBanner } from './components/MongoConnectionBanner';
import { api } from './services/api';
import { Hospital } from './types';

function MainApp() {
  const { user } = useAuth();
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

  // Auto-switch to hospital dashboard if user logs in as hospital admin
  useEffect(() => {
    if (user?.role === 'HOSPITAL_ADMIN' && currentTab === 'home') {
      // Allow user to explore home, or switch to hospital dashboard
    }
  }, [user]);

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

  const handleOpenEmergency = (resourceType?: string, targetHospitalId?: string) => {
    setInitialEmergencyResource(resourceType || 'oxygen');
    setInitialTargetHospitalId(targetHospitalId);
    setEmergencyModalOpen(true);
  };

  const handleOpenAppointment = (hosp: Hospital) => {
    setSelectedHospitalForAppt(hosp);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-sky-500 selection:text-white">
      {/* Main Navigation Header */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        selectedArea={selectedArea}
        onAreaChange={setSelectedArea}
        onOpenEmergency={() => handleOpenEmergency()}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      {/* MongoDB Atlas Connection Banner (shows if not connected) */}
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
          />
        )}

        {currentTab === 'rebalance' && <CrossHospitalRebalancePage />}

        {currentTab === 'requests' && <MyRequestsPage />}

        {currentTab === 'appointments' && <MyRequestsPage />}

        {currentTab === 'hospital-dashboard' && <HospitalDashboardPage />}
      </main>

      {/* Mobile Bottom Navigation */}
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
            setCurrentTab('requests');
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
