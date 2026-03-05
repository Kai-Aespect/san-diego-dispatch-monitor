import { useState, useEffect, useCallback } from "react";

export type Theme = "dark" | "light";

interface Settings {
  theme: Theme;
  volumeEnabled: boolean;
}

const STORAGE_KEY = "sd_dispatch_settings";

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...{ theme: "dark", volumeEnabled: false }, ...JSON.parse(raw) };
  } catch {}
  return { theme: "dark", volumeEnabled: false };
}

function saveSettings(s: Settings) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "light") {
    root.classList.add("light");
    root.classList.remove("dark");
  } else {
    root.classList.remove("light");
    root.classList.add("dark");
  }
}

let globalSettings: Settings = loadSettings();
const listeners: Array<(s: Settings) => void> = [];

function broadcast(s: Settings) {
  globalSettings = s;
  saveSettings(s);
  applyTheme(s.theme);
  listeners.forEach(fn => fn(s));
}

// Apply theme immediately on module load
applyTheme(globalSettings.theme);

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(globalSettings);

  useEffect(() => {
    const handler = (s: Settings) => setSettings({ ...s });
    listeners.push(handler);
    return () => {
      const idx = listeners.indexOf(handler);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }, []);

  const setTheme = useCallback((theme: Theme) => {
    broadcast({ ...globalSettings, theme });
  }, []);

  const setVolumeEnabled = useCallback((volumeEnabled: boolean) => {
    broadcast({ ...globalSettings, volumeEnabled });
  }, []);

  return { settings, setTheme, setVolumeEnabled };
}
