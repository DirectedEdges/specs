import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import type { Transformer, TransformerContext } from '../Types/Transformer.js';
import { styleToCSS } from './css/styleToCSS.js';
import { layoutToCSS } from './css/layoutToCSS.js';
import { toKebab } from './css/values.js';

export class CssTransformer implements Transformer {
  readonly name = 'css';

  async run(apiYaml: Record<string, unknown>, context: TransformerContext): Promise<void> {
    const { outputDir, componentKey } = context;

    const variantsPath = path.join(outputDir, 'variants.yaml');
    if (!fs.existsSync(variantsPath)) {
      console.warn(`  [css] skipping ${componentKey}: no variants.yaml found`);
      return;
    }

    const raw = await fs.readFile(variantsPath, 'utf-8');
    const variantsYaml = yaml.parse(raw) as Record<string, unknown>;

    const componentClass = toKebab(componentKey);
    const lines: string[] = [
      '/* Generated. Do not edit — regenerate with `specs transform`. */',
      '',
    ];

    // ── Default styles ─────────────────────────────────────────────────────────
    const defaultBlock = variantsYaml.default as Record<string, unknown> | undefined;
    const defaultElements = (defaultBlock?.elements ?? {}) as Record<string, Record<string, unknown>>;

    for (const [elemKey, elem] of Object.entries(defaultElements)) {
      const selector = elemSelector(componentClass, elemKey);
      const styles = (elem.styles ?? {}) as Record<string, unknown>;
      const decls = [...layoutToCSS(styles), ...styleToCSS(styles)];

      if (decls.length > 0) {
        lines.push(`${selector} {`);
        for (const d of decls) lines.push(`  ${d};`);
        lines.push('}');
        lines.push('');
      }
    }

    // ── Variants — in schema order ─────────────────────────────────────────────
    // variants.yaml variant order is intentional: single-prop variants before
    // multi-prop compound variants, matching the layering cascade.
    const variants = (variantsYaml.variants ?? []) as Array<Record<string, unknown>>;

    for (const variant of variants) {
      const configuration = (variant.configuration ?? {}) as Record<string, unknown>;
      const configEntries = Object.entries(configuration);
      if (configEntries.length === 0) continue;

      const attrSelectors = configEntries
        .map(([k, v]) => `[data-${toKebab(k)}="${v}"]`)
        .join('');

      const variantElements = (variant.elements ?? {}) as Record<string, Record<string, unknown>>;

      for (const [elemKey, elem] of Object.entries(variantElements)) {
        const selector = elemKey === 'root'
          ? `.${componentClass}${attrSelectors}`
          : `.${componentClass}${attrSelectors} ${elemSelector(componentClass, elemKey)}`;

        const styles = (elem.styles ?? {}) as Record<string, unknown>;
        const decls = [...layoutToCSS(styles), ...styleToCSS(styles)];

        if (decls.length > 0) {
          lines.push(`${selector} {`);
          for (const d of decls) lines.push(`  ${d};`);
          lines.push('}');
          lines.push('');
        }
      }
    }

    const outputPath = path.join(outputDir, 'styles.css');
    await fs.writeFile(outputPath, lines.join('\n'), 'utf-8');
  }
}

function elemSelector(componentClass: string, elemKey: string): string {
  return elemKey === 'root'
    ? `.${componentClass}`
    : `.${componentClass}__${toKebab(elemKey)}`;
}
