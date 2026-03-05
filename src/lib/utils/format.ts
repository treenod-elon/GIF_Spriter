/**
 * Format a byte count as a human-readable file size string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * Normalize a tag for storage: lowercase, preserve spaces, strip special chars.
 */
export function normalizeTag(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalize an array of tags: lowercase, deduplicate (case-insensitive), filter empty.
 */
export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  return tags
    .map(normalizeTag)
    .filter((t) => {
      if (!t || seen.has(t)) return false;
      seen.add(t);
      return true;
    });
}

/**
 * Display a tag with Title Case: 'ui effects' → 'UI Effects', 'fire' → 'Fire'
 */
export function displayTag(tag: string): string {
  return tag.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Case-insensitive tag match check.
 */
export function tagMatches(a: string, b: string): boolean {
  return normalizeTag(a) === normalizeTag(b);
}

/**
 * Check if a tag array contains a tag (case-insensitive).
 */
export function tagsInclude(tags: string[], tag: string): boolean {
  const normalized = normalizeTag(tag);
  return tags.some((t) => normalizeTag(t) === normalized);
}
