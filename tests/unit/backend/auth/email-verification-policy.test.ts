import { requiresEmailVerification } from "@/backend/auth/email-verification";

const KEYS = ["REQUIRE_EMAIL_VERIFICATION", "EMAIL_ENABLED", "RESEND_API_KEY"] as const;

describe("requiresEmailVerification", () => {
  const original: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of KEYS) {
      original[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of KEYS) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  });

  /** Email actually working is the precondition for the gate. */
  function enableEmail() {
    process.env.EMAIL_ENABLED = "true";
    process.env.RESEND_API_KEY = "re_test";
  }

  it("is on by default once email can be delivered", () => {
    enableEmail();
    expect(requiresEmailVerification()).toBe(true);
  });

  /**
   * The one case that must never gate. Requiring verification the app cannot
   * send would refuse every account with no way to comply — including whoever
   * is trying to configure it. Locally and in tests email is off, so the gate
   * silently stays out of the way.
   */
  it("is inert when email cannot be delivered", () => {
    expect(requiresEmailVerification()).toBe(false); // nothing configured

    process.env.EMAIL_ENABLED = "true"; // flag on, but no API key
    expect(requiresEmailVerification()).toBe(false);

    delete process.env.EMAIL_ENABLED;
    process.env.RESEND_API_KEY = "re_test"; // key present, flag off
    expect(requiresEmailVerification()).toBe(false);
  });

  it("can be switched off explicitly even when email works", () => {
    enableEmail();
    for (const value of ["false", "FALSE", " false ", "0"]) {
      process.env.REQUIRE_EMAIL_VERIFICATION = value;
      expect(requiresEmailVerification()).toBe(false);
    }
  });

  it("stays on for any other value, including junk", () => {
    enableEmail();
    // Anything that isn't an explicit opt-out leaves the gate on, so a typo
    // fails safe rather than silently disabling verification.
    for (const value of ["true", "1", "", "yes", "no", "off"]) {
      process.env.REQUIRE_EMAIL_VERIFICATION = value;
      expect(requiresEmailVerification()).toBe(true);
    }
  });
});
