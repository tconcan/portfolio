// Fetches road routes for every leg of every trip and caches them in
// public/data/trip-routes.json, which ships with the site. Stops without
// Coordinates are first looked up by name and cached in
// public/data/trip-geocodes.json.
//
//   npm run routes        (also runs automatically before `npm run build`)
//
// Only legs missing from the cache are fetched (about one request a second,
// per the FOSSGIS OSRM usage policy), and legs no longer in the sheet are
// dropped. Never fails the build: on any error the existing file is kept.

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { located, parseTrip, tripSheetUrl } from "../src/data/trip.ts";
import { geocode, geoKey } from "../src/data/tripGeocode.ts";
import { fetchLeg, isRouted, legKey, legMode, roundCoords, simplify, tripPairs } from "../src/data/tripRoutes.ts";

const OUT = fileURLToPath(new URL("../public/data/trip-routes.json", import.meta.url));
const GEO_OUT = fileURLToPath(new URL("../public/data/trip-geocodes.json", import.meta.url));
const TOLERANCE = 0.004; // degrees (~400 m): invisible at the globe's zoom
const GAP_MS = 1100;

async function main() {
  let cache = { legs: {} };
  try {
    cache = JSON.parse(await readFile(OUT, "utf8"));
  } catch {
    // first run
  }

  const res = await fetch(tripSheetUrl());
  if (!res.ok) throw new Error(`sheet: HTTP ${res.status}`);
  const parsed = parseTrip(await res.text()).stops;

  // 1. Coordinates for rows that have none, by name (cached).
  let geo = {};
  try {
    geo = JSON.parse(await readFile(GEO_OUT, "utf8"));
  } catch {
    // first run
  }
  const nextGeo = {};
  for (const s of parsed.filter((st) => !located(st))) {
    const key = geoKey(s);
    let hit = geo[key] ?? nextGeo[key];
    if (!hit) {
      await new Promise((r) => setTimeout(r, 300));
      hit = await geocode(s);
      console.log(hit ? `  located ${s.name}, ${s.country}: ${hit.join(", ")}` : `  couldn't locate ${s.name}, ${s.country}`);
    }
    if (hit) {
      nextGeo[key] = hit;
      [s.lat, s.lon] = hit;
    }
  }
  await writeFile(GEO_OUT, JSON.stringify(nextGeo));
  const stops = parsed.filter(located);

  // 2. Road routes.

  const next = { legs: {} };
  let fetched = 0;
  let failed = 0;
  for (const [a, b] of tripPairs(stops)) {
    if (!isRouted(legMode(b.transport))) continue;
    const key = legKey(a, b);
    if (cache.legs[key]) {
      next.legs[key] = cache.legs[key];
      continue;
    }
    if (fetched + failed > 0) await new Promise((r) => setTimeout(r, GAP_MS));
    const leg = await fetchLeg(a, b, "full");
    if (!leg) {
      failed++;
      console.warn(`  no route: ${a.name} → ${b.name}`);
      continue;
    }
    next.legs[key] = { c: roundCoords(simplify(leg.coords, TOLERANCE)), m: Math.round(leg.meters) };
    fetched++;
    console.log(`  ${a.name} → ${b.name}: ${(leg.meters / 1609.34).toFixed(0)} mi`);
  }

  const kept = Object.keys(next.legs).length - fetched;
  const dropped = Object.keys(cache.legs).filter((k) => !next.legs[k]).length;
  await writeFile(OUT, JSON.stringify(next));
  console.log(`trip routes: ${fetched} fetched, ${kept} cached, ${dropped} dropped, ${failed} failed`);
}

main().catch((err) => {
  console.warn(`trip routes: skipped (${err.message}); keeping the existing cache`);
});
