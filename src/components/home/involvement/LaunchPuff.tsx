import { motion } from "motion/react";
import { EASE } from "../../ui/motion";

// Flat vector launch cloud in the same style as the jet (FighterJet.tsx):
// one crisp silhouette, the jet's light → indigo → violet gradient and its
// blue glow. A ring of billows around an open centre, in perspective.
// viewBox 0 0 160 80, centred on (80, 40); the trail runs into the hole.
const CX = 80;
const CY = 40;
const RX = 52; // ring radius across
const RY = 18; // ring radius in depth: flattened, as if seen from above at an angle
const RING = 14;
// A ring of billows around an open centre, like a launch shockwave on the
// ground. Front puffs (bottom) are larger than back ones for depth.
const BILLOWS = Array.from({ length: RING }, (_, i) => {
  const a = (i / RING) * Math.PI * 2;
  const depth = (Math.sin(a) + 1) / 2; // 0 = back, 1 = front
  const r = (i % 2 ? 11 : 12.5) * (0.75 + depth * 0.45);
  return { cx: CX + Math.cos(a) * RX, cy: CY + Math.sin(a) * RY, r, depth, dur: 3.4 + (i % 3) * 0.4, delay: i * 0.22 };
}).sort((a, b) => a.depth - b.depth); // paint back to front

// Small puffs that break off and drift outward along the ground plane.
const DRIFTERS = Array.from({ length: 6 }, (_, i) => {
  const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
  return {
    cx: CX + Math.cos(a) * (RX + 16),
    cy: CY + Math.sin(a) * (RY + 7),
    r: 4 + ((Math.sin(a) + 1) / 2) * 2,
    dx: Math.cos(a) * 22,
    dy: Math.sin(a) * 8,
    delay: i * 0.55,
  };
});

/**
 * Launch cloud at the bottom (oldest) end of the timeline: the line is the
 * jet's trail, and this is where it took off. The caller positions it on the
 * line's x at the line's end; the cloud hangs below that point.
 */
export default function LaunchPuff({ className = "" }: { className?: string }) {
  return (
    <motion.div
      aria-hidden="true"
      className={`pointer-events-none absolute top-full -translate-x-1/2 ${className}`}
      initial={{ opacity: 0, scale: 0.5, y: -10 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 1.1, ease: EASE }}
      style={{ transformOrigin: "50% 0%" }}
    >
      {/* Overlap the line's end so the trail flows straight into the cloud. */}
      <div className="relative -translate-y-1/2 w-32 sm:w-40">
        <svg viewBox="0 0 160 80" className="block w-full overflow-visible drop-shadow-[0_0_10px_rgb(147_197_253/0.55)]">
          <defs>
            {/* Same stops as the jet's fill; userSpaceOnUse keeps the
                overlapping circles reading as one seamless shape. */}
            <linearGradient id="puff-fill" gradientUnits="userSpaceOnUse" x1="0" y1="14" x2="0" y2="68">
              <stop offset="0%" stopColor="#f1f5f9" />
              <stop offset="60%" stopColor="#c7d2fe" />
              <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
          </defs>

          <g fill="url(#puff-fill)">
            {BILLOWS.map((b, i) => (
              <motion.circle
                key={i}
                cx={b.cx}
                cy={b.cy}
                initial={{ r: b.r }}
                // Each billow swells and settles on its own rhythm so the
                // silhouette churns instead of pulsing in sync.
                animate={{ r: [b.r, b.r * 1.08, b.r * 0.97, b.r] }}
                transition={{ duration: b.dur, delay: b.delay, repeat: Infinity, ease: "easeInOut" }}
              />
            ))}
            {DRIFTERS.map((d, i) => (
              <motion.circle
                key={`d${i}`}
                cx={d.cx}
                cy={d.cy}
                r={d.r}
                animate={{ x: [0, d.dx], y: [0, d.dy], opacity: [0, 0.9, 0], scale: [0.6, 1, 0.5] }}
                transition={{ duration: 3.2, delay: d.delay, repeat: Infinity, ease: "easeOut" }}
              />
            ))}
          </g>
        </svg>

        {/* Afterburner glow where the trail enters, matching the jet's. */}
        <motion.span
          className="absolute top-1/2 left-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-200 blur-[5px] sm:size-4"
          animate={{ opacity: [0.55, 1, 0.7, 0.95, 0.55], scale: [0.9, 1.15, 1, 1.1, 0.9] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </motion.div>
  );
}
