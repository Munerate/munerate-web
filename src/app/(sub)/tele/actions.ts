"use server";

import { headers } from "next/headers";
import { isValidIpOrCidr } from "@/lib/tele/ipAllow";
import { MAX_IPS, ORG_TYPES, type FormState } from "@/lib/tele/formShared";
import { adminEmail, applicantEmail, sendEmail, type AccessApplication } from "@/lib/tele/resend";

/**
 * Best-effort rate limit: one submission per IP per minute. The map is
 * per-server-instance (serverless functions may not share it) — honest
 * spam friction, not a security boundary. The honeypot does the rest.
 */
const lastSubmit = new Map<string, number>();
const RATE_MS = 60_000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function submitterIp(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "";
}

export async function submitAccessRequest(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const field = (name: string) => String(formData.get(name) ?? "").trim();

  // Honeypot: bots fill "company"; humans never see it. Pretend success.
  if (field("company")) return { status: "success" };

  const org = field("org");
  const orgType = field("orgType");
  const name = field("name");
  const role = field("role");
  const email = field("email");
  const website = field("website");
  const useCase = field("useCase");
  const ipsRaw = field("ips");

  const fieldErrors: Record<string, string> = {};
  if (!org) fieldErrors.org = "Organisation name is required.";
  if (!(ORG_TYPES as readonly string[]).includes(orgType))
    fieldErrors.orgType = "Choose the closest organisation type.";
  if (!name) fieldErrors.name = "Contact name is required.";
  if (!EMAIL_RE.test(email)) fieldErrors.email = "A valid email is required.";

  const ips = ipsRaw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (ips.length === 0) {
    fieldErrors.ips = "At least one IP address is required.";
  } else if (ips.length > MAX_IPS) {
    fieldErrors.ips = `At most ${MAX_IPS} addresses per application.`;
  } else {
    const bad = ips.filter((ip) => !isValidIpOrCidr(ip));
    if (bad.length > 0)
      fieldErrors.ips = `Not a valid IP or CIDR range: ${bad.join(", ")}`;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors };
  }

  const fromIp = await submitterIp();
  const now = Date.now();
  const last = lastSubmit.get(fromIp || email) ?? 0;
  if (now - last < RATE_MS) {
    return {
      status: "error",
      message: "That was quick — please wait a minute before submitting again.",
    };
  }
  lastSubmit.set(fromIp || email, now);

  const app: AccessApplication = {
    org,
    orgType,
    name,
    role,
    email,
    website,
    ips,
    useCase,
    submitterIp: fromIp,
  };

  const admin = await sendEmail(adminEmail(app));
  if (!admin.ok) {
    return {
      status: "error",
      message:
        "We couldn't send your application just now. Please try again, or email hello@munerate.com directly.",
    };
  }
  // Applicant confirmation is best-effort; the application itself is in.
  const confirm = await sendEmail(applicantEmail(app));
  if (!confirm.ok) console.error("[tele] applicant confirmation failed for", email);

  return { status: "success" };
}
