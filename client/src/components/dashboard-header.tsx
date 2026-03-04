import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Radio, RefreshCcw, HelpCircle } from "lucide-react";
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
            <h1 className="font-display font-bold text-xl tracking-tight hidden sm:block text-foreground">
              SD Dispatch<span className="text-primary">.Live</span>
            </h1>
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
            <PopoverContent className="w-80 bg-card border-white/10 shadow-2xl mr-4" align="end">
              <div className="space-y-3">
                <h4 className="font-display font-bold border-b border-white/10 pb-2">Unit Legend</h4>
                <div className="grid grid-cols-2 gap-2 text-sm font-mono">
                  <div className="flex items-center gap-2"><span className="text-red-400 font-bold w-6">E</span> Engine</div>
                  <div className="flex items-center gap-2"><span className="text-red-400 font-bold w-6">T</span> Truck</div>
                  <div className="flex items-center gap-2"><span className="text-emerald-400 font-bold w-6">M</span> Medic</div>
                  <div className="flex items-center gap-2"><span className="text-emerald-400 font-bold w-6">R</span> Rescue</div>
                  <div className="flex items-center gap-2"><span className="text-amber-400 font-bold w-6">B</span> Battalion</div>
                  <div className="flex items-center gap-2"><span className="text-blue-400 font-bold w-6">BR</span> Brush</div>
                  <div className="flex items-center gap-2"><span className="text-purple-400 font-bold w-6">HZM</span> Hazmat</div>
                  <div className="flex items-center gap-2"><span className="text-cyan-400 font-bold w-6">WT</span> Water</div>
                </div>
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
