/** Loose mapping from a member's interest tag to the club category(ies) it
 * corresponds to — interest tags and ClubCategory values don't line up 1:1
 * (e.g. "Debate" is a Literary club, "Sustainability" is Social). */
export const INTEREST_CATEGORY_MAP: Record<string, string[]> = {
  technical: ["technical"],
  cultural: ["cultural"],
  sports: ["sports"],
  design: ["design"],
  debate: ["literary"],
  entrepreneurship: ["entrepreneurship"],
  sustainability: ["social"],
  writing: ["literary"],
};

export function clubMatchesInterest(
  club: { name: string; category: string; tagline: string; description: string },
  interest: string,
): boolean {
  const haystack = `${club.name} ${club.category} ${club.tagline} ${club.description}`.toLowerCase();
  const normalized = interest.toLowerCase();
  const categories = INTEREST_CATEGORY_MAP[normalized] ?? [normalized];
  const categoryMatch = categories.some((category) => club.category.toLowerCase() === category);
  const textMatch = categories.some((category) => haystack.includes(category)) || haystack.includes(normalized);
  return categoryMatch || textMatch;
}
