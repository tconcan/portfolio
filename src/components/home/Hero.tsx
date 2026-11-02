import { Fragment } from "react";
import { Link } from "react-router";
import { motion, type Variants } from "motion/react";
import { CONTACT_EMAIL, HERO, OWNER_NAME } from "../../data/site";
import { EASE, EXIT_EASE, rise } from "../ui/motion";
import { OUTLINE_BUTTON as BUTTON } from "../ui/styles";

// Enter: staggered rise-and-focus, starting once the header has dropped in.
// Exit: the same pieces lift and blur away (fast, reverse order) while the
// background blobs get their scatter kick.
const container: Variants = {
  hidden: {},
  show: { transition: { delayChildren: 0.35, staggerChildren: 0.11 } },
  exit: { transition: { staggerChildren: 0.05, staggerDirection: -1 } },
};
const photo: Variants = {
  hidden: { opacity: 0, scale: 0.82, filter: "blur(14px)" },
  show: { opacity: 1, scale: 1, filter: "blur(0px)", transition: { duration: 1.1, ease: EASE } },
  exit: { opacity: 0, scale: 0.9, filter: "blur(10px)", transition: { duration: 0.4, ease: EXIT_EASE } },
};

export default function Hero() {
  return (
    <motion.section
      id="home"
      aria-labelledby="hero-title"
      className="relative flex min-h-[100svh] items-center justify-center px-4 pt-20 pb-16 text-center sm:px-6"
      variants={container}
      initial="hidden"
      animate="show"
      exit="exit"
    >
      <div className="mx-auto max-w-3xl">
        <motion.div variants={photo} className="relative mx-auto mb-8 size-56 md:mb-10 md:size-72">
          {/* Soft halo that picks up the background's blue */}
          <div aria-hidden="true" className="absolute -inset-6 rounded-full bg-blue-500/25 blur-2xl" />
          <img
            src={HERO.photo}
            alt={OWNER_NAME}
            width={370}
            height={400}
            fetchPriority="high"
            decoding="async"
            className="relative size-full rounded-full border-4 border-blue-400 object-cover shadow-2xl shadow-black/40"
          />
        </motion.div>

        <motion.h1
          id="hero-title"
          variants={rise}
          className="mb-5 text-[2.6rem] font-bold tracking-tight text-gray-50 min-[360px]:text-5xl sm:text-6xl md:mb-6 md:text-8xl"
        >
          {HERO.greeting}
        </motion.h1>

        {/* One line with "|" dividers where it fits (≥385px). On the smallest
            phones the words wrap instead, without dividers, so nothing overflows. */}
        <motion.p
          variants={rise}
          className="mb-10 flex flex-wrap justify-center gap-x-4 text-lg text-gray-300 min-[385px]:gap-x-0 sm:text-xl md:text-3xl"
        >
          {HERO.pillars.map((pillar, i) => (
            <Fragment key={pillar}>
              {i > 0 && (
                <span aria-hidden="true" className="mx-2 hidden text-gray-400 min-[385px]:inline sm:mx-3">
                  |
                </span>
              )}
              <span className="whitespace-nowrap">{pillar}</span>
            </Fragment>
          ))}
        </motion.p>

        <motion.div variants={rise} className="flex flex-wrap justify-center gap-4">
          <Link to="/projects" className={BUTTON}>
            Projects
          </Link>
          <a href={`mailto:${CONTACT_EMAIL}`} className={BUTTON}>
            Contact
          </a>
        </motion.div>
      </div>

      {/* Scroll cue: appears after the intro, nudges down toward About. */}
      <motion.a
        href="#about"
        aria-label="Scroll to About Me"
        className="nav-glow absolute bottom-6 left-1/2 -translate-x-1/2 p-2 text-gray-300 hover:text-white"
        variants={{
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { delay: 1.6, duration: 0.8 } },
          exit: { opacity: 0, transition: { duration: 0.2 } },
        }}
      >
        <motion.svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-7"
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </motion.svg>
      </motion.a>
    </motion.section>
  );
}
