export const INTEREST_OPTIONS = [
  "Technical",
  "Cultural",
  "Sports",
  "Design",
  "Debate",
  "Entrepreneurship",
  "Sustainability",
  "Writing",
] as const;

export type Interest = (typeof INTEREST_OPTIONS)[number];

export function parseInterests(value: unknown): string[] {
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}
