import { NextResponse } from "next/server";
import { consumeVerificationToken } from "@/backend/auth/email-verification";
import { escapeHtml } from "@/backend/email/render";

/**
 * Landing page for the link in the verification email. Recipients click this in
 * a mail client, so it answers with a small HTML page rather than JSON — an API
 * error body is not a useful thing to show someone who just clicked "verify".
 */

function page(title: string, message: string, status: number, cta = "/app") {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)} · Sangam</title>
    <style>
      body { margin:0; min-height:100vh; display:grid; place-items:center; background:#0f0f14; color:#fff;
             font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; padding:24px; }
      .card { max-width:420px; text-align:center; background:rgba(255,255,255,0.04);
              border:1px solid rgba(255,255,255,0.12); border-radius:16px; padding:32px; }
      h1 { font-size:20px; margin:0 0 10px; }
      p { margin:0 0 22px; color:#a1a1aa; font-size:15px; line-height:1.6; }
      a { display:inline-block; background:#7c3aed; color:#fff; text-decoration:none;
          padding:11px 20px; border-radius:9px; font-size:15px; font-weight:600; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(message)}</p>
      <a href="${escapeHtml(cta)}">Go to Sangam</a>
    </div>
  </body>
</html>`;

  return new NextResponse(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const result = await consumeVerificationToken(token);

  if (!result.ok) {
    const title = result.code === "EXPIRED" ? "Link expired" : "Link not valid";
    return page(title, result.message, result.code === "INVALID" ? 400 : 410, "/login");
  }

  return page(
    result.alreadyVerified ? "Already verified" : "Email verified",
    result.alreadyVerified
      ? "This address was already confirmed. Nothing else to do."
      : "Thanks — your email address is confirmed. Sangam can now reach you about your clubs and events.",
    200,
  );
}
