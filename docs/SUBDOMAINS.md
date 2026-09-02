# Subdomain surfaces — decision record

**Status: deferred.** The landing is the only surface in this phase.

## The shape of the brand

Products are prefixes on the root: `re.munerate.*`, `tele.munerate.*`,
`pre.munerate.*`, `insure.`, `vault.`, `royal.`, `market.`… Each is a
subbrand with the lockup `prefix · munerate.` and, eventually, its own
surface.

## Recommended approach when the time comes

**One Next.js app, host-based routing.** Keep a single deploy and a single
design system; let middleware map the host to a route group.

```
src/app/
  (root)/page.tsx            munerate.com
  (sub)/tele/page.tsx        tele.munerate.com
  (sub)/re/page.tsx          re.munerate.com
  …
src/middleware.ts            reads the Host header; rewrites tele.munerate.com/x → /tele/x
```

- `middleware.ts`: parse the first label of the host; if it is a known prefix,
  `NextResponse.rewrite` to `/${prefix}${pathname}`. Unknown prefixes fall
  through to root. Localhost: use `tele.localhost:3000` (Chrome resolves
  `*.localhost` automatically).
- Wildcard DNS `*.munerate.com` → the same deployment; on Vercel add
  `*.munerate.com` as a domain.
- Shared shell: same `layout.tsx`, same tokens, `<Wordmark prefix="tele" />`.
  Each subbrand may pick a different *state* of the field (e.g. a different
  harmonic set or ink mix from `config.ts`) — that is how the family stays
  one thing while each member is recognisable.
- The field engine already supports config overrides per instance; no change
  needed there.

## Rejected alternatives

- **One app per prefix in a monorepo.** Clean isolation, but N deploys and a
  shared-package tax before there is anything to share. Revisit only if a
  subbrand becomes a genuinely separate product with its own team.
- **Path-based (`munerate.com/tele`).** Loses the brand mechanic. No.

## When this is un-deferred

1. Add `src/middleware.ts` and the `(sub)` route group.
2. Add `PREFIXES` to a single constants file; the `Wordmark` and middleware
   both read it.
3. Update `CLAUDE.md` layout and the "out of scope" list.
