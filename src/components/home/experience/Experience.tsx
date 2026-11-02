import type { PointerEvent, ReactNode } from "react";
import { motion, type Variants } from "motion/react";
import { dateRange, duration, EXPERIENCES, type Experience as Job } from "../../../data/experience";
import { ExternalLinkIcon } from "../../layout/icons";
import { EASE, EXIT_EASE, rise } from "../../ui/motion";
import { GLASS_CARD, GRADIENT_TEXT } from "../../ui/styles";

const section: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
  exit: { opacity: 0, transition: { duration: 0.35, ease: EXIT_EASE } },
};

const card: Variants = {
  hidden: { opacity: 0, y: 48, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.9, ease: EASE, when: "beforeChildren", staggerChildren: 0.09 },
  },
};
const bullet: Variants = {
  hidden: { opacity: 0, x: 16 },
  show: { opacity: 1, x: 0, transition: { duration: 0.6, ease: EASE } },
};

export default function Experience() {
  return (
    <motion.section
      id="experience"
      aria-labelledby="experience-title"
      className="scroll-mt-14 overflow-x-clip px-3 py-16 sm:scroll-mt-16 sm:px-6 sm:py-20 md:py-24"
      initial="hidden"
      whileInView="show"
      exit="exit"
      viewport={{ once: true, amount: 0.1 }}
      variants={section}
    >
      <div className="mx-auto max-w-6xl">
        <motion.header variants={rise} className="mb-10 text-center md:mb-14">
          <p className={`mb-3 text-sm font-semibold tracking-[0.2em] uppercase ${GRADIENT_TEXT}`}>Where I've worked</p>
          <h2 id="experience-title" className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Professional Experience
          </h2>
        </motion.header>

        <div className="space-y-6 md:space-y-8">
          {EXPERIENCES.map((job) => (
            <JobCard key={job.company} job={job} />
          ))}
        </div>
      </div>
    </motion.section>
  );
}

/** Track the pointer so the card's spotlight glow can follow it (CSS vars, no re-render). */
function followPointer(e: PointerEvent<HTMLElement>) {
  if (e.pointerType !== "mouse") return;
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty("--spot-x", `${e.clientX - r.left}px`);
  el.style.setProperty("--spot-y", `${e.clientY - r.top}px`);
}

function JobCard({ job }: { job: Job }) {
  return (
    <motion.article
      variants={card}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.25 }}
      onPointerMove={followPointer}
      className={`${GLASS_CARD} group/card relative overflow-hidden`}
    >
      {/* Cursor spotlight (desktop): a soft blue glow under the pointer. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover/card:opacity-100"
        style={{
          background: "radial-gradient(520px circle at var(--spot-x, 50%) var(--spot-y, 50%), rgb(96 165 250 / 0.13), transparent 45%)",
        }}
      />

      <div className="relative grid gap-6 p-5 sm:p-7 md:grid-cols-[17rem_1fr] md:gap-10 md:p-10">
        {/* Company column */}
        <div className="flex items-center gap-4 md:flex-col md:items-start md:gap-5 md:border-r md:border-white/10 md:pr-10">
          <a
            href={job.href}
            target="_blank"
            rel="noopener noreferrer"
            title={job.company}
            className="grid size-16 shrink-0 place-items-center rounded-2xl bg-white p-2 shadow-lg shadow-black/30 ring-1 ring-white/20 transition-transform duration-300 hover:scale-105 sm:size-20 md:size-28 md:p-3"
          >
            <img src={job.logo} alt={job.company} loading="lazy" decoding="async" className="max-h-full max-w-full object-contain" />
          </a>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-white sm:text-xl">{job.company}</p>
            <p className="mt-1 text-sm text-gray-400">{job.location}</p>
            <p className="mt-0.5 text-sm text-gray-400">
              <time>{dateRange(job)}</time>
            </p>
            <span className="mt-2 inline-block rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-gray-300">
              {duration(job)}
            </span>
          </div>
        </div>

        {/* Role + what I did */}
        <div>
          <h3 className={`text-2xl font-bold sm:text-3xl ${GRADIENT_TEXT}`}>{job.role}</h3>
          <ul className="mt-5 space-y-3.5">
            {job.highlights.map((point) => (
              <motion.li key={point} variants={bullet} className="flex gap-3 text-[0.975rem] leading-relaxed text-gray-300 sm:text-lg">
                <ChevronMark />
                <span>{emphasizeNumbers(point)}</span>
              </motion.li>
            ))}
          </ul>
          <a
            href={job.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group/link -ml-3 mt-6 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-blue-200 transition-colors hover:bg-white/10 hover:text-white"
          >
            {job.company.replace(/ Corporation$/, "")}
            <ExternalLinkIcon className="size-3.5 transition-transform duration-300 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
          </a>
        </div>
      </div>
    </motion.article>
  );
}

/** Small gradient chevron used as the bullet marker. */
function ChevronMark() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="mt-[0.35em] size-4 shrink-0">
      <defs>
        <linearGradient id="chev" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#67e8f9" />
        </linearGradient>
      </defs>
      <path d="M5 3l5 5-5 5" fill="none" stroke="url(#chev)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Wrap results like "27 times" / "~30 times" in gradient text; the wording itself is unchanged. */
function emphasizeNumbers(text: string): ReactNode[] {
  return text.split(/(~?\d+(?:\.\d+)? times)/).map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className={`font-semibold whitespace-nowrap ${GRADIENT_TEXT}`}>
        {part}
      </strong>
    ) : (
      part
    ),
  );
}
