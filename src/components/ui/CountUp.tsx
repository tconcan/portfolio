import { useEffect, useRef } from "react";
import { animate, useReducedMotion } from "motion/react";

const show = (n: number) => Math.round(n).toLocaleString("en-US");

/**
 * A number that counts up from 0 when it first appears, then eases to any
 * new value (e.g. cached figures being replaced by fresh ones). Writes the
 * text directly so the count doesn't re-render React every frame.
 */
export default function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const current = useRef(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) {
      current.current = value;
      el.textContent = show(value);
      return;
    }
    const first = current.current === 0;
    const controls = animate(current.current, value, {
      duration: first ? 1.8 : 0.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        current.current = v;
        el.textContent = show(v);
      },
    });
    return () => controls.stop();
  }, [value, reduce]);

  return (
    <>
      <span ref={ref} aria-hidden="true">
        {show(current.current)}
      </span>
      <span className="sr-only">{show(value)}</span>
    </>
  );
}
