import type { Org } from "../../data/projects";

/**
 * Each organization's pill (on cards and in the filters). A near-opaque
 * dark base with tinted text and border, so it stays readable over any
 * card image, bright or dark.
 */
export const ORG_PILL: Record<Org, string> = {
  Purdue: "border-amber-400/60 bg-gray-950/80 text-amber-200",
  "Milwaukee Tool": "border-red-400/60 bg-gray-950/80 text-red-300",
  "es@p": "border-indigo-400/60 bg-gray-950/80 text-indigo-200",
  "Rogers Imaging": "border-emerald-400/60 bg-gray-950/80 text-emerald-200",
  Personal: "border-white/40 bg-gray-950/80 text-gray-100",
  Hackathon: "border-yellow-300/60 bg-gray-950/80 text-yellow-200",
};
