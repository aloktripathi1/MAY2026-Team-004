import { z } from "zod";
import { institutionalEmailSchema } from "./signup-schema.ts";

/**
 * Login credentials (User Story 1.1).
 * Institutional email required — same domain gate as signup.
 */
export const loginSchema = z.object({
  email: institutionalEmailSchema,
  password: z.string().min(1, "Password is required"),
  callbackUrl: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

/** Only same-origin relative paths are allowed as post-login redirects. */
export function safeRedirectPath(url: string | null | undefined, fallback: string): string {
  if (!url || !url.startsWith("/") || url.startsWith("//")) return fallback;
  return url;
}
