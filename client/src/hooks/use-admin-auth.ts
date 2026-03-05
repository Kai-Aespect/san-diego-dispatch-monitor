const ADMIN_PIN = "3232";
const STORAGE_KEY = "sd_dispatch_admin_session";

type Listener = (unlocked: boolean) => void;

let _unlocked = (() => {
  try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
})();

const listeners = new Set<Listener>();

function notify() {
  listeners.forEach(fn => fn(_unlocked));
}

export function checkPin(pin: string): boolean {
  if (pin === ADMIN_PIN) {
    _unlocked = true;
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    notify();
    return true;
  }
  return false;
}

export function lockAdmin() {
  _unlocked = false;
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  notify();
}

import { useState, useEffect } from "react";

export function useAdminAuth() {
  const [unlocked, setUnlocked] = useState(_unlocked);

  useEffect(() => {
    const handler: Listener = (v) => setUnlocked(v);
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  return { isAdmin: unlocked, checkPin, lockAdmin };
}
