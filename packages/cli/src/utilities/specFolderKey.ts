/**
 * The key a spec is written under — its folder name in the split layout, and its
 * key inside a combined document.
 *
 * One definition, because two were the bug. The writer derived it one way and the
 * scan-time guard that rejects an unusable name derived it another, so the two could
 * disagree about any given name and the guard would pass something the writer then
 * mangled. A frame named with whitespace alone is the case that proved it: the guard
 * rejected it, while the writer would have named its folder `component`.
 *
 * Note this is independent of `settings.spec.keys`. That setting governs keys *inside*
 * a spec — and the formatted `instanceOf` values the bridge matches against raw Figma
 * names — not the folder a spec is written to, which has always been camelCase.
 */

const NON_ALPHANUMERIC_OR_SPACE = /[^a-zA-Z0-9\s]/g;

/**
 * The spec key for a Figma name, or `null` when the name yields none.
 *
 * Null rather than a fallback: a name with no alphanumeric content has no key, and
 * inventing one gives two such specs the same folder. The caller decides what to do
 * about it, which for a composition is to skip it and say so.
 */
export function specFolderKey(name: string): string | null {
  const words = String(name ?? '')
    .replace(NON_ALPHANUMERIC_OR_SPACE, '')
    .split(/\s+/)
    .filter(word => word.length > 0);

  if (words.length === 0) return null;

  return (
    words[0].toLowerCase() +
    words
      .slice(1)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('')
  );
}
