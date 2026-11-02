import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import type { GlobeView } from "../components/travel/TravelGlobe";
import RegionCard from "../components/travel/RegionCard";
import TripCard from "../components/travel/TripCard";
import { EXIT_EASE, rise } from "../components/ui/motion";
import { GRADIENT_TEXT } from "../components/ui/styles";
import { groupTrips, type Stop, type TripGroup } from "../data/trip";
import { cachedMiles, cachedTrip, loadTrip, saveMiles } from "../data/tripData";
import { greatCircleMeters, isRouted, legKey, legMode, tripPairs, watchLegs } from "../data/tripRoutes";
import { useMediaQuery } from "../hooks/useMediaQuery";

// d3-geo and the map data load only when someone opens this page.
const TravelGlobe = lazy(() => import("../components/travel/TravelGlobe"));

const VIEWS: { id: GlobeView; label: string }[] = [
  { id: "trips", label: "Trips" },
  { id: "us", label: "United States" },
  { id: "world", label: "World" },
];

const page: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
  exit: { opacity: 0, transition: { duration: 0.35, ease: EXIT_EASE } },
};

export default function TravelPage() {
  const [view, setView] = useState<GlobeView>("us");
  const [hovered, setHovered] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const wide = useMediaQuery("(min-width: 1024px)");

  // Trips (stops grouped by the sheet's Tags column), live from the sheet.
  // Road miles per trip appear once every leg of that trip has a route.
  // Start from this browser's cached copy (if any) so the cards' numbers
  // show at once; the live sheet replaces it when it arrives.
  const [cached] = useState(() => {
    const t = cachedTrip();
    return t?.stops.length ? { stops: t.stops, groups: groupTrips(t.stops).filter((g) => g.id) } : null;
  });
  const [trips, setTrips] = useState<TripGroup[]>(cached?.groups ?? []);
  const [allStops, setAllStops] = useState<Stop[]>(cached?.stops ?? []);
  const [tripId, setTripId] = useState<string | null>(cached?.groups[0]?.id ?? null);
  const [miles, setMiles] = useState<Record<string, number>>(cachedMiles);
  useEffect(() => saveMiles(miles), [miles]);
  useEffect(() => {
    let live = true;
    let unwatch = () => {};
    loadTrip().then(
      (t) => {
        if (!live || !t.stops.length) return;
        // Untagged rows are standalone places, not a trip.
        const groups = groupTrips(t.stops).filter((g) => g.id);
        setTrips(groups);
        setAllStops(t.stops);
        setTripId((id) => (id && groups.some((g) => g.id === id) ? id : (groups[0]?.id ?? null)));
        unwatch = watchLegs(t.stops, (legs) => {
          if (!live) return;
          const next: Record<string, number> = {};
          for (const g of groups) {
            // Road/rail miles for routed legs, straight-line miles for flights and boats.
            const pairs = tripPairs(g.stops);
            const road = pairs.filter(([, b]) => isRouted(legMode(b.transport))).map(([a, b]) => legKey(a, b));
            if (!road.every((k) => legs.has(k))) continue;
            const meters =
              road.reduce((sum, k) => sum + legs.get(k)!.meters, 0) +
              pairs.filter(([, b]) => !isRouted(legMode(b.transport))).reduce((sum, [a, b]) => sum + greatCircleMeters(a, b), 0);
            next[g.id] = meters / 1609.344;
          }
          // Keep cached figures for trips whose routes are still loading.
          setMiles((prev) => ({ ...prev, ...next }));
        });
      },
      () => {},
    );
    return () => {
      live = false;
      unwatch();
    };
  }, []);
  const selected = trips.find((t) => t.id === tripId) ?? trips[0] ?? null;

  const caption = hovered;

  return (
    <motion.section
      aria-labelledby="travel-title"
      className="relative -mb-12 overflow-hidden px-3 pt-[4.75rem] pb-24 sm:px-6 sm:pt-28 md:pb-28"
      initial="hidden"
      animate="show"
      exit="exit"
      variants={page}
    >
      {/* -mb-12 cancels the footer's top margin so the globe runs right up to it. */}
      {/* The globe's canvas fills the whole section, so when it zooms in on
          the US the rest of the planet runs off the edges of the page. It's
          centred on the stage box below. */}
      <Suspense fallback={null}>
        <TravelGlobe view={view} anchorRef={stageRef} tripId={selected?.id ?? null} onHover={setHovered} />
      </Suspense>

      {/* Content sits above the canvas but lets drags through to it.
          Desktop: text column on the left (heading, tabs, card, caption) and
          the globe's stage on the right, the same for every view.
          Mobile: one column, with the card below the globe. */}
      <div className="pointer-events-none relative mx-auto flex max-w-7xl flex-col items-center lg:grid lg:grid-cols-[28rem_minmax(0,1fr)] lg:grid-rows-[auto_auto_minmax(0,1fr)_auto] lg:items-start lg:gap-x-10">
        <motion.header
          variants={rise}
          className="mb-3 text-center [text-shadow:0_2px_24px_rgb(3_7_18/0.8)] sm:mb-6 lg:col-start-1 lg:row-start-1 lg:mb-6 lg:justify-self-center"
        >
          <p className={`mb-1 text-[0.7rem] font-semibold tracking-[0.2em] uppercase sm:mb-3 sm:text-sm ${GRADIENT_TEXT}`}>Where I've been</p>
          <h1 id="travel-title" className="text-[1.75rem] leading-tight font-bold tracking-tight sm:text-5xl md:text-6xl">
            Travel
          </h1>
        </motion.header>

        <motion.div
          variants={rise}
          role="group"
          aria-label="Globe view"
          className="pointer-events-auto relative flex rounded-full border border-white/10 bg-gray-900/60 p-0.5 backdrop-blur-md sm:p-1 lg:col-start-1 lg:row-start-2 lg:justify-self-center"
        >
          {VIEWS.map((v) => {
            const active = view === v.id;
            return (
              <button
                key={v.id}
                type="button"
                aria-pressed={active}
                onClick={() => setView(v.id)}
                className={`relative rounded-full px-3 py-1 text-xs font-medium transition-colors sm:px-5 sm:py-1.5 sm:text-sm ${
                  active ? "text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="globe-view-pill"
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-plum/80 via-blue-500/70 to-cyan-500/70 shadow-[0_0_18px_rgb(96_165_250/0.35)]"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative">{v.label}</span>
              </button>
            );
          })}
        </motion.div>

        {/* Empty box that sets where the globe sits and how big it is. */}
        <div
          ref={stageRef}
          aria-hidden="true"
          className="mt-2 aspect-square w-full max-w-[calc(100svh-12rem)] sm:aspect-[4/3] sm:max-w-[min(64rem,calc((100svh-21rem)*4/3))] lg:col-start-2 lg:row-span-4 lg:row-start-1 lg:mt-0 lg:aspect-auto lg:h-[calc(100svh-9rem)] lg:max-w-none"
        />

        {/* One card per view, all in the same spot. */}
        <div className="pointer-events-auto order-1 mt-4 w-full max-w-lg lg:order-none lg:col-start-1 lg:row-start-3 lg:mt-6 lg:flex lg:h-full lg:max-h-[min(46rem,calc(100svh-17rem))] lg:max-w-none lg:min-h-0 lg:flex-col">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={view}
              className="lg:flex lg:min-h-0 lg:flex-col"
              initial={{ opacity: 0, x: wide ? -16 : 0, y: wide ? 0 : 12 }}
              animate={{ opacity: 1, x: 0, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }}
              exit={{ opacity: 0, x: wide ? -16 : 0, y: wide ? 0 : 12, transition: { duration: 0.2 } }}
            >
              {view === "trips" ? (
                selected && <TripCard trips={trips} selected={selected} miles={miles[selected.id] ?? null} onSelect={setTripId} />
              ) : (
                <RegionCard view={view} stops={allStops} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Name (and dates, for stops) of whatever is hovered or tapped. On
            phones it sits under the globe, above the card. */}
        <p
          className="-mt-2 min-h-6 w-full max-w-2xl text-center text-sm [text-shadow:0_1px_12px_rgb(3_7_18/0.9)] sm:text-base lg:col-start-1 lg:row-start-4 lg:mt-3"
          aria-live="polite"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={caption ?? "none"}
              className={`block ${hovered ? "font-semibold text-white" : "text-gray-200"}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              {caption ?? "\u00a0"}
            </motion.span>
          </AnimatePresence>
        </p>
      </div>
      {/* Required attribution for the OpenStreetMap road data; sits at the
          very bottom of the section, just above the footer. */}
      <p className="absolute inset-x-0 bottom-3 z-10 text-center text-[0.7rem] text-gray-500 [text-shadow:0_1px_8px_rgb(3_7_18/0.9)]">
        Routes ©{" "}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:text-gray-300 hover:underline">
          OpenStreetMap contributors
        </a>{" "}
        · OSRM
      </p>
    </motion.section>
  );
}
