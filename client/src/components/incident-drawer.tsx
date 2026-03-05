import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { type IncidentListResponse } from "@shared/routes";
import { MapPin, Shield, Flame, Clock, Copy, Navigation, Plus, X, History, RefreshCw, ArrowRight, Bookmark, BookmarkCheck } from "lucide-react";
import { getCallDescription } from "@/lib/call-descriptions";
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useBookmarks } from "@/hooks/use-bookmarks";

interface IncidentDrawerProps {
  incident: IncidentListResponse[0] | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface HistoryEntry {
  id: number;
  incidentId: number;
  changedAt: string;
  source: string;
  summary: string;
  changes: Array<{ field: string; oldValue: string; newValue: string }>;
}

const FIELD_LABELS: Record<string, string> = {
  units: "Units",
  status: "Status",
  callType: "Call Type",
  isMajor: "Major",
  location: "Location",
  notes: "Notes",
  tags: "Tags",
  acknowledged: "Acknowledged",
  lat: "Latitude",
  lng: "Longitude",
};

// Fields that are always system-updated regardless of source label
const SYSTEM_ONLY_FIELDS = new Set(["lat", "lng"]);

export function IncidentDrawer({ incident, isOpen, onOpenChange }: IncidentDrawerProps) {
  const { toast } = useToast();
  const [notes, setNotes] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const { isBookmarked, toggleBookmark } = useBookmarks();

  const defaultTags = ["En-Route", "On-Scene", "Code 4", "Traffic Control", "Medical", "Fire", "Staged"];

  const { data: history = [], refetch: refetchHistory } = useQuery<HistoryEntry[]>({
    queryKey: ["/api/incidents", incident?.id, "history"],
    queryFn: async () => {
      if (!incident) return [];
      const res = await fetch(`/api/incidents/${incident.id}/history`);
      return res.json();
    },
    enabled: !!incident && isOpen,
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (incident) {
      setNotes(incident.notes || "");
      setTags(incident.tags || []);
    }
  }, [incident?.id]);

  useEffect(() => {
    if (!incident || !isOpen) return;
    const timer = setTimeout(() => {
      if (notes !== (incident.notes || "") || JSON.stringify(tags) !== JSON.stringify(incident.tags || [])) {
        handleSave();
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [notes, tags, isOpen]);

  if (!incident) return null;

  const bookmarked = isBookmarked(incident.id);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await apiRequest("PATCH", `/api/incidents/${incident.id}`, { notes, tags });
      queryClient.setQueryData(["/api/incidents"], (old: any) =>
        old?.map((i: any) => i.id === incident.id ? { ...i, notes, tags, lastUpdated: new Date() } : i)
      );
      refetchHistory();
    } catch (e) {
      console.error("Auto-save failed", e);
    } finally {
      setIsSaving(false);
    }
  };

  const addTag = (tag: string) => {
    const cleanTag = tag.trim();
    if (cleanTag && !tags.includes(cleanTag)) {
      setTags([...tags, cleanTag]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => setTags(tags.filter(t => t !== tag));

  const isFire = incident.agency.toLowerCase() === 'fire';
  const agencyIcon = isFire ? <Flame className="w-5 h-5" /> : <Shield className="w-5 h-5" />;
  const agencyColor = isFire ? "text-red-400 bg-red-500/10" : "text-blue-400 bg-blue-500/10";

  const handleCopyAddress = () => {
    const fullLocation = `${incident.location}${incident.crossStreets ? ` (Cross: ${incident.crossStreets})` : ''}, San Diego, CA`;
    navigator.clipboard.writeText(fullLocation);
    toast({ title: "Address Copied", description: "Full location details copied to clipboard.", duration: 2000 });
  };

  const openGoogleMaps = () => {
    let url: string;
    if (incident.lat && incident.lng) {
      url = `https://www.google.com/maps/search/?api=1&query=${incident.lat},${incident.lng}`;
    } else {
      const q = encodeURIComponent(`${incident.location}${incident.crossStreets ? ' and ' + incident.crossStreets : ''}, San Diego, CA`);
      url = `https://www.google.com/maps/search/?api=1&query=${q}`;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Determine the correct label for a history entry source
  const getSourceLabel = (entry: HistoryEntry) => {
    // If all changes are system-only fields, always show SYSTEM
    if (entry.changes && entry.changes.length > 0) {
      const allSystemFields = entry.changes.every(c => SYSTEM_ONLY_FIELDS.has(c.field));
      if (allSystemFields) return "SYSTEM";
    }
    return entry.source === 'sync' ? 'SYNC' : 'USER';
  };

  const getSourceStyle = (entry: HistoryEntry) => {
    const label = getSourceLabel(entry);
    if (label === 'SYNC') return "bg-blue-500/15 text-blue-400";
    if (label === 'SYSTEM') return "bg-slate-500/15 text-slate-400";
    return "bg-amber-500/15 text-amber-400";
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md h-full flex flex-col bg-card border-l-white/10 p-0 z-[100]">
        <div className={`h-2 w-full shrink-0 ${isFire ? 'bg-gradient-to-r from-red-600 to-red-400' : 'bg-gradient-to-r from-blue-600 to-blue-400'}`} />

        <div className="p-6 pb-2 shrink-0">
          <SheetHeader className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline" className={`font-mono border-white/10 ${agencyColor}`}>
                {agencyIcon}
                <span className="ml-1.5 uppercase tracking-widest">{incident.agency}</span>
              </Badge>
              <div className="flex items-center gap-2">
                {isSaving && <span className="text-[10px] text-primary animate-pulse font-mono uppercase">Saving...</span>}
                <button
                  onClick={() => toggleBookmark(incident.id)}
                  className={cn("p-1.5 rounded-lg transition-all", bookmarked ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/5")}
                  title={bookmarked ? "Remove bookmark" : "Track this call"}
                >
                  {bookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                </button>
                <span className="text-sm font-mono text-muted-foreground bg-accent px-2 py-1 rounded-md">
                  #{incident.incidentNo}
                </span>
              </div>
            </div>
            <SheetTitle className="text-2xl font-display font-bold leading-tight mt-3">
              {incident.callType}
            </SheetTitle>
            <p className="text-sm text-primary font-mono font-bold uppercase tracking-wider mt-0.5">
              {incident.callTypeFamily}
            </p>
            <p className="text-sm text-muted-foreground italic mt-1 leading-snug">
              {getCallDescription(incident.callType, incident.callTypeFamily)}
            </p>
            <SheetDescription className="flex items-center gap-2 text-base mt-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="font-mono text-foreground">{format(new Date(incident.time), "PPpp")}</span>
            </SheetDescription>
          </SheetHeader>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0">
          <div className="px-6 shrink-0">
            <TabsList className="w-full bg-black/30 border border-white/5">
              <TabsTrigger value="details" className="flex-1 text-xs">Details</TabsTrigger>
              <TabsTrigger value="notes" className="flex-1 text-xs">Notes & Tags</TabsTrigger>
              <TabsTrigger value="history" className="flex-1 text-xs flex items-center gap-1">
                <History className="w-3 h-3" />
                History {history.length > 0 && <span className="bg-primary/20 text-primary rounded-full px-1.5 text-[9px] font-bold">{history.length}</span>}
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <TabsContent value="details" className="p-6 pt-4 space-y-5 m-0">
              <div className="bg-accent/40 rounded-xl p-4 border border-white/5">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Location</h4>
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2 bg-background rounded-lg text-primary shadow-inner shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-lg text-foreground">{incident.location}</div>
                    {incident.crossStreets && (
                      <div className="text-sm text-muted-foreground mt-1"><span className="opacity-50 mr-1">Cross:</span>{incident.crossStreets}</div>
                    )}
                    {incident.neighborhood && (
                      <div className="text-sm text-primary/80 mt-1 font-mono">{incident.neighborhood}</div>
                    )}
                    {incident.lat && incident.lng && (
                      <div className="text-[10px] text-muted-foreground/50 mt-1 font-mono">{incident.lat.toFixed(5)}, {incident.lng.toFixed(5)}</div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" className="flex-1" onClick={handleCopyAddress}>
                    <Copy className="w-4 h-4 mr-2" /> Copy
                  </Button>
                  <Button variant="default" size="sm" className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90" onClick={openGoogleMaps}>
                    <Navigation className="w-4 h-4 mr-2" /> Maps
                  </Button>
                </div>
              </div>

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

              {incident.status && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Status</h4>
                  <Badge variant="outline" className="text-sm py-1 border-white/20 bg-background/50">{incident.status}</Badge>
                </div>
              )}
            </TabsContent>

            <TabsContent value="notes" className="p-6 pt-4 space-y-4 m-0">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Incident Notes</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Type notes here... changes auto-save"
                  className="bg-background/50 border-white/10 min-h-[120px] text-sm focus-visible:ring-primary/30"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Quick Tags</label>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {defaultTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => addTag(tag)}
                      disabled={tags.includes(tag)}
                      className={cn(
                        "text-[10px] px-2 py-1 rounded-full border transition-all",
                        tags.includes(tag)
                          ? "bg-primary/20 border-primary/40 text-primary opacity-50"
                          : "bg-background/50 border-white/10 text-muted-foreground hover:border-primary/50 hover:text-primary"
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {tags.map(tag => (
                      <Badge key={tag} className="bg-primary/20 text-primary border-primary/30 flex items-center gap-1 pr-1">
                        {tag}
                        <button onClick={() => removeTag(tag)} className="hover:text-destructive p-0.5 rounded-full hover:bg-destructive/10"><X size={10} /></button>
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTag(tagInput)}
                    placeholder="Custom tag..."
                    className="flex-1 bg-background/50 border border-white/10 rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary/50"
                  />
                  <Button size="icon" variant="outline" onClick={() => addTag(tagInput)} className="h-9 w-9 border-white/10 hover:bg-white/5"><Plus size={16} /></Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="history" className="p-6 pt-4 pb-12 m-0">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Audit Log</h4>
                <button onClick={() => refetchHistory()} className="text-muted-foreground hover:text-foreground transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {history.length === 0 ? (
                <div className="text-sm text-muted-foreground italic bg-accent/20 p-6 rounded-lg text-center border border-dashed border-white/10">
                  No history recorded yet
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((entry) => {
                    const sourceLabel = getSourceLabel(entry);
                    const sourceStyle = getSourceStyle(entry);
                    return (
                      <div key={entry.id} className="bg-accent/20 rounded-lg p-3 border border-white/5">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={cn("text-[9px] h-4 px-1.5 border-0", sourceStyle)}
                            >
                              {sourceLabel}
                            </Badge>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {formatDistanceToNow(new Date(entry.changedAt), { addSuffix: true })}
                            </span>
                          </div>
                          <span className="text-[9px] font-mono text-muted-foreground/40">
                            {format(new Date(entry.changedAt), "HH:mm:ss")}
                          </span>
                        </div>
                        <p className="text-xs text-foreground font-medium">{entry.summary}</p>
                        {entry.changes && entry.changes.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {entry.changes.map((change, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
                                <span className="text-primary/70">{FIELD_LABELS[change.field] || change.field}:</span>
                                <span className="line-through opacity-50 max-w-[80px] truncate">{change.oldValue || 'empty'}</span>
                                <ArrowRight className="w-2.5 h-2.5 shrink-0 text-primary/40" />
                                <span className="text-foreground/80 max-w-[100px] truncate">{change.newValue || 'empty'}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
