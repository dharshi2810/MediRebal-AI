import React, { useState } from 'react';
import { Hospital } from '../types';
import { ChennaiMap } from '../components/ChennaiMap';
import {
  AlertTriangle,
  Search,
  MapPin,
  Phone,
  Navigation,
  Activity,
  Calendar,
  Eye,
  CheckCircle2,
} from 'lucide-react';

interface PublicHomePageProps {
  hospitals: Hospital[];
  selectedArea: string;
  onAreaChange: (area: string) => void;
  onOpenEmergency: (resourceType?: string, targetHospitalId?: string) => void;
  onSelectHospital: (hospital: Hospital) => void;
  onBookAppointment: (hospital: Hospital) => void;
}

export const PublicHomePage: React.FC<PublicHomePageProps> = ({
  hospitals,
  selectedArea,
  onAreaChange,
  onOpenEmergency,
  onSelectHospital,
  onBookAppointment,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [resourceFilter, setResourceFilter] = useState<'all' | 'oxygen' | 'beds' | 'icu' | 'doctors'>('all');
  const [viewMode, setViewMode] = useState<'split' | 'map' | 'list'>('split');

  // Filter hospitals
  const filteredHospitals = hospitals.filter((h) => {
    const matchesArea =
      selectedArea === 'All' || selectedArea === 'All Chennai' || h.area === selectedArea;
    const matchesSearch =
      !searchQuery ||
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.area.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesResource = true;
    if (resourceFilter === 'oxygen') matchesResource = (h.overview?.oxygen_cylinders ?? 0) > 0;
    else if (resourceFilter === 'beds') matchesResource = (h.overview?.available_beds ?? 0) > 0;
    else if (resourceFilter === 'icu') matchesResource = (h.overview?.icu_beds ?? 0) > 0;
    else if (resourceFilter === 'doctors') matchesResource = (h.overview?.doctors_available ?? 0) > 0;

    return matchesArea && matchesSearch && matchesResource;
  });

  return (
    <div className="space-y-6 pb-20 font-sans">
      {/* Emergency Assistance Banner - Professional Medical Style */}
      <div className="bg-[#0f2b48] border-b-4 border-red-600 rounded-2xl text-white p-5 sm:p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-red-600/30 text-red-200 text-xs font-bold uppercase tracking-wider border border-red-500/40">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <span>Chennai District Healthcare Coordination</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight">
              Emergency Healthcare & Hospital Resource Access
            </h1>
            <p className="text-slate-200 text-xs sm:text-sm leading-relaxed">
              Real-time verified hospital bed availability, medical oxygen reserves, duty doctors, and emergency dispatch tracking across Chennai.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={() => onOpenEmergency()}
              className="px-5 py-3 rounded-lg bg-red-700 hover:bg-red-800 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition"
            >
              <AlertTriangle className="w-5 h-5 text-white" />
              <span>Broadcast Emergency SOS</span>
            </button>
          </div>
        </div>

        {/* Quick Resource SOS Buttons */}
        <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <button
            onClick={() => onOpenEmergency('oxygen')}
            className="p-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-left border border-white/20 transition cursor-pointer"
          >
            <div className="font-bold text-white text-xs">Medical Oxygen</div>
            <div className="text-[11px] text-slate-300">Cylinders & Concentrators</div>
          </button>

          <button
            onClick={() => onOpenEmergency('emergency_bed')}
            className="p-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-left border border-white/20 transition cursor-pointer"
          >
            <div className="font-bold text-white text-xs">Emergency Beds</div>
            <div className="text-[11px] text-slate-300">Trauma & Acute Ward</div>
          </button>

          <button
            onClick={() => onOpenEmergency('icu_bed')}
            className="p-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-left border border-white/20 transition cursor-pointer"
          >
            <div className="font-bold text-white text-xs">ICU Beds</div>
            <div className="text-[11px] text-slate-300">Critical Care & Ventilators</div>
          </button>

          <button
            onClick={() => onOpenEmergency('ambulance')}
            className="p-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-left border border-white/20 transition cursor-pointer"
          >
            <div className="font-bold text-white text-xs">Ambulance Dispatch</div>
            <div className="text-[11px] text-slate-300">Emergency Transport</div>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-300 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search hospitals by name, area (e.g. Central, Anna Nagar, Adyar, Velachery)..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-[#0f2b48]"
          />
        </div>

        {/* Resource Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setResourceFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              resourceFilter === 'all'
                ? 'bg-[#0f2b48] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Hospitals
          </button>
          <button
            onClick={() => setResourceFilter('oxygen')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              resourceFilter === 'oxygen'
                ? 'bg-[#0f2b48] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Oxygen Available
          </button>
          <button
            onClick={() => setResourceFilter('beds')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              resourceFilter === 'beds'
                ? 'bg-[#0f2b48] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Beds Available
          </button>
          <button
            onClick={() => setResourceFilter('icu')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              resourceFilter === 'icu'
                ? 'bg-[#0f2b48] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            ICU Available
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-end md:self-auto border border-slate-200">
          <button
            onClick={() => setViewMode('split')}
            className={`px-2.5 py-1 rounded font-bold text-xs transition cursor-pointer ${
              viewMode === 'split' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
            }`}
          >
            Split View
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-2.5 py-1 rounded font-bold text-xs transition cursor-pointer ${
              viewMode === 'map' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
            }`}
          >
            Map View
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-2.5 py-1 rounded font-bold text-xs transition cursor-pointer ${
              viewMode === 'list' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
            }`}
          >
            List View
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Interactive Map */}
        {(viewMode === 'split' || viewMode === 'map') && (
          <div className={`${viewMode === 'map' ? 'lg:col-span-12' : 'lg:col-span-6'}`}>
            <ChennaiMap
              hospitals={hospitals}
              onSelectHospital={onSelectHospital}
              onRequestHospital={(h) => onOpenEmergency('oxygen', h.hospital_id)}
            />
          </div>
        )}

        {/* Hospital Cards List */}
        {(viewMode === 'split' || viewMode === 'list') && (
          <div className={`${viewMode === 'list' ? 'lg:col-span-12' : 'lg:col-span-6'} space-y-3.5`}>
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-bold text-[#0f2b48] flex items-center gap-2 uppercase tracking-wide">
                <span>Chennai Hospital Hubs</span>
                <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 text-xs font-bold">
                  {filteredHospitals.length}
                </span>
              </h2>
              <span className="text-xs text-slate-500">Live verified via MongoDB</span>
            </div>

            {filteredHospitals.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-slate-300 text-slate-600 text-xs">
                No hospitals match the selected filter. Try choosing &ldquo;All Chennai&rdquo; or clearing the search.
              </div>
            ) : (
              filteredHospitals.map((hosp) => (
                <div
                  key={hosp.hospital_id}
                  className="bg-white rounded-xl border border-slate-300 p-4 shadow-xs hover:border-[#0f2b48] transition space-y-3 text-xs"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {hosp.hospital_id}
                        </span>
                        <h3
                          onClick={() => onSelectHospital(hosp)}
                          className="font-bold text-sm text-[#0f2b48] hover:text-emerald-700 transition cursor-pointer"
                        >
                          {hosp.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 text-xs mt-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          {hosp.area}
                        </span>
                        {hosp.distanceKm !== undefined && (
                          <span className="text-slate-500">&bull; ~{hosp.distanceKm} km away</span>
                        )}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {hosp.status === 'healthy' && (
                        <span className="px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold text-xs border border-emerald-300">
                          Healthy
                        </span>
                      )}
                      {hosp.status === 'limited' && (
                        <span className="px-2.5 py-0.5 rounded bg-amber-50 text-amber-900 font-bold text-xs border border-amber-300">
                          Limited
                        </span>
                      )}
                      {hosp.status === 'high_risk' && (
                        <span className="px-2.5 py-0.5 rounded bg-orange-50 text-orange-900 font-bold text-xs border border-orange-300">
                          High Risk
                        </span>
                      )}
                      {hosp.status === 'critical' && (
                        <span className="px-2.5 py-0.5 rounded bg-red-50 text-red-900 font-bold text-xs border border-red-300">
                          Critical
                        </span>
                      )}
                    </div>
                  </div>

                  {/* MongoDB Live Resource Metrics - Simple Smart Hospital View */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
                    {/* Beds */}
                    <div className="bg-white p-2 rounded-md border border-slate-100">
                      <span className="text-xs text-slate-600 block mb-0.5">🛏 Beds</span>
                      <strong className="text-sm text-slate-900 font-bold block">
                        {hosp.overview.available_beds}
                      </strong>
                      <span className="text-[11px] text-emerald-700 font-bold">Available</span>
                    </div>

                    {/* ICU Beds */}
                    <div className="bg-white p-2 rounded-md border border-slate-100">
                      <span className="text-xs text-slate-600 block mb-0.5">🏥 ICU</span>
                      <strong className="text-sm text-slate-900 font-bold block">
                        {hosp.overview.icu_beds}
                      </strong>
                      <span className="text-[11px] text-emerald-700 font-bold">Available</span>
                    </div>

                    {/* Oxygen */}
                    <div className="bg-white p-2 rounded-md border border-slate-100">
                      <span className="text-xs text-slate-600 block mb-0.5">🫁 Oxygen</span>
                      <strong className={`text-sm font-bold block ${
                        hosp.overview.oxygen_cylinders <= 30 ? 'text-red-600' : 'text-slate-900'
                      }`}>
                        {hosp.overview.oxygen_cylinders}
                      </strong>
                      <span className={`text-[11px] font-bold block ${
                        hosp.overview.oxygen_status === 'Critical'
                          ? 'text-red-600'
                          : hosp.overview.oxygen_status === 'Low'
                          ? 'text-orange-600'
                          : hosp.overview.oxygen_status === 'Limited'
                          ? 'text-amber-600'
                          : 'text-emerald-700'
                      }`}>
                        {hosp.overview.oxygen_status || (hosp.overview.oxygen_cylinders <= 30 ? 'Critical' : 'Good')}
                      </span>
                    </div>

                    {/* Doctors */}
                    <div className="bg-white p-2 rounded-md border border-slate-100">
                      <span className="text-xs text-slate-600 block mb-0.5">👨‍⚕️ Doctors</span>
                      <strong className="text-sm text-slate-900 font-bold block">
                        {hosp.overview.doctors_available}
                      </strong>
                      <span className="text-[11px] text-emerald-700 font-bold">Available</span>
                    </div>

                    {/* Nurses */}
                    <div className="bg-white p-2 rounded-md border border-slate-100">
                      <span className="text-xs text-slate-600 block mb-0.5">👩‍⚕️ Nurses</span>
                      <strong className="text-sm text-slate-900 font-bold block">
                        {hosp.overview.nurses_available}
                      </strong>
                      <span className="text-[11px] text-emerald-700 font-bold">Available</span>
                    </div>

                    {/* Ambulances */}
                    <div className="bg-white p-2 rounded-md border border-slate-100">
                      <span className="text-xs text-slate-600 block mb-0.5">🚑 Ambulances</span>
                      <strong className={`text-sm font-bold block ${
                        hosp.overview.ambulances_available === 0 ? 'text-red-600' : 'text-slate-900'
                      }`}>
                        {hosp.overview.ambulances_available}
                      </strong>
                      <span className={`text-[11px] font-bold ${
                        hosp.overview.ambulances_available === 0 ? 'text-red-600' : 'text-emerald-700'
                      }`}>
                        {hosp.overview.ambulances_available === 0 ? 'None Free' : 'Available'}
                      </span>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onSelectHospital(hosp)}
                        className="px-3 py-1.5 rounded-lg bg-[#0f2b48] hover:bg-[#1a3d60] text-white font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-400" />
                        <span>View Hospital & Staff</span>
                      </button>

                      <button
                        onClick={() => onBookAppointment(hosp)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center gap-1 border border-slate-300 cursor-pointer"
                      >
                        <Calendar className="w-3.5 h-3.5 text-[#0f2b48]" />
                        <span>Book Doctor</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <a
                        href={`tel:${hosp.emergency_phone.replace(/[^0-9+]/g, '')}`}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center gap-1 border border-slate-200"
                      >
                        <Phone className="w-3.5 h-3.5 text-red-600" />
                        <span>Call</span>
                      </a>

                      <button
                        onClick={() => onOpenEmergency('oxygen', hosp.hospital_id)}
                        className="px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 text-white font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <span>Emergency SOS</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
