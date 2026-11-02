// N-body "gravity" simulation that drives the metaball background.
//
// Every ball attracts every other ball (softened Newtonian gravity, mass ∝ r²),
// so blobs drift together, merge, slingshot around each other and separate.
// A gentle speed regulator keeps the system from either collapsing into one
// clump or flinging balls away, so it looks alive indefinitely.
//
// All units are CSS pixels and seconds, so the motion is identical at 60 Hz,
// 120 Hz or a stuttering 30 Hz (the old version moved per frame).

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Resting radius. */
  radius: number;
  /** Radius actually drawn this frame (after intro / edge easing). */
  drawRadius: number;
  /** Seconds before this ball starts growing in during the intro. */
  delay: number;
}

/** Physics tuning. Exported so it can be tweaked/tested in isolation. */
export const PHYSICS = {
  G: 14, // gravitational strength (tuned by eye, not physics)
  softening: 140, // px; stops forces exploding when balls overlap
  repel: 0.9, // short-range push once two blobs overlap past (ra+rb)×repelRange
  repelRange: 0.7,
  minSpeed: 30, // px/s; slower balls get revived toward this
  cruiseSpeed: 70, // px/s; faster balls are gently braked back to this
  relax: 0.5, // 1/s; strength of both corrections
  maxSpeed: 180, // px/s hard cap (e.g. after a scatter impulse)
  boundaryPull: 0.12, // 1/s²; spring that bends escaping balls back on screen
};
const MIN_EDGE_SCALE = 0.08; // radius fraction once a ball is far off screen
const INTRO_GROW = 1.6; // seconds for a ball to grow to full size
const INTRO_STAGGER = 0.09; // seconds between successive balls appearing

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const smoothstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1);
  return t * t * (3 - 2 * t);
};
const easeOutCubic = (t: number) => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);

export class Simulation {
  balls: Ball[] = [];
  width = 0;
  height = 0;
  private time = 0;
  private maxRadius = 0;

  constructor(width: number, height: number) {
    this.resize(width, height);
    this.spawn();
  }

  /** Off-screen band balls travel through before wrapping to the other side. */
  private get margin() {
    return this.maxRadius * 1.6;
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    // Smaller blobs on phones so the screen isn't one solid colour.
    const scale = Math.min(1, Math.max(0.72, Math.sqrt(Math.min(width, height * 1.4) / 1100)));
    const next = 135 * scale;
    if (this.maxRadius && this.balls.length) {
      const k = next / this.maxRadius;
      for (const b of this.balls) b.radius *= k;
    }
    this.maxRadius = next;
  }

  private spawn() {
    const area = this.width * this.height;
    const count = Math.round(Math.min(16, Math.max(9, area / 95_000)));
    // Sort spawn order roughly top-left → bottom-right so the intro sweeps
    // diagonally along the purple→cyan gradient.
    const balls: Ball[] = Array.from({ length: count }, () => {
      const angle = rand(0, Math.PI * 2);
      const speed = rand(1, 1.6) * PHYSICS.minSpeed;
      return {
        x: rand(-0.05, 1.05) * this.width,
        y: rand(-0.05, 1.05) * this.height,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: this.maxRadius * rand(0.45, 1),
        drawRadius: 0,
        delay: 0,
      };
    });
    balls.sort((a, b) => a.x + a.y - (b.x + b.y));
    balls.forEach((b, i) => (b.delay = 0.15 + i * INTRO_STAGGER));
    this.balls = balls;
  }

  /** Push every ball away from a point (used on page transitions). */
  impulse(cx: number, cy: number, strength: number) {
    for (const b of this.balls) {
      const dx = b.x - cx;
      const dy = b.y - cy;
      const d = Math.hypot(dx, dy) || 1;
      const falloff = 1 / (1 + d / 600);
      b.vx += (dx / d) * strength * falloff;
      b.vy += (dy / d) * strength * falloff;
    }
  }

  /** Skip the intro (reduced motion): everything at full size immediately. */
  settle() {
    this.time = 1e6;
    this.updateRadii();
  }

  step(dt: number) {
    this.time += dt;
    const balls = this.balls;
    const n = balls.length;
    const { G, softening, repel, repelRange, minSpeed, cruiseSpeed, relax, maxSpeed, boundaryPull } = PHYSICS;
    const eps2 = softening * softening;

    // Pairwise softened gravity. n ≤ 16 so O(n²) is ~120 pairs: trivial.
    for (let i = 0; i < n; i++) {
      const a = balls[i];
      const ma = a.drawRadius * a.drawRadius;
      for (let j = i + 1; j < n; j++) {
        const b = balls[j];
        const mb = b.drawRadius * b.drawRadius;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d2 = dx * dx + dy * dy + eps2;
        const inv = (G * dt) / (d2 * Math.sqrt(d2));
        a.vx += dx * inv * mb;
        a.vy += dy * inv * mb;
        b.vx -= dx * inv * ma;
        b.vy -= dy * inv * ma;

        // Soft short-range repulsion: blobs still visibly merge, but bounce
        // off each other instead of sinking into one permanent clump.
        const reach = (a.drawRadius + b.drawRadius) * repelRange;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < reach && d > 1e-3) {
          const push = (repel * (reach - d) * dt) / d;
          a.vx -= dx * push;
          a.vy -= dy * push;
          b.vx += dx * push;
          b.vy += dy * push;
        }
      }
    }

    const m = this.margin;
    const k = 1 - Math.exp(-relax * dt);
    for (const b of balls) {
      // Speed band: revive slow balls, brake fast ones, leave the rest alone.
      // Inside the band gravity is energy-conserving, so close passes turn
      // into slingshots instead of bleeding energy and collapsing.
      const speed = Math.hypot(b.vx, b.vy);
      if (speed > 1e-3) {
        let target = speed;
        if (speed < minSpeed) target += (minSpeed - speed) * k;
        else if (speed > cruiseSpeed) target += (cruiseSpeed - speed) * k;
        const scale = Math.min(target, maxSpeed) / speed;
        b.vx *= scale;
        b.vy *= scale;
      }

      // Boundary gravity: past the screen edge a spring pulls balls back, so
      // they arc out of view and swing back in instead of disappearing.
      if (b.x < 0) b.vx -= b.x * boundaryPull * dt;
      else if (b.x > this.width) b.vx -= (b.x - this.width) * boundaryPull * dt;
      if (b.y < 0) b.vy -= b.y * boundaryPull * dt;
      else if (b.y > this.height) b.vy -= (b.y - this.height) * boundaryPull * dt;

      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // Safety net for balls flung hard enough to beat the spring: wrap
      // through the off-screen band, where they are shrunk to almost nothing
      // (see updateRadii), so the jump is never visible.
      if (b.x < -m) b.x += this.width + 2 * m;
      else if (b.x > this.width + m) b.x -= this.width + 2 * m;
      if (b.y < -m) b.y += this.height + 2 * m;
      else if (b.y > this.height + m) b.y -= this.height + 2 * m;
    }

    this.updateRadii();
  }

  /**
   * Draw radius = rest radius × intro growth × edge presence.
   * Edge presence is a pure function of how far outside the viewport a ball
   * is, so blobs swell smoothly as they drift in and melt away as they leave
   * (the old version eased toward a target with lag, which could pop).
   */
  private updateRadii() {
    const m = this.margin;
    for (const b of this.balls) {
      const outX = Math.max(-b.x, b.x - this.width, 0);
      const outY = Math.max(-b.y, b.y - this.height, 0);
      const out = Math.hypot(outX, outY);
      const presence = 1 - smoothstep(0, m * 0.85, out);
      const edge = MIN_EDGE_SCALE + (1 - MIN_EDGE_SCALE) * presence;
      const intro = easeOutCubic((this.time - b.delay) / INTRO_GROW);
      b.drawRadius = b.radius * edge * intro;
    }
  }
}
