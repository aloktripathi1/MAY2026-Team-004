import { prisma } from "@/backend/db/prisma";
import { deriveRollNumber, isAllowedEmailDomain } from "@/backend/auth/signup-schema";

export const GOOGLE_OAUTH_STATE_COOKIE = "google_oauth_state";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

export function isGoogleAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/** Builds the URL that starts the Google consent flow. `state` is a random
 * value the caller must also stash in a short-lived cookie to check on the
 * way back (CSRF / login-hijack protection). */
export function buildGoogleAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

type GoogleProfile = { sub: string; email?: string; email_verified?: boolean; name?: string };

export type ExchangeResult =
  | { ok: true; profile: GoogleProfile }
  | { ok: false; message: string };

/** Trades the authorization `code` for tokens, then the access token for the
 * account's profile. Both calls go straight to Google, server-side. */
export async function exchangeGoogleCode(code: string, redirectUri: string): Promise<ExchangeResult> {
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) {
    return { ok: false, message: "Google didn't confirm the sign-in. Please try again." };
  }
  const tokenData = (await tokenRes.json()) as { access_token?: string };
  if (!tokenData.access_token) {
    return { ok: false, message: "Google didn't confirm the sign-in. Please try again." };
  }

  const profileRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  if (!profileRes.ok) {
    return { ok: false, message: "Couldn't read your Google profile. Please try again." };
  }
  const profile = (await profileRes.json()) as GoogleProfile;
  return { ok: true, profile };
}

export type ResolveGoogleUserResult =
  | { ok: true; userId: string }
  | { ok: false; code: "NO_VERIFIED_EMAIL" | "DOMAIN_NOT_ALLOWED" | "ROLL_EXISTS"; message: string };

/**
 * Finds the account for a verified Google profile, links Google to an
 * existing email/password account on first sign-in, or creates a fresh one.
 * Same institutional-domain restriction as password signup — Google is
 * another way in, not a bypass of who's allowed to have an account.
 */
export async function resolveGoogleUser(profile: GoogleProfile): Promise<ResolveGoogleUserResult> {
  if (!profile.email || !profile.email_verified) {
    return { ok: false, code: "NO_VERIFIED_EMAIL", message: "Your Google account has no verified email." };
  }
  const email = profile.email.toLowerCase();

  if (!isAllowedEmailDomain(email)) {
    return { ok: false, code: "DOMAIN_NOT_ALLOWED", message: "Sign in with your institutional Google account." };
  }

  const byGoogleId = await prisma.user.findUnique({ where: { googleId: profile.sub } });
  if (byGoogleId) return { ok: true, userId: byGoogleId.id };

  const byEmail = await prisma.user.findUnique({ where: { email } });
  if (byEmail) {
    const linked = await prisma.user.update({
      where: { id: byEmail.id },
      data: { googleId: profile.sub, emailVerified: byEmail.emailVerified ?? new Date() },
    });
    return { ok: true, userId: linked.id };
  }

  const rollNumber = deriveRollNumber(email);
  const rollTaken = await prisma.user.findUnique({ where: { rollNumber } });
  if (rollTaken) {
    return { ok: false, code: "ROLL_EXISTS", message: "An account with this roll number already exists." };
  }

  const created = await prisma.user.create({
    data: {
      email,
      name: profile.name || rollNumber,
      // Google-only accounts have no password to check against — the empty
      // string reads as falsy everywhere authenticate-user.ts already guards
      // for a missing password, so this never becomes a login path on its own.
      hashedPassword: "",
      googleId: profile.sub,
      rollNumber,
      interests: "[]",
      // Google already verified this address, so there's nothing for our own
      // verification email to add.
      emailVerified: new Date(),
    },
  });
  return { ok: true, userId: created.id };
}
