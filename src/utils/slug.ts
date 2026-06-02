/**
 * Converts a display name to a URL-friendly slug.
 * e.g. "Vila Nova de Júnior" → "vila-nova-de-junior"
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Builds a slug-path segment combining a human name and a UUID.
 */
export function toSlugPath(name: string, id: string): string {
  const s = slugify(name);
  return s ? `${s}-${id}` : id;
}

/**
 * Extracts the UUID from a slug-path segment produced by toSlugPath.
 */
export function extractId(slug: string): string {
  return slug.slice(-36);
}

