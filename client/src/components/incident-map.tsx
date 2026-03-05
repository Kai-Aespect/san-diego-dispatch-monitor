import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { type IncidentListResponse } from "@shared/routes";
import { Flame, Shield, Activity, Car, MapPin } from "lucide-react";
import { renderToString } from "react-dom/server";
import { format } from "date-fns";
import { useGeocodeAddresses } from "@/hooks/use-geocode";
import { useSettings } from "@/hooks/use-settings";

function MapController({ selectedLat, selectedLng }: { selectedLat?: number | null, selectedLng?: number | null }) {
  const map = useMap();
  useEffect(() => {
    const lat = Number(selectedLat);
    const lng = Number(selectedLng);
    // Only fly if coordinates are valid AND the map container has visible dimensions
    // (prevents crash when map is hidden behind the list view on mobile)
    const container = map.getContainer();
    const hasSize = container.clientWidth > 0 && container.clientHeight > 0;
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0 && hasSize) {
      try {
        // Use setView with animate:false to avoid async animation frames
        // that crash when the map container gets hidden mid-flight
        map.stop();
        map.setView([lat, lng], 16, { animate: false });
      } catch (e) {
        // Silently ignore errors (e.g. map not ready)
      }
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
    pulseClass = `<div class="absolute inset-0 rounded-full animate-ping-slow opacity-75 ${colorClass.split(' ')[0]}"></div>`;
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
  const hasValidCenter = useRef(false);
  const defaultCenter: [number, number] = [32.7157, -117.1611];
  const { settings } = useSettings();

  const isDark = settings.theme === "dark";
  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  const selectedIncident = incidents.find(i => i.id === selectedId);

  const addressesNeedingGeocode = incidents
    .filter(i => (!i.lat || !i.lng) && i.location && i.location !== "Unknown")
    .map(i => i.location);

  const geocodedCoords = useGeocodeAddresses(addressesNeedingGeocode);

  const getPosition = (incident: IncidentListResponse[0]): [number, number] | null => {
    if (incident.lat && incident.lng) return [incident.lat, incident.lng];
    const fromGeocode = geocodedCoords[incident.location];
    return fromGeocode ?? null;
  };

  const allPositions = incidents.map(getPosition).filter(Boolean) as [number, number][];

  useEffect(() => {
    if (mapRef.current && allPositions.length > 0 && !hasValidCenter.current) {
      const bounds = L.latLngBounds(allPositions);
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      hasValidCenter.current = true;
    }
  }, [allPositions.length]);

  const selectedPos = selectedIncident ? getPosition(selectedIncident) : null;

  useEffect(() => {
    if (mapRef.current) {
      const resizeObserver = new ResizeObserver(() => {
        mapRef.current?.invalidateSize();
      });
      const container = mapRef.current.getContainer();
      resizeObserver.observe(container);
      return () => resizeObserver.disconnect();
    }
  }, []);

  return (
    <div className="w-full h-full relative overflow-hidden z-0 bg-slate-950">
      <MapContainer
        center={defaultCenter}
        zoom={11}
        className="w-full h-full"
        ref={mapRef}
        zoomControl={false}
      >
        <TileLayer
          key={tileUrl}
          attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
          url={tileUrl}
        />

        <MapController
          selectedLat={selectedPos?.[0]}
          selectedLng={selectedPos?.[1]}
        />

        {incidents.map((incident) => {
          const pos = getPosition(incident);
          if (!pos) return null;

          return (
            <Marker
              key={incident.id}
              position={pos}
              icon={createCustomIcon(incident.agency, incident.callTypeFamily, incident.isMajor)}
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e);
                  onSelectIncident(incident);
                },
                touchend: (e) => {
                  L.DomEvent.stopPropagation(e);
                  onSelectIncident(incident);
                }
              }}
            >
              <Popup className="incident-popup" closeButton={false}>
                <div className="p-3 min-w-[200px] bg-card text-card-foreground rounded-lg shadow-xl border border-white/10">
                  <div className="text-[10px] font-mono text-muted-foreground mb-1 flex justify-between">
                    <span>{format(new Date(incident.time), "HH:mm:ss")}</span>
                    <span>{incident.incidentNo}</span>
                  </div>
                  <h4 className="font-bold text-sm mb-2 text-primary border-b border-white/5 pb-1">
                    {incident.callType}
                  </h4>
                  <div className="text-xs text-muted-foreground mb-2 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-primary" />
                    <span className="leading-tight">{incident.location}</span>
                  </div>
                  {incident.units && incident.units.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-white/5">
                      {incident.units.map((unit, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[9px] font-mono font-bold">
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

      <div className="absolute top-4 left-4 z-[400] flex flex-col gap-2">
        <button
          onClick={() => mapRef.current?.zoomIn()}
          className="w-8 h-8 bg-card/80 backdrop-blur border border-white/10 rounded-lg shadow-lg flex items-center justify-center hover:bg-accent transition-colors font-bold text-lg"
        >+</button>
        <button
          onClick={() => mapRef.current?.zoomOut()}
          className="w-8 h-8 bg-card/80 backdrop-blur border border-white/10 rounded-lg shadow-lg flex items-center justify-center hover:bg-accent transition-colors font-bold text-lg"
        >−</button>
      </div>

      <div className="absolute bottom-3 right-3 z-[400]">
        {addressesNeedingGeocode.length > Object.keys(geocodedCoords).length && (
          <div className="text-[10px] font-mono bg-card/80 backdrop-blur border border-white/10 rounded px-2 py-1 text-muted-foreground">
            Locating {addressesNeedingGeocode.length - Object.keys(geocodedCoords).length} calls...
          </div>
        )}
      </div>
    </div>
  );
}
