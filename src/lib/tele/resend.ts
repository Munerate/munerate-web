/**
 * Resend, via plain fetch — no SDK (zero-dependency rule holds; the API is
 * one POST). With RESEND_API_KEY unset, sends are logged and reported as
 * successful so local development works without credentials.
 */

const RESEND_URL = "https://api.resend.com/emails";

export interface AccessApplication {
  org: string;
  orgType: string;
  name: string;
  role: string;
  email: string;
  website: string;
  ips: string[];
  useCase: string;
  submitterIp: string;
}

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

export async function sendEmail(p: EmailPayload): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.TELE_FROM_EMAIL ?? "munerate <access@munerate.com>";
  if (!key) {
    console.log(`[tele] RESEND_API_KEY unset — would send "${p.subject}" to ${p.to}\n${p.text}`);
    return { ok: true };
  }
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [p.to],
        subject: p.subject,
        html: p.html,
        text: p.text,
        ...(p.replyTo ? { reply_to: p.replyTo } : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`[tele] Resend ${res.status}: ${body}`);
      return { ok: false, error: `Resend ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    console.error("[tele] Resend request failed:", e);
    return { ok: false, error: "network" };
  }
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Minimal branded shell: navy on cream, type only, no images. */
function shell(bodyHtml: string): string {
  return `<div style="background:#F7F3E9;padding:32px 16px;font-family:'Space Grotesk',ui-sans-serif,system-ui,sans-serif;color:#0A1B2E">
  <div style="max-width:560px;margin:0 auto">
    <p style="font-weight:700;font-size:22px;margin:0 0 24px">tele <span style="color:#10B39E">·</span> munerate</p>
    ${bodyHtml}
    <p style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#6b7684;margin-top:32px">munerate — finance for intelligence</p>
  </div>
</div>`;
}

export function adminEmail(app: AccessApplication): EmailPayload {
  const rows = [
    ["Organisation", app.org],
    ["Type", app.orgType],
    ["Contact", app.name],
    ["Role", app.role || "—"],
    ["Email", app.email],
    ["Website", app.website || "—"],
    ["Use case", app.useCase || "—"],
    ["Submitted from IP", app.submitterIp || "unknown"],
    ["Submitted at", new Date().toISOString()],
  ];
  const whitelistLine = app.ips.join(", ");
  return {
    to: process.env.TELE_NOTIFY_EMAIL ?? "munerated@gmail.com",
    replyTo: app.email,
    subject: `tele access request — ${app.org}`,
    text:
      rows.map(([k, v]) => `${k}: ${v}`).join("\n") +
      `\n\nRequested IPs:\n${app.ips.join("\n")}\n\nAppend to TELE_WHITELIST:\n${whitelistLine}`,
    html: shell(
      `<h1 style="font-size:16px;letter-spacing:.18em;text-transform:uppercase;font-weight:500">Access request</h1>
       <table style="border-collapse:collapse;width:100%;font-size:14px">${rows
         .map(
           ([k, v]) =>
             `<tr><td style="padding:6px 12px 6px 0;color:#6b7684;white-space:nowrap;vertical-align:top">${esc(k!)}</td><td style="padding:6px 0">${esc(v!)}</td></tr>`,
         )
         .join("")}</table>
       <p style="font-size:14px;margin-top:20px"><strong>Requested IPs</strong></p>
       <pre style="background:#E8ECEF;padding:12px;font-size:13px;overflow:auto">${esc(app.ips.join("\n"))}</pre>
       <p style="font-size:14px">Append to <code>TELE_WHITELIST</code>:</p>
       <pre style="background:#E8ECEF;padding:12px;font-size:13px;overflow:auto">${esc(whitelistLine)}</pre>`,
    ),
  };
}

export function applicantEmail(app: AccessApplication): EmailPayload {
  return {
    to: app.email,
    subject: "munerate — your tele demo access request",
    text: `Hello ${app.name},

We received your request for access to the tele·munerate telemetry demo for ${app.org}.

Requested IPs:
${app.ips.join("\n")}

We review every application promptly. Once your IPs are whitelisted you'll hear from us at this address, and the demo will load directly at tele.munerate.com.

— munerate
Finance for intelligence`,
    html: shell(
      `<p style="font-size:15px">Hello ${esc(app.name)},</p>
       <p style="font-size:15px">We received your request for access to the tele·munerate telemetry demo for <strong>${esc(app.org)}</strong>.</p>
       <p style="font-size:14px;margin-top:20px"><strong>Requested IPs</strong></p>
       <pre style="background:#E8ECEF;padding:12px;font-size:13px;overflow:auto">${esc(app.ips.join("\n"))}</pre>
       <p style="font-size:15px">We review every application promptly. Once your IPs are whitelisted you'll hear from us at this address, and the demo will load directly at <strong>tele.munerate.com</strong>.</p>`,
    ),
  };
}

export function mailingListEmail(email: string): EmailPayload {
  return {
    to: process.env.TELE_NOTIFY_EMAIL ?? "munerated@gmail.com",
    replyTo: email,
    subject: `munerate — new subscriber: ${email}`,
    text: `New subscriber on munerate.com:\n\nEmail: ${email}\nDate: ${new Date().toISOString()}`,
    html: shell(
      `<h1 style="font-size:16px;letter-spacing:.18em;text-transform:uppercase;font-weight:500">Mailing List Signup</h1>
       <p style="font-size:15px;margin-top:16px"><strong>${esc(email)}</strong> joined the munerate mailing list.</p>
       <p style="font-size:12px;color:#6b7684;margin-top:24px">Time: ${new Date().toUTCString()}</p>`,
    ),
  };
}
