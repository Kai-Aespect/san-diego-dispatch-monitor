import { format, differenceInMinutes } from "date-fns";
import { type IncidentListResponse } from "@shared/routes";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, AlertTriangle, Clock, StickyNote, CheckCircle2, Bookmark, BookmarkCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { useBookmarks } from "@/hooks/use-bookmarks";

interface IncidentCardProps {
  incident: IncidentListResponse[0];
  isSelected: boolean;
  onClick: () => void;
  onUnitClick: (e: React.MouseEvent, unit: string) => void;
}

// Extract response level prefix like "1a", "2a", "3a", "4a" from the call type string
function extractResponseLevel(callType: string): string | null {
  const match = callType.match(/^(\d+[a-z])\s/i);
  return match ? match[1].toLowerCase() : null;
}

const RESPONSE_LEVEL_COLORS: Record<string, string> = {
  "1a": "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  "2a": "bg-amber-500/15 text-amber-400 border-amber-500/30",
  "3a": "bg-orange-500/15 text-orange-400 border-orange-500/30",
  "4a": "bg-red-500/15 text-red-400 border-red-500/30",
};

export function IncidentCard({ incident, isSelected, onClick, onUnitClick }: IncidentCardProps) {
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const { isBookmarked, toggleBookmark } = useBookmarks();

  const isFire = incident.agency.toLowerCase() === 'fire';
  const isMedical = incident.callTypeFamily === 'Medical';
  const isTraffic = incident.callTypeFamily === 'Traffic';

  const isNew = !incident.acknowledged && differenceInMinutes(new Date(), new Date(incident.time)) < 15;
  const isUpdated = !incident.acknowledged && differenceInMinutes(new Date(), new Date(incident.lastUpdated)) < 5 && !isNew;
  const bookmarked = isBookmarked(incident.id);
  const responseLevel = extractResponseLevel(incident.callType);

  const handleAcknowledge = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAcknowledging(true);
    try {
      await apiRequest("PATCH", `/api/incidents/${incident.id}`, { acknowledged: true });
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
    } catch (error) {
      console.error("Failed to acknowledge incident", error);
    } finally {
      setIsAcknowledging(false);
    }
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleBookmark(incident.id);
  };

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
          : "hover:bg-accent/20 hover:border-white/10 hover:shadow-md",
        (isNew || isUpdated) && "border-primary/50 bg-primary/5 shadow-lg shadow-primary/5"
      )}
      data-testid={`card-incident-${incident.id}`}
    >
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-1",
        themeVariant === 'fire' ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" :
        themeVariant === 'police' ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" :
        themeVariant === 'medical' ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" :
        themeVariant === 'traffic' ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" : "bg-primary"
      )} />

      <div className="p-4 pl-5">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(incident.time), "HH:mm")}
            </span>
            {responseLevel && (
              <Badge
                variant="outline"
                className={cn("text-[9px] h-4 font-mono font-bold uppercase tracking-wide", RESPONSE_LEVEL_COLORS[responseLevel] || "bg-slate-500/15 text-slate-400 border-slate-500/30")}
              >
                {responseLevel}
              </Badge>
            )}
            {isNew && <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[9px] h-4">NEW</Badge>}
            {isUpdated && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[9px] h-4">UPDATED</Badge>}
            {incident.isMajor && (
              <Badge variant="destructive" className="h-5 text-[10px] uppercase tracking-wider font-bold animate-pulse shadow-lg shadow-red-500/20">
                <AlertTriangle className="w-3 h-3 mr-1" /> Major
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {(isNew || isUpdated) && (
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-[10px] font-bold bg-primary/10 hover:bg-primary/20 border-primary/20 text-primary"
                onClick={handleAcknowledge}
                disabled={isAcknowledging}
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                ACK
              </Button>
            )}
            <button
              onClick={handleBookmark}
              title={bookmarked ? "Remove bookmark" : "Track this call"}
              className={cn(
                "p-1 rounded transition-all",
                bookmarked
                  ? "text-primary opacity-100"
                  : "text-muted-foreground/40 opacity-0 group-hover:opacity-100 hover:text-primary"
              )}
              data-testid={`bookmark-${incident.id}`}
            >
              {bookmarked ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
            </button>
            <span className="text-[10px] font-mono text-muted-foreground/50">{incident.incidentNo}</span>
          </div>
        </div>

        <h3 className="font-display font-bold text-base leading-tight mb-1 text-foreground group-hover:text-primary transition-colors">
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
                data-testid={`unit-${unit}-${incident.id}`}
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
