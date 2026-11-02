import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  r: number;
  base: number; // resting brightness
  amp: number; // twinkle depth
  speed: number; // twinkle rate (rad/s)
  phase: number;
  color: string;
}

interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // seconds left
  total: number;
  tint: string; // colour of the tail
  width: number;
}

const STAR_COLORS = [
  "255, 255, 255",
  "253, 186, 116", // orange
  "224, 231, 255",
  "196, 181, 253", // violet
  "165, 243, 252", // cyan
  "147, 197, 253", // blue
  "253, 230, 138", // warm gold
  "249, 168, 212", // pink
];
const METEOR_TINTS = ["165, 243, 252", "196, 181, 253", "249, 168, 212", "147, 197, 253"];
const FPS = 30; // twinkling doesn't need more

/**
 * Night sky for the Travel page: a static layer (deep gradient, a faint
 * purple / cyan Milky Way band, dim background stars) plus twinkling bright
 * stars and the odd shooting star on top. Uses the same fixed, oversized box
 * as the metaball background.
 */
export default function StarField({ visible }: { visible: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !visible) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let sky: HTMLCanvasElement | null = null;
    let stars: Star[] = [];

    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    const build = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);

      // Static layer, painted once per size.
      sky = document.createElement("canvas");
      sky.width = canvas.width;
      sky.height = canvas.height;
      const s = sky.getContext("2d")!;
      s.scale(dpr, dpr);
      const bg = s.createLinearGradient(0, 0, w * 0.3, h);
      bg.addColorStop(0, "#050816");
      bg.addColorStop(0.55, "#0a0f2c");
      bg.addColorStop(1, "#030712");
      s.fillStyle = bg;
      s.fillRect(0, 0, w, h);

      // Milky Way: soft overlapping glows along a diagonal.
      const band = (t: number) => [w * (-0.1 + 1.2 * t), h * (0.95 - 0.8 * t)] as const;
      for (let i = 0; i < 26; i++) {
        const t = i / 25;
        const [bx, by] = band(t);
        const x = bx + rand(-0.06, 0.06) * w;
        const y = by + rand(-0.06, 0.06) * h;
        const rad = rand(0.1, 0.2) * Math.max(w, h);
        const tints = ["106, 13, 173", "147, 51, 234", "59, 130, 246", "34, 140, 220", "6, 182, 212", "219, 39, 119"];
        const tint = tints[Math.min(tints.length - 1, Math.floor(t * tints.length + rand(-0.6, 0.6)))] ?? tints[0];
        const g = s.createRadialGradient(x, y, 0, x, y, rad);
        g.addColorStop(0, `rgba(${tint}, ${rand(0.1, 0.18)})`);
        g.addColorStop(1, `rgba(${tint}, 0)`);
        s.fillStyle = g;
        s.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
      // Dust of faint stars, thicker along the band.
      const dust = Math.round((w * h) / 900);
      for (let i = 0; i < dust; i++) {
        let x: number;
        let y: number;
        if (Math.random() < 0.45) {
          const [bx, by] = band(Math.random());
          x = bx + rand(-0.12, 0.12) * w;
          y = by + rand(-0.12, 0.12) * h;
        } else {
          x = Math.random() * w;
          y = Math.random() * h;
        }
        const dustTint = Math.random() < 0.55 ? "255, 255, 255" : STAR_COLORS[2 + Math.floor(Math.random() * 6)];
        s.fillStyle = `rgba(${dustTint}, ${rand(0.1, 0.4)})`;
        s.fillRect(x, y, rand(0.4, 0.9), rand(0.4, 0.9));
      }

      // A few loose nebula clouds away from the band, for colour.
      const clouds = ["219, 39, 119", "6, 182, 212", "147, 51, 234", "59, 130, 246", "236, 72, 153", "20, 184, 166", "168, 85, 247", "14, 165, 233"];
      for (let i = 0; i < clouds.length; i++) {
        const x = rand(0, w);
        const y = rand(0, h);
        const rad = rand(0.12, 0.26) * Math.max(w, h);
        const tint = clouds[i];
        const g = s.createRadialGradient(x, y, 0, x, y, rad);
        g.addColorStop(0, `rgba(${tint}, ${rand(0.08, 0.13)})`);
        g.addColorStop(1, `rgba(${tint}, 0)`);
        s.fillStyle = g;
        s.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }

      // Bright stars that twinkle (drawn each frame).
      const count = Math.round((w * h) / 5200);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() < 0.08 ? rand(1.2, 1.8) : rand(0.5, 1.15),
        base: rand(0.45, 0.9),
        amp: rand(0.1, 0.45),
        speed: rand(0.6, 2.4),
        phase: rand(0, Math.PI * 2),
        color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
      }));
    };

    let meteors: Meteor[] = [];
    let nextMeteor = rand(1.5, 4);

    const draw = (t: number) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (sky) ctx.drawImage(sky, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const st of stars) {
        const a = Math.max(0, Math.min(1, st.base + st.amp * Math.sin(t * st.speed + st.phase)));
        ctx.fillStyle = `rgba(${st.color}, ${a})`;
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        ctx.fill();
        if (st.r > 1.2) {
          // A soft halo on the brightest few.
          const g = ctx.createRadialGradient(st.x, st.y, 0, st.x, st.y, st.r * 5);
          g.addColorStop(0, `rgba(${st.color}, ${0.25 * a})`);
          g.addColorStop(1, `rgba(${st.color}, 0)`);
          ctx.fillStyle = g;
          ctx.fillRect(st.x - st.r * 5, st.y - st.r * 5, st.r * 10, st.r * 10);
        }
      }
      for (const m of meteors) {
        const fade = Math.sin(Math.PI * (1 - m.life / m.total));
        const tail = 0.16; // seconds of trail
        const tx = m.x - m.vx * tail;
        const ty = m.y - m.vy * tail;
        const g = ctx.createLinearGradient(m.x, m.y, tx, ty);
        g.addColorStop(0, `rgba(255, 255, 255, ${0.95 * fade})`);
        g.addColorStop(0.25, `rgba(${m.tint}, ${0.6 * fade})`);
        g.addColorStop(1, `rgba(${m.tint}, 0)`);
        ctx.strokeStyle = g;
        ctx.lineWidth = m.width;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        // Bright head.
        const hg = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.width * 3);
        hg.addColorStop(0, `rgba(255, 255, 255, ${0.9 * fade})`);
        hg.addColorStop(1, `rgba(${m.tint}, 0)`);
        ctx.fillStyle = hg;
        ctx.fillRect(m.x - m.width * 3, m.y - m.width * 3, m.width * 6, m.width * 6);
      }
    };

    build();
    if (reduceMotion) {
      draw(0);
      const onResize = () => {
        build();
        draw(0);
      };
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }

    let raf = 0;
    let last = 0;
    let acc = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      acc += dt;
      if (acc < 1 / FPS) return;
      const step = acc;
      acc = 0;

      // A shooting star every few seconds, now and then two close together.
      nextMeteor -= step;
      if (nextMeteor <= 0 && meteors.length < 3) {
        const speed = rand(650, 1200);
        const angle = rand(0.25, 0.75) * (Math.random() < 0.8 ? 1 : -1); // mostly down-left
        const life = rand(0.5, 0.95);
        meteors.push({
          x: rand(0.2, 1.05) * w,
          y: rand(-0.05, 0.55) * h,
          vx: -Math.cos(angle) * speed * (angle < 0 ? -1 : 1),
          vy: Math.abs(Math.sin(angle)) * speed,
          life,
          total: life,
          tint: METEOR_TINTS[Math.floor(Math.random() * METEOR_TINTS.length)],
          width: rand(1, 2),
        });
        nextMeteor = Math.random() < 0.2 ? rand(0.3, 0.8) : rand(2.5, 6);
      }
      for (const m of meteors) {
        m.x += m.vx * step;
        m.y += m.vy * step;
        m.life -= step;
      }
      meteors = meteors.filter((m) => m.life > 0);
      draw(now / 1000);
    };
    raf = requestAnimationFrame(tick);

    const onResize = () => build();
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) {
        last = 0;
        raf = requestAnimationFrame(tick);
      }
    };
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [visible]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="bg-canvas transition-opacity duration-1000 ease-out"
      style={{ opacity: visible ? 1 : 0 }}
    />
  );
}
