import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import type { Transformer, TransformerContext } from '../Types/Transformer.js';

type StylingCategory = 'VARIABLES' | 'COLOR_STYLES' | 'TEXT_STYLES' | 'EFFECT_STYLES';
type RawValue = string | number | boolean;

interface StylingRow {
  category: StylingCategory;
  name: string;
  appliedAs: string;
  rawValue?: RawValue;
  appliedTo: Map<string, number>;
}

interface StylingRowJson {
  name: string;
  appliedAs: string;
  rawValue?: RawValue;
  appliedTo: Record<string, number>;
}

interface StylingJson {
  variables: StylingRowJson[];
  colorStyles: StylingRowJson[];
  textStyles: StylingRowJson[];
  effectStyles: StylingRowJson[];
}

interface ByTokenEntry {
  component: string;
  appliedAs: string;
  appliedTo: Record<string, number>;
}

const CATEGORY_ORDER: StylingCategory[] = ['VARIABLES', 'COLOR_STYLES', 'TEXT_STYLES', 'EFFECT_STYLES'];

const CATEGORY_KEYS: Array<keyof StylingJson> = ['variables', 'colorStyles', 'textStyles', 'effectStyles'];

const CATEGORY_KEY: Record<StylingCategory, keyof StylingJson> = {
  VARIABLES: 'variables',
  COLOR_STYLES: 'colorStyles',
  TEXT_STYLES: 'textStyles',
  EFFECT_STYLES: 'effectStyles',
};

export class StylingTransformer implements Transformer {
  readonly name = 'styling';

  // Flat map: "componentKey" and "componentKey.subName" entries stored together.
  private readonly _componentData = new Map<string, StylingJson>();

  async run(apiYaml: Record<string, unknown>, context: TransformerContext): Promise<void> {
    const { outputDir, componentKey } = context;

    const anatomy = (apiYaml.anatomy ?? {}) as Record<string, unknown>;
    const elementTypes = extractElementTypes(anatomy);

    // In split-concerns output, variant/default element styling lives in variants.yaml.
    // Fall back to apiYaml itself for single-file format.
    const variantsYaml = await loadVariantsYaml(outputDir);
    const source = variantsYaml ?? apiYaml;

    // Build one StylingJson per scope: top-level component + each subcomponent.
    const scopes = new Map<string, StylingJson>();

    const topRows = new Map<string, StylingRow>();
    collectDefaultAndVariants(source, elementTypes, topRows);
    scopes.set(componentKey, buildStylingJson(topRows));

    const apiSubcomponents = (apiYaml.subcomponents ?? {}) as Record<string, unknown>;
    const sourceSubcomponents = (source.subcomponents ?? {}) as Record<string, unknown>;
    for (const [subName, subSource] of Object.entries(sourceSubcomponents)) {
      const subApiEntry = apiSubcomponents[subName] as Record<string, unknown> | undefined;
      const subAnatomy = (subApiEntry?.anatomy ?? {}) as Record<string, unknown>;
      const subElementTypes = extractElementTypes(subAnatomy);
      const subRows = new Map<string, StylingRow>();
      collectDefaultAndVariants(subSource as Record<string, unknown>, subElementTypes, subRows);
      scopes.set(`${componentKey}.${subName}`, buildStylingJson(subRows));
    }

    // Persist each scope to _componentData and write the per-component file.
    const fileOutput: Record<string, StylingJson> = {};
    for (const [scopeKey, data] of scopes) {
      this._componentData.set(scopeKey, data);
      fileOutput[scopeKey] = data;
    }

    const outputPath = path.join(outputDir, 'styling.json');
    await fs.writeFile(outputPath, JSON.stringify(fileOutput, null, 2) + '\n', 'utf-8');
  }

  async finalize(outputDir: string): Promise<void> {
    if (this._componentData.size === 0) return;

    const dictDir = path.join(outputDir, '_dictionary');
    await fs.ensureDir(dictDir);

    await this._writeByComponent(dictDir);
    await this._writeByToken(dictDir);
  }

  private async _writeByComponent(dictDir: string): Promise<void> {
    const out: Record<string, StylingJson> = {};
    for (const [key, data] of Array.from(this._componentData.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
      out[key] = stripRawValues(data);
    }
    await fs.writeFile(path.join(dictDir, 'styling.byComponent.json'), JSON.stringify(out, null, 2) + '\n', 'utf-8');
  }

  private async _writeByToken(dictDir: string): Promise<void> {
    const out: Record<keyof StylingJson, Record<string, ByTokenEntry[]>> = {
      variables: {},
      colorStyles: {},
      textStyles: {},
      effectStyles: {},
    };

    for (const [scopeKey, data] of Array.from(this._componentData.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
      for (const groupKey of CATEGORY_KEYS) {
        for (const row of data[groupKey]) {
          const entries = out[groupKey][row.name] ?? (out[groupKey][row.name] = []);
          entries.push({ component: scopeKey, appliedAs: row.appliedAs, appliedTo: row.appliedTo });
        }
      }
    }

    await fs.writeFile(path.join(dictDir, 'styling.byToken.json'), JSON.stringify(out, null, 2) + '\n', 'utf-8');
  }
}

function buildStylingJson(rows: Map<string, StylingRow>): StylingJson {
  const sorted = Array.from(rows.values()).sort(compareRows);
  const output: StylingJson = { variables: [], colorStyles: [], textStyles: [], effectStyles: [] };
  for (const row of sorted) {
    const appliedTo: Record<string, number> = Object.fromEntries(
      Array.from(row.appliedTo.entries()).sort((a, b) => a[0].localeCompare(b[0]))
    );
    const jsonRow: StylingRowJson = { name: row.name, appliedAs: row.appliedAs, appliedTo };
    if (row.rawValue !== undefined) jsonRow.rawValue = row.rawValue;
    output[CATEGORY_KEY[row.category]].push(jsonRow);
  }
  return output;
}

function stripRawValues(data: StylingJson): StylingJson {
  const strip = (rows: StylingRowJson[]): StylingRowJson[] =>
    rows.map(({ rawValue: _omit, ...rest }) => rest);
  return {
    variables: strip(data.variables),
    colorStyles: strip(data.colorStyles),
    textStyles: strip(data.textStyles),
    effectStyles: strip(data.effectStyles),
  };
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

function collectDefaultAndVariants(
  source: Record<string, unknown>,
  elementTypes: Map<string, string>,
  rows: Map<string, StylingRow>
): void {
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
    const appliedAs = keyPath.join('.');
    const { name, rawValue, category } = resolveToken(tokenRef, keyPath, elementType);
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
    // Don't push array index into keyPath — sibling items share the same appliedAs.
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

interface TokenRef {
  $token: string;
  $type: string;
  $extensions?: { 'com.figma'?: { rawValue?: RawValue } };
}

function asTokenReference(value: unknown): TokenRef | null {
  if (
    value !== null &&
    typeof value === 'object' &&
    '$token' in (value as object) &&
    '$type' in (value as object)
  ) {
    return value as TokenRef;
  }
  return null;
}

function resolveToken(
  ref: TokenRef,
  keyPath: string[],
  elementType: string
): { name: string; rawValue: RawValue | undefined; category: StylingCategory } {
  const category = categoryForType(ref.$type, keyPath, elementType);
  const rawValue = ref.$extensions?.['com.figma']?.rawValue;
  return { name: ref.$token, rawValue, category };
}

function categoryForType(type: string, keyPath: string[], elementType: string): StylingCategory {
  if (type === 'typography') return 'TEXT_STYLES';
  if (type === 'shadow' || type === 'blur' || type === 'effects') return 'EFFECT_STYLES';
  return 'VARIABLES';
}

function compareRows(a: StylingRow, b: StylingRow): number {
  const catA = CATEGORY_ORDER.indexOf(a.category);
  const catB = CATEGORY_ORDER.indexOf(b.category);
  if (catA !== catB) return catA - catB;
  if (a.name !== b.name) return a.name.localeCompare(b.name);
  return a.appliedAs.localeCompare(b.appliedAs);
}
