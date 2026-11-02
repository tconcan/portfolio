import { motion } from "motion/react";
import { CONTINENTS, continentOf, STATE_TILES } from "../../data/geo";
import { mergePlaces, plotted, type Stop } from "../../data/trip";
import { VIEW_INFO } from "../../data/trips";
import CountUp from "../ui/CountUp";
import { GLASS_CARD, GRADIENT_TEXT } from "../ui/styles";

interface Props {
  view: "us" | "world";
  /** Every placed row in the sheet (trips and standalone places). */
  stops: Stop[];
}

const isUS = (s: Stop) => !s.country || /^(usa|us|united states)$/i.test(s.country.trim());
/** US national parks: any place with "National Park" in its name. */
const isPark = (s: Stop) => /\bnational parks?\b/i.test(s.name);
/** Official US national parks. */
const PARK_COUNT = 63;
const countryOf = (s: Stop) => (isUS(s) ? "United States" : s.country.trim());

/** UN members plus the two observer states (Vatican City, Palestine). */
const COUNTRY_COUNT = 195;
const STATE_CODES = new Set(STATE_TILES.map(([code]) => code));
const LIT = "bg-gradient-to-br from-purple-500/80 via-blue-500/80 to-cyan-400/80 text-white shadow-[0_0_12px_rgb(96_165_250/0.35)]";
const UNLIT = "bg-white/5 text-gray-500";

/** One headline number, optionally "of" a total with a progress bar. */
function Stat({ label, value, of }: { label: string; value: number; of?: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-4 text-center">
      <dd className="text-4xl font-semibold text-white tabular-nums">
        <CountUp value={value} />
        {of != null && <span className="text-xl font-medium text-gray-500"> / {of}</span>}
      </dd>
      <dt className="mt-1 text-xs tracking-wide text-gray-400 uppercase">{label}</dt>
      {of != null && (
        <div className="mx-auto mt-3 h-1 w-4/5 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-300"
            initial={{ width: 0 }}
            animate={{ width: `${(value / of) * 100}%` }}
            transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Card for the United States / World views: coverage at a glance.
 * United States: states (with a tile map) and parks visited.
 * World: countries visited, and continents (with one chip per continent).
 */
export default function RegionCard({ view, stops }: Props) {
  const shown = stops.filter(plotted);
  const us = shown.filter(isUS);

  const states = new Set(us.map((s) => s.region.trim().toUpperCase()).filter((c) => STATE_CODES.has(c)));
  const countries = new Set(shown.map(countryOf));
  const continents = new Set([...countries].map((c) => continentOf(c)).filter(Boolean));

  return (
    <div className={`${GLASS_CARD} overflow-hidden text-left`}>
      <motion.div
        key={view}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="px-5 pt-5 pb-6 sm:px-7"
      >
        <h2 className={`text-3xl font-bold tracking-tight sm:text-4xl ${GRADIENT_TEXT}`}>{VIEW_INFO[view].title}</h2>

        {view === "us" ? (
          <>
            <dl className="mt-5 grid grid-cols-2 gap-3">
              <Stat label="States visited" value={states.size} of={50} />
              <Stat label="National parks" value={mergePlaces(us.filter(isPark)).length} of={PARK_COUNT} />
            </dl>
            {/* Tile map of the 50 states, visited ones lit. */}
            <div
              role="img"
              aria-label={`States visited: ${[...states].sort().join(", ")}`}
              className="mt-5 grid grid-cols-11 gap-1"
            >
              {STATE_TILES.map(([code, col, row]) => (
                <div
                  key={code}
                  style={{ gridColumn: col + 1, gridRow: row + 1 }}
                  className={`flex aspect-square items-center justify-center rounded-[0.3rem] text-[0.55rem] font-semibold sm:text-[0.65rem] ${states.has(code) ? LIT : UNLIT}`}
                >
                  {code}
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <dl className="mt-5 grid grid-cols-2 gap-3">
              <Stat label="Countries visited" value={countries.size} of={COUNTRY_COUNT} />
              <Stat label="Continents" value={continents.size} of={CONTINENTS.length} />
            </dl>
            {/* One chip per continent, visited ones lit. */}
            <ul className="mt-5 flex flex-wrap justify-center gap-1.5" aria-label="Continents">
              {CONTINENTS.map((c) => (
                <li
                  key={c}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${continents.has(c) ? LIT : UNLIT}`}
                >
                  {c}
                  <span className="sr-only">{continents.has(c) ? " (visited)" : " (not yet)"}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </motion.div>
    </div>
  );
}
