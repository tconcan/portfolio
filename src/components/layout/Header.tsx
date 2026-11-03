import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { NAV_LINKS, OWNER_NAME, SOCIAL_LINKS, type SocialIcon } from "../../data/site";
import { CloseIcon, GitHubIcon, LinkedInIcon, MenuIcon, RomaTomIcon } from "./icons";

const EASE = [0.16, 1, 0.3, 1] as const;

const bar: Variants = {
  hidden: { y: "-100%" },
  show: { y: 0, transition: { duration: 0.8, ease: EASE, when: "beforeChildren", staggerChildren: 0.06 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: -8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

function SocialGraphic({ icon, className }: { icon: SocialIcon; className: string }) {
  switch (icon) {
    case "romatom":
      return <RomaTomIcon className={className} />;
    case "linkedin":
      return <LinkedInIcon className={className} />;
    case "github":
      return <GitHubIcon className={className} />;
  }
}

export default function Header() {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  // Close the mobile menu on navigation, outside click, or Escape.
  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // Deepen the bar slightly once the page scrolls under it.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      ref={navRef}
      variants={bar}
      initial="hidden"
      animate="show"
      className={`fixed inset-x-0 top-0 z-50 border-b backdrop-blur-md pointer-coarse:backdrop-blur-none transition-[background-color,border-color,box-shadow] duration-500 ${
        scrolled || menuOpen
          ? "border-white/10 bg-gray-900/85 shadow-lg shadow-black/30 pointer-coarse:bg-gray-900/95"
          : "border-white/5 bg-gray-900/70 pointer-coarse:bg-gray-900/90"
      }`}
      style={{ paddingLeft: "env(safe-area-inset-left)", paddingRight: "env(safe-area-inset-right)" }}
    >
      <nav aria-label="Main" className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 md:px-6">
        <div className="flex items-center gap-6 md:gap-10">
          <motion.div variants={item}>
            <Link to="/" className="nav-glow flex items-center gap-3 text-xl font-bold tracking-tight md:text-2xl">
              <img src="/media/logo.webp" alt="" width={156} height={128} className="h-7 w-auto md:h-8" />
              <span>{OWNER_NAME}</span>
            </Link>
          </motion.div>

          <ul className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.to;
              return (
                <motion.li key={link.to} variants={item} className="relative">
                  <Link
                    to={link.to}
                    aria-current={active ? "page" : undefined}
                    className={`nav-glow block px-3 py-2 text-[1.05rem] transition-colors ${
                      active ? "text-white" : "text-gray-300 hover:text-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                  {active && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-plum via-blue-400 to-aqua"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                </motion.li>
              );
            })}
          </ul>
        </div>

        <ul className="hidden items-center gap-5 md:flex">
          {SOCIAL_LINKS.map((link) => (
            <motion.li key={link.label} variants={item}>
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={link.label}
                title={link.label}
                className="nav-glow block opacity-90 hover:opacity-100"
              >
                <SocialGraphic icon={link.icon} className="h-6 w-6" />
              </a>
            </motion.li>
          ))}
        </ul>

        <motion.button
          variants={item}
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="-mr-2 rounded-lg p-2 transition-colors hover:bg-white/10 md:hidden"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={menuOpen ? "close" : "open"}
              className="block"
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 90 }}
              transition={{ duration: 0.18 }}
            >
              {menuOpen ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="mobile-menu"
            key="mobile-menu"
            className="overflow-hidden border-t border-white/10 md:hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <motion.ul
              className="space-y-1 px-3 py-4"
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } } }}
            >
              {NAV_LINKS.map((link) => (
                <motion.li key={link.to} variants={item}>
                  <Link
                    to={link.to}
                    aria-current={pathname === link.to ? "page" : undefined}
                    className={`block rounded-lg px-4 py-2.5 text-base transition-colors hover:bg-white/10 ${
                      pathname === link.to ? "bg-white/5 text-white" : "text-gray-300"
                    }`}
                  >
                    {link.label}
                  </Link>
                </motion.li>
              ))}
              <motion.li variants={item} aria-hidden="true" className="!my-2 border-t border-white/10" />
              {/* Socials: icons only, in one row (names stay as accessible labels). */}
              <motion.li variants={item}>
                <ul className="flex items-center gap-2 px-2 pt-1">
                  {SOCIAL_LINKS.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={link.label}
                        title={link.label}
                        className="grid size-11 place-items-center rounded-lg text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        <SocialGraphic icon={link.icon} className="h-6 w-6" />
                      </a>
                    </li>
                  ))}
                </ul>
              </motion.li>
            </motion.ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
