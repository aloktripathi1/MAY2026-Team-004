import { normalizeEventTags, serializeEventTags } from "@/lib/event-tags";

describe("normalizeEventTags", () => {
  it("trims whitespace and drops blanks", () => {
    expect(normalizeEventTags([" tech ", "", "music  "])).toEqual(["tech", "music"]);
    expect(normalizeEventTags(" tech, music , , debate ")).toEqual(["tech", "music", "debate"]);
    expect(normalizeEventTags(null)).toEqual([]);
  });
});

describe("serializeEventTags", () => {
  it("returns the tag array for Postgres", () => {
    expect(serializeEventTags(["tech", "music"])).toEqual(["tech", "music"]);
  });
});
