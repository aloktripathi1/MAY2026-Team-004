export function normalizeEventTags(tags: string[] | string | null | undefined): string[] {
  if (Array.isArray(tags)) {
    return tags.map((tag) => tag.trim()).filter(Boolean);
  }

  return (tags ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function serializeEventTags(tags: string[]): string[] | string {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  const usesSqlite = databaseUrl.startsWith("file:") || databaseUrl.includes(".db");

  return usesSqlite ? tags.join(",") : tags;
}
