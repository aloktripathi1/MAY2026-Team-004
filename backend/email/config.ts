/**
 * Every environment knob the mailer reads, resolved in one place so call sites
 * never touch process.env directly and tests can reason about one shape.
 *
 * Read lazily (not at module load) because Next.js evaluates server modules
 * during `next build`, when production env vars may not be present yet.
 */

export type EmailConfig = {
  /** Real sends only happen when true AND an API key is present. */
  enabled: boolean;
  apiKey: string | null;
  from: string;
  replyTo: string | null;
  /** Absolute origin used to build links inside emails. */
  appUrl: string;
  /**
   * While no domain is verified, only addresses matching one of these patterns
   * are mailed. Empty array = no restriction.
   */
  allowlist: string[];
};

const DEFAULT_FROM = "Sangam <onboarding@resend.dev>";
const DEFAULT_APP_URL = "http://localhost:3000";

function parseAllowlist(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * The origin of the request currently being served, or null outside a request
 * (a cron sweep triggered by script, the seed, `scripts/*`).
 *
 * Used as a fallback for `APP_URL`, because a stale `APP_URL` is a silent
 * failure of the worst kind: mail delivers perfectly and every link in it is
 * dead. Pointing at the host the user is actually on cannot be stale. It's only
 * a fallback — an explicit `APP_URL` still wins, since scheduled mail has no
 * request to borrow a host from and needs the configured value.
 *
 * `x-forwarded-host` is what Vercel sets; `host` covers running behind nothing.
 */
function getRequestOrigin(): string | null {
  try {
    // Required lazily: this module is also loaded by CLI scripts, where
    // next/headers has no request scope to read.
    // eslint-disable-next-line global-require
    const { headers } = require("next/headers") as typeof import("next/headers");
    const list = headers();
    const host = list.get("x-forwarded-host") ?? list.get("host");
    if (!host) return null;
    const proto = list.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  } catch {
    return null;
  }
}

export function getEmailConfig(): EmailConfig {
  const apiKey = process.env.RESEND_API_KEY?.trim() || null;
  const flag = process.env.EMAIL_ENABLED?.trim().toLowerCase();

  const appUrl =
    process.env.APP_URL?.trim() ||
    getRequestOrigin() ||
    process.env.NEXTAUTH_URL?.trim() ||
    DEFAULT_APP_URL;

  return {
    enabled: (flag === "true" || flag === "1") && Boolean(apiKey),
    apiKey,
    from: process.env.EMAIL_FROM?.trim() || DEFAULT_FROM,
    replyTo: process.env.EMAIL_REPLY_TO?.trim() || null,
    appUrl: appUrl.replace(/\/$/, ""),
    allowlist: parseAllowlist(process.env.EMAIL_ALLOWLIST),
  };
}

/**
 * Allowlist matching. An entry is either a full address ("a@b.com") or a
 * domain suffix ("@b.com" / "b.com"), matched case-insensitively.
 */
export function isAllowedRecipient(address: string, allowlist: string[]): boolean {
  if (allowlist.length === 0) return true;
  const target = address.trim().toLowerCase();
  return allowlist.some((entry) => {
    if (entry.includes("@") && !entry.startsWith("@")) return target === entry;
    const domain = entry.startsWith("@") ? entry.slice(1) : entry;
    return target.endsWith(`@${domain}`);
  });
}

/** Builds an absolute in-app URL for use inside an email body. */
export function absoluteUrl(path: string, appUrl = getEmailConfig().appUrl): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${appUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
