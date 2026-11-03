import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { SORTS, type Option, type Sort, type TechMatch } from "../../data/projectQuery";
import type { Org } from "../../data/projects";
import { ChevronDownIcon, FilterIcon } from "../layout/icons";
import { EASE } from "../ui/motion";
import { GLASS_CARD } from "../ui/styles";
import { ORG_PILL } from "./orgStyles";

const TRACK = "relative flex rounded-full border border-white/10 bg-gray-900/60 p-0.5 backdrop-blur-md pointer-coarse:bg-gray-900/85 pointer-coarse:backdrop-blur-none sm:p-1";
const HIGHLIGHT =
  "absolute inset-0 rounded-full bg-gradient-to-r from-plum/80 via-blue-500/70 to-cyan-500/70 shadow-[0_0_18px_rgb(96_165_250/0.35)]";
const GROUP_LABEL = "text-xs font-semibold tracking-[0.15em] text-gray-400 uppercase";
const IDLE_CHIP = "border-white/15 text-gray-300 hover:border-white/30 hover:text-white";
const TECH_ON = "border-purple-300/60 bg-purple-500/35 text-white";

/** Pill track with a sliding gradient highlight, like the Travel tabs. */
function Segmented<T extends string>({
  id,
  label,
  options,
  value,
  onChange,
  small,
}: {
  id: string;
  label: string;
  options: readonly [T, string][];
  value: T;
  onChange: (v: T) => void;
  small?: boolean;
}) {
  return (
    <div role="group" aria-label={label} className={TRACK}>
      {options.map(([v, text]) => {
        const active = v === value;
        return (
          <button
            key={v}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(v)}
            className={`relative rounded-full font-medium transition-colors ${
              small ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-xs sm:px-4 sm:py-1.5 sm:text-sm"
            } ${active ? "text-white" : "text-gray-400 hover:text-white"}`}
          >
            {active && <motion.span layoutId={id} className={HIGHLIGHT} transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
            <span className="relative">{text}</span>
          </button>
        );
      })}
    </div>
  );
}

function Chip({ active, onClick, className, children }: { active: boolean; onClick: () => void; className: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors sm:text-sm ${className}`}
    >
      {children}
    </button>
  );
}

interface Props {
  sort: Sort;
  onSort: (s: Sort) => void;
  open: boolean;
  onToggleOpen: () => void;
  activeCount: number;
  shown: number;
  total: number;
  onClear: () => void;
  orgs: readonly Option[];
  tech: readonly Option[];
  pickedOrgs: readonly string[];
  pickedTech: readonly string[];
  match: TechMatch;
  onToggleOrg: (o: string) => void;
  onToggleTech: (t: string) => void;
  onMatch: (m: TechMatch) => void;
}

const PANEL_ID = "project-filters";

/** Sort tabs, filter toggle and count, and the (collapsible) filter panel. */
export default function ProjectControls(p: Props) {
  const lit = p.open || p.activeCount > 0;
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Segmented id="project-sort" label="Sort projects" options={Object.entries(SORTS) as [Sort, string][]} value={p.sort} onChange={p.onSort} />
          <button
            type="button"
            onClick={p.onToggleOpen}
            aria-expanded={p.open}
            aria-controls={PANEL_ID}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur-md pointer-coarse:backdrop-blur-none transition-colors sm:px-4 sm:py-2 sm:text-sm ${
              lit ? "border-purple-300/50 bg-purple-500/20 text-white" : "border-white/10 bg-gray-900/60 text-gray-300 hover:text-white pointer-coarse:bg-gray-900/85"
            }`}
          >
            <FilterIcon className="size-4" />
            Filter
            {p.activeCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-purple-500 px-1.5 text-xs text-white">{p.activeCount}</span>
            )}
            <ChevronDownIcon className={`size-4 transition-transform duration-300 ${p.open ? "rotate-180" : ""}`} />
          </button>
        </div>

        <p className="text-sm text-gray-400" aria-live="polite">
          Showing {p.shown} of {p.total}
          {p.activeCount > 0 && (
            <>
              {" · "}
              <button type="button" onClick={p.onClear} className="font-medium text-blue-200 hover:text-white">
                Clear filters
              </button>
            </>
          )}
        </p>
      </div>

      <AnimatePresence initial={false}>
        {p.open && (
          <motion.div
            id={PANEL_ID}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="overflow-hidden"
          >
            <div className={`${GLASS_CARD} mt-4 space-y-5 p-5 sm:p-6`}>
              <div role="group" aria-labelledby="filter-org">
                <p id="filter-org" className={`${GROUP_LABEL} mb-3`}>
                  Organization
                </p>
                <div className="flex flex-wrap gap-2">
                  {p.orgs.map(({ value, count }) => {
                    const on = p.pickedOrgs.includes(value);
                    return (
                      <Chip key={value} active={on} onClick={() => p.onToggleOrg(value)} className={on ? ORG_PILL[value as Org] : IDLE_CHIP}>
                        {value}
                        <span className={on ? "opacity-70" : "text-gray-500"}>{count}</span>
                      </Chip>
                    );
                  })}
                </div>
              </div>

              <div role="group" aria-labelledby="filter-tech">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p id="filter-tech" className={GROUP_LABEL}>
                    Technology
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>Match</span>
                    <Segmented
                      id="tech-match"
                      label="Technology match mode"
                      options={[
                        ["all", "All"],
                        ["any", "Any"],
                      ]}
                      value={p.match}
                      onChange={p.onMatch}
                      small
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {p.tech.map(({ value, count }) => {
                    const on = p.pickedTech.includes(value);
                    return (
                      <Chip key={value} active={on} onClick={() => p.onToggleTech(value)} className={on ? TECH_ON : IDLE_CHIP}>
                        {value}
                        <span className={on ? "opacity-70" : "text-gray-500"}>{count}</span>
                      </Chip>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
