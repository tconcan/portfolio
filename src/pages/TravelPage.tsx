import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import type { GlobeView } from "../components/travel/TravelGlobe";
import TripCard from "../components/travel/TripCard";
import { EXIT_EASE, rise } from "../components/ui/motion";
import { GRADIENT_TEXT } from "../components/ui/styles";
import { groupTrips, type TripGroup } from "../data/trip";
import { loadTrip } from "../data/tripData";
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
  const cardSlotRef = useRef<HTMLDivElement>(null);
  const wide = useMediaQuery("(min-width: 1024px)");

  // Trips (stops grouped by the sheet's Tags column), live from the sheet.
  // Road miles per trip appear once every leg of that trip has a route.
  const [trips, setTrips] = useState<TripGroup[]>([]);
  const [tripId, setTripId] = useState<string | null>(null);
  const [miles, setMiles] = useState<Record<string, number>>({});
  useEffect(() => {
    let live = true;
    let unwatch = () => {};
    loadTrip().then(
      (t) => {
        if (!live || !t.stops.length) return;
        // Untagged rows are standalone places, not a trip.
        const groups = groupTrips(t.stops).filter((g) => g.id);
        setTrips(groups);
        setTripId((id) => id ?? groups[0]?.id ?? null);
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
          setMiles(next);
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
  const inTrips = view === "trips";

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
        <TravelGlobe view={view} anchorRef={stageRef} tripId={selected?.id ?? null} focusRef={cardSlotRef} onHover={setHovered} />
      </Suspense>

      {/* Content sits above the canvas but lets drags through to it. */}
      <div className="pointer-events-none relative mx-auto flex max-w-6xl flex-col items-center">
        {/* Heading and tabs. On desktop in the trips view they slide left to
            sit centred over the trip card (same width as the card). */}
        <div className={`flex ${inTrips && wide ? "w-[28rem] self-start" : "w-full"} justify-center`}>
        <motion.div
          layout="position"
          transition={{ layout: { duration: 1.2, ease: [0.16, 1, 0.3, 1] } }}
          className="flex flex-col items-center"
        >
        <motion.header variants={rise} className="mb-3 text-center [text-shadow:0_2px_24px_rgb(3_7_18/0.8)] sm:mb-6 md:mb-8">
          <p className={`mb-1 text-[0.7rem] font-semibold tracking-[0.2em] uppercase sm:mb-3 sm:text-sm ${GRADIENT_TEXT}`}>Where I've been</p>
          <h1 id="travel-title" className="text-[1.75rem] leading-tight font-bold tracking-tight sm:text-5xl md:text-6xl">
            Travel
          </h1>
        </motion.header>

        <motion.div
          variants={rise}
          role="group"
          aria-label="Globe view"
          className="pointer-events-auto relative flex rounded-full border border-white/10 bg-gray-900/60 p-0.5 backdrop-blur-md sm:p-1"
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
        </motion.div>
        </div>

        {/* Stage, caption and (in the trips view) the trip card. The card sits
            left of the globe on desktop and below it on smaller screens. */}
        <div className="relative flex w-full flex-col items-center">
        {/* Empty box that sets where the globe sits and how big it is. */}
        <div
          ref={stageRef}
          aria-hidden="true"
          className="mt-2 aspect-square w-full max-w-[calc(100svh-12rem)] sm:aspect-[4/3] sm:max-w-[min(64rem,calc((100svh-21rem)*4/3))]"
        />

        <div className="-mt-2 w-full max-w-2xl text-center [text-shadow:0_1px_12px_rgb(3_7_18/0.9)]">
          {/* Name (and dates, for stops) of whatever is hovered or tapped. */}
          <p className="min-h-6 text-sm sm:text-base" aria-live="polite">
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

        <AnimatePresence>
          {view === "trips" && selected && (
            <motion.div
              key="trip-card"
              ref={cardSlotRef}
              className="pointer-events-auto mt-4 w-full max-w-lg lg:absolute lg:top-6 lg:left-0 lg:mt-0 lg:flex lg:max-h-[min(46rem,calc(100svh-13.5rem))] lg:w-[28rem] lg:max-w-none"
              // Opacity and a small slide; layout-neutral so the globe can
              // measure the slot straight away.
              initial={{ opacity: 0, x: wide ? -24 : 0, y: wide ? 0 : 16 }}
              animate={{ opacity: 1, x: 0, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }}
              exit={{ opacity: 0, x: wide ? -24 : 0, y: wide ? 0 : 16, transition: { duration: 0.25 } }}
            >
              <TripCard trips={trips} selected={selected} miles={miles[selected.id] ?? null} onSelect={setTripId} />
            </motion.div>
          )}
        </AnimatePresence>
        </div>
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
