import { NextResponse } from "next/server";
import { prisma } from "@/backend/db/prisma";
import { escapeHtml } from "@/backend/email/render";
import { verifyUnsubscribeToken } from "@/backend/email/unsubscribe";
import {
  EMAIL_CATEGORY_LABELS,
  EMAIL_PREF_KEYS,
  parseNotificationPrefs,
} from "@/lib/notification-prefs";

/**
 * Opting out from an email footer, without a login.
 *
 * GET shows a confirmation with a button; POST performs it. The split is
 * deliberate: mail clients and corporate link scanners pre-fetch every URL in a
 * message, and a GET that unsubscribes would silently opt people out of mail
 * they still want. POST also satisfies RFC 8058 one-click
 * (`List-Unsubscribe-Post`), which is what the header on outgoing mail promises.
 */

function page(body: string, status = 200) {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Email preferences · Sangam</title>
    <style>
      body { margin:0; min-height:100vh; display:grid; place-items:center; background:#0f0f14; color:#fff;
             font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; padding:24px; }
      .card { max-width:440px; text-align:center; background:rgba(255,255,255,0.04);
              border:1px solid rgba(255,255,255,0.12); border-radius:16px; padding:32px; }
      h1 { font-size:20px; margin:0 0 10px; }
      p { margin:0 0 22px; color:#a1a1aa; font-size:15px; line-height:1.6; }
      button { background:#7c3aed; color:#fff; border:0; padding:11px 20px; border-radius:9px;
               font-size:15px; font-weight:600; cursor:pointer; font-family:inherit; }
      .link { display:block; margin-top:18px; color:#a1a1aa; font-size:13px; }
    </style>
  </head>
  <body><div class="card">${body}</div></body>
</html>`;

  return new NextResponse(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

const INVALID = `<h1>Link not valid</h1>
  <p>This unsubscribe link is not valid. You can change every email setting from your profile instead.</p>
  <a class="link" href="/app/profile">Open notification settings</a>`;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const payload = verifyUnsubscribeToken(token);
  if (!payload) return page(INVALID, 400);

  const label = EMAIL_CATEGORY_LABELS[payload.category];

  return page(`<h1>Stop these emails?</h1>
    <p>You're about to turn off: <strong>${escapeHtml(label)}</strong>. Other Sangam emails keep working, and you can switch this back on any time.</p>
    <form method="post" action="/api/email/unsubscribe?token=${encodeURIComponent(token!)}">
      <button type="submit">Turn these emails off</button>
    </form>
    <a class="link" href="/app/profile">Manage all notification settings instead</a>`);
}

export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const payload = verifyUnsubscribeToken(token);
  if (!payload) return page(INVALID, 400);

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { notificationPrefs: true },
  });
  if (!user) return page(INVALID, 400);

  const prefs = parseNotificationPrefs(user.notificationPrefs);
  const next = { ...prefs, [EMAIL_PREF_KEYS[payload.category]]: false };

  await prisma.user.update({
    where: { id: payload.userId },
    data: { notificationPrefs: JSON.stringify(next) },
  });

  return page(`<h1>Done — you're unsubscribed</h1>
    <p>You'll no longer get email about ${escapeHtml(EMAIL_CATEGORY_LABELS[payload.category].toLowerCase())}. Everything else is unchanged.</p>
    <a class="link" href="/app/profile">Change your notification settings</a>`);
}
