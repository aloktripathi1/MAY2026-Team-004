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

export function getEmailConfig(): EmailConfig {
  const apiKey = process.env.RESEND_API_KEY?.trim() || null;
  const flag = process.env.EMAIL_ENABLED?.trim().toLowerCase();

  return {
    enabled: (flag === "true" || flag === "1") && Boolean(apiKey),
    apiKey,
    from: process.env.EMAIL_FROM?.trim() || DEFAULT_FROM,
    replyTo: process.env.EMAIL_REPLY_TO?.trim() || null,
    appUrl: (process.env.APP_URL?.trim() || process.env.NEXTAUTH_URL?.trim() || DEFAULT_APP_URL).replace(/\/$/, ""),
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
