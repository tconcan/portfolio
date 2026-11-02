// Road trip, read live from a published Google Sheet. Editing the sheet
// updates the site within a few minutes (Google caches the CSV for ~5 min);
// no rebuild needed.
//
// The sheet is matched by header name, not position, so columns can be
// reordered or added. Recognised headers (case-insensitive):
//   Location, State, Country, Coordinates ("lat, lon"), Day Arrived,
//   Day Left, Transportation (Car / Walk / Plane / ...), Tags, Icon
//   (Star / Default), Comment
// Coordinates are optional: rows without them are looked up by name (see
// tripGeocode.ts). Keep this file free of imports; the Node script uses it.

export const TRIP_SHEET_CSV =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQoyhlghsOIiuoLyAFtJqCah8-M9jDGMxlZ_RjP6ptTB49D-uSO8k8F7CD5u26vwPv6KzBpuckaqR7D/pub?gid=0&single=true&output=csv";

/**
 * Google caches each published-CSV URL for several minutes and keeps
 * serving the old copy, so every request gets a unique URL to always read
 * the sheet as it is now.
 */
export const tripSheetUrl = () => `${TRIP_SHEET_CSV}&t=${Date.now()}`;

export interface Stop {
  name: string;
  region: string;
  country: string;
  lon: number;
  lat: number;
  arrived: Date | null;
  left: Date | null;
  /** How this stop was reached, e.g. "Car" or "Walk". */
  transport: string;
  icon: string;
  comment: string;
  /** Trip tag(s) from the Tags column; the first one names the trip. */
  tags: string[];
}

/** One trip: the stops sharing a tag, in sheet order. */
export interface TripGroup {
  id: string;
  stops: Stop[];
  start: Date | null;
  end: Date | null;
}

export interface Trip {
  stops: Stop[];
  start: Date | null;
  end: Date | null;
}

/** True once a stop has usable coordinates. */
export const located = (s: Stop) =>
  Number.isFinite(s.lat) && Number.isFinite(s.lon) && Math.abs(s.lat) <= 90 && Math.abs(s.lon) <= 180;

/** Start and end dates across some stops. */
export function dateSpan(stops: Stop[]): { start: Date | null; end: Date | null } {
  const times = stops.flatMap((s) => [s.arrived, s.left]).filter((d): d is Date => !!d).map((d) => d.getTime());
  return { start: times.length ? new Date(Math.min(...times)) : null, end: times.length ? new Date(Math.max(...times)) : null };
}

/**
 * Parse the sheet. Stops without usable coordinates come back with NaN
 * lat/lon, to be looked up by name before use.
 */
export function parseTrip(csv: string): Trip {
  const rows = parseCsv(csv);
  const headerAt = rows.findIndex((r) => r.some((c) => norm(c) === "location"));
  if (headerAt < 0) return { stops: [], start: null, end: null };

  const header = rows[headerAt].map(norm);
  const col = (...names: string[]) => header.findIndex((h) => names.includes(h));
  const at = {
    name: col("location", "stop", "place", "city"),
    region: col("state", "region", "province"),
    country: col("country"),
    coords: col("coordinates", "coords", "latlon", "latlng"),
    lat: col("lat", "latitude"),
    lon: col("lon", "lng", "long", "longitude"),
    arrived: col("dayarrived", "arrived", "date", "start"),
    left: col("dayleft", "left", "departed", "end"),
    transport: col("transportation", "transport", "mode"),
    icon: col("icon"),
    comment: col("comment", "comments", "note", "notes"),
    tags: col("tags", "tag", "trip"),
  };
  const cell = (r: string[], i: number) => (i >= 0 ? (r[i] ?? "").trim() : "");

  const stops: Stop[] = [];
  const skipped: string[] = [];
  let year: number | undefined; // for dates written without one ("3/26")
  rows.slice(headerAt + 1).forEach((r, i) => {
    const rowNo = headerAt + i + 2; // 1-based, as numbered in the sheet
    if (r.every((c) => !c.trim())) return; // blank row
    const name = cell(r, at.name);
    if (!name) {
      skipped.push(`row ${rowNo}: no Location`);
      return;
    }
    // Coordinates as "lat, lon", or separate Lat / Lon columns; NaN if
    // neither (looked up by name later).
    let [lat, lon] = num2(cell(r, at.coords));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) [lat, lon] = [num(cell(r, at.lat)), num(cell(r, at.lon))];
    const arrived = parseDate(cell(r, at.arrived), year);
    const left = parseDate(cell(r, at.left), arrived?.getFullYear() ?? year);
    year = (left ?? arrived)?.getFullYear() ?? year;
    stops.push({
      name,
      region: cell(r, at.region),
      country: cell(r, at.country),
      lat,
      lon,
      arrived,
      left,
      transport: cell(r, at.transport),
      icon: cell(r, at.icon),
      comment: cell(r, at.comment),
      tags: cell(r, at.tags)
        .split(/[,;/]/)
        .map((t) => t.trim())
        .filter(Boolean),
    });
  });
  // Shows up in the browser console (and the routes script) to help fix the sheet.
  if (skipped.length) console.warn(`Trip sheet: skipped ${skipped.length} row(s):\n  ${skipped.join("\n  ")}`);

  return { stops, ...dateSpan(stops) };
}

/**
 * Rows with Icon "None" (e.g. flying out from and back to home on a trip
 * abroad) get no marker and the trip is framed without them, but the legs
 * to and from them are still drawn, and their dates and miles still count.
 */
export const plotted = (s: Stop) => !/^none$/i.test(s.icon.trim());

/** Which trip a stop belongs to: its first tag ("" when untagged). */
export const tripIdOf = (s: Stop) => s.tags[0] ?? "";

/** Stops grouped into trips by tag, most recent trip first. */
export function groupTrips(stops: Stop[]): TripGroup[] {
  const byId = new Map<string, Stop[]>();
  for (const s of stops) {
    const id = tripIdOf(s);
    if (!byId.has(id)) byId.set(id, []);
    byId.get(id)!.push(s);
  }
  const groups = [...byId].map(([id, list]) => {
    return { id, stops: list, ...dateSpan(list) };
  });
  return groups.sort((a, b) => (b.start?.getTime() ?? 0) - (a.start?.getTime() ?? 0));
}

// ---- Formatting --------------------------------------------------------------

const MONTH = new Intl.DateTimeFormat("en-US", { month: "short" });

/** "Jul 6, 2026", "Jul 6 – 9, 2026", "Jul 30 – Aug 3, 2026", "Dec 30, 2026 – Jan 2, 2027". */
export function formatRange(a: Date | null, b: Date | null): string {
  if (!a && !b) return "";
  const from = (a ?? b)!;
  const to = (b ?? a)!;
  const md = (d: Date) => `${MONTH.format(d)} ${d.getDate()}`;
  if (from.getTime() === to.getTime()) return `${md(from)}, ${from.getFullYear()}`;
  if (from.getFullYear() !== to.getFullYear()) return `${md(from)}, ${from.getFullYear()} – ${md(to)}, ${to.getFullYear()}`;
  const end = from.getMonth() === to.getMonth() ? `${to.getDate()}` : md(to);
  return `${md(from)} – ${end}, ${to.getFullYear()}`;
}

/**
 * Group rows that are the same place: same name / state / country, or
 * within ~2 km of each other. Order follows first appearance.
 */
export function mergePlaces(stops: Stop[]): Stop[][] {
  const key = (s: Stop) => [s.name, s.region, s.country].map((x) => x.trim().toLowerCase()).join("|");
  const near = (a: Stop, b: Stop) => Math.abs(a.lat - b.lat) < 0.02 && Math.abs(a.lon - b.lon) < 0.02;
  const places: Stop[][] = [];
  for (const s of stops) {
    const hit = places.find((p) => p.some((o) => key(o) === key(s) || near(o, s)));
    if (hit) hit.push(s);
    else places.push([s]);
  }
  return places;
}

/** "Needham, MA · Jul 6, 2026 & Nov 21, 2026": one place, every visit. */
export function placeLabel(visits: Stop[]): string {
  const dates = [...new Set(visits.map((v) => formatRange(v.arrived, v.left)).filter(Boolean))].join(" & ");
  const comments = [...new Set(visits.map((v) => v.comment).filter(Boolean))].join(" · ");
  return [stopLabel(visits[0]).split(" · ")[0], dates, comments].filter(Boolean).join(" · ");
}

/** "Chicago, IL · Aug 4 – 10, 2026" (country added outside the US). */
export function stopLabel(s: Stop): string {
  const usa = /^(usa|us|united states)$/i.test(s.country);
  const where = [s.name, s.region, usa ? "" : s.country].filter(Boolean).join(", ");
  const when = formatRange(s.arrived, s.left);
  return [where, when, s.comment].filter(Boolean).join(" · ");
}

export function tripSummary(t: Trip): string {
  const when = formatRange(t.start, t.end);
  return ["Road trip", when, `${t.stops.length} stops`].filter(Boolean).join(" · ");
}

// ---- Parsing helpers -----------------------------------------------------------

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
/** Number, with an empty cell as NaN (Number("") would be 0: a stop at 0°, 0°). */
const num = (s: string) => (s.trim() === "" ? NaN : Number(s));
/** "42.28, -71.23" → [42.28, -71.23]; anything else → [NaN, NaN]. */
const num2 = (s: string): [number, number] => {
  const parts = s.split(",");
  return parts.length === 2 ? [num(parts[0]), num(parts[1])] : [NaN, NaN];
};

/** M/D/YYYY, M/D/YY, M/D (year from `fallbackYear`), or YYYY-MM-DD. */
function parseDate(s: string, fallbackYear?: number): Date | null {
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const y = Number(m[3]) < 100 ? 2000 + Number(m[3]) : Number(m[3]);
    return new Date(y, Number(m[1]) - 1, Number(m[2]));
  }
  m = s.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (m && fallbackYear) return new Date(fallbackYear, Number(m[1]) - 1, Number(m[2]));
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return null;
}

/** Minimal RFC 4180 CSV parser (quoted fields, escaped quotes, CRLF). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}
