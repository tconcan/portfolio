import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { ORG_LOGOS } from "../../../data/involvement";

const SPEED = 40; // px per second

/**
 * Endless strip of organization logos.
 *
 * The logo set is repeated as many times as needed to cover the strip at any
 * width or zoom level (measured, not guessed), and the track slides left by
 * exactly one set's width per loop, so the seam is never visible. Speed stays
 * constant whatever the set's width. Logos fade in and out well inside the
 * edges. Hovering or tabbing into it pauses; with reduced motion it's a
 * static, wrapped row instead.
 */
export default function LogoMarquee() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const setRef = useRef<HTMLUListElement>(null);
  const [setWidth, setSetWidth] = useState(0);
  const [copies, setCopies] = useState(2);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const set = setRef.current;
    if (!viewport || !set) return;
    const measure = () => {
      const w = set.offsetWidth;
      if (!w) return;
      setSetWidth(w);
      // Enough sets to fill the strip, plus one sliding in from the right.
      setCopies(Math.max(2, Math.ceil(viewport.offsetWidth / w) + 1));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(viewport);
    ro.observe(set);
    return () => ro.disconnect();
  }, []);

  const trackStyle = setWidth
    ? ({ "--marquee-shift": `${setWidth}px`, animationDuration: `${setWidth / SPEED}s` } as CSSProperties)
    : undefined;

  return (
    <div
      ref={viewportRef}
      className="marquee mx-auto max-w-5xl overflow-hidden py-6 [mask-image:linear-gradient(to_right,transparent,black_25%,black_75%,transparent)] motion-reduce:[mask-image:none]"
    >
      <div
        className={`flex w-max motion-reduce:w-full motion-reduce:justify-center ${setWidth ? "marquee-track" : ""}`}
        style={trackStyle}
      >
        {Array.from({ length: copies }, (_, copy) => (
          <ul
            key={copy}
            ref={copy === 0 ? setRef : undefined}
            aria-hidden={copy > 0 ? true : undefined}
            className={`flex shrink-0 motion-reduce:flex-wrap motion-reduce:justify-center ${copy > 0 ? "motion-reduce:hidden" : ""}`}
          >
            {ORG_LOGOS.map((logo) => (
              <li key={logo.name} className="shrink-0 px-4 sm:px-6">
                <a
                  href={logo.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  tabIndex={copy > 0 ? -1 : undefined}
                  title={logo.name}
                  // Same-size box for every logo so spacing is even whatever the
                  // logo's shape (wide wordmarks vs tall crests).
                  className="block h-12 w-20 opacity-80 transition-[opacity,transform,filter] duration-300 hover:scale-110 hover:opacity-100 hover:drop-shadow-[0_0_14px_rgb(255_255_255/0.35)] focus-visible:opacity-100 sm:h-14 sm:w-24"
                >
                  <img
                    src={logo.image}
                    alt={copy > 0 ? "" : logo.name}
                    loading="lazy"
                    decoding="async"
                    // Fill the box and letterbox inside it: every logo fits, whatever its shape.
                    className="h-full w-full object-contain"
                  />
                </a>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
