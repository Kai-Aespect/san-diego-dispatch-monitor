import { useState } from "react";
import { type IncidentListResponse } from "@shared/routes";
import { Bookmark, StickyNote, Shield, Settings, ChevronLeft, ChevronRight } from "lucide-react";
import { BookmarksPanel } from "./bookmarks-panel";
import { LocalNotes } from "./local-notes";
import { AdminInfoBoard } from "./admin-info-board";
import { SettingsPanel } from "./settings-panel";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { cn } from "@/lib/utils";

type PanelTab = "bookmarks" | "notes" | "info" | "settings";

interface SidePanelProps {
  incidents: IncidentListResponse;
  onSelectIncident: (inc: IncidentListResponse[0]) => void;
}

const TABS: Array<{ id: PanelTab; icon: React.ReactNode; label: string }> = [
  { id: "bookmarks", icon: <Bookmark className="w-4 h-4" />, label: "Tracked" },
  { id: "notes",     icon: <StickyNote className="w-4 h-4" />, label: "My Notes" },
  { id: "info",      icon: <Shield className="w-4 h-4" />, label: "Info" },
  { id: "settings",  icon: <Settings className="w-4 h-4" />, label: "Settings" },
];

export function SidePanel({ incidents, onSelectIncident }: SidePanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>("bookmarks");
  const [collapsed, setCollapsed] = useState(false);
  const { bookmarkedIds } = useBookmarks();

  return (
    <div className={cn(
      "h-full flex flex-col border-l border-white/5 bg-background/70 backdrop-blur-md transition-all duration-300",
      collapsed ? "w-12" : "w-[320px] xl:w-[360px]"
    )}>
      {/* Tab bar */}
      <div className={cn("flex border-b border-white/5 bg-card/30", collapsed ? "flex-col" : "flex-row")}>
        {!collapsed && TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 flex flex-col items-center py-3 px-1 gap-1 text-[10px] font-semibold transition-all relative",
              activeTab === tab.id
                ? "text-primary bg-primary/5 border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            )}
            data-testid={`tab-${tab.id}`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.id === "bookmarks" && bookmarkedIds.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                {bookmarkedIds.length}
              </span>
            )}
          </button>
        ))}

        {collapsed && (
          <div className="flex flex-col items-center py-2 gap-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setCollapsed(false); }}
                className={cn(
                  "w-9 h-9 flex items-center justify-center rounded-lg transition-all relative",
                  activeTab === tab.id ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
                title={tab.label}
              >
                {tab.icon}
                {tab.id === "bookmarks" && bookmarkedIds.length > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-primary text-primary-foreground text-[8px] font-bold flex items-center justify-center">
                    {bookmarkedIds.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground hover:bg-white/5",
            collapsed ? "w-full h-9 mt-1" : "px-2 border-l border-white/5"
          )}
          title={collapsed ? "Expand panel" : "Collapse panel"}
        >
          {collapsed ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Content */}
      {!collapsed && (
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === "bookmarks" && (
            <BookmarksPanel incidents={incidents} onSelectIncident={onSelectIncident} />
          )}
          {activeTab === "notes" && (
            <LocalNotes incidents={incidents} />
          )}
          {activeTab === "info" && (
            <AdminInfoBoard />
          )}
          {activeTab === "settings" && (
            <div className="overflow-y-auto custom-scrollbar flex-1">
              <SettingsPanel />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
