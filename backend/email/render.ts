/**
 * Email chrome: one HTML shell every template renders into, plus the plain-text
 * twin. Table-based and inline-styled on purpose — email clients strip <style>
 * blocks, ignore flexbox and grid, and Outlook still needs tables for layout.
 *
 * Colors are lifted straight from public/logo.svg (the actual brand mark) so
 * this shell and the app agree on what "Sangam" looks like, rather than
 * approximating from the CSS custom properties separately.
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

// Content sits directly on this — no separate card surface. Padding does the
// separation work instead of a border (see renderLayout below).
const PAGE_BG = "#0A0A0C";
// Low-opacity warm-gray hairline, used only for the thin rule above the
// wordmark and the footer divider — never as a container edge. Solid hex
// rather than rgba() — Outlook's Word rendering engine handles alpha
// inconsistently on borders.
const BORDER = "#2A241D";

// Text hierarchy: warm off-white primary, warm-gray secondary — never pure
// white/gray, which is what made the old template read as generic.
const TEXT = "#F2EDE7";
const MUTED = "#948C80";

// Brand marks straight from the logo: gold accent, pale-gold highlight.
const GOLD = "#D6A64F";
const GOLD_SOFT = "#E8C98A";
// Dark text on the gold button needs real contrast, not pure black.
const INK_ON_GOLD = "#1A1410";

const SERIF = "Georgia, 'Times New Roman', Times, serif";
// Inter first for clients that support it (Gmail's web/app rendering does);
// falls back to each platform's native system font everywhere else, since
// email clients can't reliably load a webfont via @font-face/<link>.
const SANS = "'Inter', -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";

function factsHtml(facts: { label: string; value: string }[]): string {
  const rows = facts
    .map(
      ({ label, value }) => `
        <tr>
          <td style="padding:6px 16px 6px 0;color:${MUTED};font-size:13px;font-family:${SANS};white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td>
          <td style="padding:6px 0;color:${TEXT};font-size:14px;font-family:${SANS};font-weight:600;vertical-align:top;">${escapeHtml(value)}</td>
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
        `<p style="margin:0 0 14px;color:${TEXT};font-size:15px;font-family:${SANS};line-height:1.6;">${escapeHtml(p)}</p>`,
    )
    .join("");

  const buttonHtml = button
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
        <tr>
          <td style="border-radius:6px;background:${GOLD};">
            <a href="${safeUrl(button.url)}" style="display:inline-block;padding:12px 22px;color:${INK_ON_GOLD};font-size:15px;font-family:${SANS};font-weight:700;text-decoration:none;border-radius:6px;">${escapeHtml(button.label)}</a>
          </td>
        </tr>
      </table>`
    : "";

  const noteHtml = note
    ? `<p style="margin:0 0 8px;color:${MUTED};font-size:13px;font-family:${SANS};line-height:1.5;">${escapeHtml(note)}</p>`
    : "";

  // Transactional mail (no manageUrl) already explains itself in the note
  // above — a generic "this is an account email" line under it adds nothing,
  // so the footer row is skipped entirely rather than filled with filler.
  const manageHtml = manageUrl
    ? `<p style="margin:0;color:${MUTED};font-size:12px;font-family:${SANS};line-height:1.5;">
         Sent based on your ${BRAND} notification settings.
         <a href="${safeUrl(manageUrl)}" style="color:${MUTED};text-decoration:underline;">Manage what you get</a>.
       </p>`
    : "";

  const html = `${previewHtml}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAGE_BG};padding:40px 0;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:${PAGE_BG};">
        <tr>
          <td style="padding:0 32px;">
            <div style="font-size:20px;font-weight:700;letter-spacing:0.01em;color:${GOLD_SOFT};font-family:${SERIF};">${BRAND}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px 4px;">
            <h1 style="margin:0 0 14px;color:${TEXT};font-size:21px;line-height:1.3;font-weight:700;font-family:${SANS};">${escapeHtml(heading)}</h1>
            ${paragraphsHtml}
            ${facts?.length ? factsHtml(facts) : ""}
            ${buttonHtml}
            ${noteHtml}
          </td>
        </tr>
        ${manageHtml ? `
        <tr>
          <td style="padding:20px 32px 32px;border-top:1px solid ${BORDER};">
            ${manageHtml}
          </td>
        </tr>` : `<tr><td style="padding:0 0 32px;"></td></tr>`}
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
    ...(manageUrl ? ["", `Sent based on your ${BRAND} notification settings. Manage what you get: ${manageUrl}`] : []),
  ];

  return { html: `<div style="font-family:${SANS};background:${PAGE_BG};">${html}</div>`, text: textParts.join("\n") };
}
