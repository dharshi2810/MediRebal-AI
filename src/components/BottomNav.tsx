import React from 'react';
import {
  Home,
  MapPin,
  ClipboardList,
  Calendar,
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
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200 px-2 py-1.5 shadow-2xl">
      <div className="grid grid-cols-5 items-center justify-around">
        {/* Home */}
        <button
          onClick={() => onTabChange('home')}
          className={`flex flex-col items-center justify-center py-1 transition cursor-pointer ${
            currentTab === 'home' ? 'text-sky-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Home</span>
        </button>

        {/* Find Hospitals */}
        <button
          onClick={() => {
            onTabChange('home');
            const el = document.getElementById('hospitals-directory') || document.getElementById('map-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className={`flex flex-col items-center justify-center py-1 transition cursor-pointer text-slate-500 hover:text-slate-800`}
        >
          <MapPin className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Hospitals</span>
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

        {/* Appointments */}
        <button
          onClick={() => onTabChange('appointments')}
          className={`flex flex-col items-center justify-center py-1 transition cursor-pointer ${
            currentTab === 'appointments' ? 'text-sky-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Appts</span>
        </button>

        {/* My Requests */}
        <button
          onClick={() => onTabChange('requests')}
          className={`flex flex-col items-center justify-center py-1 transition cursor-pointer ${
            currentTab === 'requests' ? 'text-sky-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ClipboardList className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Requests</span>
        </button>
      </div>
    </nav>
  );
};
