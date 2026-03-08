import { useSettings, type Theme, type AckMode } from "@/hooks/use-settings";
import { useAuth } from "@/hooks/use-auth";
import { Sun, Moon, Volume2, VolumeX, Palette, Bell, Zap, Timer, CreditCard, LogOut, BellRing, BellDot } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";

export function SettingsPanel() {
  const { settings, setTheme, setVolumeEnabled, setFastRefresh, setAckMode } = useSettings();
  const { user, isSubscribed, logout } = useAuth();
  const [portalLoading, setPortalLoading] = useState(false);

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await apiRequest("POST", "/api/stripe/portal", {});
      if (!res.ok) throw new Error("Portal unavailable");
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch {
      alert("Unable to open billing portal. Please try again.");
    } finally {
      setPortalLoading(false);
    }
  };

  const ackOptions: { value: AckMode; label: string; desc: string }[] = [
    { value: "new", label: "New calls only", desc: "Only alert for brand-new incidents" },
    { value: "updates", label: "Updates only", desc: "Only alert for changes to existing calls" },
    { value: "both", label: "New & updates", desc: "Alert for both new and updated calls" },
  ];

  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <Palette className="w-3.5 h-3.5" /> Appearance
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {(["dark", "light"] as Theme[]).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`p-4 rounded-xl border text-sm font-semibold flex flex-col items-center justify-center gap-2 transition-all ${
                settings.theme === t
                  ? "border-primary bg-primary/10 text-primary shadow-lg shadow-primary/10"
                  : "border-white/10 bg-accent/20 text-muted-foreground hover:border-white/20 hover:bg-accent/30"
              }`}
              data-testid={`theme-button-${t}`}
            >
              {t === "dark" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              {t === "dark" ? "Dark Mode" : "Light Mode"}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground/60 mt-2 px-1">
          Currently: <span className="text-foreground font-semibold">{settings.theme === "dark" ? "Dark" : "Light"} mode</span>. Changes apply instantly.
        </p>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <Bell className="w-3.5 h-3.5" /> Audio Alerts
        </h3>
        <div className="flex items-center justify-between p-3 rounded-xl bg-accent/30 border border-white/5">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${settings.volumeEnabled ? "bg-primary/20" : "bg-accent/50"}`}>
              {settings.volumeEnabled
                ? <Volume2 className="w-4 h-4 text-primary" />
                : <VolumeX className="w-4 h-4 text-muted-foreground" />
              }
            </div>
            <div>
              <Label className="text-sm font-semibold text-foreground">Alert Tones</Label>
              <p className="text-xs text-muted-foreground">
                {settings.volumeEnabled ? "3-tone beep on qualifying calls" : "Alerts muted"}
              </p>
            </div>
          </div>
          <Switch
            checked={settings.volumeEnabled}
            onCheckedChange={setVolumeEnabled}
            data-testid="switch-volume"
          />
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <BellDot className="w-3.5 h-3.5" /> Acknowledgment
        </h3>
        <p className="text-[10px] text-muted-foreground/60 mb-3 px-1">Choose which calls show the unread badge and trigger audio alerts.</p>
        <div className="space-y-2">
          {ackOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setAckMode(opt.value)}
              className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                settings.ackMode === opt.value
                  ? "border-primary/40 bg-primary/8 text-foreground"
                  : "border-white/10 bg-accent/20 text-muted-foreground hover:border-white/20"
              }`}
              data-testid={`ack-mode-${opt.value}`}
            >
              <p className="font-semibold">{opt.label}</p>
              <p className="text-[10px] opacity-70 mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <Timer className="w-3.5 h-3.5" /> Refresh Rate
          {!isSubscribed && <span className="ml-auto text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Zap className="w-2.5 h-2.5" />Pro</span>}
        </h3>
        <div className="flex items-center justify-between p-3 rounded-xl bg-accent/30 border border-white/5">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${settings.fastRefresh && isSubscribed ? "bg-primary/20" : "bg-accent/50"}`}>
              <Timer className={`w-4 h-4 ${settings.fastRefresh && isSubscribed ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div>
              <Label className="text-sm font-semibold text-foreground">Fast Refresh</Label>
              <p className="text-xs text-muted-foreground">
                {settings.fastRefresh && isSubscribed ? "Refreshing every 30 seconds" : "Refreshing every 60 seconds"}
              </p>
            </div>
          </div>
          <Switch
            checked={settings.fastRefresh && isSubscribed}
            onCheckedChange={isSubscribed ? setFastRefresh : undefined}
            disabled={!isSubscribed}
            data-testid="switch-fast-refresh"
          />
        </div>
        {!isSubscribed && (
          <p className="text-[10px] text-muted-foreground/60 mt-2 px-1">
            Upgrade to Dispatch Pro to enable 30-second refresh.
          </p>
        )}
      </div>

      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Account</h3>
        <div className="rounded-xl border border-white/8 bg-accent/20 p-3 space-y-2">
          {user && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Signed in as</span>
              <span className="text-foreground font-semibold truncate max-w-[140px]">{user.name}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Plan</span>
            <span className={`font-bold uppercase text-[10px] px-2 py-0.5 rounded-full ${isSubscribed ? "bg-primary/10 text-primary" : "bg-white/5 text-muted-foreground"}`}>
              {isSubscribed ? "Dispatch Pro" : "Free"}
            </span>
          </div>
          {isSubscribed && (
            <button
              onClick={openPortal}
              disabled={portalLoading}
              data-testid="button-manage-billing"
              className="w-full mt-1 flex items-center justify-center gap-1.5 h-7 rounded-lg bg-white/5 border border-white/10 text-xs text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all disabled:opacity-50"
            >
              <CreditCard className="w-3.5 h-3.5" />
              {portalLoading ? "Opening..." : "Manage Subscription"}
            </button>
          )}
          <button
            onClick={() => logout()}
            data-testid="button-logout"
            className="w-full flex items-center justify-center gap-1.5 h-7 rounded-lg bg-red-500/5 border border-red-500/15 text-xs text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">About</h3>
        <div className="p-3 rounded-xl bg-accent/20 border border-white/5 text-xs text-muted-foreground space-y-1 font-mono">
          <div className="flex justify-between"><span>Data Source</span><span className="text-foreground">SD Fire/Police APIs</span></div>
          <div className="flex justify-between"><span>Refresh Rate</span><span className="text-foreground">{settings.fastRefresh && isSubscribed ? "Every 30 seconds" : "Every 60 seconds"}</span></div>
          <div className="flex justify-between"><span>Map Engine</span><span className="text-foreground">Leaflet + OSM</span></div>
          <div className="flex justify-between"><span>Geocoding</span><span className="text-foreground">Nominatim</span></div>
        </div>
      </div>
    </div>
  );
}
