import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { type IncidentListResponse } from "@shared/routes";
import { Flame, Shield, Activity, Car, MapPin } from "lucide-react";
import { renderToString } from "react-dom/server";
import { useGeocodeAddresses } from "@/hooks/use-geocode";
import { useSettings } from "@/hooks/use-settings";

function MapController({ selectedLat, selectedLng }: { selectedLat?: number | null, selectedLng?: number | null }) {
  const map = useMap();
  useEffect(() => {
    const lat = Number(selectedLat);
    const lng = Number(selectedLng);
    const container = map.getContainer();
    const hasSize = container.clientWidth > 0 && container.clientHeight > 0;
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0 && hasSize) {
      try {
        map.stop();
        map.setView([lat, lng], 16, { animate: false });
      } catch (e) {
        // ignore
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
    <div class="relative flex items-center justify-center w-10 h-10" style="cursor:pointer;touch-action:none;">
      ${pulseClass}
      <div class="relative z-10 flex items-center justify-center w-10 h-10 rounded-full shadow-lg ${colorClass} border-2 border-white/20">
        ${renderToString(<IconComponent size={18} />)}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
};

interface TouchMarkerProps {
  incident: IncidentListResponse[0];
  position: [number, number];
  icon: L.DivIcon;
  onSelectIncident: (incident: IncidentListResponse[0]) => void;
}

function TouchMarker({ incident, position, icon, onSelectIncident }: TouchMarkerProps) {
  const markerRef = useRef<L.Marker>(null);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;

    const el = marker.getElement();
    if (!el) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    const onTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
    };

    const onTouchEnd = (e: TouchEvent) => {
      const dx = Math.abs(e.changedTouches[0].clientX - touchStartX);
      const dy = Math.abs(e.changedTouches[0].clientY - touchStartY);
      const dt = Date.now() - touchStartTime;
      // Only treat as a tap if finger didn't move much and duration was short
      if (dx < 15 && dy < 15 && dt < 500) {
        e.preventDefault();
        e.stopPropagation();
        onSelectIncident(incident);
      }
    };

    // Use passive:false on touchend so we can call preventDefault (stops map pan)
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: false });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [incident, onSelectIncident]);

  return (
    <Marker
      ref={markerRef}
      position={position}
      icon={icon}
      eventHandlers={{
        click: (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectIncident(incident);
        },
      }}
    />
  );
}

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
            <TouchMarker
              key={incident.id}
              incident={incident}
              position={pos}
              icon={createCustomIcon(incident.agency, incident.callTypeFamily, incident.isMajor)}
              onSelectIncident={onSelectIncident}
            />
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
