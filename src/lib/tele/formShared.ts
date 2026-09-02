/** Shared between the AccessForm client component and the server action. */

export const ORG_TYPES = [
  "Robotics company / lab",
  "Insurer / reinsurer",
  "Investor / fund",
  "Bank / financial institution",
  "University / research",
  "Government / regulator",
  "Other (including individuals)",
] as const;

export type OrgType = (typeof ORG_TYPES)[number];

export interface FormState {
  status: "idle" | "success" | "error";
  /** Top-level message for error states. */
  message?: string;
  /** Per-field validation messages, keyed by input name. */
  fieldErrors?: Record<string, string>;
}

export const MAX_IPS = 20;
