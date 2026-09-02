"use client";

import { useEffect, useState } from "react";

/**
 * NOTE / PLATE — light is the printed note, dark is the engraver's plate.
 * Sets `data-theme` on <html> (the field follows via GuillocheField's
 * observer), persists to localStorage. The pre-paint script in layout.tsx
 * applies the stored choice before hydration, so first render matches.
 */
export function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
  }, []);

  const apply = (next: boolean) => {
    setDark(next);
    if (next) document.documentElement.dataset.theme = "dark";
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem("munerate-theme", next ? "dark" : "light");
    } catch {
      /* private mode — the choice just won't persist */
    }
  };

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => apply(!(dark ?? false))}
      aria-pressed={dark ?? false}
      aria-label="Toggle dark mode"
    >
      <span className={dark === false ? "theme-toggle__on" : undefined}>note</span>
      {" · "}
      <span className={dark === true ? "theme-toggle__on" : undefined}>plate</span>
    </button>
  );
}
