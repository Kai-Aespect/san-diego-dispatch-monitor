import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { type IncidentListResponse } from "@shared/routes";
import { Search, Radio, Flame, Activity, Shield, Truck, Droplets, AlertTriangle, Wrench, Zap, Wind, History, X, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";

interface UnitsPanelProps {
  incidents: IncidentListResponse;
  onSelectIncident: (inc: IncidentListResponse[0]) => void;
  focusUnitId?: string | null;
}

interface UnitDefinition {
  id: string;
  type: string;
  description: string;
  category: "fire" | "medical" | "rescue" | "command" | "special" | "police";
  station?: number;
}

const UNIT_CATEGORY_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  fire:    { text: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/20" },
  medical: { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  rescue:  { text: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
  command: { text: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/20" },
  special: { text: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
  police:  { text: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/20" },
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  fire:    Flame,
  medical: Activity,
  rescue:  AlertTriangle,
  command: Shield,
  special: Zap,
  police:  Radio,
};

const UNIT_TYPES = [
  { key: "all",     label: "All" },
  { key: "fire",    label: "Fire" },
  { key: "medical", label: "Medical" },
  { key: "rescue",  label: "Rescue" },
  { key: "command", label: "Command" },
  { key: "special", label: "Special" },
  { key: "police",  label: "Police" },
];

const SD_UNITS: UnitDefinition[] = [
  // ── Engines ──────────────────────────────────────────────────
  ...Array.from({ length: 56 }, (_, i) => i + 1).map(n => ({
    id: `E${n}`, type: "Engine", category: "fire" as const,
    description: `Engine Company ${n} — 3-person crew, primary fire suppression & first response`,
    station: n,
  })),
  // ── Trucks (Ladders) ──────────────────────────────────────────
  ...[1,3,5,6,9,11,14,15,16,17,18,21,25,26,28,29,31,34,35,38,41,44,47,51,52,54].map(n => ({
    id: `T${n}`, type: "Truck", category: "fire" as const,
    description: `Truck/Ladder Company ${n} — aerial ladder, forcible entry, search & rescue`,
    station: n,
  })),
  // ── Medic Units (ALS) ─────────────────────────────────────────
  ...Array.from({ length: 56 }, (_, i) => i + 1).map(n => ({
    id: `M${n}`, type: "Medic (ALS)", category: "medical" as const,
    description: `Advanced Life Support unit ${n} — paramedics, cardiac monitoring, ALS interventions`,
    station: n,
  })),
  // High-numbered medics (stations 81–229)
  ...[81,82,83,84,85,229].map(n => ({
    id: `M${n}`, type: "Medic (ALS)", category: "medical" as const,
    description: `ALS Medic ${n} — paramedic-level care with advanced interventions`,
    station: n,
  })),
  // ── BLS Units ─────────────────────────────────────────────────
  ...Array.from({ length: 12 }, (_, i) => i + 1).map(n => ({
    id: `BLS${String(n).padStart(2, "0")}`, type: "BLS Ambulance", category: "medical" as const,
    description: `Basic Life Support Ambulance ${n} — EMT-staffed transport, non-ALS calls`,
  })),
  // ── Battalion Chiefs ──────────────────────────────────────────
  ...Array.from({ length: 10 }, (_, i) => i + 1).map(n => ({
    id: `B${n}`, type: "Battalion Chief", category: "command" as const,
    description: `Battalion Chief ${n} — incident command, multi-unit coordination, district supervisor`,
  })),
  // ── Rescue Units ──────────────────────────────────────────────
  ...[1,3,5,7,9,11,14,18,21,25,31,34,41].map(n => ({
    id: `R${n}`, type: "Rescue", category: "rescue" as const,
    description: `Heavy Rescue ${n} — extrication, confined space, technical rescue`,
    station: n,
  })),
  // ── HRTE (Heavy Rescue & Technical) ──────────────────────────
  ...[1,3,7].map(n => ({
    id: `HRTE${n}`, type: "HRTE", category: "rescue" as const,
    description: `Heavy Rescue Technical ${n} — specialized technical rescue team`,
  })),
  // ── Brush Engines ─────────────────────────────────────────────
  ...[1,2,3,4,5,6,7,8,9,10,11,12].map(n => ({
    id: `BR${n}`, type: "Brush Engine", category: "fire" as const,
    description: `Brush Engine ${n} — off-road wildland firefighting apparatus`,
  })),
  // ── Water Tenders ─────────────────────────────────────────────
  ...[1,2,3,5,9,12,14,19,21,25,32,38,41,42].map(n => ({
    id: `WT${n}`, type: "Water Tender", category: "fire" as const,
    description: `Water Tender ${n} — large-capacity water supply for wildland or rural operations`,
  })),
  // ── Hazmat ────────────────────────────────────────────────────
  { id: "HZM1",  type: "Hazmat Unit",   category: "special", description: "Hazardous Materials Team 1 — chemical/biological/radiological incidents" },
  { id: "HZM2",  type: "Hazmat Unit",   category: "special", description: "Hazardous Materials Team 2 — secondary hazmat response and support" },
  { id: "HZMT1", type: "Hazmat Tender", category: "special", description: "Hazmat Support Tender — equipment and supply transport for HazMat ops" },
  // ── Urban Search & Rescue ────────────────────────────────────
  { id: "USR1",  type: "US&R Team",   category: "rescue", description: "Urban Search & Rescue Team 1 — structural collapse, confined space rescue" },
  { id: "USR2",  type: "US&R Team",   category: "rescue", description: "Urban Search & Rescue Team 2 — secondary US&R response" },
  // ── Air Operations ────────────────────────────────────────────
  { id: "AIR1",  type: "Air Unit",     category: "special", description: "Air Operations Helicopter 1 — aerial support, water drops, medical evacuation" },
  { id: "AIR2",  type: "Air Unit",     category: "special", description: "Air Operations Helicopter 2 — secondary aerial response" },
  { id: "AIR5",  type: "Air Unit",     category: "special", description: "Air Unit 5 — fixed-wing or rotary aerial operations" },
  // ── Command & Support ─────────────────────────────────────────
  { id: "DC1",   type: "Deputy Chief", category: "command", description: "Deputy Chief of Operations — senior command for major incidents" },
  { id: "DC2",   type: "Deputy Chief", category: "command", description: "Deputy Chief 2 — area command and administrative support" },
  { id: "MAS1",  type: "Mass Casualty", category: "special", description: "Mass Casualty Incident trailer — triage supplies for 100+ patients" },
  { id: "Dm",    type: "Duty Mechanic", category: "special", description: "Duty Mechanic — apparatus repairs and vehicle support in the field" },
  { id: "Dm2",   type: "Duty Mechanic", category: "special", description: "Duty Mechanic 2 — secondary apparatus support" },
  { id: "SQ1",   type: "Squad",        category: "fire",    description: "Squad Company 1 — multi-purpose rapid response unit" },
  { id: "SQ3",   type: "Squad",        category: "fire",    description: "Squad Company 3 — multi-purpose rapid response unit" },
  { id: "FOG1",  type: "Foam Unit",    category: "special", description: "Foam Unit 1 — Class B foam application for fuel/chemical fires" },
  { id: "HLCP",  type: "Helicopter", category: "special", description: "SDFD Helicopter — aerial firefighting and emergency medical operations" },
  // ── SDPD Units ────────────────────────────────────────────────
  ...["110","120","130","140","150","160","170","180","190","210","220","230","240","250","310","320","330","340","350","360","410","420","430","440","510","520","530","540","550","560","610","620","630","640","650","710","720","730","740","750","810","820","830","840","910","920","930","940","950"].map(n => ({
    id: `P-${n}`, type: "Patrol Unit", category: "police" as const,
    description: `SDPD Patrol Unit ${n} — uniformed patrol, primary crime response`,
  })),
  { id: "SDPD-HEL1", type: "Police Helicopter", category: "police", description: "ABLE 1 — SDPD air support helicopter, surveillance and pursuit" },
  { id: "SDPD-HEL2", type: "Police Helicopter", category: "police", description: "ABLE 2 — secondary SDPD air support" },
  { id: "SDPD-K9",   type: "K-9 Unit",          category: "police", description: "K-9 — police dog team for tracking, suspect apprehension, narcotics" },
  { id: "SDPD-SWAT", type: "SWAT",               category: "police", description: "SDPD SWAT — Special Weapons and Tactics, high-risk tactical operations" },
  { id: "SDPD-MFF",  type: "Mobile Field Force", category: "police", description: "Mobile Field Force — crowd control and civil disturbance response" },
  { id: "SDPD-MHU",  type: "Mental Health",      category: "police", description: "PERT/MHU — Psychiatric Emergency Response Team, mental health crisis" },
  { id: "SDPD-VICE", type: "Vice/Narcotics",     category: "police", description: "Vice & Narcotics Unit — undercover drug and vice investigations" },
  { id: "SDPD-BOMB", type: "Bomb Squad",         category: "police", description: "Bomb Disposal Unit — explosive ordinance disposal, IED response" },
];

function UnitPublicNotes({ unitId }: { unitId: string }) {
  const { data: note, refetch } = useQuery<{ content: string }>({ queryKey: [`/api/units/${unitId}/note`] });
  const [isEditing, setIsSaving] = useState(false);
  const [content, setContent] = useState("");
  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [pinError, setPinError] = useState("");

  useEffect(() => {
    if (note) setContent(note.content);
  }, [note]);

  const handleSave = async () => {
    setIsSaving(true);
    setPinError("");
    try {
      const res = await fetch(`/api/units/${unitId}/note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, pin }),
      });
      if (res.ok) {
        refetch();
        setUnlocked(false);
        setPin("");
        setPinError("");
      } else {
        setPinError("Invalid Key PIN — try again.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Unit Notes & Location Info</p>
      {!unlocked ? (
        <div className="bg-white/5 p-3 rounded-lg border border-white/5 space-y-2">
          {note?.content ? (
            <p className="text-xs text-foreground/70 whitespace-pre-wrap">{note.content}</p>
          ) : (
            <p className="text-[10px] text-muted-foreground/40 italic">No notes for this unit.</p>
          )}
          <button
            onClick={() => setUnlocked(true)}
            className="text-[10px] text-primary hover:underline flex items-center gap-1"
          >
            <Unlock className="w-3 h-3" /> Edit Notes (Requires Key)
          </button>
        </div>
      ) : (
        <div className="bg-primary/5 p-3 rounded-lg border border-primary/20 space-y-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded p-2 text-xs min-h-[80px] text-foreground focus:outline-none"
            placeholder="Enter unit notes, equipment details, or base location..."
          />
          <div className="flex gap-2">
            <input
              type="password"
              maxLength={6}
              value={pin}
              onChange={(e) => { setPin(e.target.value); setPinError(""); }}
              className={cn(
                "w-24 bg-black/20 border rounded px-2 py-1 text-xs font-mono",
                pinError ? "border-red-500/60" : "border-white/10"
              )}
              placeholder="Key PIN"
            />
            <button
              onClick={handleSave}
              disabled={isEditing}
              className="flex-1 bg-primary/20 text-primary border border-primary/30 rounded text-[10px] font-bold py-1 hover:bg-primary/30"
            >
              {isEditing ? "SAVING..." : "SAVE NOTES"}
            </button>
            <button onClick={() => { setUnlocked(false); setPinError(""); }} className="px-2 text-muted-foreground hover:text-foreground">
              <X className="w-3 h-3" />
            </button>
          </div>
          {pinError && (
            <p className="text-[10px] text-red-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
              {pinError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function UnitsPanel({ incidents, onSelectIncident, focusUnitId }: UnitsPanelProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  useEffect(() => {
    if (focusUnitId) setSelectedUnitId(focusUnitId);
  }, [focusUnitId]);

  const activeIncidents = incidents.filter(i => i.active);

  const activeUnitMap = useMemo(() => {
    const map = new Map<string, IncidentListResponse[0]>();
    for (const inc of activeIncidents) {
      for (const u of (inc.units ?? [])) {
        if (!map.has(u)) map.set(u, inc);
      }
    }
    return map;
  }, [activeIncidents]);

  const unitHistory = useMemo(() => {
    if (!selectedUnitId) return [];
    return incidents
      .filter(i => i.units?.includes(selectedUnitId))
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [incidents, selectedUnitId]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return SD_UNITS.filter(u => {
      if (categoryFilter !== "all" && u.category !== categoryFilter) return false;
      if (q) return u.id.toLowerCase().includes(q) || u.type.toLowerCase().includes(q) || u.description.toLowerCase().includes(q);
      return true;
    });
  }, [search, categoryFilter]);

  const activeCount = filtered.filter(u => activeUnitMap.has(u.id)).length;

  const selectedUnit = SD_UNITS.find(u => u.id === selectedUnitId);
  const effectiveUnit = selectedUnit ?? (selectedUnitId ? {
    id: selectedUnitId,
    type: "Unit",
    description: "No additional information on file for this unit.",
    category: "special" as const,
  } : null);

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* ── Unit History Overlay ── */}
      {selectedUnitId && effectiveUnit && (
        <div className="absolute inset-0 z-20 bg-[#0a0c14] dark:bg-[#0a0c14] flex flex-col animate-in fade-in slide-in-from-right-4 duration-200">
          <div className="px-3 py-3 border-b border-white/10 flex items-center justify-between shrink-0 bg-background/80 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <div className={cn("p-1 rounded-md bg-white/5", UNIT_CATEGORY_COLORS[effectiveUnit.category].text)}>
                {(() => {
                  const Icon = CATEGORY_ICONS[effectiveUnit.category];
                  return <Icon className="w-4 h-4" />;
                })()}
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground leading-tight">{effectiveUnit.id}</h3>
                <p className="text-[10px] text-muted-foreground/60">{effectiveUnit.type}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedUnitId(null)}
              className="p-1.5 rounded-full hover:bg-white/10 text-muted-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">Description</p>
              <p className="text-xs text-foreground/80 leading-relaxed bg-white/5 p-2 rounded-lg border border-white/5 italic">
                {effectiveUnit.description}
              </p>
            </div>

            <UnitPublicNotes unitId={effectiveUnit.id} />

            <div className="space-y-2 pb-6">
              <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                <History className="w-3.5 h-3.5" />
                Call History ({unitHistory.length})
              </div>
              <div className="space-y-1.5">
                {unitHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground/30 text-[11px] border border-dashed border-white/10 rounded-lg">
                    No recent history found.
                  </div>
                ) : (
                  unitHistory.map(inc => (
                    <div
                      key={inc.id}
                      onClick={() => onSelectIncident(inc)}
                      className={cn(
                        "group p-2 rounded-lg border transition-all cursor-pointer hover:brightness-110",
                        inc.active ? "bg-emerald-500/10 border-emerald-500/20" : "bg-white/5 border-white/5 hover:border-white/10"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={cn("text-[11px] font-bold", inc.active ? "text-emerald-400" : "text-foreground/80")}>
                          {inc.callType}
                        </span>
                        <span className="text-[9px] font-mono text-muted-foreground/50 shrink-0">
                          {new Date(inc.time).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5">{inc.location}</p>
                      {inc.active && (
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-[9px] font-bold text-emerald-400">CURRENTLY ON SCENE</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="px-3 pt-3 pb-2 border-b border-white/5 space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-muted-foreground">
            {filtered.length} units · <span className="text-emerald-400 font-bold">{activeCount} active</span>
          </span>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
          <input
            className="w-full pl-8 pr-3 h-7 text-xs rounded-lg bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
            placeholder="Search units..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {UNIT_TYPES.map(t => (
            <button
              key={t.key}
              onClick={() => setCategoryFilter(t.key)}
              className={cn(
                "text-[10px] font-semibold px-2.5 py-1 rounded-md transition-all border shadow-sm",
                categoryFilter === t.key
                  ? "bg-primary/20 text-primary border-primary/40 ring-1 ring-primary/20"
                  : "bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10 hover:border-white/20"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        {filtered.length === 0 && (
          <div className="text-center py-8 text-muted-foreground/40 text-xs">No units found.</div>
        )}
        {filtered.map(unit => {
          const activeInc = activeUnitMap.get(unit.id);
          const colors = UNIT_CATEGORY_COLORS[unit.category];
          const Icon = CATEGORY_ICONS[unit.category];
          return (
            <div
              key={unit.id}
              onClick={() => setSelectedUnitId(unit.id)}
              className={cn(
                "flex items-start gap-2.5 px-2.5 py-2 rounded-lg border text-xs transition-all cursor-pointer",
                colors.bg, colors.border,
                "hover:brightness-125"
              )}
            >
              <div className={cn("mt-0.5 shrink-0", colors.text)}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={cn("font-mono font-bold", colors.text)}>{unit.id}</span>
                  <span className="text-muted-foreground/50 text-[10px]">{unit.type}</span>
                  {activeInc && (
                    <span className="ml-auto flex items-center gap-1 text-[9px] font-bold text-emerald-400 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground/60 text-[10px] leading-snug mt-0.5">{unit.description}</p>
                {activeInc && (
                  <p className="text-[10px] text-emerald-300/70 mt-0.5 truncate">
                    → {activeInc.callType} · {activeInc.location}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
