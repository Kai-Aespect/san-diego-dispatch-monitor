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
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-accent/30 border border-white/5">
            <div className="flex items-center gap-3">
              {settings.theme === "dark" ? (
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                  <Moon className="w-4 h-4 text-blue-400" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <Sun className="w-4 h-4 text-yellow-600" />
                </div>
              )}
              <div>
                <Label className="text-sm font-semibold text-foreground">
                  {settings.theme === "dark" ? "Dark Mode" : "Light Mode"}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {settings.theme === "dark" ? "Easy on the eyes at night" : "Bright and clear display"}
                </p>
              </div>
            </div>
            <Switch
              checked={settings.theme === "light"}
              onCheckedChange={(checked) => setTheme(checked ? "light" : "dark")}
              data-testid="switch-theme"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            {(["dark", "light"] as Theme[]).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`p-3 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                  settings.theme === t
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-white/10 bg-accent/20 text-muted-foreground hover:border-white/20"
                }`}
              >
                {t === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                {t === "dark" ? "Dark" : "Light"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <Bell className="w-3.5 h-3.5" /> Audio Alerts
        </h3>
        <div className="flex items-center justify-between p-3 rounded-xl bg-accent/30 border border-white/5">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${settings.volumeEnabled ? "bg-primary/20" : "bg-accent/50"}`}>
              {settings.volumeEnabled ? (
                <Volume2 className="w-4 h-4 text-primary" />
              ) : (
                <VolumeX className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            <div>
              <Label className="text-sm font-semibold text-foreground">Alert Tones</Label>
              <p className="text-xs text-muted-foreground">
                {settings.volumeEnabled ? "Playing 3-tone beep on new calls" : "Alerts muted"}
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
            A three-tone ascending beep plays when a new incident is detected or an existing one is updated.
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
