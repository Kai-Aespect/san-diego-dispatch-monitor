import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { type IncidentListResponse } from "@shared/routes";
import { Flame, Shield, Activity, Car, MapPin } from "lucide-react";
import { renderToString } from "react-dom/server";
import { format } from "date-fns";

// Custom hook to handle auto-centering when a specific incident is selected
function MapController({ selectedLat, selectedLng }: { selectedLat?: number | null, selectedLng?: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (selectedLat && selectedLng) {
      map.flyTo([selectedLat, selectedLng], 16, { duration: 1.5 });
    }
  }, [selectedLat, selectedLng, map]);
  return null;
}

const createCustomIcon = (agency: string, family?: string | null, isMajor?: boolean | null) => {
  let colorClass = "bg-slate-500 text-slate-100";
  let pulseClass = "";
  let IconComponent = MapPin;

  if (agency.toLowerCase() === 'fire') {
    if (family === 'Medical') {
      colorClass = "bg-emerald-500 text-white shadow-emerald-500/50";
      IconComponent = Activity;
    } else {
      colorClass = "bg-red-500 text-white shadow-red-500/50";
      IconComponent = Flame;
    }
  } else if (agency.toLowerCase() === 'police') {
    if (family === 'Traffic') {
      colorClass = "bg-amber-500 text-white shadow-amber-500/50";
      IconComponent = Car;
    } else {
      colorClass = "bg-blue-500 text-white shadow-blue-500/50";
      IconComponent = Shield;
    }
  }

  if (isMajor) {
    pulseClass = `
      <div class="absolute inset-0 rounded-full animate-ping-slow opacity-75 ${colorClass.split(' ')[0]}"></div>
    `;
  }

  const html = `
    <div class="relative flex items-center justify-center w-8 h-8">
      ${pulseClass}
      <div class="relative z-10 flex items-center justify-center w-8 h-8 rounded-full shadow-lg ${colorClass} border-2 border-white/20">
        ${renderToString(<IconComponent size={16} />)}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

interface IncidentMapProps {
  incidents: IncidentListResponse;
  selectedId?: number | null;
  onSelectIncident: (incident: IncidentListResponse[0]) => void;
}

export function IncidentMap({ incidents, selectedId, onSelectIncident }: IncidentMapProps) {
  const mapRef = useRef<L.Map>(null);
  const [hasValidCenter, setHasValidCenter] = useState(false);
  
  // Default to San Diego
  const defaultCenter: [number, number] = [32.7157, -117.1611];
  
  const selectedIncident = incidents.find(i => i.id === selectedId);

  // Auto-fit bounds on initial load if we have points
  useEffect(() => {
    if (mapRef.current && incidents.length > 0 && !hasValidCenter) {
      const validPoints = incidents.filter(i => i.lat && i.lng).map(i => [i.lat, i.lng] as [number, number]);
      if (validPoints.length > 0) {
        const bounds = L.latLngBounds(validPoints);
        mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
        setHasValidCenter(true);
      }
    }
  }, [incidents, hasValidCenter]);

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden border border-white/10 shadow-2xl">
      <MapContainer
        center={defaultCenter}
        zoom={11}
        className="w-full h-full"
        ref={mapRef}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {/* Map Controller for zooming to selected */}
        <MapController 
          selectedLat={selectedIncident?.lat} 
          selectedLng={selectedIncident?.lng} 
        />

        {incidents.map((incident) => {
          if (!incident.lat || !incident.lng) return null;
          
          return (
            <Marker
              key={incident.id}
              position={[incident.lat, incident.lng]}
              icon={createCustomIcon(incident.agency, incident.callTypeFamily, incident.isMajor)}
              eventHandlers={{
                click: () => onSelectIncident(incident)
              }}
            >
              <Popup className="incident-popup">
                <div className="p-3 min-w-[200px]">
                  <div className="text-xs font-mono text-muted-foreground mb-1">
                    {format(new Date(incident.time), "HH:mm:ss")} • {incident.incidentNo}
                  </div>
                  <h4 className="font-bold text-base mb-1 text-foreground">
                    {incident.callType}
                  </h4>
                  <div className="text-sm text-muted-foreground mb-2 flex items-start gap-1.5">
                    <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                    <span>{incident.location}</span>
                  </div>
                  {incident.units && incident.units.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {incident.units.map((unit, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded text-[10px] font-mono font-bold">
                          {unit}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      
      {/* Custom Map Controls Overlay */}
      <div className="absolute top-4 left-4 z-[400] flex flex-col gap-2">
        <button 
          onClick={() => mapRef.current?.zoomIn()}
          className="w-8 h-8 bg-card/80 backdrop-blur border border-white/10 rounded-lg shadow-lg flex items-center justify-center hover:bg-accent transition-colors"
        >
          <span className="text-lg font-bold">+</span>
        </button>
        <button 
          onClick={() => mapRef.current?.zoomOut()}
          className="w-8 h-8 bg-card/80 backdrop-blur border border-white/10 rounded-lg shadow-lg flex items-center justify-center hover:bg-accent transition-colors"
        >
          <span className="text-lg font-bold">-</span>
        </button>
      </div>
    </div>
  );
}
