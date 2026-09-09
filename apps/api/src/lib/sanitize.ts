import DOMPurify from "isomorphic-dompurify";

/**
 * Strips all HTML tags, script payloads, and dangerous characters from user input strings.
 */
export function sanitizeText(input: unknown): string {
  if (typeof input !== "string") return "";
  const cleaned = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
  return cleaned.trim();
}
