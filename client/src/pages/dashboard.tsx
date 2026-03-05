import { useState, useMemo } from "react";
import { useIncidents, useStatus } from "@/hooks/use-incidents";
import { useSettings } from "@/hooks/use-settings";
import { IncidentCard } from "@/components/incident-card";
import { IncidentMap } from "@/components/incident-map";
import { DashboardHeader } from "@/components/dashboard-header";
import { IncidentDrawer } from "@/components/incident-drawer";
import { UnitDialog } from "@/components/unit-dialog";
import { SidePanel } from "@/components/side-panel";
import { AudioNotifier } from "@/components/audio-notifier";
import { formatDistanceToNow, differenceInMinutes } from "date-fns";
import { AlertTriangle, Map as MapIcon, List, CheckCheck, History, Activity, ShieldOff } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type IncidentListResponse } from "@shared/routes";
import { apiRequest, queryClient } from "@/lib/queryClient";

type FilterMode =
  | "all"
  | "major"
  | "medical"
  | "fire_calls"
  | "traffic"
  | "new_updated"
  | "has_notes"
  | "no_units";

export default function Dashboard() {
  const { data: incidents = [], isLoading } = useIncidents();
  const { data: status } = useStatus();
  const { settings } = useSettings();

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [isAckingAll, setIsAckingAll] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [isUnitDialogOpen, setIsUnitDialogOpen] = useState(false);

  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');

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
      if (showArchived) {
        if (incident.active) return false;
      } else {
        if (!incident.active) return false;
      }

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
        case "major":
          if (!incident.isMajor) return false;
          break;
        case "medical":
          if (incident.callTypeFamily !== "Medical") return false;
          break;
        case "fire_calls":
          if (incident.agency !== "fire" || incident.callTypeFamily === "Medical") return false;
          break;
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
        case "has_notes":
          if (!incident.notes && (!incident.tags || incident.tags.length === 0)) return false;
          break;
        case "no_units":
          if (incident.units && incident.units.length > 0) return false;
          break;
      }

      return true;
    }).sort((a, b) => {
      const isNewA = !a.acknowledged && differenceInMinutes(new Date(), new Date(a.time)) < 15;
      const isUpdatedA = !a.acknowledged && !isNewA && differenceInMinutes(new Date(), new Date(a.lastUpdated)) < 5;
      const isPriorityA = isNewA || isUpdatedA;

      const isNewB = !b.acknowledged && differenceInMinutes(new Date(), new Date(b.time)) < 15;
      const isUpdatedB = !b.acknowledged && !isNewB && differenceInMinutes(new Date(), new Date(b.lastUpdated)) < 5;
      const isPriorityB = isNewB || isUpdatedB;

      if (isPriorityA && !isPriorityB) return -1;
      if (!isPriorityA && isPriorityB) return 1;
      if (a.isMajor && !b.isMajor) return -1;
      if (!a.isMajor && b.isMajor) return 1;
      return new Date(b.time).getTime() - new Date(a.time).getTime();
    });
  }, [incidents, activeTab, filterMode, search, showArchived]);

  const selectedIncident = useMemo(() =>
    incidents.find(i => i.id === selectedIncidentId) || null
  , [incidents, selectedIncidentId]);

  const handleIncidentClick = (incident: IncidentListResponse[0]) => {
    setSelectedIncidentId(incident.id);
    setIsDrawerOpen(true);
    if (mobileView === 'map') setMobileView('list');
  };

  const handleUnitClick = (e: React.MouseEvent, unit: string) => {
    e.stopPropagation();
    setSelectedUnit(unit);
    setIsUnitDialogOpen(true);
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
    <div className="min-h-screen bg-background flex flex-col h-screen overflow-hidden">
      <AudioNotifier incidents={incidents} enabled={settings.volumeEnabled} />
      <DashboardHeader search={search} setSearch={setSearch} incidents={incidents} />

      {status?.isStale && (
        <div className="bg-destructive/90 text-destructive-foreground px-4 py-2 text-sm font-medium flex items-center justify-center shadow-lg z-[60]">
          <AlertTriangle className="w-4 h-4 mr-2 animate-bounce" />
          Data may be stale. Last updated {formatDistanceToNow(new Date(status.lastUpdated))} ago.
        </div>
      )}

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden max-w-[1920px] mx-auto w-full">

        {/* Left: Call list */}
        <div className={`w-full lg:w-[420px] xl:w-[460px] flex flex-col h-full border-r border-white/5 bg-background/50 ${mobileView === 'map' ? 'hidden lg:flex' : 'flex'}`}>

          <div className="p-4 space-y-3 border-b border-white/5 bg-card/30 z-10">
            <div className="flex items-center justify-between gap-2">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
                <TabsList className="grid w-full grid-cols-3 bg-black/40 border border-white/5">
                  <TabsTrigger value="all" className="font-semibold data-[state=active]:bg-secondary">All</TabsTrigger>
                  <TabsTrigger value="fire" className="font-semibold data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400">Fire/Med</TabsTrigger>
                  <TabsTrigger value="police" className="font-semibold data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">Police</TabsTrigger>
                </TabsList>
              </Tabs>
              <Button
                variant="outline"
                size="sm"
                className={`h-9 px-3 border-white/10 ${showArchived ? 'bg-primary/20 text-primary' : 'bg-black/40 text-muted-foreground'}`}
                onClick={() => setShowArchived(!showArchived)}
                title={showArchived ? "Show Active Calls" : "Show Completed Archive"}
                data-testid="button-toggle-archive"
              >
                {showArchived ? <Activity className="w-4 h-4" /> : <History className="w-4 h-4" />}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Select value={filterMode} onValueChange={(v) => setFilterMode(v as FilterMode)}>
                <SelectTrigger className="flex-1 h-8 text-xs bg-black/30 border-white/10" data-testid="filter-select">
                  <SelectValue placeholder="Filter..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-white/10">
                  <SelectItem value="all">All Incidents</SelectItem>
                  <SelectItem value="new_updated">🔴 New / Updated</SelectItem>
                  <SelectItem value="major">⚠️ Major Incidents</SelectItem>
                  <SelectItem value="medical">🟢 Medical Calls</SelectItem>
                  <SelectItem value="fire_calls">🔥 Fire Calls Only</SelectItem>
                  <SelectItem value="traffic">🚗 Traffic / Accidents</SelectItem>
                  <SelectItem value="has_notes">📝 Has Notes or Tags</SelectItem>
                  <SelectItem value="no_units">❓ No Units Assigned</SelectItem>
                </SelectContent>
              </Select>

              {priorityCount > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2 text-xs border-primary/30 text-primary hover:bg-primary/10 whitespace-nowrap"
                  onClick={handleAcknowledgeAll}
                  disabled={isAckingAll}
                  data-testid="button-acknowledge-all"
                >
                  <CheckCheck className="w-3.5 h-3.5 mr-1" />
                  Ack All ({priorityCount})
                </Button>
              )}
            </div>

            <div className="text-xs font-mono text-muted-foreground flex justify-between">
              <span>{showArchived ? "Completed Archive" : "Active Dispatch"}</span>
              <span>
                <span className="text-foreground font-bold">{filteredIncidents.length}</span> of <span className="text-foreground font-bold">{incidents.filter(i => showArchived ? !i.active : i.active).length}</span>
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar scroll-smooth">
            {filteredIncidents.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4 p-8 text-center border-2 border-dashed border-white/5 rounded-xl">
                <div className="w-16 h-16 rounded-full bg-accent/50 flex items-center justify-center">
                  {activeTab === "police" && !showArchived
                    ? <ShieldOff className="w-8 h-8 opacity-50" />
                    : <AlertTriangle className="w-8 h-8 opacity-50" />
                  }
                </div>
                {activeTab === "police" && !showArchived ? (
                  <div className="space-y-1">
                    <p className="font-medium text-foreground/60">No active police calls</p>
                    <p className="text-xs text-muted-foreground/70 max-w-[220px]">
                      The SDPD dispatch feed may be temporarily unavailable. Data will appear automatically when the source comes back online.
                    </p>
                  </div>
                ) : (
                  <p>No {showArchived ? "completed" : "active"} incidents found.</p>
                )}
              </div>
            ) : (
              filteredIncidents.map(incident => (
                <IncidentCard
                  key={incident.id}
                  incident={incident}
                  isSelected={selectedIncidentId === incident.id}
                  onClick={() => handleIncidentClick(incident)}
                  onUnitClick={handleUnitClick}
                />
              ))
            )}
          </div>
        </div>

        {/* Middle: Map (smaller) */}
        <div className={`flex-1 relative h-full bg-slate-950 min-w-0 ${mobileView === 'list' ? 'hidden lg:block' : 'block'}`}>
          <IncidentMap
            incidents={filteredIncidents}
            selectedId={selectedIncidentId}
            onSelectIncident={handleIncidentClick}
          />
        </div>

        {/* Right: Side Panel (hidden on mobile) */}
        <div className="hidden lg:flex h-full">
          <SidePanel incidents={incidents} onSelectIncident={handleIncidentClick} />
        </div>

        {/* Mobile toggle */}
        <div className="lg:hidden absolute bottom-6 left-1/2 -translate-x-1/2 z-[500]">
          <div className="bg-card/90 backdrop-blur-md p-1 rounded-full border border-white/20 shadow-2xl flex items-center">
            <button
              onClick={() => setMobileView('list')}
              className={`px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-colors ${mobileView === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            >
              <List className="w-4 h-4" /> List
            </button>
            <button
              onClick={() => setMobileView('map')}
              className={`px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-colors ${mobileView === 'map' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            >
              <MapIcon className="w-4 h-4" /> Map
            </button>
          </div>
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

      <UnitDialog
        unit={selectedUnit}
        isOpen={isUnitDialogOpen}
        onOpenChange={(open) => {
          setIsUnitDialogOpen(open);
          if (!open) setSelectedUnit(null);
        }}
        allIncidents={incidents}
      />

    </div>
  );
}
