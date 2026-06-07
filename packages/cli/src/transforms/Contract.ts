import fs from 'fs-extra';
import path from 'path';
import type { Transformer, TransformerContext } from '../Types/Transformer.js';
import { buildOmittedProps } from './states.js';

export class ContractTransformer implements Transformer {
  readonly name = 'contract';

  async run(apiYaml: Record<string, unknown>, context: TransformerContext): Promise<void> {
    const { outputDir, componentKey } = context;
    const prefix = toPascalCase(componentKey);
    const omittedProps = buildOmittedProps(context.processingStates ?? {});

    // Main component
    const mainLines = buildContractLines(prefix, (apiYaml.props ?? {}) as Record<string, unknown>, omittedProps);
    await fs.writeFile(path.join(outputDir, 'contract.ts'), mainLines.join('\n'), 'utf-8');

    // Subcomponents — each gets its own subfolder/contract.ts
    const subcomponents = (apiYaml.subcomponents ?? {}) as Record<string, unknown>;
    for (const [subKey, subRaw] of Object.entries(subcomponents)) {
      const sub = subRaw as Record<string, unknown>;
      const subPrefix = `${prefix}${toPascalCase(subKey)}`;
      const subProps = (sub.props ?? {}) as Record<string, unknown>;
      const subLines = buildContractLines(subPrefix, subProps, omittedProps);
      const subDir = path.join(outputDir, subKey);
      await fs.ensureDir(subDir);
      await fs.writeFile(path.join(subDir, 'contract.ts'), subLines.join('\n'), 'utf-8');
    }
  }
}

function buildContractLines(
  prefix: string,
  props: Record<string, unknown>,
  omittedProps: Set<string>,
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

  return lines;
}

function toPascalCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
