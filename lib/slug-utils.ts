export async function generateUniqueSlug(
  name: string,
  checkExists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const baseSlug = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);

  let slug = baseSlug;
  let counter = 1;

  while (!(await checkExists(slug))) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}
