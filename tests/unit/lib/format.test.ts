import { formatIssueStatus, formatTaskStatus, formatTaskDue, pluralize, formatTimeAgo } from "@/lib/format";

describe("formatIssueStatus", () => {
  it("expands the in-progress label", () => {
    expect(formatIssueStatus("InProgress")).toBe("In progress");
    expect(formatIssueStatus("Open")).toBe("Open");
  });
});

describe("formatTaskStatus", () => {
  it("maps known workflow statuses", () => {
    expect(formatTaskStatus("todo")).toBe("To do");
    expect(formatTaskStatus("doing")).toBe("In progress");
    expect(formatTaskStatus("done")).toBe("Done");
    expect(formatTaskStatus("blocked")).toBe("blocked");
  });
});

describe("formatTaskDue", () => {
  it("handles missing and populated due dates", () => {
    expect(formatTaskDue(null)).toBe("No due date");
    const due = new Date("2026-07-12T09:30:00Z");
    expect(formatTaskDue(due)).toMatch(/^Due \d{1,2} [A-Z][a-z]{2}, \d{1,2}:\d{2} (AM|PM)$/);
  });
});

describe("pluralize", () => {
  it("returns the singular only for a count of one", () => {
    expect(pluralize(1, "task")).toBe("task");
    expect(pluralize(0, "task")).toBe("tasks");
    expect(pluralize(2, "person", "people")).toBe("people");
  });
});

describe("formatTimeAgo", () => {
  it("chooses the correct display bucket", () => {
    const now = Date.now();
    expect(formatTimeAgo(new Date(now - 30 * 1000))).toBe("just now");
    expect(formatTimeAgo(new Date(now - 5 * 60 * 1000))).toBe("5m");
    expect(formatTimeAgo(new Date(now - 2 * 60 * 60 * 1000))).toBe("2h");
    expect(formatTimeAgo(new Date(now - 3 * 24 * 60 * 60 * 1000))).toBe("3d");
    expect(formatTimeAgo(new Date(now - 14 * 24 * 60 * 60 * 1000))).toBe("2w");
    expect(formatTimeAgo(new Date(now - 40 * 24 * 60 * 60 * 1000))).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
  });
});
