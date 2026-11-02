// Browser-side loader for the trip sheet: fetch, parse, fill in any missing
// coordinates by name, and drop rows that still can't be placed.

import { dateSpan, located, parseTrip, tripSheetUrl, type Trip } from "./trip";
import { fillCoords } from "./tripGeocode";

let tripPromise: Promise<Trip> | null = null;

// The last loaded sheet (and per-trip miles), kept in localStorage so the
// Travel page can show its numbers straight away on the next visit, before
// the live sheet arrives.
const TRIP_KEY = "trip-cache-v1";
const MILES_KEY = "trip-miles-v1";
const DATE_FIELDS = new Set(["arrived", "left", "start", "end"]);

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw, (k, v) => (DATE_FIELDS.has(k) && typeof v === "string" ? new Date(v) : v)) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the page just waits for the sheet next time.
  }
}

/** The sheet as last loaded in this browser, if any. */
export const cachedTrip = (): Trip | null => read<Trip>(TRIP_KEY);
/** Road miles per trip id, as last worked out in this browser. */
export const cachedMiles = (): Record<string, number> => read<Record<string, number>>(MILES_KEY) ?? {};
export const saveMiles = (miles: Record<string, number>) => write(MILES_KEY, miles);

/** Fetch and parse the sheet once per page load (shared by every caller). */
export function loadTrip(): Promise<Trip> {
  tripPromise ??= fetch(tripSheetUrl(), { cache: "no-store" })
    .then((r) => {
      if (!r.ok) throw new Error(`Trip sheet: HTTP ${r.status}`);
      return r.text();
    })
    .then(async (csv) => {
      const { stops } = parseTrip(csv);
      await fillCoords(stops);
      const lost = stops.filter((s) => !located(s));
      if (lost.length) {
        console.warn(
          `Trip sheet: couldn't place ${lost.length} stop(s); add Coordinates ("lat, lon") for:\n  ${lost
            .map((s) => [s.name, s.region, s.country].filter(Boolean).join(", "))
            .join("\n  ")}`,
        );
      }
      const placed = stops.filter(located);
      const trip = { stops: placed, ...dateSpan(placed) };
      write(TRIP_KEY, trip);
      return trip;
    })
    .catch((err) => {
      tripPromise = null; // let a later visit retry
      throw err;
    });
  return tripPromise;
}
