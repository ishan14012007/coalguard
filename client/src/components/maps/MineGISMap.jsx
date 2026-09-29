import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../../context/AuthContext';
import { 
  MapPin, 
  AlertOctagon, 
  Layers, 
  Flame, 
  ShieldAlert, 
  RefreshCw, 
  CheckCircle2, 
  Radio, 
  Clock, 
  X,
  Zap,
  Info,
  ChevronRight
} from 'lucide-react';

// ============================================================================
// INCIDENT COLOR PALETTES & CONFIGURATION
// ============================================================================
export const INCIDENT_CONFIG = {
  FIRE: {
    label: 'Fire',
    color: '#EAB308', // Yellow
    bg: '#FEF08A',
    border: '#CA8A04',
    text: '#854D0E',
    svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#EAB308" stroke="#854D0E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`
  },
  GAS_LEAK: {
    label: 'Gas Leak',
    color: '#A855F7', // Purple
    bg: '#F3E8FF',
    border: '#7E22CE',
    text: '#581C87',
    svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#A855F7" stroke="#581C87" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/></svg>`
  },
  MINE_COLLAPSE: {
    label: 'Mine Collapse',
    color: '#18181B', // Black
    bg: '#27272A',
    border: '#FFFFFF',
    text: '#FFFFFF',
    svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#18181B" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
  },
  FLOODING: {
    label: 'Flooding',
    color: '#2563EB', // Blue
    bg: '#DBEAFE',
    border: '#1D4ED8',
    text: '#1E40AF',
    svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#2563EB" stroke="#1E40AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"/><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"/></svg>`
  },
  SMOKE_TOXIC: {
    label: 'Smoke / Toxic Hazard',
    color: '#EA580C', // Orange
    bg: '#FFEDD5',
    border: '#C2410C',
    text: '#7C2D12',
    svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#EA580C" stroke="#7C2D12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4"/><path d="m4.93 10.93 2.83-2.83"/><path d="M2 18h4"/><path d="M20 18h2"/><path d="m19.07 10.93-2.83-2.83"/><path d="M22 22H2"/><path d="m16 16-4-4-4 4"/></svg>`
  },
  ELECTRICAL: {
    label: 'Electrical Hazard',
    color: '#DC2626', // Red
    bg: '#FEE2E2',
    border: '#B91C1C',
    text: '#991B1B',
    svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#DC2626" stroke="#991B1B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`
  },
  OTHER: {
    label: 'Other Incident',
    color: '#4B5563', // Gray
    bg: '#F3F4F6',
    border: '#374151',
    text: '#1F2937',
    svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#4B5563" stroke="#1F2937" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
  }
};

// Generic geo-pin marker icon
const createCustomIcon = (severity, type) => {
  const color = severity === 'critical' ? '#e11d48' : severity === 'high' ? '#f59e0b' : '#0284c7';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="${color}">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: 'custom-leaflet-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28]
  });
};

// Dedicated Location-Aware Incident Marker Icon
const createIncidentIcon = (incident, isFocused) => {
  const config = INCIDENT_CONFIG[incident.incident_type] || INCIDENT_CONFIG.OTHER;
  const isResolved = incident.status === 'RESOLVED';
  const isAck = incident.status === 'ACKNOWLEDGED';

  const pulseClass = isFocused ? 'animate-pulse' : '';
  const focusRing = isFocused 
    ? `box-shadow: 0 0 0 6px ${config.color}88, 0 0 24px 6px ${config.color};`
    : isResolved 
    ? 'opacity: 0.65;' 
    : isAck 
    ? `box-shadow: 0 0 0 3px ${config.color}55;` 
    : `box-shadow: 0 0 0 4px ${config.color}77;`;

  const size = isFocused ? 38 : 32;
  const anchor = isFocused ? 19 : 16;

  const html = `
    <div style="position: relative; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center;">
      ${isFocused ? `<span style="position: absolute; inset: -8px; border-radius: 9999px; background: ${config.color}; opacity: 0.35; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>` : ''}
      <div style="
        width: ${size}px; 
        height: ${size}px; 
        background: ${config.color}; 
        border: 2.5px solid ${config.border}; 
        border-radius: 9999px; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        ${focusRing}
        cursor: pointer;
        transition: transform 0.2s ease;
      " class="${pulseClass}">
        <div style="display: flex; align-items: center; justify-content: center;">
          ${config.svgIcon}
        </div>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'incident-leaflet-marker',
    iconSize: [size, size],
    iconAnchor: [anchor, anchor],
    popupAnchor: [0, -anchor - 4]
  });
};

// Map view controller with smooth flyTo on focusIncident
function ChangeMapView({ center, zoom, focusIncident }) {
  const map = useMap();
  useEffect(() => {
    if (focusIncident && typeof focusIncident.latitude === 'number' && typeof focusIncident.longitude === 'number' && !isNaN(focusIncident.latitude)) {
      try {
        map.flyTo([focusIncident.latitude, focusIncident.longitude], 16, {
          duration: 1.2,
          easeLinearity: 0.25
        });
      } catch (e) {
        map.setView([focusIncident.latitude, focusIncident.longitude], 16);
      }
    } else if (Array.isArray(center) && typeof center[0] === 'number' && !isNaN(center[0])) {
      try {
        map.setView(center, zoom || 13);
      } catch (e) {
        console.warn('Map setView error:', e);
      }
    }
    const timer = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch (e) {}
    }, 250);
    return () => clearTimeout(timer);
  }, [center, zoom, focusIncident, map]);
  return null;
}

const DEFAULT_MINES = [
  {
    id: 'mine-demo-01',
    name: 'Demo Mine A (Zone 1 - Zone 5)',
    code: 'DEMO-MINE-A',
    mine_type: 'opencast_underground',
    latitude: 23.7508,
    longitude: 86.4192,
    current_risk_score: 58.5,
    geojson_boundary: [
      [23.755, 86.415],
      [23.756, 86.425],
      [23.746, 86.424],
      [23.745, 86.414]
    ]
  }
];

// CARTO Voyager Basemap URL with API Key from environment variable
const CARTO_API_KEY = import.meta.env.VITE_CARTO_API_KEY || '';
const CARTO_VOYAGER_URL = CARTO_API_KEY
  ? `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${CARTO_API_KEY}`
  : 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png';

export default function MineGISMap({ 
  mineId, 
  height = '500px', 
  showHeatmap = true, 
  token: propToken,
  focusIncident = null,
  onClearFocusIncident
}) {
  const { token: ctxToken, user } = useAuth();
  const token = propToken || ctxToken;
  const [mapData, setMapData] = useState({ mines: DEFAULT_MINES, pins: [], incidents: [], heatmapPoints: [] });
  const [loading, setLoading] = useState(true);
  const [activeLayer, setActiveLayer] = useState('all'); // 'all' | 'incidents' | 'violations' | 'hazards'
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [incidentActionMsg, setIncidentActionMsg] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showLegend, setShowLegend] = useState(true);

  // Ref map for opening popups programmatically
  const incidentMarkerRefs = useRef({});

  // Sync focusIncident with selectedIncidentId and open popup
  useEffect(() => {
    if (focusIncident && (focusIncident.id || focusIncident.incident_id)) {
      const incId = focusIncident.id || focusIncident.incident_id;
      setSelectedIncidentId(incId);
      
      const timer = setTimeout(() => {
        if (incidentMarkerRefs.current[incId]) {
          try {
            incidentMarkerRefs.current[incId].openPopup();
          } catch (e) {}
        }
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [focusIncident]);

  const fetchMapData = async () => {
    try {
      const url = mineId ? `/api/gis/map-data?mine_id=${mineId}` : '/api/gis/map-data';
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setMapData({
            mines: Array.isArray(data.mines) && data.mines.length > 0 ? data.mines : DEFAULT_MINES,
            pins: Array.isArray(data.pins) ? data.pins : [],
            incidents: Array.isArray(data.incidents) ? data.incidents : [],
            heatmapPoints: Array.isArray(data.heatmapPoints) ? data.heatmapPoints : []
          });
        }
      }
    } catch (err) {
      console.error('Error loading GIS map data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMapData();
    const interval = setInterval(fetchMapData, 10000);
    return () => clearInterval(interval);
  }, [mineId, token]);

  // Handle Acknowledge Incident Action
  const handleAcknowledgeIncident = async (incId) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/incidents/${incId}/acknowledge`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        setIncidentActionMsg('Incident Acknowledged. Response logged to SHA-256 ledger.');
        fetchMapData();
        setTimeout(() => setIncidentActionMsg(''), 4000);
      }
    } catch (err) {
      console.error('Acknowledge error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Resolve Incident Action
  const handleResolveIncident = async (incId) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/incidents/${incId}/resolve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          resolution_notes: `Hazard neutralized and verified safe by ${user?.full_name || 'Supervisor'}.`
        })
      });
      if (res.ok) {
        setIncidentActionMsg('Incident RESOLVED & recorded in cryptographic audit ledger.');
        fetchMapData();
        setTimeout(() => setIncidentActionMsg(''), 4000);
      }
    } catch (err) {
      console.error('Resolve error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const rawMine = (mapData.mines && mapData.mines[0]) || DEFAULT_MINES[0];
  const defaultCenter = [
    typeof rawMine?.latitude === 'number' && !isNaN(rawMine.latitude) ? rawMine.latitude : 23.7508,
    typeof rawMine?.longitude === 'number' && !isNaN(rawMine.longitude) ? rawMine.longitude : 86.4192
  ];

  // Filter regular geo-pins
  const filteredPins = (mapData.pins || []).filter(p => {
    if (!p || typeof p.latitude !== 'number' || typeof p.longitude !== 'number' || isNaN(p.latitude) || isNaN(p.longitude)) {
      return false;
    }
    if (activeLayer === 'incidents') return false; // only show incidents
    if (activeLayer === 'violations') return p.type === 'violation';
    if (activeLayer === 'hazards') return p.type === 'field_report';
    return true;
  });

  // Filter incidents
  const filteredIncidents = (mapData.incidents || []).filter(i => {
    if (!i || typeof i.latitude !== 'number' || typeof i.longitude !== 'number' || isNaN(i.latitude) || isNaN(i.longitude)) {
      return false;
    }
    if (activeLayer === 'violations' || activeLayer === 'hazards') return false;
    return true;
  });

  const validHeatmapPoints = (mapData.heatmapPoints || []).filter(pt =>
    Array.isArray(pt) &&
    typeof pt[0] === 'number' && !isNaN(pt[0]) &&
    typeof pt[1] === 'number' && !isNaN(pt[1])
  );

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-xl" style={{ height }}>
      
      {/* 1. GIS FLOATING CONTROL BAR */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-wrap items-center gap-1.5 sm:gap-2 bg-slate-900/90 backdrop-blur-md px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-700 shadow-xl text-[11px] sm:text-xs max-w-[calc(100%-24px)]">
        <Layers className="w-3.5 h-3.5 text-sky-400 shrink-0" />
        <span className="font-semibold text-white">GIS Layers:</span>
        <button
          onClick={() => setActiveLayer('all')}
          className={`px-2 py-0.5 rounded-md font-medium transition cursor-pointer ${activeLayer === 'all' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          All Layers ({filteredPins.length + filteredIncidents.length})
        </button>
        <button
          onClick={() => setActiveLayer('incidents')}
          className={`px-2 py-0.5 rounded-md font-medium transition cursor-pointer flex items-center gap-1 ${activeLayer === 'incidents' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping inline-block" />
          <span>Incidents ({mapData.incidents?.length || 0})</span>
        </button>
        <button
          onClick={() => setActiveLayer('violations')}
          className={`px-2 py-0.5 rounded-md font-medium transition cursor-pointer ${activeLayer === 'violations' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          Violations
        </button>
        <button
          onClick={() => setActiveLayer('hazards')}
          className={`px-2 py-0.5 rounded-md font-medium transition cursor-pointer ${activeLayer === 'hazards' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          Field Hazards
        </button>
      </div>

      {/* 2. ACTIVE FOCUSED INCIDENT NOTIFICATION CHIP (When navigated from notification) */}
      {focusIncident && (
        <div className="absolute top-14 left-3 z-[1000] bg-[#1E1B16]/95 backdrop-blur-md border border-[#EAB308]/60 text-white p-2.5 rounded-xl shadow-2xl text-xs max-w-[calc(100%-24px)] sm:max-w-sm flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-[#EAB308]/20 text-[#EAB308]">
              <Radio className="w-4 h-4 animate-pulse" />
            </span>
            <div>
              <div className="font-bold text-[#EAB308] text-[11px] font-mono uppercase">
                Focused Incident Target
              </div>
              <div className="font-bold text-white text-xs truncate max-w-[200px]">
                {focusIncident.title || 'Safety Incident'} ({focusIncident.zone || 'Target Zone'})
              </div>
            </div>
          </div>
          {onClearFocusIncident && (
            <button 
              onClick={() => {
                setSelectedIncidentId(null);
                onClearFocusIncident();
              }}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Clear focus"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* 3. INCIDENT ACTION FEEDBACK TOAST */}
      {incidentActionMsg && (
        <div className="absolute top-3 right-3 z-[1001] bg-[#1F6B45] text-white px-3 py-1.5 rounded-xl shadow-xl text-xs font-bold font-mono flex items-center gap-1.5 animate-bounce">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{incidentActionMsg}</span>
        </div>
      )}

      {/* 4. COMPACT PROFESSIONAL INCIDENT & RISK MAP LEGEND (Requirement #8) */}
      <div className="absolute bottom-3 right-3 z-[1000] bg-slate-900/90 backdrop-blur-md p-2.5 rounded-xl border border-slate-700 shadow-xl text-[11px] max-w-[200px] select-none transition-all">
        <div className="flex items-center justify-between mb-1.5 border-b border-slate-700 pb-1">
          <span className="font-bold text-white uppercase text-[10px] tracking-wider font-heading">
            Incident Legend
          </span>
          <button 
            onClick={() => setShowLegend(!showLegend)}
            className="text-[10px] text-sky-400 hover:underline"
          >
            {showLegend ? 'Hide' : 'Show'}
          </button>
        </div>

        {showLegend && (
          <div className="space-y-1 text-[10px]">
            <div className="flex items-center gap-1.5 text-slate-200">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EAB308] border border-yellow-200 shrink-0" />
              <span>Fire (Yellow)</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-200">
              <span className="w-2.5 h-2.5 rounded-full bg-[#A855F7] border border-purple-200 shrink-0" />
              <span>Gas Leak (Purple)</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-200">
              <span className="w-2.5 h-2.5 rounded-full bg-[#18181B] border border-white shrink-0" />
              <span>Mine Collapse (Black)</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-200">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] border border-blue-200 shrink-0" />
              <span>Flooding (Blue)</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-200">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EA580C] border border-orange-200 shrink-0" />
              <span>Smoke / Toxic (Orange)</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-200">
              <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626] border border-red-200 shrink-0" />
              <span>Electrical (Red)</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300 pt-1 border-t border-slate-800">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <span>Critical Risk Lease Area</span>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
          Loading OpenStreetMap & Satellite Layers...
        </div>
      ) : (
        <MapContainer
          center={defaultCenter}
          zoom={13}
          scrollWheelZoom={true}
          className="w-full h-full"
        >
          {/* View controller handling dynamic flyTo upon focusIncident */}
          <ChangeMapView 
            center={defaultCenter} 
            zoom={13} 
            focusIncident={focusIncident} 
          />
          
          {/* CARTO Voyager Basemap Tiles with API Key */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url={CARTO_VOYAGER_URL}
            maxZoom={20}
          />

          {/* Mine Lease Boundaries */}
          {(mapData.mines || []).map((mine) => (
            Array.isArray(mine.geojson_boundary) && mine.geojson_boundary.length > 0 && (
              <Polygon
                key={mine.id}
                positions={mine.geojson_boundary}
                pathOptions={{
                  color: (mine.current_risk_score || 0) > 60 ? '#e11d48' : '#0284c7',
                  fillColor: (mine.current_risk_score || 0) > 60 ? '#e11d48' : '#0284c7',
                  fillOpacity: 0.15,
                  weight: 2,
                  dashArray: '4, 4'
                }}
              >
                <Popup>
                  <div className="p-1 space-y-1 text-xs">
                    <div className="font-bold text-sky-400">{mine.name}</div>
                    <div>Code: <span className="font-mono text-slate-300">{mine.code}</span></div>
                    <div>Type: <span className="uppercase text-slate-300">{mine.mine_type}</span></div>
                    <div>AI Risk Score: <span className="font-bold text-amber-400">{mine.current_risk_score}/100</span></div>
                  </div>
                </Popup>
              </Polygon>
            )
          ))}

          {/* Heatmap intensity circles */}
          {showHeatmap && validHeatmapPoints.map((pt, idx) => (
            <CircleMarker
              key={`heat-${idx}`}
              center={[pt[0], pt[1]]}
              radius={20 * (pt[2] || 0.5)}
              pathOptions={{
                fillColor: pt[2] > 0.7 ? '#e11d48' : pt[2] > 0.4 ? '#f59e0b' : '#0284c7',
                fillOpacity: 0.25,
                stroke: false
              }}
            />
          ))}

          {/* Generic Geo-Pins (Violations & Hazards) */}
          {filteredPins.map((pin) => (
            <Marker
              key={`${pin.type}-${pin.id}`}
              position={[pin.latitude, pin.longitude]}
              icon={createCustomIcon(pin.severity, pin.type)}
            >
              <Popup>
                <div className="p-1 space-y-1 text-xs max-w-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-white">{pin.title}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${
                      pin.severity === 'critical' ? 'bg-rose-950 text-rose-300' :
                      pin.severity === 'high' ? 'bg-amber-950 text-amber-300' :
                      'bg-sky-950 text-sky-300'
                    }`}>
                      {pin.severity}
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px]">{pin.description || pin.location}</p>
                  {pin.photo_url && (
                    <img src={pin.photo_url} alt="Proof" className="w-full h-24 object-cover rounded mt-1 border border-slate-700" />
                  )}
                  <div className="text-[10px] text-slate-400 pt-1">
                    {pin.mine_name ? `Site: ${pin.mine_name}` : `Reporter: ${pin.reporter || 'Inspector'}`}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Location-Aware Incident Markers (Requirement #4 & #5) */}
          {filteredIncidents.map((incident) => {
            const isFocused = selectedIncidentId === incident.id;
            const incConfig = INCIDENT_CONFIG[incident.incident_type] || INCIDENT_CONFIG.OTHER;
            const isResolved = incident.status === 'RESOLVED';
            const isAck = incident.status === 'ACKNOWLEDGED';

            return (
              <Marker
                key={incident.id}
                position={[incident.latitude, incident.longitude]}
                icon={createIncidentIcon(incident, isFocused)}
                ref={(el) => {
                  if (el) incidentMarkerRefs.current[incident.id] = el;
                }}
                eventHandlers={{
                  click: () => {
                    setSelectedIncidentId(incident.id);
                  }
                }}
              >
                <Popup>
                  <div className="p-1 space-y-2 text-xs max-w-xs select-none">
                    {/* Header Strip with Incident Category Badge */}
                    <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-700">
                      <div className="flex items-center gap-1.5">
                        <span 
                          className="w-2.5 h-2.5 rounded-full" 
                          style={{ backgroundColor: incConfig.color }}
                        />
                        <span className="font-bold text-white uppercase tracking-wider font-heading">
                          {incConfig.label} Incident
                        </span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold font-mono ${
                        incident.severity === 'CRITICAL' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                        incident.severity === 'HIGH' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                        'bg-sky-950 text-sky-300 border border-sky-800'
                      }`}>
                        {incident.severity}
                      </span>
                    </div>

                    {/* Incident Title & Zone */}
                    <div>
                      <div className="font-bold text-white text-sm font-heading">{incident.title}</div>
                      <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                        {incident.description}
                      </p>
                    </div>

                    {/* Metadata Box */}
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 space-y-1 text-[11px] font-mono">
                      <div className="flex justify-between text-slate-300">
                        <span>Mine / Sector:</span>
                        <strong className="text-white">{incident.zone || 'Zone 4'}</strong>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>GPS Coordinates:</span>
                        <strong className="text-sky-400">{incident.latitude?.toFixed(4)}°N, {incident.longitude?.toFixed(4)}°E</strong>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Status:</span>
                        <strong className={isResolved ? 'text-emerald-400' : isAck ? 'text-amber-400' : 'text-rose-400 animate-pulse'}>
                          {incident.status}
                        </strong>
                      </div>
                      <div className="flex justify-between text-slate-400 text-[10px] pt-1 border-t border-slate-800">
                        <span>Source:</span>
                        <span className="truncate max-w-[140px]" title={incident.source}>{incident.source}</span>
                      </div>
                    </div>

                    {/* Interactive Action Buttons */}
                    <div className="pt-1 flex items-center gap-2">
                      {!isAck && !isResolved && (
                        <button
                          onClick={() => handleAcknowledgeIncident(incident.id)}
                          disabled={actionLoading}
                          className="flex-1 py-1.5 rounded-lg bg-[#EAB308] hover:bg-[#CA8A04] text-slate-950 text-[11px] font-bold transition shadow-xs cursor-pointer font-heading flex items-center justify-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Acknowledge</span>
                        </button>
                      )}

                      {isAck && !isResolved && (
                        <button
                          onClick={() => handleResolveIncident(incident.id)}
                          disabled={actionLoading}
                          className="flex-1 py-1.5 rounded-lg bg-[#1F6B45] hover:bg-[#17512F] text-white text-[11px] font-bold transition shadow-xs cursor-pointer font-heading flex items-center justify-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Resolve Hazard</span>
                        </button>
                      )}

                      {isResolved && (
                        <div className="w-full py-1 text-center font-mono text-[10px] font-bold text-emerald-400 bg-emerald-950/40 rounded border border-emerald-800/40">
                          ✅ Verified & Closed in Audit Ledger
                        </div>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        </MapContainer>
      )}

    </div>
  );
}
