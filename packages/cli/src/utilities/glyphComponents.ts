/**
 * Glyph component discovery from a fetched file document.
 *
 * Shared by `fetch` (which downloads an SVG per glyph) and the cache builder
 * (which records each glyph's node id and published key), so both read the
 * same names out of the same pattern.
 *
 * @packageDocumentation
 */

/**
 * Walk the file document for COMPONENT nodes whose name matches the
 * glyphNamePattern ("DS Icon asset / {i}" — {i} captures the icon name).
 * Duplicate slugs keep the first occurrence and suffix later ones with the
 * node id so nothing is silently dropped.
 */
export function collectGlyphComponents(document: unknown, pattern: string): Array<{ id: string; name: string; slug: string }> {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{i\\\}/g, '(.+)');
  const regex = new RegExp(`^${escaped}$`);
  const found: Array<{ id: string; name: string; slug: string }> = [];
  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    const n = node as { id?: string; name?: string; type?: string; children?: unknown[] };
    if (n.type === 'COMPONENT' && typeof n.name === 'string' && typeof n.id === 'string') {
      const match = n.name.match(regex);
      if (match) found.push({ id: n.id, name: match[1] ?? n.name, slug: '' });
    }
    for (const child of n.children ?? []) walk(child);
  };
  walk(document);

  const seen = new Set<string>();
  for (const glyph of found) {
    // Kebabize camelCase too, matching the scaffold's glyphUrl slugging.
    const base = glyph.name
      .trim()
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .toLowerCase();
    glyph.slug = seen.has(base) ? `${base}-${glyph.id.replace(':', '-')}` : base;
    seen.add(base);
  }
  return found;
}
