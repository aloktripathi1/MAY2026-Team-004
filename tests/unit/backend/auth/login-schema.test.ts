import { loginSchema, safeRedirectPath } from "@/backend/auth/login-schema";

describe("loginSchema", () => {
  it("accepts institutional email and password", () => {
    const parsed = loginSchema.safeParse({
      email: "23s1000123@ds.study.iitm.ac.in",
      password: "sangam",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.email).toBe("23s1000123@ds.study.iitm.ac.in");
    }
  });

  it("rejects non-institutional email", () => {
    const parsed = loginSchema.safeParse({
      email: "user@gmail.com",
      password: "sangam",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects empty password", () => {
    const parsed = loginSchema.safeParse({
      email: "23s1000123@ds.study.iitm.ac.in",
      password: "",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("safeRedirectPath", () => {
  it("only allows same-origin relative paths", () => {
    expect(safeRedirectPath("/admin", "/app")).toBe("/admin");
    expect(safeRedirectPath("/coordinator/events", "/app")).toBe("/coordinator/events");
    expect(safeRedirectPath("https://evil.com", "/app")).toBe("/app");
    expect(safeRedirectPath("//evil.com", "/app")).toBe("/app");
    expect(safeRedirectPath(undefined, "/app")).toBe("/app");
    expect(safeRedirectPath("", "/faculty")).toBe("/faculty");
  });
});
