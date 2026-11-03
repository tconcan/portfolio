import { useEffect, useRef, useState, type RefObject } from "react";
import { motion, useReducedMotion } from "motion/react";
import { geoArea, geoCentroid, geoContains, geoDistance, geoGraticule10, geoInterpolate, geoOrthographic, geoPath } from "d3-geo";
import { feature, merge, mesh } from "topojson-client";
import type { Feature, FeatureCollection, Geometry, MultiLineString, Position } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import { groupTrips, mergePlaces, placeLabel, plotted, type Stop, type Trip } from "../../data/trip";
import { loadTrip } from "../../data/tripData";
import { legKey, legMode, simplify, watchLegs, type Leg, type LegMode } from "../../data/tripRoutes";
import { EASE } from "../ui/motion";

export type GlobeView = "trips" | "us" | "world";

type Named = { name: string };
type Place = Feature<Geometry, Named>;
type WorldTopo = Topology<{ countries: GeometryCollection<Named> }>;
type UsTopo = Topology<{ states: GeometryCollection<Named> }>;

// Map data lives in public/data and is fetched once, only on this page.
type Lakes = FeatureCollection<Geometry, Named>;
type GlobeData = [WorldTopo, UsTopo, Lakes];
let dataPromise: Promise<GlobeData> | null = null;
function loadData() {
  dataPromise ??= Promise.all([
    fetch("/data/world-countries.json").then((r) => r.json() as Promise<WorldTopo>),
    fetch("/data/us-states-10m.json").then((r) => r.json() as Promise<UsTopo>),
    // Largest lakes (Natural Earth 50m). Country shapes include their lakes,
    // so these are painted back as water on top.
    fetch("/data/world-lakes.json").then((r) => r.json() as Promise<Lakes>),
  ]).catch((err) => {
    dataPromise = null; // let a later visit retry
    throw err;
  });
  return dataPromise;
}

const USA = "840";
const ANTARCTICA = "010";

/**
 * Natural Earth outlines are drawn as straight lines in longitude/latitude,
 * but the globe joins points along great circles. For long edges such as
 * the 49th-parallel border, that bows the line toward the pole and leaves a
 * gap against the (denser) US state outlines. Adding points every half
 * degree keeps each edge where the source data meant it.
 */
const MAX_STEP = 0.5;
function densifyRing(ring: Position[], step = MAX_STEP): Position[] {
  if (ring.length < 2) return ring;
  const out: Position[] = [];
  for (let i = 0; i < ring.length - 1; i++) {
    const [x0, y0] = ring[i];
    const [x1, y1] = ring[i + 1];
    // At least one point per edge, so repeated points don't empty a ring;
    // edges that wrap across the date line (a 360° jump) stay as they are.
    const wraps = Math.abs(x1 - x0) > 180;
    const n = wraps ? 1 : Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) / step));
    for (let k = 0; k < n; k++) out.push([x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n]);
  }
  out.push(ring[ring.length - 1]);
  return out;
}
function rewind<G extends Geometry>(g: G): G {
  if (g.type === "Polygon") return { ...g, coordinates: g.coordinates.map((r) => [...r].reverse()) };
  if (g.type === "MultiPolygon") return { ...g, coordinates: g.coordinates.map((p) => p.map((r) => [...r].reverse())) };
  return g;
}
function densify<G extends Geometry>(g: G, step = MAX_STEP): G {
  const ring = (r: Position[]) => densifyRing(r, step);
  if (g.type === "Polygon") return { ...g, coordinates: g.coordinates.map(ring) };
  if (g.type === "MultiPolygon") return { ...g, coordinates: g.coordinates.map((p) => p.map(ring)) };
  return g;
}
/**
 * Douglas–Peucker that also handles closed rings (islands, lakes): a ring
 * starts and ends on the same point, which would otherwise collapse it, so
 * it's split at its farthest point and each half simplified.
 */
function simplifyLine(pts: [number, number][], tol: number): [number, number][] {
  const n = pts.length;
  if (n < 4) return pts;
  const [x0, y0] = pts[0];
  const [xn, yn] = pts[n - 1];
  if (x0 !== xn || y0 !== yn) return simplify(pts, tol);
  let far = 1;
  let best = -1;
  for (let i = 1; i < n - 1; i++) {
    const d = (pts[i][0] - x0) ** 2 + (pts[i][1] - y0) ** 2;
    if (d > best) {
      best = d;
      far = i;
    }
  }
  const out = [...simplify(pts.slice(0, far + 1), tol), ...simplify(pts.slice(far), tol).slice(1)];
  return out.length >= 4 ? out : pts; // keep tiny rings as they are
}

/**
 * A copy of a topology with every arc simplified (Douglas–Peucker, in
 * degrees). Arcs are shared between neighbours, so borders stay matched.
 */
function simplifyTopology<T extends Topology>(t: T, tol: number): T {
  const { transform, ...rest } = t;
  const arcs = t.arcs.map((arc) => {
    let pts = arc as [number, number][];
    if (transform) {
      // Undo the quantized, delta-encoded storage.
      const [sx, sy] = transform.scale;
      const [tx, ty] = transform.translate;
      let x = 0;
      let y = 0;
      pts = arc.map(([dx, dy]) => {
        x += dx;
        y += dy;
        return [x * sx + tx, y * sy + ty];
      });
    }
    return simplifyLine(pts, tol);
  });
  return { ...rest, arcs } as unknown as T;
}
const simplifyRings = <G extends Geometry>(g: G, tol: number): G => {
  const ring = (r: Position[]) => simplifyLine(r as [number, number][], tol);
  if (g.type === "Polygon") return { ...g, coordinates: g.coordinates.map(ring) };
  if (g.type === "MultiPolygon") return { ...g, coordinates: g.coordinates.map((p) => p.map(ring)) };
  return g;
};
/**
 * Detail levels for drawing (tolerance in degrees, coarsest first). The
 * globe uses the coarsest one whose error stays under ~half a pixel at its
 * current size, so it looks the same but projects far fewer points from
 * afar. Picking always uses the full-detail shapes.
 */
const LOD_TOLERANCES = [0.4, 0.15, 0.05];
/**
 * Densify step for the simplified levels. The bowing it corrects is far
 * below a pixel at those sizes (about 0.004° on a 2° edge), so they need
 * far fewer added points than full detail does.
 */
const LOD_DENSIFY = 2;
const LOD_PX = 0.5;
/** Lakes smaller than this on screen (px²) aren't drawn. */
const MIN_LAKE_PX = 4;

const US_CENTER = { lon: -96, lat: 38 };
const WORLD_RADIUS = 0.4; // globe radius as a fraction of the shorter side
const WORLD_TILT = 18; // world view leans north a little
const SPIN = 5; // world-view idle spin, degrees per second
const FLY_MS = 1700;
// Opening: spiral in from world distance. The spin starts quick and winds
// down while the zoom tightens steadily the whole time, and latitude sways
// with the turn, so the US curls in toward the centre.
const INTRO_MS = 5600;
const INTRO_TURN = 330; // degrees of spin on the way in
const INTRO_SWAY = 14; // latitude swing (degrees), shrinking to nothing

const DEG = 180 / Math.PI;

// Road trip route (data from the Google Sheet, see data/trip.ts).
const ROUTE_MS = 7000; // draw-in time once the globe settles…
const SWITCH_MS = 1000; // …plus this per change of transport, up to:
const ROUTE_MAX_MS = 14000;
// Draw-in pacing, in route-distance units: a short pause whenever the kind
// of travel changes, and the first leg after a change drawn slower.
const SWITCH_PAUSE = 0.04; // × trip length
const SWITCH_SLOW = 1.8;
// Legs to or from a hidden ("None") stop show only this much of their
// length, at the plotted end.
const STUB = 0.1;
// Flights arc above the globe: peak height (× globe radius) by distance.
const flightLift = (radians: number) => Math.min(0.3, 0.06 + 0.45 * radians);
const ROUTE_FROM: [number, number, number] = [192, 132, 252]; // purple-400 at the start…
const ROUTE_TO: [number, number, number] = [103, 232, 249]; // …cyan-300 at the end
const routeColor = (t: number, a: number) =>
  `rgba(${ROUTE_FROM.map((c, i) => Math.round(c + (ROUTE_TO[i] - c) * t)).join(", ")}, ${a})`;

interface Camera {
  lon: number;
  lat: number;
  /** Radius as a fraction of the shorter side of the canvas. */
  r: number;
  /** Horizontal shift of the globe centre in px (makes room for the trip card). */
  ox: number;
}

interface Props {
  view: GlobeView;
  /** Element the globe is centred on and sized to; the canvas itself fills its parent. */
  anchorRef: RefObject<HTMLElement | null>;
  /** Trip shown in the "trips" view (its tag). */
  tripId: string | null;
  onHover: (name: string | null) => void;
}

/**
 * Orthographic globe on a canvas. "us" flies in until the lower 48 fill the
 * frame, with the rest of the globe running off the page; "world" pulls back
 * to the whole globe and spins slowly. Drag to turn it either way. Canvas
 * (not SVG) because every frame re-projects.
 */
export default function TravelGlobe({ view, anchorRef, tripId, onHover }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const goTo = useRef<(v: GlobeView) => void>(() => {});
  const viewRef = useRef(view);
  const tripIdRef = useRef(tripId);
  // Label that follows the hovered place marker on the globe.
  const tipRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ title: string; detail: string } | null>(null);
  const hoverRef = useRef(onHover);
  hoverRef.current = onHover;
  const reduceMotion = useReducedMotion() ?? false;
  const [data, setData] = useState<GlobeData | null>(null);
  const [failed, setFailed] = useState(false);
  // The trip loads separately so the globe never waits on the sheet.
  const tripRef = useRef<Trip | null>(null);
  const tripReady = useRef<() => void>(() => {});
  const legsRef = useRef<Map<string, Leg>>(new Map());

  useEffect(() => {
    let live = true;
    let unwatch = () => {};
    loadTrip().then(
      (t) => {
        if (!live) return;
        tripRef.current = t;
        tripReady.current();
        // Road routes arrive separately (cache file, then any live fetches);
        // each batch redraws the affected legs.
        unwatch = watchLegs(t.stops, (legs) => {
          legsRef.current = legs;
          tripReady.current();
        });
      },
      () => {}, // no sheet, no route; the globe works without it
    );
    return () => {
      live = false;
      unwatch();
    };
  }, []);

  useEffect(() => {
    let live = true;
    loadData().then(
      (d) => live && setData(d),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    viewRef.current = view;
    goTo.current(view);
  }, [view]);

  useEffect(() => {
    tripIdRef.current = tripId;
    if (viewRef.current === "trips") goTo.current("trips");
  }, [tripId]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const anchor = anchorRef.current;
    const ctx = canvas?.getContext("2d");
    if (!data || !wrap || !anchor || !canvas || !ctx) return;

    // ---- Geometry ----------------------------------------------------------
    const [world, us, lakeData] = data;
    // GeoJSON files wind rings the other way from d3; flip any lake that
    // would otherwise cover the whole globe except itself.
    const lakes = lakeData.features.map((f) =>
      geoArea(f) > 2 * Math.PI ? { ...f, geometry: rewind(f.geometry) } : f,
    );
    const countries = (feature(world, world.objects.countries) as FeatureCollection<Geometry, Named>).features
      .filter((f) => f.id !== USA)
      // Antarctica wraps the pole and the date line; extra points there
      // turn it inside out, and it never borders the US anyway.
      .map((f) => (f.id === ANTARCTICA ? f : { ...f, geometry: densify(f.geometry) }));
    const states = (feature(us, us.objects.states) as FeatureCollection<Geometry, Named>).features;
    // The whole country as one shape, for picking it as a country from afar.
    const usaWhole: Place = {
      type: "Feature",
      id: USA,
      properties: { name: "United States" },
      geometry: merge(us, us.objects.states.geometries as Parameters<typeof merge>[1]),
    };
    // Drawing layers at each detail level (see LOD_TOLERANCES), plus full.
    const lakeArea = lakes.map((f) => geoArea(f));
    const buildLayers = (w: WorldTopo, u: UsTopo, tol: number) => ({
      countries: {
        type: "FeatureCollection",
        features: (feature(w, w.objects.countries) as FeatureCollection<Geometry, Named>).features
          .filter((f) => f.id !== USA)
          .map((f) => (f.id === ANTARCTICA ? f : { ...f, geometry: densify(f.geometry, tol ? LOD_DENSIFY : MAX_STEP) })),
      } as FeatureCollection<Geometry, Named>,
      states: feature(u, u.objects.states) as FeatureCollection,
      /** The US as one shape: what's filled from afar instead of every state. */
      usa: merge(u, u.objects.states.geometries as Parameters<typeof merge>[1]),
      stateBorders: mesh(u, u.objects.states, (a, b) => a !== b) as MultiLineString,
      nation: mesh(u, u.objects.states, (a, b) => a === b) as MultiLineString,
      lakes: tol ? lakes.map((f) => ({ ...f, geometry: simplifyRings(f.geometry, tol) })) : lakes,
    });
    const levels = [
      ...LOD_TOLERANCES.map((tol) => ({ tol, ...buildLayers(simplifyTopology(world, tol), simplifyTopology(us, tol), tol) })),
      { tol: 0, ...buildLayers(world, us, 0) },
    ];
    // Each country's / lake's bounding cap (centre, angular radius), so
    // shapes wholly on the far side of the globe can be skipped before d3
    // projects and clips every one of their points.
    const capOf = (f: Feature): [[number, number], number] => {
      const c = geoCentroid(f);
      let r = 0;
      const visit = (pos: Position[]) => {
        for (const p of pos) r = Math.max(r, geoDistance(c, p as [number, number]));
      };
      const g = f.geometry;
      if (g.type === "Polygon") g.coordinates.forEach(visit);
      else if (g.type === "MultiPolygon") g.coordinates.forEach((poly) => poly.forEach(visit));
      return [c, r + 0.02]; // a little slack for edges bowing past their ends
    };
    // Every level lists the same countries in the same order.
    const countryCaps = levels[levels.length - 1].countries.features.map(capOf);
    const lakeCaps = lakes.map(capOf);
    const HALF = Math.PI / 2;
    /** Not wholly on the far side, as seen from `view` (lon, lat). */
    const facing = (cap: [[number, number], number] | undefined, view: [number, number]) =>
      !cap || geoDistance(cap[0], view) - cap[1] < HALF;

    /** The layers to draw at globe radius `R` (px). */
    const layersFor = (R: number) => {
      const degPerPx = DEG / R;
      return levels.find((l) => l.tol <= LOD_PX * degPerPx) ?? levels[levels.length - 1];
    };
    const graticule = geoGraticule10();
    const sphere = { type: "Sphere" } as const;

    const projection = geoOrthographic().clipAngle(90).precision(0.6);
    const path = geoPath(projection, ctx);

    // ---- Camera ------------------------------------------------------------
    // Canvas size, plus the anchor box (globe centre and size) inside it.
    let w = 0;
    let h = 0;
    let ax = 0;
    let ay = 0;
    let aw = 0;
    let ah = 0;
    let dpr = 1;
    const base = () => Math.min(aw, ah);
    // Radius at which the lower 48 fill the frame (about 0.82r wide and
    // 0.48r tall when centred, in orthographic), within the stage box; the
    // rest of the globe simply runs off the page.
    const usRadius = () => Math.min((0.92 * aw) / 0.82, (0.95 * ah) / 0.48) / base();
    const target = (v: GlobeView, from: Camera): Camera =>
      v === "trips"
        ? frameTrip()
        : v === "us"
          ? { ...US_CENTER, r: usRadius(), ox: 0 }
          : { lon: from.lon, lat: WORLD_TILT, r: WORLD_RADIUS, ox: 0 };

    /** Fit the selected trip, beside the card when the card is beside the globe. */
    const frameTrip = (): Camera => {
      const trip = routes.find((rt) => rt.id === tripIdRef.current) ?? routes[0];
      if (!trip) return { ...US_CENTER, r: usRadius(), ox: 0 };

      // Fit inside the stage box (the right-hand column on desktop).
      const availW = aw;

      // Centre on the trip's bounding box, then size it with the unit
      // orthographic extents of its stops.
      // Frame the plotted places only (not "None" rows).
      const framed = trip.markers.length ? trip.markers.map((m) => m.coord) : trip.coords;
      const lons = framed.map((c) => c[0]);
      const lats = framed.map((c) => c[1]);
      const lon0 = (Math.min(...lons) + Math.max(...lons)) / 2;
      const lat0 = (Math.min(...lats) + Math.max(...lats)) / 2;
      const p0 = lat0 / DEG;
      let mx = 0.02;
      let my = 0.02;
      for (const [lon, lat] of framed) {
        const l = (lon - lon0) / DEG;
        const p = lat / DEG;
        mx = Math.max(mx, Math.abs(Math.cos(p) * Math.sin(l)));
        my = Math.max(my, Math.abs(Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l)));
      }
      const px = Math.min((availW * 0.88) / (2 * mx), (ah * 0.86) / (2 * my));
      return { lon: lon0, lat: lat0, r: Math.max(WORLD_RADIUS, Math.min(40, px / base())), ox: 0 };
    };

    // Starts at world distance, turned well away from the US.
    const cam: Camera = { lon: US_CENTER.lon + INTRO_TURN, lat: WORLD_TILT, r: WORLD_RADIUS, ox: 0 };
    let flight: { from: Camera; to: Camera; start: number; dur: number; spiral?: boolean } | null = null;
    let hovered: Place | null = null;
    /**
     * One marker per place: rows for the same place (repeat visits, or the
     * same place in several trips) are merged and plotted once.
     */
    type Marker = {
      coord: [number, number];
      visits: Stop[];
      /** Starred in any of its rows (in the trips view: that trip's rows). */
      star: boolean;
      /** Colour along its route (0 = start, 1 = end). */
      tone: number;
      /** When the trip's line first reaches it (trip markers only). */
      firstT: number;
    };
    let hoveredMarker: Marker | null = null;
    /** Every place across all trips, for the United States / World views. */
    let allMarkers: Marker[] = [];

    // ---- Routes ------------------------------------------------------------
    // One route per trip (stops sharing a tag), in sheet order. Each leg
    // follows its road / rail route when one is cached (else a straight
    // line). Legs are laid out on a timeline: length sets the pace, with a
    // pause and a slower leg whenever the kind of travel changes.
    type RouteLeg = {
      pts: [number, number][];
      /** Distance along `pts` (radians). */
      d: number[];
      len: number;
      mode: LegMode;
      /** Start and duration on the route's timeline. */
      t0: number;
      dt: number;
      /**
       * Part of the leg to show (0–1). Legs to or from a "None" row show
       * only the end at the plotted stop, fading out toward the hidden one.
       */
      show: [number, number];
      /** Which end fades out ("None" stop), if any. */
      fade: "start" | "end" | null;
    };
    type Route = {
      id: string;
      stops: Stop[];
      coords: [number, number][];
      legs: RouteLeg[];
      /** When the line reaches each stop, on the timeline. */
      stopT: number[];
      /** This trip's places, merged. */
      markers: Marker[];
      T: number;
      /** Draw-in duration. */
      ms: number;
    };
    let routes: Route[] = [];
    let routeStart: number | null = null;
    let routeProgress = 0;
    /** The route on show: the selected trip's, and only in the trips view. */
    const selectedRoute = () =>
      viewRef.current === "trips" ? (routes.find((rt) => rt.id === tripIdRef.current) ?? routes[0] ?? null) : null;
    const buildRoute = () => {
      const groups = groupTrips(tripRef.current?.stops ?? []);
      if (!groups.length) return;
      const first = routes.length === 0;
      routes = groups.map(({ id, stops }) => {
        const coords = stops.map((st) => [st.lon, st.lat] as [number, number]);
        const legs: RouteLeg[] = [];
        for (let i = 1; i < coords.length; i++) {
          const mode = legMode(stops[i].transport);
          const routed = id ? legsRef.current.get(legKey(stops[i - 1], stops[i])) : undefined;
          // Road / rail routes start and end on the network; join them to the stops.
          const pts = routed ? [coords[i - 1], ...routed.coords, coords[i]] : [coords[i - 1], coords[i]];
          const d = [0];
          for (let j = 1; j < pts.length; j++) d.push(d[j - 1] + geoDistance(pts[j - 1], pts[j]));
          const fromHidden = !plotted(stops[i - 1]);
          const toHidden = !plotted(stops[i]);
          legs.push({
            pts,
            d,
            len: d[d.length - 1],
            mode,
            t0: 0,
            dt: 0,
            show: fromHidden && toHidden ? [0, 0] : fromHidden ? [1 - STUB, 1] : toHidden ? [0, STUB] : [0, 1],
            fade: fromHidden && toHidden ? null : fromHidden ? "start" : toHidden ? "end" : null,
          });
        }
        const total = legs.reduce((sum, l) => sum + l.len, 0) || 1;
        // Flights don't get time in proportion to distance, or a long-haul
        // leg (often mostly off-screen) would eat the whole draw-in. Each
        // flight takes a set share of the ground legs' time instead.
        const ground = legs.filter((l) => l.mode !== "air" && !l.fade).reduce((sum, l) => sum + l.len, 0);
        const flightTime = (len: number) => (ground > 0 ? Math.min(len, Math.max(ground * 0.12, Math.min(len, ground * 0.3))) : len);
        let t = 0;
        let switches = 0;
        const stopT = [0];
        legs.forEach((leg, i) => {
          const switched = i > 0 && leg.mode !== legs[i - 1].mode;
          if (switched) {
            switches++;
            t += SWITCH_PAUSE * (ground || total);
          }
          leg.t0 = t;
          // Stubs to hidden stops take only a moment.
          const base = leg.show[1] - leg.show[0] < 1 ? (ground || total) * 0.05 : leg.mode === "air" ? flightTime(leg.len) : leg.len;
          leg.dt = Math.max(base, total * 0.004) * (switched ? SWITCH_SLOW : 1);
          t += leg.dt;
          stopT.push(t);
        });
        const ms = Math.min(ROUTE_MAX_MS, ROUTE_MS + SWITCH_MS * switches);
        const n = stops.length;
        // "None" rows: legs to and from them are drawn, but they get no marker
        // and the trip is framed without them.
        const markers = mergePlaces(stops.filter(plotted)).map((visits) => {
          const first = stops.indexOf(visits[0]);
          return {
            coord: coords[first],
            visits,
            // Starred only by this trip's own rows (Needham on Tucka), not by
            // rows elsewhere in the sheet (e.g. untagged Milwaukee).
            star: visits.some((v) => /star/i.test(v.icon)),
            tone: first / Math.max(1, n - 1),
            firstT: Math.min(...visits.map((v) => stopT[stops.indexOf(v)])),
          };
        });
        return { id, stops, coords, legs, stopT, markers, T: t || 1, ms };
      });
      // All places, merged across trips; a place is a star if any row says so.
      const toneOf = new Map<Stop, number>();
      for (const rt of routes) if (rt.id) for (const m of rt.markers) for (const v of m.visits) toneOf.set(v, m.tone);
      allMarkers = mergePlaces(routes.flatMap((rt) => rt.stops).filter(plotted)).map((visits) => ({
        coord: [visits[0].lon, visits[0].lat],
        visits,
        star: visits.some((v) => /star/i.test(v.icon)),
        tone: visits.map((v) => toneOf.get(v)).find((x) => x !== undefined) ?? 0.5,
        firstT: 0,
      }));
      // Trips view opened before the sheet arrived: frame the trip now.
      if (first && started && viewRef.current === "trips") goTo.current("trips");
      dirty = true;
    };
    tripReady.current = buildRoute;
    let dirty = true;
    let started = false;

    goTo.current = (v) => {
      // Opening a trip replays its route drawing in once the globe arrives.
      if (v === "trips") {
        routeProgress = 0;
        routeStart = null;
      }
      const to = target(v, cam);
      // Turn the short way round.
      to.lon = cam.lon + ((((to.lon - cam.lon) % 360) + 540) % 360) - 180;
      if (reduceMotion) {
        Object.assign(cam, to);
        flight = null;
        dirty = true;
      } else {
        flight = { from: { ...cam }, to, start: performance.now(), dur: FLY_MS };
      }
    };

    // Opening move: spiral in from world distance to the US.
    const intro = () => {
      started = true;
      if (reduceMotion || viewRef.current !== "us") return goTo.current(viewRef.current);
      const to = target("us", cam);
      flight = { from: { ...cam }, to, start: performance.now(), dur: INTRO_MS, spiral: true };
    };

    // 0 in world view, 1 once zoomed in on the US.
    const zoomLevel = () => Math.min(1, Math.max(0, (cam.r - WORLD_RADIUS) / (usRadius() - WORLD_RADIUS)));

    const onFront = (c: [number, number]) => geoDistance(c, [cam.lon, cam.lat]) < Math.PI / 2 - 0.02;

    const drawStar = (x: number, y: number, outer: number) => {
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const rr = k % 2 ? outer * 0.52 : outer; // plump points
        const a = -Math.PI / 2 + (k * Math.PI) / 5;
        ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      ctx.closePath();
    };

    /** Glowing tip of the line while it draws, at a screen point. */
    const drawHead = (x: number, y: number, k: number, progress: number, alpha = 1) => {
      if (alpha <= 0.01 || !Number.isFinite(x) || !Number.isFinite(y)) return;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 10 * k);
      g.addColorStop(0, `rgba(255, 255, 255, ${0.95 * alpha})`);
      g.addColorStop(0.35, routeColor(progress, 0.6 * alpha));
      g.addColorStop(1, routeColor(progress, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 10 * k, 0, Math.PI * 2);
      ctx.fill();
    };

    /** Glow plus core stroke for whatever path is current. */
    const strokeLine = (t: number, k: number, core = 2) => {
      ctx.lineWidth = 7 * k;
      ctx.strokeStyle = routeColor(t, 0.16);
      ctx.stroke();
      ctx.lineWidth = core * k;
      ctx.strokeStyle = routeColor(t, 0.95);
      ctx.stroke();
    };

    /**
     * A leg on the ground, drawn up to `along` (radians). Car: solid line on
     * the roads. Walk: dashes. Boat: long dashes. Train: rails and ties.
     * Returns the tip if partly drawn.
     */
    const drawGroundLeg = (leg: RouteLeg, along: number, t: number, k: number): [number, number] | null => {
      const { pts, d, mode } = leg;
      let shown = pts;
      let tip: [number, number] | null = null;
      if (along < leg.len) {
        let j = 0;
        while (j < d.length - 2 && d[j + 1] <= along) j++;
        const seg = d[j + 1] - d[j];
        tip = geoInterpolate(pts[j], pts[j + 1])(seg > 0 ? (along - d[j]) / seg : 1) as [number, number];
        shown = [...pts.slice(0, j + 1), tip];
      }
      const line = { type: "LineString" as const, coordinates: shown };
      const trace = () => {
        ctx.beginPath();
        path(line);
      };
      if (mode === "train") {
        // Same solid line as a drive, with small cross-ties along it (the
        // classic railway map symbol), spaced evenly on screen.
        trace();
        strokeLine(t, k);
        const screen = shown
          .filter((c) => onFront(c))
          .map((c) => projection(c))
          .filter((p): p is [number, number] => !!p);
        const gap = 9 * k;
        const half = 3.2 * k;
        ctx.beginPath();
        let carry = gap / 2;
        for (let s2 = 1; s2 < screen.length; s2++) {
          const [x0, y0] = screen[s2 - 1];
          const [x1, y1] = screen[s2];
          const len = Math.hypot(x1 - x0, y1 - y0);
          if (len === 0) continue;
          if (len > 60 * k) {
            carry = gap / 2; // jump (e.g. back of the globe): restart spacing
            continue;
          }
          const nx = -(y1 - y0) / len;
          const ny = (x1 - x0) / len;
          let at = carry;
          while (at <= len) {
            const x = x0 + ((x1 - x0) * at) / len;
            const y = y0 + ((y1 - y0) * at) / len;
            ctx.moveTo(x - nx * half, y - ny * half);
            ctx.lineTo(x + nx * half, y + ny * half);
            at += gap;
          }
          carry = at - len;
        }
        ctx.lineWidth = 1.3 * k;
        ctx.strokeStyle = routeColor(t, 0.95);
        ctx.stroke();
      } else {
        trace();
        ctx.setLineDash(mode === "foot" ? [2.5 * k, 4.5 * k] : mode === "boat" ? [8 * k, 6 * k] : []);
        strokeLine(t, k);
        ctx.setLineDash([]);
      }
      return tip;
    };

    /**
     * A flight, drawn up to fraction `f`: an arc lifted off the globe (hidden
     * where it passes behind it), with a faint dotted shadow on the ground.
     * Returns the screen tip if partly drawn.
     */
    const drawFlight = (leg: RouteLeg, f: number, t: number, k: number, cx: number, cy: number, R: number) => {
      // Shown part of the flight, drawn from its start up to fraction f.
      const [u0, u1] = leg.show;
      const uAt = (x: number) => u0 + (u1 - u0) * x;
      const a = leg.pts[0];
      const b = leg.pts[leg.pts.length - 1];
      const along = geoInterpolate(a, b);
      const lift = flightLift(leg.len);
      const center: [number, number] = [cam.lon, cam.lat];

      // Shadow on the ground under the plane: one soft blurred stroke,
      // nudged a little away from the light (upper left) as the plane climbs.
      {
        const shadow = new Path2D();
        const steps = Math.max(6, Math.ceil(48 * f));
        let pen = false;
        let s0: [number, number] | null = null;
        let s1: [number, number] | null = null;
        for (let i = 0; i <= steps; i++) {
          const u = uAt((f * i) / steps);
          const g = along(u) as [number, number];
          const p = onFront(g) ? projection(g) : null;
          if (!p) {
            pen = false;
            continue;
          }
          const off = lift * Math.sin(Math.PI * u) * R * 0.05;
          if (pen) shadow.lineTo(p[0] + off, p[1] + off);
          else shadow.moveTo(p[0] + off, p[1] + off);
          s0 ??= [p[0] + off, p[1] + off];
          s1 = [p[0] + off, p[1] + off];
          pen = true;
        }
        ctx.save();
        ctx.filter = `blur(${2.5 * k}px)`;
        ctx.lineWidth = 5 * k;
        // On stubs the shadow fades toward the hidden stop, like the arc.
        if (leg.fade && s0 && s1 && (s0[0] !== s1[0] || s0[1] !== s1[1])) {
          const [from, to] = leg.fade === "start" ? [s0, s1] : [s1, s0];
          const g = ctx.createLinearGradient(from[0], from[1], to[0], to[1]);
          g.addColorStop(0, "rgba(2, 4, 16, 0)");
          g.addColorStop(1, "rgba(2, 4, 16, 0.45)");
          ctx.strokeStyle = g;
        } else {
          ctx.strokeStyle = "rgba(2, 4, 16, 0.45)";
        }
        ctx.stroke(shadow);
        ctx.restore();
      }

      const arc = new Path2D();
      const n = Math.max(8, Math.ceil(64 * f));
      let pen = false;
      let tip: [number, number] | null = null;
      let tail: [number, number] | null = null;
      for (let i = 0; i <= n; i++) {
        const u = uAt((f * i) / n);
        const g = along(u) as [number, number];
        const p = projection(g);
        if (!p) {
          pen = false;
          continue;
        }
        const h = 1 + lift * Math.sin(Math.PI * u);
        const x = cx + (p[0] - cx) * h;
        const y = cy + (p[1] - cy) * h;
        // Visible if on the near side, or high enough to clear the limb.
        const seen = Math.cos(geoDistance(g, center)) > 0 || Math.hypot(x - cx, y - cy) > R;
        if (seen) {
          if (pen) arc.lineTo(x, y);
          else arc.moveTo(x, y);
          tail ??= [x, y];
          tip = [x, y];
        }
        pen = seen;
      }
      // Stubs fade out toward the hidden stop.
      const style = (alpha: number): string | CanvasGradient => {
        if (!leg.fade || !tail || !tip || (tail[0] === tip[0] && tail[1] === tip[1])) return routeColor(t, alpha);
        const [from, to] = leg.fade === "start" ? [tail, tip] : [tip, tail];
        const g = ctx.createLinearGradient(from[0], from[1], to[0], to[1]);
        g.addColorStop(0, routeColor(t, 0));
        g.addColorStop(1, routeColor(t, alpha));
        return g;
      };
      ctx.lineWidth = 7 * k;
      ctx.strokeStyle = style(0.16);
      ctx.stroke(arc);
      ctx.lineWidth = 2 * k;
      ctx.strokeStyle = style(0.95);
      ctx.stroke(arc);
      // On stubs the head fades with the arc: in from a hidden stop, out
      // toward one.
      if (f >= 1 || !tip) return null;
      const alpha = leg.fade === "start" ? f : leg.fade === "end" ? 1 - f : 1;
      return { at: tip, alpha };
    };

    /**
     * A route drawn up to `progress` of its timeline, then the stops it has
     * reached. Without `lines`, just the stops (the US / world views).
     */
    /**
     * Place markers; starred places are stars. In the trips view (`target`
     * set) they appear as the line reaches them.
     */
    // Markers animate in and out: each place's presence eases 0 → 1 when it
    // should show (view switch, or the line reaching it) and back to 0 when
    // it shouldn't, with a little overshoot on the way in.
    const MARKER_MS = 320;
    const presence = new Map<string, { m: Marker; a: number; want: boolean }>();
    const markerKey = (m: Marker) => `${m.coord[0].toFixed(3)},${m.coord[1].toFixed(3)}${m.star ? "*" : ""}`;
    /** Markers that should be showing right now. */
    const wantedMarkers = (): Marker[] => {
      const sel = selectedRoute();
      if (!sel) return allMarkers;
      const target = routeProgress * sel.T;
      return sel.markers.filter((m) => m.firstT <= target);
    };
    /** Step every marker's presence; true while any is still animating. */
    const stepMarkers = (dt: number): boolean => {
      const wanted = wantedMarkers();
      const keys = new Set<string>();
      for (const m of wanted) {
        const key = markerKey(m);
        keys.add(key);
        const e = presence.get(key);
        if (e) {
          e.m = m;
          e.want = true;
        } else presence.set(key, { m, a: reduceMotion ? 1 : 0, want: true });
      }
      let moving = false;
      for (const [key, e] of presence) {
        if (!keys.has(key)) e.want = false;
        const goal = e.want ? 1 : 0;
        if (e.a !== goal) {
          e.a = reduceMotion ? goal : Math.min(1, Math.max(0, e.a + (e.want ? 1 : -1) * ((dt * 1000) / MARKER_MS)));
          moving = true;
        }
        if (!e.want && e.a === 0) presence.delete(key);
      }
      return moving;
    };
    const easeOutBack = (x: number) => 1 + 2.2 * (x - 1) ** 3 + 1.2 * (x - 1) ** 2;

    const drawMarkers = (k: number) => {
      for (const { m, a, want } of presence.values()) {
        if (a <= 0 || !onFront(m.coord)) continue;
        const p = projection(m.coord);
        if (!p) continue;
        // Pop in with a slight overshoot; shrink away when leaving.
        const grow = want ? easeOutBack(a) : a;
        ctx.globalAlpha = Math.min(1, a * 1.5);
        const lit = m === hoveredMarker;
        if (m.star) {
          // Soft star: rounded tips (a thick round-joined stroke in the fill
          // colour) and a gentle glow.
          const size = (lit ? 8 : 6.2) * k * grow;
          const fill = "#fef9c3"; // same pale yellow as before
          drawStar(p[0], p[1], size);
          ctx.shadowColor = routeColor(m.tone, lit ? 0.75 : 0.5);
          ctx.shadowBlur = lit ? 14 : 9;
          ctx.lineJoin = "round";
          ctx.lineWidth = size * 0.45;
          ctx.strokeStyle = fill;
          ctx.stroke();
          ctx.fillStyle = fill;
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          const rad = (lit ? 4.2 : 2.6) * k * grow;
          if (lit) {
            ctx.beginPath();
            ctx.arc(p[0], p[1], rad * 2.4, 0, Math.PI * 2);
            ctx.fillStyle = routeColor(m.tone, 0.25);
            ctx.fill();
          }
          ctx.beginPath();
          ctx.arc(p[0], p[1], rad, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();
          ctx.lineWidth = 1.2 * k;
          ctx.strokeStyle = routeColor(m.tone, 1);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    };

    const drawRoute = (route: Route, zoomed: number, progress: number, lines: boolean, cx: number, cy: number, R: number) => {
      const { coords, legs, T } = route;
      const target = progress * T;
      const k = 0.55 + 0.45 * zoomed; // thinner from afar
      const n = coords.length;
      ctx.lineCap = "round";

      let head: { at: [number, number]; alpha: number } | null = null; // screen point
      for (let i = 0; lines && i < legs.length && legs[i].t0 <= target; i++) {
        const leg = legs[i];
        const f = leg.dt > 0 ? Math.min(1, Math.max(0, (target - leg.t0) / leg.dt)) : 1;
        const t = i / Math.max(1, n - 2);
        if (leg.show[1] <= leg.show[0]) continue; // between two hidden stops
        if (leg.mode === "air") {
          head = drawFlight(leg, f, t, k, cx, cy, R) ?? head;
        } else if (leg.fade) {
          continue; // ground legs to hidden stops aren't drawn
        } else {
          const tip = drawGroundLeg(leg, f * leg.len, t, k);
          if (tip && onFront(tip)) {
            const p = projection(tip);
            if (p) head = { at: [p[0], p[1]], alpha: 1 };
          }
        }
      }

      // Places pop in as the line first reaches them (see stepMarkers).
      if (lines) drawMarkers(k);
      if (head && progress < 1) drawHead(head.at[0], head.at[1], k, progress, head.alpha);
    };

    /** Keep the place label beside its marker as the globe moves. */
    const placeTip = () => {
      const el = tipRef.current;
      if (!el) return;
      const m = hoveredMarker;
      const p = m && onFront(m.coord) ? projection(m.coord) : null;
      if (!m || !p) {
        el.style.opacity = "0";
        return;
      }
      // Above the marker, kept inside the canvas; below it near the top edge.
      const tw = el.offsetWidth;
      const th = el.offsetHeight;
      const x = Math.min(w - tw - 8, Math.max(8, p[0] - tw / 2));
      const above = p[1] - th - 14;
      const y = above < 8 ? p[1] + 14 : above;
      el.style.transform = `translate(${x}px, ${y}px)`;
      el.style.opacity = "1";
    };

    // ---- Drawing -----------------------------------------------------------
    const draw = () => {
      const R = cam.r * base();
      const cx = ax + cam.ox;
      const cy = ay;
      const zoomed = zoomLevel();
      projection.translate([cx, cy]).scale(R).rotate([-cam.lon, -cam.lat]);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.lineJoin = "round";

      // Atmosphere: a cyan haze just outside the rim.
      const haze = ctx.createRadialGradient(cx, cy, R * 0.96, cx, cy, R * 1.22);
      haze.addColorStop(0, "rgba(103, 232, 249, 0.28)");
      haze.addColorStop(0.4, "rgba(129, 140, 248, 0.10)");
      haze.addColorStop(1, "rgba(103, 232, 249, 0)");
      ctx.fillStyle = haze;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.22, 0, Math.PI * 2);
      ctx.fill();

      // Ocean, lit from the upper left.
      const ocean = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
      ocean.addColorStop(0, "#1e1b4b");
      ocean.addColorStop(0.7, "#0b1030");
      ocean.addColorStop(1, "#050816");
      ctx.beginPath();
      path(sphere);
      ctx.fillStyle = ocean;
      ctx.fill();
      const water = ocean;

      ctx.beginPath();
      path(graticule);
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
      ctx.stroke();

      const L = layersFor(R);
      const view: [number, number] = [cam.lon, cam.lat];

      ctx.beginPath();
      L.countries.features.forEach((f, i) => facing(countryCaps[i], view) && path(f));
      ctx.fillStyle = "rgba(148, 163, 184, 0.20)";
      ctx.fill();
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
      ctx.stroke();

      // The US is styled like any other country from afar and picks up its
      // highlight as you zoom in.

      // From afar the US fills as one shape; the states (same outline, many
      // more points) only once their borders start to show.
      ctx.beginPath();
      path(zoomed > 0 ? L.states : L.usa);
      ctx.fillStyle = "rgba(148, 163, 184, 0.20)";
      ctx.fill();
      if (zoomed > 0) {
        const usFill = ctx.createLinearGradient(cx - R * 0.5, cy - R * 0.3, cx + R * 0.5, cy + R * 0.3);
        usFill.addColorStop(0, `rgba(167, 139, 250, ${0.45 * zoomed})`);
        usFill.addColorStop(1, `rgba(103, 232, 249, ${0.35 * zoomed})`);
        ctx.fillStyle = usFill;
        ctx.fill();
      }

      if (hovered) {
        ctx.beginPath();
        path(hovered);
        ctx.fillStyle = "rgba(103, 232, 249, 0.55)";
        ctx.fill();
      }

      ctx.beginPath();
      for (let i = 0; i < L.lakes.length; i++) {
        if (lakeArea[i] * R * R >= MIN_LAKE_PX && facing(lakeCaps[i], view)) path(L.lakes[i]);
      }
      ctx.fillStyle = water;
      ctx.fill();
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
      ctx.stroke();

      if (zoomed > 0) {
        ctx.beginPath();
        path(L.stateBorders);
        ctx.lineWidth = 0.7;
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 * zoomed})`;
        ctx.stroke();
      }

      // National border: a plain country line from afar, violet up close.
      ctx.beginPath();
      path(L.nation);
      ctx.lineWidth = 0.6 + 0.5 * zoomed;
      ctx.strokeStyle = `rgba(${255 - 59 * zoomed}, ${255 - 74 * zoomed}, ${255 - 2 * zoomed}, ${0.18 + 0.67 * zoomed})`;
      ctx.stroke();

      if (hovered) {
        ctx.beginPath();
        path(hovered);
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = "rgba(165, 243, 252, 0.95)";
        ctx.stroke();
      }

      // Trips view: the selected trip's route, drawing itself in. Elsewhere:
      // every trip's stops, without the lines.
      const shown = selectedRoute();
      if (shown) drawRoute(shown, zoomed, routeProgress, true, cx, cy, R);
      else drawMarkers(0.55 + 0.45 * zoomed);
      placeTip();

      // Rim light.
      ctx.beginPath();
      path(sphere);
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = "rgba(167, 139, 250, 0.45)";
      ctx.stroke();

      // Bottom edge, where the section meets the footer. The globe fades
      // into solid ink (never transparent, so the animated background can't
      // show through it); anything outside the globe fades out.
      const band = Math.min(112, h * 0.25);
      const top = h - band;
      if (cy + R > top) {
        const ink = ctx.createLinearGradient(0, top, 0, h);
        ink.addColorStop(0, "rgba(3, 7, 18, 0)");
        ink.addColorStop(1, "rgba(3, 7, 18, 1)");
        ctx.save();
        ctx.beginPath();
        path(sphere);
        ctx.clip();
        ctx.fillStyle = ink;
        ctx.fillRect(0, top, w, band);
        ctx.restore();
      }
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, h);
      path(sphere);
      ctx.clip("evenodd");
      ctx.globalCompositeOperation = "destination-out";
      const fadeOut = ctx.createLinearGradient(0, top, 0, h);
      fadeOut.addColorStop(0, "rgba(0, 0, 0, 0)");
      fadeOut.addColorStop(1, "rgba(0, 0, 0, 1)");
      ctx.fillStyle = fadeOut;
      ctx.fillRect(0, top, w, band);
      ctx.restore();
    };

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const box = anchor.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      ax = box.left - rect.left + box.width / 2;
      ay = box.top - rect.top + box.height / 2;
      aw = box.width;
      ah = box.height;
      // 1.5× on phones (44% fewer pixels per frame than 2×; still sharp).
      dpr = Math.min(window.devicePixelRatio || 1, window.matchMedia("(pointer: coarse)").matches ? 1.5 : 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      // Keep the US filling the frame on resize, but not before the opening
      // move has started (it begins from world distance).
      if (started && !flight && viewRef.current === "us") cam.r = usRadius();
      if (started && !flight && viewRef.current === "trips") Object.assign(cam, frameTrip());
      dirty = true;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    ro.observe(anchor);

    // ---- Interaction -------------------------------------------------------
    let drag: { id: number; x: number; y: number; lon: number; lat: number; moved: boolean } | null = null;
    // Idle spin pauses only while the pointer is over the globe itself.
    let overGlobe = false;

    const local = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return [e.clientX - rect.left, e.clientY - rect.top] as [number, number];
    };

    const pick = (pt: [number, number]): Place | null => {
      const R = cam.r * base();
      if (Math.hypot(pt[0] - ax - cam.ox, pt[1] - ay) > R) return null;
      const ll = projection.invert?.(pt);
      if (!ll) return null;
      if (lakes.some((f) => geoContains(f, ll))) return null;
      const state = states.find((f) => geoContains(f, ll));
      // From afar the US is just a country; states are pickable only zoomed in.
      if (state) return zoomLevel() < 0.5 ? usaWhole : state;
      return countries.find((f) => geoContains(f, ll)) ?? null;
    };

    /** Nearest visible marker (one the line has reached, in the trips view). */
    const pickMarker = (pt: [number, number], radius: number): Marker | null => {
      const sel = selectedRoute();
      const target = sel ? routeProgress * sel.T : Infinity;
      let best: Marker | null = null;
      let bestD = radius;
      for (const m of sel ? sel.markers : allMarkers) {
        if (m.firstT > target || !onFront(m.coord)) continue;
        const p = projection(m.coord);
        if (!p) continue;
        const d = Math.hypot(p[0] - pt[0], p[1] - pt[1]);
        if (d < bestD) {
          bestD = d;
          best = m;
        }
      }
      return best;
    };

    const setHover = (place: Place | null, marker: Marker | null) => {
      if (place === hovered && marker === hoveredMarker) return;
      hovered = place;
      hoveredMarker = marker;
      dirty = true;
      if (!drag) canvas.style.cursor = marker ? "pointer" : "";
      // Places get a label beside the marker; countries / states still use
      // the caption under the globe.
      if (marker) {
        // Dates only in the trips view; elsewhere just the place (and any note).
        const [title, ...rest] = placeLabel(marker.visits).split(" · ");
        const notes = [...new Set(marker.visits.map((v) => v.comment).filter(Boolean))].join(" · ");
        setTip({ title, detail: viewRef.current === "trips" ? rest.join(" · ") : notes });
        // Re-place once React has rendered the new text (its size changes).
        requestAnimationFrame(() => requestAnimationFrame(() => (dirty = true)));
      } else setTip(null);
      hoverRef.current(marker ? null : (place?.properties.name ?? null));
    };
    const setHovered = (place: Place | null) => setHover(place, null);
    /** Places win over the land under them. */
    const hoverAt = (pt: [number, number], touch: boolean) => {
      const marker = pickMarker(pt, touch ? 16 : 9);
      setHover(marker ? null : pick(pt), marker);
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const [x, y] = local(e);
      drag = { id: e.pointerId, x, y, lon: cam.lon, lat: cam.lat, moved: false };
    };
    const onMove = (e: PointerEvent) => {
      const pt = local(e);
      overGlobe = Math.hypot(pt[0] - ax - cam.ox, pt[1] - ay) <= cam.r * base();
      if (drag && drag.id === e.pointerId) {
        const dx = pt[0] - drag.x;
        const dy = pt[1] - drag.y;
        if (!drag.moved && Math.hypot(dx, dy) < 4) return;
        if (!drag.moved) {
          drag.moved = true;
          flight = null;
          setHovered(null);
          canvas.setPointerCapture(e.pointerId);
          canvas.style.cursor = "grabbing";
        }
        const perPx = DEG / (cam.r * base());
        cam.lon = drag.lon - dx * perPx;
        cam.lat = Math.max(-80, Math.min(80, drag.lat + dy * perPx));
        dirty = true;
        return;
      }
      if (e.pointerType === "mouse") hoverAt(pt, false);
    };
    const onUp = (e: PointerEvent) => {
      if (!drag || drag.id !== e.pointerId) return;
      // A tap (no drag) selects the place under the finger.
      if (!drag.moved) hoverAt(local(e), e.pointerType !== "mouse");
      drag = null;
      canvas.style.cursor = "";
    };
    const onLeave = (e: PointerEvent) => {
      overGlobe = false;
      if (e.pointerType === "mouse") setHovered(null);
    };
    const onCancel = () => {
      drag = null;
      canvas.style.cursor = "";
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onCancel);
    canvas.addEventListener("pointerleave", onLeave);

    // ---- Loop --------------------------------------------------------------
    const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
    const easeOut = (t: number) => 1 - (1 - t) ** 2.4;
    const easeSine = (t: number) => (1 - Math.cos(Math.PI * t)) / 2;
    // Nothing is drawn while the globe is scrolled out of view. The camera
    // and animations keep advancing, so it's current when it comes back.
    let onScreen = true;
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) dirty = true;
    });
    io.observe(anchor);
    // On phones the idle world spin redraws at most ~30 times a second
    // (a little under 1/30 s, so 60 Hz screens land on every other frame).
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const SPIN_FRAME_MS = 1000 / 30 - 4;
    let lastDraw = 0;

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      let spinning = false; // only the idle spin changed this frame
      if (flight) {
        const t = Math.min(1, (now - flight.start) / flight.dur);
        const { from, to, spiral } = flight;
        // Spiral: spin winds down while the zoom tightens steadily throughout.
        const es = spiral ? easeOut(t) : easeInOut(t);
        const ez = spiral ? easeSine(t) : easeInOut(t);
        cam.lon = from.lon + (to.lon - from.lon) * es;
        cam.lat = from.lat + (to.lat - from.lat) * ez;
        if (spiral) {
          const turnLeft = ((to.lon - cam.lon) * Math.PI) / 180;
          cam.lat += INTRO_SWAY * (1 - ez) * Math.sin(turnLeft);
        }
        // Zoom in log space so it moves at an even pace.
        cam.r = Math.exp(Math.log(from.r) + (Math.log(to.r) - Math.log(from.r)) * ez);
        cam.ox = from.ox + (to.ox - from.ox) * ez;
        if (t === 1) flight = null;
        dirty = true;
      } else if (viewRef.current === "world" && !drag && !overGlobe && !reduceMotion) {
        cam.lon += SPIN * dt;
        dirty = true;
        spinning = true;
      }
      // The route draws itself in once the opening move has settled.
      if (selectedRoute() && routeProgress < 1) {
        if (reduceMotion) routeProgress = 1;
        else if (routeStart === null) {
          if (started && !flight) routeStart = now + 250;
        } else {
          // Gentle ease, so the pauses at changes of transport read clearly.
          const ms = selectedRoute()?.ms ?? ROUTE_MS;
          routeProgress = easeSine(Math.min(1, Math.max(0, (now - routeStart) / ms)));
        }
        dirty = true;
        spinning = false;
      }
      if (stepMarkers(dt)) {
        dirty = true;
        spinning = false;
      }
      const throttled = coarse && spinning && now - lastDraw < SPIN_FRAME_MS;
      if (dirty && onScreen && !throttled) {
        draw();
        dirty = false;
        lastDraw = now;
      }
      raf = requestAnimationFrame(frame);
    };
    buildRoute();
    intro();
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onCancel);
      canvas.removeEventListener("pointerleave", onLeave);
      goTo.current = () => {};
      tripReady.current = () => {};
    };
  }, [data, reduceMotion, anchorRef]);

  if (failed) {
    return <div className="grid h-full place-items-center text-sm text-gray-400">Couldn't load the globe. Try refreshing.</div>;
  }

  return (
    <motion.div
      ref={wrapRef}
      className="absolute inset-0"
      // Opacity only: a scale here would skew the anchor measurements.
      initial={{ opacity: 0 }}
      animate={{ opacity: data ? 1 : 0 }}
      transition={{ duration: 1.2, ease: EASE }}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={
          view === "trips"
            ? "Globe showing the selected trip's route"
            : view === "us"
              ? "Globe zoomed in on the United States"
              : "Globe showing the whole world"
        }
        // Vertical swipes still scroll the page on touch screens.
        className="block h-full w-full cursor-grab touch-pan-y select-none"
      />
      {/* Hovered / tapped place, positioned beside its marker each frame. Plain
          text with a dark halo so it reads over the globe and the stars. */}
      <div
        ref={tipRef}
        aria-live="polite"
        className="pointer-events-none absolute top-0 left-0 w-max max-w-[16rem] text-left opacity-0 transition-opacity duration-150 [text-shadow:0_1px_2px_rgb(0_0_0/0.95),0_0_10px_rgb(3_7_18/0.95),0_0_20px_rgb(3_7_18/0.8)]"
      >
        {tip && (
          <>
            <p className="text-sm leading-snug font-semibold text-balance text-white">{tip.title}</p>
            {tip.detail && <p className="text-xs font-medium text-gray-200">{tip.detail}</p>}
          </>
        )}
      </div>
    </motion.div>
  );
}
