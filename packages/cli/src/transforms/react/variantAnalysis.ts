import { buildStateLookup, buildOmittedProps, type ProcessingStates } from '../states.js';

/**
 * Shared analysis of api.yaml + variants.yaml used by the contract (slots),
 * react, and stories transformers.
 *
 * Terminology:
 * - "slot" — a consumer-facing content injection point: anatomy elements typed
 *   `slot` (arbitrary children) or `text` with a content binding (string).
 *   Instance-typed elements are NOT slots yet (deferred — see plan 010).
 * - "structural presence" — an element absent from the default layout that one
 *   or more variant layouts add. Its rendering condition is inferred from the
 *   variant configurations that include it.
 */

export type SlotRule =
  | { kind: 'always' }
  | { kind: 'whenTrue'; prop: string }
  | { kind: 'whenNotNull'; prop: string }
  | { kind: 'whenValue'; prop: string; value: string };

export interface SlotInfo {
  elementKey: string;
  /** `slot` → unknown/ReactNode content; `text` → string content. */
  slotType: 'slot' | 'text';
  /** The prop the slot's content binds to (e.g. `children`, `label`). */
  prop?: string;
  rule: SlotRule;
  /** Set when inference was ambiguous and the rule fell back to `always`. */
  warning?: string;
}

export interface LayoutNode {
  key: string;
  children: LayoutNode[];
  /**
   * Render condition inferred from variant configurations (state-classified
   * props stripped). Empty array → render always. Each entry is a
   * conjunction (prop → value); entries are OR'd together.
   */
  conditions?: Array<Record<string, unknown>>;
}

export interface VariantAnalysis {
  slots: SlotInfo[];
  /** Merged layout tree: default layout + variant-added elements with conditions. */
  layout: LayoutNode[];
  /** Per-element visibility rule (every element with a styles.visible binding). */
  visibility: Map<string, SlotRule>;
  /** Non-state props that appear in variant configurations → rendered as data attributes. */
  dataAttrProps: string[];
  /** Variant entries whose configurations are expressible as Props (no omitted state props). */
  propVariants: Array<{ configuration: Record<string, unknown> }>;
}

interface RawVariant {
  configuration?: Record<string, unknown>;
  layout?: unknown;
  elements?: Record<string, Record<string, unknown>>;
}

export function analyzeVariants(
  apiYaml: Record<string, unknown>,
  variantsYaml: Record<string, unknown>,
  processingStates: ProcessingStates,
): VariantAnalysis {
  const anatomy = (apiYaml.anatomy ?? {}) as Record<string, Record<string, unknown>>;
  const props = (apiYaml.props ?? {}) as Record<string, unknown>;
  const defaultBlock = (variantsYaml.default ?? {}) as Record<string, unknown>;
  const defaultElements = (defaultBlock.elements ?? {}) as Record<string, Record<string, unknown>>;
  const variants = (variantsYaml.variants ?? []) as RawVariant[];
  const { classifiedProps } = buildStateLookup(processingStates);
  // Omitted props are browser-driven (hover, pressed, …) — not in Props, so
  // not usable in render conditions or story args. Classified-but-kept props
  // (disabled, selected, …) stay in Props; they're styled via aria selectors
  // rather than data attributes.
  const omittedProps = buildOmittedProps(processingStates);

  const defaultLayout = parseLayout(defaultBlock.layout);
  const defaultKeys = new Set<string>();
  collectKeys(defaultLayout, defaultKeys);

  // ── Visibility rules from styles.visible bindings ──────────────────────────
  const visibility = new Map<string, SlotRule>();
  for (const [elemKey, elem] of Object.entries(defaultElements)) {
    const styles = (elem.styles ?? {}) as Record<string, unknown>;
    const rule = visibleToRule(styles.visible, props);
    if (rule) visibility.set(elemKey, rule);
  }

  // ── Structural presence: elements added by variant layouts ────────────────
  // For each element not in the default layout, collect the configurations of
  // variants whose layout includes it (state-classified props stripped — the
  // browser drives those, not the application).
  const added = new Map<string, { conditions: Array<Record<string, unknown>>; parent: string | null; index: number }>();
  for (const variant of variants) {
    if (!variant.layout) continue;
    const config = stripStateProps(variant.configuration ?? {}, omittedProps);
    const tree = parseLayout(variant.layout);
    walkWithParent(tree, null, (node, parent, index) => {
      if (defaultKeys.has(node.key)) return;
      const entry = added.get(node.key);
      if (entry) {
        entry.conditions.push(config);
      } else {
        added.set(node.key, { conditions: [config], parent, index });
      }
    });
  }

  // ── Merged layout: default + added elements with inferred conditions ──────
  const layout = cloneLayout(defaultLayout);
  for (const [key, info] of added) {
    // An empty condition means a state-only variant adds the element — the
    // application can't gate it, so it renders unconditionally.
    const conditions = info.conditions.some(c => Object.keys(c).length === 0)
      ? []
      : dedupeConditions(info.conditions);
    const node: LayoutNode = { key, children: [], conditions };
    insertIntoLayout(layout, node, info.parent, info.index);
  }

  // ── Slots ──────────────────────────────────────────────────────────────────
  const slots: SlotInfo[] = [];
  for (const [elemKey, elem] of Object.entries(anatomy)) {
    const type = elem.type as string;
    if (type !== 'slot' && type !== 'text') continue;

    const defaultElem = defaultElements[elemKey] ?? {};
    const prop =
      bindingProp((defaultElem as Record<string, unknown>).children) ??
      bindingProp((defaultElem as Record<string, unknown>).content);

    if (type === 'text' && !prop) continue; // static text — not a slot

    let rule = visibility.get(elemKey);
    let warning: string | undefined;
    if (!rule) {
      if (defaultKeys.has(elemKey)) {
        rule = { kind: 'always' };
      } else {
        const inferred = inferRule(added.get(elemKey)?.conditions ?? [], props);
        rule = inferred.rule;
        warning = inferred.warning;
      }
    }
    slots.push({ elementKey: elemKey, slotType: type, prop, rule, warning });
  }

  // ── Data-attribute props (Css transformer convention) ─────────────────────
  const dataAttrProps = new Set<string>();
  const propVariants: Array<{ configuration: Record<string, unknown> }> = [];
  for (const variant of variants) {
    const config = variant.configuration ?? {};
    const entries = Object.entries(config);
    if (entries.length === 0) continue;
    let expressible = true;
    for (const [k] of entries) {
      if (omittedProps.has(k)) expressible = false;
      if (!classifiedProps.has(k)) dataAttrProps.add(k);
    }
    if (expressible) propVariants.push({ configuration: config });
  }

  return { slots, layout, visibility, dataAttrProps: [...dataAttrProps].sort(), propVariants };
}

/** Resolve a styles.visible value to a SlotRule, or undefined when not a binding. */
function visibleToRule(visible: unknown, props: Record<string, unknown>): SlotRule | undefined {
  if (!visible || typeof visible !== 'object') return undefined;
  const binding = bindingProp(visible);
  if (!binding) return undefined;
  const prop = (props[binding] ?? {}) as Record<string, unknown>;
  if (prop.type === 'boolean') return { kind: 'whenTrue', prop: binding };
  return { kind: 'whenNotNull', prop: binding };
}

/** Extract the prop name from a `{ $binding: '#/props/x' }` value. */
function bindingProp(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const binding = (value as Record<string, unknown>).$binding;
  if (typeof binding !== 'string') return undefined;
  const match = binding.match(/^#\/props\/(.+)$/);
  return match?.[1];
}

/**
 * Infer a SlotRule from the variant configurations that structurally include
 * an element. Single shared (prop, value) pair → whenTrue/whenValue.
 * Empty config present (state-only variant) → always.
 * Divergent configs → ambiguous: always + warning.
 */
function inferRule(
  conditions: Array<Record<string, unknown>>,
  props: Record<string, unknown>,
): { rule: SlotRule; warning?: string } {
  if (conditions.length === 0 || conditions.some(c => Object.keys(c).length === 0)) {
    return { rule: { kind: 'always' } };
  }
  const first = Object.entries(conditions[0]);
  if (first.length === 1 && conditions.every(c => {
    const entries = Object.entries(c);
    return entries.length === 1 && entries[0][0] === first[0][0] && entries[0][1] === first[0][1];
  })) {
    const [propName, value] = first[0];
    const prop = (props[propName] ?? {}) as Record<string, unknown>;
    if (prop.type === 'boolean' && value === true) {
      return { rule: { kind: 'whenTrue', prop: propName } };
    }
    return { rule: { kind: 'whenValue', prop: propName, value: String(value) } };
  }
  return {
    rule: { kind: 'always' },
    warning: `ambiguous structural presence — included by configurations: ${JSON.stringify(conditions)}`,
  };
}

function stripStateProps(
  config: Record<string, unknown>,
  classifiedProps: Set<string>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(config)) {
    if (!classifiedProps.has(k)) out[k] = v;
  }
  return out;
}

/**
 * Dedupe OR'd conditions and drop subsumed ones: `{a}` already covers
 * `{a, b}`, so the compound term is redundant.
 */
function dedupeConditions(conditions: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  const seen = new Set<string>();
  const unique: Array<Record<string, unknown>> = [];
  for (const c of conditions) {
    const key = JSON.stringify(Object.entries(c).sort(([a], [b]) => a.localeCompare(b)));
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(c);
    }
  }
  return unique.filter(c => !unique.some(o =>
    o !== c &&
    Object.keys(o).length < Object.keys(c).length &&
    Object.entries(o).every(([k, v]) => c[k] === v)
  ));
}

// ── Layout tree helpers ───────────────────────────────────────────────────────

/**
 * Parse the YAML layout shape into LayoutNodes. Layout is a list whose items
 * are either a string (leaf element) or a single-key object mapping an element
 * to its children list.
 */
export function parseLayout(layout: unknown): LayoutNode[] {
  if (!Array.isArray(layout)) return [];
  const nodes: LayoutNode[] = [];
  for (const item of layout) {
    if (typeof item === 'string') {
      nodes.push({ key: item, children: [] });
    } else if (item && typeof item === 'object') {
      for (const [key, children] of Object.entries(item as Record<string, unknown>)) {
        nodes.push({ key, children: parseLayout(children) });
      }
    }
  }
  return nodes;
}

function collectKeys(nodes: LayoutNode[], into: Set<string>): void {
  for (const node of nodes) {
    into.add(node.key);
    collectKeys(node.children, into);
  }
}

function walkWithParent(
  nodes: LayoutNode[],
  parent: string | null,
  visit: (node: LayoutNode, parent: string | null, index: number) => void,
): void {
  nodes.forEach((node, index) => {
    visit(node, parent, index);
    walkWithParent(node.children, node.key, visit);
  });
}

function cloneLayout(nodes: LayoutNode[]): LayoutNode[] {
  return nodes.map(n => ({ key: n.key, children: cloneLayout(n.children) }));
}

function insertIntoLayout(
  layout: LayoutNode[],
  node: LayoutNode,
  parent: string | null,
  index: number,
): void {
  if (parent === null) {
    layout.splice(Math.min(index, layout.length), 0, node);
    return;
  }
  const target = findNode(layout, parent);
  if (target) {
    target.children.splice(Math.min(index, target.children.length), 0, node);
  } else {
    layout.push(node); // parent itself isn't in the merged tree — append at root
  }
}

function findNode(nodes: LayoutNode[], key: string): LayoutNode | undefined {
  for (const node of nodes) {
    if (node.key === key) return node;
    const found = findNode(node.children, key);
    if (found) return found;
  }
  return undefined;
}
