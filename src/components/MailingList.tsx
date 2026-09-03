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
        setIsOpen(false);
        setStatus("idle");
        setErrorMsg("");
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setStatus("idle");
        setErrorMsg("");
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

  if (status === "success") {
    return (
      <div className="mailing-list">
        <span className="mailing-list__success">You&apos;re on the list ✓</span>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <div className="mailing-list">
        <button
          type="button"
          className="mailing-list__trigger"
          onClick={() => setIsOpen(true)}
          aria-expanded="false"
        >
          Get Munerated
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="mailing-list">
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
          onClick={() => {
            setIsOpen(false);
            setStatus("idle");
            setErrorMsg("");
          }}
          aria-label="Close form"
        >
          ✕
        </button>
      </form>
      {status === "error" && errorMsg ? (
        <span className="mailing-list__error">{errorMsg}</span>
      ) : null}
    </div>
  );
}
