/**
 * Email chrome: one HTML shell every template renders into, plus the plain-text
 * twin. Table-based and inline-styled on purpose — email clients strip <style>
 * blocks, ignore flexbox and grid, and Outlook still needs tables for layout.
 */

/** Escapes text destined for HTML. Every interpolated value goes through this. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escapes a URL for an href, refusing anything that isn't http(s). */
export function safeUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? escapeHtml(url) : "#";
}

export type EmailButton = { label: string; url: string };

export type LayoutInput = {
  /** Large heading at the top of the card. */
  heading: string;
  /** Optional preheader — the grey text mail clients show next to the subject. */
  preview?: string;
  /** Paragraphs of body copy, plain text; each is escaped and wrapped in <p>. */
  paragraphs: string[];
  /** Optional label/value rows rendered as a definition table. */
  facts?: { label: string; value: string }[];
  button?: EmailButton;
  /** Small print under the button, e.g. "this link expires in 24 hours". */
  note?: string;
  /** Rendered as the opt-out line. Omit for transactional mail. */
  manageUrl?: string;
};

const BRAND = "Sangam";
const INK = "#0f0f14";
const MUTED = "#6b7280";
const ACCENT = "#7c3aed";
const HAIRLINE = "#e5e7eb";

function factsHtml(facts: { label: string; value: string }[]): string {
  const rows = facts
    .map(
      ({ label, value }) => `
        <tr>
          <td style="padding:6px 16px 6px 0;color:${MUTED};font-size:13px;white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td>
          <td style="padding:6px 0;color:${INK};font-size:14px;font-weight:600;vertical-align:top;">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join("");

  return `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;border-collapse:collapse;">
        ${rows}
      </table>`;
}

export function renderLayout(input: LayoutInput): { html: string; text: string } {
  const { heading, preview, paragraphs, facts, button, note, manageUrl } = input;

  const previewHtml = preview
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preview)}</div>`
    : "";

  const paragraphsHtml = paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 14px;color:${INK};font-size:15px;line-height:1.6;">${escapeHtml(p)}</p>`,
    )
    .join("");

  const buttonHtml = button
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
        <tr>
          <td style="border-radius:8px;background:${ACCENT};">
            <a href="${safeUrl(button.url)}" style="display:inline-block;padding:12px 22px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">${escapeHtml(button.label)}</a>
          </td>
        </tr>
      </table>`
    : "";

  const noteHtml = note
    ? `<p style="margin:0 0 8px;color:${MUTED};font-size:13px;line-height:1.5;">${escapeHtml(note)}</p>`
    : "";

  const manageHtml = manageUrl
    ? `<p style="margin:0;color:${MUTED};font-size:12px;line-height:1.5;">
         You're receiving this because of your ${BRAND} notification settings.
         <a href="${safeUrl(manageUrl)}" style="color:${MUTED};text-decoration:underline;">Change what ${BRAND} emails you</a>.
       </p>`
    : `<p style="margin:0;color:${MUTED};font-size:12px;line-height:1.5;">This is an account email from ${BRAND}.</p>`;

  const html = `${previewHtml}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f7;padding:28px 0;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid ${HAIRLINE};border-radius:14px;">
        <tr>
          <td style="padding:22px 28px 0;">
            <span style="font-size:13px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${ACCENT};">${BRAND}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 28px 4px;">
            <h1 style="margin:0 0 14px;color:${INK};font-size:21px;line-height:1.3;font-weight:700;">${escapeHtml(heading)}</h1>
            ${paragraphsHtml}
            ${facts?.length ? factsHtml(facts) : ""}
            ${buttonHtml}
            ${noteHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:18px 28px 24px;border-top:1px solid ${HAIRLINE};">
            ${manageHtml}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;

  const textParts = [
    heading.toUpperCase(),
    "",
    ...paragraphs,
    ...(facts?.length ? ["", ...facts.map(({ label, value }) => `${label}: ${value}`)] : []),
    ...(button ? ["", `${button.label}: ${button.url}`] : []),
    ...(note ? ["", note] : []),
    "",
    "—",
    manageUrl
      ? `You're receiving this because of your ${BRAND} notification settings. Change what ${BRAND} emails you: ${manageUrl}`
      : `This is an account email from ${BRAND}.`,
  ];

  return { html: `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">${html}</div>`, text: textParts.join("\n") };
}
