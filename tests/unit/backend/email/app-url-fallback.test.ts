/**
 * `APP_URL` decides the origin of every link inside every email. A stale value
 * is the worst kind of failure: mail delivers perfectly and every link in it is
 * dead — which is exactly what happened when the app moved off
 * try-sangam.vercel.app. So when it isn't set, the origin falls back to the host
 * of the request being served, which cannot be stale.
 */
const headersMock = jest.fn();
jest.mock("next/headers", () => ({ headers: () => headersMock() }));

// jest.mock is hoisted above this import, so config.ts sees the mock.
import { getEmailConfig } from "@/backend/email/config";

function requestWith(entries: Record<string, string>) {
  headersMock.mockReturnValue({ get: (name: string) => entries[name.toLowerCase()] ?? null });
}

const KEYS = ["APP_URL", "NEXTAUTH_URL"] as const;

describe("appUrl resolution", () => {
  const original: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of KEYS) {
      original[key] = process.env[key];
      delete process.env[key];
    }
    headersMock.mockReset();
    // Default: no request scope, as in a cron sweep or a CLI script.
    headersMock.mockImplementation(() => {
      throw new Error("called outside a request scope");
    });
  });

  afterEach(() => {
    for (const key of KEYS) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  });

  it("uses the request host when APP_URL is unset", () => {
    requestWith({ host: "sangam-club.com", "x-forwarded-proto": "https" });
    expect(getEmailConfig().appUrl).toBe("https://sangam-club.com");
  });

  it("prefers Vercel's x-forwarded-host over host", () => {
    requestWith({ host: "internal.vercel.internal", "x-forwarded-host": "www.sangam-club.com", "x-forwarded-proto": "https" });
    expect(getEmailConfig().appUrl).toBe("https://www.sangam-club.com");
  });

  it("assumes http for localhost and https otherwise", () => {
    requestWith({ host: "localhost:3000" });
    expect(getEmailConfig().appUrl).toBe("http://localhost:3000");

    requestWith({ host: "sangam-club.com" });
    expect(getEmailConfig().appUrl).toBe("https://sangam-club.com");
  });

  // Scheduled mail has no request to borrow a host from, so an explicit value
  // must still win — the fallback is a safety net, not the source of truth.
  it("lets an explicit APP_URL win over the request host", () => {
    requestWith({ host: "some-preview-deploy.vercel.app", "x-forwarded-proto": "https" });
    process.env.APP_URL = "https://sangam-club.com";
    expect(getEmailConfig().appUrl).toBe("https://sangam-club.com");
  });

  it("falls back to NEXTAUTH_URL, then localhost, outside a request", () => {
    // headersMock throws here — the no-request-scope case.
    process.env.NEXTAUTH_URL = "https://sangam-club.com";
    expect(getEmailConfig().appUrl).toBe("https://sangam-club.com");

    delete process.env.NEXTAUTH_URL;
    expect(getEmailConfig().appUrl).toBe("http://localhost:3000");
  });

  it("strips a trailing slash whichever source it came from", () => {
    requestWith({ host: "sangam-club.com", "x-forwarded-proto": "https" });
    process.env.APP_URL = "https://sangam-club.com/";
    expect(getEmailConfig().appUrl).toBe("https://sangam-club.com");
  });
});
