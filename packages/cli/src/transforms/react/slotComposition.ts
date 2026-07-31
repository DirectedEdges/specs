// Slot-content composition from examples.yaml.
//
// variants.yaml binds slot elements to examples:
//   children:
//     $binding: "#/props/children"
//     examples:
//       - $slotContent: "#/components/<comp>/slotContentExamples/<id>"
//
// examples.yaml holds the referenced blocks: { anatomy, elements (instanceOf +
// propConfigurations), layout (ordered element keys, repeats allowed) }.
// This module resolves those refs and emits JSX that composes the instanced
// subcomponents/sibling components, recursively following nested $slotContent
// refs inside propConfigurations.

import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import { kebabizePath, isTokenRef } from '../css/values.js';

/** Layout entries are element names, or { name: [childEntries] } for nesting. */
export type SlotLayoutEntry = string | Record<string, SlotLayoutEntry[]>;

export interface SlotExample {
  anatomy?: Record<string, Record<string, unknown>>;
  elements: Record<string, Record<string, unknown>>;
  layout: SlotLayoutEntry[];
}

/** ADR-063 images registry entry: src when resolved, Figma identity always. */
export interface ImageEntry {
  src?: string;
  $extensions?: { 'com.figma'?: { imageHash?: string } };
}

export interface ExamplesData {
  main: Record<string, SlotExample>;
  subs: Record<string, Record<string, SlotExample>>;
  /** Component images registry (ADR-063), keyed by image id. */
  images: Record<string, ImageEntry>;
}

/** URL base where the workspace's emitted image assets are served (storybook staticDirs). */
export const IMAGE_BASE = '/assets/images';

/** Parse <componentDir>/examples.yaml, if present. */
export function loadExamples(componentDir: string): ExamplesData | undefined {
  const p = path.join(componentDir, 'examples.yaml');
  if (!fs.existsSync(p)) return undefined;
  const parsed = yaml.parse(fs.readFileSync(p, 'utf-8')) as Record<string, unknown> | null;
  if (!parsed) return undefined;
  const main = (parsed.slotContentExamples ?? {}) as Record<string, SlotExample>;
  const images = (parsed.images ?? {}) as Record<string, ImageEntry>;
  const subs: ExamplesData['subs'] = {};
  const subBlocks = (parsed.subcomponents ?? {}) as Record<string, Record<string, unknown>>;
  for (const [k, block] of Object.entries(subBlocks)) {
    subs[k] = (block.slotContentExamples ?? {}) as Record<string, SlotExample>;
    Object.assign(images, (block.images ?? {}) as Record<string, ImageEntry>);
  }
  return { main, subs, images };
}

/**
 * Resolve a `$image` ref ("#/components/<c>/images/<id>") to a web URL under
 * IMAGE_BASE. Uses the registry entry's `src` when resolved; otherwise falls
 * back to the emitted asset convention — a `_images/<imageHash>.<ext>` file
 * beside the component directories.
 */
export function resolveImageUrl(ref: string, ctx: ComposeContext): string | undefined {
  const id = ref.match(/#\/components\/[^/]+\/images\/(.+)$/)?.[1];
  if (!id) return undefined;
  const entry = ctx.examples.images[id];
  if (!entry) return undefined;
  if (typeof entry.src === 'string') {
    // Emitted asset paths are workspace-relative; serve by basename under IMAGE_BASE.
    if (/^(data:|https?:)/.test(entry.src)) return entry.src;
    return `${IMAGE_BASE}/${path.basename(entry.src)}`;
  }
  const hash = entry.$extensions?.['com.figma']?.imageHash;
  if (!hash) return undefined;
  const imagesDir = path.join(ctx.componentDirAbs, '..', '_images');
  try {
    const file = fs.readdirSync(imagesDir).find(f => f.startsWith(hash));
    return file ? `${IMAGE_BASE}/${file}` : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Resolve a $slotContent ref:
 *   #/components/<comp>/slotContentExamples/<id>
 *   #/components/<comp>/subcomponents/<sub>/slotContentExamples/<id>
 */
export function resolveSlotRef(ref: string, examples: ExamplesData): SlotExample | undefined {
  const subMatch = ref.match(/#\/components\/[^/]+\/subcomponents\/([^/]+)\/slotContentExamples\/(.+)$/);
  if (subMatch) return examples.subs[subMatch[1]]?.[subMatch[2]];
  const mainMatch = ref.match(/#\/components\/[^/]+\/slotContentExamples\/(.+)$/);
  if (mainMatch) return examples.main[mainMatch[1]];
  return undefined;
}

/** Extract the first $slotContent ref from a slot element's binding block. */
export function slotExampleRef(elem: Record<string, unknown> | undefined): string | undefined {
  const children = elem?.children as Record<string, unknown> | undefined;
  const examples = children?.examples;
  if (!Array.isArray(examples)) return undefined;
  for (const entry of examples) {
    if (entry && typeof entry === 'object' && typeof (entry as Record<string, unknown>).$slotContent === 'string') {
      return (entry as Record<string, unknown>).$slotContent as string;
    }
  }
  return undefined;
}

export interface ComposeContext {
  /** Top-level component key (e.g. deActionList). */
  componentKey: string;
  /** Subcomponent keys of the top-level component. */
  subKeys: string[];
  /** Relative path from the emitting file's directory to the component root. */
  upToComponentRoot: string;
  /** Relative path from the emitting file's directory to the specs root (siblings). */
  upToSpecsRoot: string;
  /** Absolute path of the top-level component directory (sibling existence checks). */
  componentDirAbs: string;
  examples: ExamplesData;
  /**
   * Known prop names per import name (subcomponents of the current component).
   * When present for a target, unknown propConfigurations keys are dropped so
   * generated JSX type-checks against the target's contract (e.g. state-machine
   * props the contract omits).
   */
  targetProps?: Map<string, Set<string>>;
  /**
   * Browser-state props omitted from EVERY contract (config.processing.states
   * is global) — always stripped from composed props, even for targets whose
   * contracts aren't known (sibling components).
   */
  omittedProps?: Set<string>;
}

export interface ComposedJsx {
  lines: string[];
  /** import name → module path */
  imports: Map<string, string>;
}

const GLYPH_BASE = '/assets/icons';

/** Compose a slot example into JSX lines (one per layout entry, recursive). */
export function composeSlotJsx(example: SlotExample, ctx: ComposeContext, indent: string): ComposedJsx {
  const imports = new Map<string, string>();
  const lines: string[] = [];
  for (const entry of example.layout ?? []) {
    lines.push(...renderEntry(entry, example, ctx, indent, imports));
  }
  return { lines, imports };
}

function renderEntry(
  entry: SlotLayoutEntry,
  example: SlotExample,
  ctx: ComposeContext,
  indent: string,
  imports: Map<string, string>,
): string[] {
  const [key, childEntries] =
    typeof entry === 'string' ? [entry, [] as SlotLayoutEntry[]] : (Object.entries(entry)[0] ?? ['', []]);
  const elem = (example.elements?.[key] ?? {}) as Record<string, unknown>;
  const styles = (elem.styles ?? {}) as Record<string, unknown>;
  if (styles.visible === false) return [];

  const instanceOf = elem.instanceOf;
  const pc = (elem.propConfigurations ?? {}) as Record<string, unknown>;
  const target = resolveInstanceTarget(instanceOf, ctx);

  if (target) {
    imports.set(target.name, target.importPath);
    const known = ctx.targetProps?.get(target.name);
    const { attrs, childBlocks } = propsToJsx(pc, ctx, indent, imports, known);
    if (childBlocks.length === 0) {
      return [`${indent}<${target.name}${attrs} />`];
    }
    return [`${indent}<${target.name}${attrs}>`, ...childBlocks, `${indent}</${target.name}>`];
  }

  // Icon-wrapper fallback: unresolvable instance with a name propConfiguration
  // renders as a self-contained masked span (no external CSS dependency).
  if (typeof pc.name === 'string') {
    const sizeMatch = typeof pc.size === 'string' ? pc.size.match(/^(\d+)x(\d+)$/) : null;
    const w = typeof styles.width === 'number' ? styles.width : sizeMatch ? Number(sizeMatch[1]) : 16;
    const h = typeof styles.height === 'number' ? styles.height : sizeMatch ? Number(sizeMatch[2]) : 16;
    const slug = pc.name
      .trim()
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .toLowerCase();
    const mask = `url('${GLYPH_BASE}/${slug}.svg') no-repeat center / contain`;
    return [
      `${indent}<span data-element="${key}" aria-hidden="true" style={{ display: 'inline-block', width: ${w}, height: ${h}, backgroundColor: 'currentColor', WebkitMask: "${mask}", mask: "${mask}" }} />`,
    ];
  }

  // Raw element (no instanceOf): a plain container/text node from the example
  // fill. Containers become flex divs; text leaves carry their content string.
  // Minimal inline styling — enough shape and typography to read correctly.
  if (instanceOf === null || instanceOf === undefined) {
    const anatomyType = (example.anatomy?.[key]?.type as string | undefined) ?? (typeof elem.content === 'string' ? 'text' : 'container');
    const styleSrc = rawElementStyle(styles, anatomyType);
    const styleAttr = styleSrc ? ` style={${styleSrc}}` : '';
    const idAttr = ` data-element="${key}"`;
    if (anatomyType === 'text') {
      const content = typeof elem.content === 'string' ? elem.content : '';
      return [`${indent}<span${idAttr}${styleAttr}>${escapeJsxText(content)}</span>`];
    }
    const children = childEntries.flatMap(c => renderEntry(c, example, ctx, `${indent}  `, imports));
    if (children.length === 0) return [`${indent}<div${idAttr}${styleAttr} />`];
    return [`${indent}<div${idAttr}${styleAttr}>`, ...children, `${indent}</div>`];
  }

  const label = typeof instanceOf === 'string' ? instanceOf : JSON.stringify(instanceOf);
  return [`${indent}{/* instance: ${label} — no generated component found */}`];
}

/** Inline style source for a raw example element (subset: flex, gap, color, font). */
function rawElementStyle(styles: Record<string, unknown>, anatomyType: string): string | undefined {
  const entries: string[] = [];
  const tokenVar = (v: unknown): string | undefined =>
    isTokenRef(v) ? `var(--${kebabizePath((v as { $token: string }).$token)})` : undefined;

  if (anatomyType !== 'text') {
    const mode = styles.layoutMode;
    if (mode === 'VERTICAL' || mode === 'HORIZONTAL') {
      entries.push(`display: 'flex'`, `flexDirection: '${mode === 'VERTICAL' ? 'column' : 'row'}'`);
    }
    const gapVar = tokenVar(styles.itemSpacing);
    if (gapVar) entries.push(`gap: '${gapVar}'`);
    else if (typeof styles.itemSpacing === 'number') entries.push(`gap: ${styles.itemSpacing}`);
    if (styles.layoutSizingHorizontal === 'FILL') entries.push(`alignSelf: 'stretch'`);
  }
  const colorVar = tokenVar(styles.textColor);
  if (colorVar) entries.push(`color: '${colorVar}'`);
  const fontVar = tokenVar(styles.typography);
  if (fontVar) entries.push(`font: '${fontVar}'`);
  return entries.length ? `{ ${entries.join(', ')} }` : undefined;
}

function escapeJsxText(text: string): string {
  return text.replace(/[{}<>]/g, c => `{'${c}'}`);
}

export interface InstanceTarget { name: string; importPath: string }

export function resolveInstanceTarget(instanceOf: unknown, ctx: ComposeContext): InstanceTarget | undefined {
  // { $ref: '#/subcomponents/<k>' }
  if (instanceOf && typeof instanceOf === 'object') {
    const ref = (instanceOf as Record<string, unknown>).$ref;
    if (typeof ref === 'string') {
      const k = ref.replace(/^#\/subcomponents\//, '');
      if (ctx.subKeys.includes(k)) return subTarget(k, ctx);
    }
    return undefined;
  }
  if (typeof instanceOf !== 'string') return undefined;

  // Subcomponent by naming convention: <componentKey><PascalSubKey>
  for (const k of ctx.subKeys) {
    if (instanceOf.toLowerCase() === `${ctx.componentKey}${k}`.toLowerCase()) return subTarget(k, ctx);
  }
  // Sibling generated component: specs/<instanceOf>/ exists
  const siblingDir = path.join(ctx.componentDirAbs, '..', instanceOf);
  if (fs.existsSync(path.join(siblingDir, 'src', 'react'))) {
    const name = toPascalCase(instanceOf);
    return { name, importPath: `${ctx.upToSpecsRoot}/${instanceOf}/src/react/${name}` };
  }
  return undefined;
}

function subTarget(subKey: string, ctx: ComposeContext): InstanceTarget {
  const name = toPascalCase(subKey);
  return { name, importPath: `${ctx.upToComponentRoot}/${subKey}/src/react/${name}` };
}

/** propConfigurations → JSX attribute string + child blocks for `children` slot content. */
function propsToJsx(
  pc: Record<string, unknown>,
  ctx: ComposeContext,
  indent: string,
  imports: Map<string, string>,
  knownProps?: Set<string>,
): { attrs: string; childBlocks: string[] } {
  const parts: string[] = [];
  const childBlocks: string[] = [];
  for (const [key, value] of Object.entries(pc)) {
    if (!/^[A-Za-z_$][\w$]*$/.test(key)) continue;
    if (ctx.omittedProps?.has(key)) continue; // browser-state props never surface
    if (knownProps && !knownProps.has(key)) continue;
    if (value === null || value === undefined) continue;
    if (typeof value === 'object') {
      const ref = (value as Record<string, unknown>).$slotContent;
      if (typeof ref === 'string') {
        const nested = resolveSlotRef(ref, ctx.examples);
        if (nested) {
          const composed = composeSlotJsx(nested, ctx, `${indent}    `);
          for (const [n, p] of composed.imports) imports.set(n, p);
          if (key === 'children') {
            childBlocks.push(...composed.lines);
          } else {
            parts.push(`${key}={<>\n${composed.lines.join('\n')}\n${indent}  </>}`);
          }
        }
      }
      continue; // other object shapes ($binding etc.) are not renderable in examples
    }
    if (typeof value === 'string') parts.push(`${key}=${JSON.stringify(value)}`);
    else if (typeof value === 'boolean') parts.push(value ? `${key}` : `${key}={false}`);
    else if (typeof value === 'number') parts.push(`${key}={${value}}`);
  }
  return { attrs: parts.length ? ' ' + parts.join(' ') : '', childBlocks };
}

/**
 * propConfigurations → a JS object-literal source string for spreading onto a
 * nested component ({ a: 1, b: "x", items: (<>…</>) }). Values may be
 * primitives, prop bindings (rendered against `bindingVar`), or nested
 * $slotContent refs (composed recursively). Returns undefined when empty.
 */
export function propsObjectSource(
  pc: Record<string, unknown>,
  ctx: ComposeContext,
  imports: Map<string, string>,
  knownProps?: Set<string>,
  bindingVar = 'p',
): string | undefined {
  const entries: string[] = [];
  for (const [key, value] of Object.entries(pc)) {
    if (!/^[A-Za-z_$][\w$]*$/.test(key)) continue;
    if (ctx.omittedProps?.has(key)) continue; // browser-state props never surface
    if (knownProps && !knownProps.has(key)) continue;
    if (value === null || value === undefined) continue;
    if (typeof value === 'object') {
      const o = value as Record<string, unknown>;
      if (typeof o.$slotContent === 'string') {
        const nested = resolveSlotRef(o.$slotContent, ctx.examples);
        if (nested) {
          const composed = composeSlotJsx(nested, ctx, '        ');
          for (const [n, p] of composed.imports) imports.set(n, p);
          entries.push(`${key}: (<>\n${composed.lines.join('\n')}\n      </>)`);
        }
      } else if (typeof o.$binding === 'string') {
        const m = o.$binding.match(/^#\/props\/(.+)$/);
        if (m && /^[A-Za-z_$][\w$]*$/.test(m[1])) {
          // ImageBinding (ADR-063): a bound prop carrying an authoring-default
          // image example — the example is the fallback when the prop is unset.
          const imageExample = Array.isArray(o.examples)
            ? (o.examples as Array<Record<string, unknown>>).find(e => typeof e?.$image === 'string')
            : undefined;
          const fallback = imageExample ? resolveImageUrl(imageExample.$image as string, ctx) : undefined;
          entries.push(
            fallback
              ? `${key}: ${bindingVar}.${m[1]} ?? ${JSON.stringify(fallback)}`
              : `${key}: ${bindingVar}.${m[1]}`,
          );
        }
      } else if (typeof o.$image === 'string') {
        // Static image value — resolve to a served asset URL.
        const url = resolveImageUrl(o.$image, ctx);
        if (url) entries.push(`${key}: ${JSON.stringify(url)}`);
      }
      continue;
    }
    entries.push(`${key}: ${JSON.stringify(value)}`);
  }
  return entries.length ? `{ ${entries.join(', ')} }` : undefined;
}

function toPascalCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
