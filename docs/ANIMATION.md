# The engraved sheet — how it works

`src/lib/guilloche/` renders the field: a full-viewport engraved surface —
a banknote become liquid. Raw WebGL2, no dependencies, three files.

## The idea in one paragraph

Every stroke vertex is a triple: `u` (where along a line, 0…1), `i` (which
line) and `side` (±1, which edge of the ribbon). That is the whole vertex
buffer, uploaded once. Each frame the vertex shader turns `(u, i, time)`
into a centerline point, extrudes it sideways into a ribbon of the right
pixel width, and the fragment shader turns signed distance into anti-aliased
coverage. Nothing is computed on the CPU per frame. Two stroke draw calls
(lattice, band) + a fullscreen grain triangle; optional nodes/chords are off
by default.

## The composition

- **Lattice** — two interleaved families of fine navy wave-lines covering
  the whole viewport and bleeding past every edge (`overscan`). The families
  are slightly detuned (`frequency: [a, b]`) and phase-sheared by resting-y,
  so their interference makes the moiré. Denser toward the edges
  (`pow(|v|, 0.85)` spacing).
- **Band** — a braided sheaf of heavier strands sweeping horizontally
  through the middle third and off both sides. Two y-harmonics with
  per-strand phase spread braid them; a z-weave (`frequency[2]`, `depth`)
  gives over/under with mild perspective. Teal→mint shimmer lives here
  (biased toward teal; mint only tips the crests); `navyFraction` of the
  strands are ink.
- **The eye** — purely an opening in the moving field, never geometry.
  Near the wordmark the band's wave amplitude calms (`1 − 0.75·clr`),
  strands part above/below the text (`clearing.push`, a smooth `tanh`
  split), and whatever passes through the middle thins to faint ghosts
  (`clearing.thin`). Every strand keeps its full motion and cursor
  response everywhere, including inside the eye. **No stroke is ever
  pinned to a contour — this is a hard rule from the user.**
- **The rosette** (`rosette.*`) — a separate machine-exact oval medallion
  layer, **retired** (rings/opacity 0): it framed the text perfectly but
  read as a static ornament pasted over the field, not native to it. The
  code remains for reference.
- **Grain** — one static fullscreen triangle of per-pixel navy specks
  (`grain`). Darkening only, never light.

## The vertex pipeline (`shaders.ts`)

```
centerline(u, i)      lattice: y = y0 + amp·(sin(f·x + ph) + 0.35·sin(2.618f·x + 1.7ph))
                      band:    y = y0 + env·(0.6·sin(k1·x + 2φ) + 0.35·sin(k2·x − 3φ))
                               z = depth·sin(kz·x + 2φ)          ← over/under weave
the eye               waves calm near the text; strands part via
                      push·clr·tanh(dy) and thin inside — an opening, only
liquid                travelling wave along x + low-frequency snoise warp
                      (coherent on purpose: parallel families must survive)
the twine             under the pointer, band strands bind toward their axis
                      and each gets a bounded helix phased into three plies
                      (φ·3) — neighbours wrap around each other like rope;
                      the helix z runs through the over/under width+alpha.
                      Acts everywhere — the only falloff is distance from
                      the cursor; no location is ever exempt from motion
extrude               tangent from two cheap samples → screen-space normal
                      → offset by halfWidthPx + 1px AA apron
project               persp = 1/(1 + z·perspective), aspect-correct
```

Stroke width is where the engraving lives: it swells with the depth weave
(nearer = heavier) and with the wave slope (`wfac`) — the thick-thin line of
real intaglio. Hairline strokes (half width < 0.5px) never reach full
coverage in the fragment shader, so thin lines are *lighter ink*, not dimmer
light.

Varyings: `vAlpha` (layer opacity × nearness × clearing), `vTone` (<0 navy,
else teal→mint), `vEdgePx`/`vHalfPx` (AA coverage), `vReveal` (intro),
`vSeed` (nodes).

The intro is a uniform `uReveal` (eased 0→1 over `intro.duration` seconds):
strokes sweep left→right, staggered from the centre rows outward by
`intro.stagger`. Vertices past the pen collapse onto it and go transparent.
Reduced motion — or `setMotion(0)` mid-intro — snaps straight to the full
field.

## Tuning (`config.ts`)

| Want to change…                  | Touch                                     |
|----------------------------------|-------------------------------------------|
| Ground texture character         | `lattice.frequency` (detune = moiré), `.amplitude`, `.phaseShear` |
| Ground density / fineness        | `lattice.lines`, `.widthPx`, `.opacity`   |
| Band silhouette                  | `band.height`, `.centerY`, `.strands`     |
| Band braid character             | `band.frequency` (k1 swell, k2 braid, kz weave), `.depth` |
| Band ink weight                  | `band.widthPx` [far, near], `.opacity`, `.navyFraction` |
| The eye's size and opening       | `clearing.radius`, `.push` (how far strands part) |
| Ghosting inside the eye          | `clearing.thin`                           |
| How liquid it is                 | `liquid.amplitude`/`.frequency` (breathing), `.travel` (current), `.speed` |
| Moiré crawl speed                | `lattice.crawl`, `band.crawl`             |
| Pointer twine                    | `pointer.radius`, `.bind` (converge), `.wind` (helix amplitude), `.pitch` |
| Paper feel                       | `grain` (0 disables)                      |
| Draw-in intro                    | `intro.duration` (0 disables), `.stagger` |

Rules of thumb learned so far:

- **Precision is the product.** The user's standard is "the Royal Mint
  would be happy" — free noise is banned (`liquid.amplitude` is 0; all
  motion is periodic: crawl, travelling wave, shimmer). If a change makes
  the field look hand-drawn or organic, it is wrong.
- The eye went through four rejected forms before settling — none is to be
  re-tried: (a) organic radial gather of waving strands = smoke;
  (b) a separate rosette medallion layer = pasted-on, not native;
  (c) exact per-strand contours = "hard candy in a wrapper", static;
  (d) even *partial* contour adherence still read as static lines.
  **The user's final ruling: NO STATIC LINES, ever.** The eye is only an
  opening — calmed waves, a tanh part, interior thinning — in a field
  where every stroke keeps moving.
- Anything low-frequency at visible amplitude on the ring reads as wobble.
  The ring must be exact; the character comes from the nested ring spread
  and the ink/teal alternation, not from scallops.

- The engraved read comes from **coherence**: the travelling wave and the
  low-frequency warp move neighbouring lines together. Anything that makes
  neighbours diverge (high `liquid.frequency`, big amplitude) turns the
  sheet back into smoke.
- `lattice.phaseShear` above ~2 produces strong vertical column artifacts;
  ~1.2 gives the woven watermark texture.
- The band needs to be clearly *heavier* than the lattice (opacity ×3,
  width ×3 at the near edge) or the composition collapses into one texture.
- Line-weight modulation (`wfac`, near/far width) does more for the
  engraving feel than any opacity change.
- The twine only works with a *bounded* helix per strand. The first attempt
  rotated each strand's raw offset vector around the band axis — near the
  eye those offsets are large and the pointer buried the wordmark in coils.
  Do not re-try; amplitude-bounded displacement plus bind is the shape of
  the fix. Keep `pointer.radius` well under 0.45 — the Gaussian's reach is
  ~2× that in world units.

## Runtime (`index.ts`)

- `createGuillocheField(canvas, overrides)` →
  `{ destroy, setMotion, setFocus, setPalette, render, config }`
  or `null` if WebGL2 is unavailable.
- `setFocus(0..1)` is the wordmark-hover surge (lerped like motion): band
  ink deepens ×1.35 and strokes swell ×1.2 around the eye, and the shimmer
  bias opens so more mint tips out (`uFocus`). The page drives it via a
  `munerate:focus` CustomEvent that `GuillocheField.tsx` forwards.
- `setPalette(colors, opacityScale)` swaps the colour uniforms + clear
  colour live (theme change, no rebuild). `lightColors` is the printed
  note; `darkColors` is the engraver's plate (near-black ground, ink lines
  become paper) with opacityScale ≈ 1.3 — thin light lines on dark need
  more alpha. Grain keeps its own colour (`uGrainColor`) so it *darkens*
  in both themes.
- Resize via `ResizeObserver`; DPR capped by `maxDpr`. Portrait viewports
  zoom in (`worldHalfWidthFor`) so the composition still fills the frame.
- Pointer is read from `window`, not the canvas (the canvas is
  `pointer-events: none`). Position and strength are lerped.
- `motion` is lerped too. At 0 the loop stops scheduling itself once the
  pointer has settled — reduced motion costs nothing.
- Hidden tab → loop pauses; visible → resumes with the clock reset.
- `destroy()` releases buffers, VAOs, program and the context.

## Prototype workflow

```
npm run proto           # esbuild bundle → prototype/dist/field.js, served on :4173
open http://localhost:4173/prototype/
```

Query overrides: any numeric config key, nested ones via dot-paths, e.g.
`?lattice.amplitude=0.2&band.opacity=0.4&motion=0`. `?grain=0` kills the
paper, `?intro.duration=0` skips the draw-in, `?theme=dark` opens on the
plate. The `plate`/`focus` buttons exercise `setPalette`/`setFocus`.
`window.field` is the live instance. `npm run shot -- <url> <out.png> <w> <h>` captures a frame
headlessly (uses SwiftShader, so ignore its fps).

## Known limits / next steps

- Array-valued config keys (`lattice.frequency`, `band.frequency`,
  `band.widthPx`) cannot be overridden from the query string.
- Nodes/chords survive in the code (placed on band strands) but are off by
  default — the dots-and-wires look was the "generic wireframe" tell.
- Untried: a rosette accent, curvature-driven density in the lattice,
  a second much slower lattice layer for parallax.
