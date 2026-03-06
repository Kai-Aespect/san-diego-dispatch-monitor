import { useState, useEffect } from "react";

const SESSION_KEY = "sd_key_session";
const PIN_KEY = "sd_key_pin";

type Listener = (unlocked: boolean) => void;

let _unlocked = (() => {
  try { return sessionStorage.getItem(SESSION_KEY) === "1"; } catch { return false; }
})();

let _pin = (() => {
  try { return sessionStorage.getItem(PIN_KEY) || ""; } catch { return ""; }
})();

const listeners = new Set<Listener>();

function notify() {
  listeners.forEach(fn => fn(_unlocked));
}

export async function keyCheckPinAsync(pin: string): Promise<boolean> {
  const res = await fetch("/api/validate-pin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  });
  if (res.ok) {
    _unlocked = true;
    _pin = pin;
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
      sessionStorage.setItem(PIN_KEY, pin);
    } catch {}
    notify();
    return true;
  }
  return false;
}

export function keyGetStoredPin(): string {
  return _pin;
}

export function useKeyAuth() {
  const [unlocked, setUnlocked] = useState(_unlocked);

  useEffect(() => {
    const handler: Listener = (v) => setUnlocked(v);
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  return { isKeyUnlocked: unlocked, keyCheckPinAsync, keyGetStoredPin };
}
