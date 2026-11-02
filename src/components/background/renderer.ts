// WebGL metaball renderer.
//
// The old background evaluated the metaball field on the CPU for every 3×3
// block of the screen (~150k samples × 20 balls per frame) and uploaded the
// result with putImageData, which is what made it stutter. Here the field is
// evaluated per pixel in a fragment shader on the GPU, and the CPU only
// uploads ~16 vec3s per frame.
//
// The image is very soft, so it is rendered at a reduced resolution and
// upscaled by the browser (bilinear), which costs nothing visually.

import type { Ball } from "./simulation";

export const MAX_BALLS = 24;

// Same palette as the old site: deep purple #6a0dad → cyan #00ffff on a
// diagonal, over gray-950 (#030712).
const FROM = [106 / 255, 13 / 255, 173 / 255];
const TO = [0, 1, 1];
const BG = [3 / 255, 7 / 255, 18 / 255];

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform vec3 uBalls[${MAX_BALLS}]; // x, y (buffer px, y up), radius
uniform int uCount;
uniform float uIntensity;
uniform vec3 uFrom;
uniform vec3 uTo;
uniform vec3 uBg;

void main() {
  vec2 p = gl_FragCoord.xy;
  float f = 0.0;
  for (int i = 0; i < ${MAX_BALLS}; i++) {
    if (i >= uCount) break;
    vec3 b = uBalls[i];
    vec2 d = p - b.xy;
    f += (b.z * b.z) / (dot(d, d) + 1.0);
  }

  // Soft iso-surface (the continuous version of marching squares' threshold)
  // plus a faint halo so blobs glow into the dark instead of ending abruptly.
  float body = smoothstep(0.32, 1.15, f);
  float halo = 0.22 * smoothstep(0.05, 0.6, f);
  float a = clamp(max(body, halo) * uIntensity, 0.0, 1.0);

  // Diagonal gradient: top-left purple → bottom-right cyan.
  float t = (p.x + (uRes.y - p.y)) / (uRes.x + uRes.y);
  vec3 col = mix(uFrom, uTo, t);
  // Slightly deeper core where blobs overlap, like light through glass.
  col *= 0.86 + 0.14 * smoothstep(1.0, 3.0, f);

  vec3 outCol = mix(uBg, col, a);

  // Ordered-ish dither to kill banding in the long dark gradients.
  float n = fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  outCol += (n - 0.5) / 255.0;

  gl_FragColor = vec4(outCol, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile failed: ${log}`);
  }
  return shader;
}

export class MetaballRenderer {
  private gl: WebGLRenderingContext;
  private uRes: WebGLUniformLocation;
  private uBalls: WebGLUniformLocation;
  private uCount: WebGLUniformLocation;
  private uIntensity: WebGLUniformLocation;
  private data = new Float32Array(MAX_BALLS * 3);
  /** Drawing-buffer pixels per CSS pixel. */
  scale = 0.5;

  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: "low-power",
    });
    if (!gl) throw new Error("WebGL unavailable");
    this.gl = gl;

    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Program link failed: ${gl.getProgramInfoLog(program)}`);
    }
    gl.useProgram(program);

    // One triangle that covers the whole viewport.
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    this.uRes = gl.getUniformLocation(program, "uRes")!;
    this.uBalls = gl.getUniformLocation(program, "uBalls")!;
    this.uCount = gl.getUniformLocation(program, "uCount")!;
    this.uIntensity = gl.getUniformLocation(program, "uIntensity")!;
    gl.uniform3fv(gl.getUniformLocation(program, "uFrom"), FROM);
    gl.uniform3fv(gl.getUniformLocation(program, "uTo"), TO);
    gl.uniform3fv(gl.getUniformLocation(program, "uBg"), BG);
  }

  get isLost() {
    return this.gl.isContextLost();
  }

  /** Match the drawing buffer to the canvas's CSS size × scale. */
  resize(cssWidth: number, cssHeight: number) {
    const w = Math.max(1, Math.round(cssWidth * this.scale));
    const h = Math.max(1, Math.round(cssHeight * this.scale));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.gl.viewport(0, 0, w, h);
    this.gl.uniform2f(this.uRes, w, h);
  }

  /**
   * @param offsetY CSS px from the canvas top to the simulation's y = 0 (the
   *   canvas overshoots the viewport on mobile; see .bg-canvas in index.css).
   */
  draw(balls: readonly Ball[], intensity: number, offsetY: number) {
    const { gl, data, scale } = this;
    const h = this.canvas.height;
    const n = Math.min(balls.length, MAX_BALLS);
    for (let i = 0; i < n; i++) {
      const b = balls[i];
      data[i * 3] = b.x * scale;
      data[i * 3 + 1] = h - (b.y + offsetY) * scale; // GL's y axis points up
      data[i * 3 + 2] = b.drawRadius * scale;
    }
    gl.uniform3fv(this.uBalls, data);
    gl.uniform1i(this.uCount, n);
    gl.uniform1f(this.uIntensity, intensity);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
