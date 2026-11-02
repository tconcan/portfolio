// Coordinates for sheet rows that don't have any, looked up by name with
// Open-Meteo's free geocoding API (no key; CORS allowed). Results are cached
// like the routes:
//
//   1. public/data/trip-geocodes.json, written by `npm run routes`
//      (also run before every build).
//   2. localStorage, for places added since the last build.
//
// Matches must be in the row's Country (e.g. Berlin, Germany never becomes
// Berlin, New Hampshire); a place that can't be matched is left out and
// logged in the console. Keep this file free of relative imports: the Node
// script imports it.

import type { Stop } from "./trip";

export const GEOCODES_URL = "/data/trip-geocodes.json";
/** Cache key → [lat, lon]. */
export type GeoCache = Record<string, [number, number]>;

export const geoKey = (s: Stop) => [s.name, s.region, s.country].map((x) => x.trim().toLowerCase()).join("|");

const COUNTRY_ALIASES: Record<string, string> = {
  usa: "united states",
  us: "united states",
  "u.s.": "united states",
  "u.s.a.": "united states",
  "united states of america": "united states",
  uk: "united kingdom",
  "great britain": "united kingdom",
  england: "united kingdom",
  scotland: "united kingdom",
  wales: "united kingdom",
  holland: "netherlands",
};
const normCountry = (c: string) => {
  const x = c.trim().toLowerCase().replace(/^the\s+/, "");
  return COUNTRY_ALIASES[x] ?? x;
};

interface Result {
  latitude: number;
  longitude: number;
  country?: string;
  country_code?: string;
  admin1?: string;
  population?: number;
}

/** Best match for a stop, or null if nothing fits its country. */
export async function geocode(s: Stop): Promise<[number, number] | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(s.name)}&count=10&language=en&format=json`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const results = ((await res.json()) as { results?: Result[] }).results ?? [];
    const want = s.country ? normCountry(s.country) : "";
    const region = s.region.trim().toLowerCase();
    const score = (r: Result) =>
      (want && (normCountry(r.country ?? "") === want || (r.country_code ?? "").toLowerCase() === want) ? 2 : 0) +
      (region && (r.admin1 ?? "").toLowerCase() === region ? 1 : 0);
    const best = [...results].sort((a, b) => score(b) - score(a) || (b.population ?? 0) - (a.population ?? 0))[0];
    if (!best || (want && score(best) < 2)) return null; // wrong country: don't guess
    return [Math.round(best.latitude * 1e4) / 1e4, Math.round(best.longitude * 1e4) / 1e4];
  } catch {
    return null;
  }
}

const LOCAL_KEY = "trip-geocodes-v1";

/** Fill in missing coordinates in place, from the caches or a lookup. */
export async function fillCoords(stops: Stop[]): Promise<void> {
  const missing = stops.filter((s) => !Number.isFinite(s.lat) || !Number.isFinite(s.lon));
  if (!missing.length) return;

  let shipped: GeoCache = {};
  try {
    const res = await fetch(GEOCODES_URL);
    if (res.ok) shipped = (await res.json()) as GeoCache;
  } catch {
    // no cache file yet
  }
  let local: GeoCache = {};
  try {
    local = (JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "{}") as GeoCache) ?? {};
  } catch {
    local = {};
  }

  for (const s of missing) {
    const key = geoKey(s);
    let hit = shipped[key] ?? local[key];
    if (!hit) {
      const found = await geocode(s);
      if (found) {
        hit = found;
        local[key] = found;
        try {
          localStorage.setItem(LOCAL_KEY, JSON.stringify(local));
        } catch {
          // storage blocked; fine for this visit
        }
      }
    }
    if (hit) [s.lat, s.lon] = hit;
  }
}
