/**
 * Turns a string into a lowercase, URL-friendly slug: accents are stripped,
 * whitespace and hyphens become single hyphens, any other character is dropped.
 */
export default function slug(str: string): string {
  return str
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[\s-]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}
