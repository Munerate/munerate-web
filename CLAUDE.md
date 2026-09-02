# munerate-web

**munerate** — Finance for intelligence. The financial core for physical AI.

Read `docs/BRIEF.md` before doing anything. It is the kick-off brief and the
statement of taste for this project. `docs/ANIMATION.md` explains how the
background field works and how to tune it.

## What this is right now

A single landing page: the wordmark, the tagline, and a full-viewport liquid
guilloché rendered in WebGL2. That animation is the product of this phase.
Everything else is scaffolding for what comes later (subdomain surfaces —
see `docs/SUBDOMAINS.md`).

## Commands

```
npm install
npm run dev          # Next dev server → http://localhost:3000
npm run build        # production build (must pass before any PR)
npm run lint
npm run typecheck
npm run proto        # bundle the field engine + serve prototype/ on :4173
npm run shot         # headless screenshot of the prototype (needs playwright)
```

`prototype/index.html` is a zero-framework playground for the animation.
Iterate there (`?curves=96&crawl=0.1` overrides any numeric config key,
`?motion=0` freezes it), then the Next page picks up the same module with no
changes. Do not let the prototype and the Next page drift apart.

## Layout

```
src/app/                Next App Router. layout.tsx (font, metadata), page.tsx (landing), globals.css
src/components/         GuillocheField.tsx (client wrapper), Wordmark.tsx
src/lib/guilloche/      the field engine — framework-agnostic, zero deps
  config.ts             every tunable. Tune here first.
  shaders.ts            GLSL ES 3.00. Touch only for new behaviour.
  index.ts              runtime: geometry, GL setup, RAF loop, pointer, resize
src/styles/tokens.css   design tokens — colour, type, spacing. Single source of truth.
prototype/              standalone playground for the field
docs/                   BRIEF, ANIMATION, SUBDOMAINS
scripts/shot.mjs        Playwright screenshot helper
```

## Conventions

- **Zero dependencies unless earned.** The engine is raw WebGL2 on purpose.
  Do not add Three.js, GSAP, Framer Motion, Tailwind or a CSS-in-JS library
  without a stated reason in the PR. The bar is "cannot be done cleanly
  without it".
- **Tokens, not literals.** Colours and type sizes come from
  `src/styles/tokens.css`. The engine mirrors the palette in
  `src/lib/guilloche/config.ts`; if you change one, change the other.
- **Wordmark is type.** `munerate` in Space Grotesk 700, no trailing full
  stop (decision 2026-09-02). Never an image. Subbrands are
  `prefix · munerate` via `<Wordmark prefix="re" />`.
- **Plain CSS, BEM-ish classes**, one `globals.css` for now. Split into
  co-located CSS modules only when a second page exists.
- **Server components by default.** Client components are limited to the
  interaction islands in `src/components/` — `GuillocheField`, `Hero`,
  `ThemeToggle`. The page itself stays a server component.
- **Motion is respectful.** `prefers-reduced-motion` freezes the field to
  one still frame and disables every hover effect. Beyond the field and the
  one-time rise-in, motion is hover-driven only: the wordmark's intaglio
  lift, the field's focus surge, and the ghost URL affixes (`tele·` … `.com`,
  visible only while the mark is hovered).
- **The wordmark is a link** to the one live subbrand —
  https://tele.munerate.com (robotics insurance demo). The other prefixes
  wait in a comment in `src/components/Hero.tsx` until their surfaces
  exist.
- **Two themes, one palette.** Light is the printed note, dark
  (`data-theme="dark"`) is the engraver's plate. Derived tokens flip in
  `src/styles/tokens.css`; the field mirrors them via
  `lightColors`/`darkColors` in `src/lib/guilloche/config.ts` — change one,
  change the other. Theme is chosen by the footer toggle, persisted in
  localStorage, defaulted from `prefers-color-scheme`.
- **Performance budget:** the landing must hit 60 fps on an M1 MacBook Air
  at 2× DPR and stay above 30 fps on a mid-range Android phone. Adaptive
  density lives in `mobileConfig`. Cap DPR at 2.
- **Accessibility:** the canvas is `aria-hidden`. All content is real text.
  Contrast of text on cream must stay AA.
- **No analytics, no cookies, no consent banners** on the landing.
- Commit messages: imperative, one line, no prefix tags.

## When working on the animation

1. Say what you are trying to change *visually* before touching numbers.
2. Change one parameter family at a time (harmonics, liquid, depth, colour).
3. Screenshot before/after with `npm run shot` and look at both.
4. The test is always the question in `docs/BRIEF.md` §3: is it more
   beautiful, and does it still read as engraved money?

## Out of scope for now

Subdomain routing, CMS, auth, forms, blog. Documented as decisions in
`docs/SUBDOMAINS.md`; do not start them unprompted.
