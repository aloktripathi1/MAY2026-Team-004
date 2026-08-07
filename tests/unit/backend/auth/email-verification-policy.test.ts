import { requiresEmailVerification } from "@/backend/auth/email-verification";

describe("requiresEmailVerification", () => {
  const original = process.env.REQUIRE_EMAIL_VERIFICATION;

  afterEach(() => {
    if (original === undefined) delete process.env.REQUIRE_EMAIL_VERIFICATION;
    else process.env.REQUIRE_EMAIL_VERIFICATION = original;
  });

  /**
   * The default matters more than it looks. Enabling the gate while
   * EMAIL_ALLOWLIST is still pinned means new signups never receive a link and
   * can never sign in, so it must stay off until someone opts in explicitly.
   */
  it("is off unless explicitly enabled", () => {
    delete process.env.REQUIRE_EMAIL_VERIFICATION;
    expect(requiresEmailVerification()).toBe(false);

    process.env.REQUIRE_EMAIL_VERIFICATION = "";
    expect(requiresEmailVerification()).toBe(false);

    process.env.REQUIRE_EMAIL_VERIFICATION = "false";
    expect(requiresEmailVerification()).toBe(false);

    // Not a truthy-string trap: only the documented values count.
    process.env.REQUIRE_EMAIL_VERIFICATION = "yes";
    expect(requiresEmailVerification()).toBe(false);
  });

  it("accepts \"true\" and \"1\", case-insensitively and whitespace-tolerant", () => {
    for (const value of ["true", "TRUE", " true ", "1"]) {
      process.env.REQUIRE_EMAIL_VERIFICATION = value;
      expect(requiresEmailVerification()).toBe(true);
    }
  });
});
