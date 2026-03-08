const cache = new Map<string, { lat: number; lng: number } | null>();
let lastRequestTime = 0;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function geocodeAddress(address: string, city = "San Diego, CA"): Promise<{ lat: number; lng: number } | null> {
  const cacheKey = address.toLowerCase().trim();
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < 1100) await sleep(1100 - elapsed);
  lastRequestTime = Date.now();

  try {
    const query = encodeURIComponent(`${address}, ${city}`);
    const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=us`;
    const res = await fetch(url, {
      headers: { "User-Agent": "SDDispatchMonitor/1.0 (personal dashboard)" }
    });
    if (!res.ok) {
      cache.set(cacheKey, null);
      return null;
    }
    const data = await res.json();
    if (data && data.length > 0) {
      const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      cache.set(cacheKey, result);
      return result;
    }
    cache.set(cacheKey, null);
    return null;
  } catch (e) {
    console.error("Geocoding error for", address, e);
    cache.set(cacheKey, null);
    return null;
  }
}

const MAX_GEOCODE_PER_CYCLE = 30;

export async function geocodePendingIncidents(storage: any) {
  const all = await storage.getIncidents();
  const pending = all
    .filter((i: any) => i.active && (i.lat == null || i.lng == null) && i.location && i.location !== "Unknown")
    .slice(0, MAX_GEOCODE_PER_CYCLE);

  if (pending.length === 0) return;

  console.log(`Geocoding ${pending.length} active incidents without coordinates...`);
  for (const incident of pending) {
    const coords = await geocodeAddress(incident.location);
    if (coords) {
      await storage.updateIncident(incident.id, { lat: coords.lat, lng: coords.lng });
    }
  }
  console.log("Geocoding pass complete.");
}
