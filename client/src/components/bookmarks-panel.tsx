import { useBookmarks } from "@/hooks/use-bookmarks";
import { type IncidentListResponse } from "@shared/routes";
import { Bookmark, BookmarkX, MapPin, Clock, Flame, Shield, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface BookmarksPanelProps {
  incidents: IncidentListResponse;
  onSelectIncident: (inc: IncidentListResponse[0]) => void;
}

export function BookmarksPanel({ incidents, onSelectIncident }: BookmarksPanelProps) {
  const { bookmarkedIds, toggleBookmark } = useBookmarks();

  const bookmarked = incidents.filter(i => bookmarkedIds.includes(i.id));
  const active = bookmarked.filter(i => i.active);
  const archived = bookmarked.filter(i => !i.active);

  if (bookmarkedIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-accent/30 flex items-center justify-center">
          <Bookmark className="w-8 h-8 opacity-40" />
        </div>
        <div>
          <p className="font-semibold text-sm text-foreground">No tracked calls</p>
          <p className="text-xs mt-1">Click the bookmark icon on any call card to track it here.</p>
        </div>
      </div>
    );
  }

  const renderCard = (inc: IncidentListResponse[0]) => {
    const isFire = inc.agency === "fire";
    const isMedical = inc.callTypeFamily === "Medical";
    let color = "blue";
    if (isFire && !isMedical) color = "red";
    else if (isMedical) color = "green";
    else if (inc.callTypeFamily?.toLowerCase().includes("traffic")) color = "amber";

    const colorMap: Record<string, string> = {
      red: "border-red-500/30 bg-red-500/5",
      green: "border-emerald-500/30 bg-emerald-500/5",
      blue: "border-blue-500/30 bg-blue-500/5",
      amber: "border-amber-500/30 bg-amber-500/5",
    };

    const barMap: Record<string, string> = {
      red: "bg-red-500",
      green: "bg-emerald-500",
      blue: "bg-blue-500",
      amber: "bg-amber-500",
    };

    return (
      <div
        key={inc.id}
        className={cn(
          "relative rounded-xl border overflow-hidden transition-all duration-200 cursor-pointer group hover:shadow-lg",
          colorMap[color],
          !inc.active && "opacity-60"
        )}
        onClick={() => onSelectIncident(inc)}
        data-testid={`bookmark-card-${inc.id}`}
      >
        <div className={cn("absolute left-0 top-0 bottom-0 w-1", barMap[color])} />
        <div className="p-3 pl-4">
          <div className="flex items-start justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              {isFire ? <Flame className="w-3.5 h-3.5 text-red-400" /> : <Shield className="w-3.5 h-3.5 text-blue-400" />}
              <span className="text-[10px] font-mono text-muted-foreground">{inc.incidentNo}</span>
              {!inc.active && <Badge variant="outline" className="text-[8px] h-3.5 px-1 border-muted-foreground/20 text-muted-foreground">CLOSED</Badge>}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); toggleBookmark(inc.id); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-0.5"
              title="Remove bookmark"
            >
              <BookmarkX className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="font-bold text-sm text-foreground leading-tight mb-1.5">{inc.callType}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{inc.location}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
              <Clock className="w-3 h-3" />
              {format(new Date(inc.time), "HH:mm")} · {formatDistanceToNow(new Date(inc.time), { addSuffix: true })}
            </div>
            {inc.units && inc.units.length > 0 && (
              <span className="text-[10px] font-mono text-muted-foreground">{inc.units.length} units</span>
            )}
          </div>
          {inc.units && inc.units.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {inc.units.slice(0, 4).map((u, i) => (
                <span key={i} className="text-[9px] font-mono px-1 py-0.5 bg-black/20 rounded">{u}</span>
              ))}
              {inc.units.length > 4 && <span className="text-[9px] text-muted-foreground">+{inc.units.length - 4}</span>}
            </div>
          )}
          <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-1 text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">
            <ExternalLink className="w-3 h-3" /> Open details
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar">
      {active.length > 0 && (
        <div>
          <div className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Active ({active.length})
          </div>
          <div className="space-y-2">{active.map(renderCard)}</div>
        </div>
      )}
      {archived.length > 0 && (
        <div>
          <div className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Closed ({archived.length})
          </div>
          <div className="space-y-2">{archived.map(renderCard)}</div>
        </div>
      )}
    </div>
  );
}
