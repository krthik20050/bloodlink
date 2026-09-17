export type NearbyHospital = {
  id: string;
  name: string;
  distanceKm: number;
  latitude: number;
  longitude: number;
};

type CacheEntry = { expiresAt: number; hospitals: NearbyHospital[] };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8_000;
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

function distanceKm(latitude: number, longitude: number, otherLatitude: number, otherLongitude: number): number {
  const radius = 6371;
  const radians = Math.PI / 180;
  const dLat = (otherLatitude - latitude) * radians;
  const dLon = (otherLongitude - longitude) * radians;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(latitude * radians) * Math.cos(otherLatitude * radians) * Math.sin(dLon / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function findNearbyHospitals(latitude: number, longitude: number): Promise<NearbyHospital[]> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
  const key = `${latitude.toFixed(3)}:${longitude.toFixed(3)}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.hospitals;

  const query = `[out:json][timeout:6];(nwr["amenity"="hospital"](around:10000,${latitude},${longitude}););out center tags;`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(`${OVERPASS_URL}?data=${encodeURIComponent(query)}`, {
      signal: controller.signal,
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return [];
    const payload = await response.json() as { elements?: Array<Record<string, unknown>> };
    const hospitals = (payload.elements ?? []).flatMap((element) => {
      const tags = element.tags as Record<string, unknown> | undefined;
      const name = typeof tags?.name === "string" ? tags.name.trim() : "";
      const center = element.center as { lat?: unknown; lon?: unknown } | undefined;
      const elementLatitude = typeof element.lat === "number" ? element.lat : center?.lat;
      const elementLongitude = typeof element.lon === "number" ? element.lon : center?.lon;
      if (!name || typeof elementLatitude !== "number" || typeof elementLongitude !== "number") return [];
      return [{
        id: `${String(element.type)}:${String(element.id)}`,
        name,
        latitude: elementLatitude,
        longitude: elementLongitude,
        distanceKm: distanceKm(latitude, longitude, elementLatitude, elementLongitude),
      }];
    }).sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 25);
    cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, hospitals });
    return hospitals;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
