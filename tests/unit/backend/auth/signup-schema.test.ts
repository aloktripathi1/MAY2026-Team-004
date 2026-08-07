import {
  DEFAULT_ALLOWED_EMAIL_DOMAIN,
  INSTITUTIONAL_EMAIL_DOMAIN,
  getAllowedEmailDomains,
  isAllowedEmailDomain,
  signupSchema,
} from "@/backend/auth/signup-schema";

describe("signupSchema", () => {
  it("accepts institutional @ds.study.iitm.ac.in emails", () => {
    const parsed = signupSchema.safeParse({
      name: "Ananya Rao",
      email: "23s1000999@ds.study.iitm.ac.in",
      rollNumber: "23s1000999",
      password: "SecurePass1",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.email).toBe("23s1000999@ds.study.iitm.ac.in");
    }
  });

  it("lowercases institutional email", () => {
    const parsed = signupSchema.safeParse({
      name: "Ananya Rao",
      email: "23S1000999@DS.STUDY.IITM.AC.IN",
      rollNumber: "23s1000999",
      password: "SecurePass1",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.email).toBe("23s1000999@ds.study.iitm.ac.in");
    }
  });

  it("rejects non-institutional email domains", () => {
    const parsed = signupSchema.safeParse({
      name: "Outside User",
      email: "student@gmail.com",
      rollNumber: "23s1000888",
      password: "SecurePass1",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message ?? "").toMatch(new RegExp(`@${INSTITUTIONAL_EMAIL_DOMAIN}`));
    }
  });

  it("rejects email that only contains the domain as a substring", () => {
    const parsed = signupSchema.safeParse({
      name: "Spoof User",
      email: "evil@ds.study.iitm.ac.in.evil.com",
      rollNumber: "23s1000777",
      password: "SecurePass1",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects short passwords", () => {
    const parsed = signupSchema.safeParse({
      name: "Ananya Rao",
      email: "23s1000999@ds.study.iitm.ac.in",
      rollNumber: "23s1000999",
      password: "short",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message ?? "").toMatch(/at least 8/);
    }
  });

  it("rejects missing name and roll number", () => {
    const missingName = signupSchema.safeParse({
      name: "  ",
      email: "23s1000999@ds.study.iitm.ac.in",
      rollNumber: "23s1000999",
      password: "SecurePass1",
    });
    expect(missingName.success).toBe(false);

    const missingRoll = signupSchema.safeParse({
      name: "Ananya Rao",
      email: "23s1000999@ds.study.iitm.ac.in",
      rollNumber: "",
      password: "SecurePass1",
    });
    expect(missingRoll.success).toBe(false);
  });
});

describe("ALLOWED_EMAIL_DOMAINS", () => {
  const original = process.env.ALLOWED_EMAIL_DOMAINS;

  afterEach(() => {
    if (original === undefined) delete process.env.ALLOWED_EMAIL_DOMAINS;
    else process.env.ALLOWED_EMAIL_DOMAINS = original;
  });

  function accepts(email: string) {
    return signupSchema.safeParse({
      name: "Test", email, rollNumber: "23t0001", password: "SecurePass1",
    }).success;
  }

  it("defaults to the institution's student domain", () => {
    delete process.env.ALLOWED_EMAIL_DOMAINS;
    expect(getAllowedEmailDomains()).toEqual([DEFAULT_ALLOWED_EMAIL_DOMAIN]);
    expect(accepts(`a@${DEFAULT_ALLOWED_EMAIL_DOMAIN}`)).toBe(true);
    expect(accepts("a@gmail.com")).toBe(false);
  });

  it("accepts several domains, trimmed, lowercased, with or without @", () => {
    process.env.ALLOWED_EMAIL_DOMAINS = " ds.study.iitm.ac.in , @Staff.IITM.AC.IN ";
    expect(getAllowedEmailDomains()).toEqual(["ds.study.iitm.ac.in", "staff.iitm.ac.in"]);
    expect(accepts("a@ds.study.iitm.ac.in")).toBe(true);
    expect(accepts("prof@staff.iitm.ac.in")).toBe(true);
    expect(accepts("a@gmail.com")).toBe(false);
  });

  it("accepts subdomains of an allowed domain", () => {
    process.env.ALLOWED_EMAIL_DOMAINS = "iitm.ac.in";
    expect(accepts("a@iitm.ac.in")).toBe(true);
    expect(accepts("a@ds.study.iitm.ac.in")).toBe(true);
  });

  /**
   * The reason this matches on label boundaries instead of endsWith: with a
   * naive suffix check, `evil-iitm.ac.in` passes an `iitm.ac.in` rule — and that
   * is exactly the domain someone would register to get in.
   */
  it("refuses a lookalike domain", () => {
    process.env.ALLOWED_EMAIL_DOMAINS = "iitm.ac.in";
    expect(accepts("attacker@evil-iitm.ac.in")).toBe(false);
    expect(accepts("attacker@iitm.ac.in.evil.com")).toBe(false);
    expect(isAllowedEmailDomain("attacker@notiitm.ac.in", ["iitm.ac.in"])).toBe(false);
  });

  // A typo that emptied the variable must not silently open signup to everyone.
  it("falls back to the default when the value is empty or junk", () => {
    for (const value of ["", "   ", ",", " , , "]) {
      process.env.ALLOWED_EMAIL_DOMAINS = value;
      expect(getAllowedEmailDomains()).toEqual([DEFAULT_ALLOWED_EMAIL_DOMAIN]);
      expect(accepts("a@gmail.com")).toBe(false);
    }
  });

  it("names every allowed domain in the error message", () => {
    process.env.ALLOWED_EMAIL_DOMAINS = "ds.study.iitm.ac.in,staff.iitm.ac.in";
    const parsed = signupSchema.safeParse({
      name: "Test", email: "a@gmail.com", rollNumber: "23t0001", password: "SecurePass1",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const message = parsed.error.issues.map((i) => i.message).join(" ");
      expect(message).toContain("@ds.study.iitm.ac.in");
      expect(message).toContain("@staff.iitm.ac.in");
    }
  });
});
