import { Link } from "react-router";
import { motion, type Variants } from "motion/react";
import { EASE, EXIT_EASE } from "../ui/motion";
import { GLASS_CARD, GRADIENT_TEXT } from "../ui/styles";

const LINKS = [
  { to: "/projects", eyebrow: "What I've made", label: "Projects" },
  { to: "/travel", eyebrow: "Where I've been", label: "Travel" },
];

const group: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
  exit: { opacity: 0, transition: { duration: 0.35, ease: EXIT_EASE } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 24, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.8, ease: EASE } },
};

/** Small cards at the end of the home page pointing to the other pages. */
export default function MoreLinks() {
  return (
    <motion.nav
      aria-label="More from Tom"
      className="px-3 pb-16 sm:px-6 md:pb-24"
      initial="hidden"
      whileInView="show"
      exit="exit"
      viewport={{ once: true, amount: 0.3 }}
      variants={group}
    >
      <ul className="mx-auto grid max-w-3xl gap-3 sm:grid-cols-2 sm:gap-4">
        {LINKS.map((link) => (
          <motion.li key={link.to} variants={item}>
            <Link
              to={link.to}
              className={`${GLASS_CARD} group flex items-center justify-between gap-4 !rounded-2xl px-5 py-4 transition-[border-color,background-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-white/25 hover:bg-gray-900/60 hover:shadow-[0_0_32px_rgb(96_165_250/0.2)] active:scale-[0.98] sm:px-6 sm:py-5`}
            >
              <span>
                <span className={`block text-xs font-semibold tracking-[0.2em] uppercase ${GRADIENT_TEXT}`}>
                  {link.eyebrow}
                </span>
                <span className="mt-1 block text-xl font-bold text-white sm:text-2xl">{link.label}</span>
              </span>
              <span
                aria-hidden="true"
                className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-white/5 text-gray-300 ring-1 ring-white/15 ring-inset transition-[color,box-shadow] duration-300 group-hover:text-white group-hover:shadow-[0_0_18px_rgb(96_165_250/0.45)] group-hover:ring-white/0"
              >
                {/* Gradient fill fades in on its own layer: background
                    gradients can't transition, and a border would show a seam. */}
                <span className="absolute inset-0 rounded-full bg-gradient-to-r from-plum via-blue-500 to-cyan-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <svg viewBox="0 0 16 16" className="relative size-4 transition-transform duration-300 group-hover:translate-x-0.5">
                  <path d="M3 8h9M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </Link>
          </motion.li>
        ))}
      </ul>
    </motion.nav>
  );
}
