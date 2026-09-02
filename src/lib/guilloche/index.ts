/**
 * The engraved sheet — runtime.
 *
 * Framework-agnostic. Zero dependencies. WebGL2 only (falls back to `null`,
 * in which case the caller leaves the plain cream ground in place).
 *
 *   const field = createGuillocheField(canvas, { motion: 1 });
 *   field?.destroy();
 *
 * Geometry is built once and never touched again: every stroke vertex is a
 * (u, lineIndex, side) triple and the GPU does all of the drawing math per
 * frame — centerline, ribbon extrusion, anti-aliasing. Two stroke draw
 * calls per frame (lattice, band), plus optional chords/nodes.
 */

import { type GuillocheConfig, type GuillocheOverrides, resolveConfig } from "./config";
import { FRAGMENT_SHADER, VERTEX_SHADER } from "./shaders";

export type { GuillocheConfig, GuillocheOverrides } from "./config";
export {
  darkColors,
  defaultConfig,
  lightColors,
  mobileConfig,
  palette,
  resolveConfig,
} from "./config";

export interface GuillocheField {
  /** Stop rendering and release GPU resources. */
  destroy(): void;
  /** 0 freezes the field, 1 is full motion. Interpolated smoothly. */
  setMotion(motion: number): void;
  /**
   * Wordmark-hover surge, 0..1 — the engraving brightens and quickens
   * around the eye. Interpolated smoothly.
   */
  setFocus(focus: number): void;
  /**
   * Swap the colour set live (theme change). `opacityScale` multiplies the
   * stroke-layer opacities — thin light lines on a dark ground need more.
   */
  setPalette(colors: GuillocheConfig["colors"], opacityScale?: number): void;
  /** Force a redraw (used when motion is 0). */
  render(): void;
  readonly config: GuillocheConfig;
}

const RESTART = 0xffffffff;
const hash = (n: number) => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

// ---------------------------------------------------------------- geometry

/** Ribbon strips: per line, (segments+1) pairs of (u, i, side ±1). */
function buildStrips(lines: number, segments: number) {
  const verts = new Float32Array(lines * (segments + 1) * 2 * 3);
  const idx = new Uint32Array(lines * ((segments + 1) * 2 + 1));
  let v = 0;
  let k = 0;
  let vi = 0;
  for (let i = 0; i < lines; i++) {
    for (let j = 0; j <= segments; j++) {
      const u = j / segments;
      verts[v++] = u;
      verts[v++] = i;
      verts[v++] = 1;
      idx[k++] = vi++;
      verts[v++] = u;
      verts[v++] = i;
      verts[v++] = -1;
      idx[k++] = vi++;
    }
    idx[k++] = RESTART;
  }
  return { verts, idx };
}

function nodeStrandIndices(cfg: GuillocheConfig) {
  const out: number[] = [];
  const offset = Math.floor(cfg.nodes.curveStride / 2);
  for (let i = offset; i < cfg.band.strands; i += cfg.nodes.curveStride) out.push(i);
  return out;
}

function nodeParam(cfg: GuillocheConfig, strand: number, k: number) {
  const jitter = hash(strand + 3.7);
  return (k + jitter) / cfg.nodes.perCurve;
}

function buildNodes(cfg: GuillocheConfig) {
  if (cfg.nodes.perCurve <= 0) return new Float32Array(0);
  const strands = nodeStrandIndices(cfg);
  const verts = new Float32Array(strands.length * cfg.nodes.perCurve * 2);
  let v = 0;
  for (const i of strands) {
    for (let k = 0; k < cfg.nodes.perCurve; k++) {
      verts[v++] = nodeParam(cfg, i, k);
      verts[v++] = i;
    }
  }
  return verts;
}

function buildChords(cfg: GuillocheConfig) {
  if (!cfg.chords.enabled || cfg.nodes.perCurve <= 0) return new Float32Array(0);
  const strands = nodeStrandIndices(cfg);
  const pairs = Math.max(strands.length - 1, 0) * cfg.nodes.perCurve;
  const verts = new Float32Array(pairs * 4);
  let v = 0;
  for (let c = 0; c < strands.length - 1; c++) {
    const a = strands[c]!;
    const b = strands[c + 1]!;
    for (let k = 0; k < cfg.nodes.perCurve; k++) {
      verts[v++] = nodeParam(cfg, a, k);
      verts[v++] = a;
      verts[v++] = nodeParam(cfg, b, k);
      verts[v++] = b;
    }
  }
  return verts;
}

// ------------------------------------------------------------------- GL

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) throw new Error("createShader failed");
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`Shader compile error:\n${log}`);
  }
  return sh;
}

function link(gl: WebGL2RenderingContext) {
  const prog = gl.createProgram();
  if (!prog) throw new Error("createProgram failed");
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
  gl.bindAttribLocation(prog, 0, "aParam");
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(`Program link error:\n${gl.getProgramInfoLog(prog)}`);
  }
  return prog;
}

function vao(
  gl: WebGL2RenderingContext,
  data: Float32Array,
  size: 2 | 3,
  index?: Uint32Array,
) {
  const va = gl.createVertexArray();
  gl.bindVertexArray(va);
  const vb = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vb);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, size, gl.FLOAT, false, 0, 0);
  let ib: WebGLBuffer | null = null;
  if (index) {
    ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, index, gl.STATIC_DRAW);
  }
  gl.bindVertexArray(null);
  return { va, vb, ib, count: index ? index.length : data.length / size };
}

// -------------------------------------------------------------- runtime

export function createGuillocheField(
  canvas: HTMLCanvasElement,
  overrides: GuillocheOverrides = {},
): GuillocheField | null {
  const cfg = resolveConfig(overrides);
  const ctx = canvas.getContext("webgl2", {
    alpha: false,
    antialias: true,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    powerPreference: "high-performance",
  });
  if (!ctx) return null;
  const gl: WebGL2RenderingContext = ctx;

  const program = link(gl);
  gl.useProgram(program);

  const u = (name: string) => gl.getUniformLocation(program, name);
  const U = {
    time: u("uTime"),
    viewportPx: u("uViewportPx"),
    aspect: u("uAspect"),
    worldHalfWidth: u("uWorldHalfWidth"),
    overscan: u("uOverscan"),
    perspective: u("uPerspective"),
    mode: u("uMode"),
    layer: u("uLayer"),
    latLines: u("uLatLines"),
    latFreq: u("uLatFreq"),
    latAmp: u("uLatAmp"),
    latShear: u("uLatShear"),
    latCrawl: u("uLatCrawl"),
    latWidthPx: u("uLatWidthPx"),
    latOpacity: u("uLatOpacity"),
    bandStrands: u("uBandStrands"),
    bandCenterY: u("uBandCenterY"),
    bandHeight: u("uBandHeight"),
    bandFreq: u("uBandFreq"),
    bandDepth: u("uBandDepth"),
    bandCrawl: u("uBandCrawl"),
    bandWidthPx: u("uBandWidthPx"),
    bandOpacity: u("uBandOpacity"),
    navyFraction: u("uNavyFraction"),
    roseRings: u("uRoseRings"),
    roseRadius: u("uRoseRadius"),
    roseWidth: u("uRoseWidth"),
    roseHarm: u("uRoseHarm"),
    roseDepth: u("uRoseDepth"),
    roseCrawl: u("uRoseCrawl"),
    roseWidthPx: u("uRoseWidthPx"),
    roseOpacity: u("uRoseOpacity"),
    roseNavy: u("uRoseNavy"),
    clearing: u("uClearing"),
    clearingFx: u("uClearingFx"),
    liquid: u("uLiquid"),
    pointer: u("uPointer"),
    pointerStrength: u("uPointerStrength"),
    pointerParams: u("uPointerParams"),
    reveal: u("uReveal"),
    introStagger: u("uIntroStagger"),
    focus: u("uFocus"),
    grainColor: u("uGrainColor"),
    dpr: u("uDpr"),
    nodeSize: u("uNodeSize"),
    teal: u("uTeal"),
    mint: u("uMint"),
    navy: u("uNavy"),
    miscOpacity: u("uMiscOpacity"),
    grain: u("uGrain"),
  };

  // Static uniforms
  gl.uniform1f(U.overscan, cfg.overscan);
  gl.uniform1f(U.perspective, cfg.perspective);
  gl.uniform1f(U.latLines, cfg.lattice.lines);
  gl.uniform2f(U.latFreq, cfg.lattice.frequency[0], cfg.lattice.frequency[1]);
  gl.uniform1f(U.latAmp, cfg.lattice.amplitude);
  gl.uniform1f(U.latShear, cfg.lattice.phaseShear);
  gl.uniform1f(U.latCrawl, cfg.lattice.crawl);
  gl.uniform1f(U.latWidthPx, cfg.lattice.widthPx);
  gl.uniform1f(U.latOpacity, cfg.lattice.opacity);
  gl.uniform1f(U.bandStrands, cfg.band.strands);
  gl.uniform1f(U.bandCenterY, cfg.band.centerY);
  gl.uniform1f(U.bandHeight, cfg.band.height);
  gl.uniform3f(U.bandFreq, cfg.band.frequency[0], cfg.band.frequency[1], cfg.band.frequency[2]);
  gl.uniform1f(U.bandDepth, cfg.band.depth);
  gl.uniform1f(U.bandCrawl, cfg.band.crawl);
  gl.uniform2f(U.bandWidthPx, cfg.band.widthPx[0], cfg.band.widthPx[1]);
  gl.uniform1f(U.bandOpacity, cfg.band.opacity);
  gl.uniform1f(U.navyFraction, cfg.band.navyFraction);
  gl.uniform1f(U.roseRings, cfg.rosette.rings);
  gl.uniform2f(U.roseRadius, cfg.rosette.radius[0], cfg.rosette.radius[1]);
  gl.uniform1f(U.roseWidth, cfg.rosette.width);
  const roseHarm = new Float32Array(9);
  cfg.rosette.harmonics.slice(0, 3).forEach(([f, a, r], k) => {
    roseHarm[k * 3] = f;
    roseHarm[k * 3 + 1] = a;
    roseHarm[k * 3 + 2] = r;
  });
  gl.uniform3fv(U.roseHarm, roseHarm);
  gl.uniform1f(U.roseDepth, cfg.rosette.depth);
  gl.uniform1f(U.roseCrawl, cfg.rosette.crawl);
  gl.uniform2f(U.roseWidthPx, cfg.rosette.widthPx[0], cfg.rosette.widthPx[1]);
  gl.uniform1f(U.roseOpacity, cfg.rosette.opacity);
  gl.uniform1f(U.roseNavy, cfg.rosette.navyFraction);
  gl.uniform4f(
    U.clearing,
    cfg.clearing.center[0],
    cfg.clearing.center[1],
    cfg.clearing.radius[0],
    cfg.clearing.radius[1],
  );
  gl.uniform2f(U.clearingFx, cfg.clearing.push, cfg.clearing.thin);
  gl.uniform4f(
    U.liquid,
    cfg.liquid.frequency,
    cfg.liquid.amplitude,
    cfg.liquid.speed,
    cfg.liquid.travel,
  );
  gl.uniform4f(
    U.pointerParams,
    cfg.pointer.radius,
    cfg.pointer.bind,
    cfg.pointer.wind,
    cfg.pointer.pitch,
  );
  gl.uniform1f(U.introStagger, cfg.intro.stagger);
  gl.uniform1f(U.nodeSize, cfg.nodes.size);
  gl.uniform3fv(U.teal, cfg.colors.teal);
  gl.uniform3fv(U.mint, cfg.colors.mint);
  gl.uniform3fv(U.navy, cfg.colors.navy);
  gl.uniform3fv(U.grainColor, cfg.colors.grain);
  gl.uniform2f(U.miscOpacity, cfg.opacity.chord, cfg.opacity.node);
  gl.uniform1f(U.grain, cfg.grain);

  // Geometry
  const latticeStrips = buildStrips(cfg.lattice.lines, cfg.lattice.segments);
  const bandStrips = buildStrips(cfg.band.strands, cfg.band.segments);
  const roseStrips = buildStrips(cfg.rosette.rings, cfg.rosette.segments);
  const meshLattice = vao(gl, latticeStrips.verts, 3, latticeStrips.idx);
  const meshBand = vao(gl, bandStrips.verts, 3, bandStrips.idx);
  const meshRose = vao(gl, roseStrips.verts, 3, roseStrips.idx);
  const meshNodes = vao(gl, buildNodes(cfg), 2);
  const meshChords = vao(gl, buildChords(cfg), 2);
  const vaGrain = gl.createVertexArray(); // attribute-less fullscreen triangle

  gl.enable(gl.BLEND);
  gl.blendFuncSeparate(
    gl.SRC_ALPHA,
    gl.ONE_MINUS_SRC_ALPHA,
    gl.ONE,
    gl.ONE_MINUS_SRC_ALPHA,
  );
  const [gr, gg, gb] = cfg.colors.ground;
  gl.clearColor(gr, gg, gb, 1);

  // State
  let dpr = 1;
  let width = 0;
  let height = 0;
  let raf = 0;
  let running = true;
  let visible = document.visibilityState !== "hidden";
  let motion = cfg.motion;
  let motionCurrent = cfg.motion;
  let simTime = 100 + Math.random() * 50; // skip the symmetric zero state
  let last = performance.now();
  // Draw-in intro; 1 = fully drawn. Reduced motion opens on the full field.
  let reveal = cfg.intro.duration > 0 && cfg.motion > 0 ? 0 : 1;
  // Wordmark-hover surge, lerped like motion.
  let focus = 0;
  let focusCurrent = 0;

  const pointer = { x: 0, y: 0, tx: 0, ty: 0, strength: 0, target: 0 };

  let worldHalfWidth = cfg.worldHalfWidth;

  // Portrait viewports zoom in so the composition still fills the frame.
  function worldHalfWidthFor(aspect: number) {
    return cfg.worldHalfWidth * Math.min(1, Math.max(0.7, aspect / 1.6));
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, cfg.maxDpr);
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width * dpr));
    height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
    worldHalfWidth = worldHalfWidthFor(width / height);
    gl.uniform2f(U.viewportPx, width, height);
    gl.uniform1f(U.aspect, width / height);
    gl.uniform1f(U.worldHalfWidth, worldHalfWidth);
    gl.uniform1f(U.dpr, dpr);
  }

  function toWorld(clientX: number, clientY: number) {
    const rect = canvas.getBoundingClientRect();
    const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ny = 1 - ((clientY - rect.top) / rect.height) * 2;
    const aspect = width / height;
    return [nx * worldHalfWidth, (ny * worldHalfWidth) / aspect] as const;
  }

  function onPointerMove(e: PointerEvent) {
    const [x, y] = toWorld(e.clientX, e.clientY);
    pointer.tx = x;
    pointer.ty = y;
    pointer.target = 1;
  }
  function onPointerLeave() {
    pointer.target = 0;
  }
  function onVisibility() {
    visible = document.visibilityState !== "hidden";
    if (visible) {
      last = performance.now();
      schedule();
    }
  }

  function draw() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(U.time, simTime);
    const r = 1 - (1 - reveal) ** 3; // ease-out: fast start, gentle settle
    gl.uniform1f(U.reveal, r);
    gl.uniform1f(U.focus, focusCurrent);
    gl.uniform2f(U.pointer, pointer.x, pointer.y);
    gl.uniform1f(U.pointerStrength, pointer.strength);

    gl.uniform1i(U.mode, 0);
    gl.uniform1i(U.layer, 0);
    gl.bindVertexArray(meshLattice.va);
    gl.drawElements(gl.TRIANGLE_STRIP, meshLattice.count, gl.UNSIGNED_INT, 0);

    gl.uniform1i(U.layer, 1);
    gl.bindVertexArray(meshBand.va);
    gl.drawElements(gl.TRIANGLE_STRIP, meshBand.count, gl.UNSIGNED_INT, 0);

    if (meshRose.count > 0 && cfg.rosette.opacity > 0) {
      gl.uniform1i(U.layer, 2);
      gl.bindVertexArray(meshRose.va);
      gl.drawElements(gl.TRIANGLE_STRIP, meshRose.count, gl.UNSIGNED_INT, 0);
    }

    if (meshChords.count > 0) {
      gl.uniform1i(U.mode, 1);
      gl.bindVertexArray(meshChords.va);
      gl.drawArrays(gl.LINES, 0, meshChords.count);
    }

    if (meshNodes.count > 0) {
      gl.uniform1i(U.mode, 2);
      gl.bindVertexArray(meshNodes.va);
      gl.drawArrays(gl.POINTS, 0, meshNodes.count);
    }

    if (cfg.grain > 0) {
      gl.uniform1i(U.mode, 3);
      gl.bindVertexArray(vaGrain);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    gl.bindVertexArray(null);
  }

  function step(now: number) {
    raf = 0;
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 1 / 20);
    last = now;

    motionCurrent += (motion - motionCurrent) * Math.min(1, dt * 2);
    simTime += dt * motionCurrent;
    if (reveal < 1) reveal = Math.min(1, reveal + dt / cfg.intro.duration);
    focusCurrent += (focus * motionCurrent - focusCurrent) * Math.min(1, dt * 5);

    const k = Math.min(1, dt * 6);
    pointer.x += (pointer.tx - pointer.x) * k;
    pointer.y += (pointer.ty - pointer.y) * k;
    pointer.strength +=
      (pointer.target * motionCurrent - pointer.strength) * Math.min(1, dt * 4);

    draw();

    const idle = motionCurrent < 0.001 && pointer.strength < 0.001;
    if (visible && !idle) schedule();
  }

  function schedule() {
    if (!raf && running) raf = requestAnimationFrame(step);
  }

  const ro = new ResizeObserver(() => {
    resize();
    draw();
    schedule();
  });
  ro.observe(canvas);
  resize();
  draw();

  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("pointerdown", onPointerMove, { passive: true });
  document.addEventListener("pointerleave", onPointerLeave);
  document.addEventListener("visibilitychange", onVisibility);
  schedule();

  return {
    config: cfg,
    setMotion(m) {
      motion = Math.max(0, Math.min(1, m));
      if (motion === 0) reveal = 1; // reduced motion mid-intro → full still frame
      schedule();
    },
    setFocus(f) {
      focus = Math.max(0, Math.min(1, f));
      schedule();
    },
    setPalette(colors, opacityScale = 1) {
      gl.uniform3fv(U.teal, colors.teal);
      gl.uniform3fv(U.mint, colors.mint);
      gl.uniform3fv(U.navy, colors.navy);
      gl.uniform3fv(U.grainColor, colors.grain);
      gl.uniform1f(U.latOpacity, cfg.lattice.opacity * opacityScale);
      gl.uniform1f(U.bandOpacity, cfg.band.opacity * opacityScale);
      gl.uniform1f(U.roseOpacity, cfg.rosette.opacity * opacityScale);
      const [r, g, b] = colors.ground;
      gl.clearColor(r, g, b, 1);
      draw();
      schedule();
    },
    render() {
      draw();
    },
    destroy() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      for (const m of [meshLattice, meshBand, meshRose, meshNodes, meshChords]) {
        gl.deleteVertexArray(m.va);
        gl.deleteBuffer(m.vb);
        if (m.ib) gl.deleteBuffer(m.ib);
      }
      gl.deleteVertexArray(vaGrain);
      gl.deleteProgram(program);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
