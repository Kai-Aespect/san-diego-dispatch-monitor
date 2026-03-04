import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { type IncidentListResponse } from "@shared/routes";
import { MapPin, Shield, Flame, Activity, Clock, Copy, Navigation, Plus, X } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface IncidentDrawerProps {
  incident: IncidentListResponse[0] | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IncidentDrawer({ incident, isOpen, onOpenChange }: IncidentDrawerProps) {
  const { toast } = useToast();
  const [notes, setNotes] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (incident) {
      setNotes(incident.notes || "");
      setTags(incident.tags || []);
    }
  }, [incident]);

  if (!incident) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiRequest("PATCH", `/api/incidents/${incident.id}`, { notes, tags });
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      toast({ title: "Saved", description: "Incident details updated." });
    } catch (e) {
      toast({ title: "Error", description: "Failed to save updates.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };
  
  const isFire = incident.agency.toLowerCase() === 'fire';
  const agencyIcon = isFire ? <Flame className="w-5 h-5" /> : <Shield className="w-5 h-5" />;
  const agencyColor = isFire ? "text-red-400 bg-red-500/10" : "text-blue-400 bg-blue-500/10";

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(incident.location);
    toast({
      title: "Address Copied",
      description: "Location copied to clipboard.",
      duration: 2000,
    });
  };

  const openGoogleMaps = () => {
    let url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${incident.location}, San Diego, CA`)}`;
    if (incident.lat && incident.lng) {
      url = `https://www.google.com/maps/search/?api=1&query=${incident.lat},${incident.lng}`;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-card border-l-white/10 p-0 z-[100]">
        <div className={`h-2 w-full ${isFire ? 'bg-gradient-to-r from-red-600 to-red-400' : 'bg-gradient-to-r from-blue-600 to-blue-400'}`} />
        
        <div className="p-6">
          <SheetHeader className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline" className={`font-mono border-white/10 ${agencyColor}`}>
                {agencyIcon}
                <span className="ml-1.5 uppercase tracking-widest">{incident.agency}</span>
              </Badge>
              <span className="text-sm font-mono text-muted-foreground bg-accent px-2 py-1 rounded-md">
                #{incident.incidentNo}
              </span>
            </div>
            <SheetTitle className="text-3xl font-display font-bold leading-tight mt-4">
              {incident.callType}
            </SheetTitle>
            <SheetDescription className="flex items-center gap-2 text-base mt-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="font-mono text-foreground">{format(new Date(incident.time), "PPpp")}</span>
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6">
            {/* Notes & Tags Section */}
            <div className="space-y-4 bg-accent/20 p-4 rounded-xl border border-white/5">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Incident Notes</label>
                <Textarea 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add details, en-route status, etc..."
                  className="bg-background/50 border-white/10 min-h-[100px]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map(tag => (
                    <Badge key={tag} className="bg-primary/20 text-primary border-primary/30 flex items-center gap-1 pr-1">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-destructive"><X size={12} /></button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input 
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTag()}
                    placeholder="Add tag (e.g. en-route)"
                    className="flex-1 bg-background/50 border border-white/10 rounded-md px-3 py-1 text-sm outline-none focus:border-primary/50"
                  />
                  <Button size="icon" variant="outline" onClick={addTag} className="h-8 w-8"><Plus size={16} /></Button>
                </div>
              </div>

              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                className="w-full bg-primary text-primary-foreground font-bold"
              >
                {isSaving ? "Saving..." : "Save Updates"}
              </Button>
            </div>

            {/* Location Section */}
            <div className="bg-accent/40 rounded-xl p-4 border border-white/5">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Location Details</h4>
              
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-background rounded-lg text-primary shadow-inner">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-lg text-foreground">{incident.location}</div>
                  {incident.crossStreets && (
                    <div className="text-sm text-muted-foreground mt-1">
                      <span className="opacity-50 mr-1">Cross:</span> {incident.crossStreets}
                    </div>
                  )}
                  {incident.neighborhood && (
                    <div className="text-sm text-primary/80 mt-1 font-mono">
                      {incident.neighborhood}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" size="sm" className="flex-1 hover-elevate" onClick={handleCopyAddress}>
                  <Copy className="w-4 h-4 mr-2" /> Copy
                </Button>
                <Button variant="default" size="sm" className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 hover-elevate" onClick={openGoogleMaps}>
                  <Navigation className="w-4 h-4 mr-2" /> Maps
                </Button>
              </div>
            </div>

            {/* Units Section */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Assigned Units ({incident.units?.length || 0})</h4>
              {incident.units && incident.units.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {incident.units.map((unit, idx) => (
                    <div key={idx} className="bg-accent/30 border border-white/5 rounded-lg p-2 text-center font-mono font-bold text-foreground">
                      {unit}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground italic bg-accent/20 p-4 rounded-lg text-center border border-dashed border-white/10">
                  No units currently assigned
                </div>
              )}
            </div>
            
            {/* Status Section */}
            {incident.status && (
              <div>
                 <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Status</h4>
                 <Badge variant="outline" className="text-sm py-1 border-white/20 bg-background/50">
                   {incident.status}
                 </Badge>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
