import { format } from "date-fns";
import { type IncidentListResponse } from "@shared/routes";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MapPin, AlertTriangle, Clock, Map } from "lucide-react";
import { cn } from "@/lib/utils";

interface IncidentCardProps {
  incident: IncidentListResponse[0];
  isSelected: boolean;
  onClick: () => void;
  onUnitClick: (e: React.MouseEvent, unit: string) => void;
}

export function IncidentCard({ incident, isSelected, onClick, onUnitClick }: IncidentCardProps) {
  const isFire = incident.agency.toLowerCase() === 'fire';
  const isMedical = incident.callTypeFamily === 'Medical';
  const isTraffic = incident.callTypeFamily === 'Traffic';
  
  let themeVariant: "fire" | "police" | "medical" | "traffic" | "default" = "default";
  if (isFire) themeVariant = isMedical ? "medical" : "fire";
  else if (!isFire) themeVariant = isTraffic ? "traffic" : "police";

  return (
    <Card 
      onClick={onClick}
      className={cn(
        "cursor-pointer transition-all duration-200 overflow-hidden relative group border-white/5",
        isSelected 
          ? "ring-2 ring-primary bg-accent/30 shadow-lg translate-x-1" 
          : "hover:bg-accent/20 hover:border-white/10 hover:shadow-md"
      )}
    >
      {/* Status indicator line */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-1",
        themeVariant === 'fire' ? "bg-red-500" :
        themeVariant === 'police' ? "bg-blue-500" :
        themeVariant === 'medical' ? "bg-emerald-500" :
        themeVariant === 'traffic' ? "bg-amber-500" : "bg-primary"
      )} />

      <div className="p-4 pl-5">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(incident.time), "HH:mm")}
            </span>
            {incident.isMajor && (
              <Badge variant="destructive" className="h-5 text-[10px] uppercase tracking-wider font-bold animate-pulse">
                <AlertTriangle className="w-3 h-3 mr-1" /> Major
              </Badge>
            )}
          </div>
          <span className="text-[10px] font-mono text-muted-foreground/50">{incident.incidentNo}</span>
        </div>

        <h3 className="font-display font-bold text-lg leading-tight mb-1 text-foreground group-hover:text-primary transition-colors">
          {incident.callType}
        </h3>

        <div className="flex items-start gap-1.5 text-sm text-muted-foreground mb-3">
          <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="leading-snug">
            <div className="text-foreground/90 font-medium">{incident.location}</div>
            {incident.crossStreets && (
              <div className="text-xs mt-0.5 opacity-70">x: {incident.crossStreets}</div>
            )}
            {incident.neighborhood && (
              <div className="text-xs mt-0.5 font-mono text-primary/70">{incident.neighborhood}</div>
            )}
          </div>
        </div>

        {incident.units && incident.units.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {incident.units.map((unit, idx) => (
              <button
                key={idx}
                onClick={(e) => onUnitClick(e, unit)}
                className={cn(
                  "px-2 py-0.5 rounded text-xs font-mono font-bold transition-transform hover:scale-105 active:scale-95",
                  themeVariant === 'fire' ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" :
                  themeVariant === 'police' ? "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20" :
                  themeVariant === 'medical' ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" :
                  themeVariant === 'traffic' ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20" : 
                  "bg-secondary text-secondary-foreground"
                )}
              >
                {unit}
              </button>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
