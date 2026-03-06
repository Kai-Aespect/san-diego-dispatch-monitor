import { useState, useMemo } from "react";
import { type IncidentListResponse } from "@shared/routes";
import { Search, Radio, Flame, Activity, Shield, Truck, Droplets, AlertTriangle, Wrench, Zap, Wind } from "lucide-react";
import { cn } from "@/lib/utils";

interface UnitsPanelProps {
  incidents: IncidentListResponse;
  onSelectIncident: (inc: IncidentListResponse[0]) => void;
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

export function UnitsPanel({ incidents, onSelectIncident }: UnitsPanelProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

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

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return SD_UNITS.filter(u => {
      if (categoryFilter !== "all" && u.category !== categoryFilter) return false;
      if (q) return u.id.toLowerCase().includes(q) || u.type.toLowerCase().includes(q) || u.description.toLowerCase().includes(q);
      return true;
    });
  }, [search, categoryFilter]);

  const activeCount = filtered.filter(u => activeUnitMap.has(u.id)).length;

  return (
    <div className="flex flex-col h-full">
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
        <div className="flex gap-1 overflow-x-auto pb-0.5">
          {UNIT_TYPES.map(t => (
            <button
              key={t.key}
              onClick={() => setCategoryFilter(t.key)}
              className={cn(
                "text-[10px] font-semibold px-2 py-0.5 rounded-md whitespace-nowrap transition-colors border",
                categoryFilter === t.key
                  ? "bg-primary/20 text-primary border-primary/30"
                  : "text-muted-foreground border-white/8 hover:bg-white/5"
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
              onClick={activeInc ? () => onSelectIncident(activeInc) : undefined}
              className={cn(
                "flex items-start gap-2.5 px-2.5 py-2 rounded-lg border text-xs transition-all",
                colors.bg, colors.border,
                activeInc ? "cursor-pointer hover:brightness-125" : "cursor-default"
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
