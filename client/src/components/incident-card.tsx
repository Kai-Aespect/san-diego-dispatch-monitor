import { format, differenceInMinutes } from "date-fns";
import { type IncidentListResponse } from "@shared/routes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, AlertTriangle, Clock, StickyNote, CheckCircle2, Bookmark, BookmarkCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { getCallDescription } from "@/lib/call-descriptions";

interface IncidentCardProps {
  incident: IncidentListResponse[0];
  isSelected: boolean;
  onClick: () => void;
  onUnitClick: (e: React.MouseEvent, unit: string) => void;
}

function extractResponseLevel(callType: string): string | null {
  const match = callType.match(/^(\d+[a-z])\s/i);
  return match ? match[1].toLowerCase() : null;
}

const AGENCY_STYLES = {
  fire:    { accent: '#ef4444', glow: 'rgba(239,68,68,0.25)',    pill: 'rgba(239,68,68,0.15)',    pillText: '#fca5a5' },
  medical: { accent: '#10b981', glow: 'rgba(16,185,129,0.25)',   pill: 'rgba(16,185,129,0.15)',   pillText: '#6ee7b7' },
  police:  { accent: '#3b82f6', glow: 'rgba(59,130,246,0.25)',   pill: 'rgba(59,130,246,0.15)',   pillText: '#93c5fd' },
  traffic: { accent: '#f59e0b', glow: 'rgba(245,158,11,0.25)',   pill: 'rgba(245,158,11,0.15)',   pillText: '#fcd34d' },
  default: { accent: '#8b5cf6', glow: 'rgba(139,92,246,0.25)',   pill: 'rgba(139,92,246,0.15)',   pillText: '#c4b5fd' },
};

const RESPONSE_LEVEL_COLORS: Record<string, string> = {
  "1a": "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  "2a": "bg-amber-500/15 text-amber-400 border-amber-500/25",
  "3a": "bg-orange-500/15 text-orange-400 border-orange-500/25",
  "4a": "bg-red-500/15 text-red-400 border-red-500/25",
};

export function IncidentCard({ incident, isSelected, onClick, onUnitClick }: IncidentCardProps) {
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const { isBookmarked, toggleBookmark } = useBookmarks();

  const isFire = incident.agency.toLowerCase() === 'fire';
  const isMedical = incident.callTypeFamily === 'Medical';
  const isTraffic = incident.callTypeFamily === 'Traffic';

  const isNew = !incident.acknowledged && !incident.hasHistory && differenceInMinutes(new Date(), new Date(incident.time)) < 30;
  const isUpdated = !incident.acknowledged && incident.hasHistory;
  const bookmarked = isBookmarked(incident.id);
  const responseLevel = extractResponseLevel(incident.callType);
  const description = getCallDescription(incident.callType, incident.callTypeFamily);

  let style: typeof AGENCY_STYLES.fire;
  if (isFire) style = isMedical ? AGENCY_STYLES.medical : AGENCY_STYLES.fire;
  else style = isTraffic ? AGENCY_STYLES.traffic : AGENCY_STYLES.police;

  const handleAcknowledge = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAcknowledging(true);
    try {
      await apiRequest("PATCH", `/api/incidents/${incident.id}`, { acknowledged: true });
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
    } catch {}
    finally { setIsAcknowledging(false); }
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleBookmark(incident.id);
  };

  return (
    <div
      onClick={onClick}
      className="cursor-pointer group relative transition-all duration-200"
      data-testid={`card-incident-${incident.id}`}
      style={{
        background: isSelected
          ? `rgba(255,255,255,0.08)`
          : 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid ${isSelected ? style.accent + '33' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: '12px',
        boxShadow: isSelected
          ? `0 0 0 1px ${style.accent}20, 0 8px 24px rgba(0,0,0,0.2)`
          : '0 2px 4px rgba(0,0,0,0.1)',
        transform: isSelected ? 'translateX(2px)' : undefined,
        overflow: 'hidden',
      }}
    >
      {/* Left accent stripe */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px',
        background: style.accent,
        borderRadius: '12px 0 0 12px',
      }} />

      <div className="p-4 pl-5 relative">
        {/* Top row */}
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-mono text-muted-foreground/70 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(incident.time), "HH:mm")}
            </span>
            {responseLevel && (
              <Badge variant="outline"
                className={cn("text-[9px] h-4 font-mono font-bold uppercase tracking-wide", RESPONSE_LEVEL_COLORS[responseLevel] || "")}>
                {responseLevel}
              </Badge>
            )}
            {isNew && (
              <span className="text-[9px] font-bold uppercase tracking-wider font-mono px-1.5 py-0.5 rounded-md"
                style={{ background: 'rgba(245,158,11,0.15)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.3)' }}>
                NEW
              </span>
            )}
            {isUpdated && (
              <span className="text-[9px] font-bold uppercase tracking-wider font-mono px-1.5 py-0.5 rounded-md"
                style={{ background: 'rgba(245,158,11,0.15)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.3)' }}>
                UPDATED
              </span>
            )}
            {incident.isMajor && (
              <Badge variant="destructive" className="h-4 text-[9px] uppercase tracking-wider font-bold animate-pulse px-1.5">
                <AlertTriangle className="w-2.5 h-2.5 mr-0.5" /> Major
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {(isNew || isUpdated) && (
              <button
                onClick={handleAcknowledge}
                disabled={isAcknowledging}
                className="h-6 px-2 text-[9px] font-bold rounded-lg flex items-center gap-1 transition-all bg-blue-500/20 text-blue-400 border border-blue-500/35 hover:bg-blue-500/30"
              >
                <CheckCircle2 className="w-3 h-3" /> Acknowledge
              </button>
            )}
            <button
              onClick={handleBookmark}
              title={bookmarked ? "Remove bookmark" : "Track this call"}
              className={cn(
                "p-1 rounded-lg transition-all",
                bookmarked ? "text-primary opacity-100" : "text-muted-foreground/30 opacity-0 group-hover:opacity-100 hover:text-primary"
              )}
              data-testid={`bookmark-${incident.id}`}
            >
              {bookmarked ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
            </button>
            <span className="text-[10px] font-mono text-muted-foreground/35">{incident.incidentNo}</span>
          </div>
        </div>

        {/* Call type */}
        <h3 className="font-semibold text-[15px] leading-tight mb-0.5 transition-colors tracking-tight"
          style={{ color: isSelected ? style.pillText : undefined }}>
          {incident.callType}
        </h3>
        {incident.callTypeFamily && incident.callTypeFamily !== incident.callType && (
          <p className="text-[10px] text-muted-foreground/60 font-mono mb-0.5 leading-none tracking-wide uppercase">
            {incident.callTypeFamily}{incident.neighborhood ? ` · ${incident.neighborhood}` : ""}
          </p>
        )}
        <p className="text-[11px] text-muted-foreground/55 italic mb-2.5 leading-snug">{description}</p>

        {/* Location */}
        <div className="flex items-start gap-1.5 text-sm text-muted-foreground mb-3">
          <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-60" />
          <div className="leading-snug">
            <div className="text-[13px] text-foreground/90 font-medium">{incident.location}</div>
            {incident.crossStreets && (
              <div className="text-[11px] mt-0.5 opacity-50">× {incident.crossStreets}</div>
            )}
          </div>
        </div>

        {/* Notes & tags */}
        {(incident.notes || (incident.tags && incident.tags.length > 0)) && (
          <div className="mb-3 space-y-1.5 px-2 py-1.5 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {incident.tags && incident.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {incident.tags.map(tag => (
                  <span key={tag} className="text-[9px] font-mono px-1.5 py-0.5 rounded-md uppercase tracking-wide"
                    style={{ background: `${style.accent}15`, color: style.pillText, border: `1px solid ${style.accent}25` }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {incident.notes && (
              <div className="text-[11px] text-muted-foreground/70 line-clamp-1 flex items-center gap-1">
                <StickyNote className="w-3 h-3 shrink-0" />
                {incident.notes}
              </div>
            )}
          </div>
        )}

        {/* Units */}
        {incident.units && incident.units.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {incident.units.map((unit, idx) => (
              <button
                key={idx}
                onClick={(e) => onUnitClick(e, unit)}
                className="px-2 py-0.5 rounded-lg text-[11px] font-mono font-semibold transition-all hover:scale-105 active:scale-95"
                style={{
                  background: style.pill,
                  color: style.pillText,
                  border: `1px solid ${style.accent}30`,
                }}
                data-testid={`unit-${unit}-${incident.id}`}
              >
                {unit}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
