import { INSTITUTIONAL_EMAIL_DOMAIN, signupSchema } from "@/backend/auth/signup-schema";

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
