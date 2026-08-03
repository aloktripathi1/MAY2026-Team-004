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
