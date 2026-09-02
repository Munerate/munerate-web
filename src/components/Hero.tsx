"use client";

import { useEffect, useRef, useState } from "react";
import { Wordmark } from "@/components/Wordmark";

/**
 * Subbrand prefixes. One live surface for now — the robotics insurance
 * demo at tele.munerate.com — the rest return when their surfaces exist:
 * "re", "pre", "retro", "micro", "poly", "para", "com", "auto", "inter".
 */
const PREFIX = "tele";
const HREF =
  process.env.NODE_ENV === "production"
    ? "https://tele.munerate.com"
    : "http://tele.localhost:3000";

/**
 * The hero: wordmark + tagline, with the "intaglio lift" hover — the type
 * leans toward the cursor and rises off the page on layered ink shadows.
 * While hovered, ghost affixes complete the live subbrand URL around the
 * mark (tele· … .com) and the whole mark is a link to it. Hovering also
 * surges the field via the `munerate:focus` event (picked up by
 * GuillocheField). Tilt and ghosts sit out under reduced motion.
 */
export function Hero() {
  const stageRef = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const [hovered, setHovered] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const setVars = (lift: number, dx: number, dy: number) => {
    const el = stageRef.current;
    if (!el) return;
    el.style.setProperty("--lift", String(lift));
    el.style.setProperty("--tilt-x", `${(-dy * 6).toFixed(2)}deg`);
    el.style.setProperty("--tilt-y", `${(dx * 7).toFixed(2)}deg`);
    el.style.setProperty("--dx", dx.toFixed(3));
    el.style.setProperty("--dy", dy.toFixed(3));
  };

  const focus = (f: number) =>
    window.dispatchEvent(new CustomEvent("munerate:focus", { detail: f }));

  const onPointerMove = (e: React.PointerEvent) => {
    if (reduced) return;
    const el = stageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const dy = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => setVars(1, dx, dy));
  };

  const onPointerEnter = () => {
    setHovered(true);
    if (!reduced) focus(1);
  };

  const onPointerLeave = () => {
    setHovered(false);
    cancelAnimationFrame(raf.current);
    setVars(0, 0, 0);
    focus(0);
  };

  return (
    <section className="landing__hero">
      <div
        ref={stageRef}
        className="hero__stage"
        data-hover={hovered && !reduced ? "" : undefined}
        onPointerMove={onPointerMove}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
      >
        <a
          className="hero__link"
          href={HREF}
          aria-label={`munerate — visit ${PREFIX}.munerate.com`}
        >
          <span className="hero__prefix" aria-hidden="true">
            {PREFIX}
            <span className="hero__affix-dot">·</span>
          </span>
          <Wordmark />
          <span className="hero__suffix" aria-hidden="true">
            <span className="hero__affix-dot">.</span>com
          </span>
        </a>
      </div>
      <p className="tagline">Finance for intelligence</p>
    </section>
  );
}
