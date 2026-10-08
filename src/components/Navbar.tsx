import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { PWAInstallButton } from './PWAInstallButton';
import { api } from '../services/api';
import {
  Activity,
  Bell,
  MapPin,
  User,
  LogOut,
  Hospital as HospitalIcon,
  AlertTriangle,
  RotateCcw,
  Check,
  Shield,
  Layers,
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  selectedArea: string;
  onAreaChange: (area: string) => void;
  onOpenEmergency: () => void;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  selectedArea,
  onAreaChange,
  onOpenEmergency,
  onOpenAuth,
}) => {
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const res = await api.notifications.get();
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (e) {}
  };

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e) {}
  };

  const areas = ['All Chennai', 'Chennai Central', 'Anna Nagar', 'Adyar', 'Velachery', 'Tambaram'];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div
            onClick={() => onTabChange('home')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight text-slate-900 leading-none">
                  MEDIREBAL
                </span>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 uppercase tracking-wider">
                  AI
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium leading-none mt-0.5">
                Cross-Hospital Resource Rebalancing
              </p>
            </div>
          </div>

          {/* Area Selector Pill */}
          <div className="hidden lg:flex items-center gap-1.5 ml-4 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs">
            <MapPin className="w-3.5 h-3.5 text-sky-600" />
            <select
              value={selectedArea}
              onChange={(e) => onAreaChange(e.target.value)}
              className="bg-transparent text-slate-700 font-medium text-xs focus:outline-none cursor-pointer"
            >
              {areas.map((a) => (
                <option key={a} value={a === 'All Chennai' ? 'All' : a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Center Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-semibold text-slate-600">
          <button
            onClick={() => onTabChange('home')}
            className={`px-3 py-2 rounded-lg transition cursor-pointer ${
              currentTab === 'home' ? 'text-sky-700 bg-sky-50 font-bold' : 'hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Find Hospitals
          </button>
          <button
            onClick={() => onTabChange('rebalance')}
            className={`px-3 py-2 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
              currentTab === 'rebalance' ? 'text-sky-700 bg-sky-50 font-bold' : 'hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <RotateCcw className="w-4 h-4 text-emerald-600" />
            <span>AI Rebalance</span>
          </button>
          <button
            onClick={() => onTabChange('appointments')}
            className={`px-3 py-2 rounded-lg transition cursor-pointer ${
              currentTab === 'appointments' ? 'text-sky-700 bg-sky-50 font-bold' : 'hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Appointments
          </button>
          <button
            onClick={() => onTabChange('requests')}
            className={`px-3 py-2 rounded-lg transition cursor-pointer ${
              currentTab === 'requests' ? 'text-sky-700 bg-sky-50 font-bold' : 'hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            My Requests
          </button>
          <button
            onClick={() => onTabChange('hospital-dashboard')}
            className={`px-3 py-2 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
              currentTab === 'hospital-dashboard'
                ? 'text-[#0f2b48] bg-slate-100 font-bold border border-slate-300'
                : 'hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Shield className="w-4 h-4 text-[#0f2b48]" />
            <span>Hospital Admin</span>
          </button>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Prominent Emergency Button */}
          <button
            onClick={onOpenEmergency}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-red-600/25 active:scale-95 transition cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>🚨 EMERGENCY</span>
          </button>

          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-sky-600" />
                    <span className="font-bold text-slate-800 text-sm">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-sky-600 hover:underline font-medium cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="mt-2 max-h-72 overflow-y-auto space-y-2 divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif._id}
                        className={`pt-2 text-xs ${!notif.read ? 'bg-sky-50/60 p-2 rounded-xl' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <p className="font-semibold text-slate-900">{notif.title}</p>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">
                            {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px] mt-0.5 leading-snug">{notif.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Account / Profile */}
          {user ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={onOpenAuth}
                className="hidden sm:flex items-center gap-2 p-1.5 pr-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition text-left cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-800 font-bold text-xs flex items-center justify-center">
                  {user.name.charAt(0)}
                </div>
                <div className="hidden lg:block text-xs">
                  <p className="font-bold text-slate-900 leading-tight truncate max-w-[110px]">{user.name}</p>
                  <p className="text-[10px] text-slate-500 capitalize">{user.role.replace('_', ' ').toLowerCase()}</p>
                </div>
              </button>
              <button
                onClick={logout}
                className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition cursor-pointer"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
