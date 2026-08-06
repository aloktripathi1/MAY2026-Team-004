import { Resend } from "resend";
import { Prisma } from "@prisma/client";
import { prisma } from "@/backend/db/prisma";
import { getEmailConfig, isAllowedRecipient } from "@/backend/email/config";
import type { RenderedEmail, TemplateName } from "@/backend/email/templates";
import { unsubscribeUrl } from "@/backend/email/unsubscribe";
import { wantsEmail } from "@/lib/notification-prefs";

/**
 * The single way mail leaves this app.
 *
 * Everything that matters for correctness lives here rather than at the ~20
 * call sites: preference enforcement, the pre-domain allowlist, dry-run, the
 * idempotency claim, and the audit row. Call sites just describe the email.
 *
 * `sendEmail` never throws. A notification failing must not fail the user
 * action that triggered it — an approval still stands even if the mail bounces.
 * Callers that care can inspect the returned status.
 */

const SEND_TIMEOUT_MS = 10_000;
const DEFAULT_CONCURRENCY = 5;

export type SendStatus = "sent" | "dryRun" | "skipped" | "failed" | "duplicate";

export type SendResult = {
  status: SendStatus;
  /** Human-readable reason for skipped/failed/duplicate. */
  reason?: string;
  providerId?: string;
};

export type SendEmailInput = {
  to: string;
  template: TemplateName;
  rendered: RenderedEmail;
  /**
   * Stable per-(recipient, thing) string. Two sends with the same key mail
   * once, ever. Scheduled jobs must include the window they're mailing for
   * (e.g. `reminder:<eventId>:<userId>`) so retries collapse.
   */
  dedupeKey: string;
  userId?: string | null;
  /** Raw `User.notificationPrefs`; required to honour a category opt-out. */
  prefsJson?: unknown;
};

let cachedClient: Resend | null = null;
let cachedKey: string | null = null;

function getClient(apiKey: string): Resend {
  if (cachedClient && cachedKey === apiKey) return cachedClient;
  cachedClient = new Resend(apiKey);
  cachedKey = apiKey;
  return cachedClient;
}

/**
 * The Resend SDK takes no abort signal, so a hung request would otherwise hold
 * a Server Action open indefinitely. Racing a timer bounds the wait; the
 * `idempotencyKey` on the request is what keeps an abandoned-but-succeeding
 * send from turning into a duplicate on retry.
 */
async function withTimeout<T>(promise: Promise<T>, ms = SEND_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`email send timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Frees a claimed dedupe key after a genuine send failure, so the next attempt
 * isn't mistaken for a duplicate, while keeping the failed row for audit. The
 * key is mangled rather than deleted precisely so both hold at once.
 */
async function releaseKey(logId: string, dedupeKey: string, error: string): Promise<void> {
  try {
    await prisma.emailLog.update({
      where: { id: logId },
      data: { status: "failed", error: error.slice(0, 500), dedupeKey: `failed:${logId}:${dedupeKey}`.slice(0, 500) },
    });
  } catch {
    // Audit-only bookkeeping; never let it mask the original failure.
  }
}

export async function sendEmail(input: SendEmailInput): Promise<SendResult> {
  const { to, template, rendered, dedupeKey, userId = null, prefsJson } = input;
  const config = getEmailConfig();

  const address = to?.trim();
  if (!address || !address.includes("@")) {
    return { status: "skipped", reason: "invalid recipient address" };
  }

  // Preference check before the write: an opted-out recipient shouldn't even
  // occupy a dedupe key, so turning the category back on works immediately.
  if (rendered.category && prefsJson !== undefined && !wantsEmail(prefsJson, rendered.category)) {
    return { status: "skipped", reason: `recipient opted out of ${rendered.category}` };
  }

  // The allowlist guards real deliveries only. In dry-run nothing leaves the
  // app, so applying it there would just hide which emails *would* have gone
  // out — exactly what dry-run exists to show.
  if (config.enabled && !isAllowedRecipient(address, config.allowlist)) {
    return { status: "skipped", reason: "recipient not in EMAIL_ALLOWLIST" };
  }

  const willSend = config.enabled;

  // Claim the key. A unique-violation here means someone (a concurrent request,
  // or a cron retry) already handled this exact email.
  let logId: string;
  try {
    const log = await prisma.emailLog.create({
      data: {
        dedupeKey,
        template,
        to: address,
        subject: rendered.subject,
        status: willSend ? "sent" : "dryRun",
        userId,
      },
      select: { id: true },
    });
    logId = log.id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { status: "duplicate", reason: "already sent" };
    }
    return { status: "failed", reason: error instanceof Error ? error.message : String(error) };
  }

  if (!willSend) {
    console.log(
      `[email:dry-run] ${template} → ${address} — "${rendered.subject}"` +
        (config.apiKey ? " (EMAIL_ENABLED is not true)" : " (no RESEND_API_KEY)"),
    );
    return { status: "dryRun" };
  }

  // One-click unsubscribe. Gmail and Yahoo both want these headers on bulk
  // mail, and without them promotional-looking sends get filtered.
  const headers: Record<string, string> = {};
  if (rendered.category && userId) {
    const url = unsubscribeUrl({ userId, category: rendered.category }, config.appUrl);
    headers["List-Unsubscribe"] = `<${url}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }

  try {
    const { data, error } = await withTimeout(
      getClient(config.apiKey!).emails.send(
        {
          from: config.from,
          to: [address],
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
          ...(config.replyTo ? { replyTo: config.replyTo } : {}),
          ...(Object.keys(headers).length ? { headers } : {}),
        },
        // Resend dedupes on this server-side. Belt and braces with our own
        // EmailLog claim: if a request times out here and we release the key,
        // the retry still can't produce a second delivery.
        { idempotencyKey: dedupeKey.slice(0, 256) },
      ),
    );

    if (error) {
      await releaseKey(logId, dedupeKey, `${error.name}: ${error.message}`);
      return { status: "failed", reason: `${error.name}: ${error.message}` };
    }

    if (data?.id) {
      await prisma.emailLog.update({ where: { id: logId }, data: { providerId: data.id } });
    }
    return { status: "sent", providerId: data?.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await releaseKey(logId, dedupeKey, message);
    return { status: "failed", reason: message };
  }
}

/**
 * Fan-out with a small concurrency cap. Announcements go to every member of a
 * club, and firing hundreds of parallel HTTP calls from a Server Action would
 * hit Resend's rate limit and stall the request.
 */
export async function sendEmails(
  inputs: SendEmailInput[],
  concurrency = DEFAULT_CONCURRENCY,
): Promise<SendResult[]> {
  const results: SendResult[] = new Array(inputs.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < inputs.length) {
      const index = cursor++;
      results[index] = await sendEmail(inputs[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, inputs.length) }, worker));
  return results;
}

/** Rolls a batch of results into counts, for cron routes to return as JSON. */
export function summarize(results: SendResult[]): Record<SendStatus, number> {
  const summary: Record<SendStatus, number> = { sent: 0, dryRun: 0, skipped: 0, failed: 0, duplicate: 0 };
  for (const result of results) summary[result.status] += 1;
  return summary;
}
