// Road-following routes between trip stops, from free OSRM servers run by
// FOSSGIS on OpenStreetMap data (car, foot and bike). Their usage policy
// asks for light use, so routes are cached in two layers:
//
//   1. public/data/trip-routes.json is written by `npm run routes`
//      (scripts/trip-routes.mjs, also run before every build). It fetches
//      only legs that aren't cached yet.
//   2. Legs added to the sheet since the last build are fetched by the
//      visitor's browser, slowly and one at a time, and kept in localStorage.
//
// Until a leg's road route arrives it's drawn as a straight line.
// Keep this file free of relative imports: the Node script imports it.

import type { Stop } from "./trip";

/** car / foot / bike follow roads and paths, train follows rail, air and
    boat are drawn straight (air lifted above the globe). */
export type LegMode = "car" | "foot" | "bike" | "train" | "air" | "boat";

/** Modes that get a routed path (and so a cache entry). */
export const isRouted = (m: LegMode) => m === "car" || m === "foot" || m === "bike" || m === "train";

export interface Leg {
  /** [lon, lat] points along the road. */
  coords: [number, number][];
  /** Road distance in metres. */
  meters: number;
}

export const ROUTES_URL = "/data/trip-routes.json";
const OSRM: Record<"car" | "foot" | "bike", string> = {
  car: "https://routing.openstreetmap.de/routed-car/route/v1/driving",
  foot: "https://routing.openstreetmap.de/routed-foot/route/v1/driving",
  bike: "https://routing.openstreetmap.de/routed-bike/route/v1/driving",
};

/** How a leg is routed, from the destination stop's Transportation cell. */
export function legMode(transport: string): LegMode {
  if (/walk|foot|hike/i.test(transport)) return "foot";
  if (/bike|cycl/i.test(transport)) return "bike";
  if (/train|rail/i.test(transport)) return "train";
  if (/fly|flight|plane|air/i.test(transport)) return "air";
  if (/boat|ferry|ship|cruise/i.test(transport)) return "boat";
  return "car";
}

/**
 * The legs to route: consecutive stops within the same trip (first tag),
 * in sheet order. Stops from different trips, and untagged stops, are never
 * joined.
 */
export function tripPairs(stops: Stop[]): [Stop, Stop][] {
  const last = new Map<string, Stop>();
  const pairs: [Stop, Stop][] = [];
  for (const s of stops) {
    const id = s.tags[0] ?? "";
    if (!id) continue; // untagged rows are standalone places, never joined
    const prev = last.get(id);
    if (prev) pairs.push([prev, s]);
    last.set(id, s);
  }
  return pairs;
}

/** Straight-line (great-circle) distance in metres, for flights and trains. */
export function greatCircleMeters(a: Stop, b: Stop): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Cache key: mode plus both ends, rounded to ~10 m. */
export function legKey(a: Stop, b: Stop): string {
  const p = (s: Stop) => `${s.lat.toFixed(4)},${s.lon.toFixed(4)}`;
  return `${legMode(b.transport)}|${p(a)}|${p(b)}`;
}

/** Ask the routers for one leg. Returns null when there's no route (or no network). */
export async function fetchLeg(a: Stop, b: Stop, overview: "full" | "simplified" = "simplified"): Promise<Leg | null> {
  const mode = legMode(b.transport);
  if (mode === "train") return fetchRail(a, b);
  if (!isRouted(mode)) return null;
  const url = `${OSRM[mode as "car" | "foot" | "bike"]}/${a.lon},${a.lat};${b.lon},${b.lat}?overview=${overview}&geometries=geojson`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      code: string;
      routes?: { distance: number; geometry: { coordinates: [number, number][] } }[];
    };
    const route = data.code === "Ok" ? data.routes?.[0] : undefined;
    if (!route || route.geometry.coordinates.length < 2) return null;
    return { coords: route.geometry.coordinates, meters: route.distance };
  } catch {
    return null;
  }
}

// ---- Rail ---------------------------------------------------------------------
// Trains are routed on the OSM rail network with OpenRailRouting (free,
// GraphHopper-based). City-centre coordinates rarely sit on a mainline, so
// each end is first snapped to a nearby railway station found with Photon
// (komoot's free OSM search), preferring main stations.

const MAIN_STATION = /hauptbahnhof|\bhbf\b|centraal|central|centrale|union station|main station|gare |termini|sants|\bhb\b/i;
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
// Outside a browser (the build script) identify ourselves; the rail router
// turns away anonymous clients. Browsers send their own User-Agent.
const SCRIPT_HEADERS: Record<string, string> | undefined =
  typeof window === "undefined" ? { "User-Agent": "tom-concannon-portfolio/1.0 (travel page route cache)" } : undefined;

async function stationsNear(s: Stop): Promise<[number, number][]> {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(s.name)}&osm_tag=railway:station&lat=${s.lat}&lon=${s.lon}&limit=8`;
  try {
    const res = await fetch(url, { headers: SCRIPT_HEADERS });
    if (!res.ok) return [];
    const data = (await res.json()) as { features: { geometry: { coordinates: [number, number] }; properties: { name?: string } }[] };
    const near = data.features
      .map((f) => ({ c: f.geometry.coordinates, main: MAIN_STATION.test(f.properties.name ?? "") }))
      .map((f) => ({ ...f, km: greatCircleMeters(s, { ...s, lon: f.c[0], lat: f.c[1] }) / 1000 }))
      .filter((f) => f.km < 30);
    near.sort((x, y) => Number(y.main) - Number(x.main) || x.km - y.km);
    return near.slice(0, 2).map((f) => f.c);
  } catch {
    return [];
  }
}

async function fetchRail(a: Stop, b: Stop): Promise<Leg | null> {
  const [from, to] = [await stationsNear(a), await stationsNear(b)];
  for (const sa of from) {
    for (const sb of to) {
      await pause(1100);
      const url = `https://routing.openrailrouting.org/route?point=${sa[1]},${sa[0]}&point=${sb[1]},${sb[0]}&profile=all_tracks&points_encoded=false&instructions=false`;
      try {
        const res = await fetch(url, { headers: SCRIPT_HEADERS });
        if (!res.ok) continue;
        const data = (await res.json()) as { paths?: { distance: number; points: { coordinates: [number, number][] } }[] };
        const path = data.paths?.[0];
        if (path && path.points.coordinates.length > 1) {
          // Rail geometry is very dense; thin it to what the globe can show.
          return { coords: simplify(path.points.coordinates, 0.004), meters: path.distance };
        }
      } catch {
        // try the next station pair
      }
    }
  }
  return null;
}

/** Douglas–Peucker in degrees; keeps the shape, drops the noise. */
export function simplify(points: [number, number][], tolerance: number): [number, number][] {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop()!;
    const [x1, y1] = points[s];
    const [x2, y2] = points[e];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1e-12;
    let worst = -1;
    let at = -1;
    for (let i = s + 1; i < e; i++) {
      const d = Math.abs(dy * points[i][0] - dx * points[i][1] + x2 * y1 - y2 * x1) / len;
      if (d > worst) {
        worst = d;
        at = i;
      }
    }
    if (worst > tolerance) {
      keep[at] = 1;
      stack.push([s, at], [at, e]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/** Round to 4 decimals (~10 m) to keep the cache small. */
export const roundCoords = (c: [number, number][]) =>
  c.map(([x, y]) => [Math.round(x * 1e4) / 1e4, Math.round(y * 1e4) / 1e4] as [number, number]);

// ---- Browser side ----------------------------------------------------------

/** Shape of public/data/trip-routes.json. */
export interface RouteCache {
  legs: Record<string, { c: [number, number][]; m: number }>;
}

const LOCAL_KEY = "trip-routes-v1";
const FETCH_GAP_MS = 1100; // at most ~1 request a second, per the usage policy
const MAX_LIVE_FETCHES = 30; // per visit; more than that waits for a rebuild

type Listener = (legs: Map<string, Leg>) => void;
const legs = new Map<string, Leg>();
const listeners = new Set<Listener>();
let started = false;

/**
 * Road routes for the trip's legs. Calls `onChange` with everything known so
 * far, and again whenever more arrive. Returns an unsubscribe function.
 */
export function watchLegs(stops: Stop[], onChange: Listener): () => void {
  listeners.add(onChange);
  if (legs.size) onChange(legs);
  if (!started) {
    started = true;
    void fill(stops);
  }
  return () => listeners.delete(onChange);
}

const emit = () => listeners.forEach((fn) => fn(legs));

async function fill(stops: Stop[]) {
  const wanted = new Map<string, [Stop, Stop]>();
  for (const [a, b] of tripPairs(stops)) {
    if (isRouted(legMode(b.transport))) wanted.set(legKey(a, b), [a, b]);
  }

  // 1. Routes shipped with the site.
  try {
    const res = await fetch(ROUTES_URL);
    if (res.ok) {
      const file = (await res.json()) as RouteCache;
      for (const [k, v] of Object.entries(file.legs)) if (wanted.has(k)) legs.set(k, { coords: v.c, meters: v.m });
    }
  } catch {
    // no cache file; fall through to the others
  }

  // 2. Routes this browser fetched on an earlier visit.
  let local: RouteCache["legs"] = {};
  try {
    local = (JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "{}") as RouteCache["legs"]) ?? {};
  } catch {
    local = {};
  }
  for (const [k, v] of Object.entries(local)) if (wanted.has(k) && !legs.has(k)) legs.set(k, { coords: v.c, meters: v.m });
  emit();

  // 3. Anything still missing, politely, one at a time.
  const missing = [...wanted].filter(([k]) => !legs.has(k)).slice(0, MAX_LIVE_FETCHES);
  const fresh: RouteCache["legs"] = {};
  for (const [k, v] of Object.entries(local)) if (wanted.has(k)) fresh[k] = v; // drop stale entries
  for (const [i, [key, [a, b]]] of missing.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, FETCH_GAP_MS));
    const leg = await fetchLeg(a, b, "simplified");
    if (!leg) continue;
    const coords = roundCoords(leg.coords);
    legs.set(key, { coords, meters: leg.meters });
    fresh[key] = { c: coords, m: Math.round(leg.meters) };
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(fresh));
    } catch {
      // storage full or blocked; still fine for this visit
    }
    emit();
  }
}
