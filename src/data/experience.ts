export interface Experience {
  company: string;
  role: string;
  location: string;
  /** "YYYY-MM", inclusive. */
  start: string;
  end: string;
  logo: string;
  href: string;
  highlights: readonly string[];
}

// Newest first.
export const EXPERIENCES: readonly Experience[] = [
  {
    company: "Milwaukee Tool",
    role: "Firmware Engineer",
    location: "Milwaukee, WI",
    start: "2025-05",
    end: "2025-08",
    logo: "/media/experience/milwaukee.webp",
    href: "https://www.milwaukeetool.com/",
    highlights: [
      "Investigated wireless system latency and reliability to inform a replacement architecture",
      "Developed a drop-in RF solution integrated with proprietary code to improve responsiveness",
      "Validated the redesign with testing, achieving 27 times faster performance and higher reliability",
      "Rewrote an LED control API to enable configurable brightness and behavior profiles",
    ],
  },
  {
    company: "Rogers Imaging Corporation",
    role: "Software Engineer",
    location: "Natick, MA",
    start: "2024-05",
    end: "2024-08",
    logo: "/media/experience/rogers.webp",
    href: "https://www.rogersimagingcorp.com/",
    highlights: [
      "Refactored a predictive risk-analysis tool from R to Python, improving performance by ~30 times",
      "Added interactive 3D visualizations and enhanced analytics to better identify high-risk proteins linked to genetic disorders",
    ],
  },
];

const parse = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return { y, m };
};
const label = (ym: string) => {
  const { y, m } = parse(ym);
  return new Date(y, m - 1).toLocaleString("en-US", { month: "short", year: "numeric" });
};

/** "May 2025 – Aug 2025" */
export const dateRange = (e: Experience) => `${label(e.start)} – ${label(e.end)}`;

/** Inclusive month count, e.g. "4 months". */
export function duration(e: Experience): string {
  const a = parse(e.start);
  const b = parse(e.end);
  const months = (b.y - a.y) * 12 + (b.m - a.m) + 1;
  return months === 1 ? "1 month" : `${months} months`;
}
