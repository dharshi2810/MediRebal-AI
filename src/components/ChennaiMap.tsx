import React, { useEffect, useRef } from 'react';
import { Hospital } from '../types';
import L from 'leaflet';
import { Phone, Navigation, AlertCircle, Eye, Info } from 'lucide-react';

interface ChennaiMapProps {
  hospitals: Hospital[];
  selectedHospitalId?: string;
  onSelectHospital: (hospital: Hospital) => void;
  onRequestHospital: (hospital: Hospital) => void;
  heightClass?: string;
}

export const ChennaiMap: React.FC<ChennaiMapProps> = ({
  hospitals,
  selectedHospitalId,
  onSelectHospital,
  onRequestHospital,
  heightClass = 'h-[420px] sm:h-[500px]',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});

  const getMarkerColor = (status: string) => {
    switch (status) {
      case 'critical':
        return '#dc2626'; // red-600
      case 'high_risk':
        return '#ea580c'; // orange-600
      case 'limited':
        return '#eab308'; // yellow-500
      case 'healthy':
      default:
        return '#16a34a'; // green-600
    }
  };

  const createCustomIcon = (status: string, isSelected: boolean) => {
    const color = getMarkerColor(status);
    const size = isSelected ? 38 : 30;
    const pulseHtml = status === 'critical' || status === 'high_risk'
      ? `<span class="absolute -top-1 -right-1 flex h-3 w-3">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
        </span>`
      : '';

    const html = `
      <div class="relative cursor-pointer transition-transform duration-200 hover:scale-110 flex items-center justify-center">
        <div style="background-color: ${color}; width: ${size}px; height: ${size}px;"
             class="rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white font-bold text-xs">
          🏥
        </div>
        ${pulseHtml}
      </div>
    `;

    return L.divIcon({
      html,
      className: 'custom-hospital-marker',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2],
    });
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Focus on Chennai Central coords: [13.0450, 80.2200]
      const map = L.map(mapContainerRef.current, {
        center: [13.045, 80.22],
        zoom: 12,
        scrollWheelZoom: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear previous markers
    Object.values(markersRef.current).forEach((marker) => marker.remove());
    markersRef.current = {};

    // Add markers for 5 Chennai hospitals
    hospitals.forEach((hosp) => {
      const isSelected = hosp.hospital_id === selectedHospitalId;
      const marker = L.marker([hosp.latitude, hosp.longitude], {
        icon: createCustomIcon(hosp.status, isSelected),
      }).addTo(map);

      const statusBadge =
        hosp.status === 'critical'
          ? '<span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-700">🔴 Critical Stock</span>'
          : hosp.status === 'high_risk'
          ? '<span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-orange-100 text-orange-700">🟠 High Risk</span>'
          : hosp.status === 'limited'
          ? '<span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-700">🟡 Limited Stock</span>'
          : '<span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700">🟢 Healthy Stock</span>';

      const popupContent = document.createElement('div');
      popupContent.className = 'p-1 text-slate-800 text-xs w-64 max-w-xs font-sans';
      popupContent.innerHTML = `
        <div class="mb-2">
          <div class="flex items-start justify-between gap-1">
            <h4 class="font-bold text-sm text-slate-900 leading-tight">${hosp.name}</h4>
          </div>
          <div class="flex items-center gap-2 mt-1">
            <span class="text-slate-500 font-medium">${hosp.area}</span>
            ${statusBadge}
          </div>
          ${hosp.distanceKm !== undefined && hosp.distanceKm !== null ? `<span class="text-[11px] text-sky-700 font-semibold block mt-0.5">📍 ~${hosp.distanceKm} km away</span>` : ''}
        </div>

        <div class="grid grid-cols-2 gap-1.5 p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] mb-2.5">
          <div><span class="text-slate-500">🫁 Oxygen:</span> <strong class="${hosp.overview.oxygen_cylinders <= 30 ? 'text-red-600 font-bold' : 'text-slate-800'}">${hosp.overview.oxygen_cylinders} cyl</strong></div>
          <div><span class="text-slate-500">🛏️ Beds:</span> <strong>${hosp.overview.available_beds} avail</strong></div>
          <div><span class="text-slate-500">🏥 ICU Beds:</span> <strong>${hosp.overview.icu_beds} avail</strong></div>
          <div><span class="text-slate-500">👨‍⚕️ Doctors:</span> <strong>${hosp.overview.doctors_available} avail</strong></div>
          <div><span class="text-slate-500">👩‍⚕️ Nurses:</span> <strong>${hosp.overview.nurses_available} on duty</strong></div>
          <div><span class="text-slate-500">🚑 Ambulances:</span> <strong>${hosp.overview.ambulances_available} free</strong></div>
        </div>

        <div class="flex flex-col gap-1.5 pt-1 border-t border-slate-200">
          <div class="grid grid-cols-2 gap-1.5">
            <button id="btn-view-${hosp.hospital_id}" class="w-full py-1.5 px-2 bg-slate-100 hover:bg-slate-200 rounded font-semibold text-slate-700 flex items-center justify-center gap-1 cursor-pointer">
              <span>View Info</span>
            </button>
            <a href="tel:${hosp.emergency_phone.replace(/[^0-9+]/g, '')}" class="w-full py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-center flex items-center justify-center gap-1">
              <span>📞 Call</span>
            </a>
          </div>
          <button id="btn-req-${hosp.hospital_id}" class="w-full py-1.5 px-2 bg-sky-600 hover:bg-sky-700 text-white rounded font-bold flex items-center justify-center gap-1 cursor-pointer">
            <span>🚨 Request Resource</span>
          </button>
          <a href="https://www.google.com/maps/dir/?api=1&destination=${hosp.latitude},${hosp.longitude}" target="_blank" rel="noopener noreferrer" class="text-center text-[11px] text-sky-600 hover:underline pt-0.5">
            🗺️ Open Google Directions
          </a>
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 280 });

      marker.on('popupopen', () => {
        const viewBtn = popupContent.querySelector(`#btn-view-${hosp.hospital_id}`);
        if (viewBtn) {
          viewBtn.addEventListener('click', () => onSelectHospital(hosp));
        }
        const reqBtn = popupContent.querySelector(`#btn-req-${hosp.hospital_id}`);
        if (reqBtn) {
          reqBtn.addEventListener('click', () => onRequestHospital(hosp));
        }
      });

      markersRef.current[hosp.hospital_id] = marker;
    });

    // If specific hospital selected, pan to it
    if (selectedHospitalId && markersRef.current[selectedHospitalId]) {
      const target = hospitals.find((h) => h.hospital_id === selectedHospitalId);
      if (target) {
        map.setView([target.latitude, target.longitude], 13);
        markersRef.current[selectedHospitalId].openPopup();
      }
    }
  }, [hospitals, selectedHospitalId]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-md bg-white">
      {/* Regional Hospital Network Status Banner */}
      <div className="bg-slate-50 border-b border-slate-200 px-3 py-1.5 flex items-center justify-between text-xs text-slate-700 font-medium">
        <span className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
          <strong className="font-semibold text-slate-900">Connected Hubs:</strong> 5 Connected Chennai Hospital Hubs (Tamil Nadu, India)
        </span>
        <span className="text-[11px] text-slate-500 hidden sm:inline">Real-time resource coordination active</span>
      </div>

      {/* Map Canvas */}
      <div ref={mapContainerRef} className={`w-full ${heightClass} z-10`} />

      {/* Interactive Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-md p-2.5 rounded-xl border border-slate-200 shadow-lg text-[11px] space-y-1">
        <div className="font-bold text-slate-800 text-xs mb-1">Resource Status</div>
        <div className="flex items-center gap-1.5 text-slate-700">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
          <span>🟢 Healthy Stock (&gt;6h buffer)</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-700">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0" />
          <span>🟡 Limited (3-6h buffer)</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-700">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 flex-shrink-0" />
          <span>🟠 High Risk (1-3h buffer)</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-700">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600 flex-shrink-0" />
          <span>🔴 Critical (&lt;1h or breached)</span>
        </div>
      </div>
    </div>
  );
};
