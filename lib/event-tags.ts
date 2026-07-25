export function normalizeEventTags(tags: string[] | string | null | undefined): string[] {
  if (Array.isArray(tags)) {
    return tags.map((tag) => tag.trim()).filter(Boolean);
  }

  return (tags ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function serializeEventTags(tags: string[]): string[] {
  return tags;
}
