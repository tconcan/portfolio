import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { formatRange, mergePlaces, plotted, type TripGroup } from "../../data/trip";
import { tripInfo } from "../../data/trips";
import CountUp from "../ui/CountUp";
import { GLASS_CARD, GRADIENT_TEXT } from "../ui/styles";

interface Props {
  trips: TripGroup[];
  selected: TripGroup;
  /** Road miles for the selected trip, once every leg has a route. */
  miles: number | null;
  onSelect: (id: string) => void;
}

const DAY = 86_400_000;

/** Card for the Trips view: trip switcher on top, then the selected trip. */
export default function TripCard({ trips, selected, miles, onSelect }: Props) {
  const index = trips.findIndex((t) => t.id === selected.id);
  const info = tripInfo(selected.id);
  // Keep the selected trip's chip in view in the (scrollable) switcher.
  const activeChip = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    activeChip.current?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [selected.id]);

  const days = selected.start && selected.end ? Math.round((selected.end.getTime() - selected.start.getTime()) / DAY) + 1 : null;
  // Counts use plotted stops only; "None" rows (e.g. flying out from home)
  // add to the dates above but not to the places.
  const shown = selected.stops.filter(plotted);
  const usStates = new Set(shown.filter((s) => /^(usa|us|united states)$/i.test(s.country)).map((s) => s.region)).size;
  const countries = new Set(shown.map((s) => s.country || "USA")).size;
  // Trips through the US count states; trips entirely abroad count countries.
  const inUS = (s: { country: string }) => !s.country || /^(usa|us|united states)$/i.test(s.country);
  const allUS = shown.some(inUS);
  // [label, value, shown while the value isn't known yet]
  const stats: [string, number | null, string][] = [
    ["Days", days, "—"],
    // Unique places: a place visited twice (e.g. home at both ends) counts once.
    ["Stops", mergePlaces(shown).length, "—"],
    ["Miles", miles, "…"],
    allUS ? ["States", usStates, "—"] : ["Countries", countries, "—"],
  ];
  if (info.hideMiles) stats.splice(2, 1);

  const step = (dir: -1 | 1) => {
    const next = trips[(index + dir + trips.length) % trips.length];
    if (next) onSelect(next.id);
  };

  return (
    <div className={`${GLASS_CARD} flex max-h-full flex-col overflow-hidden text-left`}>
      {/* Trip switcher: every trip in the sheet, newest first, styled like
          the view tabs above (one pill track, gradient highlight). */}
      <div className="flex items-center gap-1.5 border-b border-white/10 px-2.5 py-3 sm:gap-2 sm:px-4">
        <ArrowButton label="Previous trip" disabled={trips.length < 2} onClick={() => step(-1)} dir={-1} />
        <div
          className="flex min-w-0 flex-1 overflow-x-auto rounded-full border border-white/10 bg-gray-900/60 p-0.5 [scrollbar-width:none] sm:p-1"
          role="tablist"
          aria-label="Trips"
        >
          {trips.map((t) => {
            const active = t.id === selected.id;
            return (
              <button
                key={t.id}
                ref={active ? activeChip : undefined}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSelect(t.id)}
                className={`relative min-w-0 flex-1 shrink-0 basis-auto rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors sm:px-4 sm:py-1.5 sm:text-sm ${
                  active ? "text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="trip-chip"
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-plum/80 via-blue-500/70 to-cyan-500/70 shadow-[0_0_18px_rgb(96_165_250/0.35)]"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative">{tripInfo(t.id).title}</span>
              </button>
            );
          })}
          {trips.length < 2 && (
            <span className="flex-1 shrink-0 basis-auto px-3 py-1 text-center text-xs whitespace-nowrap text-gray-500 sm:px-4 sm:py-1.5 sm:text-sm">
              More soon
            </span>
          )}
        </div>
        <ArrowButton label="Next trip" disabled={trips.length < 2} onClick={() => step(1)} dir={1} />
      </div>

      {/* Selected trip; re-animates when the trip changes. */}
      <motion.div
        key={selected.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="min-h-0 overflow-y-auto px-5 pt-5 pb-6 sm:px-7"
      >
        {/* Name, then dates, then the write-up. */}
        <h2 className={`text-3xl font-bold tracking-tight sm:text-4xl ${GRADIENT_TEXT}`}>{info.title}</h2>
        <p className="mt-1.5 text-sm font-medium tracking-wide text-gray-400">
          {formatRange(selected.start, selected.end)}
        </p>
        {info.summary && <p className="mt-4 text-[0.95rem] leading-relaxed text-gray-300 sm:text-base">{info.summary}</p>}

        <dl className={`mt-5 grid ${stats.length === 3 ? "grid-cols-3" : "grid-cols-4"} gap-2 sm:gap-3`}>
          {stats.map(([label, value, pending]) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/5 px-2 py-2.5 text-center sm:py-3">
              <dd className="text-lg font-semibold text-white tabular-nums sm:text-xl">{value ? <CountUp value={value} /> : pending}</dd>
              <dt className="text-[0.65rem] tracking-wide text-gray-400 uppercase sm:text-xs">{label}</dt>
            </div>
          ))}
        </dl>

        {info.highlights.length > 0 && (
          <>
            <h3 className="mt-5 text-xs font-semibold tracking-[0.15em] text-gray-400 uppercase">Highlights</h3>
            <ul className="mt-2 space-y-1.5">
              {info.highlights.map((h) => (
                <li key={h} className="flex gap-2.5 text-[0.95rem] text-gray-200 sm:text-base">
                  <span aria-hidden="true" className="mt-[0.45em] size-1.5 shrink-0 rounded-full bg-gradient-to-br from-purple-400 to-cyan-300" />
                  {h}
                </li>
              ))}
            </ul>
          </>
        )}
      </motion.div>
    </div>
  );
}

function ArrowButton({ label, disabled, onClick, dir }: { label: string; disabled: boolean; onClick: () => void; dir: -1 | 1 }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-7 shrink-0 place-items-center rounded-full text-gray-300 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
    >
      <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
        <path d={dir < 0 ? "M10 3 5 8l5 5" : "M6 3l5 5-5 5"} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
