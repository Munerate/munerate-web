# munerate. — kick-off brief

*Finance for intelligence.*

This is the brief for the first phase of the munerate website. It is short
on purpose. The point of this phase is one thing: a landing page whose
background is an animation beautiful enough to carry the brand on its own.

## 1. What munerate is

munerate builds the financial core for physical AI — the rails that let
autonomous systems hold value, move it, be paid, be insured, be verified.
The name reads as *remunerate* with the prefix removed, which is the whole
idea: the brand is the root, and every product is a prefix on it —
re·munerate, tele·munerate, pre·munerate, insure·munerate, vault·munerate.

The brand pack (see `docs/brand/` if present, otherwise the reference image
in the project) sets a direction, not a rulebook: navy ink on cream, teal as
the single accent, Space Grotesk, guilloché line-work borrowed from banknotes
and share certificates, and assay-stamp motifs that say *verified, modelled,
insured*. We keep the spirit — engraved trust, made of data — and let what the
code can do decide the final form.

## 2. The landing page

One viewport. No scroll. Three things on it:

1. The wordmark — `munerate` in Space Grotesk 700 with the teal full stop.
2. The tagline — FINANCE FOR INTELLIGENCE, tracked caps, ink-soft.
3. The field — a full-viewport liquid guilloché that everything sits inside.

Plus a header line (name, positioning) and a footer line (year, contact),
both in small tracked caps. Nothing else. No nav, no CTA, no cards, no
gradient blobs, no glass. If a fourth element is proposed, the default answer
is no.

## 3. The field — what we are actually making

The background is the product of this phase. It has to be, in the user's
words, *insanely beautiful*. Here is what that means, concretely.

**It is a guilloché.** A guilloché is a family of curves with slightly
different parameters drawn on top of each other so that their interference
makes a pattern nobody drew — the moiré you see on a banknote. Ours is a wide
elliptical band of ~150 nested curves, each an ellipse modulated by summed
harmonics, phase-shifted per curve so the interference *crawls* slowly around
the band. When still, it should be plausible as an engraving.

**It is liquid.** The whole band is displaced by domain-warped 3D simplex
noise that drifts with time. Neighbouring curves move together, so the band
flexes like a surface — a sheet of engraved metal that has become fluid — not
like smoke. The failure mode to avoid is *turbulence*: if the parallel line
families dissolve into cloud, the noise amplitude is too high or its
frequency too fine.

**It has depth.** Each curve carries a slow three-lobed weave in z. Nearer
strands render stronger, further strands fainter, and mild perspective moves
them at slightly different rates. This is what makes it read as woven rather
than flat, and it is the thing to protect when tuning anything else.

**It is data.** Sparse nodes sit on every fourth curve and pulse gently;
faint chords join nodes across neighbouring curves into a mesh. These are the
agents and the financial data points — the network living inside the
engraving. They are quiet: the field is the subject, the nodes are the
evidence that it's alive.

**It responds.** The pointer is a soft finger in the surface: strands lift
and part around it with a hint of swirl, and settle when it leaves. Subtle
enough that it is discovered, not announced.

**It is restrained in colour.** Teal lines at ~17% opacity on cream, with a
small fraction of curves in navy ink and a slow teal→mint shimmer along each
curve. Overlap does the rest — where lines bunch, they darken into the
guilloché's characteristic dense bands. No glow, no bloom, no additive
blending. It should look like ink, not like light.

The reference for the feeling: a share certificate that has started to
breathe. Or the wave pattern of the brand pack, given a third dimension and a
slow current.

### How to judge a change

Screenshot it. Then ask, in order:

1. Is it more beautiful?
2. Does it still read as engraved money?
3. Does the wordmark still sit comfortably inside it?
4. Is it still 60 fps at 2× DPR on a laptop?

If 1 is yes and any of 2–4 is no, the change is not done yet.

### Where the engine stands

`src/lib/guilloche/` is a working first version of all of the above, written
as raw WebGL2 with zero dependencies (see `docs/ANIMATION.md` for the
mechanics). It renders, animates, freezes under reduced motion, and adapts
density on narrow viewports. It is a starting point, not a finished piece —
the shape of the band, the harmonic mix, the liquid character, the node
density and the pointer behaviour are all expected to move as the piece is
refined. That refinement is the first job.

Ideas worth trying, roughly in order of expected payoff:

- Multiple bands or a band with a torus-knot parameterisation instead of a
  plain ellipse, so the weave crosses itself more.
- Line intensity driven by curvature or by the local density of neighbours
  (a cheap proxy: fewer curves, thicker fade-in where they bunch).
- A second, much sparser layer of navy curves that move on a slower clock.
- Letting the wordmark's dot be a node in the mesh.
- An intro: the field draws itself in over ~2s on first load (animate the
  visible fraction of `t` per curve), then settles into the loop.
- Very slight paper grain via a static noise texture in the fragment shader —
  only if it survives the "ink not light" rule.

Things that will not work and should not be re-tried: additive blending
(turns it into a nebula), per-frame CPU geometry (too slow), SVG (too many
paths), heavy post-processing (kills the engraving feel).

## 4. Design system, minimally

- **Colour:** Navy Ink `#0A1B2E`, Teal `#10B39E`, Mint `#7EE6D1`, Paper
  `#E8ECEF`, Cream `#F7F3E9`. Cream is the ground. Teal is the *only* accent
  and it is used sparingly — the dot, hover states, nodes.
- **Type:** Space Grotesk. Wordmark 700, tightly tracked (−0.045em). Everything
  small is 500 in tracked uppercase (0.18em). Body copy, when it exists, is
  400 at a comfortable measure.
- **Layout:** one gutter token, one fluid type scale, a three-row grid
  (top · hero · bottom). Whitespace is a material.
- **Motion:** the field, plus one rise-in on load. Nothing else animates.
- **Tone:** quiet, exact, a little dry. Lowercase wordmark; sentence case
  everywhere except tracked labels.

Tokens live in `src/styles/tokens.css`. The brand pack's assay stamps,
submark rosette and subbrand lockups are *not* built in this phase; the
`Wordmark` component's `prefix` prop is the only nod to subbrands.

## 5. Subdomains

`tele.munerate.*`, `re.munerate.*`, `pre.munerate.*` and so on will each be
a surface of their own. Decision taken: **landing only for now.** The plan
for when that changes is in `docs/SUBDOMAINS.md`; the repo is shaped so that
it is a small step, not a rewrite. Do not start it unprompted.

## 6. Definition of done for this phase

- `npm run build` clean, `npm run lint` clean, `npm run typecheck` clean.
- The landing renders on Chrome, Safari and Firefox, desktop and mobile.
- 60 fps on a 2020 M1 Air at 2× DPR; ≥30 fps on a mid-range Android phone.
- Reduced motion: one still frame, no RAF loop.
- No WebGL2: cream ground with the wordmark and tagline; nothing broken.
- Lighthouse performance ≥ 95, accessibility 100.
- Someone who has never heard of munerate looks at it and says "oh".

## 7. First tasks for Claude Code

1. `npm install`, `npm run dev`, confirm the landing renders as in
   `docs/screenshots/` (if present) — same field, real Space Grotesk.
2. Run `npm run proto` and spend real time with the field. Read
   `docs/ANIMATION.md`. Try the ideas in §3 one at a time, screenshotting
   each. Keep what makes it more beautiful by the four questions above.
3. Add the draw-in intro.
4. Profile on a real phone; adjust `mobileConfig` if needed.
5. Add `docs/screenshots/` with the accepted desktop and mobile frames so
   future changes have a reference.
