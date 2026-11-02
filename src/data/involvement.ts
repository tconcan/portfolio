export interface OrgLogo {
  name: string;
  image: string;
  href: string;
}

export interface InvolvementLink {
  label: string;
  href: string;
}

export interface Involvement {
  org: string;
  role: string;
  logo: string;
  /** "YYYY-MM". Status (upcoming / now / past) is derived from these at runtime. */
  start: string;
  /** "YYYY-MM", or omitted for ongoing / not yet started. */
  end?: string;
  summary: string;
  highlights: readonly string[];
  links: readonly InvolvementLink[];
  photo?: {
    src: string;
    alt: string;
    width: number;
    height: number;
    /** CSS aspect-ratio of the crop, e.g. "4 / 3". Defaults to a wide "21 / 9" banner. */
    aspect?: string;
    /** CSS object-position: which part of the photo stays in the crop. Defaults to centre. */
    focus?: string;
  };
  /**
   * Keep the logo on the timeline but hide everything else: no card, dates,
   * status, or links.
   */
  hidden?: boolean;
}

const IMG = "/media/involvement";

// Every organization, for the scrolling logo strip.
export const ORG_LOGOS: readonly OrgLogo[] = [
  { name: "Needham High Rockets", image: `${IMG}/rocket.webp`, href: "https://www.needhamma.gov/" },
  { name: "Hearth Pizzeria", image: `${IMG}/hearth.webp`, href: "https://hearthpizzeria.com/" },
  { name: "Purdue University", image: `${IMG}/purdue.webp`, href: "https://www.purdue.edu" },
  { name: "Sigma Nu", image: `${IMG}/snu.webp`, href: "https://www.sigmanu.org/" },
  { name: "Academic Success Center", image: `${IMG}/asc.webp`, href: "https://www.purdue.edu/asc/" },
  { name: "Embedded Systems @ Purdue", image: `${IMG}/esap1.webp`, href: "https://embedded-purdue.github.io/" },
  { name: "Eta Kappa Nu", image: `${IMG}/hkn.webp`, href: "https://hkn.ieee.org/" },
  { name: "Roma Tom", image: `${IMG}/romatom.webp`, href: "https://romatom.com/" },
  { name: "United States Air Force", image: `${IMG}/usaf.webp`, href: "https://www.airforce.com/" },
];

// Timeline entries. Order doesn't matter: the timeline sorts them newest first.
export const INVOLVEMENTS: readonly Involvement[] = [
  {
    org: "United States Air Force",
    role: "Second Lieutenant · Developmental Engineer",
    logo: `${IMG}/usaf.webp`,
    start: "2027-01",
    summary:
      "Next up: commissioning as a Second Lieutenant through Officer Training School, then serving as a Computer Systems Developmental Engineer (62EC), bringing my computer engineering background to the Air Force's systems.",
    highlights: ["62EC", "Officer Training School", "Computer Systems"],
    links: [
      { label: "Officer Training School", href: "https://www.airforce.com/training/military-training/ots" },
      { label: "airforce.com", href: "https://www.airforce.com/" },
    ],
  },
  {
    org: "Embedded Systems @ Purdue",
    role: "Co-Founder · President",
    logo: `${IMG}/esap1.webp`,
    start: "2025-01",
    end: "2026-05",
    summary:
      "Co-founded Purdue's student organization for embedded systems and blew it up to over 100 memebers. As president I organized hands-on workshops and industry speaker events, and managed other club leadership.",
    highlights: ["Workshops", "Speaker Events", "Technical Projects"],
    links: [{ label: "Visit es@p", href: "https://embedded-purdue.github.io/" }],
    photo: { src: `${IMG}/esap-team.webp`, alt: "Embedded Systems @ Purdue members at an event", width: 480, height: 320 },
  },
  {
    org: "Guo Lab @ Purdue ECE",
    role: "Undergraduate Researcher",
    logo: `${IMG}/guo.webp`,
    start: "2023-09",
    end: "2025-05",
    summary:
      "Research in Prof. Qi Guo's visual sensing lab, where optics, electronics, and algorithms are designed together. I worked on two projects: AD Ray-Optics, a fast, stable framework for differentiable ray tracing through multi-layer optics, and Focal Split, a handheld depth camera running entirely on a Raspberry Pi 5 that was accepted to CVPR 2025.",
    highlights: ["CVPR 2025", "Computer Vision", "Differentiable Optics"],
    links: [
      {
        label: "Focal Split paper",
        href: "https://openaccess.thecvf.com/content/CVPR2025/html/Luo_Focal_Split_Untethered_Snapshot_Depth_from_Differential_Defocus_CVPR_2025_paper.html",
      },
      { label: "AD Ray-Optics code", href: "https://github.com/guo-research-group/AD-Ray-Optics" },
      { label: "Guo Lab", href: "https://qiguo.org/" },
    ],
  },
  {
    org: "Academic Success Center",
    role: "Supplemental Instruction Leader",
    logo: `${IMG}/asc.webp`,
    start: "2024-08",
    end: "2025-12",
    summary:
      "Ran twice-weekly peer study sessions and exam reviews for Purdue's introductory electrical engineering courses. Having already passed those courses, my job wasn't to lecture but to get students working through problems together.",
    highlights: ["ECE 2K2", "ECE 270", "Facilitation", "Peer Mentoring"],
    links: [
      { label: "Supplemental Instruction", href: "https://www.purdue.edu/asc/si/index.html" },
      { label: "Academic Success Center", href: "https://www.purdue.edu/asc/" },
    ],
    photo: {
      src: `${IMG}/asc-supplemental-instruction.webp`,
      alt: "Tom leading a Supplemental Instruction session as students raise their hands",
      width: 734,
      height: 274,
      focus: "62% 40%",
    },
  },
  {
    org: "Purdue University",
    role: "B.S. Computer Engineering",
    logo: `${IMG}/purdue.webp`,
    start: "2022-08",
    end: "2026-05",
    summary:
      "Graduated with a 3.98 GPA. Coursework ran from microelectronics and semiconductors up through computer systems and software engineering, and student organizations filled in everything a classroom couldn't.",
    highlights: ["3.98 GPA", "High Distinction", "Computer Systems", "SWE", "Microelectronics"],
    links: [
      { label: "Purdue ECE", href: "https://engineering.purdue.edu/ECE" },
      { label: "purdue.edu", href: "https://www.purdue.edu" },
    ],
    photo: {
      src: `${IMG}/purdue-graduation.webp`,
      alt: "Tom in cap and gown holding his Purdue diploma, in front of an American flag",
      width: 800,
      height: 796,
      aspect: "4 / 3",
      focus: "50% 28%",
    },
  },
];

// ---- Date helpers -----------------------------------------------------------

export type Status = "upcoming" | "now" | "past";

const toMonths = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return y * 12 + (m - 1);
};
const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1).toLocaleString("en-US", { month: "short", year: "numeric" });
};

/** Newest start date first. */
export function byNewest(a: Involvement, b: Involvement): number {
  return toMonths(b.start) - toMonths(a.start);
}

export function statusOf(item: Involvement, today = new Date()): Status {
  const now = today.getFullYear() * 12 + today.getMonth();
  if (toMonths(item.start) > now) return "upcoming";
  if (!item.end || toMonths(item.end) >= now) return "now";
  return "past";
}

/** e.g. "Aug 2024 – Dec 2025", "Oct 2026 – Present", "Starting Jan 2027". */
export function dateRange(item: Involvement, status: Status): string {
  if (status === "upcoming") return `Starting ${monthLabel(item.start)}`;
  return `${monthLabel(item.start)} – ${item.end && status === "past" ? monthLabel(item.end) : "Present"}`;
}

/** Short year span for the timeline's side label, e.g. "2024 – 2025", "2026 – Now". */
export function yearSpan(item: Involvement, status: Status): string {
  const from = item.start.slice(0, 4);
  if (status === "upcoming") return from;
  const to = status === "now" ? "Now" : item.end!.slice(0, 4);
  return from === to ? from : `${from} – ${to}`;
}
