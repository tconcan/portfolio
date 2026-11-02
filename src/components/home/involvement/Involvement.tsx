import { useRef, type ReactNode } from "react";
import { motion, useScroll, useSpring, type Variants } from "motion/react";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { byNewest, INVOLVEMENTS, statusOf, yearSpan, type Involvement as Item } from "../../../data/involvement";
import { EASE, EXIT_EASE, rise } from "../../ui/motion";
import { GLASS_CARD, GRADIENT_TEXT } from "../../ui/styles";
import EntryBody from "./EntryBody";
import FighterJet from "./FighterJet";
import LaunchPuff from "./LaunchPuff";
import LogoMarquee from "./LogoMarquee";
import TimelineNode from "./TimelineNode";

const section: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
  exit: { opacity: 0, transition: { duration: 0.35, ease: EXIT_EASE } },
};

/** Timeline stops, newest first. Single cards alternate left/right on desktop. */
function buildStops(): ReactNode[] {
  let side = 0;
  return [...INVOLVEMENTS].sort(byNewest).map((item) =>
    // Hidden entries show only their logo and don't take a left/right slot.
    item.hidden ? <HiddenEntry key={item.org} item={item} /> : <TimelineEntry key={item.org} item={item} flip={side++ % 2 === 1} />,
  );
}

export default function Involvement() {
  const timelineRef = useRef<HTMLOListElement>(null);
  // The timeline's gradient line fills in as you scroll down through it.
  const { scrollYProgress } = useScroll({ target: timelineRef, offset: ["start 75%", "end 60%"] });
  const fill = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });

  return (
    <motion.section
      id="involvement"
      aria-labelledby="involvement-title"
      className="scroll-mt-14 overflow-x-clip py-16 sm:scroll-mt-16 sm:py-20 md:py-24"
      initial="hidden"
      whileInView="show"
      exit="exit"
      viewport={{ once: true, amount: 0.05 }}
      variants={section}
    >
      <motion.header variants={rise} className="mb-8 px-4 text-center sm:mb-10">
        <p className={`mb-3 text-sm font-semibold tracking-[0.2em] uppercase ${GRADIENT_TEXT}`}>Where I've been</p>
        <h2 id="involvement-title" className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Involvement
        </h2>
      </motion.header>

      <motion.div variants={rise}>
        <LogoMarquee />
      </motion.div>

      <div className="mx-auto mt-12 max-w-6xl px-3 sm:mt-16 sm:px-6 2xl:max-w-7xl">
        <div className="relative">
          {/* A jet caps the line, climbing away above the Air Force entry; the
              line below it is its contrail. */}
          <FighterJet className="left-[1.375rem] sm:left-7 lg:left-1/2" />

          {/* Track + animated fill. Sits under the logo nodes: centre of the
              first column on phones, centre of the page on desktop. Starts at
              the jet's nozzle. */}
          <div aria-hidden="true" className="absolute top-[3.3rem] bottom-0 left-[1.375rem] w-px -translate-x-1/2 bg-white/10 sm:left-7 lg:top-[4.5rem] lg:left-1/2">
            <motion.div
              style={{ scaleY: fill }}
              className="h-full w-full origin-top bg-gradient-to-b from-purple-500 via-blue-400 to-cyan-300 shadow-[0_0_12px_rgb(96_165_250/0.6)]"
            />
          </div>

          {/* Top padding reserves room for the jet; bottom padding runs the
              line past the oldest entry down to the launch smoke. */}
          <ol ref={timelineRef} className="relative space-y-10 pt-24 pb-20 lg:space-y-6 lg:pt-28 lg:pb-24">
            {buildStops()}
          </ol>

          {/* Where the jet's trail began: launch smoke at the oldest end. */}
          <LaunchPuff className="left-[1.375rem] sm:left-7 lg:left-1/2" />
        </div>
      </div>
    </motion.section>
  );
}

/** A `hidden` entry: just its logo on the line, with nothing that reveals details. */
function HiddenEntry({ item }: { item: Item }) {
  return (
    <li className="relative grid grid-cols-[2.75rem_1fr] gap-2.5 sm:grid-cols-[3.5rem_1fr] sm:gap-5 lg:grid-cols-[1fr_4.5rem_1fr] lg:gap-8">
      {/* "past" styling: no "now" pulse or "upcoming" dashes that would hint at its dates. */}
      <TimelineNode logo={item.logo} status="past" className="col-start-1 row-start-1 lg:col-start-2" />
    </li>
  );
}

/**
 * One stop on the timeline. Phones: logo node on the left, card to the right.
 * Desktop: cards alternate sides of a central line, with a big year span
 * filling the opposite side.
 */
function TimelineEntry({ item, flip }: { item: Item; flip: boolean }) {
  const status = statusOf(item);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  // Desktop cards glide in from their own side; phones always from the right.
  const fromX = isDesktop ? (flip ? 48 : -48) : 32;

  return (
    <li className="relative grid grid-cols-[2.75rem_1fr] items-start gap-2.5 sm:grid-cols-[3.5rem_1fr] sm:gap-5 lg:grid-cols-[1fr_4.5rem_1fr] lg:items-center lg:gap-8">
      <TimelineNode logo={item.logo} status={status} className="col-start-1 row-start-1 lg:col-start-2" />

      {/* Side label (desktop only) */}
      <motion.p
        aria-hidden="true"
        className={`row-start-1 hidden text-5xl font-bold tracking-tight text-white/15 lg:block ${
          flip ? "lg:col-start-1 lg:text-right" : "lg:col-start-3"
        }`}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.8 }}
        transition={{ duration: 1, ease: EASE, delay: 0.2 }}
      >
        {yearSpan(item, status)}
      </motion.p>

      <motion.article
        className={`${GLASS_CARD} col-start-2 row-start-1 flex flex-col overflow-hidden p-4 sm:p-6 lg:p-7 ${flip ? "lg:col-start-3" : "lg:col-start-1"}`}
        initial={{ opacity: 0, x: fromX, filter: "blur(8px)" }}
        whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.9, ease: EASE }}
      >
        <EntryBody item={item} status={status} />
      </motion.article>
    </li>
  );
}
