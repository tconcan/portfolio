import { motion } from "motion/react";
import { EASE } from "../../ui/motion";

// Generic swept-wing fighter, top-down, nose up (viewBox 0 0 64 100; the
// nozzle ends at y = 97).
const JET_PATH =
  "M32 0 C33.8 5 35.4 14 35.8 24 L38.4 29 L62 59 L62 64.5 L40 63.5 L39.4 72 L52 84 L52 89 L38.8 88.4 L36 97 L28 97 L25.2 88.4 L12 89 L12 84 L24.6 72 L24 63.5 L2 64.5 L2 59 L25.6 29 L28.2 24 C28.6 14 30.2 5 32 0 Z";

/**
 * Caps the top of the involvement timeline: a fighter jet climbing away with
 * the timeline line as its contrail, right above the Air Force entry.
 * Positioned on the line (same x as the line); the caller reserves its height.
 */
export default function FighterJet({ className = "" }: { className?: string }) {
  return (
    <motion.div
      aria-hidden="true"
      className={`absolute top-0 z-10 -translate-x-1/2 ${className}`}
      // Flies up into place when the timeline scrolls into view.
      initial={{ opacity: 0, y: 70 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 1.4, ease: EASE }}
    >
      {/* Gentle idle drift, like holding altitude. */}
      <motion.div
        className="relative"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Afterburner glow at the nozzle */}
        <motion.span
          className="absolute top-[94%] left-1/2 size-3 -translate-x-1/2 rounded-full bg-cyan-200 blur-[5px] lg:size-4"
          animate={{ opacity: [0.55, 1, 0.7, 0.95, 0.55], scale: [0.9, 1.15, 1, 1.1, 0.9] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Hot contrail just behind the jet, fading into the timeline line */}
        <span className="absolute top-[96%] left-1/2 h-10 w-[3px] -translate-x-1/2 rounded-full bg-gradient-to-b from-white/80 via-purple-300/50 to-transparent blur-[1px] lg:h-14" />

        <svg
          viewBox="0 0 64 100"
          className="relative h-14 w-auto drop-shadow-[0_0_10px_rgb(147_197_253/0.55)] lg:h-[4.75rem]"
        >
          <defs>
            {/* Light nose fading to the purple that starts the timeline line */}
            <linearGradient id="jet-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f1f5f9" />
              <stop offset="60%" stopColor="#c7d2fe" />
              <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
          </defs>
          <path d={JET_PATH} fill="url(#jet-fill)" />
        </svg>
      </motion.div>
    </motion.div>
  );
}
