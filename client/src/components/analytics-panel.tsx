import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Area, AreaChart,
} from "recharts";
import { type IncidentListResponse } from "@shared/routes";
import { differenceInHours, differenceInDays, format, startOfDay, subDays, getHours } from "date-fns";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Clock } from "lucide-react";

interface AnalyticsPanelProps {
  incidents: IncidentListResponse;
}

type TimeRange = "1d" | "7d" | "30d" | "365d";

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

function filterByRange(incidents: IncidentListResponse, range: TimeRange): IncidentListResponse {
  const now = new Date();
  const cutoffHours: Record<TimeRange, number> = { "1d": 24, "7d": 168, "30d": 720, "365d": 8760 };
  return incidents.filter(i => differenceInHours(now, new Date(i.time)) <= cutoffHours[range]);
}

const TT: React.CSSProperties = {
  backgroundColor: "#161929",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: "8px",
  fontSize: "11px",
  color: "#cbd5e1",
  padding: "6px 10px",
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/60 mb-2">
      {children}
    </h3>
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
  const [range, setRange] = useState<TimeRange>("7d");
  const ranged = useMemo(() => filterByRange(incidents, range), [incidents, range]);
  const rangeDays = range === "1d" ? 1 : range === "7d" ? 7 : range === "30d" ? 30 : 365;

  // ── Category totals ──────────────────────────────────────────
  const catCounts = useMemo(() => {
    const c = { Medical: 0, Fire: 0, Police: 0, Traffic: 0, Other: 0 };
    for (const inc of ranged) c[categorize(inc)]++;
    return c;
  }, [ranged]);

  const total = ranged.length;
  const majorInRange = useMemo(() => ranged.filter(i => i.isMajor), [ranged]);

  // ── Daily trend per category ──────────────────────────────────
  const dailyData = useMemo(() => {
    const days = Math.min(rangeDays, 90);
    const buckets = Array.from({ length: days }, (_, i) => {
      const d = subDays(startOfDay(new Date()), days - 1 - i);
      return {
        date: format(d, days <= 7 ? "EEE" : days <= 31 ? "M/d" : "M/d"),
        ts: d.getTime(),
        Medical: 0, Fire: 0, Police: 0, Traffic: 0, Other: 0, Major: 0, total: 0,
      };
    });
    for (const inc of incidents) {
      const ts = startOfDay(new Date(inc.time)).getTime();
      const idx = buckets.findIndex(b => b.ts === ts);
      if (idx < 0) continue;
      buckets[idx][categorize(inc)]++;
      if (inc.isMajor) buckets[idx].Major++;
      buckets[idx].total++;
    }
    return buckets;
  }, [incidents, rangeDays]);

  // ── Hour-of-day pattern ───────────────────────────────────────
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

  const maxHourTotal = Math.max(...hourlyData.map(h => h.total), 1);

  // ── Major incident analytics ──────────────────────────────────
  const majorHours = useMemo(() => {
    const h = Array(24).fill(0);
    for (const inc of majorInRange) h[getHours(new Date(inc.time))]++;
    return h;
  }, [majorInRange]);

  const majorByType = useMemo(() => {
    const m: Record<string, number> = {};
    for (const inc of majorInRange) {
      const ct = inc.callType;
      m[ct] = (m[ct] ?? 0) + 1;
    }
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

  // ── Day-of-week ───────────────────────────────────────────────
  const dowData = useMemo(() => {
    const names = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const c = Array(7).fill(0);
    for (const inc of ranged) c[new Date(inc.time).getDay()]++;
    return names.map((d, i) => ({ day: d, count: c[i] }));
  }, [ranged]);

  const prevRanged = useMemo(() => {
    const now = new Date();
    const cutoffHours: Record<TimeRange, number> = { "1d": 24, "7d": 168, "30d": 720, "365d": 8760 };
    const hours = cutoffHours[range];
    return incidents.filter(i => {
      const h = differenceInHours(now, new Date(i.time));
      return h > hours && h <= hours * 2;
    });
  }, [incidents, range]);

  const trend = total > 0 && prevRanged.length > 0
    ? ((total - prevRanged.length) / prevRanged.length) * 100
    : null;

  const axisInterval = rangeDays <= 7 ? 0 : rangeDays <= 30 ? 3 : 7;

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Header ── */}
      <div className="px-4 pt-3 pb-2.5 border-b border-white/5 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-foreground">Analytics</span>
            <span className="ml-2 text-[10px] text-muted-foreground/60 font-mono">{total} calls</span>
          </div>
          <div className="flex gap-1 bg-white/5 rounded-lg p-0.5">
            {(["1d","7d","30d","365d"] as TimeRange[]).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "text-[10px] font-bold px-2.5 py-1 rounded-md transition-all",
                  range === r
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {r === "1d" ? "24H" : r === "365d" ? "1Y" : r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Scrolling content ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-4 space-y-6">

          {/* ── Overview KPIs ── */}
          <section>
            <SectionTitle>Overview</SectionTitle>
            <div className="grid grid-cols-2 gap-2">
              <KpiCard label="Total Calls" value={total} sub={`past ${range === "1d" ? "24 hours" : range === "7d" ? "7 days" : range === "30d" ? "30 days" : "year"}`} />
              <KpiCard label="Avg / Day" value={(total / rangeDays).toFixed(1)} sub="calls per day" />
              <KpiCard label="Major Incidents" value={majorInRange.length} sub={`${total > 0 ? ((majorInRange.length / total) * 100).toFixed(1) : 0}% of calls`} color={CALL_COLORS.Major} />
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3 space-y-0.5">
                <p className="text-[10px] text-muted-foreground/60 font-medium">vs. Prior Period</p>
                {trend !== null ? (
                  <div className="flex items-center gap-1.5">
                    {trend > 5 ? <TrendingUp className="w-4 h-4 text-red-400" /> : trend < -5 ? <TrendingDown className="w-4 h-4 text-emerald-400" /> : <Minus className="w-4 h-4 text-muted-foreground" />}
                    <span className={cn("text-xl font-bold leading-none", trend > 5 ? "text-red-400" : trend < -5 ? "text-emerald-400" : "text-foreground")}>
                      {trend > 0 ? "+" : ""}{trend.toFixed(0)}%
                    </span>
                  </div>
                ) : (
                  <p className="text-xl font-bold text-muted-foreground/40">—</p>
                )}
                <p className="text-[10px] text-muted-foreground/50">call volume change</p>
              </div>
            </div>
          </section>

          {/* ── Category split ── */}
          <section>
            <SectionTitle>By Category</SectionTitle>
            <div className="space-y-2.5">
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
          </section>

          {/* ── Comparative trend lines ── */}
          <section>
            <SectionTitle>Trends by Type</SectionTitle>
            <div className="h-48 -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} axisLine={false} interval={axisInterval} />
                  <YAxis tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={TT} itemStyle={{ color: "#cbd5e1" }} />
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
          </section>

          {/* ── Total volume trend ── */}
          <section>
            <SectionTitle>Total Call Volume</SectionTitle>
            <div className="h-36 -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
                  <defs>
                    <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} axisLine={false} interval={axisInterval} />
                  <YAxis tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={TT} />
                  <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={1.5} fill="url(#totalGrad)" dot={false} name="Total" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* ── Hour-of-day pattern ── */}
          <section>
            <SectionTitle>Hour of Day Pattern</SectionTitle>
            <div className="h-40 -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData} margin={{ top: 4, right: 8, bottom: 0, left: -24 }} barSize={5} barGap={0}>
                  <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 8, fill: "#475569" }} tickLine={false} axisLine={false} interval={2} />
                  <YAxis tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={TT} />
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
                    <span className="text-base">{p.icon}</span>
                    <div>
                      <p className="text-[10px] text-muted-foreground/60">{p.label}</p>
                      <p className="text-sm font-bold">{cnt} <span className="text-[9px] text-muted-foreground/50 font-normal">calls</span></p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Major Incident Analytics ── */}
          <section>
            <SectionTitle>Major Incidents</SectionTitle>
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

                {/* Major calls by hour */}
                <div>
                  <p className="text-[10px] text-muted-foreground/50 mb-1.5">Major calls by hour</p>
                  <div className="h-28 -mx-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hourlyData.map((h, i) => ({ ...h, Major: majorHours[i] }))} margin={{ top: 2, right: 8, bottom: 0, left: -24 }} barSize={5}>
                        <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 8, fill: "#475569" }} tickLine={false} axisLine={false} interval={2} />
                        <YAxis tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={TT} />
                        <Bar dataKey="Major" fill={CALL_COLORS.Major} radius={[2,2,0,0]} name="Major" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Major calls by day of week */}
                <div>
                  <p className="text-[10px] text-muted-foreground/50 mb-1.5">Major calls by day of week</p>
                  <div className="space-y-1">
                    {majorByDay.map(d => (
                      <div key={d.day} className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-muted-foreground/60 w-7">{d.day}</span>
                        <div className="flex-1 bg-white/5 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full"
                            style={{
                              width: `${Math.max(...majorByDay.map(x => x.count)) > 0 ? (d.count / Math.max(...majorByDay.map(x => x.count))) * 100 : 0}%`,
                              backgroundColor: CALL_COLORS.Major + "bb",
                            }}
                          />
                        </div>
                        <span className="text-xs font-bold text-amber-400 w-4 text-right">{d.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top major call types */}
                {majorByType.length > 0 && (
                  <div>
                    <p className="text-[10px] text-muted-foreground/50 mb-1.5">Most common major calls</p>
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
          </section>

          {/* ── Top Call Types ── */}
          <section>
            <SectionTitle>Most Common Calls</SectionTitle>
            <div className="space-y-2">
              {topTypes.map((ct, i) => (
                <div key={ct.name} className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-muted-foreground/30 w-4 text-right">{i+1}</span>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: CALL_COLORS[ct.cat as keyof typeof CALL_COLORS] ?? "#fff" }} />
                  <span className="flex-1 text-[11px] text-foreground/75 truncate">{ct.name}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-12 bg-white/5 rounded-full h-1">
                      <div
                        className="h-1 rounded-full"
                        style={{
                          width: `${topTypes[0]?.count > 0 ? (ct.count / topTypes[0].count) * 100 : 0}%`,
                          backgroundColor: (CALL_COLORS[ct.cat as keyof typeof CALL_COLORS] ?? "#fff") + "99",
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold" style={{ color: CALL_COLORS[ct.cat as keyof typeof CALL_COLORS] ?? "#fff" }}>{ct.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Day of Week ── */}
          <section>
            <SectionTitle>Day of Week</SectionTitle>
            <div className="h-32 -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dowData} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={TT} />
                  <Bar dataKey="count" fill="#6366f1" fillOpacity={0.7} radius={[3,3,0,0]} name="Calls" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* ── Pie breakdown ── */}
          <section>
            <SectionTitle>Call Type Distribution</SectionTitle>
            <div className="flex items-center gap-4">
              <div className="h-32 w-32 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={Object.entries(catCounts).map(([name, value]) => ({ name, value }))} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={2}>
                      {Object.keys(catCounts).map(cat => (
                        <Cell key={cat} fill={CALL_COLORS[cat as keyof typeof CALL_COLORS] ?? "#94a3b8"} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TT} formatter={(v) => [`${v}`, ""]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1.5">
                {(["Medical","Fire","Police","Traffic","Other"] as const).map(cat => (
                  <div key={cat} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: CALL_COLORS[cat] }} />
                    <span className="text-[11px] text-foreground/70 flex-1">{cat}</span>
                    <span className="text-[10px] font-mono text-muted-foreground/50">{total > 0 ? ((catCounts[cat] / total) * 100).toFixed(0) : 0}%</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="h-4" />
        </div>
      </div>
    </div>
  );
}
