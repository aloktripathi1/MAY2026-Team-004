/**
 * Sends one real email through the configured provider, to prove the Resend
 * setup end to end before trusting it with an actual club's members.
 *
 * Usage (from the repo root, with .env populated):
 *   npx tsx scripts/send-test-email.ts you@example.com
 *   npx tsx scripts/send-test-email.ts you@example.com eventReminder
 *
 * With EMAIL_ENABLED unset this reports a dry run and delivers nothing, which
 * is a useful check on its own. Set EMAIL_ENABLED=true to actually send. On
 * Resend's onboarding@resend.dev sender, delivery only works to the address
 * that owns the Resend account.
 */
import { sendEmail } from "@/backend/email/client";
import { getEmailConfig } from "@/backend/email/config";
import * as templates from "@/backend/email/templates";
import { prisma } from "@/backend/db/prisma";

const SAMPLES = {
  verifyEmail: () =>
    templates.verifyEmail({
      name: "There",
      verifyUrl: `${getEmailConfig().appUrl}/api/auth/verify-email?token=sample-token`,
      manageUrl: `${getEmailConfig().appUrl}/app/profile`,
      expiresInHours: 24,
    }),
  registrationConfirmation: () =>
    templates.registrationConfirmation({
      name: "There",
      eventTitle: "Fusion Night VI",
      clubName: "Sarga - Music Circle",
      date: new Date(Date.now() + 3 * 86_400_000),
      time: "18:00",
      venue: "Amphitheatre",
      eventUrl: `${getEmailConfig().appUrl}/app/events/fusion-night-vi`,
      manageUrl: `${getEmailConfig().appUrl}/app/profile`,
    }),
  eventScheduleChange: () =>
    templates.eventScheduleChange({
      name: "There",
      eventTitle: "Fusion Night VI",
      clubName: "Sarga - Music Circle",
      changes: [{ label: "Venue", from: "Amphitheatre", to: "Main Hall" }],
      date: new Date(Date.now() + 3 * 86_400_000),
      time: "19:00",
      venue: "Main Hall",
      eventUrl: `${getEmailConfig().appUrl}/app/events/fusion-night-vi`,
      manageUrl: `${getEmailConfig().appUrl}/app/profile`,
    }),
  eventReminder: () =>
    templates.eventReminder({
      name: "There",
      eventTitle: "Fusion Night VI",
      clubName: "Sarga - Music Circle",
      date: new Date(Date.now() + 86_400_000),
      time: "18:00",
      venue: "Amphitheatre",
      eventUrl: `${getEmailConfig().appUrl}/app/events/fusion-night-vi`,
      manageUrl: `${getEmailConfig().appUrl}/app/profile`,
    }),
} as const;

type SampleName = keyof typeof SAMPLES;

async function main() {
  const [to, templateArg = "registrationConfirmation"] = process.argv.slice(2);

  if (!to || !to.includes("@")) {
    console.error("Usage: npx tsx scripts/send-test-email.ts <address> [template]");
    console.error(`Templates: ${Object.keys(SAMPLES).join(", ")}`);
    process.exit(1);
  }

  const name = templateArg as SampleName;
  if (!SAMPLES[name]) {
    console.error(`Unknown template "${templateArg}". Choose one of: ${Object.keys(SAMPLES).join(", ")}`);
    process.exit(1);
  }

  const config = getEmailConfig();
  console.log(`from:      ${config.from}`);
  console.log(`to:        ${to}`);
  console.log(`template:  ${name}`);
  console.log(`mode:      ${config.enabled ? "LIVE — this will actually send" : "dry run (EMAIL_ENABLED is not true)"}`);
  if (config.allowlist.length) console.log(`allowlist: ${config.allowlist.join(", ")}`);
  console.log("");

  const result = await sendEmail({
    to,
    template: name,
    rendered: SAMPLES[name](),
    // Timestamped so the script can be run repeatedly without being deduped.
    dedupeKey: `manual-test:${name}:${to}:${Date.now()}`,
  });

  console.log(`status:    ${result.status}`);
  if (result.reason) console.log(`reason:    ${result.reason}`);
  if (result.providerId) console.log(`messageId: ${result.providerId}`);

  if (result.status === "sent") {
    console.log("\nDelivered to the provider. Check the inbox, and Resend's dashboard for the delivery event.");
  } else if (result.status === "dryRun") {
    console.log("\nNothing was sent. Set EMAIL_ENABLED=true and RESEND_API_KEY to send for real.");
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
