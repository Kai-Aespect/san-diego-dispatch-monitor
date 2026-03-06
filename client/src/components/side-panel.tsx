import { useState } from "react";
import { type IncidentListResponse } from "@shared/routes";
import { Bookmark, StickyNote, Shield, Settings, Lock, Radio, BookOpen, BarChart2 } from "lucide-react";
import { BookmarksPanel } from "./bookmarks-panel";
import { LocalNotes } from "./local-notes";
import { InfoBoard } from "./info-board";
import { AdminPanel } from "./admin-panel";
import { SettingsPanel } from "./settings-panel";
import { UnitsPanel } from "./units-panel";
import { ReferencePanel } from "./reference-panel";
import { AnalyticsPanel } from "./analytics-panel";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { cn } from "@/lib/utils";

type PanelTab = "bookmarks" | "notes" | "units" | "info" | "analytics" | "reference" | "admin" | "settings";

interface SidePanelProps {
  incidents: IncidentListResponse;
  onSelectIncident: (inc: IncidentListResponse[0]) => void;
}

export function SidePanel({ incidents, onSelectIncident }: SidePanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>("bookmarks");
  const { bookmarkedIds } = useBookmarks();
  const { isAdmin } = useAdminAuth();

  const activeUnitCount = incidents
    .filter(i => i.active)
    .reduce((acc, i) => acc + (i.units?.length ?? 0), 0);

  const TABS: Array<{
    id: PanelTab;
    icon: React.ReactNode;
    label: string;
    testId: string;
    badge?: number;
    adminOnly?: boolean;
  }> = [
    { id: "bookmarks", icon: <Bookmark className="w-4 h-4" />,   label: "Tracked",    testId: "tab-bookmarks",  badge: bookmarkedIds.length },
    { id: "notes",     icon: <StickyNote className="w-4 h-4" />, label: "Notes",      testId: "tab-notes" },
    { id: "units",     icon: <Radio className="w-4 h-4" />,      label: "Units",      testId: "tab-units",      badge: activeUnitCount },
    { id: "analytics", icon: <BarChart2 className="w-4 h-4" />,  label: "Analytics",  testId: "tab-analytics" },
    { id: "info",      icon: <Shield className="w-4 h-4" />,     label: "Info",       testId: "tab-info" },
    { id: "reference", icon: <BookOpen className="w-4 h-4" />,   label: "Reference",  testId: "tab-reference" },
    { id: "admin",     icon: <Lock className="w-4 h-4" />,       label: "Admin",      testId: "tab-admin" },
    { id: "settings",  icon: <Settings className="w-4 h-4" />,   label: "Settings",   testId: "tab-settings" },
  ];

  return (
    <div className="h-full flex flex-row overflow-hidden">
      {/* ── Vertical nav sidebar ── */}
      <nav className="flex flex-col shrink-0 w-[52px] border-r border-white/5 bg-[#0c0e1a]/60 py-2 gap-0.5 overflow-y-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "relative mx-1 flex flex-col items-center justify-center gap-0.5 py-2.5 rounded-lg text-[8px] font-semibold leading-tight transition-colors group",
              activeTab === tab.id
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5",
              tab.id === "admin" && isAdmin && activeTab !== "admin" && "text-emerald-400"
            )}
            title={tab.label}
            data-testid={tab.testId}
          >
            {tab.icon}
            <span className="leading-none uppercase tracking-wide">{tab.label}</span>

            {/* Badge */}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="absolute top-1 right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-primary text-primary-foreground text-[8px] font-bold flex items-center justify-center">
                {tab.badge > 99 ? "99+" : tab.badge}
              </span>
            )}

            {/* Admin active dot */}
            {tab.id === "admin" && isAdmin && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400" />
            )}

            {/* Active left-edge indicator */}
            {activeTab === tab.id && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full bg-primary" />
            )}
          </button>
        ))}
      </nav>

      {/* ── Content area ── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {activeTab === "bookmarks" && (
          <BookmarksPanel incidents={incidents} onSelectIncident={onSelectIncident} />
        )}
        {activeTab === "notes" && (
          <LocalNotes incidents={incidents} />
        )}
        {activeTab === "units" && (
          <UnitsPanel incidents={incidents} onSelectIncident={onSelectIncident} />
        )}
        {activeTab === "analytics" && (
          <AnalyticsPanel incidents={incidents} />
        )}
        {activeTab === "info" && (
          <div className="flex flex-col h-full">
            <div className="px-3 pt-3 pb-2.5 border-b border-white/5 flex items-center gap-2 shrink-0">
              <Shield className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground">Info Board</span>
            </div>
            <InfoBoard />
          </div>
        )}
        {activeTab === "reference" && (
          <ReferencePanel />
        )}
        {activeTab === "admin" && (
          <AdminPanel incidents={incidents} />
        )}
        {activeTab === "settings" && (
          <div className="overflow-y-auto custom-scrollbar flex-1">
            <SettingsPanel />
          </div>
        )}
      </div>
    </div>
  );
}
