import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type Variants } from "motion/react";
import { ABOUT } from "../../data/about";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { EASE, EXIT_EASE, rise } from "../ui/motion";
import { GLASS_CARD, GRADIENT_TEXT, OUTLINE_BUTTON } from "../ui/styles";

// Everything plays once, as the section scrolls into view.
const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
  exit: { transition: { staggerChildren: 0.04, staggerDirection: -1 } },
};
const card: Variants = {
  hidden: { opacity: 0, y: 48, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 1, ease: EASE, when: "beforeChildren", staggerChildren: 0.12 },
  },
  exit: { opacity: 0, y: -24, transition: { duration: 0.4, ease: EXIT_EASE } },
};
// The portrait opens out from a smaller rounded window.
const reveal: Variants = {
  hidden: { opacity: 0, clipPath: "inset(14% 14% 14% 14% round 48px)" },
  show: {
    opacity: 1,
    clipPath: "inset(0% 0% 0% 0% round 12px)",
    transition: { duration: 1.2, ease: EASE },
  },
};

export default function About() {
  const portraitRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  // Gentle parallax on desktop: the photo drifts slightly slower than the
  // page. Off on phones, where the photo spans the card and would collide
  // with the text below it.
  const drift = isDesktop && !reduceMotion ? 36 : 0;
  const { scrollYProgress } = useScroll({ target: portraitRef, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [drift, -drift]);

  return (
    <motion.section
      id="about"
      aria-labelledby="about-title"
      className="scroll-mt-14 px-3 py-16 sm:scroll-mt-16 sm:px-6 sm:py-20 md:py-24"
      initial="hidden"
      whileInView="show"
      exit="exit"
      viewport={{ once: true, amount: 0.2 }}
      variants={stagger}
    >
      <div className="mx-auto max-w-6xl">
        <motion.header variants={rise} className="mb-8 text-center sm:mb-10 md:mb-12">
          <p className={`mb-3 text-sm font-semibold tracking-[0.2em] uppercase ${GRADIENT_TEXT}`}>{ABOUT.eyebrow}</p>
          <h2 id="about-title" className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            {ABOUT.title}
          </h2>
        </motion.header>

        <motion.div
          variants={card}
          className={`${GLASS_CARD} grid items-center gap-6 p-4 sm:gap-8 sm:p-8 lg:grid-cols-[5fr_7fr] lg:gap-12 lg:p-12`}
        >
          {/* Portrait */}
          <motion.div ref={portraitRef} style={{ y }} className="relative w-full">
            <div aria-hidden="true" className="absolute -inset-2 rounded-[2rem] sm:-inset-4 bg-gradient-to-br from-purple-600/30 via-blue-500/25 to-cyan-400/30 blur-2xl" />
            <motion.div variants={reveal} className="relative">
              <img
                src={ABOUT.portrait.src}
                srcSet={ABOUT.portrait.srcSet}
                sizes="(min-width: 1024px) 420px, 100vw"
                width={ABOUT.portrait.width}
                height={ABOUT.portrait.height}
                alt={ABOUT.portrait.alt}
                loading="lazy"
                decoding="async"
                className="aspect-[4/3] w-full rounded-xl border-[3px] border-blue-400 object-cover object-[50%_28%] sm:aspect-[16/9] sm:rounded-2xl sm:border-4 lg:aspect-square lg:object-[50%_20%]"
              />
            </motion.div>
          </motion.div>

          {/* Story */}
          <div className="space-y-6 px-1 sm:px-0 lg:space-y-8">
            {ABOUT.paragraphs.map((p) => (
              <motion.div key={p.label} variants={rise}>
                <h3 className="mb-2 flex items-center gap-3 text-sm font-semibold tracking-[0.18em] text-white uppercase">
                  <span aria-hidden="true" className="h-px w-8 bg-gradient-to-r from-purple-400 to-cyan-300" />
                  {p.label}
                </h3>
                <p className="text-[0.975rem] leading-relaxed text-gray-300 sm:text-lg">{p.text}</p>
              </motion.div>
            ))}

            <motion.div variants={rise} className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:justify-center sm:gap-4">
              {ABOUT.links.map((link) => (
                <a key={link.href} href={link.href} className={`${OUTLINE_BUTTON} min-w-0 px-4 sm:min-w-36 sm:px-8`}>
                  {link.label}
                </a>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}
