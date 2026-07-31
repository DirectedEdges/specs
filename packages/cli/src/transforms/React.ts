import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import type { Transformer, TransformerContext } from '../Types/Transformer.js';
import { toKebab } from './css/values.js';
import { CONCEPT_TABLE } from './states.js';
import { analyzeVariants, type LayoutNode, type VariantAnalysis } from './react/variantAnalysis.js';
import { buildOmittedProps } from './states.js';
import {
  loadExamples,
  resolveInstanceTarget,
  propsObjectSource,
  type ComposeContext,
  type ExamplesData,
} from './react/slotComposition.js';

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

  async run(apiYaml: Record<string, unknown>, context: TransformerContext): Promise<void> {
    const { outputDir, componentKey } = context;

    const variantsPath = path.join(outputDir, 'variants.yaml');
    if (!fs.existsSync(variantsPath)) {
      console.warn(`  [react] skipping ${componentKey}: no variants.yaml found`);
      return;
    }
    const variantsYaml = yaml.parse(await fs.readFile(variantsPath, 'utf-8')) as Record<string, unknown>;

    const analysis = analyzeVariants(apiYaml, variantsYaml, context.processingStates ?? {});

    const composition = buildComposition(outputDir, componentKey, apiYaml, variantsYaml, context);

    const prefix = toPascalCase(componentKey);
    const generatedReactDir = path.join(outputDir, 'generated', 'react');
    await fs.ensureDir(generatedReactDir);
    const lines = buildScaffoldLines(componentKey, apiYaml, variantsYaml, analysis, context, {
      contract: `../${prefix}.contract`,
      css: [`../${prefix}.styles.css`],
      header: '// Generated. Do not edit — regenerate with `specs transform`.',
    }, composition, false);
    await fs.writeFile(path.join(generatedReactDir, `${prefix}.scaffold.tsx`), lines.join('\n'), 'utf-8');

    await this.seedAuthoredWorkspace(outputDir, componentKey, apiYaml, variantsYaml, analysis, context, composition, false);

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
      }, composition, true);
      await fs.writeFile(path.join(subGeneratedReactDir, `${subPrefix}.scaffold.tsx`), subLines.join('\n'), 'utf-8');
      await this.seedAuthoredWorkspace(subDir, subKey, subApi, subVariantsYaml, subAnalysis, subContext, composition, true);
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
    composition?: Composition,
    isSub = false,
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
      }, composition, isSub);
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

/** Cross-cutting data for composing nested instances into scaffolds. */
interface Composition {
  examples: ExamplesData;
  componentKey: string;
  subKeys: string[];
  componentDirAbs: string;
  /** Known prop names per import name (contract-visible props only). */
  targetProps: Map<string, Set<string>>;
  omittedProps: Set<string>;
}

function buildComposition(
  outputDir: string,
  componentKey: string,
  apiYaml: Record<string, unknown>,
  variantsYaml: Record<string, unknown>,
  context: TransformerContext,
): Composition {
  const subcomponents = (apiYaml.subcomponents ?? {}) as Record<string, unknown>;
  const omitted = buildOmittedProps(context.processingStates ?? {});
  const targetProps = new Map<string, Set<string>>();
  for (const [k, subRaw] of Object.entries(subcomponents)) {
    const subProps = ((subRaw as Record<string, unknown>).props ?? {}) as Record<string, unknown>;
    targetProps.set(toPascalCase(k), new Set(Object.keys(subProps).filter(p => !omitted.has(p))));
  }
  // Sibling components referenced by string instanceOf: read their api.yaml
  // once so composed props are filtered against the sibling's contract too.
  for (const name of collectInstanceOfStrings(variantsYaml)) {
    const pascal = toPascalCase(name);
    if (targetProps.has(pascal)) continue;
    const siblingApi = path.join(outputDir, '..', name, 'api.yaml');
    if (!fs.existsSync(siblingApi)) continue;
    try {
      const parsed = yaml.parse(fs.readFileSync(siblingApi, 'utf-8')) as Record<string, unknown>;
      const sibProps = (parsed.props ?? {}) as Record<string, unknown>;
      targetProps.set(pascal, new Set(Object.keys(sibProps).filter(p => !omitted.has(p))));
    } catch {
      // unreadable sibling spec — leave unfiltered
    }
  }
  return {
    examples: loadExamples(outputDir) ?? { main: {}, subs: {} },
    componentKey,
    subKeys: Object.keys(subcomponents),
    componentDirAbs: outputDir,
    targetProps,
    omittedProps: omitted,
  };
}

/** All string instanceOf values anywhere in the variants tree. */
function collectInstanceOfStrings(node: unknown, into: Set<string> = new Set()): Set<string> {
  if (Array.isArray(node)) {
    for (const item of node) collectInstanceOfStrings(item, into);
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k === 'instanceOf' && typeof v === 'string') into.add(v);
      else collectInstanceOfStrings(v, into);
    }
  }
  return into;
}

function buildScaffoldLines(
  componentKey: string,
  apiYaml: Record<string, unknown>,
  variantsYaml: Record<string, unknown>,
  analysis: VariantAnalysis,
  context: TransformerContext,
  imports: ScaffoldImports,
  composition?: Composition,
  isSub = false,
): string[] {
  const prefix = toPascalCase(componentKey);
  const componentClass = toKebab(componentKey);
  const anatomy = (apiYaml.anatomy ?? {}) as Record<string, Record<string, unknown>>;
  const props = (apiYaml.props ?? {}) as Record<string, unknown>;
  const defaultBlock = (variantsYaml.default ?? {}) as Record<string, unknown>;
  const defaultElements = (defaultBlock.elements ?? {}) as Record<string, Record<string, unknown>>;

  // Mirror the contract's Defaults condition: omitted (state-machine) props
  // don't count — a component whose only default is `state` has no Defaults export.
  const omittedForDefaults = buildOmittedProps(context.processingStates ?? {});
  const hasDefaults = Object.entries(props).some(
    ([k, p]) => !omittedForDefaults.has(k) && 'default' in (p as Record<string, unknown>),
  );

  // Slot-typed elements bring a ReactNode prop into the scaffold's props.
  const nodeSlotProps = analysis.slots
    .filter(s => s.slotType === 'slot' && s.prop)
    .map(s => s.prop as string);

  // Scaffolds live 2 directories below the component root (src/react or
  // generated/react); subcomponents sit one directory deeper.
  const composeCtx: ComposeContext | undefined = composition
    ? {
        componentKey: composition.componentKey,
        subKeys: composition.subKeys,
        upToComponentRoot: isSub ? '../../..' : '../..',
        upToSpecsRoot: isSub ? '../../../..' : '../../..',
        componentDirAbs: composition.componentDirAbs,
        examples: composition.examples,
        targetProps: composition.targetProps,
      }
    : undefined;

  const instanceImports = new Map<string, string>();
  const ctx: RenderContext = {
    componentClass,
    anatomy,
    props,
    defaultElements,
    analysis,
    processingStates: context.processingStates ?? {},
    variants: (variantsYaml.variants ?? []) as Array<Record<string, unknown>>,
    composeCtx,
    composition,
    instanceImports,
    selfName: prefix,
  };

  const bodyLines: string[] = [];
  for (const node of analysis.layout) {
    bodyLines.push(...renderNode(node, ctx, 2, true));
  }
  // Leaf components with no layout tree (pure-glyph/text primitives) must
  // still return valid TSX — an empty return ( ); does not parse.
  if (bodyLines.length === 0) {
    bodyLines.push(`    <div className="${componentClass}" data-element="root" />`);
  }

  const lines: string[] = [
    imports.header,
    "import * as React from 'react';",
    ...imports.css.map(p => `import '${p}';`),
    hasDefaults
      ? `import { ${prefix}Defaults, type ${prefix}Props } from '${imports.contract}';`
      : `import { type ${prefix}Props } from '${imports.contract}';`,
    ...[...instanceImports.entries()].map(([n, p]) => `import { ${n} } from '${p}';`),
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
    ...(hasGlyphs(anatomy, defaultElements)
      ? [
          "// Glyph assets served from the workspace assets directory (see `fetch`).",
          "const GLYPH_BASE = '/assets/icons';",
          'function glyphUrl(name: unknown): string | undefined {',
          '  if (name == null) return undefined;',
          '  // Kebabize camelCase too — icon names arrive as "expandMore" under CAMEL key formatting.',
          "  const slug = String(name).trim().replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/[\\s_]+/g, '-').replace(/-+/g, '-').toLowerCase();",
          "  return `url('${GLYPH_BASE}/${slug}.svg')`;",
          '}',
          '',
        ]
      : []),
    `export function ${prefix}(props: ${prefix}ScaffoldProps) {`,
    hasDefaults
      ? `  const p = { ...${prefix}Defaults, ...definedProps(props) } as ${prefix}ScaffoldProps;`
      : `  const p = definedProps(props) as ${prefix}ScaffoldProps;`,
    '  return (',
  ];

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
  variants: Array<Record<string, unknown>>;
  composeCtx?: ComposeContext;
  composition?: Composition;
  /** import name → module path, filled while rendering nested instances */
  instanceImports: Map<string, string>;
  /** The component's own name — never imported into itself. */
  selfName: string;
}

function renderNode(node: LayoutNode, ctx: RenderContext, depth: number, isRoot: boolean): string[] {
  const pad = '  '.repeat(depth);
  const elemType = (ctx.anatomy[node.key]?.type as string) ?? 'container';
  const tag = elemType === 'text' ? 'span' : 'div';
  const className = isRoot ? ctx.componentClass : `${ctx.componentClass}__${toKebab(node.key)}`;

  // Render condition: visibility rule (styles.visible) AND'd with inferred
  // structural-presence conditions from variant layouts.
  const condition = buildCondition(node, ctx);

  // Nested instances: resolve instanceOf to a generated component
  // (subcomponent of this component, or a sibling component) and render it
  // inside the wrapper element with its configured props. Variant-specific
  // propConfigurations become conditional spreads gated on real props.
  const elemDef = (ctx.defaultElements[node.key] ?? {}) as Record<string, unknown>;
  if (elemType === 'instance' && ctx.composeCtx) {
    const target = resolveInstanceTarget(elemDef.instanceOf ?? ctx.anatomy[node.key]?.instanceOf, ctx.composeCtx);
    if (target && target.name !== ctx.selfName) {
      ctx.instanceImports.set(target.name, target.importPath);
      const known = ctx.composeCtx.targetProps?.get(target.name);
      const spreads: string[] = [];
      const base = propsObjectSource(
        (elemDef.propConfigurations ?? {}) as Record<string, unknown>,
        ctx.composeCtx,
        ctx.instanceImports,
        known,
      );
      if (base) spreads.push(`{...${base}}`);
      // Shared-prop pass-through: when parent and instance expose the same
      // contract prop (e.g. checked), bind it directly — dynamic wins over
      // the static instance configuration.
      const omittedSet = ctx.composition?.omittedProps ?? new Set<string>();
      const shared = Object.keys(ctx.props).filter(
        k => known?.has(k) && !omittedSet.has(k) && /^[A-Za-z_$][\w$]*$/.test(k),
      );
      if (shared.length) {
        spreads.push(`{...{ ${shared.map(k => `${k}: p.${k}`).join(', ')} }}`);
      }
      for (const variant of ctx.variants) {
        const variantElems = (variant.elements ?? {}) as Record<string, Record<string, unknown>>;
        const delta = (variantElems[node.key]?.propConfigurations ?? undefined) as Record<string, unknown> | undefined;
        if (!delta) continue;
        const cond = configToExpr(
          (variant.configuration ?? {}) as Record<string, unknown>,
          ctx.props,
          ctx.composition?.omittedProps ?? new Set(),
        );
        if (!cond) continue; // browser-state-driven variant — CSS handles it
        const deltaSrc = propsObjectSource(delta, ctx.composeCtx, ctx.instanceImports, known);
        if (deltaSrc) spreads.push(`{...(${cond} ? ${deltaSrc} : {})}`);
      }
      const inner = `<${target.name}${spreads.length ? ' ' + spreads.join(' ') : ''} />`;
      const open = `<${tag} className="${className}" data-element="${node.key}">`;
      const innerPad = pad + (condition ? '  ' : '');
      const body = [innerPad + open, `${innerPad}  ${inner}`, `${innerPad}</${tag}>`];
      if (condition) {
        return [`${pad}{${condition} && (`, ...body, `${pad})}`];
      }
      return body;
    }
  }

  // Glyphs render as self-closing masked spans: the CSS paints the element's
  // fill color through the icon's SVG via mask-image (--glyph). Instance
  // elements carrying a `name` propConfiguration are icon-wrapper instances
  // and take the same path.
  const instanceGlyphName = (() => {
    if (elemType !== 'instance') return undefined;
    const pc = (elemDef.propConfigurations ?? {}) as Record<string, unknown>;
    return typeof pc.name === 'string' ? pc.name : undefined;
  })();
  if (elemType === 'glyph' || elemType === 'vector' || instanceGlyphName !== undefined) {
    const nameExpr = glyphNameExpr(node.key, ctx);
    const line =
      `<span className="${className}" data-element="${node.key}"` +
      ` style={{ ['--glyph' as string]: glyphUrl(${nameExpr}) } as React.CSSProperties}` +
      ' aria-hidden="true" />';
    if (condition) {
      return [`${pad}{${condition} && (`, `${pad}  ${line}`, `${pad})}`];
    }
    return [pad + line];
  }

  const attrs = isRoot ? rootAttrs(ctx) : [];
  const content = elementContent(node.key, elemType, ctx);
  const children = node.children.flatMap(c => renderNode(c, ctx, depth + (condition ? 2 : 1), false));

  const open = attrs.length > 0
    ? [`<${tag}`, ...attrs.map(a => `  ${a}`), '>']
    : [`<${tag} className="${className}" data-element="${node.key}">`];
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
  // Every rendered element carries its spec identity; the component's top
  // node is the `root` element, mirroring the schema's elements taxonomy.
  const attrs: string[] = [`className="${ctx.componentClass}"`, 'data-element="root"'];

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

/**
 * A variant configuration as a boolean expression over contract props, or
 * null when any key isn't a real prop (browser-state-driven variants).
 */
function configToExpr(
  config: Record<string, unknown>,
  props: Record<string, unknown>,
  omitted: Set<string>,
): string | null {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(config)) {
    if (!(k in props) || omitted.has(k) || !/^[A-Za-z_$][\w$]*$/.test(k)) return null;
    if (v === true) parts.push(`p.${k}`);
    else if (v === false) parts.push(`!p.${k}`);
    else parts.push(`p.${k} === ${JSON.stringify(v)}`);
  }
  return parts.length ? parts.join(' && ') : null;
}

function hasGlyphs(
  anatomy: Record<string, Record<string, unknown>>,
  defaultElements: Record<string, Record<string, unknown>>,
): boolean {
  return Object.entries(anatomy).some(([key, e]) => {
    if (e?.type === 'glyph' || e?.type === 'vector') return true;
    if (e?.type !== 'instance') return false;
    const pc = ((defaultElements[key] ?? {}).propConfigurations ?? {}) as Record<string, unknown>;
    return typeof pc.name === 'string';
  });
}

/**
 * Expression for a glyph's icon name: a bound prop, the literal content
 * string, a `name` propConfiguration (icon-wrapper instances), or the
 * element key as a last-resort slug (raw vectors like a checkbox check often
 * share their element name with an icon asset).
 */
function glyphNameExpr(elemKey: string, ctx: RenderContext): string {
  const elem = (ctx.defaultElements[elemKey] ?? {}) as Record<string, unknown>;
  const prop = bindingProp(elem.content);
  if (prop) return `p.${prop}`;
  if (typeof elem.content === 'string') return JSON.stringify(elem.content);
  const pc = (elem.propConfigurations ?? {}) as Record<string, unknown>;
  const nameProp = bindingProp(pc.name);
  if (nameProp) return `p.${nameProp}`;
  if (typeof pc.name === 'string') return JSON.stringify(pc.name);
  return JSON.stringify(elemKey);
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
