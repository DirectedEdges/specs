import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import type { Transformer, TransformerContext } from '../Types/Transformer.js';
import { buildOmittedProps } from './states.js';
import { analyzeVariants, type SlotInfo } from './react/variantAnalysis.js';

export class ContractTransformer implements Transformer {
  readonly name = 'contract';

  async run(apiYaml: Record<string, unknown>, context: TransformerContext): Promise<void> {
    const { outputDir, componentKey } = context;
    const prefix = toPascalCase(componentKey);
    const omittedProps = buildOmittedProps(context.processingStates ?? {});

    // variants.yaml is optional input — without it, contracts omit slot rules.
    const variantsPath = path.join(outputDir, 'variants.yaml');
    const variantsYaml = fs.existsSync(variantsPath)
      ? (yaml.parse(await fs.readFile(variantsPath, 'utf-8')) as Record<string, unknown>)
      : undefined;

    // Main component
    const slots = variantsYaml
      ? analyzeVariants(apiYaml, variantsYaml, context.processingStates ?? {}).slots
      : [];
    const mainLines = buildContractLines(prefix, (apiYaml.props ?? {}) as Record<string, unknown>, omittedProps, slots);
    const generatedDir = path.join(outputDir, 'generated');
    await fs.ensureDir(generatedDir);
    await fs.writeFile(path.join(generatedDir, `${prefix}.contract.ts`), mainLines.join('\n'), 'utf-8');

    // Subcomponents — each gets its own subfolder/{Sub}.contract.ts
    const subcomponents = (apiYaml.subcomponents ?? {}) as Record<string, unknown>;
    const subVariants = (variantsYaml?.subcomponents ?? {}) as Record<string, unknown>;
    for (const [subKey, subRaw] of Object.entries(subcomponents)) {
      const sub = subRaw as Record<string, unknown>;
      // Export names must match the file prefix — scaffold/stories import
      // `${SubPrefix}Defaults` from `./${SubPrefix}.contract`.
      const subFilePrefix = toPascalCase(subKey);
      const subProps = (sub.props ?? {}) as Record<string, unknown>;
      const subVariantsYaml = subVariants[subKey] as Record<string, unknown> | undefined;
      const subSlots = subVariantsYaml
        ? analyzeVariants(sub, subVariantsYaml, context.processingStates ?? {}).slots
        : [];
      const subLines = buildContractLines(subFilePrefix, subProps, omittedProps, subSlots);
      const subDir = path.join(outputDir, subKey, 'generated');
      await fs.ensureDir(subDir);
      await fs.writeFile(path.join(subDir, `${subFilePrefix}.contract.ts`), subLines.join('\n'), 'utf-8');
    }
  }
}

function buildContractLines(
  prefix: string,
  props: Record<string, unknown>,
  omittedProps: Set<string>,
  slots: SlotInfo[],
): string[] {
  const lines: string[] = [
    '// Generated. Do not edit — regenerate with `specs transform`.',
    '',
  ];

  const enumTypes: Array<{ typeName: string; values: string[] }> = [];
  const propEntries: Array<{ key: string; tsType: string; hasDefault: boolean; defaultValue: unknown }> = [];

  for (const [key, raw] of Object.entries(props)) {
    if (omittedProps.has(key)) continue;
    const prop = raw as Record<string, unknown>;
    const type = prop.type as string;

    if (type === 'slot') continue;

    const isNullable = prop.nullable === true || prop.default === null;
    const hasDefault = 'default' in prop;
    const defaultValue = prop.default;

    let tsType: string;

    if (type === 'boolean') {
      tsType = 'boolean';
    } else if (type === 'number') {
      tsType = 'number';
    } else if (type === 'string' && Array.isArray(prop.enum)) {
      const typeName = `${prefix}${toPascalCase(key)}`;
      const values = prop.enum as string[];
      enumTypes.push({ typeName, values });
      tsType = isNullable ? `${typeName} | null` : typeName;
    } else {
      tsType = isNullable ? 'string | null' : 'string';
    }

    propEntries.push({ key, tsType, hasDefault, defaultValue });
  }

  for (const { typeName, values } of enumTypes) {
    lines.push(`export type ${typeName} =`);
    for (const v of values) {
      lines.push(`  | '${v}'`);
    }
    lines[lines.length - 1] += ';';
  }
  if (enumTypes.length > 0) lines.push('');

  lines.push(`export interface ${prefix}Props {`);
  for (const { key, tsType } of propEntries) {
    lines.push(`  ${key}?: ${tsType};`);
  }
  lines.push('}');
  lines.push('');

  const defaultEntries = propEntries.filter(p => p.hasDefault);
  if (defaultEntries.length > 0) {
    lines.push(`export const ${prefix}Defaults = {`);
    for (const { key, defaultValue } of defaultEntries) {
      lines.push(`  ${key}: ${JSON.stringify(defaultValue)},`);
    }
    lines.push(`} satisfies ${prefix}Props;`);
    lines.push('');
  }

  if (slots.length > 0) {
    lines.push(...buildSlotLines(prefix, slots));
  }

  return lines;
}

/**
 * Emits the Slots interface + SlotVisibility rules. Slots are content
 * injection points: anatomy `slot` elements (unknown content) and bound `text`
 * elements (string content). A slot is required when its rule is `always`.
 */
function buildSlotLines(prefix: string, slots: SlotInfo[]): string[] {
  const lines: string[] = [];

  lines.push(`export interface ${prefix}Slots {`);
  for (const slot of slots) {
    const optional = slot.rule.kind === 'always' ? '' : '?';
    const tsType = slot.slotType === 'text' ? 'string' : 'unknown';
    lines.push(`  ${safeKey(slot.elementKey)}${optional}: ${tsType};`);
  }
  lines.push('}');
  lines.push('');

  lines.push(`export type ${prefix}SlotVisibility =`);
  lines.push(`  | { kind: 'always' }`);
  lines.push(`  | { kind: 'whenTrue'; prop: keyof ${prefix}Props }`);
  lines.push(`  | { kind: 'whenNotNull'; prop: keyof ${prefix}Props }`);
  lines.push(`  | { kind: 'whenValue'; prop: keyof ${prefix}Props; value: string };`);
  lines.push('');

  lines.push(`export const ${prefix}SlotRules = {`);
  for (const slot of slots) {
    const rule = slot.rule;
    let value: string;
    if (rule.kind === 'always') {
      value = `{ kind: 'always' }`;
    } else if (rule.kind === 'whenValue') {
      value = `{ kind: 'whenValue', prop: '${rule.prop}', value: ${JSON.stringify(rule.value)} }`;
    } else {
      value = `{ kind: '${rule.kind}', prop: '${rule.prop}' }`;
    }
    const comment = slot.warning ? ` // ${slot.warning}` : '';
    lines.push(`  ${safeKey(slot.elementKey)}: ${value},${comment}`);
  }
  lines.push(`} satisfies Record<keyof ${prefix}Slots, ${prefix}SlotVisibility>;`);
  lines.push('');

  return lines;
}

/** Emit object/interface keys safely: quote anything that isn't a valid identifier (e.g. an empty layer name). */
function safeKey(key: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key);
}

function toPascalCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
