import { useState, useMemo, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Area, AreaChart,
} from "recharts";
import { type IncidentListResponse } from "@shared/routes";
import { differenceInMinutes, format, startOfDay, subDays, getHours } from "date-fns";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, ChevronDown } from "lucide-react";

interface AnalyticsPanelProps {
  incidents: IncidentListResponse;
}

const CALL_COLORS = {
  Medical:  "#34d399",
  Fire:     "#f87171",
  Police:   "#60a5fa",
  Traffic:  "#fb923c",
  Other:    "#a78bfa",
  Major:    "#fbbf24",
} as const;

const PERIODS = [
  { label: "Overnight", hours: [0,1,2,3,4,5], icon: "🌙" },
  { label: "Morning",   hours: [6,7,8,9,10,11], icon: "🌅" },
  { label: "Afternoon", hours: [12,13,14,15,16,17], icon: "☀️" },
  { label: "Evening",   hours: [18,19,20,21,22,23], icon: "🌆" },
];

const PRESETS: { label: string; minutes: number }[] = [
  { label: "1m",   minutes: 1 },
  { label: "15m",  minutes: 15 },
  { label: "1H",   minutes: 60 },
  { label: "6H",   minutes: 360 },
  { label: "24H",  minutes: 1440 },
  { label: "7D",   minutes: 10080 },
  { label: "30D",  minutes: 43200 },
  { label: "1Y",   minutes: 525600 },
];

type Unit = "min" | "hr" | "day";

function minutesToLabel(m: number): string {
  if (m < 60) return `${m}m`;
  if (m < 1440) return m % 60 === 0 ? `${m / 60}H` : `${(m / 60).toFixed(1)}H`;
  const d = m / 1440;
  return d % 1 === 0 ? `${d}D` : `${d.toFixed(1)}D`;
}

function categorize(inc: IncidentListResponse[0]): keyof Omit<typeof CALL_COLORS, "Major"> {
  if (inc.callTypeFamily === "Medical") return "Medical";
  if (inc.agency === "fire") {
    const f = (inc.callTypeFamily ?? "").toLowerCase();
    const t = inc.callType.toLowerCase();
    if (f.includes("traffic") || t.includes("traffic") || t.includes("accident")) return "Traffic";
    return "Fire";
  }
  if (inc.agency === "police") {
    const t = inc.callType.toLowerCase();
    if (t.includes("traffic") || t.includes("accident") || t.includes("collision")) return "Traffic";
    return "Police";
  }
  return "Other";
}

const TT: React.CSSProperties = {
  backgroundColor: "#1e2340",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "8px",
  fontSize: "11px",
  color: "#f1f5f9",
  padding: "6px 10px",
};

function SectionTitle({ children, collapsed, onToggle }: { children: React.ReactNode; collapsed?: boolean; onToggle?: () => void }) {
  return (
    <div 
      className="flex items-center justify-between py-2 cursor-pointer group"
      onClick={onToggle}
    >
      <h3 className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/60">
        {children}
      </h3>
      <ChevronDown className={cn("w-3 h-3 text-muted-foreground/40 transition-transform", collapsed && "-rotate-90")} />
    </div>
  );
}

function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3 space-y-0.5">
      <p className="text-[10px] text-muted-foreground/60 font-medium">{label}</p>
      <p className="text-xl font-bold leading-none" style={color ? { color } : {}}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground/50">{sub}</p>}
    </div>
  );
}

export function AnalyticsPanel({ incidents }: AnalyticsPanelProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    hour: true,
    major: true,
    top: true,
    dow: true,
    dist: true
  });
  const toggle = (key: string) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  const [rangeMinutes, setRangeMinutes] = useState(10080); // 7d default
  const [customVal, setCustomVal] = useState("7");
  const [customUnit, setCustomUnit] = useState<Unit>("day");
  const [showCustom, setShowCustom] = useState(false);
  const customInputRef = useRef<HTMLInputElement>(null);

  function applyCustom(val: string, unit: Unit) {
    const n = parseFloat(val);
    if (isNaN(n) || n <= 0) return;
    const mult = unit === "min" ? 1 : unit === "hr" ? 60 : 1440;
    const clamped = Math.max(1, Math.min(525600, Math.round(n * mult)));
    setRangeMinutes(clamped);
  }

  function selectPreset(minutes: number) {
    setRangeMinutes(minutes);
    setShowCustom(false);
    // sync custom display
    if (minutes < 60) { setCustomVal(String(minutes)); setCustomUnit("min"); }
    else if (minutes < 1440) { setCustomVal(String(minutes / 60)); setCustomUnit("hr"); }
    else { setCustomVal(String(minutes / 1440)); setCustomUnit("day"); }
  }

  // ── Derived data ─────────────────────────────────────────────
  const now = useMemo(() => new Date(), []);

  const ranged = useMemo(() =>
    incidents.filter(i => differenceInMinutes(now, new Date(i.time)) <= rangeMinutes),
    [incidents, rangeMinutes, now]
  );

  const total = ranged.length;
  const rangeDays = rangeMinutes / 1440;
  const majorInRange = useMemo(() => ranged.filter(i => i.isMajor), [ranged]);

  const catCounts = useMemo(() => {
    const c = { Medical: 0, Fire: 0, Police: 0, Traffic: 0, Other: 0 };
    for (const inc of ranged) c[categorize(inc)]++;
    return c;
  }, [ranged]);

  // ── Trend chart — bucket size scales with range ───────────────
  // ≤2H → 5-min buckets | ≤12H → 15-min | ≤72H → hourly | else daily
  const bucketSizeMin =
    rangeMinutes <= 120  ? 5  :
    rangeMinutes <= 720  ? 15 :
    rangeMinutes <= 4320 ? 60 : 0; // 0 = daily

  const trendLabel =
    bucketSizeMin === 5  ? "5-min" :
    bucketSizeMin === 15 ? "15-min" :
    bucketSizeMin === 60 ? "hourly" : "daily";

  const trendData = useMemo(() => {
    if (bucketSizeMin > 0) {
      // Sub-daily: build N buckets going back rangeMinutes
      const bucketMs = bucketSizeMin * 60000;
      const nowSnap = Math.floor(now.getTime() / bucketMs) * bucketMs;
      const totalBuckets = Math.max(2, Math.ceil(rangeMinutes / bucketSizeMin));
      const capped = Math.min(totalBuckets, 120);

      const dateFormat =
        bucketSizeMin <= 15 ? "h:mm a" :
        capped <= 24 ? "ha" : "M/d ha";

      const buckets = Array.from({ length: capped }, (_, i) => ({
        date: format(new Date(nowSnap - (capped - 1 - i) * bucketMs), dateFormat),
        ts: nowSnap - (capped - 1 - i) * bucketMs,
        Medical: 0, Fire: 0, Police: 0, Traffic: 0, Other: 0, Major: 0, total: 0,
      }));

      for (const inc of ranged) {
        const t = Math.floor(new Date(inc.time).getTime() / bucketMs) * bucketMs;
        const idx = buckets.findIndex(b => b.ts === t);
        if (idx >= 0) {
          buckets[idx][categorize(inc)]++;
          if (inc.isMajor) buckets[idx].Major++;
          buckets[idx].total++;
        }
      }
      return buckets;
    } else {
      // Daily buckets
      const days = Math.min(Math.ceil(rangeDays), 90);
      const buckets = Array.from({ length: days }, (_, i) => {
        const d = subDays(startOfDay(now), days - 1 - i);
        return {
          date: format(d, days <= 7 ? "EEE" : "M/d"),
          ts: d.getTime(),
          Medical: 0, Fire: 0, Police: 0, Traffic: 0, Other: 0, Major: 0, total: 0,
        };
      });
      for (const inc of incidents) {
        const t = startOfDay(new Date(inc.time)).getTime();
        const idx = buckets.findIndex(b => b.ts === t);
        if (idx >= 0) {
          buckets[idx][categorize(inc)]++;
          if (inc.isMajor) buckets[idx].Major++;
          buckets[idx].total++;
        }
      }
      return buckets;
    }
  }, [incidents, ranged, rangeMinutes, bucketSizeMin, now, rangeDays]);

  const trendInterval = trendData.length <= 8 ? 0 : trendData.length <= 24 ? 1 : trendData.length <= 48 ? 3 : trendData.length <= 90 ? 5 : 8;

  // ── Hour of day ───────────────────────────────────────────────
  const hourlyData = useMemo(() => {
    const h = Array.from({ length: 24 }, (_, i) => ({
      label: i === 0 ? "12a" : i < 12 ? `${i}a` : i === 12 ? "12p" : `${i - 12}p`,
      Medical: 0, Fire: 0, Police: 0, Traffic: 0, Other: 0, Major: 0, total: 0,
    }));
    for (const inc of ranged) {
      const hr = getHours(new Date(inc.time));
      h[hr][categorize(inc)]++;
      if (inc.isMajor) h[hr].Major++;
      h[hr].total++;
    }
    return h;
  }, [ranged]);

  // ── Major incident analytics ──────────────────────────────────
  const majorHours = useMemo(() => {
    const h = Array(24).fill(0);
    for (const inc of majorInRange) h[getHours(new Date(inc.time))]++;
    return h;
  }, [majorInRange]);

  const majorByType = useMemo(() => {
    const m: Record<string, number> = {};
    for (const inc of majorInRange) m[inc.callType] = (m[inc.callType] ?? 0) + 1;
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [majorInRange]);

  const majorByDay = useMemo(() => {
    const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const counts = Array(7).fill(0);
    for (const inc of majorInRange) counts[new Date(inc.time).getDay()]++;
    return days.map((d, i) => ({ day: d, count: counts[i] }));
  }, [majorInRange]);

  // ── Top call types ────────────────────────────────────────────
  const topTypes = useMemo(() => {
    const m: Record<string, { count: number; cat: string }> = {};
    for (const inc of ranged) {
      if (!m[inc.callType]) m[inc.callType] = { count: 0, cat: categorize(inc) };
      m[inc.callType].count++;
    }
    return Object.entries(m)
      .map(([name, { count, cat }]) => ({ name, count, cat }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [ranged]);

  // ── Day of week ───────────────────────────────────────────────
  const dowData = useMemo(() => {
    const names = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const c = Array(7).fill(0);
    for (const inc of ranged) c[new Date(inc.time).getDay()]++;
    return names.map((d, i) => ({ day: d, count: c[i] }));
  }, [ranged]);

  // ── Period comparison ─────────────────────────────────────────
  const prevTotal = useMemo(() =>
    incidents.filter(i => {
      const m = differenceInMinutes(now, new Date(i.time));
      return m > rangeMinutes && m <= rangeMinutes * 2;
    }).length,
    [incidents, rangeMinutes, now]
  );

  const trend = total > 0 && prevTotal > 0
    ? ((total - prevTotal) / prevTotal) * 100
    : null;

  const activePreset = PRESETS.find(p => p.minutes === rangeMinutes);

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Header ── */}
      <div className="px-4 pt-3 pb-0 border-b border-white/5 shrink-0">
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <span className="text-xs font-semibold text-foreground">Analytics</span>
            <span className="ml-2 text-[10px] text-muted-foreground/60 font-mono">{total} calls</span>
          </div>
          <span className="text-[10px] font-mono text-primary/80 bg-primary/10 px-2 py-0.5 rounded-md">
            {minutesToLabel(rangeMinutes)}
          </span>
        </div>

        {/* Preset buttons */}
        <div className="flex gap-1 mb-2">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => selectPreset(p.minutes)}
              className={cn(
                "flex-1 text-[9px] font-bold py-1.5 rounded-md transition-all",
                rangeMinutes === p.minutes
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground/60 bg-white/5 hover:text-foreground hover:bg-white/10"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom range row */}
        <div className="flex items-center gap-1.5 pb-2.5">
          <button
            onClick={() => { setShowCustom(s => !s); setTimeout(() => customInputRef.current?.focus(), 50); }}
            className={cn(
              "flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md border transition-all",
              showCustom
                ? "bg-primary/15 text-primary border-primary/30"
                : "text-muted-foreground/60 border-white/[0.08] hover:text-foreground hover:bg-white/5"
            )}
          >
            Custom
            <ChevronDown className={cn("w-3 h-3 transition-transform", showCustom && "rotate-180")} />
          </button>

          {showCustom && (
            <div className="flex items-center gap-1 flex-1">
              <input
                ref={customInputRef}
                type="number"
                min="1"
                max={customUnit === "min" ? 525600 : customUnit === "hr" ? 8760 : 365}
                value={customVal}
                onChange={e => {
                  setCustomVal(e.target.value);
                  applyCustom(e.target.value, customUnit);
                }}
                style={{ color: "#f1f5f9", backgroundColor: "#1e2340" }}
                className="w-16 border border-white/[0.12] rounded-md px-2 py-1 text-[11px] font-mono text-center focus:outline-none focus:border-primary/50"
              />
              <select
                value={customUnit}
                onChange={e => {
                  const u = e.target.value as Unit;
                  setCustomUnit(u);
                  applyCustom(customVal, u);
                }}
                style={{ color: "#f1f5f9", backgroundColor: "#1e2340" }}
                className="flex-1 border border-white/[0.12] rounded-md px-1.5 py-1 text-[11px] focus:outline-none focus:border-primary/50 appearance-none cursor-pointer"
              >
                <option value="min">Minutes</option>
                <option value="hr">Hours</option>
                <option value="day">Days</option>
              </select>
            </div>
          )}

          {!showCustom && !activePreset && (
            <span className="text-[10px] text-muted-foreground/50 font-mono">
              Custom: {minutesToLabel(rangeMinutes)}
            </span>
          )}
        </div>
      </div>

      {/* ── Scrolling content ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-4 space-y-6">

          {/* ── Overview KPIs ── */}
          <section>
            <SectionTitle collapsed={collapsed.overview} onToggle={() => toggle('overview')}>Overview</SectionTitle>
            {!collapsed.overview && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <KpiCard
                  label="Total Calls"
                  value={total}
                  sub={`past ${minutesToLabel(rangeMinutes)}`}
                />
                <KpiCard
                  label="Avg / Day"
                  value={rangeDays >= 1 ? (total / rangeDays).toFixed(1) : `${total}`}
                  sub={rangeDays >= 1 ? "calls per day" : "in window"}
                />
                <KpiCard
                  label="Major Incidents"
                  value={majorInRange.length}
                  sub={`${total > 0 ? ((majorInRange.length / total) * 100).toFixed(1) : 0}% of calls`}
                  color={CALL_COLORS.Major}
                />
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3 space-y-0.5">
                  <p className="text-[10px] text-muted-foreground/60 font-medium">vs. Prior Period</p>
                  {trend !== null ? (
                    <div className="flex items-center gap-1.5">
                      {trend > 5
                        ? <TrendingUp className="w-4 h-4 text-red-400" />
                        : trend < -5
                        ? <TrendingDown className="w-4 h-4 text-emerald-400" />
                        : <Minus className="w-4 h-4 text-muted-foreground" />}
                      <span className={cn("text-xl font-bold leading-none",
                        trend > 5 ? "text-red-400" : trend < -5 ? "text-emerald-400" : "text-foreground"
                      )}>
                        {trend > 0 ? "+" : ""}{trend.toFixed(0)}%
                      </span>
                    </div>
                  ) : (
                    <p className="text-xl font-bold text-muted-foreground/40">—</p>
                  )}
                  <p className="text-[10px] text-muted-foreground/50">call volume change</p>
                </div>
              </div>
            )}
          </section>

          {/* ── Category split ── */}
          <section>
            <SectionTitle collapsed={collapsed.cat} onToggle={() => toggle('cat')}>By Category</SectionTitle>
            {!collapsed.cat && (
              <div className="space-y-2.5 mt-2">
                {(["Medical","Fire","Police","Traffic","Other"] as const).map(cat => {
                  const count = catCounts[cat];
                  const pct = total > 0 ? (count / total) * 100 : 0;
                  const color = CALL_COLORS[cat];
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-foreground/80 font-medium">{cat}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground/50 font-mono text-[10px]">{pct.toFixed(1)}%</span>
                          <span className="font-bold w-6 text-right" style={{ color }}>{count}</span>
                        </div>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-1">
                        <div className="h-1 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color + "cc" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── Comparative trend lines ── */}
          <section>
            <SectionTitle collapsed={collapsed.trends} onToggle={() => toggle('trends')}>Trends by Type ({trendLabel})</SectionTitle>
            {!collapsed.trends && (
              <div className="mt-2">
                <div className="h-48 -mx-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
                      <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} axisLine={false} interval={trendInterval} />
                      <YAxis tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={TT}
                          itemStyle={{ color: "#f1f5f9" }}
                          labelStyle={{ color: "#94a3b8", marginBottom: "4px", fontWeight: "bold" }}
                        />
                      {(["Medical","Fire","Police","Traffic","Other"] as const).map(cat => (
                        <Line key={cat} type="monotone" dataKey={cat} stroke={CALL_COLORS[cat]} strokeWidth={1.5} dot={false} name={cat} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                  {(["Medical","Fire","Police","Traffic","Other"] as const).map(cat => (
                    <div key={cat} className="flex items-center gap-1.5">
                      <span className="w-3 h-0.5 rounded inline-block" style={{ backgroundColor: CALL_COLORS[cat] }} />
                      <span className="text-[10px] text-muted-foreground/60">{cat}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section>
            <SectionTitle collapsed={collapsed.vol} onToggle={() => toggle('vol')}>Total Call Volume</SectionTitle>
            {!collapsed.vol && (
              <div className="h-36 -mx-1 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
                    <defs>
                      <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} axisLine={false} interval={trendInterval} />
                    <YAxis tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={TT}
                          itemStyle={{ color: "#f1f5f9" }}
                          labelStyle={{ color: "#94a3b8", marginBottom: "4px", fontWeight: "bold" }}
                        />
                    <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={1.5} fill="url(#totalGrad)" dot={false} name="Total" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          {/* ── Hour-of-day pattern (skip for very short ranges) ── */}
          {rangeMinutes >= 60 && (
            <section>
              <SectionTitle collapsed={collapsed.hour} onToggle={() => toggle('hour')}>Hour of Day Pattern</SectionTitle>
              {!collapsed.hour && (
                <div className="mt-2">
                  <div className="h-40 -mx-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hourlyData} margin={{ top: 4, right: 8, bottom: 0, left: -24 }} barSize={5} barGap={0}>
                        <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 8, fill: "#475569" }} tickLine={false} axisLine={false} interval={2} />
                        <YAxis tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} axisLine={false} />
                          <Tooltip
                          contentStyle={TT}
                          itemStyle={{ color: "#f1f5f9" }}
                          labelStyle={{ color: "#94a3b8", marginBottom: "4px", fontWeight: "bold" }}
                        />
                        <Bar dataKey="Medical" stackId="s" fill={CALL_COLORS.Medical} />
                        <Bar dataKey="Fire"    stackId="s" fill={CALL_COLORS.Fire} />
                        <Bar dataKey="Police"  stackId="s" fill={CALL_COLORS.Police} />
                        <Bar dataKey="Traffic" stackId="s" fill={CALL_COLORS.Traffic} />
                        <Bar dataKey="Other"   stackId="s" fill={CALL_COLORS.Other} radius={[2,2,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {PERIODS.map(p => {
                      const cnt = p.hours.reduce((s, h) => s + hourlyData[h].total, 0);
                      return (
                        <div key={p.label} className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.05] rounded-lg px-2.5 py-2">
                          <span className="text-sm font-medium text-muted-foreground/40">{p.label.substring(0, 1)}</span>
                          <div>
                            <p className="text-[10px] text-muted-foreground/60">{p.label}</p>
                            <p className="text-sm font-bold">{cnt} <span className="text-[9px] text-muted-foreground/50 font-normal">calls</span></p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ── Major Incident Analytics ── */}
          <section>
            <SectionTitle collapsed={collapsed.major} onToggle={() => toggle('major')}>Major Incidents</SectionTitle>
            {!collapsed.major && (
              <div className="mt-2">
                {majorInRange.length === 0 ? (
                  <p className="text-xs text-muted-foreground/40 py-4 text-center">No major incidents in this period.</p>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <KpiCard label="Major Calls" value={majorInRange.length} color={CALL_COLORS.Major} />
                      <KpiCard
                        label="Rate"
                        value={`${total > 0 ? ((majorInRange.length / total) * 100).toFixed(1) : 0}%`}
                        sub="of all calls"
                        color={CALL_COLORS.Major}
                      />
                    </div>

                    <div>
                      <p className="text-[10px] text-muted-foreground/50 mb-1.5 font-medium">By Hour of Day</p>
                      <div className="h-28 -mx-1">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={hourlyData.map((h, i) => ({ ...h, Major: majorHours[i] }))} margin={{ top: 2, right: 8, bottom: 0, left: -24 }} barSize={5}>
                            <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
                            <XAxis dataKey="label" tick={{ fontSize: 8, fill: "#475569" }} tickLine={false} axisLine={false} interval={2} />
                            <YAxis tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip
                          contentStyle={TT}
                          itemStyle={{ color: "#f1f5f9" }}
                          labelStyle={{ color: "#94a3b8", marginBottom: "4px", fontWeight: "bold" }}
                        />
                            <Bar dataKey="Major" fill={CALL_COLORS.Major} radius={[2,2,0,0]} name="Major" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] text-muted-foreground/50 mb-1.5 font-medium">By Day of Week</p>
                      <div className="space-y-1">
                        {majorByDay.map(d => {
                          const maxVal = Math.max(...majorByDay.map(x => x.count), 1);
                          return (
                            <div key={d.day} className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-muted-foreground/60 w-7">{d.day}</span>
                              <div className="flex-1 bg-white/5 rounded-full h-1.5">
                                <div className="h-1.5 rounded-full" style={{ width: `${(d.count / maxVal) * 100}%`, backgroundColor: CALL_COLORS.Major + "bb" }} />
                              </div>
                              <span className="text-xs font-bold text-amber-400 w-4 text-right">{d.count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {majorByType.length > 0 && (
                      <div>
                        <p className="text-[10px] text-muted-foreground/50 mb-1.5 font-medium">Top Major Call Types</p>
                        <div className="space-y-1.5">
                          {majorByType.map(([name, count]) => (
                            <div key={name} className="flex items-center gap-2">
                              <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                              <span className="flex-1 text-[11px] text-foreground/70 truncate">{name}</span>
                              <span className="text-xs font-bold text-amber-400">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ── Top Call Types ── */}
          <section>
            <SectionTitle collapsed={collapsed.top} onToggle={() => toggle('top')}>Most Common Calls</SectionTitle>
            {!collapsed.top && (
              <div className="mt-2">
                {topTypes.length === 0 ? (
                  <p className="text-xs text-muted-foreground/40 py-2 text-center">No calls in this period.</p>
                ) : (
                  <div className="space-y-2">
                    {topTypes.map((ct, i) => (
                      <div key={ct.name} className="flex items-center gap-2">
                        <span className="text-[9px] font-mono text-muted-foreground/30 w-4 text-right">{i+1}</span>
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: CALL_COLORS[ct.cat as keyof typeof CALL_COLORS] ?? "#fff" }} />
                        <span className="flex-1 text-[11px] text-foreground/75 truncate">{ct.name}</span>
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 bg-white/5 rounded-full h-1">
                            <div className="h-1 rounded-full" style={{
                              width: `${topTypes[0]?.count > 0 ? (ct.count / topTypes[0].count) * 100 : 0}%`,
                              backgroundColor: (CALL_COLORS[ct.cat as keyof typeof CALL_COLORS] ?? "#fff") + "99",
                            }} />
                          </div>
                          <span className="text-xs font-bold" style={{ color: CALL_COLORS[ct.cat as keyof typeof CALL_COLORS] ?? "#fff" }}>{ct.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ── Day of Week (only meaningful for ranges ≥ 1 day) ── */}
          {rangeDays >= 1 && (
            <section>
              <SectionTitle collapsed={collapsed.dow} onToggle={() => toggle('dow')}>Day of Week</SectionTitle>
              {!collapsed.dow && (
                <div className="h-32 -mx-1 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dowData} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
                      <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} axisLine={false} />
                        <Tooltip
                        contentStyle={TT}
                        itemStyle={{ color: "#f1f5f9" }}
                        labelStyle={{ color: "#94a3b8", marginBottom: "4px", fontWeight: "bold" }}
                      />
                      <Bar dataKey="count" fill="#6366f1" fillOpacity={0.7} radius={[3,3,0,0]} name="Calls" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
          )}

          {/* ── Pie breakdown ── */}
          <section>
            <SectionTitle collapsed={collapsed.dist} onToggle={() => toggle('dist')}>Call Type Distribution</SectionTitle>
            {!collapsed.dist && (
              <div className="flex items-center gap-4 mt-2">
                <div className="h-32 w-32 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={Object.entries(catCounts).filter(([,v]) => v > 0).map(([name, value]) => ({ name, value }))}
                        dataKey="value" nameKey="name"
                        cx="50%" cy="50%"
                        innerRadius={30} outerRadius={55} paddingAngle={2}
                      >
                        {Object.entries(catCounts).filter(([,v]) => v > 0).map(([cat]) => (
                          <Cell key={cat} fill={CALL_COLORS[cat as keyof typeof CALL_COLORS] ?? "#94a3b8"} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={TT}
                        itemStyle={{ color: "#f1f5f9" }}
                        formatter={(v: number, name: string) => [v, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-1.5">
                  {(["Medical","Fire","Police","Traffic","Other"] as const).map(cat => (
                    <div key={cat} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: CALL_COLORS[cat] }} />
                      <span className="text-[11px] text-foreground/70 flex-1">{cat}</span>
                      <span className="text-[10px] font-mono text-muted-foreground/50">
                        {total > 0 ? ((catCounts[cat] / total) * 100).toFixed(0) : 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <div className="h-4" />
        </div>
      </div>
    </div>
  );
}
