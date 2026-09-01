import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import type { Transformer, TransformerContext } from '../Types/Transformer.js';
import { toKebab } from './css/values.js';
import { CONCEPT_TABLE } from './states.js';
import { analyzeVariants, type LayoutNode, type VariantAnalysis } from './react/variantAnalysis.js';
import {
  primitiveBindingFor,
  primitiveComponentName,
  primitiveTarget,
  primitiveAttrs,
  type PrimitiveKind,
} from './react/primitives.js';
import type { ResolvedPlatformConventions } from '@directededges/specs-schema';

/**
 * Emits `generated/react/scaffold.tsx` — a functioning React component that
 * imports the generated contract and styles.css, renders the merged layout
 * tree with BEM classes, sets variant data attributes, and gates slot/element
 * rendering on the visibility rules and inferred structural conditions.
 *
 * Also seeds the authored workspace ONCE: `src/react/{Component}.tsx` (a copy
 * of the generated scaffold with rewritten imports), plus empty
 * `{Component}.extensions.css` (non-scriptable styling) and
 * `{Component}.proposed.css` (styling proposed for promotion into the spec).
 * Files already present in src/ are never touched — they are human-owned.
 *
 * Browser-driven states (hover/active/focus) are CSS-only; application states
 * (disabled, selected, …) surface as aria attributes matching the selectors
 * the css transformer emits.
 *
 * Instance-typed elements render as placeholders this wave (plan 010, wave 2).
 */
export class ReactTransformer implements Transformer {
  readonly name = 'react';
  readonly platformId = 'react';

  async run(apiYaml: Record<string, unknown>, context: TransformerContext): Promise<void> {
    const { outputDir, componentKey } = context;

    const variantsPath = path.join(outputDir, 'variants.yaml');
    if (!fs.existsSync(variantsPath)) {
      console.warn(`  [react] skipping ${componentKey}: no variants.yaml found`);
      return;
    }
    const variantsYaml = yaml.parse(await fs.readFile(variantsPath, 'utf-8')) as Record<string, unknown>;

    const analysis = analyzeVariants(apiYaml, variantsYaml, context.processingStates ?? {});

    const prefix = toPascalCase(componentKey);
    const generatedReactDir = path.join(outputDir, 'generated', 'react');
    await fs.ensureDir(generatedReactDir);
    const lines = buildScaffoldLines(componentKey, apiYaml, variantsYaml, analysis, context, {
      contract: `../${prefix}.contract`,
      css: [`../${prefix}.styles.css`],
      header: '// Generated. Do not edit — regenerate with `specs transform`.',
    });
    await fs.writeFile(path.join(generatedReactDir, `${prefix}.scaffold.tsx`), lines.join('\n'), 'utf-8');

    await this.seedAuthoredWorkspace(outputDir, componentKey, apiYaml, variantsYaml, analysis, context);

    // Subcomponents — each gets its own scaffold seeded under <subKey>/
    const subcomponents = (apiYaml.subcomponents ?? {}) as Record<string, unknown>;
    const subVariantsAll = (variantsYaml.subcomponents ?? {}) as Record<string, unknown>;
    for (const [subKey, subRaw] of Object.entries(subcomponents)) {
      const subApi = subRaw as Record<string, unknown>;
      const subVariantsYaml = (subVariantsAll[subKey] ?? {}) as Record<string, unknown>;
      const subAnalysis = analyzeVariants(subApi, subVariantsYaml, context.processingStates ?? {});
      const subPrefix = toPascalCase(subKey);
      const subDir = path.join(outputDir, subKey);
      const subContext: TransformerContext = { ...context, outputDir: subDir, componentKey: subKey };
      const subGeneratedReactDir = path.join(subDir, 'generated', 'react');
      await fs.ensureDir(subGeneratedReactDir);
      const subLines = buildScaffoldLines(subKey, subApi, subVariantsYaml, subAnalysis, subContext, {
        contract: `../${subPrefix}.contract`,
        css: [`../${subPrefix}.styles.css`],
        header: '// Generated. Do not edit — regenerate with `specs transform`.',
      });
      await fs.writeFile(path.join(subGeneratedReactDir, `${subPrefix}.scaffold.tsx`), subLines.join('\n'), 'utf-8');
      await this.seedAuthoredWorkspace(subDir, subKey, subApi, subVariantsYaml, subAnalysis, subContext);
    }
  }

  /** Create src/react/ authored files when absent; never overwrite. */
  private async seedAuthoredWorkspace(
    outputDir: string,
    componentKey: string,
    apiYaml: Record<string, unknown>,
    variantsYaml: Record<string, unknown>,
    analysis: VariantAnalysis,
    context: TransformerContext,
  ): Promise<void> {
    const srcReactDir = path.join(outputDir, 'src', 'react');
    await fs.ensureDir(srcReactDir);
    const prefix = toPascalCase(componentKey);

    const componentPath = path.join(srcReactDir, `${prefix}.tsx`);
    if (!fs.existsSync(componentPath)) {
      const lines = buildScaffoldLines(componentKey, apiYaml, variantsYaml, analysis, context, {
        contract: `../../generated/${prefix}.contract`,
        css: [`../../generated/${prefix}.styles.css`, `./${prefix}.proposed.css`, `./${prefix}.extensions.css`],
        header: '// Authored component — seeded once by `specs transform`, never overwritten.\n'
          + '// The always-current generated reference lives at ../../generated/react/scaffold.tsx.',
      });
      await fs.writeFile(componentPath, lines.join('\n'), 'utf-8');
    }

    const extensionsPath = path.join(srcReactDir, `${prefix}.extensions.css`);
    if (!fs.existsSync(extensionsPath)) {
      await fs.writeFile(extensionsPath,
        '/* Authored extensions — styling the spec cannot express. Never overwritten. */\n', 'utf-8');
    }

    const proposedPath = path.join(srcReactDir, `${prefix}.proposed.css`);
    if (!fs.existsSync(proposedPath)) {
      await fs.writeFile(proposedPath,
        '/* Authored proposals — styling that could be promoted into the spec. Never overwritten. */\n', 'utf-8');
    }
  }
}

interface ScaffoldImports {
  contract: string;
  css: string[];
  header: string;
}

function buildScaffoldLines(
  componentKey: string,
  apiYaml: Record<string, unknown>,
  variantsYaml: Record<string, unknown>,
  analysis: VariantAnalysis,
  context: TransformerContext,
  imports: ScaffoldImports,
): string[] {
  const prefix = toPascalCase(componentKey);
  const componentClass = toKebab(componentKey);
  const anatomy = (apiYaml.anatomy ?? {}) as Record<string, Record<string, unknown>>;
  const props = (apiYaml.props ?? {}) as Record<string, unknown>;
  const defaultBlock = (variantsYaml.default ?? {}) as Record<string, unknown>;
  const defaultElements = (defaultBlock.elements ?? {}) as Record<string, Record<string, unknown>>;

  const hasDefaults = Object.values(props).some(p => 'default' in (p as Record<string, unknown>));

  // Slot-typed elements bring a ReactNode prop into the scaffold's props.
  const nodeSlotProps = analysis.slots
    .filter(s => s.slotType === 'slot' && s.prop)
    .map(s => s.prop as string);

  const lines: string[] = [
    imports.header,
    "import * as React from 'react';",
    ...imports.css.map(p => `import '${p}';`),
    hasDefaults
      ? `import { ${prefix}Defaults, type ${prefix}Props } from '${imports.contract}';`
      : `import { type ${prefix}Props } from '${imports.contract}';`,
    '',
    `export interface ${prefix}ScaffoldProps extends ${prefix}Props {`,
    ...nodeSlotProps.map(p => `  ${p}?: React.ReactNode;`),
    '}',
    '',
    '// Explicit `undefined` props must not override defaults.',
    'function definedProps<T extends object>(obj: T): Partial<T> {',
    '  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;',
    '}',
    '',
    `export function ${prefix}(props: ${prefix}ScaffoldProps) {`,
    hasDefaults
      ? `  const p = { ...${prefix}Defaults, ...definedProps(props) } as ${prefix}ScaffoldProps;`
      : `  const p = definedProps(props) as ${prefix}ScaffoldProps;`,
    '  return (',
  ];

  const ctx: RenderContext = {
    componentClass,
    anatomy,
    props,
    defaultElements,
    analysis,
    processingStates: context.processingStates ?? {},
    platform: context.platform,
    componentDirAbs: context.outputDir,
    primitiveImports: new Map<string, string>(),
  };

  // Render first: a bound primitive is discovered while walking the tree, and its
  // import has to sit with the others at the top of the file.
  const bodyLines: string[] = [];
  for (const node of analysis.layout) {
    bodyLines.push(...renderNode(node, ctx, 2, true));
  }
  if (ctx.primitiveImports.size > 0) {
    const contractLine = lines.findIndex(l => l.includes(`from '${imports.contract}'`));
    const importLines = [...ctx.primitiveImports.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, from]) => `import { ${name} } from '${from}';`);
    lines.splice(contractLine + 1, 0, ...importLines);
  }
  lines.push(...bodyLines);

  lines.push('  );');
  lines.push('}');
  lines.push('');
  return lines;
}

interface RenderContext {
  componentClass: string;
  anatomy: Record<string, Record<string, unknown>>;
  props: Record<string, unknown>;
  defaultElements: Record<string, Record<string, unknown>>;
  analysis: VariantAnalysis;
  processingStates: NonNullable<TransformerContext['processingStates']>;
  /** This platform's conventions (ADR-073) — carries the primitive bindings. */
  platform?: ResolvedPlatformConventions;
  /** Absolute component directory, for resolving a bound primitive's sibling folder. */
  componentDirAbs: string;
  /** import name → module path, filled while resolving bound primitives. */
  primitiveImports: Map<string, string>;
}

function renderNode(node: LayoutNode, ctx: RenderContext, depth: number, isRoot: boolean): string[] {
  const pad = '  '.repeat(depth);
  const elemType = (ctx.anatomy[node.key]?.type as string) ?? 'container';
  const tag = elemType === 'text' ? 'span' : 'div';
  const className = isRoot ? ctx.componentClass : `${ctx.componentClass}__${toKebab(node.key)}`;

  // Render condition: visibility rule (styles.visible) AND'd with inferred
  // structural-presence conditions from variant layouts.
  const condition = buildCondition(node, ctx);

  // Bound primitives (ADR-074): this platform's conventions may say that a text,
  // glyph or container element is a design system component here. The element keeps
  // its generated class, so every style already emitted still applies — only the
  // concepts the binding maps become props.
  const binding = isRoot ? undefined : primitiveBindingFor(elemType, ctx.platform);
  if (binding) {
    const elemDef = (ctx.defaultElements[node.key] ?? {}) as Record<string, unknown>;
    const elemStyles = (elemDef.styles ?? {}) as Record<string, unknown>;
    const componentName = primitiveComponentName(binding, elemStyles);
    const target = componentName ? primitiveTarget(componentName, ctx.componentDirAbs) : undefined;
    if (target) {
      ctx.primitiveImports.set(target.name, target.importPath);
      const bound = primitiveAttrs(elemType as PrimitiveKind, binding, elemDef, escapeJsxText);
      const boundChildren = node.children.flatMap(c => renderNode(c, ctx, depth + (condition ? 2 : 1), false));
      const head =
        `<${target.name} className="${className}" data-element="${node.key}"` +
        (bound.length ? ' ' + bound.join(' ') : '');
      const bodyLines = boundChildren.length
        ? [`${pad}${head}>`, ...boundChildren, `${pad}</${target.name}>`]
        : [`${pad}${head} />`];
      if (condition) {
        return [`${pad}{${condition} && (`, ...bodyLines.map(l => '  ' + l), `${pad})}`];
      }
      return bodyLines;
    }
  }

  const attrs = isRoot ? rootAttrs(ctx) : [];
  const content = elementContent(node.key, elemType, ctx);
  const children = node.children.flatMap(c => renderNode(c, ctx, depth + (condition ? 2 : 1), false));

  const open = attrs.length > 0
    ? [`<${tag}`, ...attrs.map(a => `  ${a}`), '>']
    : [`<${tag} className="${className}">`];
  const body: string[] = [];

  if (attrs.length > 0) {
    body.push(...open.map(l => pad + (condition ? '  ' : '') + l));
  } else {
    body.push(pad + (condition ? '  ' : '') + open[0]);
  }

  const innerPad = pad + (condition ? '  ' : '') + '  ';
  if (content) body.push(innerPad + content);
  body.push(...children);
  body.push(pad + (condition ? '  ' : '') + `</${tag}>`);

  if (condition) {
    return [
      `${pad}{${condition} && (`,
      ...body,
      `${pad})}`,
    ];
  }
  return body;
}

/** Combined render condition for an element, or undefined to render always. */
function buildCondition(node: LayoutNode, ctx: RenderContext): string | undefined {
  const parts: string[] = [];

  const rule = ctx.analysis.visibility.get(node.key);
  if (rule) {
    if (rule.kind === 'whenTrue') parts.push(`p.${rule.prop}`);
    else if (rule.kind === 'whenNotNull') parts.push(`p.${rule.prop} != null`);
    else if (rule.kind === 'whenValue') parts.push(`p.${rule.prop} === ${JSON.stringify(rule.value)}`);
  }

  if (node.conditions && node.conditions.length > 0) {
    const ors = node.conditions.map(c => {
      const ands = Object.entries(c).map(([k, v]) => {
        if (v === true) return `p.${k}`;
        if (v === false) return `!p.${k}`;
        return `p.${k} === ${JSON.stringify(v)}`;
      });
      return ands.length > 1 ? `(${ands.join(' && ')})` : ands[0];
    });
    parts.push(ors.length > 1 ? `(${ors.join(' || ')})` : ors[0]);
  }

  if (parts.length === 0) return undefined;
  return parts.join(' && ');
}

/** Root element attributes: className, variant data attributes, state aria attributes. */
function rootAttrs(ctx: RenderContext): string[] {
  const attrs: string[] = [`className="${ctx.componentClass}"`];

  // Variant props → data attributes, mirroring the css transformer's selectors:
  // boolean → presence attribute when true; enum/string → value attribute.
  for (const propName of ctx.analysis.dataAttrProps) {
    const prop = (ctx.props[propName] ?? {}) as Record<string, unknown>;
    const kebab = toKebab(propName);
    if (prop.type === 'boolean') {
      attrs.push(`{...(p.${propName} ? { 'data-${kebab}': '' } : {})}`);
    } else {
      attrs.push(`data-${kebab}={p.${propName}}`);
    }
  }

  // Application states → aria attributes matching the css transformer's
  // CONCEPT_TABLE selectors. Concepts sharing an aria attribute (e.g.
  // checked/indeterminate → aria-checked) chain into one ternary.
  const byAria = new Map<string, Array<{ cond: string; ariaValue: string }>>();
  for (const [concept, entry] of Object.entries(ctx.processingStates)) {
    const conceptDef = CONCEPT_TABLE[concept];
    if (!conceptDef || conceptDef.contract === 'omit') continue; // browser-driven
    if (!(entry.prop in ctx.props)) continue;
    const aria = parseAriaSelector(conceptDef.selector);
    if (!aria) continue;
    const cond = entry.value !== undefined
      ? `p.${entry.prop} === ${JSON.stringify(entry.value)}`
      : `p.${entry.prop}`;
    const list = byAria.get(aria.attr) ?? [];
    list.push({ cond, ariaValue: aria.value });
    byAria.set(aria.attr, list);
  }
  for (const [attr, entries] of byAria) {
    const chain = entries.reduce(
      (acc, e) => `${e.cond} ? '${e.ariaValue}' : ${acc}`,
      'undefined',
    );
    attrs.push(`${attr}={${chain}}`);
  }

  return attrs;
}

/** Extract the first aria-* attribute and value from a concept selector. */
function parseAriaSelector(selector: string): { attr: string; value: string } | undefined {
  const match = selector.match(/\[(aria-[a-z-]+)="([^"]+)"\]/);
  return match ? { attr: match[1], value: match[2] } : undefined;
}

/** Inner content expression for an element, or undefined when it only nests children. */
function elementContent(elemKey: string, elemType: string, ctx: RenderContext): string | undefined {
  const elem = (ctx.defaultElements[elemKey] ?? {}) as Record<string, unknown>;

  if (elemType === 'slot') {
    const prop = bindingProp(elem.children);
    return prop ? `{p.${prop}}` : undefined;
  }
  if (elemType === 'text') {
    const prop = bindingProp(elem.content);
    if (prop) return `{p.${prop}}`;
    if (typeof elem.content === 'string') return escapeJsxText(elem.content);
    return undefined;
  }
  if (elemType === 'instance') {
    const ref = instanceRef(elem.instanceOf);
    return `{/* instance: ${ref ?? 'unresolved'} — placeholder until instance slots land */}`;
  }
  return undefined;
}

function bindingProp(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const binding = (value as Record<string, unknown>).$binding;
  if (typeof binding !== 'string') return undefined;
  return binding.match(/^#\/props\/(.+)$/)?.[1];
}

function instanceRef(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const ref = (value as Record<string, unknown>).$ref;
    if (typeof ref === 'string') return ref.replace(/^#\/subcomponents\//, '');
  }
  return undefined;
}

function escapeJsxText(text: string): string {
  return text.replace(/[{}<>]/g, c => `{'${c}'}`);
}

function toPascalCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
