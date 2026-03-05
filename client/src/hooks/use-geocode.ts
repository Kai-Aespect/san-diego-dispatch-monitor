import { useState, useEffect, useRef } from "react";

const cache = new Map<string, [number, number] | null>();
const pending = new Set<string>();

type CoordMap = Record<string, [number, number] | null>;

export function useGeocodeAddresses(addresses: string[]): CoordMap {
  const [coords, setCoords] = useState<CoordMap>({});
  const queueRef = useRef<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const toFetch = addresses.filter(
      a => a && a !== "Unknown" && !cache.has(a) && !pending.has(a)
    );

    if (toFetch.length === 0) {
      const result: CoordMap = {};
      for (const a of addresses) {
        if (cache.has(a)) result[a] = cache.get(a)!;
      }
      setCoords(prev => ({ ...prev, ...result }));
      return;
    }

    for (const a of toFetch) pending.add(a);
    queueRef.current = [...new Set([...queueRef.current, ...toFetch])];

    const processQueue = async () => {
      while (queueRef.current.length > 0) {
        const address = queueRef.current.shift()!;
        if (cache.has(address)) {
          pending.delete(address);
          setCoords(prev => ({ ...prev, [address]: cache.get(address)! }));
          continue;
        }
        try {
          const q = encodeURIComponent(`${address}, San Diego, CA`);
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=us`,
            { headers: { "User-Agent": "SDDispatchMonitor/1.0" } }
          );
          if (res.ok) {
            const data = await res.json();
            if (data && data.length > 0) {
              const coord: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
              cache.set(address, coord);
              setCoords(prev => ({ ...prev, [address]: coord }));
            } else {
              cache.set(address, null);
            }
          } else {
            cache.set(address, null);
          }
        } catch {
          cache.set(address, null);
        }
        pending.delete(address);
        if (queueRef.current.length > 0) {
          await new Promise(r => setTimeout(r, 1100));
        }
      }
    };

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { processQueue(); }, 100);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [addresses.join("|")]);

  return coords;
}
