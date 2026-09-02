/**
 * The engraved sheet — tunable parameters.
 *
 * Everything that changes how the field *looks* lives here so that the
 * shader and runtime stay mechanical. Tune here first; touch shaders.ts
 * only when a new kind of behaviour is needed.
 *
 * The composition is two stroke layers drawn through one ribbon engine:
 *   lattice — two interleaved families of fine navy wave-lines covering the
 *             whole viewport, whose interference makes the moiré
 *   band    — a woven sheaf of heavier strands sweeping horizontally
 *             through the middle and off both sides
 * plus a lens-shaped clearing around the wordmark that both layers thin
 * and part around.
 */

export type RGB = [number, number, number];

export interface GuillocheConfig {
  /** Ground lattice: the full-bleed security-print wave field. */
  lattice: {
    /** Total lines; even indices are family A, odd family B. */
    lines: number;
    /** Segments per line. */
    segments: number;
    /** Wave frequency per family (world units). Slightly detuned ⇒ moiré. */
    frequency: [number, number];
    /** Wave amplitude (world units). A few line-spacings ⇒ families cross. */
    amplitude: number;
    /** Phase advance per unit of a line's resting y — shears the moiré. */
    phaseShear: number;
    /** Phase drift speed (families counter-rotate). */
    crawl: number;
    /** Stroke width in device-independent px. */
    widthPx: number;
    opacity: number;
  };
  /** Hero band: the woven strand sheaf through the middle third. */
  band: {
    strands: number;
    segments: number;
    /** Vertical centre in world units (0 = viewport centre). */
    centerY: number;
    /** Vertical half-extent of the sheaf. */
    height: number;
    /** Braid frequencies: [k1, k2, kz] — two y-harmonics and the z-weave. */
    frequency: [number, number, number];
    /** Depth amplitude of the over/under weave. */
    depth: number;
    crawl: number;
    /** Stroke width range [far, near] in px — the swelling engraved line. */
    widthPx: [number, number];
    opacity: number;
    /** Fraction of strands drawn in navy ink instead of teal shimmer. */
    navyFraction: number;
  };
  /**
   * The rosette: a machine-exact oval guilloché medallion framing the
   * wordmark — nested rings with integer harmonics, the banknote's
   * portrait-oval lathework. This is the eye, engraved.
   */
  rosette: {
    rings: number;
    segments: number;
    /** Inner ellipse radii in world units (should match `clearing.radius`). */
    radius: [number, number];
    /** Radial extent: outer ring sits at inner × (1 + width). */
    width: number;
    /** [frequency (integer!), amplitude, phaseRate] triplets. */
    harmonics: Array<[number, number, number]>;
    /** Over/under weave depth. */
    depth: number;
    /** Moiré rotation speed. */
    crawl: number;
    /** Stroke width range [far, near] in px. */
    widthPx: [number, number];
    opacity: number;
    /** Fraction of rings in navy ink (the rest shimmer teal). */
    navyFraction: number;
  };
  /**
   * The eye: purely an opening in the moving field — waves calm, strands
   * part and thin around the text. Nothing is ever pinned to a contour.
   */
  clearing: {
    center: [number, number];
    /** Ellipse radii in world units. */
    radius: [number, number];
    /** How far band strands part around the text (world units). */
    push: number;
    /** Opacity reduction inside (0 = no change, 1 = fully blank). */
    thin: number;
  };
  /** The current under the metal. Coherent — parallelism survives. */
  liquid: {
    /** Spatial frequency of the breathing warp (low = whole-sheet). */
    frequency: number;
    /** Amplitude of the breathing warp (world units). */
    amplitude: number;
    /** Time speed of the warp. */
    speed: number;
    /** Amplitude of the traveling wave running along the lines. */
    travel: number;
  };
  /**
   * Pointer as binding: band strands converge (bind) and wind helically
   * around their common axis (wind, at pitch turns per world unit) under
   * the cursor — twine tightening. Radius in world units.
   */
  pointer: { radius: number; bind: number; wind: number; pitch: number };
  /** Optional data nodes on band strands (off by default — kept quiet). */
  nodes: { curveStride: number; perCurve: number; size: number };
  chords: { enabled: boolean };
  /** Amount of perspective applied to depth (0 = orthographic). */
  perspective: number;
  /** World half-width mapped to the viewport width. */
  worldHalfWidth: number;
  /** Overscan factor — how far strokes run past the viewport edges. */
  overscan: number;
  colors: { ground: RGB; teal: RGB; mint: RGB; navy: RGB; grain: RGB };
  /** Opacities for the optional node/chord layer. */
  opacity: { chord: number; node: number };
  /** Static paper-fibre grain opacity (0 disables). Darkening only. */
  grain: number;
  /** Draw-in intro; duration 0 (or reduced motion) skips to the full field. */
  intro: { duration: number; stagger: number };
  /** Global time multiplier. 0 freezes the field (reduced motion). */
  motion: number;
  maxDpr: number;
}

const hex = (h: string): RGB => {
  const n = parseInt(h.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

/** Brand palette — mirror of src/styles/tokens.css. Keep in sync. */
export const palette = {
  navy: hex("#0A1B2E"),
  teal: hex("#10B39E"),
  mint: hex("#7EE6D1"),
  paper: hex("#E8ECEF"),
  cream: hex("#F7F3E9"),
} as const;

/** Light mode — the printed note. */
export const lightColors: GuillocheConfig["colors"] = {
  ground: palette.cream,
  teal: palette.teal,
  mint: palette.mint,
  navy: palette.navy,
  grain: palette.navy,
};

/**
 * Dark mode — the engraver's plate: near-black steel, the same line-work
 * as bright cut metal. "navy" is the ink-line slot, so here it is paper.
 */
export const darkColors: GuillocheConfig["colors"] = {
  ground: hex("#071220"),
  teal: palette.teal,
  mint: palette.mint,
  navy: palette.paper,
  grain: hex("#02070D"),
};

export const defaultConfig: GuillocheConfig = {
  lattice: {
    lines: 110,
    segments: 360,
    frequency: [4.6, 5.35],
    amplitude: 0.15,
    phaseShear: 1.2,
    crawl: 0.05,
    widthPx: 0.9,
    opacity: 0.17,
  },
  band: {
    strands: 80,
    segments: 480,
    centerY: 0,
    height: 0.5,
    frequency: [2.2, 4.5, 2.6],
    depth: 0.4,
    crawl: 0.07,
    widthPx: [0.7, 3.0],
    opacity: 0.55,
    navyFraction: 0.3,
  },
  rosette: {
    rings: 0, // retired: a separate medallion read as pasted-on, not native
    segments: 360,
    radius: [1.2, 0.62],
    width: 0.24,
    harmonics: [
      [16, 0.01, 2],
      [24, 0.006, -3],
      [40, 0.003, 1],
    ],
    depth: 0.03,
    crawl: 0.06,
    widthPx: [0.55, 1.7],
    opacity: 0,
    navyFraction: 0.75,
  },
  clearing: {
    center: [0, 0],
    radius: [1.08, 0.5],
    push: 0.3,
    thin: 0.8,
  },
  liquid: { frequency: 0.32, amplitude: 0, speed: 0.06, travel: 0.015 },
  pointer: { radius: 0.3, bind: 0.6, wind: 0.12, pitch: 7.0 },
  nodes: { curveStride: 6, perCurve: 0, size: 2.2 },
  chords: { enabled: false },
  perspective: 0.32,
  worldHalfWidth: 2.1,
  overscan: 1.18,
  colors: lightColors,
  opacity: { chord: 0.1, node: 0.75 },
  grain: 0.05,
  intro: { duration: 2.4, stagger: 0.5 },
  motion: 1,
  maxDpr: 2,
};

/** Reduced-density variant for narrow / low-power devices. */
export const mobileConfig: Partial<GuillocheConfig> = {
  lattice: { ...defaultConfig.lattice, lines: 64, segments: 240 },
  band: { ...defaultConfig.band, strands: 44, segments: 320 },
  rosette: { ...defaultConfig.rosette, rings: 30, segments: 360 },
  maxDpr: 1.5,
};

/** Object-valued keys that merge field-by-field instead of being replaced. */
const NESTED = [
  "lattice",
  "band",
  "rosette",
  "clearing",
  "liquid",
  "pointer",
  "nodes",
  "chords",
  "colors",
  "opacity",
  "intro",
] as const;

function merge(base: GuillocheConfig, over: Partial<GuillocheConfig>): GuillocheConfig {
  const out = { ...base, ...over };
  for (const key of NESTED) {
    if (over[key]) (out as Record<string, unknown>)[key] = { ...base[key], ...over[key] };
  }
  return out;
}

export function resolveConfig(
  overrides: Partial<GuillocheConfig> = {},
  viewportWidth = typeof window === "undefined" ? 1440 : window.innerWidth,
): GuillocheConfig {
  const base =
    viewportWidth < 768 ? merge(defaultConfig, mobileConfig) : defaultConfig;
  return merge(base, overrides);
}
