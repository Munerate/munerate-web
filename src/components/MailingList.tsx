"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { subscribeMailingList } from "@/app/actions";

export function MailingList() {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);

  const closeForm = () => {
    setIsOpen(false);
    setStatus("idle");
    setErrorMsg("");
    triggerRef.current?.focus();
  };

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Click outside & Escape key listeners to close
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeForm();
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeForm();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await subscribeMailingList(formData);
      if (res.ok) {
        setStatus("success");
        setTimeout(() => {
          setIsOpen(false);
          setStatus("idle");
        }, 3500);
      } else {
        setStatus("error");
        setErrorMsg(res.error || "Please try again.");
      }
    });
  };

  const isOverlayOpen = isOpen || status === "success";

  return (
    <div ref={containerRef} className="mailing-list">
      <button
        ref={triggerRef}
        type="button"
        className={`mailing-list__trigger${isOverlayOpen ? " mailing-list__trigger--hidden" : ""}`}
        onClick={() => setIsOpen(true)}
        aria-expanded={isOpen}
        aria-hidden={isOverlayOpen}
        tabIndex={isOverlayOpen ? -1 : 0}
      >
        Get Munerated
      </button>

      {status === "success" ? (
        <span className="mailing-list__success">You&apos;re on the list ✓</span>
      ) : isOpen ? (
        <form className="mailing-list__form" onSubmit={handleSubmit} noValidate>
          <input
            ref={inputRef}
            className="mailing-list__input"
            type="email"
            name="email"
            placeholder="your email"
            required
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            disabled={isPending}
          />
          <button
            className="mailing-list__submit"
            type="submit"
            disabled={isPending}
            aria-label="Submit email to mailing list"
          >
            {isPending ? "…" : "join"}
          </button>
          <button
            className="mailing-list__close"
            type="button"
            onClick={closeForm}
            aria-label="Close form"
          >
            ✕
          </button>
          {status === "error" && errorMsg ? (
            <span className="mailing-list__error">{errorMsg}</span>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
