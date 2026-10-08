import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Hospital,
  RotateCcw,
  AlertTriangle,
  ClipboardList,
  Calendar,
  LayoutDashboard,
  User,
} from 'lucide-react';

interface BottomNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onOpenEmergency: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onTabChange,
  onOpenEmergency,
}) => {
  const { user } = useAuth();
  const isHospitalAdmin = user?.role === 'HOSPITAL_ADMIN';

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200 px-2 py-1.5 shadow-2xl">
      <div className="grid grid-cols-5 items-center justify-around">
        {/* Find Hospital */}
        <button
          onClick={() => onTabChange('home')}
          className={`flex flex-col items-center justify-center py-1 transition cursor-pointer ${
            currentTab === 'home' ? 'text-sky-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Hospital className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Hospitals</span>
        </button>

        {/* AI Rebalance */}
        <button
          onClick={() => onTabChange('rebalance')}
          className={`flex flex-col items-center justify-center py-1 transition cursor-pointer ${
            currentTab === 'rebalance' ? 'text-sky-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <RotateCcw className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Rebalance</span>
        </button>

        {/* Big Center Emergency Button */}
        <div className="flex justify-center -mt-5">
          <button
            onClick={onOpenEmergency}
            className="w-13 h-13 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-xl shadow-red-500/40 flex flex-col items-center justify-center active:scale-95 transition-transform border-3 border-white cursor-pointer"
          >
            <span className="text-xl leading-none">🚨</span>
            <span className="text-[8px] font-black tracking-tighter uppercase mt-0.5">SOS</span>
          </button>
        </div>

        {/* Requests */}
        <button
          onClick={() => onTabChange('requests')}
          className={`flex flex-col items-center justify-center py-1 transition cursor-pointer ${
            currentTab === 'requests' ? 'text-sky-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ClipboardList className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Requests</span>
        </button>

        {/* Hospital Console or Appointments */}
        {isHospitalAdmin ? (
          <button
            onClick={() => onTabChange('hospital-dashboard')}
            className={`flex flex-col items-center justify-center py-1 transition cursor-pointer ${
              currentTab === 'hospital-dashboard'
                ? 'text-sky-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Console</span>
          </button>
        ) : (
          <button
            onClick={() => onTabChange('appointments')}
            className={`flex flex-col items-center justify-center py-1 transition cursor-pointer ${
              currentTab === 'appointments'
                ? 'text-sky-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Appts</span>
          </button>
        )}
      </div>
    </nav>
  );
};
