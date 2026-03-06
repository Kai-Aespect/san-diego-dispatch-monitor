import { useState, useEffect } from "react";

const STORAGE_KEY = "sd_dispatch_admin_session";
const PIN_KEY = "sd_dispatch_admin_pin";

type Listener = (unlocked: boolean) => void;

let _unlocked = (() => {
  try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
})();

let _pin = (() => {
  try { return localStorage.getItem(PIN_KEY) || ""; } catch { return ""; }
})();

const listeners = new Set<Listener>();

function notify() {
  listeners.forEach(fn => fn(_unlocked));
}

export function checkPin(pin: string): boolean {
  const valid = pin === "3232" || (pin.length >= 4);
  if (valid) {
    fetch("/api/validate-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    }).then(res => {
      if (res.ok) {
        _unlocked = true;
        _pin = pin;
        try {
          localStorage.setItem(STORAGE_KEY, "1");
          localStorage.setItem(PIN_KEY, pin);
        } catch {}
        notify();
      }
    });
    return true;
  }
  return false;
}

export async function checkPinAsync(pin: string): Promise<boolean> {
  const res = await fetch("/api/validate-pin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  });
  if (res.ok) {
    _unlocked = true;
    _pin = pin;
    try {
      localStorage.setItem(STORAGE_KEY, "1");
      localStorage.setItem(PIN_KEY, pin);
    } catch {}
    notify();
    return true;
  }
  return false;
}

export function lockAdmin() {
  _unlocked = false;
  _pin = "";
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PIN_KEY);
  } catch {}
  notify();
}

export function getStoredPin(): string {
  return _pin;
}

export function useAdminAuth() {
  const [unlocked, setUnlocked] = useState(_unlocked);

  useEffect(() => {
    const handler: Listener = (v) => setUnlocked(v);
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  return { isAdmin: unlocked, checkPin, checkPinAsync, lockAdmin, getStoredPin };
}
