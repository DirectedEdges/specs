import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import type { Transformer, TransformerContext } from '../Types/Transformer.js';

type StylingCategory = 'VARIABLES' | 'COLOR_STYLES' | 'TEXT_STYLES' | 'EFFECT_STYLES';
type RawValue = string | number | boolean | null;

interface StylingRow {
  category: StylingCategory;
  name: string;
  appliedAs: string;
  rawValue: RawValue;
  appliedTo: Map<string, number>;
}

const CATEGORY_ORDER: StylingCategory[] = ['VARIABLES', 'COLOR_STYLES', 'TEXT_STYLES', 'EFFECT_STYLES'];

export class StylingTransformer implements Transformer {
  readonly name = 'styling';

  async run(apiYaml: Record<string, unknown>, context: TransformerContext): Promise<void> {
    const { outputDir, componentKey } = context;
    const prefix = toPascalCase(componentKey);

    const anatomy = (apiYaml.anatomy ?? {}) as Record<string, unknown>;
    const elementTypes = extractElementTypes(anatomy);

    // In split-concerns output, variant/default element styling lives in variants.yaml.
    // Fall back to apiYaml itself for single-file format.
    const variantsYaml = await loadVariantsYaml(outputDir);
    const source = variantsYaml ?? apiYaml;

    const rows = new Map<string, StylingRow>();

    const defaultSection = source.default as Record<string, unknown> | undefined;
    if (defaultSection?.elements) {
      collectElements(defaultSection.elements as Record<string, unknown>, elementTypes, rows);
    }

    const variants = (source.variants ?? []) as Array<Record<string, unknown>>;
    for (const variant of variants) {
      if (variant.elements) {
        collectElements(variant.elements as Record<string, unknown>, elementTypes, rows);
      }
    }

    const sorted = Array.from(rows.values()).sort(compareRows);

    const lines: string[] = [
      '// Generated. Do not edit — regenerate with `specs transform`.',
      '',
      "export type StylingCategory = 'VARIABLES' | 'COLOR_STYLES' | 'TEXT_STYLES' | 'EFFECT_STYLES';",
      '',
      'export interface StylingRow {',
      '  category: StylingCategory;',
      '  name: string;',
      '  appliedAs: string;',
      '  rawValue: string | number | boolean | null;',
      '  appliedTo: Record<string, number>;',
      '}',
      '',
    ];

    lines.push(`export const ${prefix}Styling: readonly StylingRow[] = [`);

    for (const row of sorted) {
      const appliedToEntries = Array.from(row.appliedTo.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([k, v]) => `'${escapeSingleQuote(k)}': ${v}`)
        .join(', ');

      lines.push('  {');
      lines.push(`    category: '${row.category}',`);
      lines.push(`    name: '${escapeSingleQuote(row.name)}',`);
      lines.push(`    appliedAs: '${escapeSingleQuote(row.appliedAs)}',`);
      lines.push(`    rawValue: ${serializeRawValue(row.rawValue)},`);
      lines.push(`    appliedTo: { ${appliedToEntries} },`);
      lines.push('  },');
    }

    lines.push('];');
    lines.push('');

    const outputPath = path.join(outputDir, 'styling.ts');
    await fs.writeFile(outputPath, lines.join('\n'), 'utf-8');
  }
}

async function loadVariantsYaml(outputDir: string): Promise<Record<string, unknown> | null> {
  const variantsPath = path.join(outputDir, 'variants.yaml');
  if (!fs.existsSync(variantsPath)) return null;
  const raw = await fs.readFile(variantsPath, 'utf-8');
  return yaml.parse(raw) as Record<string, unknown>;
}

function extractElementTypes(anatomy: Record<string, unknown>): Map<string, string> {
  const types = new Map<string, string>();
  for (const [name, raw] of Object.entries(anatomy)) {
    const entry = raw as Record<string, unknown>;
    if (typeof entry.type === 'string') {
      types.set(name, entry.type);
    }
  }
  return types;
}

function collectElements(
  elements: Record<string, unknown>,
  elementTypes: Map<string, string>,
  rows: Map<string, StylingRow>
): void {
  for (const [elementName, raw] of Object.entries(elements)) {
    const element = raw as Record<string, unknown>;
    const styles = element.styles as Record<string, unknown> | undefined;
    if (!styles) continue;

    const elementType = elementTypes.get(elementName) ?? 'container';

    for (const [styleKey, styleValue] of Object.entries(styles)) {
      collectTokens(elementName, [styleKey], styleValue, elementType, rows);
    }
  }
}

function collectTokens(
  elementName: string,
  keyPath: string[],
  value: unknown,
  elementType: string,
  rows: Map<string, StylingRow>
): void {
  if (value === null || value === undefined) return;

  const tokenRef = asTokenReference(value);
  if (tokenRef) {
    const appliedAs = appliedAsForPath(keyPath, elementType);
    const { name, rawValue, category } = resolveToken(tokenRef);
    const rowKey = `${category}\x00${name}\x00${appliedAs}`;
    const existing = rows.get(rowKey);
    if (existing) {
      existing.appliedTo.set(elementName, (existing.appliedTo.get(elementName) ?? 0) + 1);
    } else {
      rows.set(rowKey, { category, name, appliedAs, rawValue, appliedTo: new Map([[elementName, 1]]) });
    }
    return;
  }

  if (Array.isArray(value)) {
    // Don't push array index into keyPath — sibling items share the same path.
    for (const item of value) {
      collectTokens(elementName, keyPath, item, elementType, rows);
    }
    return;
  }

  if (typeof value === 'object') {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      collectTokens(elementName, [...keyPath, key], child, elementType, rows);
    }
  }
}

function asTokenReference(value: unknown): { $token: string; $type: string } | null {
  if (
    value !== null &&
    typeof value === 'object' &&
    '$token' in (value as object) &&
    '$type' in (value as object)
  ) {
    return value as { $token: string; $type: string };
  }
  return null;
}

function resolveToken(ref: { $token: string; $type: string }): {
  name: string;
  rawValue: RawValue;
  category: StylingCategory;
} {
  const category = categoryForType(ref.$type);
  return { name: ref.$token, rawValue: null, category };
}

function categoryForType(type: string): StylingCategory {
  if (type === 'typography') return 'TEXT_STYLES';
  if (type === 'shadow' || type === 'blur' || type === 'effects') return 'EFFECT_STYLES';
  return 'VARIABLES';
}

function appliedAsForPath(keyPath: string[], elementType: string): string {
  if (keyPath.length === 0) return 'Unknown';
  const [root, ...rest] = keyPath;
  const base = appliedAsForKey(root, elementType);
  if (rest.length === 0) return base;
  const suffix = rest.map(k => humanize(k).toLowerCase()).join(' ');
  return `${base} ${suffix}`;
}

function appliedAsForKey(key: string, elementType: string): string {
  switch (key) {
    case 'fills':
    case 'backgroundColor':
      if (elementType === 'text') return 'Text color';
      if (elementType === 'glyph' || elementType === 'vector') return 'Fill color';
      return 'Background color';
    case 'fillColor':
      return 'Fill color';
    case 'strokes':
    case 'strokeColor':
      return 'Stroke color';
    case 'borderColor':
      return 'Border color';
    case 'typography':
    case 'textStyleId':
      return 'Text style';
    case 'effects':
    case 'effectStyleId':
      return 'Effect style';
    default:
      return humanize(key);
  }
}

function humanize(key: string): string {
  const spaced = key.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function compareRows(a: StylingRow, b: StylingRow): number {
  const catA = CATEGORY_ORDER.indexOf(a.category);
  const catB = CATEGORY_ORDER.indexOf(b.category);
  if (catA !== catB) return catA - catB;
  if (a.name !== b.name) return a.name.localeCompare(b.name);
  return a.appliedAs.localeCompare(b.appliedAs);
}

function escapeSingleQuote(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function serializeRawValue(v: RawValue): string {
  if (v === null) return 'null';
  if (typeof v === 'string') return `'${escapeSingleQuote(v)}'`;
  return String(v);
}

function toPascalCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
