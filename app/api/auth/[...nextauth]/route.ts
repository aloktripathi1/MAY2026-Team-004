/**
 * MOCK AUTH STUB — intentionally separate from real REST auth APIs.
 *
 * Real endpoints live under explicit paths, e.g.:
 *   POST /api/auth/signup
 *   POST /api/auth/login
 *   GET  /api/auth/me
 *
 * This catch-all remains for the M2 mock/demo frontend path only.
 * Do not implement real credentials here.
 */
export async function GET() {
  return Response.json({
    mode: "mock",
    message:
      "Mock auth stub. Use /api/auth/signup, /api/auth/login, and /api/auth/me for real auth.",
  });
}

export async function POST() {
  return Response.json({
    mode: "mock",
    message:
      "Mock auth stub. Use /api/auth/signup, /api/auth/login, and /api/auth/me for real auth.",
  });
}
