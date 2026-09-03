import Link from "next/link";

/**
 * The node mark — four outer nodes and a heavier centre, fused by liquid
 * necks into an M. It is the wordmark's counterpart: geometry, not type,
 * and never a raster. The outline is exact metaball tangency (node r 12.26,
 * centre r 13.05, stem spread 0.32, diagonal spread 0.38, handle 1.2)
 * fitted to a centred 100×100 box, so it stays crisp from 16px to a plate.
 *
 * `public/favicon.svg` carries the same outline as a static file — if this
 * path changes, change that one too.
 */
export const MARK_PATH =
  "M13.252 27C17.377 29.267 17.377 70.733 13.252 73A12.258 12.258 0 0 1 25.063 73C20.938 70.733 20.938 29.267 25.063 27A12.258 12.258 0 0 1 13.252 27Z M74.937 27C79.062 29.267 79.062 70.733 74.937 73A12.258 12.258 0 0 1 86.748 73C82.623 70.733 82.623 29.267 86.748 27A12.258 12.258 0 0 1 74.937 27Z M20.739 28.413C26.282 27.692 38.807 41.561 37.349 47.329A13.049 13.049 0 0 1 48.148 37.611C42.258 38.455 29.781 24.543 31.08 19.107A12.258 12.258 0 0 1 20.739 28.413Z M68.92 19.107C70.219 24.543 57.742 38.455 51.852 37.611A13.049 13.049 0 0 1 62.651 47.329C61.193 41.561 73.718 27.692 79.261 28.413A12.258 12.258 0 0 1 68.92 19.107Z M6.9 16.258a12.258 12.258 0 1 0 24.516 0a12.258 12.258 0 1 0 -24.516 0Z M68.585 16.258a12.258 12.258 0 1 0 24.516 0a12.258 12.258 0 1 0 -24.516 0Z M6.9 83.742a12.258 12.258 0 1 0 24.516 0a12.258 12.258 0 1 0 -24.516 0Z M68.585 83.742a12.258 12.258 0 1 0 24.516 0a12.258 12.258 0 1 0 -24.516 0Z M36.951 50.527a13.049 13.049 0 1 0 26.097 0a13.049 13.049 0 1 0 -26.097 0Z";

/** The bare glyph. Inherits its colour; decorative by default. */
export function Mark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
    >
      <path fill="currentColor" d={MARK_PATH} />
    </svg>
  );
}

interface HomeMarkProps {
  /** Where home is. Subdomain surfaces pass the apex URL. */
  href?: string;
  label?: string;
}

/**
 * The mark as the site's home button, centred in the top rule. A link and
 * nothing more — hover is CSS only (teal, a 1px lift), so this stays a
 * server component.
 */
export function HomeMark({ href = "/", label = "munerate — home" }: HomeMarkProps) {
  return (
    <Link className="mark-home" href={href} aria-label={label}>
      <Mark className="mark-home__glyph" />
    </Link>
  );
}
