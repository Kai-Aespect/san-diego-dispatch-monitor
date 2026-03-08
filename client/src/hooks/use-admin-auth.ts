import { useState, useEffect } from "react";

const STORAGE_KEY = "sd_dispatch_admin_session";
const CUSTOM_PINS_KEY = "sd_dispatch_admin_custom_pins";

type Listener = (unlocked: boolean) => void;

const MAIN_PIN = "3232";

let _unlocked = (() => {
  try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
})();

const listeners = new Set<Listener>();

function notify() {
  listeners.forEach(fn => fn(_unlocked));
}

function getCustomPins(): string[] {
  try {
    const raw = localStorage.getItem(CUSTOM_PINS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function isValidPin(pin: string): boolean {
  if (pin === MAIN_PIN) return true;
  return getCustomPins().includes(pin);
}

export function checkPin(pin: string): boolean {
  if (!isValidPin(pin)) return false;
  _unlocked = true;
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {}
  notify();
  return true;
}

export async function checkPinAsync(pin: string): Promise<boolean> {
  if (!isValidPin(pin)) return false;
  _unlocked = true;
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {}
  notify();
  return true;
}

export function lockAdmin() {
  _unlocked = false;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
  notify();
}

export function getCustomPinList(): string[] {
  return getCustomPins();
}

export function addCustomPin(pin: string): void {
  const pins = getCustomPins();
  if (!pins.includes(pin) && pin !== MAIN_PIN && pin.length >= 4) {
    pins.push(pin);
    try { localStorage.setItem(CUSTOM_PINS_KEY, JSON.stringify(pins)); } catch {}
  }
}

export function removeCustomPin(pin: string): void {
  const pins = getCustomPins().filter(p => p !== pin);
  try { localStorage.setItem(CUSTOM_PINS_KEY, JSON.stringify(pins)); } catch {}
}

export function useAdminAuth() {
  const [unlocked, setUnlocked] = useState(_unlocked);

  useEffect(() => {
    const handler: Listener = (v) => setUnlocked(v);
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  return { isAdmin: unlocked, checkPin, checkPinAsync, lockAdmin };
}
