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

export type PanelTab = "bookmarks" | "notes" | "units" | "analytics" | "info" | "reference" | "admin" | "settings";

interface SidePanelProps {
  incidents: IncidentListResponse;
  onSelectIncident: (inc: IncidentListResponse[0]) => void;
  activeTab?: PanelTab;
  setActiveTab?: (t: PanelTab) => void;
  focusUnitId?: string | null;
}

export function SidePanel({ incidents, onSelectIncident, activeTab: controlledTab, setActiveTab: setControlledTab, focusUnitId }: SidePanelProps) {
  const [internalTab, setInternalTab] = useState<PanelTab>("bookmarks");
  const activeTab = controlledTab ?? internalTab;
  const setActiveTab = setControlledTab ?? setInternalTab;
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
  }> = [
    { id: "bookmarks", icon: <Bookmark className="w-4 h-4" />,   label: "Track",   testId: "tab-bookmarks",  badge: bookmarkedIds.length },
    { id: "notes",     icon: <StickyNote className="w-4 h-4" />, label: "Notes",   testId: "tab-notes" },
    { id: "units",     icon: <Radio className="w-4 h-4" />,      label: "Units",   testId: "tab-units",      badge: activeUnitCount },
    { id: "analytics", icon: <BarChart2 className="w-4 h-4" />,  label: "Stats",   testId: "tab-analytics" },
    { id: "info",      icon: <Shield className="w-4 h-4" />,     label: "Info",    testId: "tab-info" },
    { id: "reference", icon: <BookOpen className="w-4 h-4" />,   label: "Ref",     testId: "tab-reference" },
    { id: "admin",     icon: <Lock className="w-4 h-4" />,       label: "Admin",   testId: "tab-admin" },
    { id: "settings",  icon: <Settings className="w-4 h-4" />,   label: "Set",     testId: "tab-settings" },
  ];

  return (
    <div className="h-full flex flex-row overflow-hidden">

      {/* ── Content area ── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {activeTab === "bookmarks" && <BookmarksPanel incidents={incidents} onSelectIncident={onSelectIncident} />}
        {activeTab === "notes"     && <LocalNotes incidents={incidents} />}
        {activeTab === "units"     && <UnitsPanel incidents={incidents} onSelectIncident={onSelectIncident} focusUnitId={focusUnitId} />}
        {activeTab === "analytics" && <AnalyticsPanel incidents={incidents} />}
        {activeTab === "info" && (
          <div className="flex flex-col h-full">
            <div className="px-3 pt-3 pb-2.5 border-b border-white/5 flex items-center gap-2 shrink-0">
              <Shield className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground">Info Board</span>
            </div>
            <InfoBoard />
          </div>
        )}
        {activeTab === "reference" && <ReferencePanel />}
        {activeTab === "admin"     && <AdminPanel incidents={incidents} />}
        {activeTab === "settings"  && (
          <div className="overflow-y-auto custom-scrollbar flex-1">
            <SettingsPanel />
          </div>
        )}
      </div>

      {/* ── Vertical nav — RIGHT side ── */}
      <nav className="flex flex-col shrink-0 w-[58px] border-l border-white/5 bg-[#0a0c18]/70 py-2 gap-0.5 overflow-y-auto">
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          const adminActive = tab.id === "admin" && isAdmin;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              title={tab.label}
              data-testid={tab.testId}
              className={cn(
                "relative mx-1.5 flex flex-col items-center justify-center gap-1 py-2.5 rounded-lg",
                "text-[10px] font-medium leading-none",
                "transition-all duration-150",
                active
                  ? "bg-primary/15 text-primary"
                  : adminActive
                  ? "text-emerald-400 hover:bg-white/5"
                  : "text-muted-foreground/50 hover:text-foreground/80 hover:bg-white/5"
              )}
            >
              {/* Active right-edge bar */}
              {active && (
                <span className="absolute right-0 top-1/2 -translate-y-1/2 w-[2px] h-6 rounded-l-full bg-primary" />
              )}

              {tab.icon}
              <span className="w-full text-center px-0.5 truncate">{tab.label}</span>

              {/* Badge */}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="absolute top-1 right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-primary text-primary-foreground text-[8px] font-bold flex items-center justify-center leading-none">
                  {tab.badge > 99 ? "99" : tab.badge}
                </span>
              )}

              {/* Admin online dot */}
              {adminActive && !active && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#0a0c18]" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
