import { parseInterests } from "@/lib/interests";

describe("parseInterests", () => {
  it("returns only string values from stored JSON", () => {
    expect(parseInterests(undefined)).toEqual([]);
    expect(parseInterests(JSON.stringify(["Technical", 42, "Sports", null]))).toEqual(["Technical", "Sports"]);
    expect(parseInterests(JSON.stringify({ interest: "Technical" }))).toEqual([]);
  });
});
