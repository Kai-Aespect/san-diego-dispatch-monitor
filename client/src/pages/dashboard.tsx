import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useIncidents } from "@/hooks/use-incidents";
import { useSettings } from "@/hooks/use-settings";
import { useAuth } from "@/hooks/use-auth";
import { IncidentCard } from "@/components/incident-card";
import { IncidentMap } from "@/components/incident-map";
import { DashboardHeader } from "@/components/dashboard-header";
import { IncidentDrawer } from "@/components/incident-drawer";
import { SidePanel, type PanelTab } from "@/components/side-panel";
import { AudioNotifier } from "@/components/audio-notifier";
import { AdPopup } from "@/components/ad-popup";
import { differenceInMinutes } from "date-fns";
import { AlertTriangle, Map as MapIcon, List, CheckCheck, History, Activity, ShieldOff, Menu } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type IncidentListResponse } from "@shared/routes";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

type FilterMode =
  | "all"
  | "major"
  | "medical"
  | "fire_calls"
  | "traffic"
  | "new_updated"
  | "has_notes"
  | "no_units";

const MIN_LEFT = 260;
const MAX_LEFT = 620;
const DEFAULT_LEFT = 400;

const MIN_RIGHT = 240;
const MAX_RIGHT = 560;
const DEFAULT_RIGHT = 340;

function useResizeHandle(
  initialWidth: number,
  min: number,
  max: number,
  direction: "right" | "left" = "right"
) {
  const [width, setWidth] = useState(initialWidth);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(initialWidth);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [width]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = direction === "right"
        ? e.clientX - startX.current
        : startX.current - e.clientX;
      setWidth(Math.max(min, Math.min(max, startWidth.current + delta)));
    };
    const onMouseUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [min, max, direction]);

  return { width, setWidth, onMouseDown };
}

function ResizeHandle({ onMouseDown, className }: { onMouseDown: (e: React.MouseEvent) => void; className?: string }) {
  return (
    <div
      onMouseDown={onMouseDown}
      className={cn(
        "relative flex-none w-3 h-full cursor-col-resize group z-10 select-none hover:bg-primary/5 active:bg-primary/10 transition-colors",
        className
      )}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-px h-full bg-border group-hover:bg-primary/40 group-active:bg-primary/60 transition-colors" />
      </div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-12 rounded-full bg-foreground/20 group-hover:bg-primary/50 group-active:bg-primary/70 transition-colors shadow-sm" />
    </div>
  );
}

export default function Dashboard() {
  const { isSubscribed } = useAuth();
  const { settings } = useSettings();
  const refetchInterval = settings.fastRefresh && isSubscribed ? 30000 : 60000;
  const { data: incidents = [], isLoading } = useIncidents(refetchInterval);

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [isAckingAll, setIsAckingAll] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [sidePanelTab, setSidePanelTab] = useState<PanelTab>("bookmarks");
  const [focusUnitId, setFocusUnitId] = useState<string | null>(null);

  const [mobileView, setMobileView] = useState<"list" | "map">("list");

  const leftResize = useResizeHandle(DEFAULT_LEFT, MIN_LEFT, MAX_LEFT, "right");
  const rightResize = useResizeHandle(DEFAULT_RIGHT, MIN_RIGHT, MAX_RIGHT, "left");

  const priorityCount = useMemo(() => incidents.filter(i => {
    const isNew = !i.acknowledged && differenceInMinutes(new Date(), new Date(i.time)) < 15;
    const isUpdated = !i.acknowledged && !isNew && differenceInMinutes(new Date(), new Date(i.lastUpdated)) < 5;
    return isNew || isUpdated;
  }).length, [incidents]);

  const handleAcknowledgeAll = async () => {
    setIsAckingAll(true);
    try {
      await apiRequest("POST", "/api/incidents/acknowledge-all", {});
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
    } catch (e) {
      console.error("Acknowledge all failed", e);
    } finally {
      setIsAckingAll(false);
    }
  };

  const filteredIncidents = useMemo(() => {
    return incidents.filter(incident => {
      if (showArchived ? incident.active : !incident.active) return false;
      if (activeTab === "fire" && incident.agency.toLowerCase() !== "fire") return false;
      if (activeTab === "police" && incident.agency.toLowerCase() !== "police") return false;

      if (search) {
        const q = search.toLowerCase();
        const matchesUnit = incident.units?.some(u => u.toLowerCase().includes(q));
        const matchesText =
          incident.incidentNo.toLowerCase().includes(q) ||
          incident.callType.toLowerCase().includes(q) ||
          incident.location.toLowerCase().includes(q) ||
          incident.neighborhood?.toLowerCase().includes(q);
        if (!matchesUnit && !matchesText) return false;
      }

      switch (filterMode) {
        case "major": if (!incident.isMajor) return false; break;
        case "medical": if (incident.callTypeFamily !== "Medical") return false; break;
        case "fire_calls": if (incident.agency !== "fire" || incident.callTypeFamily === "Medical") return false; break;
        case "traffic":
          if (!incident.callTypeFamily?.toLowerCase().includes("traffic") &&
              !incident.callType?.toLowerCase().includes("traffic") &&
              !incident.callType?.toLowerCase().includes("accident")) return false;
          break;
        case "new_updated": {
          const isNew = !incident.acknowledged && differenceInMinutes(new Date(), new Date(incident.time)) < 15;
          const isUpdated = !incident.acknowledged && !isNew && differenceInMinutes(new Date(), new Date(incident.lastUpdated)) < 5;
          if (!isNew && !isUpdated) return false;
          break;
        }
        case "has_notes": if (!incident.notes && (!incident.tags || incident.tags.length === 0)) return false; break;
        case "no_units": if (incident.units && incident.units.length > 0) return false; break;
        case "police_only": if (incident.agency !== "police") return false; break;
        case "non_medical": if (incident.callTypeFamily === "Medical") return false; break;
      }
      return true;
    }).sort((a, b) => {
      const isPriority = (i: typeof a) => {
        const isNew = !i.acknowledged && differenceInMinutes(new Date(), new Date(i.time)) < 15;
        const isUpdated = !i.acknowledged && !isNew && differenceInMinutes(new Date(), new Date(i.lastUpdated)) < 5;
        return isNew || isUpdated;
      };
      if (isPriority(a) && !isPriority(b)) return -1;
      if (!isPriority(a) && isPriority(b)) return 1;
      return new Date(b.time).getTime() - new Date(a.time).getTime();
    });
  }, [incidents, activeTab, filterMode, search, showArchived]);

  const selectedIncident = useMemo(
    () => incidents.find(i => i.id === selectedIncidentId) || null,
    [incidents, selectedIncidentId]
  );

  const handleIncidentClick = (incident: IncidentListResponse[0]) => {
    setSelectedIncidentId(incident.id);
    setIsDrawerOpen(true);
  };

  const handleUnitClick = (e: React.MouseEvent, unit: string) => {
    e.stopPropagation();
    setFocusUnitId(unit);
    setSidePanelTab("units");
  };

  const callListProps = {
    activeTab, setActiveTab, showArchived, setShowArchived,
    filterMode, setFilterMode, priorityCount, isAckingAll, handleAcknowledgeAll,
    filteredIncidents, incidents, selectedIncidentId, handleIncidentClick, handleUnitClick,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <h2 className="font-display font-bold text-xl animate-pulse text-muted-foreground">Initializing Dispatch...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background flex flex-col h-screen overflow-hidden">
      <AudioNotifier incidents={incidents} enabled={settings.volumeEnabled} />
      <AdPopup />
      <DashboardHeader search={search} setSearch={setSearch} incidents={incidents} />

      {/* ── DESKTOP layout (lg+): three resizable panels ── */}
      <main className="hidden lg:flex flex-1 overflow-hidden min-h-0">

        {/* Left panel */}
        <div
          className="flex flex-col h-full shrink-0 overflow-hidden border-r border-border bg-card/40 backdrop-blur-xl"
          style={{ width: leftResize.width }}
        >
          <CallListContent {...callListProps} />
        </div>

        <ResizeHandle onMouseDown={leftResize.onMouseDown} />

        {/* Map */}
        <div className="flex-1 min-w-0 relative bg-slate-950">
          <IncidentMap
            incidents={filteredIncidents}
            selectedId={selectedIncidentId}
            onSelectIncident={handleIncidentClick}
          />
        </div>

        <ResizeHandle onMouseDown={rightResize.onMouseDown} />

        {/* Right side panel */}
        <div
          className="flex flex-col h-full shrink-0 overflow-hidden border-l border-border bg-card/40 backdrop-blur-xl"
          style={{ width: rightResize.width }}
        >
          <SidePanel
            incidents={incidents}
            onSelectIncident={handleIncidentClick}
            activeTab={sidePanelTab}
            setActiveTab={setSidePanelTab}
            focusUnitId={focusUnitId}
          />
        </div>
      </main>

      {/* ── MOBILE layout (<lg): toggled list / map ── */}
      <main className="flex lg:hidden flex-1 overflow-hidden min-h-0 relative">
        <div className={cn("absolute inset-0 flex flex-col", mobileView !== "list" && "hidden")}>
          <CallListContent {...callListProps} />
        </div>
        <div className={cn("absolute inset-0 bg-slate-950", mobileView === "map" ? "block" : "hidden")}>
          <IncidentMap
            incidents={filteredIncidents}
            selectedId={selectedIncidentId}
            onSelectIncident={handleIncidentClick}
          />
        </div>

        {/* Mobile toggle pill */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-2">
          <div className="bg-card/90 backdrop-blur-md p-1 rounded-full border border-white/20 shadow-2xl flex items-center">
            <button
              onClick={() => setMobileView("list")}
              className={cn(
                "px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-colors",
                mobileView === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              )}
            >
              <List className="w-4 h-4" /> List
            </button>
            <button
              onClick={() => setMobileView("map")}
              className={cn(
                "px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-colors",
                mobileView === "map" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              )}
            >
              <MapIcon className="w-4 h-4" /> Map
            </button>
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="rounded-full w-12 h-12 bg-card/90 backdrop-blur-md border-white/20 shadow-2xl">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="p-0 w-80 bg-background border-l-white/10">
              <SidePanel
                incidents={incidents}
                onSelectIncident={handleIncidentClick}
                activeTab={sidePanelTab}
                setActiveTab={setSidePanelTab}
                focusUnitId={focusUnitId}
              />
            </SheetContent>
          </Sheet>
        </div>
      </main>

      <IncidentDrawer
        incident={selectedIncident}
        isOpen={isDrawerOpen}
        onOpenChange={(open) => {
          setIsDrawerOpen(open);
          if (!open) setSelectedIncidentId(null);
        }}
      />

    </div>
  );
}

interface CallListContentProps {
  activeTab: string;
  setActiveTab: (t: string) => void;
  showArchived: boolean;
  setShowArchived: (v: boolean) => void;
  filterMode: FilterMode;
  setFilterMode: (v: FilterMode) => void;
  priorityCount: number;
  isAckingAll: boolean;
  handleAcknowledgeAll: () => void;
  filteredIncidents: IncidentListResponse;
  incidents: IncidentListResponse;
  selectedIncidentId: number | null;
  handleIncidentClick: (inc: IncidentListResponse[0]) => void;
  handleUnitClick: (e: React.MouseEvent, unit: string) => void;
}

function CallListContent({
  activeTab, setActiveTab, showArchived, setShowArchived,
  filterMode, setFilterMode, priorityCount, isAckingAll, handleAcknowledgeAll,
  filteredIncidents, incidents, selectedIncidentId, handleIncidentClick, handleUnitClick,
}: CallListContentProps) {
  return (
    <>
      <div className="p-3 space-y-2.5 z-10 shrink-0 border-b border-border bg-card/40 backdrop-blur-md">
        <div className="flex items-center justify-between gap-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="grid w-full grid-cols-3 bg-muted/60 border border-border">
              <TabsTrigger value="all" className="text-xs font-semibold data-[state=active]:bg-background transition-none">All</TabsTrigger>
              <TabsTrigger value="fire" className="text-xs font-semibold data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400 transition-none">Fire/Med</TabsTrigger>
              <TabsTrigger value="police" className="text-xs font-semibold data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 transition-none">Police</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant="outline"
            size="sm"
            className={cn("h-9 w-9 p-0 border-border shrink-0", showArchived ? "bg-primary/20 text-primary" : "bg-muted/60 text-muted-foreground")}
            onClick={() => setShowArchived(!showArchived)}
            title={showArchived ? "Show Active Calls" : "Show Completed Archive"}
            data-testid="button-toggle-archive"
          >
            {showArchived ? <Activity className="w-4 h-4" /> : <History className="w-4 h-4" />}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Select value={filterMode} onValueChange={(v) => setFilterMode(v as FilterMode)}>
            <SelectTrigger className="flex-1 h-8 text-xs bg-muted/60 border-border" data-testid="filter-select">
              <SelectValue placeholder="Filter..." />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">All Incidents</SelectItem>
              <SelectItem value="new_updated">New / Updated</SelectItem>
              <SelectItem value="major">Major Incidents</SelectItem>
              <SelectItem value="medical">Medical Calls</SelectItem>
              <SelectItem value="fire_calls">Fire Calls Only</SelectItem>
              <SelectItem value="traffic">Traffic / Accidents</SelectItem>
              <SelectItem value="has_notes">Has Notes or Tags</SelectItem>
              <SelectItem value="no_units">No Units Assigned</SelectItem>
              <SelectItem value="police_only">Police Calls Only</SelectItem>
              <SelectItem value="non_medical">Non-Medical (All)</SelectItem>
            </SelectContent>
          </Select>

          {priorityCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2 text-xs border-primary/30 text-primary hover:bg-primary/10 whitespace-nowrap shrink-0 ml-auto"
              onClick={handleAcknowledgeAll}
              disabled={isAckingAll}
              data-testid="button-acknowledge-all"
            >
              <CheckCheck className="w-3.5 h-3.5 mr-1" />
              Ack ({priorityCount})
            </Button>
          )}
        </div>

        <div className="text-[10px] font-mono text-muted-foreground flex justify-between">
          <span>{showArchived ? "Completed Archive" : "Active Dispatch"}</span>
          <span>
            <span className="text-foreground font-bold">{filteredIncidents.length}</span>
            {" / "}
            <span className="text-foreground font-bold">{incidents.filter(i => showArchived ? !i.active : i.active).length}</span>
          </span>
        </div>
        {showArchived && (
          <div className="bg-amber-500/8 border border-amber-500/15 rounded-lg px-2.5 py-1.5 flex items-start gap-1.5">
            <AlertTriangle className="w-3 h-3 text-amber-400/70 shrink-0 mt-0.5" />
            <p className="text-[9px] text-amber-400/70 leading-relaxed">
              Past calls are stored for <span className="font-bold">3 days</span> then removed. Analytics data is retained indefinitely as daily totals.
            </p>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 pb-24 space-y-2.5 custom-scrollbar" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        {filteredIncidents.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4 p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-accent/50 flex items-center justify-center">
              {activeTab === "police" && !showArchived
                ? <ShieldOff className="w-7 h-7 opacity-50" />
                : <AlertTriangle className="w-7 h-7 opacity-50" />
              }
            </div>
            {activeTab === "police" && !showArchived ? (
              <div className="space-y-1">
                <p className="font-medium text-sm text-foreground/60">No active police calls</p>
                <p className="text-xs text-muted-foreground/70 max-w-[220px]">
                  The SDPD dispatch feed may be temporarily unavailable. Data will appear automatically when the source comes back online.
                </p>
              </div>
            ) : (
              <p className="text-sm">No {showArchived ? "completed" : "active"} incidents found.</p>
            )}
          </div>
        ) : (
          <>
            {filteredIncidents.map(incident => (
              <IncidentCard
                key={incident.id}
                incident={incident}
                isSelected={selectedIncidentId === incident.id}
                onClick={() => handleIncidentClick(incident)}
                onUnitClick={handleUnitClick}
              />
            ))}
          </>
        )}
      </div>
    </>
  );
}
