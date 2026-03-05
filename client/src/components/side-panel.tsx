import { useState } from "react";
import { type IncidentListResponse } from "@shared/routes";
import { Bookmark, StickyNote, Shield, Settings, Lock } from "lucide-react";
import { BookmarksPanel } from "./bookmarks-panel";
import { LocalNotes } from "./local-notes";
import { InfoBoard } from "./info-board";
import { AdminPanel } from "./admin-panel";
import { SettingsPanel } from "./settings-panel";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { cn } from "@/lib/utils";

type PanelTab = "bookmarks" | "notes" | "info" | "admin" | "settings";

interface SidePanelProps {
  incidents: IncidentListResponse;
  onSelectIncident: (inc: IncidentListResponse[0]) => void;
  collapsed?: boolean;
  onExpand?: () => void;
}

export function SidePanel({ incidents, onSelectIncident, collapsed = false, onExpand }: SidePanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>("bookmarks");
  const { bookmarkedIds } = useBookmarks();
  const { isAdmin } = useAdminAuth();

  const TABS: Array<{ id: PanelTab; icon: React.ReactNode; label: string; testId: string }> = [
    { id: "bookmarks", icon: <Bookmark className="w-4 h-4" />, label: "Tracked", testId: "tab-bookmarks" },
    { id: "notes",     icon: <StickyNote className="w-4 h-4" />, label: "My Notes", testId: "tab-notes" },
    { id: "info",      icon: <Shield className="w-4 h-4" />, label: "Info", testId: "tab-info" },
    { id: "admin",     icon: <Lock className="w-4 h-4" />, label: "Admin", testId: "tab-admin" },
    { id: "settings",  icon: <Settings className="w-4 h-4" />, label: "Settings", testId: "tab-settings" },
  ];

  return (
    <div className="h-full flex flex-col border-l border-white/5 bg-background/70 backdrop-blur-md w-full overflow-hidden">
      {/* Tab bar */}
      <div className={cn("flex border-b border-white/5 bg-card/30 shrink-0", collapsed ? "flex-col py-2 gap-1 items-center" : "flex-row")}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              if (collapsed && onExpand) onExpand();
            }}
            className={cn(
              "transition-all relative",
              collapsed
                ? "w-9 h-9 flex items-center justify-center rounded-lg"
                : "flex-1 flex flex-col items-center py-3 px-1 gap-1 text-[10px] font-semibold border-b-2",
              activeTab === tab.id
                ? collapsed
                  ? "text-primary bg-primary/10"
                  : "text-primary bg-primary/5 border-primary"
                : collapsed
                  ? "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5 border-transparent",
              tab.id === "admin" && isAdmin && "text-emerald-400"
            )}
            title={tab.label}
            data-testid={tab.testId}
          >
            {tab.icon}
            {!collapsed && <span>{tab.label}</span>}
            {tab.id === "bookmarks" && bookmarkedIds.length > 0 && (
              <span className={cn(
                "rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center absolute",
                collapsed ? "top-0.5 right-0.5 w-3.5 h-3.5 text-[8px]" : "top-1 right-1 w-4 h-4 text-[9px]"
              )}>
                {bookmarkedIds.length}
              </span>
            )}
            {tab.id === "admin" && isAdmin && !collapsed && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {!collapsed && (
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {activeTab === "bookmarks" && (
            <BookmarksPanel incidents={incidents} onSelectIncident={onSelectIncident} />
          )}
          {activeTab === "notes" && (
            <LocalNotes incidents={incidents} />
          )}
          {activeTab === "info" && (
            <div className="flex flex-col h-full">
              <div className="px-4 pt-4 pb-3 border-b border-white/5 flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground">Info Board</span>
              </div>
              <InfoBoard />
            </div>
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
      )}
    </div>
  );
}
