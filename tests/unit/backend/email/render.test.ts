import { escapeHtml, renderLayout, safeUrl } from "@/backend/email/render";

describe("escapeHtml", () => {
  it("escapes every character that could break out of markup", () => {
    expect(escapeHtml(`<script>alert("x") & 'y'</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;) &amp; &#39;y&#39;&lt;/script&gt;",
    );
  });

  it("escapes ampersands before entities, not after", () => {
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });
});

describe("safeUrl", () => {
  it("passes http and https through", () => {
    expect(safeUrl("https://sangam.test/app")).toBe("https://sangam.test/app");
    expect(safeUrl("http://localhost:3000/app")).toBe("http://localhost:3000/app");
  });

  // A javascript: href in an email is mostly inert, but some clients and the
  // webmail preview will honour it. Refuse anything that isn't http(s).
  it("refuses any other scheme", () => {
    expect(safeUrl("javascript:alert(1)")).toBe("#");
    expect(safeUrl("data:text/html,<script>alert(1)</script>")).toBe("#");
    expect(safeUrl("/relative/path")).toBe("#");
  });
});

describe("renderLayout", () => {
  const base = {
    heading: "Heading here",
    paragraphs: ["First line.", "Second line."],
    button: { label: "Open it", url: "https://sangam.test/app" },
  };

  it("produces both an HTML and a plain-text body", () => {
    const { html, text } = renderLayout(base);
    expect(html).toContain("Heading here");
    expect(html).toContain("https://sangam.test/app");
    expect(text).toContain("First line.");
    expect(text).toContain("Open it: https://sangam.test/app");
    expect(text).not.toContain("<");
  });

  it("escapes user-supplied copy in the HTML body", () => {
    const { html } = renderLayout({
      ...base,
      heading: `<img src=x onerror="alert(1)">`,
      paragraphs: ["<b>not bold</b>"],
    });
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<b>not bold</b>");
    expect(html).toContain("&lt;img src=x");
  });

  it("renders fact rows as label/value pairs in both formats", () => {
    const { html, text } = renderLayout({
      ...base,
      facts: [{ label: "When", value: "Friday at 18:00" }],
    });
    expect(html).toContain("When");
    expect(html).toContain("Friday at 18:00");
    expect(text).toContain("When: Friday at 18:00");
  });

  it("shows an opt-out line only when a manage URL is given", () => {
    const withManage = renderLayout({ ...base, manageUrl: "https://sangam.test/unsub" });
    expect(withManage.html).toContain("https://sangam.test/unsub");
    expect(withManage.text).toContain("https://sangam.test/unsub");
    expect(withManage.html).toContain("Manage what you get");

    // Transactional mail has no opt-out and no preferences to manage — the
    // footer is omitted rather than filled with a generic "this is an
    // account email" line that says nothing the note above it hasn't already.
    const transactional = renderLayout(base);
    expect(transactional.html).not.toContain("Manage what you get");
    expect(transactional.text).not.toContain("Manage what you get");
  });

  it("hides the preheader from the visible body", () => {
    const { html } = renderLayout({ ...base, preview: "Peek at this" });
    expect(html).toContain("Peek at this");
    expect(html).toMatch(/display:none[^>]*>Peek at this/);
  });
});
