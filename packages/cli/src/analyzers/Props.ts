import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import type { Transformer, TransformerContext } from '../Types/Transformer.js';

interface PropEntry {
  component: string;
  name: string;
  type: string;
  hasEnum: boolean;
  enumValues: string[] | null;
  enumCount: number;
  default: unknown;
  nullable: boolean;
  slotAnyOf: unknown[] | null;
  slotMinItems: number | null;
  slotMaxItems: number | null;
  figmaType: string | null;
}

interface PropsByComponent {
  [scopeKey: string]: PropEntry[];
}

interface PropNameEntry {
  name: string;
  occurrences: number;
  components: string[];
  types: string[];
}

interface EnumValueSet {
  values: string[];
  components: string[];
}

interface EnumDiscordanceEntry {
  propName: string;
  valueSets: EnumValueSet[];
}

interface ApiSurfaceEntry {
  component: string;
  props: number;
  enumValues: number;
  slots: number;
  booleans: number;
}

interface SlotEntry {
  component: string;
  name: string;
  anyOf: unknown[] | null;
  minItems: number | null;
  maxItems: number | null;
  nullable: boolean;
}

interface PropsAggregate {
  summary: {
    totalProps: number;
    totalComponents: number;
    uniquePropNames: number;
    typeDistribution: Record<string, number>;
  };
  propNameFrequency: PropNameEntry[];
  enumDiscordance: EnumDiscordanceEntry[];
  booleanNamingPatterns: Record<string, number>;
  apiSurface: ApiSurfaceEntry[];
  slots: SlotEntry[];
}

export class PropsAnalyzer implements Transformer {
  readonly name = 'props';

  private readonly _allProps: PropEntry[] = [];
  private _outputFormat: 'JSON' | 'YAML' = 'JSON';

  async run(apiYaml: Record<string, unknown>, context: TransformerContext): Promise<void> {
    const { componentKey, outputFormat } = context;
    this._outputFormat = outputFormat;

    const mainProps = extractProps(componentKey, apiYaml);
    this._allProps.push(...mainProps);

    const subcomponents = (apiYaml.subcomponents ?? {}) as Record<string, unknown>;
    for (const [subName, subRaw] of Object.entries(subcomponents)) {
      const scopeKey = `${componentKey}.${subName}`;
      this._allProps.push(...extractProps(scopeKey, subRaw as Record<string, unknown>));
    }
  }

  async finalize(outputDir: string, analysisDir?: string): Promise<void> {
    if (this._allProps.length === 0) return;

    const outDir = analysisDir ?? path.join(outputDir, '_analysis');
    await fs.ensureDir(outDir);

    const aggregate = buildAggregate(this._allProps);
    const ext = this._outputFormat === 'JSON' ? 'json' : 'yaml';
    const content = this._outputFormat === 'JSON'
      ? JSON.stringify(aggregate, null, 2) + '\n'
      : yaml.stringify(aggregate, { lineWidth: 120 });
    await fs.writeFile(path.join(outDir, `props.${ext}`), content, 'utf-8');
  }
}

function extractProps(scopeKey: string, comp: Record<string, unknown>): PropEntry[] {
  const results: PropEntry[] = [];
  const props = (comp.props ?? {}) as Record<string, unknown>;
  for (const [name, raw] of Object.entries(props)) {
    const prop = raw as Record<string, unknown>;
    const extensions = prop.$extensions as Record<string, unknown> | undefined;
    const figmaExt = extensions?.['com.figma'] as Record<string, unknown> | undefined;
    results.push({
      component: scopeKey,
      name,
      type: (prop.type as string) ?? 'string',
      hasEnum: Array.isArray(prop.enum),
      enumValues: Array.isArray(prop.enum) ? (prop.enum as string[]) : null,
      enumCount: Array.isArray(prop.enum) ? prop.enum.length : 0,
      default: prop.default ?? null,
      nullable: prop.nullable === true,
      slotAnyOf: Array.isArray(prop.anyOf) ? (prop.anyOf as unknown[]) : null,
      slotMinItems: typeof prop.minItems === 'number' ? prop.minItems : null,
      slotMaxItems: typeof prop.maxItems === 'number' ? prop.maxItems : null,
      figmaType: typeof figmaExt?.type === 'string' ? figmaExt.type : null,
    });
  }
  return results;
}

function buildAggregate(results: PropEntry[]): PropsAggregate {
  const totalComponents = new Set(results.map(r => r.component)).size;

  const typeDist: Record<string, number> = {};
  for (const r of results) {
    typeDist[r.type] = (typeDist[r.type] ?? 0) + 1;
  }

  const nameIndex = new Map<string, PropEntry[]>();
  for (const r of results) {
    const entries = nameIndex.get(r.name) ?? [];
    entries.push(r);
    nameIndex.set(r.name, entries);
  }

  const propNameFrequency: PropNameEntry[] = [...nameIndex.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([name, entries]) => ({
      name,
      occurrences: entries.length,
      components: entries.map(e => e.component),
      types: [...new Set(entries.map(e => e.type))],
    }));

  const enumDiscordance: EnumDiscordanceEntry[] = [];
  for (const [name, entries] of nameIndex.entries()) {
    const enumEntries = entries.filter(e => e.hasEnum && e.enumValues);
    if (enumEntries.length < 2) continue;
    const valueSets = new Map<string, EnumValueSet>();
    for (const e of enumEntries) {
      const key = [...(e.enumValues ?? [])].sort().join('|');
      const existing = valueSets.get(key);
      if (existing) {
        existing.components.push(e.component);
      } else {
        valueSets.set(key, { values: e.enumValues!, components: [e.component] });
      }
    }
    if (valueSets.size > 1) {
      enumDiscordance.push({ propName: name, valueSets: [...valueSets.values()] });
    }
  }

  const boolPatterns: Record<string, number> = { isPrefix: 0, hasPrefix: 0, canPrefix: 0, bare: 0 };
  for (const r of results.filter(r => r.type === 'boolean')) {
    if (/^is[A-Z]/.test(r.name)) boolPatterns.isPrefix++;
    else if (/^has[A-Z]/.test(r.name)) boolPatterns.hasPrefix++;
    else if (/^can[A-Z]/.test(r.name)) boolPatterns.canPrefix++;
    else boolPatterns.bare++;
  }

  const compMap = new Map<string, ApiSurfaceEntry>();
  for (const r of results) {
    const entry = compMap.get(r.component) ?? { component: r.component, props: 0, enumValues: 0, slots: 0, booleans: 0 };
    entry.props++;
    entry.enumValues += r.enumCount;
    if (r.type === 'slot') entry.slots++;
    if (r.type === 'boolean') entry.booleans++;
    compMap.set(r.component, entry);
  }
  const apiSurface: ApiSurfaceEntry[] = [...compMap.values()].sort((a, b) => b.props - a.props);

  const slots: SlotEntry[] = results
    .filter(r => r.type === 'slot')
    .map(r => ({
      component: r.component,
      name: r.name,
      anyOf: r.slotAnyOf,
      minItems: r.slotMinItems,
      maxItems: r.slotMaxItems,
      nullable: r.nullable,
    }));

  return {
    summary: { totalProps: results.length, totalComponents, uniquePropNames: nameIndex.size, typeDistribution: typeDist },
    propNameFrequency,
    enumDiscordance,
    booleanNamingPatterns: boolPatterns,
    apiSurface,
    slots,
  };
}
