import crypto from "crypto";
import { NextResponse } from "next/server";
import { buildGoogleAuthUrl, GOOGLE_OAUTH_STATE_COOKIE, isGoogleAuthConfigured } from "@/backend/auth/google";

/** Kicks off the Google sign-in flow: stash a CSRF state value in a cookie,
 * redirect to Google's consent screen. The callback checks the state matches
 * before trusting anything Google sends back. */
export async function GET(request: Request) {
  const origin = new URL(request.url).origin;

  if (!isGoogleAuthConfigured()) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("Google sign-in isn't set up yet.")}`);
  }

  const redirectUri = `${origin}/api/auth/google/callback`;
  const state = crypto.randomBytes(24).toString("base64url");

  const response = NextResponse.redirect(buildGoogleAuthUrl(redirectUri, state));
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
  return response;
}
