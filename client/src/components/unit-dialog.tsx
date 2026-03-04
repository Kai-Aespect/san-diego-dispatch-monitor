import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { type IncidentListResponse } from "@shared/routes";
import { MapPin, Shield, Flame, Activity, Radio } from "lucide-react";
import { format } from "date-fns";

interface UnitDialogProps {
  unit: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  allIncidents: IncidentListResponse;
}

// Very basic helper to guess unit type based on common abbreviations
const guessUnitType = (unit: string) => {
  if (unit.match(/^E\d+/)) return { type: "Engine", icon: Flame, color: "text-red-400" };
  if (unit.match(/^T\d+/)) return { type: "Truck", icon: Flame, color: "text-red-400" };
  if (unit.match(/^M\d+/)) return { type: "Medic", icon: Activity, color: "text-emerald-400" };
  if (unit.match(/^B\d+/)) return { type: "Battalion", icon: Shield, color: "text-amber-400" };
  if (unit.match(/^R\d+/)) return { type: "Rescue", icon: Activity, color: "text-emerald-400" };
  return { type: "Unit", icon: Radio, color: "text-blue-400" };
};

export function UnitDialog({ unit, isOpen, onOpenChange, allIncidents }: UnitDialogProps) {
  if (!unit) return null;

  // Find where this unit is currently assigned
  const currentAssignments = allIncidents.filter(i => 
    i.units?.includes(unit)
  ).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const info = guessUnitType(unit);
  const Icon = info.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-white/10">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-3 rounded-xl bg-background shadow-inner ${info.color} border border-white/5`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
                {unit}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground font-mono">
                {info.type} • San Diego Dispatch
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Current Status</h4>
          
          {currentAssignments.length > 0 ? (
            <div className="space-y-3">
              {currentAssignments.map(incident => (
                <div key={incident.id} className="p-4 rounded-xl bg-accent/30 border border-white/5 relative overflow-hidden">
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                    incident.agency === 'fire' ? 'bg-red-500' : 'bg-blue-500'
                  }`} />
                  
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-foreground">{incident.callType}</span>
                    <span className="text-xs font-mono text-muted-foreground">
                      {format(new Date(incident.time), "HH:mm")}
                    </span>
                  </div>
                  
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                    <span>{incident.location}</span>
                  </div>
                  
                  <div className="mt-3 text-xs font-mono text-muted-foreground/50 pt-2 border-t border-white/5">
                    Incident #{incident.incidentNo}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center rounded-xl border border-dashed border-white/10 bg-accent/10">
              <Radio className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-muted-foreground">No active assignments found for this unit.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
