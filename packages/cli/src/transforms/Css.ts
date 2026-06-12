import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import type { Transformer, TransformerContext } from '../Types/Transformer.js';
import { styleToCSS } from './css/styleToCSS.js';
import { layoutToCSS } from './css/layoutToCSS.js';
import { toKebab } from './css/values.js';
import { CONCEPT_TABLE, buildStateLookup } from './states.js';
import { resolveRules } from './css/rules/index.js';
import { parseLayout, type LayoutNode } from './react/variantAnalysis.js';

export class CssTransformer implements Transformer {
  readonly name = 'css';

  async run(apiYaml: Record<string, unknown>, context: TransformerContext): Promise<void> {
    const { outputDir, componentKey, tokensFormat } = context;

    const variantsPath = path.join(outputDir, 'variants.yaml');
    if (!fs.existsSync(variantsPath)) {
      console.warn(`  [css] skipping ${componentKey}: no variants.yaml found`);
      return;
    }

    const raw = await fs.readFile(variantsPath, 'utf-8');
    const variantsYaml = yaml.parse(raw) as Record<string, unknown>;

    const componentClass = toKebab(componentKey);
    const lines = buildCssLines(componentClass, variantsYaml, tokensFormat, context);
    const generatedDir = path.join(outputDir, 'generated');
    await fs.ensureDir(generatedDir);
    await fs.writeFile(path.join(generatedDir, 'styles.css'), lines.join('\n'), 'utf-8');

    // Subcomponents — each gets styles.css in its own subfolder
    const subcomponents = (variantsYaml.subcomponents ?? {}) as Record<string, unknown>;
    for (const [subKey, subRaw] of Object.entries(subcomponents)) {
      const subVariantsYaml = subRaw as Record<string, unknown>;
      const subClass = toKebab(subKey);
      const subLines = buildCssLines(subClass, subVariantsYaml, tokensFormat, context);
      const subDir = path.join(generatedDir, subKey);
      await fs.ensureDir(subDir);
      await fs.writeFile(path.join(subDir, 'styles.css'), subLines.join('\n'), 'utf-8');
    }
  }
}

function buildCssLines(
  componentClass: string,
  variantsYaml: Record<string, unknown>,
  tokensFormat: string | undefined,
  context: TransformerContext,
): string[] {
  // Apply configured rules as pre-passes on the structured variants data
  const ruleNames = (context.transformerOptions?.rules as string[] | undefined) ?? [];
  const rules = resolveRules(ruleNames);
  for (const rule of rules) {
    variantsYaml = rule.apply(variantsYaml, { tokensFormat });
  }

  const lines: string[] = [
    '/* Generated. Do not edit — regenerate with `specs transform`. */',
    '',
  ];

  // ── Default styles ─────────────────────────────────────────────────────────
  const defaultBlock = variantsYaml.default as Record<string, unknown> | undefined;
  const defaultElements = (defaultBlock?.elements ?? {}) as Record<string, Record<string, unknown>>;
  const variantList = (variantsYaml.variants ?? []) as Array<Record<string, unknown>>;

  // Elements absent from the default layout but added by variant layouts are
  // hidden at base and un-hidden under each including variant's selector.
  const defaultKeys = new Set<string>();
  collectLayoutKeys(parseLayout(defaultBlock?.layout), defaultKeys);
  const structuralKeys = new Set<string>();
  // Parents of absolutely-positioned elements must establish a containing
  // block, or inset: 0 resolves against the viewport. Their non-absolute
  // siblings must also be positioned: layout order is Figma children order
  // (first = back-most, last on top), and only positioned siblings paint in
  // DOM order — an absolute element would otherwise jump above static ones.
  const needsRelative = new Set<string>();
  {
    const layouts = [parseLayout(defaultBlock?.layout), ...variantList.map(v => parseLayout(v.layout))];
    for (const layout of layouts) {
      collectStackingFixes(layout, defaultElements, needsRelative);
      if (layout !== layouts[0]) {
        const keys = new Set<string>();
        collectLayoutKeys(layout, keys);
        for (const k of keys) if (!defaultKeys.has(k)) structuralKeys.add(k);
      }
    }
  }

  for (const [elemKey, elem] of Object.entries(defaultElements)) {
    const selector = elemSelector(componentClass, elemKey);
    const styles = (elem.styles ?? {}) as Record<string, unknown>;
    const decls = [...layoutToCSS(styles, tokensFormat), ...styleToCSS(styles, tokensFormat)];

    if (needsRelative.has(elemKey) && !decls.some(d => d.startsWith('position:'))) {
      decls.push('position: relative');
    }
    if (structuralKeys.has(elemKey)) {
      decls.push('display: none');
    }

    if (decls.length > 0) {
      lines.push(`${selector} {`);
      for (const d of decls) lines.push(`  ${d};`);
      lines.push('}');
      lines.push('');
    }
  }

  // ── State lookup — built from config.processing.states ────────────────────
  // Each concept maps a (prop, value) pair to a canonical CSS selector.
  // Props in classifiedProps use real CSS selectors instead of data attributes.
  // Any classified prop whose variant value doesn't match a known concept is
  // the base/rest state — the variant is skipped (base block already covers it).
  const { lookup: stateLookup, classifiedProps } =
    buildStateLookup(context.processingStates ?? {});

  // ── Variants — in schema order ─────────────────────────────────────────────
  // variants.yaml variant order is intentional: single-prop variants before
  // multi-prop compound variants, matching the layering cascade.
  const variants = (variantsYaml.variants ?? []) as Array<Record<string, unknown>>;

  for (const variant of variants) {
    const configuration = (variant.configuration ?? {}) as Record<string, unknown>;
    const configEntries = Object.entries(configuration);
    if (configEntries.length === 0) continue;

    // Classify each config entry as a state selector or a data attribute.
    // stateSelSuffixes accumulates the cartesian product of all state selectors —
    // comma-separated selectors like ':disabled, [aria-disabled="true"]' expand
    // into multiple suffixes so each gets its own CSS rule.
    let skip = false;
    const dataAttrs: string[] = [];
    let stateSelSuffixes: string[] = [''];

    for (const [k, v] of configEntries) {
      const vStr = String(v);
      if (classifiedProps.has(k)) {
        const concept = stateLookup.get(`${k}::${vStr}`);
        if (!concept) { skip = true; break; } // unmatched value = base/rest state
        const conceptEntry = CONCEPT_TABLE[concept];
        const sel = conceptEntry?.selector ?? `[data-${toKebab(k)}="${vStr}"]`;
        const parts = sel.split(',').map(s => s.trim());
        const expanded: string[] = [];
        for (const existing of stateSelSuffixes) {
          for (const part of parts) expanded.push(existing + part);
        }
        stateSelSuffixes = expanded;
      } else {
        // Boolean true → presence selector; string value → value selector
        dataAttrs.push(v === true ? `[data-${toKebab(k)}]` : `[data-${toKebab(k)}="${vStr}"]`);
      }
    }
    if (skip) continue;

    // Guard :hover and :active against firing when disabled, if disabled is configured
    if (context.processingStates?.['disabled']) {
      const disabledSel = CONCEPT_TABLE['disabled']?.selector ?? ':disabled';
      const notGuard = disabledSel.split(',').map(s => `:not(${s.trim()})`).join('');
      stateSelSuffixes = stateSelSuffixes.map(s =>
        (s.includes(':hover') || s.includes(':active')) ? s + notGuard : s
      );
    }

    const dataAttrStr = dataAttrs.join('');
    const rootBase = `.${componentClass}${dataAttrStr}`;
    const rootSelectors = stateSelSuffixes.map(s => `${rootBase}${s}`);

    const variantElements = (variant.elements ?? {}) as Record<string, Record<string, unknown>>;

    // Structural layout changes: a variant layout that adds an element
    // un-hides it; one that drops a default element hides it.
    const displayDecls = new Map<string, string>();
    if (variant.layout) {
      const variantKeys = new Set<string>();
      collectLayoutKeys(parseLayout(variant.layout), variantKeys);
      for (const key of variantKeys) {
        if (!structuralKeys.has(key)) continue;
        const styles = (defaultElements[key]?.styles ?? {}) as Record<string, unknown>;
        displayDecls.set(key, `display: ${styles.layoutMode ? 'flex' : 'block'}`);
      }
      for (const key of defaultKeys) {
        if (key !== 'root' && !variantKeys.has(key)) displayDecls.set(key, 'display: none');
      }
    }

    const elemKeys = new Set([...Object.keys(variantElements), ...displayDecls.keys()]);
    for (const elemKey of elemKeys) {
      const elemSuffix = elemKey === 'root' ? '' : ` ${elemSelector(componentClass, elemKey)}`;
      const selector = rootSelectors.map(s => `${s}${elemSuffix}`).join(',\n');

      const styles = (variantElements[elemKey]?.styles ?? {}) as Record<string, unknown>;
      const decls = [...layoutToCSS(styles, tokensFormat), ...styleToCSS(styles, tokensFormat)];
      const display = displayDecls.get(elemKey);
      if (display && !decls.some(d => d.startsWith('display:'))) decls.push(display);

      if (decls.length > 0) {
        lines.push(`${selector} {`);
        for (const d of decls) lines.push(`  ${d};`);
        lines.push('}');
        lines.push('');
      }
    }
  }

  return lines;
}

function collectLayoutKeys(nodes: LayoutNode[], into: Set<string>): void {
  for (const node of nodes) {
    into.add(node.key);
    collectLayoutKeys(node.children, into);
  }
}

/**
 * Mark elements that need `position: relative` for correct stacking: the
 * layout parent of any absolutely-positioned element (containing block), and
 * that element's non-absolute siblings (so painting follows layout order —
 * last on top — instead of absolute elements covering static siblings).
 */
function collectStackingFixes(
  nodes: LayoutNode[],
  elements: Record<string, Record<string, unknown>>,
  into: Set<string>,
  parent?: string,
): void {
  const isAbsolute = (key: string) =>
    ((elements[key]?.styles ?? {}) as Record<string, unknown>).position === 'ABSOLUTE';

  if (nodes.some(n => isAbsolute(n.key))) {
    if (parent) into.add(parent);
    for (const n of nodes) {
      if (!isAbsolute(n.key)) into.add(n.key);
    }
  }
  for (const node of nodes) {
    collectStackingFixes(node.children, elements, into, node.key);
  }
}

function elemSelector(componentClass: string, elemKey: string): string {
  return elemKey === 'root'
    ? `.${componentClass}`
    : `.${componentClass}__${toKebab(elemKey)}`;
}
