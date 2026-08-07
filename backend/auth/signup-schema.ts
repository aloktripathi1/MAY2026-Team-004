import { z } from "zod";

/**
 * Which email domains may create an account (User Story 1.1).
 *
 * Not to be confused with `EMAIL_ALLOWLIST`, which governs who may *receive*
 * mail during rollout. This governs who may *sign up*.
 *
 * Configured with `ALLOWED_EMAIL_DOMAINS`, comma-separated, and defaulting to
 * the institution's student domain so behaviour is unchanged when it isn't set.
 * A second domain is the usual reason to touch this — staff addresses often live
 * somewhere other than the student domain.
 */
export const DEFAULT_ALLOWED_EMAIL_DOMAIN = "ds.study.iitm.ac.in";

/** Kept for callers and tests that predate ALLOWED_EMAIL_DOMAINS. */
export const INSTITUTIONAL_EMAIL_DOMAIN = DEFAULT_ALLOWED_EMAIL_DOMAIN;

/**
 * Read per-validation rather than at module load, so a deploy that changes the
 * variable takes effect without a rebuild — and so tests can vary it.
 */
export function getAllowedEmailDomains(): string[] {
  const raw = process.env.ALLOWED_EMAIL_DOMAINS?.trim();
  if (!raw) return [DEFAULT_ALLOWED_EMAIL_DOMAIN];

  const domains = raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);

  // An empty or comma-only value must not mean "any domain" — that would turn a
  // typo in the environment into an open signup form.
  return domains.length > 0 ? domains : [DEFAULT_ALLOWED_EMAIL_DOMAIN];
}

/**
 * True when `email`'s domain is one of `domains`, or a subdomain of one.
 *
 * Matched on the domain part after the last `@`, on label boundaries — not with
 * `endsWith` on the whole address. `endsWith("iitm.ac.in")` would also accept
 * `student@evil-iitm.ac.in`, which is precisely the address someone would use to
 * get in.
 */
export function isAllowedEmailDomain(email: string, domains = getAllowedEmailDomains()): boolean {
  const at = email.lastIndexOf("@");
  if (at === -1) return false;

  const domain = email.slice(at + 1).toLowerCase();
  return domains.some((allowed) => domain === allowed || domain.endsWith(`.${allowed}`));
}

function allowedDomainsMessage(): string {
  const domains = getAllowedEmailDomains();
  if (domains.length === 1) return `Email must end with @${domains[0]}`;
  return `Email must be on one of: ${domains.map((d) => `@${d}`).join(", ")}`;
}

export const institutionalEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")
  // superRefine rather than refine: `refine`'s message is a fixed string
  // evaluated when this module loads, which would freeze the configured domains
  // into the error text at import time. This builds the message per validation.
  .superRefine((email, ctx) => {
    if (isAllowedEmailDomain(email)) return;
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: allowedDomainsMessage() });
  });

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: institutionalEmailSchema,
  rollNumber: z.string().trim().min(1, "Roll number is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type SignupInput = z.infer<typeof signupSchema>;
