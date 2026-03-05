import { useSettings, type Theme } from "@/hooks/use-settings";
import { Sun, Moon, Volume2, VolumeX, Palette, Bell } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function SettingsPanel() {
  const { settings, setTheme, setVolumeEnabled } = useSettings();

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
              {t === "dark"
                ? <Moon className="w-5 h-5" />
                : <Sun className="w-5 h-5" />
              }
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
                {settings.volumeEnabled ? "3-tone beep on new/updated calls" : "Alerts muted"}
              </p>
            </div>
          </div>
          <Switch
            checked={settings.volumeEnabled}
            onCheckedChange={setVolumeEnabled}
            data-testid="switch-volume"
          />
        </div>
        {settings.volumeEnabled && (
          <p className="text-[10px] text-muted-foreground/60 mt-2 px-1">
            Plays only when a new call is added or an existing call's units, type, or status changes.
          </p>
        )}
      </div>

      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">About</h3>
        <div className="p-3 rounded-xl bg-accent/20 border border-white/5 text-xs text-muted-foreground space-y-1 font-mono">
          <div className="flex justify-between"><span>Data Source</span><span className="text-foreground">SD Fire/Police APIs</span></div>
          <div className="flex justify-between"><span>Refresh Rate</span><span className="text-foreground">Every 5 seconds</span></div>
          <div className="flex justify-between"><span>Map Engine</span><span className="text-foreground">Leaflet + OSM</span></div>
          <div className="flex justify-between"><span>Geocoding</span><span className="text-foreground">Nominatim</span></div>
        </div>
      </div>
    </div>
  );
}
