import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Radio, RefreshCcw, HelpCircle, Clock as ClockIcon } from "lucide-react";
import { AudioNotifier } from "./audio-notifier";
import { useSyncIncidents } from "@/hooks/use-incidents";
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
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <AudioNotifier incidents={incidents} />
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <HelpCircle className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] max-h-[80vh] overflow-y-auto bg-card border-white/10 shadow-2xl mr-4" align="end">
              <div className="space-y-4">
                <section>
                  <h4 className="font-display font-bold border-b border-white/10 pb-1 mb-2">Unit Type Legend</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
                    <div className="flex items-center gap-2"><span className="text-red-400 font-bold w-8">E</span> Engine</div>
                    <div className="flex items-center gap-2"><span className="text-red-400 font-bold w-8">T</span> Truck</div>
                    <div className="flex items-center gap-2"><span className="text-emerald-400 font-bold w-8">M</span> Medic (Ambulance)</div>
                    <div className="flex items-center gap-2"><span className="text-emerald-400 font-bold w-8">R</span> Rescue</div>
                    <div className="flex items-center gap-2"><span className="text-amber-400 font-bold w-8">B</span> Battalion Chief</div>
                    <div className="flex items-center gap-2"><span className="text-blue-400 font-bold w-8">BR</span> Brush Engine</div>
                    <div className="flex items-center gap-2"><span className="text-purple-400 font-bold w-8">HZM</span> Hazmat Unit</div>
                    <div className="flex items-center gap-2"><span className="text-cyan-400 font-bold w-8">WT</span> Water Tender</div>
                    <div className="flex items-center gap-2"><span className="text-pink-400 font-bold w-8">US&R</span> Urban Search & Rescue</div>
                  </div>
                </section>

                <section>
                  <h4 className="font-display font-bold border-b border-white/10 pb-1 mb-2">SDFD Response Levels</h4>
                  <div className="space-y-1 text-[11px]">
                    <p><span className="text-primary font-bold">1a:</span> Standard medical response (1 Engine + 1 Medic)</p>
                    <p><span className="text-primary font-bold">2a:</span> Enhanced medical (2 Engines + 1 Medic)</p>
                    <p><span className="text-primary font-bold">3a:</span> Critical medical / Cardiac</p>
                  </div>
                </section>

                <section>
                  <h4 className="font-display font-bold border-b border-white/10 pb-1 mb-2">CA Common Codes</h4>
                  <div className="grid grid-cols-1 gap-1 text-[11px] font-mono">
                    <p><span className="text-primary">Code 1:</span> At your convenience</p>
                    <p><span className="text-primary">Code 2:</span> Urgent (No lights/sirens)</p>
                    <p><span className="text-primary">Code 3:</span> Emergency (Lights & Sirens)</p>
                    <p><span className="text-primary">Code 4:</span> No further assistance needed</p>
                    <p><span className="text-primary">10-4:</span> Acknowledged</p>
                    <p><span className="text-primary">10-20:</span> Location</p>
                    <p><span className="text-primary">10-97:</span> Arrived on scene</p>
                    <p><span className="text-primary">10-98:</span> Assignment complete</p>
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
