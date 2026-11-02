import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
import { MetaballRenderer } from "./renderer";
import { Simulation } from "./simulation";

const INTENSITY = 0.92; // final blob opacity over the gray-950 base
const FADE_IN = 1.4; // seconds for the whole field to fade up on load
const MAX_DT = 1 / 20; // clamp long frames (tab switches, jank) to keep physics stable
const ROUTE_KICK = 85; // px/s outward impulse when navigating between pages

/**
 * Full-screen gravitational metaball background, shared by every page.
 * It lives outside the routed content, so it keeps running (and reacts with
 * a gentle scatter) while pages animate in and out on top of it.
 */
export default function Background() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<Simulation | null>(null);
  const [failed, setFailed] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let renderer: MetaballRenderer;
    try {
      renderer = new MetaballRenderer(canvas);
    } catch {
      setFailed(true);
      return;
    }

    const viewport = () => ({ w: window.innerWidth, h: window.innerHeight });
    let { w, h } = viewport();
    const sim = new Simulation(w, h);
    simRef.current = sim;

    // The canvas overshoots the viewport (iOS toolbar fix, see index.css);
    // offsetY maps simulation coordinates (viewport space) into it.
    let offsetY = 0;
    const fit = () => {
      ({ w, h } = viewport());
      sim.resize(w, h);
      renderer.resize(canvas.clientWidth, canvas.clientHeight);
      offsetY = -canvas.getBoundingClientRect().top;
    };
    fit();

    let frame = 0;
    let last = 0;
    let age = 0;

    const drawStatic = () => renderer.draw(sim.balls, INTENSITY, offsetY);

    const tick = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, MAX_DT) : 0;
      last = now;
      age += dt;
      sim.step(dt);
      const t = Math.min(age / FADE_IN, 1);
      renderer.draw(sim.balls, INTENSITY * (1 - Math.pow(1 - t, 3)), offsetY);
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      cancelAnimationFrame(frame);
      if (reduceMotion.matches) {
        sim.settle();
        drawStatic();
        return;
      }
      last = 0;
      frame = requestAnimationFrame(tick);
    };
    const stop = () => cancelAnimationFrame(frame);

    const onResize = () => {
      fit();
      if (reduceMotion.matches) drawStatic();
    };
    // Don't burn battery in background tabs.
    const onVisibility = () => (document.hidden ? stop() : start());
    const onLost = (e: Event) => {
      e.preventDefault();
      stop();
    };
    const onRestored = () => {
      try {
        renderer = new MetaballRenderer(canvas);
        fit();
        start();
      } catch {
        setFailed(true);
      }
    };

    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);
    reduceMotion.addEventListener("change", start);
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);
    start();

    return () => {
      stop();
      simRef.current = null;
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      reduceMotion.removeEventListener("change", start);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
    };
  }, []);

  // Page transitions: give the blobs an outward kick from the screen centre so
  // the whole background "breathes" as one page leaves and the next arrives.
  const firstRoute = useRef(true);
  useEffect(() => {
    if (firstRoute.current) {
      firstRoute.current = false;
      return;
    }
    const sim = simRef.current;
    if (sim && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      sim.impulse(sim.width / 2, sim.height / 2, ROUTE_KICK);
    }
  }, [pathname]);

  if (failed) return <div className="bg-fallback" aria-hidden="true" />;
  return <canvas ref={canvasRef} className="bg-canvas" aria-hidden="true" />;
}
