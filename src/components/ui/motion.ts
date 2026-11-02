import type { Variants } from "motion/react";

/** Long, soft deceleration used for everything entering. */
export const EASE = [0.16, 1, 0.3, 1] as const;
/** Quick acceleration used for everything leaving. */
export const EXIT_EASE = [0.7, 0, 0.84, 0] as const;

/** Rise into place while coming into focus; lift and blur away on exit. */
export const rise: Variants = {
  hidden: { opacity: 0, y: 28, filter: "blur(10px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.9, ease: EASE } },
  exit: { opacity: 0, y: -24, filter: "blur(8px)", transition: { duration: 0.35, ease: EXIT_EASE } },
};
