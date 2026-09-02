"use client";

import { useEffect, useRef } from "react";
import {
  createGuillocheField,
  darkColors,
  lightColors,
  type GuillocheConfig,
} from "@/lib/guilloche";

interface Props {
  /** Partial overrides for the field config. Tune in src/lib/guilloche/config.ts first. */
  config?: Partial<GuillocheConfig>;
}

/**
 * Full-viewport liquid guilloché. Fixed behind everything (see .field in
 * globals.css). Respects prefers-reduced-motion by rendering a single still
 * frame. If WebGL2 is unavailable the canvas stays empty and the cream
 * ground shows through — no fallback image, by design.
 */
export function GuillocheField({ config }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const field = createGuillocheField(canvas, {
      ...config,
      motion: mq.matches ? 0 : (config?.motion ?? 1),
    });
    if (!field) return;

    const onChange = () => field.setMotion(mq.matches ? 0 : (config?.motion ?? 1));
    mq.addEventListener("change", onChange);

    // Theme: follow <html data-theme> live (set by ThemeToggle).
    const applyTheme = () => {
      const dark = document.documentElement.dataset.theme === "dark";
      field.setPalette(dark ? darkColors : lightColors, dark ? 1.3 : 1);
    };
    applyTheme();
    const mo = new MutationObserver(applyTheme);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    // Wordmark hover surge (dispatched by Hero).
    const onFocus = (e: Event) =>
      field.setFocus((e as CustomEvent<number>).detail ?? 0);
    window.addEventListener("munerate:focus", onFocus);

    return () => {
      mq.removeEventListener("change", onChange);
      mo.disconnect();
      window.removeEventListener("munerate:focus", onFocus);
      field.destroy();
    };
    // Config is treated as initial-only; changing it remounts nothing on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={ref} className="field" aria-hidden="true" />;
}
