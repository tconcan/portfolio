import { motion } from "motion/react";
import type { Status } from "../../../data/involvement";
import { EASE } from "../../ui/motion";

/** Logo bubble that sits on the timeline line; pulses for current entries. */
export default function TimelineNode({ logo, status, className = "" }: { logo: string; status: Status; className?: string }) {
  return (
    <motion.div
      className={`relative z-10 flex justify-center pt-1 lg:pt-0 ${className}`}
      initial={{ opacity: 0, scale: 0.6 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.8 }}
      transition={{ duration: 0.6, ease: EASE }}
    >
      {status === "now" && (
        <span
          aria-hidden="true"
          className="absolute inset-0 m-auto size-11 animate-ping rounded-full bg-cyan-400/25 [animation-duration:2.4s] sm:size-14 lg:size-[4.5rem]"
        />
      )}
      <span
        className={`relative grid size-11 place-items-center rounded-full bg-gray-950 p-2 sm:size-14 sm:p-2.5 lg:size-[4.5rem] lg:p-3 ${
          status === "upcoming"
            ? "outline-2 outline-blue-300/60 outline-dashed"
            : status === "now"
              ? "ring-2 ring-cyan-300/70"
              : "ring-2 ring-white/15"
        }`}
      >
        <img src={logo} alt="" loading="lazy" decoding="async" className="max-h-full max-w-full object-contain" />
      </span>
    </motion.div>
  );
}
