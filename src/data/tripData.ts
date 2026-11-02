// Browser-side loader for the trip sheet: fetch, parse, fill in any missing
// coordinates by name, and drop rows that still can't be placed.

import { dateSpan, located, parseTrip, tripSheetUrl, type Trip } from "./trip";
import { fillCoords } from "./tripGeocode";

let tripPromise: Promise<Trip> | null = null;

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
      return { stops: placed, ...dateSpan(placed) };
    })
    .catch((err) => {
      tripPromise = null; // let a later visit retry
      throw err;
    });
  return tripPromise;
}
