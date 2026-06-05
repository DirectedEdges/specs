import fs from 'fs-extra';
import path from 'path';
import type { Transformer, TransformerContext } from '../Types/Transformer.js';
import { buildOmittedProps } from './states.js';

export class ContractTransformer implements Transformer {
  readonly name = 'contract';

  async run(apiYaml: Record<string, unknown>, context: TransformerContext): Promise<void> {
    const { outputDir, componentKey } = context;
    const title = (apiYaml.title as string) ?? componentKey;
    const prefix = toPascalCase(componentKey);
    const props = (apiYaml.props ?? {}) as Record<string, unknown>;
    const omittedProps = buildOmittedProps(context.processingStates ?? {});

    const lines: string[] = [
      '// Generated. Do not edit — regenerate with `specs transform`.',
      '',
    ];

    // Collect prop metadata in one pass
    const enumTypes: Array<{ typeName: string; values: string[] }> = [];
    const propEntries: Array<{ key: string; tsType: string; hasDefault: boolean; defaultValue: unknown }> = [];

    for (const [key, raw] of Object.entries(props)) {
      if (omittedProps.has(key)) continue; // browser-driven state — not a consumer prop
      const prop = raw as Record<string, unknown>;
      const type = prop.type as string;

      if (type === 'slot') continue; // slots deferred

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

    // Emit enum types
    for (const { typeName, values } of enumTypes) {
      lines.push(`export type ${typeName} =`);
      for (const v of values) {
        lines.push(`  | '${v}'`);
      }
      lines[lines.length - 1] += ';';
    }
    if (enumTypes.length > 0) lines.push('');

    // Emit Props interface
    lines.push(`export interface ${prefix}Props {`);
    for (const { key, tsType } of propEntries) {
      lines.push(`  ${key}?: ${tsType};`);
    }
    lines.push('}');
    lines.push('');

    // Emit Defaults — only props with a declared default
    const defaultEntries = propEntries.filter(p => p.hasDefault);
    if (defaultEntries.length > 0) {
      lines.push(`export const ${prefix}Defaults = {`);
      for (const { key, defaultValue } of defaultEntries) {
        lines.push(`  ${key}: ${JSON.stringify(defaultValue)},`);
      }
      lines.push(`} satisfies ${prefix}Props;`);
      lines.push('');
    }

    const outputPath = path.join(outputDir, 'contract.ts');
    await fs.writeFile(outputPath, lines.join('\n'), 'utf-8');
  }
}

function toPascalCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
