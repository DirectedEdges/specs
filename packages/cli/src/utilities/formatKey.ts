/**
 * Spec key formatting, ported from `Utilities.formatKey` in specs-from-figma.
 *
 * The bridge needs to recognise a spec's `instanceOf` value — which is a formatted key —
 * among the library's component names, which are raw Figma names. Since the transform is
 * lossy (`"DS Link/On overlay/M"` and `"DS Link On Overlay M"` format identically),
 * there is no inverse; the only way to match is to apply the same transform forward to
 * every candidate name and compare in formatted space.
 *
 * This is a deliberate duplicate rather than an import: `formatKey` is internal to
 * specs-from-figma and not part of its public surface. `tests/unit/utilities/formatKey.test.ts`
 * pins the behaviour against cases taken from that implementation — the two must stay in
 * lockstep, and drift shows up as a lookup that silently finds nothing.
 */

export type FormatKeys = 'SAFE' | 'CAMEL' | 'SNAKE' | 'KEBAB' | 'PASCAL' | 'TRAIN';

const UNSAFE_CHARS_REGEX = /["\\\n\r\t\b\f.[\]]/g;
const WORD_SEPARATOR_REGEX = /[\s\-_]+/g;
const NON_ALPHANUMERIC_REGEX = /[^a-zA-Z0-9]+/g;

/**
 * Convert a raw Figma name to the spec key form named by `format`.
 *
 * @param str - the raw name
 * @param format - the workspace's `format.keys` setting; SAFE when unset, matching the source
 */
export function formatKey(str: string, format: FormatKeys | string = 'SAFE'): string {
  // SAFE keeps the original string minus unsafe characters; every other format works from
  // words, so separators (including "/") become boundaries rather than being deleted.
  const cleanedUnsafeRemoved = str.replace(UNSAFE_CHARS_REGEX, '');

  const cleanedForSplit = str
    .replace(UNSAFE_CHARS_REGEX, ' ')
    .replace(NON_ALPHANUMERIC_REGEX, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = cleanedForSplit
    .split(WORD_SEPARATOR_REGEX)
    .filter(word => word.length > 0)
    .map(word => word.replace(NON_ALPHANUMERIC_REGEX, ''))
    .filter(word => word.length > 0);

  if (words.length === 0) return '';

  switch (format?.toUpperCase()) {
    case 'SAFE':
      return cleanedUnsafeRemoved;

    case 'CAMEL':
      // A single word only has its first character lowered, so an already-camelCase name
      // ("effectStyle") survives intact.
      if (words.length === 1) {
        const w = words[0];
        return w.charAt(0).toLowerCase() + w.slice(1);
      }
      return words[0].toLowerCase() +
        words.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');

    case 'SNAKE':
      return words.map(w => w.toLowerCase()).join('_');

    case 'KEBAB':
      return words.map(w => w.toLowerCase()).join('-');

    case 'PASCAL':
      return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');

    case 'TRAIN':
      return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('-');

    default:
      return cleanedUnsafeRemoved;
  }
}
