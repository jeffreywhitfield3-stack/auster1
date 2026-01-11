// src/lib/blog/slug.ts
export function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function ensureUniqueSlug(base: string, existing: Set<string>) {
  let s = base;
  let i = 2;
  while (existing.has(s)) {
    s = `${base}-${i}`;
    i++;
  }
  return s;
}