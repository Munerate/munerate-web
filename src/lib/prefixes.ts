/**
 * Known subbrand prefixes — the single source of truth read by the host
 * middleware (and, eventually, the Wordmark lockups). A prefix listed here
 * must have a matching route group at src/app/(sub)/<prefix>/.
 *
 * Waiting for their surfaces: "re", "pre", "retro", "micro", "poly",
 * "para", "com", "auto", "inter".
 */
export const PREFIXES = ["tele"] as const;

export type Prefix = (typeof PREFIXES)[number];
