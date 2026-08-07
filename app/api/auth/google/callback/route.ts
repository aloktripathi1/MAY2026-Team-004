import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeGoogleCode, GOOGLE_OAUTH_STATE_COOKIE, isGoogleAuthConfigured, resolveGoogleUser } from "@/backend/auth/google";
import { setAuthCookies } from "@/backend/auth/session-cookies";
import { getCurrentUserById } from "@/backend/auth/get-current-user";

function toLogin(origin: string, message: string) {
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;

  if (!isGoogleAuthConfigured()) {
    return toLogin(origin, "Google sign-in isn't set up yet.");
  }

  const oauthError = url.searchParams.get("error");
  if (oauthError) {
    return toLogin(origin, "Google sign-in was cancelled.");
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = cookies().get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  cookies().delete(GOOGLE_OAUTH_STATE_COOKIE);

  if (!code || !state || !expectedState || state !== expectedState) {
    return toLogin(origin, "Google sign-in failed. Please try again.");
  }

  const redirectUri = `${origin}/api/auth/google/callback`;
  const exchange = await exchangeGoogleCode(code, redirectUri);
  if (!exchange.ok) {
    return toLogin(origin, exchange.message);
  }

  const resolved = await resolveGoogleUser(exchange.profile);
  if (!resolved.ok) {
    return toLogin(origin, resolved.message);
  }

  setAuthCookies(resolved.userId);
  const current = await getCurrentUserById(resolved.userId);
  const home = current.ok ? current.user.home : "/app";
  return NextResponse.redirect(`${origin}${home}`);
}
