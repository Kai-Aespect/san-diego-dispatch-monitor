import { format, differenceInMinutes } from "date-fns";
import { type IncidentListResponse } from "@shared/routes";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MapPin, AlertTriangle, Clock, Tag, StickyNote } from "lucide-react";
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
  
  const isNew = differenceInMinutes(new Date(), new Date(incident.time)) < 15;
  const isUpdated = differenceInMinutes(new Date(), new Date(incident.lastUpdated)) < 5 && !isNew;

  let themeVariant: "fire" | "police" | "medical" | "traffic" | "default" = "default";
  if (isFire) themeVariant = isMedical ? "medical" : "fire";
  else if (!isFire) themeVariant = isTraffic ? "traffic" : "police";

  return (
    <Card 
      onClick={onClick}
      className={cn(
        "cursor-pointer transition-all duration-200 overflow-hidden relative group border-white/5",
        isSelected 
          ? "ring-2 ring-primary bg-accent/40 shadow-xl translate-x-1" 
          : "hover:bg-accent/20 hover:border-white/10 hover:shadow-md"
      )}
    >
      {/* Status indicator line */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-1",
        themeVariant === 'fire' ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" :
        themeVariant === 'police' ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" :
        themeVariant === 'medical' ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" :
        themeVariant === 'traffic' ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" : "bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]"
      )} />

      <div className="p-4 pl-5">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(incident.time), "HH:mm")}
            </span>
            {isNew && <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[9px] h-4">NEW</Badge>}
            {isUpdated && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[9px] h-4">UPDATED</Badge>}
            {incident.isMajor && (
              <Badge variant="destructive" className="h-5 text-[10px] uppercase tracking-wider font-bold animate-pulse shadow-lg shadow-red-500/20">
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
          </div>
        </div>

        {/* Notes & Tags Preview */}
        {(incident.notes || (incident.tags && incident.tags.length > 0)) && (
          <div className="mb-3 space-y-2 p-2 bg-black/20 rounded border border-white/5">
            {incident.tags && incident.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {incident.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-[9px] h-4 border-primary/30 text-primary py-0 px-1">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            {incident.notes && (
              <div className="text-[11px] text-muted-foreground line-clamp-1 flex items-center gap-1">
                <StickyNote className="w-3 h-3 shrink-0" />
                {incident.notes}
              </div>
            )}
          </div>
        )}

        {incident.units && incident.units.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {incident.units.map((unit, idx) => (
              <button
                key={idx}
                onClick={(e) => onUnitClick(e, unit)}
                className={cn(
                  "px-2 py-0.5 rounded text-xs font-mono font-bold transition-transform hover:scale-110 active:scale-95 shadow-sm",
                  themeVariant === 'fire' ? "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20" :
                  themeVariant === 'police' ? "bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20" :
                  themeVariant === 'medical' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20" :
                  themeVariant === 'traffic' ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20" : 
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
