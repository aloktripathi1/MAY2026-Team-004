import { absoluteUrl, getEmailConfig, isAllowedRecipient } from "@/backend/email/config";

const ENV_KEYS = [
  "RESEND_API_KEY",
  "EMAIL_ENABLED",
  "EMAIL_FROM",
  "EMAIL_REPLY_TO",
  "EMAIL_ALLOWLIST",
  "APP_URL",
  "NEXTAUTH_URL",
] as const;

describe("getEmailConfig", () => {
  const original: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      original[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  });

  // Two independent switches, both required. Getting this wrong in either
  // direction is bad: silently not sending in production, or blasting real
  // students from a developer's laptop.
  it("only enables sending when the flag is true AND a key is present", () => {
    process.env.EMAIL_ENABLED = "true";
    expect(getEmailConfig().enabled).toBe(false); // no key

    process.env.RESEND_API_KEY = "re_test";
    expect(getEmailConfig().enabled).toBe(true);

    process.env.EMAIL_ENABLED = "false";
    expect(getEmailConfig().enabled).toBe(false);

    delete process.env.EMAIL_ENABLED;
    expect(getEmailConfig().enabled).toBe(false);
  });

  it("accepts \"1\" as well as \"true\"", () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_ENABLED = "1";
    expect(getEmailConfig().enabled).toBe(true);
  });

  it("falls back to the Resend test sender", () => {
    expect(getEmailConfig().from).toBe("Sangam <onboarding@resend.dev>");
  });

  it("prefers APP_URL over NEXTAUTH_URL and strips a trailing slash", () => {
    process.env.NEXTAUTH_URL = "http://localhost:3000";
    expect(getEmailConfig().appUrl).toBe("http://localhost:3000");

    process.env.APP_URL = "https://sangam.test/";
    expect(getEmailConfig().appUrl).toBe("https://sangam.test");
  });

  it("parses the allowlist into trimmed lowercase entries", () => {
    process.env.EMAIL_ALLOWLIST = " A@B.com , @example.org ,, ";
    expect(getEmailConfig().allowlist).toEqual(["a@b.com", "@example.org"]);
  });
});

describe("isAllowedRecipient", () => {
  it("allows everything when the allowlist is empty", () => {
    expect(isAllowedRecipient("anyone@anywhere.com", [])).toBe(true);
  });

  it("matches an exact address, case-insensitively", () => {
    expect(isAllowedRecipient("Me@Example.com", ["me@example.com"])).toBe(true);
    expect(isAllowedRecipient("other@example.com", ["me@example.com"])).toBe(false);
  });

  it("matches a whole domain with or without the @", () => {
    expect(isAllowedRecipient("a@ds.study.iitm.ac.in", ["@ds.study.iitm.ac.in"])).toBe(true);
    expect(isAllowedRecipient("b@ds.study.iitm.ac.in", ["ds.study.iitm.ac.in"])).toBe(true);
    expect(isAllowedRecipient("c@gmail.com", ["ds.study.iitm.ac.in"])).toBe(false);
  });

  // "evil-example.com" must not pass a "example.com" rule.
  it("does not let a lookalike domain slip through", () => {
    expect(isAllowedRecipient("x@evilexample.com", ["example.com"])).toBe(false);
    expect(isAllowedRecipient("x@sub.example.com", ["example.com"])).toBe(false);
  });
});

describe("absoluteUrl", () => {
  it("joins a path onto the configured origin", () => {
    expect(absoluteUrl("/app/profile", "https://sangam.test")).toBe("https://sangam.test/app/profile");
    expect(absoluteUrl("app/profile", "https://sangam.test")).toBe("https://sangam.test/app/profile");
  });

  it("leaves an absolute URL alone", () => {
    expect(absoluteUrl("https://elsewhere.test/x", "https://sangam.test")).toBe("https://elsewhere.test/x");
  });
});

describe("transactional mail and the allowlist", () => {
  /**
   * Verification is the only way into your own account. Filtering it through
   * EMAIL_ALLOWLIST would mean a student signs up, never receives a link, and
   * can never sign in — the safety net becoming the lockout. sendEmail exempts
   * `category: null` for exactly this reason; the check itself is asserted here
   * so the allowlist helper's contract stays honest.
   */
  it("would otherwise block a signup outside the allowlist", () => {
    const allowlist = ["23f2005593@ds.study.iitm.ac.in"];
    expect(isAllowedRecipient("brand.new.student@ds.study.iitm.ac.in", allowlist)).toBe(false);
    expect(isAllowedRecipient("23f2005593@ds.study.iitm.ac.in", allowlist)).toBe(true);
  });
});
