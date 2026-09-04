import fs from 'fs-extra';
import { writeAtomic } from './writeAtomic.js';
import path from 'path';
import yaml from 'yaml';
import type { Transformer, TransformerContext } from '../Types/Transformer.js';
import { styleToCSS, impliesAbsolute } from './css/styleToCSS.js';
import { layoutToCSS } from './css/layoutToCSS.js';
import { toKebab, isGradient, reportNameWarnings, withNameWarningsSuppressed } from './css/values.js';
import { normalizeEnumValue } from './enumCase.js';
import { CONCEPT_TABLE, buildStateLookup } from './states.js';
import { resolveRules } from './css/rules/index.js';
import { parseLayout, type LayoutNode } from './react/variantAnalysis.js';
import { loadExamples, type ExamplesData } from './examples.js';

/**
 * The light-DOM companion sheet for a custom element.
 *
 * Content composed into a component arrives as light-DOM children and is styled
 * by the document, not by the shadow stylesheet — `:host *` cannot reach past
 * the boundary, and `::slotted()` reaches only the top level. The class form
 * gets this for free, because its composed content sits inside the block class
 * in the same document. Without it, composed content computes as `content-box`
 * and every padded element is larger than the spec says.
 */
function lightDomLines(tag: string): string[] {
  return [
    '/* Generated. Do not edit — regenerate with `specs transform`. */',
    '',
    `${tag}, ${tag} * {`,
    '  box-sizing: border-box;',
    '}',
    '',
  ];
}

/** Which element a stylesheet's root rules target: the block class, or the custom element. */
type RootForm = 'class' | 'host';

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
    }, 'class', anatomyRoles(apiYaml), apiPropsOf(apiYaml));
    const generatedDir = path.join(outputDir, 'generated');
    await fs.ensureDir(generatedDir);
    await writeAtomic(path.join(generatedDir, `${prefix}.styles.css`), lines.join('\n'));

    // The same rules written for a shadow tree, where the custom element itself
    // is the root: root rules target `:host`, so a caller can size and place the
    // component by styling the element, exactly as it would any other. Element
    // rules are identical — they match inside the shadow tree either way.
    const hostLines = withNameWarningsSuppressed(() => buildCssLines(componentClass, variantsYaml, tokensFormat, context, anatomyTypes(apiYaml), {
      examples,
      imagesDirAbs,
      relPrefix: '../../_images',
    }, 'host', anatomyRoles(apiYaml), apiPropsOf(apiYaml)));
    await writeAtomic(path.join(generatedDir, `${prefix}.host.css`), hostLines.join('\n'));
    await writeAtomic(path.join(generatedDir, `${prefix}.light.css`), lightDomLines(componentClass).join('\n'));

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
      const subHostLines = withNameWarningsSuppressed(() => buildCssLines(subClass, subVariantsYaml, tokensFormat, context, subTypes, {
        examples,
        imagesDirAbs,
        relPrefix: '../../../_images',
      }, 'host'));
      await writeAtomic(path.join(subDir, `${subFilePrefix}.host.css`), subHostLines.join('\n'));
      await writeAtomic(path.join(subDir, `${subFilePrefix}.light.css`), lightDomLines(subClass).join('\n'));
    }
  }

  /** End-of-run summary of name warnings collected across all components. */
  async finalize(): Promise<void> {
    reportNameWarnings('css');
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
function isGlyphLike(elemType: string | undefined): boolean {
  return elemType === 'glyph' || elemType === 'vector';
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

/**
 * The disabled selector that can actually match, for this target and this root.
 *
 * `CONCEPT_TABLE` pairs `:disabled` with `[aria-disabled="true"]` because either
 * may carry the state. Emitting both everywhere produces selectors that can never
 * match: a role emitting a native control sets the real `disabled` property and
 * never the ARIA string, and a custom element host can never match `:disabled` at
 * all — that requires form association.
 */
function disabledSelectorFor(rootAs: RootForm, rootRole: string | undefined): string {
  // A shadow host is not a form control, so `:disabled` cannot match it.
  if (rootAs === 'host') return '[aria-disabled="true"]';
  // An anchor has no `disabled` property either — a disabled link is expressed by
  // dropping `href` and announcing `aria-disabled`, so `:disabled` never matches.
  if (rootRole === 'link') return '[aria-disabled="true"]';
  const native = rootRole ? NATIVE_DISABLED_ROLES.has(rootRole) : false;
  return native ? ':disabled' : ':disabled, [aria-disabled="true"]';
}

/** Roles whose emitted element carries a real `disabled` property. */
const NATIVE_DISABLED_ROLES = new Set(['button', 'togglebutton', 'disclosure']);

/** api.yaml props, keyed by prop name. */
function apiPropsOf(apiYaml: Record<string, unknown>): Record<string, Record<string, unknown>> {
  return (apiYaml.props ?? {}) as Record<string, Record<string, unknown>>;
}

/** api.yaml anatomy → element key → behavior role (ADR-067), where one is annotated. */
function anatomyRoles(apiYaml: Record<string, unknown>): Record<string, string> {
  const anatomy = (apiYaml.anatomy ?? {}) as Record<string, Record<string, unknown>>;
  const roles: Record<string, string> = {};
  for (const [key, entry] of Object.entries(anatomy)) {
    if (entry && typeof entry.role === 'string') roles[key] = entry.role;
  }
  return roles;
}

/**
 * Roles whose emitted element carries user-agent styling a `div` never had.
 *
 * Swapping the tag inherits the UA's own border, background, font and padding,
 * which the spec's declarations were authored without. The most visible symptom
 * is a size change between states: a state block that sets `border-width`
 * suppresses the UA border, and the state that does not set one keeps it, so the
 * control changes size when it changes state.
 */
const UA_STYLED_ROLES = new Set(['button', 'togglebutton', 'link']);

/** Neutralize the emitted element's UA styling so the spec's declarations govern. */
function uaResetDecls(role: string): string[] {
  const decls = [
    'appearance: none',
    '-webkit-appearance: none',
    'background: none',
    'border: 0',
    'margin: 0',
    'padding: 0',
    'font: inherit',
    'color: inherit',
    'text-align: inherit',
  ];
  // An anchor is not a button: it carries link decoration rather than a border.
  if (role === 'link') decls.push('text-decoration: none');
  return decls;
}

/**
 * Whether this component declares the prop a state concept is classified to.
 *
 * Deterministic in two steps, both over declared data: the workspace's `states`
 * config names the prop (and optionally the enum value) that carries the concept,
 * and the component's own props either declare that prop or do not. Where the
 * classification names a value, the prop's enum must actually offer it — a
 * mapping pointing at a value no variant produces is dead and must not count.
 * Value comparison is case-insensitive, matching how the state lookup resolves.
 */
function declaresState(
  context: TransformerContext,
  apiProps: Record<string, Record<string, unknown>>,
  concept: string,
): boolean {
  const entry = (context.processingStates ?? {})[concept];
  if (!entry?.prop) return false;
  const prop = apiProps[entry.prop];
  if (!prop) return false;
  if (entry.value == null) return true;
  const values = Array.isArray(prop.enum) ? (prop.enum as unknown[]) : null;
  if (!values) return true; // a boolean prop carries no enum to check
  return values.some(v => String(v).toLowerCase() === String(entry.value).toLowerCase());
}

function buildCssLines(
  componentClass: string,
  variantsYaml: Record<string, unknown>,
  tokensFormat: string | undefined,
  context: TransformerContext,
  elemTypes: Record<string, string> = {},
  images?: ImagesCssContext,
  rootAs: RootForm = 'class',
  elemRoles: Record<string, string> = {},
  apiProps: Record<string, Record<string, unknown>> = {},
): string[] {
  /**
   * The root's selector, in the form this stylesheet is written for.
   *
   * `class` targets the root element by its block class, which is what a React
   * scaffold renders. `host` targets `:host` — the custom element itself is the
   * root, so its qualifiers go inside the functional form
   * (`:host([data-size="L"]:hover)`) rather than being appended. Element rules
   * match inside the shadow tree and are identical in both forms.
   */
  const rootSel = (qualifiers = ''): string =>
    rootAs === 'host'
      ? (qualifiers ? `:host(${qualifiers})` : ':host')
      : `.${componentClass}${qualifiers}`;
  // Apply configured rules as pre-passes on the structured variants data
  const ruleNames = (context.transformerOptions?.rules as string[] | undefined) ?? [];
  const rules = resolveRules(ruleNames);
  for (const rule of rules) {
    variantsYaml = rule.apply(variantsYaml, { tokensFormat });
  }

  const lines: string[] = [
    '/* Generated. Do not edit — regenerate with `specs transform`. */',
    '',
    // Everything generated sits in one cascade layer, so an unlayered consumer
    // rule beats it regardless of specificity. Without this a consumer retheming
    // a state has to match selectors like
    // `.x[data-appearance="outline"]:hover:not(:disabled) .x__label` exactly, for
    // every state, in the right order — a specificity race the generator wins by
    // accident of how many guards it emitted.
    '@layer specs {',
    '',
    // A Figma frame's width and height INCLUDE its padding; the CSS default,
    // content-box, excludes it. Without this, every element carrying both a
    // fixed dimension and padding renders larger than the spec by exactly its
    // padding — a 24px frame with 4px padding measures 32px.
    `${rootSel()}, ${rootSel()} * {`,
    '  box-sizing: border-box;',
    '}',
    '',
  ];

  // A role may have replaced the root's tag with an interactive element (ADR-067).
  // Reset the UA styling that tag brings before any spec declaration lands, so the
  // spec still fully describes the appearance and states cannot differ in size for
  // reasons the design never expressed.
  const rootRole = elemRoles.root;
  if (rootRole && UA_STYLED_ROLES.has(rootRole)) {
    if (rootAs === 'host') {
      // The shadow root renders a real interactive element wrapping the root's
      // content, so the platform supplies keyboard activation and `disabled`.
      // It is styled to nothing and takes no box: the host keeps the root's
      // layout and appearance exactly as the rules below describe them.
      lines.push(
        `/* ${rootRole} role: the inner semantic element carries behavior, not appearance. */`,
        '[part="button"] {',
        ...uaResetDecls(rootRole).map(d => `  ${d};`),
        '  display: contents;',
        '}',
        '',
      );
    } else {
      lines.push(
        `/* ${rootRole} role: neutralize user-agent styling for the emitted element. */`,
        `${rootSel()} {`,
        ...uaResetDecls(rootRole).map(d => `  ${d};`),
        '}',
        '',
      );
    }
  }

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
  // Elements whose strokes are a gradient in any layer paint via border-image;
  // solid stroke overrides on those elements must reset it or the earlier
  // variant's border-image outranks the later border-color (see styleToCSS).
  const gradientStrokeKeys = new Set<string>();
  for (const elements of [defaultElements, ...variantList.map(v => (v.elements ?? {}) as Record<string, Record<string, unknown>>)]) {
    for (const [k, elem] of Object.entries(elements)) {
      if (isGradient(((elem.styles ?? {}) as Record<string, unknown>).strokes)) gradientStrokeKeys.add(k);
    }
  }
  const styleOptions = (elemKey: string) => ({
    inferAbsolute: inferAbsolute(elemKey),
    resetBorderImage: gradientStrokeKeys.has(elemKey),
  });

  for (const [elemKey, elem] of Object.entries(defaultElements)) {
    const selector = elemKey === 'root' ? rootSel() : elemSelector(componentClass, elemKey);
    const styles = (elem.styles ?? {}) as Record<string, unknown>;
    const decls = [
      ...layoutToCSS(styles, tokensFormat, parentLayoutMode(elemKey)),
      ...styleToCSS(styles, tokensFormat, elemTypes[elemKey], styleOptions(elemKey)),
    ];
    if ('backgroundImage' in styles) decls.push(...backgroundImageDecls(styles.backgroundImage, images));

    // Ellipses are circular unless the spec sets an explicit radius.
    if (elemTypes[elemKey] === 'ellipse' && !decls.some(d => d.startsWith('border-radius:'))) {
      decls.push('border-radius: 50%');
    }
    // Glyphs/vectors paint their background-color through a mask image the
    // scaffold provides via --glyph (an unresolvable mask renders nothing).
    // Spans need block display; without a fill they tint with the inherited
    // text color.
    //
    // Element type decides this, and nothing else. An `instance` delegates its
    // appearance to the component it instantiates — that component masks its own
    // glyph in its own stylesheet — so a wrapper holding an instance draws
    // nothing and must not be given a mask. An earlier version also treated an
    // instance carrying a `name` propConfiguration as glyph-like, which inferred
    // meaning from a prop name and painted a solid `currentColor` box wherever
    // composition resolved the instance instead.
    if (isGlyphLike(elemTypes[elemKey])) {
      decls.push('mask: var(--glyph, none) no-repeat center / contain');
      decls.push('-webkit-mask: var(--glyph, none) no-repeat center / contain');
      if (!decls.some(d => d.startsWith('display:'))) decls.push('display: block');
      if (!decls.some(d => d.startsWith('background'))) decls.push('background-color: currentColor');
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
    lines.push(...overlapRule(selector, styles));

    // An unfilled slot is still a flex item, so the parent's gap paints as
    // spacing around nothing. `:empty` covers the react scaffold, which renders
    // the slot's children directly; the webcomponents scaffold always holds a
    // `<slot>` element and so is never `:empty`, and sets data-empty instead.
    if (elemTypes[elemKey] === 'slot') {
      lines.push(`${selector}:empty,`);
      lines.push(`${selector}[data-empty] {`);
      lines.push('  display: none;');
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

  // A concept's selector, narrowed to what can actually match this target and
  // this root. Only `disabled` differs; every other concept is target-neutral.
  const selectorFor = (concept: string): string | undefined =>
    concept === 'disabled'
      ? disabledSelectorFor(rootAs, elemRoles.root)
      : CONCEPT_TABLE[concept]?.selector;

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
        // A classified boolean's FALSE value has no concept of its own — it is
        // the NEGATION of the true concept. Without this the whole variant is
        // dropped as base/rest state, so an unselected/unchecked variant (and
        // every hover/pressed pairing with it) emits no rule at all.
        let negated: string | undefined;
        if (!concept && v === false) {
          const trueConcept = stateLookup.get(`${k}::true`);
          const trueSel = trueConcept ? selectorFor(trueConcept) : undefined;
          // Negating a multi-part concept is an AND of nots, not a cartesian
          // expansion: `:disabled, [aria-disabled="true"]` becomes
          // `:not(:disabled):not([aria-disabled="true"])`.
          if (trueSel) negated = trueSel.split(',').map(part => `:not(${part.trim()})`).join('');
        }
        if (!concept && !negated) { skip = true; break; } // unmatched value = base/rest state
        const sel = negated ?? (concept ? selectorFor(concept) : undefined) ?? `[data-${toKebab(k)}="${normalizeEnumValue(vStr)}"]`;
        const parts = negated ? [negated] : sel.split(',').map(s => s.trim());
        const expanded: string[] = [];
        for (const existing of stateSelSuffixes) {
          for (const part of parts) expanded.push(existing + part);
        }
        stateSelSuffixes = expanded;
      } else {
        // Scaffolds emit booleans as presence: the attribute is set to "" when
        // true and omitted when false — never written as "false". So a false
        // variant is the ABSENCE of the attribute; `[data-x="false"]` would
        // match nothing and the variant's styling would never apply.
        dataAttrs.push(
          v === true ? `[data-${toKebab(k)}]`
            : v === false ? `:not([data-${toKebab(k)}])`
              : `[data-${toKebab(k)}="${normalizeEnumValue(vStr)}"]`
        );
      }
    }
    if (skip) continue;

    // Guard :hover and :active against firing when disabled, if disabled is configured
    if (context.processingStates?.['disabled']) {
      const disabledSel = selectorFor('disabled') ?? ':disabled';
      const notGuard = disabledSel.split(',').map(s => `:not(${s.trim()})`).join('');
      stateSelSuffixes = stateSelSuffixes.map(s =>
        (s.includes(':hover') || s.includes(':active')) ? s + notGuard : s
      );
    }

    const dataAttrStr = dataAttrs.join('');
    const rootSelectors = stateSelSuffixes.map(s => rootSel(`${dataAttrStr}${s}`));

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

    // A variant layout that reverses a flex parent's children is a visual swap,
    // not a structural one — emit the reversal here so the scaffold keeps one
    // copy of each child and DOM order (reading and tab order) stays as
    // authored. Partial reorders are not expressible this way and are handled
    // by the emitters relocating the element instead.
    const reverseDecls = new Map<string, string>();
    if (variant.layout) {
      const defOrder = childOrder(parseLayout(defaultBlock?.layout));
      const varOrder = childOrder(parseLayout(variant.layout));
      for (const [parent, vlist] of varOrder) {
        if (parent === null) continue;
        const dlist = defOrder.get(parent);
        if (!dlist || dlist.length < 2 || dlist.length !== vlist.length) continue;
        if (vlist.join('\u0000') !== [...dlist].reverse().join('\u0000')) continue;
        const mode = ((defaultElements[parent]?.styles ?? {}) as Record<string, unknown>).layoutMode;
        if (mode === 'HORIZONTAL') reverseDecls.set(parent, 'flex-direction: row-reverse');
        else if (mode === 'VERTICAL') reverseDecls.set(parent, 'flex-direction: column-reverse');
      }
    }

    const elemKeys = new Set([...Object.keys(variantElements), ...displayDecls.keys(), ...reverseDecls.keys()]);
    for (const elemKey of elemKeys) {
      const elemSuffix = elemKey === 'root' ? '' : ` ${elemSelector(componentClass, elemKey)}`;
      const selector = rootSelectors.map(s => `${s}${elemSuffix}`).join(',\n');

      const styles = (variantElements[elemKey]?.styles ?? {}) as Record<string, unknown>;
      const decls = [
        ...layoutToCSS(styles, tokensFormat, parentLayoutMode(elemKey)),
        ...styleToCSS(styles, tokensFormat, elemTypes[elemKey], styleOptions(elemKey)),
      ];
      if ('backgroundImage' in styles) decls.push(...backgroundImageDecls(styles.backgroundImage, images));
      const display = displayDecls.get(elemKey);
      if (display && !decls.some(d => d.startsWith('display:'))) decls.push(display);
      const reverse = reverseDecls.get(elemKey);
      if (reverse && !decls.some(d => d.startsWith('flex-direction:'))) decls.push(reverse);

      if (decls.length > 0) {
        lines.push(`${selector} {`);
        for (const d of decls) lines.push(`  ${d};`);
        lines.push('}');
        lines.push('');
      }
      lines.push(...overlapRule(selector, styles));
    }
  }

  // Cursor is an affordance CSS needs and Figma has no concept of. It is read
  // from the declared state classification: a component whose `states` config
  // names a press concept, and which declares the prop that concept is keyed to,
  // is a press target.
  //
  // An earlier version regexed this stylesheet's own emitted text for `:active`
  // and `[aria-pressed]`. That made the cursor depend on whether a pressed state
  // happened to produce any *styling* — a button that looks identical pressed and
  // unpressed silently lost its pointer — and it inferred behavior from output
  // rather than reading what the library declared.
  if (declaresState(context, apiProps, 'active') || declaresState(context, apiProps, 'pressed')) {
    lines.push(`${rootSel()} {`, '  cursor: pointer;', '}', '');
  }
  if (declaresState(context, apiProps, 'disabled')) {
    const disabledSel = disabledSelectorFor(rootAs, elemRoles.root);
    lines.push(
      disabledSel.split(',').map(part => rootSel(part.trim())).join(',\n') + ' {',
      '  cursor: not-allowed;',
      '}',
      '',
    );
  }

  lines.push('}');
  lines.push('');
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

/**
 * Overlapping children: Figma expresses overlap as a NEGATIVE itemSpacing,
 * which `gap` cannot represent. CSS does it with a negative margin on every
 * child after the first, along the parent's main axis.
 */
function overlapRule(selector: string, styles: Record<string, unknown>): string[] {
  const v = styles.itemSpacing;
  if (typeof v !== 'number' || v >= 0) return [];
  const prop = styles.layoutMode === 'VERTICAL' ? 'margin-block-start' : 'margin-inline-start';
  // This reaches the react scaffold's children directly. The webcomponents
  // scaffold projects slot content through a holder, and ::slotted() cannot
  // style a slotted node's descendants — so composed example content carries
  // the same margin inline instead (see composeSlotHtml).
  return [`${selector} > * + * {`, `  ${prop}: ${v}px;`, '}', ''];
}

/** Parent key → ordered child keys, for every parent in a layout tree. */
function childOrder(nodes: LayoutNode[], parent: string | null = null, out?: Map<string | null, string[]>): Map<string | null, string[]> {
  const map = out ?? new Map<string | null, string[]>();
  for (const n of nodes) {
    const list = map.get(parent) ?? [];
    list.push(n.key);
    map.set(parent, list);
    childOrder(n.children, n.key, map);
  }
  return map;
}
