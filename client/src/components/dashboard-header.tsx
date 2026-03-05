import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Radio, RefreshCcw, HelpCircle, Clock as ClockIcon, Volume2, VolumeX } from "lucide-react";
import { useSyncIncidents } from "@/hooks/use-incidents";
import { useSettings } from "@/hooks/use-settings";
import { type IncidentListResponse } from "@shared/routes";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DashboardHeaderProps {
  search: string;
  setSearch: (v: string) => void;
  incidents: IncidentListResponse;
}

export function DashboardHeader({ search, setSearch, incidents }: DashboardHeaderProps) {
  const syncMutation = useSyncIncidents();
  const [time, setTime] = useState(new Date());
  const { settings, setVolumeEnabled } = useSettings();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleListen = () => {
    window.open("https://www.broadcastify.com/listen/feed/20530", "_blank", "noopener,noreferrer");
  };

  return (
    <header className="sticky top-0 z-50 w-full glass-panel border-b border-white/10 px-4 py-3 sm:px-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-screen-2xl mx-auto">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/20">
              <Radio className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="font-display font-bold text-lg tracking-tight hidden sm:block text-foreground leading-none">
                SD Dispatch<span className="text-primary">.Live</span>
              </h1>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground mt-1">
                <ClockIcon className="w-3 h-3 text-primary" />
                {time.toLocaleTimeString('en-US', { hour12: false })}
              </div>
            </div>
          </div>

          <div className="relative flex-1 sm:w-64 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search units, address, type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-black/20 border-white/10 focus-visible:ring-primary/50 w-full"
              data-testid="input-search"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setVolumeEnabled(!settings.volumeEnabled)}
            title={settings.volumeEnabled ? "Mute alerts" : "Enable alerts"}
            className={`relative transition-colors ${settings.volumeEnabled ? 'text-primary' : 'text-muted-foreground'}`}
            data-testid="button-toggle-volume"
          >
            {settings.volumeEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            {settings.volumeEnabled && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary animate-ping" />
            )}
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <HelpCircle className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[420px] max-h-[85vh] overflow-y-auto bg-card border-white/10 shadow-2xl mr-4" align="end">
              <div className="space-y-5">

                {/* SDFD Response Levels */}
                <section>
                  <h4 className="font-display font-bold border-b border-white/10 pb-1 mb-2 text-sm">SDFD Response Levels</h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex gap-2">
                      <span className="font-mono font-bold text-emerald-400 w-6 shrink-0">1a</span>
                      <div><span className="text-foreground font-semibold">Basic Response</span> — 1 Engine + 1 Medic. Standard low-acuity medical or minor incident.</div>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-mono font-bold text-amber-400 w-6 shrink-0">2a</span>
                      <div><span className="text-foreground font-semibold">Enhanced Response</span> — 2 Engines + 1 Medic. Moderate-severity call requiring additional resources.</div>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-mono font-bold text-orange-400 w-6 shrink-0">3a</span>
                      <div><span className="text-foreground font-semibold">Critical Response</span> — 2 Engines + 2 Medics + 1 Battalion Chief. High-acuity medical (e.g. cardiac arrest).</div>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-mono font-bold text-red-400 w-6 shrink-0">4a</span>
                      <div><span className="text-foreground font-semibold">Major Incident</span> — 3+ Engines + 2+ Medics + BC. Multi-victim, structure fire, or mass casualty.</div>
                    </div>
                  </div>
                </section>

                {/* Common Call Types */}
                <section>
                  <h4 className="font-display font-bold border-b border-white/10 pb-1 mb-2 text-sm">Common SDFD Call Types</h4>
                  <div className="space-y-1 text-xs font-mono">
                    {[
                      ["Medical Aid", "General medical emergency — covers all 1a/2a/3a levels."],
                      ["Structure Fire", "Building fire requiring engine and truck companies."],
                      ["Brush/Vegetation Fire", "Wildland or brush fire; may involve multiple agencies."],
                      ["Traffic Accidents", "Vehicle collision, may involve extrication."],
                      ["Ringing Alarm", "Automated fire alarm activation — usually investigated by 1 engine."],
                      ["Rubbish Fire", "Small outdoor debris or dumpster fire."],
                      ["Carbon Monoxide Alarm", "CO detector activation; life-safety investigation."],
                      ["Lift Assist", "Assist a person who has fallen and cannot get up."],
                      ["Lock in/out", "Assist entry to/from locked structure."],
                      ["Smoke Check", "Investigate reported smoke odor or visible smoke."],
                      ["Stand Back Hold", "Units staged but not yet dispatched; scene not yet safe."],
                      ["Advised Incident", "Informational dispatch; no active response required."],
                      ["Structure Highrise", "Fire/medical response in a high-rise building (special protocol)."],
                      ["Single Engine Response", "Routine low-priority call requiring only 1 engine."],
                      ["Single Resource", "Requires only 1 unit of any type."],
                      ["US&R", "Urban Search & Rescue — collapse, confined space."],
                      ["Hazmat", "Hazardous materials incident."],
                    ].map(([name, def]) => (
                      <div key={name} className="flex gap-2">
                        <span className="text-primary font-bold shrink-0 w-36">{name}</span>
                        <span className="text-muted-foreground">{def}</span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Unit Type Legend */}
                <section>
                  <h4 className="font-display font-bold border-b border-white/10 pb-1 mb-2 text-sm">Unit Type Legend</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
                    <div className="flex items-center gap-2"><span className="text-red-400 font-bold w-8">E</span> Engine</div>
                    <div className="flex items-center gap-2"><span className="text-red-400 font-bold w-8">T</span> Truck (Ladder)</div>
                    <div className="flex items-center gap-2"><span className="text-emerald-400 font-bold w-8">M</span> Medic (ALS)</div>
                    <div className="flex items-center gap-2"><span className="text-emerald-400 font-bold w-8">BLS</span> Basic Life Support</div>
                    <div className="flex items-center gap-2"><span className="text-emerald-400 font-bold w-8">R</span> Rescue</div>
                    <div className="flex items-center gap-2"><span className="text-amber-400 font-bold w-8">B</span> Battalion Chief</div>
                    <div className="flex items-center gap-2"><span className="text-blue-400 font-bold w-8">BR</span> Brush Engine</div>
                    <div className="flex items-center gap-2"><span className="text-purple-400 font-bold w-8">HZM</span> Hazmat</div>
                    <div className="flex items-center gap-2"><span className="text-cyan-400 font-bold w-8">WT</span> Water Tender</div>
                    <div className="flex items-center gap-2"><span className="text-pink-400 font-bold w-8">US&R</span> Urban S&R</div>
                    <div className="flex items-center gap-2"><span className="text-slate-400 font-bold w-8">Dm</span> Duty Mechanic</div>
                  </div>
                </section>

                {/* 10-Codes */}
                <section>
                  <h4 className="font-display font-bold border-b border-white/10 pb-1 mb-2 text-sm">Common 10-Codes</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] font-mono">
                    <div><span className="text-primary">10-4</span> Acknowledged / OK</div>
                    <div><span className="text-primary">10-7</span> Out of Service</div>
                    <div><span className="text-primary">10-8</span> In Service / Available</div>
                    <div><span className="text-primary">10-19</span> Return to Station</div>
                    <div><span className="text-primary">10-20</span> Location / Position</div>
                    <div><span className="text-primary">10-21</span> Call by Telephone</div>
                    <div><span className="text-primary">10-22</span> Disregard / Cancel</div>
                    <div><span className="text-primary">10-23</span> Stand By</div>
                    <div><span className="text-primary">10-87</span> Meet an Officer</div>
                    <div><span className="text-primary">10-97</span> Arrived on Scene</div>
                    <div><span className="text-primary">10-98</span> Finished Assignment</div>
                    <div><span className="text-primary">Code 4</span> No further assistance needed</div>
                  </div>
                </section>

              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            size="sm"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="border-white/10 bg-black/20 hover:bg-white/5"
          >
            <RefreshCcw className={`w-4 h-4 mr-2 ${syncMutation.isPending ? 'animate-spin text-primary' : ''}`} />
            {syncMutation.isPending ? 'Syncing...' : 'Sync'}
          </Button>

          <Button
            onClick={handleListen}
            size="sm"
            className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white shadow-lg shadow-red-500/20 border-0"
          >
            <Radio className="w-4 h-4 mr-2 animate-pulse" />
            Listen Live
          </Button>
        </div>
      </div>
    </header>
  );
}
