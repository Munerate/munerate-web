/**
 * GLSL ES 3.00 sources for the engraved sheet.
 *
 * One vertex shader serves the stroke layers (lattice + band) and the
 * optional node/chord layer, so every element is displaced by exactly the
 * same math and the whole thing reads as one continuous surface.
 *
 * Strokes are extruded ribbons, not GL lines: each vertex carries
 * (u, lineIndex, side ±1); the shader evaluates the centerline at u and a
 * step ahead, extrudes along the screen-space normal by a per-vertex half
 * width plus one pixel of anti-alias apron, and the fragment shader turns
 * signed distance into coverage. Line weight swells with the depth weave
 * and the wave slope — the thick-thin of a real engraved line.
 *
 * Pipeline per vertex:
 *   centerline → a point on a lattice wave-line or a band strand
 *   clearing   → lines thin and part around the wordmark's calm zone
 *   liquid     → low-frequency breathing warp + a traveling current;
 *                coherent on purpose, so parallel families survive
 *   loupe      → the pointer magnifies the engraving locally
 *   project    → mild perspective from depth, aspect-correct
 */

// 3D simplex noise — Ian McEwan / Ashima Arts (MIT). Kept verbatim on purpose.
const SIMPLEX_NOISE = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
`;

export const VERTEX_SHADER = /* glsl */ `#version 300 es
precision highp float;

#define TAU 6.28318530718

in vec3 aParam;  // x: u along line [0,1] · y: line index · z: side (±1; 0 for points)

uniform float uTime;
uniform vec2  uViewportPx;      // drawing-buffer size in device px
uniform float uAspect;          // width / height
uniform float uWorldHalfWidth;
uniform float uOverscan;        // stroke span past the viewport edges
uniform float uPerspective;
uniform highp int uMode;        // 0 strokes · 1 chords · 2 nodes
uniform highp int uLayer;       // 0 lattice · 1 band · 2 rosette

// lattice
uniform float uLatLines;
uniform vec2  uLatFreq;         // per family
uniform float uLatAmp;
uniform float uLatShear;        // phase advance per unit resting-y
uniform float uLatCrawl;
uniform float uLatWidthPx;
uniform float uLatOpacity;

// band
uniform float uBandStrands;
uniform float uBandCenterY;
uniform float uBandHeight;
uniform vec3  uBandFreq;        // k1, k2 (y braid), kz (depth weave)
uniform float uBandDepth;
uniform float uBandCrawl;
uniform vec2  uBandWidthPx;     // (far, near)
uniform float uBandOpacity;
uniform float uNavyFraction;

// rosette — the engraved eye
uniform float uRoseRings;
uniform vec2  uRoseRadius;      // inner ellipse radii
uniform float uRoseWidth;       // radial extent (outer = inner·(1+w))
uniform vec3  uRoseHarm[3];     // (integer frequency, amplitude, phaseRate)
uniform float uRoseDepth;
uniform float uRoseCrawl;
uniform vec2  uRoseWidthPx;     // (far, near)
uniform float uRoseOpacity;
uniform float uRoseNavy;

// clearing — "the eye": purely an opening, never pinned geometry
uniform vec4  uClearing;        // cx, cy, rx, ry
uniform vec2  uClearingFx;      // push (how far strands part), thin

// liquid
uniform vec4  uLiquid;          // frequency, amplitude, speed, travel

// pointer — "the twine"
uniform vec2  uPointer;
uniform float uPointerStrength;
uniform vec4  uPointerParams;   // radius, bind, wind, pitch

// intro
uniform float uReveal;          // eased 0..1; 1 = fully drawn
uniform float uIntroStagger;

// wordmark hover: the engraving brightens and quickens around the text
uniform float uFocus;           // lerped 0..1

uniform float uDpr;
uniform float uNodeSize;

out float vAlpha;
out float vTone;    // <0 navy ink · 0..1 teal→mint
out float vSeed;
out float vReveal;  // intro draw-in, 0 hidden → 1 drawn
out float vEdgePx;  // signed distance from the centerline in px
out float vHalfPx;  // stroke half width in px

${SIMPLEX_NOISE}

float hash1(float n) { return fract(sin(n * 12.9898) * 43758.5453); }

// 1 inside the wordmark's calm zone, 0 outside.
float clearingAt(vec2 q) {
  vec2 d = (q - uClearing.xy) / uClearing.zw;
  return 1.0 - smoothstep(0.7, 1.4, length(d));
}

// Centerline of stroke i at parameter u. "full" also applies the noise part
// of the liquid (the tangent samples skip it — it is too low-frequency to
// change orientation). Outputs the engraver's width factor and the clearing
// falloff at this point.
vec3 centerline(float u, float i, bool full, out float wfac, out float clr) {
  float spanX = uWorldHalfWidth * uOverscan;
  float x = mix(-spanX, spanX, u);
  float y;
  float z;

  if (uLayer == 2) {
    // -------- rosette: nested oval rings, integer harmonics — the
    // machine-exact medallion. u is the angle around the ellipse.
    float n = i / max(uRoseRings - 1.0, 1.0);
    float th = u * TAU;
    float phase = n * TAU * 0.4 + uTime * uRoseCrawl;
    float ring = 1.0 + uRoseWidth * n;
    float rr = ring;
    for (int k = 0; k < 3; k++) {
      rr += uRoseHarm[k].y * sin(uRoseHarm[k].x * th + phase * uRoseHarm[k].z);
    }
    x = uClearing.x + cos(th) * uRoseRadius.x * rr;
    y = uClearing.y + sin(th) * uRoseRadius.y * rr;
    z = uRoseDepth * sin(3.0 * th + phase * 2.0);
    clr = 0.0;
    float slope = cos(uRoseHarm[0].x * th + phase * uRoseHarm[0].z);
    wfac = 0.75 + 0.45 * slope * slope;
  } else if (uLayer == 0) {
    // -------- lattice: two interleaved wave families, denser at the edges
    float n = i / max(uLatLines - 1.0, 1.0);
    float fam = mod(i, 2.0);
    float v = n * 2.0 - 1.0;
    float spanY = (uWorldHalfWidth / uAspect) * 1.15;
    float y0 = sign(v) * pow(abs(v), 0.85) * spanY;
    clr = clearingAt(vec2(x, y0));
    float freq = fam < 0.5 ? uLatFreq.x : uLatFreq.y;
    float dir = fam < 0.5 ? 1.0 : -1.0;
    float ph = uLatShear * y0 + fam * 1.5707963 + uTime * uLatCrawl * dir;
    float amp = uLatAmp * (1.0 - 0.85 * clr);
    float c1 = sin(freq * x + ph);
    float c2 = sin(freq * 2.618 * x + ph * 1.7);
    y = y0 + amp * (c1 + 0.35 * c2);
    z = 0.06 * sin(freq * 0.5 * x + ph);
    float slope = cos(freq * x + ph);
    wfac = 0.8 + 0.4 * slope * slope;
  } else {
    // -------- band: a braided sheaf through the middle. Near the wordmark
    // the waves calm and the sheaf parts — the eye opening — but every
    // strand keeps its full motion; nothing is pinned to any contour.
    float n = i / max(uBandStrands - 1.0, 1.0);
    float phi = (n - 0.5) * TAU;
    float y0 = uBandCenterY + (n - 0.5) * 2.0 * uBandHeight * 0.4;
    float clr0 = clearingAt(vec2(x, y0));
    float ph1 = uBandFreq.x * x + phi * 2.0 + uTime * uBandCrawl;
    float ph2 = uBandFreq.y * x - phi * 3.0 - uTime * uBandCrawl * 0.7;
    float env = uBandHeight * (1.0 - 0.75 * clr0);
    y = y0 + env * (0.6 * sin(ph1) + 0.35 * sin(ph2));
    // the eye opens: strands part around the text, waves intact
    y += uClearingFx.x * clr0 * tanh((y0 - uClearing.y) / 0.22);
    z = uBandDepth * sin(uBandFreq.z * x + phi * 2.0 + uTime * uBandCrawl * 0.5);
    vec2 qf = vec2((x - uClearing.x) / uClearing.z, (y - uClearing.y) / uClearing.w);
    clr = 1.0 - smoothstep(0.55, 0.95, length(qf));
    float slope = cos(ph1);
    wfac = 0.78 + 0.44 * slope * slope;
  }

  vec3 p = vec3(x, y, z);

  // -------- liquid: a slow current under the metal, coherent on purpose
  float tt = uTime * uLiquid.z;
  p.y += uLiquid.w * sin(1.3 * p.x - uTime * 0.35 + p.z * 2.0);
  if (full && uLiquid.y > 0.0001) {
    vec2 q = p.xy * uLiquid.x;
    p.x += uLiquid.y * snoise(vec3(q, tt));
    p.y += uLiquid.y * snoise(vec3(q + 4.7, tt * 0.9));
  }

  // -------- the twine: strands bind and wind under the pointer.
  // Bind pulls the sheaf toward its axis; wind adds a small bounded helix
  // per strand, phased into three plies (phi·3), so neighbouring strands
  // visibly wrap around each other like rope — the z component runs the
  // helix through the existing over/under width and alpha.
  vec2 d = p.xy - uPointer;
  float s = uPointerParams.x;
  float fall = exp(-dot(d, d) / (2.0 * s * s)) * uPointerStrength;
  if (uLayer == 1) {
    float n = i / max(uBandStrands - 1.0, 1.0);
    float phi = (n - 0.5) * TAU;
    float axisY = uBandCenterY + uLiquid.w * sin(1.3 * p.x - uTime * 0.35);
    float thetaH = (p.x - uPointer.x) * uPointerParams.w + phi * 3.0 + uTime * 0.5;
    p.y = mix(p.y, axisY, uPointerParams.y * fall);
    p.y += uPointerParams.z * fall * cos(thetaH);
    p.z += uPointerParams.z * fall * sin(thetaH) * 2.0;
  } else if (uLayer == 0) {
    // the ground only breathes toward the binding; the rosette never moves
    p.y += (uPointer.y - p.y) * 0.12 * uPointerParams.y * fall;
  }

  return p;
}

vec2 clipOf(vec3 p) {
  float persp = 1.0 / (1.0 + p.z * uPerspective);
  return p.xy * persp / vec2(uWorldHalfWidth, uWorldHalfWidth / uAspect);
}

void main() {
  // ---- paper grain: a fullscreen triangle, no attributes needed
  if (uMode == 3) {
    vec2 xy = vec2(gl_VertexID == 1 ? 3.0 : -1.0, gl_VertexID == 2 ? 3.0 : -1.0);
    gl_Position = vec4(xy, 0.0, 1.0);
    gl_PointSize = 1.0;
    vAlpha = 0.0;
    vTone = -1.0;
    vSeed = 0.0;
    vReveal = 1.0;
    vEdgePx = 0.0;
    vHalfPx = 0.0;
    return;
  }

  float u = aParam.x;
  float i = aParam.y;
  float side = aParam.z;

  // ---- intro: strokes sweep left→right, staggered from the centre out
  float stagKey;
  float lineN;
  if (uLayer == 0) {
    lineN = i / max(uLatLines - 1.0, 1.0);
    stagKey = pow(abs(lineN * 2.0 - 1.0), 0.8);
  } else if (uLayer == 1) {
    lineN = i / max(uBandStrands - 1.0, 1.0);
    stagKey = abs(lineN - 0.5) * 2.0;
  } else {
    lineN = i / max(uRoseRings - 1.0, 1.0);
    stagKey = lineN; // the medallion turns itself in from the inside out
  }
  float sweep = clamp(uReveal * (1.0 + uIntroStagger) - uIntroStagger * stagKey, 0.0, 1.0);
  float uOrig = u;
  if (uMode == 0) u = min(u, sweep);
  vReveal = uMode == 0 ? step(uOrig, sweep) : smoothstep(uOrig - 0.03, uOrig, sweep);

  float wfac;
  float clr;
  vec3 p = centerline(u, i, true, wfac, clr);

  // ---- depth → nearness (per-layer z range)
  float zRange = uLayer == 0 ? 0.06 : max(uLayer == 1 ? uBandDepth : uRoseDepth, 1e-3);
  float near = clamp(0.5 - 0.5 * p.z / zRange, 0.0, 1.0);

  // ---- tone
  if (uLayer == 0) {
    vTone = -1.0;
  } else {
    float inkFrac = uLayer == 1 ? uNavyFraction : uRoseNavy;
    float navy = step(hash1(i + 0.5), inkFrac);
    float shimmer = 0.5 + 0.5 * sin(uOrig * TAU + uTime * 0.3 + lineN * 5.0);
    // bias toward teal; mint only tips the crests — focus lets more mint out
    shimmer = pow(shimmer, 2.0 - 0.8 * uFocus);
    vTone = mix(shimmer, -1.0, navy);
  }
  vSeed = hash1(i * 7.31 + uOrig * 1.93);

  // ---- alpha & width (fall = twine tighten)
  float thin = 1.0 - uClearingFx.y * clr;
  vec2 dp = p.xy - uPointer;
  float ps = uPointerParams.x;
  float fall = exp(-dot(dp, dp) / (2.0 * ps * ps)) * uPointerStrength;
  if (uLayer == 0) {
    vAlpha = uLatOpacity * mix(0.72, 1.0, near) * thin;
    vHalfPx = 0.5 * uLatWidthPx * uDpr * mix(0.8, 1.2, near) * wfac * (1.0 - 0.35 * clr);
  } else if (uLayer == 1) {
    // wordmark hover: ink deepens and strokes swell around the eye
    vec2 qe = (p.xy - uClearing.xy) / uClearing.zw;
    float surge = uFocus * (1.0 - smoothstep(0.7, 1.9, length(qe)));
    vAlpha = uBandOpacity * mix(0.35, 1.0, near) * thin * (1.0 + 0.35 * surge);
    vHalfPx = 0.5 * mix(uBandWidthPx.x, uBandWidthPx.y, near) * uDpr * wfac
              * (1.0 - 0.3 * clr) * (1.0 + 0.35 * fall) * (1.0 + 0.2 * surge);
  } else {
    vAlpha = uRoseOpacity * mix(0.45, 1.0, near);
    vHalfPx = 0.5 * mix(uRoseWidthPx.x, uRoseWidthPx.y, near) * uDpr * wfac;
  }
  vAlpha *= vReveal;

  // ---- extrude ribbon along the screen-space normal
  if (uMode == 0) {
    float du = 0.002;
    float wf2;
    float cl2;
    vec3 pa = centerline(u, i, false, wf2, cl2);
    vec3 pb = centerline(u + du, i, false, wf2, cl2);
    vec2 tpx = (clipOf(pb) - clipOf(pa)) * uViewportPx;
    tpx = normalize(tpx + vec2(1e-6, 0.0));
    vec2 npx = vec2(-tpx.y, tpx.x);
    float extrudePx = vHalfPx + 1.0;
    vEdgePx = side * extrudePx;
    vec2 clip = clipOf(p) + side * npx * extrudePx * 2.0 / uViewportPx;
    gl_Position = vec4(clip, 0.0, 1.0);
    gl_PointSize = 1.0;
  } else {
    vEdgePx = 0.0;
    gl_Position = vec4(clipOf(p), 0.0, 1.0);
    if (uMode == 2) {
      float pulse = 1.0 + 0.3 * sin(uTime * 1.4 + vSeed * TAU);
      gl_PointSize = uNodeSize * uDpr * (0.7 + 0.6 * near) * pulse;
    } else {
      gl_PointSize = 1.0;
    }
  }
}
`;

export const FRAGMENT_SHADER = /* glsl */ `#version 300 es
precision highp float;

in float vAlpha;
in float vTone;
in float vSeed;
in float vReveal;
in float vEdgePx;
in float vHalfPx;

uniform highp int uMode;
uniform vec3 uTeal;
uniform vec3 uMint;
uniform vec3 uNavy;
uniform vec2 uMiscOpacity;  // (chord, node)
uniform float uGrain;       // paper grain opacity (0 disables)
uniform vec3 uGrainColor;   // navy on the note, near-black on the plate

out vec4 fragColor;

void main() {
  vec3 col;
  float a;

  if (uMode == 3) {
    // static paper fibre — darkening only, never light
    float h = fract(sin(dot(floor(gl_FragCoord.xy), vec2(12.9898, 78.233))) * 43758.5453);
    fragColor = vec4(uGrainColor, uGrain * h * h);
    return;
  }

  if (uMode == 2) {
    vec2 c = gl_PointCoord * 2.0 - 1.0;
    float d = dot(c, c);
    if (d > 1.0) discard;
    float disc = 1.0 - smoothstep(0.45, 1.0, d);
    col = vSeed > 0.94 ? uNavy : uTeal;
    a = uMiscOpacity.y * disc * vReveal;
  } else {
    // analytic coverage: 1px linear ramp at the ribbon edge; hairline
    // strokes (halfPx < 0.5) never reach full coverage — thin ink, not
    // a dimmer line of light
    float cov = clamp(vHalfPx + 0.5 - abs(vEdgePx), 0.0, 1.0);
    col = vTone < 0.0 ? uNavy : mix(uTeal, uMint, vTone);
    a = (uMode == 1 ? uMiscOpacity.x : vAlpha) * cov;
    if (uMode == 1) a *= vReveal;
  }

  fragColor = vec4(col, a);
}
`;
