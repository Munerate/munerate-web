"use client";

import { useActionState, useRef } from "react";
import { Wordmark } from "@/components/Wordmark";
import { ORG_TYPES, type FormState } from "@/lib/tele/formShared";
import { submitAccessRequest } from "./actions";

const INITIAL: FormState = { status: "idle" };

/**
 * The whitelist application. Server-validated (see actions.ts); the only
 * client-side conveniences are native `required` hints and the
 * "use my current IP" chip. A hidden honeypot field filters bots.
 */
export function AccessForm({ currentIp }: { currentIp: string }) {
  const [state, formAction, pending] = useActionState(submitAccessRequest, INITIAL);
  const ipsRef = useRef<HTMLTextAreaElement>(null);

  const addCurrentIp = () => {
    const el = ipsRef.current;
    if (!el || !currentIp) return;
    const lines = el.value.split(/[\n,]+/).map((s) => s.trim());
    if (lines.includes(currentIp)) return;
    el.value = el.value.trim() ? `${el.value.trim()}\n${currentIp}` : currentIp;
    el.focus();
  };

  const err = (name: string) =>
    state.status === "error" ? state.fieldErrors?.[name] : undefined;

  if (state.status === "success") {
    return (
      <div className="tele__panel">
        <Wordmark prefix="tele" as="span" />
        <h1 className="tele__title">Application received</h1>
        <p className="tele__lede">
          Thank you — we review every application promptly. Once your IP
          addresses are whitelisted you&apos;ll hear from us by email, and the
          telemetry demo will load directly at tele.munerate.com.
        </p>
      </div>
    );
  }

  return (
    <div className="tele__panel">
      <Wordmark prefix="tele" as="span" />
      <h1 className="tele__title">Request demo access</h1>
      <p className="tele__lede">
        The robotic telemetry demo is available to whitelisted organisations.
        Tell us who you are and which IP addresses should be allowed — we
        review every application promptly.
      </p>

      <form className="tele-form" action={formAction} noValidate>
        {/* honeypot — humans never see this */}
        <div className="tele__hp" aria-hidden="true">
          <label htmlFor="company">Company</label>
          <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        <div className="tele-form__field">
          <label className="tele-form__label" htmlFor="org">
            Organisation name
          </label>
          <input className="tele-form__input" id="org" name="org" type="text" required />
          {err("org") && <p className="tele-form__error">{err("org")}</p>}
        </div>

        <div className="tele-form__field">
          <label className="tele-form__label" htmlFor="orgType">
            Organisation type
          </label>
          <select className="tele-form__input" id="orgType" name="orgType" required defaultValue="">
            <option value="" disabled>
              Choose the closest match
            </option>
            {ORG_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {err("orgType") && <p className="tele-form__error">{err("orgType")}</p>}
        </div>

        <div className="tele-form__row">
          <div className="tele-form__field">
            <label className="tele-form__label" htmlFor="name">
              Contact name
            </label>
            <input className="tele-form__input" id="name" name="name" type="text" required />
            {err("name") && <p className="tele-form__error">{err("name")}</p>}
          </div>
          <div className="tele-form__field">
            <label className="tele-form__label" htmlFor="role">
              Role / title <span className="tele-form__optional">optional</span>
            </label>
            <input className="tele-form__input" id="role" name="role" type="text" />
          </div>
        </div>

        <div className="tele-form__field">
          <label className="tele-form__label" htmlFor="email">
            Work email
          </label>
          <input
            className="tele-form__input"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
          {err("email") && <p className="tele-form__error">{err("email")}</p>}
        </div>

        <div className="tele-form__field">
          <label className="tele-form__label" htmlFor="website">
            Organisation website <span className="tele-form__optional">optional</span>
          </label>
          <input className="tele-form__input" id="website" name="website" type="url" placeholder="https://" />
        </div>

        <div className="tele-form__field">
          <label className="tele-form__label" htmlFor="ips">
            IP address(es) to whitelist
          </label>
          <textarea
            ref={ipsRef}
            className="tele-form__input tele-form__ips"
            id="ips"
            name="ips"
            rows={3}
            required
            placeholder={"One per line — IPv4, IPv6 or CIDR\n203.0.113.7\n198.51.100.0/24"}
          />
          {currentIp ? (
            <button type="button" className="tele-form__chip" onClick={addCurrentIp}>
              use my current IP — {currentIp}
            </button>
          ) : null}
          {err("ips") && <p className="tele-form__error">{err("ips")}</p>}
        </div>

        <div className="tele-form__field">
          <label className="tele-form__label" htmlFor="useCase">
            What will you use the demo for?{" "}
            <span className="tele-form__optional">optional</span>
          </label>
          <textarea className="tele-form__input" id="useCase" name="useCase" rows={3} />
        </div>

        {state.status === "error" && state.message ? (
          <p className="tele-form__error tele-form__error--top">{state.message}</p>
        ) : null}

        <button className="tele-form__submit" type="submit" disabled={pending}>
          {pending ? "Sending…" : "Apply for access"}
        </button>

        <p className="tele-form__privacy">
          Used only to review access — no analytics, no lists.
        </p>
      </form>
    </div>
  );
}
