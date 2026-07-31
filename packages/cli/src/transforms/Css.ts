import fs from 'fs-extra';
import { writeAtomic } from './writeAtomic.js';
import path from 'path';
import yaml from 'yaml';
import type { Transformer, TransformerContext } from '../Types/Transformer.js';
import { styleToCSS, impliesAbsolute } from './css/styleToCSS.js';
import { layoutToCSS } from './css/layoutToCSS.js';
import { toKebab } from './css/values.js';
import { CONCEPT_TABLE, buildStateLookup } from './states.js';
import { resolveRules } from './css/rules/index.js';
import { parseLayout, type LayoutNode } from './react/variantAnalysis.js';
import { loadExamples, type ExamplesData } from './react/slotComposition.js';

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
    const prefix = toPascalCase(componentKey);
    // Images registry (ADR-063): backgroundImage fills resolve against it;
    // urls are emitted relative to each stylesheet's location.
    const examples = loadExamples(outputDir);
    const imagesDirAbs = path.join(outputDir, '..', '_images');
    const lines = buildCssLines(componentClass, variantsYaml, tokensFormat, context, anatomyTypes(apiYaml), {
      examples,
      imagesDirAbs,
      relPrefix: '../../_images',
    });
    const generatedDir = path.join(outputDir, 'generated');
    await fs.ensureDir(generatedDir);
    await writeAtomic(path.join(generatedDir, `${prefix}.styles.css`), lines.join('\n'));

    // Subcomponents — each gets {Sub}.styles.css in its own subfolder
    const subcomponents = (variantsYaml.subcomponents ?? {}) as Record<string, unknown>;
    const apiSubs = (apiYaml.subcomponents ?? {}) as Record<string, unknown>;
    for (const [subKey, subRaw] of Object.entries(subcomponents)) {
      const subVariantsYaml = subRaw as Record<string, unknown>;
      const subClass = toKebab(subKey);
      const subFilePrefix = toPascalCase(subKey);
      const subTypes = anatomyTypes((apiSubs[subKey] ?? {}) as Record<string, unknown>);
      const subLines = buildCssLines(subClass, subVariantsYaml, tokensFormat, context, subTypes, {
        examples,
        imagesDirAbs,
        relPrefix: '../../../_images',
      });
      const subDir = path.join(outputDir, subKey, 'generated');
      await fs.ensureDir(subDir);
      await writeAtomic(path.join(subDir, `${subFilePrefix}.styles.css`), subLines.join('\n'));
    }
  }
}

interface ImagesCssContext {
  examples: ExamplesData | undefined;
  imagesDirAbs: string;
  relPrefix: string;
}

/** backgroundImage style ({ $image, objectFit? } | null) → CSS declarations. */
function backgroundImageDecls(value: unknown, images: ImagesCssContext | undefined): string[] {
  if (value === null) return ['background-image: none'];
  if (!images?.examples || !value || typeof value !== 'object') return [];
  const v = value as Record<string, unknown>;
  if (typeof v.$image !== 'string') return [];
  const id = v.$image.match(/#\/components\/[^/]+\/images\/(.+)$/)?.[1];
  const entry = id ? images.examples.images[id] : undefined;
  if (!entry) return [];
  let file: string | undefined;
  if (typeof entry.src === 'string' && /^(data:|https?:)/.test(entry.src)) {
    return imageDecls(`url('${entry.src}')`, v.objectFit);
  }
  if (typeof entry.src === 'string') {
    file = path.basename(entry.src);
  } else {
    const hash = entry.$extensions?.['com.figma']?.imageHash;
    if (hash) {
      try {
        file = fs.readdirSync(images.imagesDirAbs).find(f => f.startsWith(hash));
      } catch {
        file = undefined;
      }
    }
  }
  if (!file) return [];
  return imageDecls(`url('${images.relPrefix}/${file}')`, v.objectFit);
}

function imageDecls(url: string, objectFit: unknown): string[] {
  const decls = [`background-image: ${url}`, 'background-position: center', 'background-repeat: no-repeat'];
  decls.push(`background-size: ${objectFit === 'CONTAIN' ? 'contain' : 'cover'}`);
  return decls;
}

/** Glyphs, raw vectors, and icon-wrapper instances (instance with a name propConfiguration). */
function isGlyphLike(elemType: string | undefined, elem: Record<string, unknown> | undefined): boolean {
  if (elemType === 'glyph' || elemType === 'vector') return true;
  if (elemType !== 'instance') return false;
  const pc = (elem?.propConfigurations ?? {}) as Record<string, unknown>;
  return typeof pc.name === 'string';
}

/** Parse a "WxH" size propConfiguration ("16x16") into pixel dimensions. */
function glyphConfigSize(elem: Record<string, unknown> | undefined): { w: number; h: number } | null {
  const pc = (elem?.propConfigurations ?? {}) as Record<string, unknown>;
  const m = typeof pc.size === 'string' ? pc.size.match(/^(\d+)x(\d+)$/) : null;
  return m ? { w: Number(m[1]), h: Number(m[2]) } : null;
}

/** api.yaml anatomy → element key → type ("container" | "rectangle" | "ellipse" | "vector" | "text" | …). */
function anatomyTypes(apiYaml: Record<string, unknown>): Record<string, string> {
  const anatomy = (apiYaml.anatomy ?? {}) as Record<string, Record<string, unknown>>;
  const types: Record<string, string> = {};
  for (const [key, entry] of Object.entries(anatomy)) {
    if (entry && typeof entry.type === 'string') types[key] = entry.type;
  }
  return types;
}

function buildCssLines(
  componentClass: string,
  variantsYaml: Record<string, unknown>,
  tokensFormat: string | undefined,
  context: TransformerContext,
  elemTypes: Record<string, string> = {},
  images?: ImagesCssContext,
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
  // Element key → parent element key, from the default layout tree.
  const parentOf = new Map<string, string>();
  {
    const layouts = [parseLayout(defaultBlock?.layout), ...variantList.map(v => parseLayout(v.layout))];
    for (const layout of layouts) {
      collectStackingFixes(layout, defaultElements, needsRelative);
      collectParents(layout, parentOf);
      if (layout !== layouts[0]) {
        const keys = new Set<string>();
        collectLayoutKeys(layout, keys);
        for (const k of keys) if (!defaultKeys.has(k)) structuralKeys.add(k);
      }
    }
  }
  // Parent flex direction context for FILL sizing translation.
  const parentLayoutMode = (elemKey: string): string | null => {
    const parent = parentOf.get(elemKey);
    if (!parent) return null;
    const styles = (defaultElements[parent]?.styles ?? {}) as Record<string, unknown>;
    return (styles.layoutMode as string | undefined) ?? null;
  };
  const parentIsAutoLayout = (elemKey: string): boolean => {
    const mode = parentLayoutMode(elemKey);
    return mode === 'HORIZONTAL' || mode === 'VERTICAL';
  };
  // Coordinates imply absolute placement per impliesAbsolute; roots never infer.
  const inferAbsolute = (elemKey: string): boolean =>
    parentOf.has(elemKey) &&
    impliesAbsolute(
      (defaultElements[elemKey]?.styles ?? {}) as Record<string, unknown>,
      parentIsAutoLayout(elemKey)
    );

  for (const [elemKey, elem] of Object.entries(defaultElements)) {
    const selector = elemSelector(componentClass, elemKey);
    const styles = (elem.styles ?? {}) as Record<string, unknown>;
    const decls = [
      ...layoutToCSS(styles, tokensFormat, parentLayoutMode(elemKey)),
      ...styleToCSS(styles, tokensFormat, elemTypes[elemKey], { inferAbsolute: inferAbsolute(elemKey) }),
    ];
    if ('backgroundImage' in styles) decls.push(...backgroundImageDecls(styles.backgroundImage, images));

    // Ellipses are circular unless the spec sets an explicit radius.
    if (elemTypes[elemKey] === 'ellipse' && !decls.some(d => d.startsWith('border-radius:'))) {
      decls.push('border-radius: 50%');
    }
    // Glyphs/vectors paint their background-color through a mask image the
    // scaffold provides via --glyph (an unresolvable mask renders nothing).
    // Instance elements with a `name` propConfiguration are icon-wrapper
    // instances and take the same fallback. Spans need block display; without
    // a fill they tint with the inherited text color; instance glyphs take
    // their dimensions from a "WxH" size propConfiguration when present.
    if (isGlyphLike(elemTypes[elemKey], elem)) {
      decls.push('mask: var(--glyph, none) no-repeat center / contain');
      decls.push('-webkit-mask: var(--glyph, none) no-repeat center / contain');
      if (!decls.some(d => d.startsWith('display:'))) decls.push('display: block');
      if (!decls.some(d => d.startsWith('background'))) decls.push('background-color: currentColor');
      // HUG on an empty masked span collapses to 0 — the configured instance
      // size is the glyph's intrinsic size, so it wins over fit-content.
      const size = glyphConfigSize(elem);
      if (size) {
        const fitless = decls.filter(d => d !== 'width: fit-content' && d !== 'height: fit-content');
        decls.length = 0;
        decls.push(...fitless);
        if (!decls.some(d => d.startsWith('width:'))) decls.push(`width: ${size.w}px`);
        if (!decls.some(d => d.startsWith('height:'))) decls.push(`height: ${size.h}px`);
      }
    }
    // A full-bleed absolute child visually IS its rounded parent's surface —
    // without inheriting the radius, its background paints square corners.
    if (
      !decls.some(d => d.startsWith('border-radius:')) &&
      coversParent(styles, (defaultElements[parentOf.get(elemKey) ?? '']?.styles ?? {}) as Record<string, unknown>) &&
      'cornerRadius' in ((defaultElements[parentOf.get(elemKey) ?? '']?.styles ?? {}) as Record<string, unknown>)
    ) {
      decls.push('border-radius: inherit');
    }
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
        const concept = stateLookup.get(`${k}::${vStr}`) ?? stateLookup.get(`${k}::${vStr.toLowerCase()}`);
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
      const decls = [
        ...layoutToCSS(styles, tokensFormat, parentLayoutMode(elemKey)),
        ...styleToCSS(styles, tokensFormat, elemTypes[elemKey], { inferAbsolute: inferAbsolute(elemKey) }),
      ];
      if ('backgroundImage' in styles) decls.push(...backgroundImageDecls(styles.backgroundImage, images));
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

function collectParents(nodes: LayoutNode[], into: Map<string, string>, parent?: string): void {
  for (const node of nodes) {
    if (parent && !into.has(node.key)) into.set(node.key, parent);
    collectParents(node.children, into, node.key);
  }
}

/**
 * True when an absolutely-placed child exactly covers its parent's bounds:
 * either zero insets on all sides, or zero offset with dimensions equal to
 * the parent's.
 */
function coversParent(styles: Record<string, unknown>, parentStyles: Record<string, unknown>): boolean {
  const n = (v: unknown) => (typeof v === 'number' ? v : undefined);
  const allInsetsZero =
    n(styles.top) === 0 && n(styles.bottom) === 0 && n(styles.start) === 0 && n(styles.end) === 0;
  const sameSizeAtOrigin =
    n(styles.top) === 0 &&
    n(styles.start) === 0 &&
    n(styles.width) !== undefined &&
    n(styles.width) === n(parentStyles.width) &&
    n(styles.height) !== undefined &&
    n(styles.height) === n(parentStyles.height);
  return allInsetsZero || sameSizeAtOrigin;
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
  const parentStyles = (elements[parent ?? '']?.styles ?? {}) as Record<string, unknown>;
  const parentAutoLayout =
    parentStyles.layoutMode === 'HORIZONTAL' || parentStyles.layoutMode === 'VERTICAL';
  const isAbsolute = (key: string) => {
    if (parent === undefined) return false; // roots never infer
    const styles = (elements[key]?.styles ?? {}) as Record<string, unknown>;
    return impliesAbsolute(styles, parentAutoLayout);
  };

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

function toPascalCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function elemSelector(componentClass: string, elemKey: string): string {
  return elemKey === 'root'
    ? `.${componentClass}`
    : `.${componentClass}__${toKebab(elemKey)}`;
}
