import { NextResponse } from "next/server";
import { jsonError, jsonSuccess } from "@/backend/api/http";
import { SWEEPS, type SweepName } from "@/backend/email/scheduled";

/**
 * Runs one scheduled-email sweep. Vercel Cron hits these on the schedule in
 * vercel.json (see the "Scheduled email" section of the README).
 *
 * Auth is a bearer token, not a session: cron has no user. Vercel sends
 * `Authorization: Bearer $CRON_SECRET` automatically for cron invocations, and
 * anything without it is refused — these endpoints send real mail, so an open
 * URL would be a way for anyone to spam a club's members.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  // Fail closed. Without a configured secret there is no way to tell a cron
  // invocation from a stranger, so nothing runs.
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (header.length !== expected.length) return false;

  // Constant-time-ish compare; both strings are short and same-length here.
  let mismatch = 0;
  for (let i = 0; i < expected.length; i += 1) {
    mismatch |= header.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function GET(request: Request, { params }: { params: { sweep: string } }) {
  if (!isAuthorized(request)) {
    return jsonError("UNAUTHORIZED", "Missing or invalid cron credentials.", { status: 401 });
  }

  const name = params.sweep as SweepName;
  const sweep = SWEEPS[name];
  if (!sweep) {
    return jsonError("UNKNOWN_SWEEP", `No such sweep: ${params.sweep}. Known: ${Object.keys(SWEEPS).join(", ")}.`, {
      status: 404,
    });
  }

  // `?at=` lets a developer (or a test) drive the sweep's windows without
  // waiting for the clock. It only changes which rows are considered; dedupe
  // keys still make repeat runs safe.
  const atParam = new URL(request.url).searchParams.get("at");
  const at = atParam ? new Date(atParam) : new Date();
  if (Number.isNaN(at.getTime())) {
    return jsonError("INVALID_AT", "`at` must be an ISO date-time.", { status: 400 });
  }

  try {
    const started = Date.now();
    const summary = await sweep(at);
    console.log(`[cron:${name}] ${JSON.stringify(summary)} in ${Date.now() - started}ms`);
    return jsonSuccess({ sweep: name, at: at.toISOString(), ...summary });
  } catch (error) {
    console.error(`[cron:${name}]`, error);
    return jsonError("SWEEP_FAILED", error instanceof Error ? error.message : "Sweep failed.", { status: 500 });
  }
}

/** Vercel Cron issues GET; POST is here so the sweeps can be triggered manually. */
export const POST = GET;

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { Allow: "GET, POST" } });
}
