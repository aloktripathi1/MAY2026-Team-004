import {
  createUnsubscribeToken,
  unsubscribeUrl,
  verifyUnsubscribeToken,
} from "@/backend/email/unsubscribe";

describe("unsubscribe tokens", () => {
  const payload = { userId: "usr_123", category: "events" } as const;

  it("round-trips a user and category", () => {
    expect(verifyUnsubscribeToken(createUnsubscribeToken(payload))).toEqual(payload);
  });

  it("handles ids containing the separator character", () => {
    const awkward = { userId: "usr:with:colons", category: "tasks" } as const;
    expect(verifyUnsubscribeToken(createUnsubscribeToken(awkward))).toEqual(awkward);
  });

  // The whole point of signing: nobody can craft a link that unsubscribes
  // someone else, or flip the category on an existing link.
  it("rejects a tampered payload", () => {
    const token = createUnsubscribeToken(payload);
    const [, signature] = token.split(".");
    const forged = Buffer.from("usr_456:events", "utf8").toString("base64url");
    expect(verifyUnsubscribeToken(`${forged}.${signature}`)).toBeNull();
  });

  it("rejects a tampered signature", () => {
    const token = createUnsubscribeToken(payload);
    expect(verifyUnsubscribeToken(`${token}x`)).toBeNull();
  });

  it("rejects malformed and empty input", () => {
    expect(verifyUnsubscribeToken(null)).toBeNull();
    expect(verifyUnsubscribeToken("")).toBeNull();
    expect(verifyUnsubscribeToken("no-dot-here")).toBeNull();
    expect(verifyUnsubscribeToken(".sig")).toBeNull();
  });

  it("rejects a validly signed token naming a category that doesn't exist", () => {
    // Signed with the real secret, but "billing" isn't a category — this is the
    // check that stops a signed token from writing an arbitrary prefs key.
    const forged = createUnsubscribeToken({ userId: "usr_1", category: "billing" as never });
    expect(verifyUnsubscribeToken(forged)).toBeNull();
  });

  it("builds an absolute, URL-encoded opt-out link", () => {
    const url = unsubscribeUrl(payload, "https://sangam.test");
    expect(url.startsWith("https://sangam.test/api/email/unsubscribe?token=")).toBe(true);
    const token = decodeURIComponent(new URL(url).searchParams.get("token")!);
    expect(verifyUnsubscribeToken(token)).toEqual(payload);
  });
});
