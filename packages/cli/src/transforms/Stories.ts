import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import type { Transformer, TransformerContext } from '../Types/Transformer.js';
import { analyzeVariants } from './react/variantAnalysis.js';
import { buildOmittedProps } from './states.js';
import {
  loadExamples,
  resolveSlotRef,
  slotExampleRef,
  composeSlotJsx,
  type ComposeContext,
  type ExamplesData,
} from './react/slotComposition.js';

/**
 * Emits `generated/react/stories.tsx` — one Storybook CSF page per component,
 * with a Default story plus one story per variant whose configuration is
 * expressible as Props (variants driven purely by browser states — hover,
 * pressed — have no prop to set and are skipped; their styling shows via real
 * interaction).
 *
 * Stories import the AUTHORED scaffold (src/react/scaffold.tsx, seeded by the
 * react transformer) so Storybook reflects human edits, not the regenerated
 * reference.
 */
export class StoriesTransformer implements Transformer {
  readonly name = 'stories';

  async run(apiYaml: Record<string, unknown>, context: TransformerContext): Promise<void> {
    const { outputDir, componentKey } = context;

    const variantsPath = path.join(outputDir, 'variants.yaml');
    if (!fs.existsSync(variantsPath)) {
      console.warn(`  [stories] skipping ${componentKey}: no variants.yaml found`);
      return;
    }
    const variantsYaml = yaml.parse(await fs.readFile(variantsPath, 'utf-8')) as Record<string, unknown>;

    const examples = loadExamples(outputDir);
    const subcomponentsMap = (apiYaml.subcomponents ?? {}) as Record<string, unknown>;
    const subKeys = Object.keys(subcomponentsMap);
    // Known prop names per subcomponent import name, minus state-machine props
    // the contracts omit — composed JSX must type-check against the contracts.
    const omitted = buildOmittedProps(context.processingStates ?? {});
    const targetProps = new Map<string, Set<string>>();
    for (const [k, subRaw] of Object.entries(subcomponentsMap)) {
      const subProps = ((subRaw as Record<string, unknown>).props ?? {}) as Record<string, unknown>;
      targetProps.set(toPascalCase(k), new Set(Object.keys(subProps).filter(p => !omitted.has(p))));
    }
    const composition: CompositionInfo = { examples, componentKey, subKeys, componentDirAbs: outputDir, targetProps };

    await this.writeStories(outputDir, componentKey, apiYaml, variantsYaml, context, undefined, composition);

    const parentTitle = (apiYaml.title as string) ?? toPascalCase(componentKey);
    const subcomponents = (apiYaml.subcomponents ?? {}) as Record<string, unknown>;
    const subVariantsAll = (variantsYaml.subcomponents ?? {}) as Record<string, unknown>;
    for (const [subKey, subRaw] of Object.entries(subcomponents)) {
      const subApi = subRaw as Record<string, unknown>;
      const subVariantsYaml = (subVariantsAll[subKey] ?? {}) as Record<string, unknown>;
      // Nest under the parent title so subcomponent stories sit inside the
      // parent's nav group, and give them a key-derived id — title-derived ids
      // can collide with a standalone component of the same flattened name
      // ("DE Checkbox/Control" vs "DE Checkbox Control").
      await this.writeStories(path.join(outputDir, subKey), subKey, subApi, subVariantsYaml, context, {
        title: parentTitle,
        key: componentKey,
      }, composition);
    }
  }

  private async writeStories(
    outputDir: string,
    componentKey: string,
    apiYaml: Record<string, unknown>,
    variantsYaml: Record<string, unknown>,
    context: TransformerContext,
    parent?: { title: string; key: string },
    composition?: CompositionInfo,
  ): Promise<void> {
    const analysis = analyzeVariants(apiYaml, variantsYaml, context.processingStates ?? {});
    const prefix = toPascalCase(componentKey);
    // Stories live at <dir>/generated/react/: the component root is 2 up for
    // the main component, 3 up (through the parent dir) for subcomponents.
    const composeCtx: ComposeContext | undefined = composition?.examples
      ? {
          componentKey: composition.componentKey,
          subKeys: composition.subKeys,
          upToComponentRoot: parent ? '../../..' : '../..',
          upToSpecsRoot: parent ? '../../../..' : '../../..',
          componentDirAbs: composition.componentDirAbs,
          examples: composition.examples,
          targetProps: composition.targetProps,
        }
      : undefined;
    const lines = buildStoriesLines(componentKey, apiYaml, analysis, parent, variantsYaml, composeCtx, context.processingStates ?? {});
    const generatedReactDir = path.join(outputDir, 'generated', 'react');
    await fs.ensureDir(generatedReactDir);
    await fs.writeFile(path.join(generatedReactDir, `${prefix}.stories.tsx`), lines.join('\n'), 'utf-8');
  }
}

interface CompositionInfo {
  examples: ExamplesData | undefined;
  componentKey: string;
  subKeys: string[];
  componentDirAbs: string;
  targetProps: Map<string, Set<string>>;
}

function buildStoriesLines(
  componentKey: string,
  apiYaml: Record<string, unknown>,
  analysis: ReturnType<typeof analyzeVariants>,
  parent?: { title: string; key: string },
  variantsYaml?: Record<string, unknown>,
  composeCtx?: ComposeContext,
  processingStates: NonNullable<TransformerContext['processingStates']> = {},
): string[] {
  const prefix = toPascalCase(componentKey);
  const props = (apiYaml.props ?? {}) as Record<string, unknown>;
  // Normalize " / " → "/" so Figma-style separators don't create nav levels
  // with stray leading/trailing spaces.
  const ownTitle = ((apiYaml.title as string) ?? prefix).replace(/\s*\/\s*/g, '/');
  // Subcomponent titles from Figma repeat the parent name ("DE Checkbox / Control");
  // strip it so the nav leaf is just the subcomponent's own name.
  const leaf = parent ? ownTitle.replace(new RegExp(`^${escapeRegExp(parent.title)}\\s*/\\s*`), '') : ownTitle;
  // Drop path segments that sanitize to an empty id part ("_" separators in
  // Figma names) — Storybook's manager crashes on them.
  const title = (parent ? `${parent.title}/${leaf}` : ownTitle)
    .split('/')
    .filter(seg => seg.toLowerCase().replace(/[^a-z0-9]+/g, '').length > 0)
    .join('/');
  const explicitId = parent ? `${camelKebab(parent.key)}-${camelKebab(componentKey)}-sub` : undefined;
  // Mirror the contract's Defaults condition: omitted (state-machine) props
  // don't count — a component whose only default is `state` has no Defaults export.
  const omittedForDefaults = buildOmittedProps(processingStates);
  const hasDefaults = Object.entries(props).some(
    ([k, p]) => !omittedForDefaults.has(k) && 'default' in (p as Record<string, unknown>),
  );

  // Slot props with a bound $slotContent example compose real subcomponent
  // JSX; the rest fall back to a plain text placeholder.
  const slotJsxArgs = new Map<string, string[]>();
  const slotImports = new Map<string, string>();
  if (composeCtx) {
    const defaultElements = ((variantsYaml?.default as Record<string, unknown> | undefined)?.elements ?? {}) as Record<string, Record<string, unknown>>;
    for (const slot of analysis.slots) {
      if (slot.slotType !== 'slot' || !slot.prop) continue;
      const ref = slotExampleRef(defaultElements[slot.elementKey]);
      if (!ref) continue;
      const example = resolveSlotRef(ref, composeCtx.examples);
      if (!example) continue;
      const composed = composeSlotJsx(example, composeCtx, '        ');
      if (composed.lines.length === 0) continue;
      slotJsxArgs.set(slot.prop, composed.lines);
      for (const [n, p] of composed.imports) {
        if (n !== prefix) slotImports.set(n, p); // never re-import the component itself
      }
    }
  }

  // Meta args: defaults + first example value for each string/slot prop so
  // text slots render visible content out of the box.
  const exampleArgs: Array<[string, string]> = [];
  for (const [key, raw] of Object.entries(props)) {
    const prop = raw as Record<string, unknown>;
    if (prop.type === 'string' && Array.isArray(prop.examples) && prop.examples.length > 0) {
      exampleArgs.push([key, JSON.stringify(prop.examples[0])]);
    } else if (prop.type === 'slot' && !slotJsxArgs.has(key)) {
      exampleArgs.push([key, `'Slot content'`]);
    }
  }

  const lines: string[] = [
    '// Generated. Do not edit — regenerate with `specs transform`.',
    "import type { Meta, StoryObj } from '@storybook/react';",
    // JSX in slot args compiles to React.createElement under the classic
    // runtime — the explicit import keeps the file self-sufficient.
    ...(slotJsxArgs.size > 0 ? ["import * as React from 'react';"] : []),
    `import { ${prefix} } from '../../src/react/${prefix}';`,
    ...(hasDefaults ? [`import { ${prefix}Defaults } from '../${prefix}.contract';`] : []),
    ...[...slotImports.entries()].map(([n, p]) => `import { ${n} } from '${p}';`),
    '',
    'const meta = {',
    `  title: 'Components/${title.replace(/'/g, "\\'")}',`,
    ...(explicitId ? [`  id: '${explicitId}',`] : []),
    `  component: ${prefix},`,
    '  args: {',
    ...(hasDefaults ? [`    ...${prefix}Defaults,`] : []),
    ...exampleArgs.map(([k, v]) => `    ${k}: ${v},`),
    ...[...slotJsxArgs.entries()].flatMap(([k, jsx]) => [
      `    ${k}: (`,
      '      <>',
      ...jsx,
      '      </>',
      '    ),',
    ]),
    '  },',
    `} satisfies Meta<typeof ${prefix}>;`,
    '',
    'export default meta;',
    'type Story = StoryObj<typeof meta>;',
    '',
    'export const Default: Story = {};',
    '',
  ];

  const usedNames = new Set(['Default']);
  for (const { configuration } of analysis.propVariants) {
    const name = uniqueName(storyName(configuration), usedNames);
    const args = Object.entries(configuration)
      .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
      .join(', ');
    lines.push(`export const ${name}: Story = { args: { ${args} } };`);
  }
  lines.push('');

  return lines;
}

/** `{ size: 'xS' }` → `SizeXS`; `{ elevated: true }` → `Elevated`; `{ disabled: false }` → `NotDisabled`. */
function storyName(configuration: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(configuration)) {
    if (v === true) parts.push(toPascalCase(k));
    else if (v === false) parts.push(`Not${toPascalCase(k)}`);
    else parts.push(`${toPascalCase(k)}${toPascalCase(String(v))}`);
  }
  const name = parts.join('').replace(/[^A-Za-z0-9_$]/g, '');
  return /^[A-Za-z_$]/.test(name) ? name : `V${name}`;
}

function uniqueName(base: string, used: Set<string>): string {
  let name = base;
  let i = 2;
  while (used.has(name)) name = `${base}${i++}`;
  used.add(name);
  return name;
}

function toPascalCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** camelCase key → kebab-case id segment ("deCheckbox" → "de-checkbox"). */
function camelKebab(str: string): string {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
