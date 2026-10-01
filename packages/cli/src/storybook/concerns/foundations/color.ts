// Colour foundations: the variables payload plus fill styles, resolved at
// publish time (specs#609). Everything the page shows is in colors.json;
// the page is a view of it.

interface Rgba { r: number; g: number; b: number; a: number }
type VarValue = Rgba | { type: 'VARIABLE_ALIAS'; id: string };

interface PayloadCollection {
  id: string;
  name: string;
  defaultModeId: string;
  modes: Array<{ modeId: string; name: string }>;
}

interface PayloadVariable {
  id: string;
  name: string;
  description?: string;
  resolvedType: string;
  variableCollectionId: string;
  valuesByMode: Record<string, VarValue>;
}

export interface ColorSourceInput {
  alias: string;
  /** Parsed `<alias>.variables.json`, or null when the source has none. */
  variablesPayload: unknown | null;
  /** FILL entries of `<alias>.styles.json` in payload order. */
  fillStyles: Array<{ node_id: string; name: string; description?: string }>;
  /** Style id → sampled `fills` array from a node using the style. */
  sampledFills: Record<string, unknown[]>;
}

export interface SwatchJson {
  name: string;
  leaf: string;
  value: string | null;
  /** The alias target's name, when the value came through an alias. */
  via: string | null;
  description: string;
  /** Why the swatch has no value; null when it resolved. */
  unresolved: string | null;
}

export interface ColorsJson {
  /** Swatch arrangement per group — a customization, not data (CUSTOMIZATIONS.md). */
  layout: { default: 'stack' | 'row' | 'group'; overrides: Record<string, 'stack' | 'row' | 'group'> };
  sources: Array<{
    source: string;
    collections: Array<{
      name: string;
      modes: string[];
      groups: Array<{ name: string; swatches: SwatchJson[] }>;
    }>;
    styles: Array<{ name: string; value: string | null; description: string; unresolved: string | null }>;
  }>;
}

function hex({ r, g, b, a }: Rgba): string {
  const c = (n: number) => Math.round(n * 255);
  if (a < 1) return `rgba(${c(r)}, ${c(g)}, ${c(b)}, ${Math.round(a * 100) / 100})`;
  const h = (n: number) => c(n).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

/**
 * Follow alias chains to a literal colour in each variable's own collection's
 * default mode. An unresolvable variable carries the reason, never disappears.
 */
function resolve(
  variable: PayloadVariable,
  variables: Record<string, PayloadVariable>,
  collections: Record<string, PayloadCollection>,
  depth = 0,
): { value: string | null; via: string | null; unresolved: string | null } {
  if (depth > 10) return { value: null, via: null, unresolved: 'alias chain forms a cycle' };
  const collection = collections[variable.variableCollectionId];
  const raw = variable.valuesByMode[collection?.defaultModeId ?? ''];
  if (!raw) return { value: null, via: null, unresolved: 'no value in the collection’s default mode' };
  if (typeof raw === 'object' && 'type' in raw && raw.type === 'VARIABLE_ALIAS') {
    const target = variables[raw.id];
    if (!target) {
      return {
        value: null,
        via: null,
        unresolved: 'alias target is not in this payload — likely a variable in another library file',
      };
    }
    const resolved = resolve(target, variables, collections, depth + 1);
    return resolved.value
      ? { value: resolved.value, via: target.name, unresolved: null }
      : { value: null, via: target.name, unresolved: resolved.unresolved };
  }
  return { value: hex(raw as Rgba), via: null, unresolved: null };
}

/** A sampled `fills` array reduced to one displayable value, or a reason. */
function fillValue(fills: unknown[] | undefined): { value: string | null; unresolved: string | null } {
  if (!fills || fills.length === 0) return { value: null, unresolved: 'no node in the file uses this style' };
  const visible = (fills as Array<Record<string, unknown>>).filter((f) => f.visible !== false);
  const solid = visible.find((f) => f.type === 'SOLID' && f.color);
  if (!solid) {
    const kinds = [...new Set(visible.map((f) => String(f.type ?? 'unknown').toLowerCase()))];
    return { value: null, unresolved: `not a solid fill (${kinds.join(', ') || 'no visible fills'})` };
  }
  const c = solid.color as Rgba;
  const opacity = typeof solid.opacity === 'number' ? solid.opacity : 1;
  return { value: hex({ r: c.r, g: c.g, b: c.b, a: (c.a ?? 1) * opacity }), unresolved: null };
}

/**
 * colors.json. Order everywhere is the payload's declared sequence — the
 * library's own order is the meaningful one (specs#609), so nothing here
 * sorts alphabetically.
 */
export function buildColorData(sources: ColorSourceInput[]): ColorsJson | null {
  const out: ColorsJson = { layout: { default: 'group', overrides: {} }, sources: [] };

  for (const src of sources) {
    const meta = (src.variablesPayload as { meta?: { variableCollections?: Record<string, PayloadCollection>; variables?: Record<string, PayloadVariable> } } | null)?.meta;
    const collections = meta?.variableCollections ?? {};
    const variables = meta?.variables ?? {};

    const collectionsOut: ColorsJson['sources'][number]['collections'] = [];
    for (const collection of Object.values(collections)) {
      const colors = Object.values(variables).filter(
        (v) => v.resolvedType === 'COLOR' && v.variableCollectionId === collection.id,
      );
      if (colors.length === 0) continue;

      // Groups in first-appearance order of the payload's variable sequence.
      const groups = new Map<string, SwatchJson[]>();
      for (const v of colors) {
        const segments = v.name.split('/');
        const group = segments.length > 1 ? segments[0] : 'Ungrouped';
        const r = resolve(v, variables, collections);
        const list = groups.get(group) ?? [];
        list.push({
          name: v.name,
          leaf: segments[segments.length - 1],
          value: r.value,
          via: r.via,
          description: v.description ?? '',
          unresolved: r.unresolved,
        });
        groups.set(group, list);
      }

      collectionsOut.push({
        name: collection.name,
        modes: collection.modes.map((m) => m.name),
        groups: [...groups.entries()].map(([name, swatches]) => ({ name, swatches })),
      });
    }

    const styles = src.fillStyles.map((s) => {
      const r = fillValue(src.sampledFills[s.node_id]);
      return { name: s.name, value: r.value, description: s.description ?? '', unresolved: r.unresolved };
    });

    if (collectionsOut.length > 0 || styles.length > 0) {
      out.sources.push({ source: src.alias, collections: collectionsOut, styles });
    }
  }

  return out.sources.length > 0 ? out : null;
}
