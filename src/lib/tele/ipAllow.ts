/**
 * IP whitelist matching — zero dependencies, pure functions.
 *
 * The whitelist is a comma-separated string of IPv4/IPv6 addresses and
 * CIDR ranges (the TELE_WHITELIST env var). Everything is normalised to
 * BigInt so v4 and v6 share one masked comparison; IPv4-mapped IPv6
 * addresses (::ffff:a.b.c.d — common from proxies) collapse to IPv4.
 */

interface ParsedIp {
  version: 4 | 6;
  value: bigint;
}

interface ParsedRule extends ParsedIp {
  /** Prefix length; 32/128 for exact addresses. */
  bits: number;
}

function parseV4(s: string): bigint | null {
  const parts = s.split(".");
  if (parts.length !== 4) return null;
  let n = 0n;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const o = Number(p);
    if (o > 255) return null;
    n = (n << 8n) | BigInt(o);
  }
  return n;
}

function parseV6(s: string): bigint | null {
  // Optional trailing dotted IPv4 (e.g. ::ffff:1.2.3.4).
  let hexPart = s;
  let tailBits: bigint | null = null;
  const lastColon = s.lastIndexOf(":");
  if (lastColon !== -1 && s.slice(lastColon + 1).includes(".")) {
    const v4 = parseV4(s.slice(lastColon + 1));
    if (v4 === null) return null;
    tailBits = v4;
    hexPart = s.slice(0, lastColon + 1) + "0:0"; // placeholder two hextets
  }
  const halves = hexPart.split("::");
  if (halves.length > 2) return null;
  const parseGroups = (part: string) =>
    part === "" ? [] : part.split(":").map((g) => (/^[0-9a-fA-F]{1,4}$/.test(g) ? parseInt(g, 16) : NaN));
  const head = parseGroups(halves[0]!);
  const tail = halves.length === 2 ? parseGroups(halves[1]!) : [];
  if ([...head, ...tail].some(Number.isNaN)) return null;
  const missing = 8 - head.length - tail.length;
  if (halves.length === 2 ? missing < 0 : missing !== 0) return null;
  const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill(0), ...tail];
  if (groups.length !== 8) return null;
  let n = 0n;
  for (const g of groups) n = (n << 16n) | BigInt(g);
  if (tailBits !== null) n = (n & ~0xffffffffn) | tailBits;
  return n;
}

const V4_MAPPED_PREFIX = 0xffffn << 32n;
const V4_MAPPED_MASK = ~0xffffffffn;

export function parseIp(input: string): ParsedIp | null {
  const s = input.trim();
  if (!s) return null;
  if (s.includes(":")) {
    const v6 = parseV6(s);
    if (v6 === null) return null;
    // IPv4-mapped → treat as IPv4 so ::ffff:1.2.3.4 matches a v4 rule.
    if ((v6 & V4_MAPPED_MASK) === V4_MAPPED_PREFIX) {
      return { version: 4, value: v6 & 0xffffffffn };
    }
    return { version: 6, value: v6 };
  }
  const v4 = parseV4(s);
  return v4 === null ? null : { version: 4, value: v4 };
}

export function parseRule(input: string): ParsedRule | null {
  const s = input.trim();
  if (!s) return null;
  const slash = s.indexOf("/");
  const addr = parseIp(slash === -1 ? s : s.slice(0, slash));
  if (!addr) return null;
  const size = addr.version === 4 ? 32 : 128;
  if (slash === -1) return { ...addr, bits: size };
  const bitsStr = s.slice(slash + 1);
  if (!/^\d{1,3}$/.test(bitsStr)) return null;
  const bits = Number(bitsStr);
  if (bits < 0 || bits > size) return null;
  return { ...addr, bits };
}

export function ipMatchesRule(ip: ParsedIp, rule: ParsedRule): boolean {
  if (ip.version !== rule.version) return false;
  const size = ip.version === 4 ? 32 : 128;
  const shift = BigInt(size - rule.bits);
  return ip.value >> shift === rule.value >> shift;
}

/** True when `input` is a single valid IPv4/IPv6 address or CIDR range. */
export function isValidIpOrCidr(input: string): boolean {
  return parseRule(input) !== null;
}

/** Check an address against a comma-separated whitelist of IPs/CIDRs. */
export function isAllowed(ipInput: string, whitelist: string): boolean {
  const ip = parseIp(ipInput);
  if (!ip) return false;
  return whitelist
    .split(",")
    .map((r) => parseRule(r))
    .some((rule) => rule !== null && ipMatchesRule(ip, rule));
}
