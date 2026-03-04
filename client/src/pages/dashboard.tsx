import { useState, useMemo } from "react";
import { useIncidents, useStatus } from "@/hooks/use-incidents";
import { IncidentCard } from "@/components/incident-card";
import { IncidentMap } from "@/components/incident-map";
import { DashboardHeader } from "@/components/dashboard-header";
import { IncidentDrawer } from "@/components/incident-drawer";
import { UnitDialog } from "@/components/unit-dialog";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, Map as MapIcon, List, Filter } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toggle } from "@/components/ui/toggle";
import { type IncidentListResponse } from "@shared/routes";

export default function Dashboard() {
  const { data: incidents = [], isLoading, error } = useIncidents();
  const { data: status } = useStatus();

  // State
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [showMajorOnly, setShowMajorOnly] = useState(false);
  
  const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [isUnitDialogOpen, setIsUnitDialogOpen] = useState(false);

  // Responsive view toggle for mobile
  const [mobileView, setMobileView] = useState<'list'|'map'>('list');

  // Filtering Logic
  const filteredIncidents = useMemo(() => {
    return incidents.filter(incident => {
      // Tab filter
      if (activeTab === "fire" && incident.agency.toLowerCase() !== "fire") return false;
      if (activeTab === "police" && incident.agency.toLowerCase() !== "police") return false;
      
      // Major filter
      if (showMajorOnly && !incident.isMajor) return false;

      // Search filter (global)
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

      return true;
    }).sort((a, b) => {
      // Sort: Major first, then most recent
      if (a.isMajor && !b.isMajor) return -1;
      if (!a.isMajor && b.isMajor) return 1;
      return new Date(b.time).getTime() - new Date(a.time).getTime();
    });
  }, [incidents, activeTab, showMajorOnly, search]);

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

  // Loading State
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
      <DashboardHeader search={search} setSearch={setSearch} incidents={incidents} />

      {/* Stale Data Warning */}
      {status?.isStale && (
        <div className="bg-destructive/90 text-destructive-foreground px-4 py-2 text-sm font-medium flex items-center justify-center shadow-lg z-[60]">
          <AlertTriangle className="w-4 h-4 mr-2 animate-bounce" />
          Data may be stale. Last updated {formatDistanceToNow(new Date(status.lastUpdated))} ago.
        </div>
      )}

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden max-w-[1920px] mx-auto w-full">
        
        {/* Left Panel: List & Controls */}
        <div className={`w-full lg:w-[450px] xl:w-[500px] flex flex-col h-full border-r border-white/5 bg-background/50 ${mobileView === 'map' ? 'hidden lg:flex' : 'flex'}`}>
          
          <div className="p-4 space-y-4 border-b border-white/5 bg-card/30 z-10">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-black/40 border border-white/5">
                <TabsTrigger value="all" className="font-semibold data-[state=active]:bg-secondary">All</TabsTrigger>
                <TabsTrigger value="fire" className="font-semibold data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400">Fire/Med</TabsTrigger>
                <TabsTrigger value="police" className="font-semibold data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">Police</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center justify-between">
              <div className="text-sm font-mono text-muted-foreground">
                <span className="text-foreground font-bold">{filteredIncidents.length}</span> active
              </div>
              <Toggle 
                pressed={showMajorOnly} 
                onPressedChange={setShowMajorOnly}
                variant="outline"
                size="sm"
                className="h-8 border-white/10 data-[state=on]:bg-destructive/20 data-[state=on]:text-destructive-foreground data-[state=on]:border-destructive/50"
              >
                <Filter className="w-3 h-3 mr-2" />
                Major Only
              </Toggle>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar scroll-smooth">
            {filteredIncidents.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4 p-8 text-center border-2 border-dashed border-white/5 rounded-xl">
                <div className="w-16 h-16 rounded-full bg-accent/50 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 opacity-50" />
                </div>
                <p>No active incidents matching your filters.</p>
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

        {/* Right Panel: Map */}
        <div className={`flex-1 relative h-full bg-slate-950 ${mobileView === 'list' ? 'hidden lg:block' : 'block'}`}>
          <IncidentMap 
            incidents={filteredIncidents}
            selectedId={selectedIncidentId}
            onSelectIncident={handleIncidentClick}
          />
        </div>

        {/* Mobile View Toggle */}
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

      {/* Drawers and Dialogs */}
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
