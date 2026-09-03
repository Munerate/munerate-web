"use server";

import { mailingListEmail, sendEmail } from "@/lib/tele/resend";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface MailingListResult {
  ok: boolean;
  error?: string;
}

export async function subscribeMailingList(formData: FormData): Promise<MailingListResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email || !EMAIL_RE.test(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  const res = await sendEmail(mailingListEmail(email));
  if (!res.ok) {
    return { ok: false, error: "Could not subscribe at this moment. Please try again." };
  }

  return { ok: true };
}
