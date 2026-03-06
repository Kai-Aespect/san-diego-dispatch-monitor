import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import { type IncidentListResponse } from "@shared/routes";
import { differenceInHours, differenceInDays, format, startOfDay, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import { TrendingUp, Clock, Flame, Shield, Ambulance, Car, AlertTriangle } from "lucide-react";

interface AnalyticsPanelProps {
  incidents: IncidentListResponse;
}

type TimeRange = "1d" | "7d" | "30d" | "365d";
type ChartView = "volume" | "types" | "trend" | "summary";

const RANGE_LABELS: Record<TimeRange, string> = {
  "1d": "24H", "7d": "7D", "30d": "30D", "365d": "365D",
};

const CALL_COLORS = {
  Medical:  "#34d399",
  Fire:     "#f87171",
  Police:   "#60a5fa",
  Traffic:  "#fb923c",
  Other:    "#a78bfa",
};

function categorize(inc: IncidentListResponse[0]): string {
  if (inc.callTypeFamily === "Medical") return "Medical";
  if (inc.agency === "fire" &&
     !inc.callTypeFamily?.toLowerCase().includes("medical")) {
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
  const cutoffs: Record<TimeRange, number> = { "1d": 24, "7d": 168, "30d": 720, "365d": 8760 };
  const hours = cutoffs[range];
  return incidents.filter(i => differenceInHours(now, new Date(i.time)) <= hours);
}

const TOOLTIP_STYLE = {
  backgroundColor: "#1a1f35",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "8px",
  fontSize: "11px",
  color: "#e2e8f0",
};

export function AnalyticsPanel({ incidents }: AnalyticsPanelProps) {
  const [range, setRange] = useState<TimeRange>("7d");
  const [view, setView] = useState<ChartView>("summary");

  const ranged = useMemo(() => filterByRange(incidents, range), [incidents, range]);

  // ── Time-of-day histogram ─────────────────────────────────────
  const hourlyData = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      label: h === 0 ? "12a" : h < 12 ? `${h}a` : h === 12 ? "12p" : `${h - 12}p`,
      Medical: 0, Fire: 0, Police: 0, Traffic: 0, Other: 0, total: 0,
    }));
    for (const inc of ranged) {
      const h = new Date(inc.time).getHours();
      const cat = categorize(inc) as keyof typeof CALL_COLORS;
      buckets[h][cat]++;
      buckets[h].total++;
    }
    return buckets;
  }, [ranged]);

  // ── Category breakdown ────────────────────────────────────────
  const pieData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const inc of ranged) {
      const cat = categorize(inc);
      counts[cat] = (counts[cat] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [ranged]);

  // ── Daily trend ───────────────────────────────────────────────
  const dailyData = useMemo(() => {
    const days = range === "1d" ? 1 : range === "7d" ? 7 : range === "30d" ? 30 : 90;
    const buckets = Array.from({ length: days }, (_, i) => {
      const d = subDays(startOfDay(new Date()), days - 1 - i);
      return {
        date: format(d, days <= 7 ? "EEE" : days <= 30 ? "M/d" : "M/d"),
        fullDate: d,
        Medical: 0, Fire: 0, Police: 0, Traffic: 0, Other: 0, total: 0,
      };
    });
    for (const inc of incidents) {
      const d = startOfDay(new Date(inc.time));
      const idx = buckets.findIndex(b => Math.abs(differenceInDays(b.fullDate, d)) === 0);
      if (idx >= 0) {
        const cat = categorize(inc) as keyof typeof CALL_COLORS;
        buckets[idx][cat]++;
        buckets[idx].total++;
      }
    }
    return buckets;
  }, [incidents, range]);

  // ── Most common call types ────────────────────────────────────
  const topCallTypes = useMemo(() => {
    const counts: Record<string, { count: number; cat: string }> = {};
    for (const inc of ranged) {
      const key = inc.callType;
      if (!counts[key]) counts[key] = { count: 0, cat: categorize(inc) };
      counts[key].count++;
    }
    return Object.entries(counts)
      .map(([name, { count, cat }]) => ({ name, count, cat }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [ranged]);

  // ── Summary stats ─────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = ranged.length;
    const byCategory: Record<string, number> = {};
    for (const inc of ranged) {
      const c = categorize(inc);
      byCategory[c] = (byCategory[c] ?? 0) + 1;
    }
    const rangeDays = range === "1d" ? 1 : range === "7d" ? 7 : range === "30d" ? 30 : 365;
    const avgPerDay = total / rangeDays;

    // Busiest hour
    const busiestHour = [...hourlyData].sort((a, b) => b.total - a.total)[0];

    return { total, byCategory, avgPerDay, busiestHour };
  }, [ranged, hourlyData, range]);

  const VIEWS: { id: ChartView; label: string }[] = [
    { id: "summary", label: "Summary" },
    { id: "types",   label: "By Type" },
    { id: "volume",  label: "By Hour" },
    { id: "trend",   label: "Trend" },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Time range selector */}
      <div className="px-3 pt-3 pb-2 border-b border-white/5 shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-muted-foreground">
            {ranged.length} calls in range
          </span>
          <div className="flex gap-1">
            {(["1d","7d","30d","365d"] as TimeRange[]).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors border",
                  range === r
                    ? "bg-primary/20 text-primary border-primary/30"
                    : "text-muted-foreground border-white/8 hover:bg-white/5"
                )}
              >
                {RANGE_LABELS[r]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-1">
          {VIEWS.map(v => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={cn(
                "flex-1 text-[10px] font-semibold py-1 rounded-md transition-colors border",
                view === v.id
                  ? "bg-primary/15 text-primary border-primary/25"
                  : "text-muted-foreground border-white/8 hover:bg-white/5"
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">

        {/* ── SUMMARY VIEW ── */}
        {view === "summary" && (
          <div className="space-y-4">
            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/5 border border-white/8 rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground font-mono">Total Calls</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-[10px] text-muted-foreground">{RANGE_LABELS[range]}</p>
              </div>
              <div className="bg-white/5 border border-white/8 rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground font-mono">Avg / Day</p>
                <p className="text-2xl font-bold text-foreground">{stats.avgPerDay.toFixed(1)}</p>
                <p className="text-[10px] text-muted-foreground">calls per day</p>
              </div>
              <div className="bg-white/5 border border-white/8 rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground font-mono">Busiest Hour</p>
                <p className="text-2xl font-bold text-foreground">{stats.busiestHour?.label ?? "—"}</p>
                <p className="text-[10px] text-muted-foreground">{stats.busiestHour?.total ?? 0} calls</p>
              </div>
              <div className="bg-white/5 border border-white/8 rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground font-mono">Top Type</p>
                <p className="text-sm font-bold text-foreground leading-tight mt-0.5">
                  {pieData[0]?.name ?? "—"}
                </p>
                <p className="text-[10px] text-muted-foreground">{pieData[0]?.value ?? 0} calls ({stats.total > 0 ? Math.round((pieData[0]?.value ?? 0) / stats.total * 100) : 0}%)</p>
              </div>
            </div>

            {/* Category breakdown bars */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Call Categories</p>
              {(["Medical","Fire","Police","Traffic","Other"] as const).map(cat => {
                const count = stats.byCategory[cat] ?? 0;
                const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                const color = CALL_COLORS[cat];
                const icons: Record<string, React.ReactNode> = {
                  Medical: <span style={{color}}>✚</span>,
                  Fire:    <Flame className="w-3 h-3" style={{color}} />,
                  Police:  <Shield className="w-3 h-3" style={{color}} />,
                  Traffic: <Car className="w-3 h-3" style={{color}} />,
                  Other:   <AlertTriangle className="w-3 h-3" style={{color}} />,
                };
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5 text-xs">
                        {icons[cat]}
                        <span className="text-foreground/80 font-medium">{cat}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-muted-foreground">{pct.toFixed(1)}%</span>
                        <span className="text-xs font-bold" style={{color}}>{count}</span>
                      </div>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Top 5 call types */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Most Common Calls</p>
              {topCallTypes.slice(0, 6).map((ct, i) => (
                <div key={ct.name} className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-muted-foreground/50 w-4 text-right">{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] text-foreground/80 truncate">{ct.name}</span>
                      <span className="text-[10px] font-bold shrink-0" style={{color: CALL_COLORS[ct.cat as keyof typeof CALL_COLORS] ?? "#fff"}}>
                        {ct.count}
                      </span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-1 mt-0.5">
                      <div
                        className="h-1 rounded-full"
                        style={{
                          width: `${(ct.count / (topCallTypes[0]?.count ?? 1)) * 100}%`,
                          backgroundColor: CALL_COLORS[ct.cat as keyof typeof CALL_COLORS] ?? "#fff",
                          opacity: 0.7,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── BY TYPE VIEW ── */}
        {view === "types" && (
          <div className="space-y-4">
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                  >
                    {pieData.map(entry => (
                      <Cell key={entry.name} fill={CALL_COLORS[entry.name as keyof typeof CALL_COLORS] ?? "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v} calls`, ""]} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="space-y-1">
              {pieData.map(d => {
                const pct = stats.total > 0 ? (d.value / stats.total * 100).toFixed(1) : "0";
                const color = CALL_COLORS[d.name as keyof typeof CALL_COLORS] ?? "#94a3b8";
                return (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{backgroundColor: color}} />
                    <span className="text-xs text-foreground/80 flex-1">{d.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{pct}%</span>
                    <span className="text-xs font-bold" style={{color}}>{d.value}</span>
                  </div>
                );
              })}
            </div>

            {/* Full call type breakdown */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">All Call Types</p>
              {topCallTypes.map((ct, i) => (
                <div key={ct.name} className="flex items-center gap-2">
                  <span className="text-[9px] w-4 text-right font-mono text-muted-foreground/40">{i+1}</span>
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{backgroundColor: CALL_COLORS[ct.cat as keyof typeof CALL_COLORS] ?? "#fff"}}
                  />
                  <span className="flex-1 text-[11px] text-foreground/70 truncate">{ct.name}</span>
                  <span className="text-xs font-bold shrink-0" style={{color: CALL_COLORS[ct.cat as keyof typeof CALL_COLORS] ?? "#fff"}}>
                    {ct.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── BY HOUR VIEW ── */}
        {view === "volume" && (
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Call Volume by Hour of Day
              </p>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }} barSize={6} barGap={1}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 9, fill: "#64748b" }}
                      tickLine={false}
                      axisLine={false}
                      interval={2}
                    />
                    <YAxis tick={{ fontSize: 9, fill: "#64748b" }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="Medical" stackId="a" fill={CALL_COLORS.Medical} radius={[0,0,0,0]} />
                    <Bar dataKey="Fire"    stackId="a" fill={CALL_COLORS.Fire}    radius={[0,0,0,0]} />
                    <Bar dataKey="Police"  stackId="a" fill={CALL_COLORS.Police}  radius={[0,0,0,0]} />
                    <Bar dataKey="Traffic" stackId="a" fill={CALL_COLORS.Traffic} radius={[0,0,0,0]} />
                    <Bar dataKey="Other"   stackId="a" fill={CALL_COLORS.Other}   radius={[2,2,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Peak hours */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Peak Hours</p>
              {[...hourlyData]
                .sort((a, b) => b.total - a.total)
                .slice(0, 6)
                .map((h, i) => (
                  <div key={h.hour} className="flex items-center gap-2">
                    <span className="text-[9px] w-4 text-right font-mono text-muted-foreground/40">{i+1}</span>
                    <span className="text-xs font-mono text-foreground/80 w-8">{h.label}</span>
                    <div className="flex-1 bg-white/5 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-primary/60"
                        style={{ width: `${hourlyData[0]?.total > 0 ? (h.total / Math.max(...hourlyData.map(x => x.total))) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-foreground/70">{h.total}</span>
                  </div>
                ))
              }
            </div>

            {/* Time-of-day summary: overnight, morning, afternoon, evening */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Overnight", hours: [0,1,2,3,4,5], icon: "🌙" },
                { label: "Morning",   hours: [6,7,8,9,10,11], icon: "🌅" },
                { label: "Afternoon", hours: [12,13,14,15,16,17], icon: "☀️" },
                { label: "Evening",   hours: [18,19,20,21,22,23], icon: "🌆" },
              ].map(period => {
                const total = period.hours.reduce((s, h) => s + (hourlyData[h]?.total ?? 0), 0);
                return (
                  <div key={period.label} className="bg-white/5 border border-white/8 rounded-xl p-2.5">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-sm">{period.icon}</span>
                      <span className="text-[10px] text-muted-foreground font-medium">{period.label}</span>
                    </div>
                    <p className="text-xl font-bold text-foreground">{total}</p>
                    <p className="text-[9px] text-muted-foreground/60">
                      {stats.total > 0 ? ((total / stats.total) * 100).toFixed(0) : 0}% of calls
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TREND VIEW ── */}
        {view === "trend" && (
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Daily Call Volume
              </p>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }} barSize={range === "365d" ? 3 : 8} barGap={1}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 9, fill: "#64748b" }}
                      tickLine={false}
                      axisLine={false}
                      interval={range === "365d" ? 6 : range === "30d" ? 4 : 0}
                    />
                    <YAxis tick={{ fontSize: 9, fill: "#64748b" }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="Medical" stackId="a" fill={CALL_COLORS.Medical} />
                    <Bar dataKey="Fire"    stackId="a" fill={CALL_COLORS.Fire}    />
                    <Bar dataKey="Police"  stackId="a" fill={CALL_COLORS.Police}  />
                    <Bar dataKey="Traffic" stackId="a" fill={CALL_COLORS.Traffic} />
                    <Bar dataKey="Other"   stackId="a" fill={CALL_COLORS.Other}   radius={[2,2,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Line chart of totals */}
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Total Trend
              </p>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 9, fill: "#64748b" }}
                      tickLine={false}
                      axisLine={false}
                      interval={range === "365d" ? 8 : range === "30d" ? 4 : 0}
                    />
                    <YAxis tick={{ fontSize: 9, fill: "#64748b" }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#6366f1"
                      strokeWidth={1.5}
                      dot={false}
                      name="Total"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Day-of-week breakdown */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">By Day of Week</p>
              {(() => {
                const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
                const dayCounts = Array(7).fill(0);
                for (const inc of ranged) {
                  dayCounts[new Date(inc.time).getDay()]++;
                }
                const maxDay = Math.max(...dayCounts);
                return dayNames.map((d, i) => (
                  <div key={d} className="flex items-center gap-2">
                    <span className="text-xs font-mono text-foreground/60 w-6">{d}</span>
                    <div className="flex-1 bg-white/5 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-indigo-400/60"
                        style={{ width: maxDay > 0 ? `${(dayCounts[i] / maxDay) * 100}%` : "0%" }}
                      />
                    </div>
                    <span className="text-xs font-bold text-foreground/70 w-5 text-right">{dayCounts[i]}</span>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
