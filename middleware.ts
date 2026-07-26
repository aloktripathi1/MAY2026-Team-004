import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Origins that may call local APIs from a browser (Swagger Editor / local tools). */
const FIXED_ORIGINS = new Set([
  "https://editor.swagger.io",
  "http://editor.swagger.io",
  "https://petstore.swagger.io",
]);

function isAllowedOrigin(origin: string | null): origin is string {
  if (!origin) return false;
  if (FIXED_ORIGINS.has(origin)) return true;
  // Local Swagger UI / Postman-like browser tools on loopback
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

function withCors(response: NextResponse, origin: string) {
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Accept",
  );
  response.headers.set("Access-Control-Max-Age", "86400");
  response.headers.append("Vary", "Origin");
  return response;
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin");
  const allowed = isAllowedOrigin(origin);

  if (request.method === "OPTIONS") {
    const preflight = new NextResponse(null, { status: 204 });
    return allowed ? withCors(preflight, origin) : preflight;
  }

  const response = NextResponse.next();
  return allowed ? withCors(response, origin) : response;
}

export const config = {
  matcher: ["/api/:path*"],
};
