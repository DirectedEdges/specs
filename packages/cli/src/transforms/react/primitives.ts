// Primitive resolution (ADR-074): a spec keeps `type: text`, and this platform's
// conventions say which component that becomes here. Resolution happens at emit
// time, so one platform-neutral spec serves every implementation.
//
// Mirrors `react-from-specs/src/Spec/primitives.ts` — the shared-vocabulary
// duplication this directory already documents. Keep the two in step.
import fs from 'fs-extra';
import path from 'path';
import type { ResolvedPlatformConventions } from '@directededges/specs-schema';

/** The three bindable kinds (ADR-074) — a strict subset of ElementType. */
export type PrimitiveKind = 'text' | 'glyph' | 'container';

type Bindings = NonNullable<ResolvedPlatformConventions['primitives']>;
export type AnyBinding = NonNullable<Bindings[PrimitiveKind]>;

/** The binding for an element's kind, when this platform declares one. */
export function primitiveBindingFor(
  elemType: string,
  platform: ResolvedPlatformConventions | undefined
): AnyBinding | undefined {
  if (elemType !== 'text' && elemType !== 'glyph' && elemType !== 'container') return undefined;
  return platform?.primitives?.[elemType];
}

/**
 * The component a binding names for this element.
 *
 * A container's `component` is either one name or a `LayoutMode`-keyed map, for
 * platforms that pick a Row/Column/Box component instead of setting a direction
 * prop (ADR-076). The element's own `layoutMode` selects from the map.
 */
export function primitiveComponentName(
  binding: AnyBinding,
  styles: Record<string, unknown>
): string | undefined {
  const component = binding.component;
  if (typeof component === 'string') return component;
  const mode = typeof styles.layoutMode === 'string' ? styles.layoutMode : 'NONE';
  return (component as Record<string, string | undefined>)[mode];
}

/**
 * Import name and module path for a bound component, relative to
 * `<component>/generated/react/`.
 *
 * The binding names a *code* component (`EgdsText`); its spec folder is that name
 * camel-cased (`egdsText`) — the same relationship every generated component has
 * between its folder and its exported symbol. An unresolvable component means a
 * primitive this workspace does not generate, and the caller falls back to the
 * host element rather than emitting an import that cannot resolve.
 */
export function primitiveTarget(
  component: string,
  componentDirAbs: string
): { name: string; importPath: string } | undefined {
  const folder = component.charAt(0).toLowerCase() + component.slice(1);
  const dirAbs = path.join(componentDirAbs, '..', folder);
  if (fs.existsSync(path.join(dirAbs, 'src', 'react', `${component}.tsx`))) {
    return { name: component, importPath: `../../../${folder}/src/react/${component}` };
  }
  if (fs.existsSync(path.join(dirAbs, 'generated', 'react', `${component}.scaffold.tsx`))) {
    return { name: component, importPath: `../../../${folder}/generated/react/${component}.scaffold` };
  }
  return undefined;
}

/**
 * A token reference's leaf segment — the value a design system's prop enum uses.
 *
 * `{ $token: 'Color/On surface variant' }` → `"On surface variant"`, which is what
 * `EgdsTextColor` accepts. ADR-075 Decision 4 keeps conventions to prop *names* and
 * lets the value ride the generator's existing token handling; for a prop value
 * that is the token's own leaf name, with no table to maintain or drift.
 */
export function tokenLeaf(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const token = (value as Record<string, unknown>).$token;
  if (typeof token !== 'string') return undefined;
  const leaf = token.split('/').pop();
  return leaf && leaf.trim() !== '' ? leaf : undefined;
}

/** The prop name a `$binding: #/props/<name>` value points at, if any. */
function bindingProp(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const binding = (value as Record<string, unknown>).$binding;
  if (typeof binding !== 'string') return undefined;
  return binding.match(/^#\/props\/(.+)$/)?.[1];
}

/**
 * The JSX attributes a bound primitive receives.
 *
 * Only mapped concepts appear. `null` in a binding means the component has no prop
 * for that concept; an absent value on this element produces no attribute. Anything
 * unmapped stays on the element's generated CSS class, this generator's existing
 * styling channel, so an incomplete mapping costs verbosity and never design intent.
 */
export function primitiveAttrs(
  elemType: PrimitiveKind,
  binding: AnyBinding,
  elem: Record<string, unknown>,
  escapeText: (s: string) => string
): string[] {
  const styles = (elem.styles ?? {}) as Record<string, unknown>;
  const props = (binding.props ?? {}) as Record<string, string | null | undefined>;
  const out: string[] = [];

  const contentAttr = (prop: string | null | undefined) => {
    if (!prop) return;
    const bound = bindingProp(elem.content);
    if (bound) out.push(`${prop}={p.${bound}}`);
    else if (typeof elem.content === 'string') out.push(`${prop}="${escapeText(elem.content)}"`);
  };

  if (elemType === 'text') {
    const color = tokenLeaf(styles.textColor);
    if (props.color && color !== undefined) out.push(`${props.color}="${color}"`);
    contentAttr(props.content);
    const typography = tokenLeaf(styles.typography);
    if (props.typography && typography !== undefined) out.push(`${props.typography}="${typography}"`);
  }

  if (elemType === 'glyph') {
    const color = tokenLeaf(styles.fillColor);
    if (props.color && color !== undefined) out.push(`${props.color}="${color}"`);
    contentAttr(props.content);
  }

  if (elemType === 'container') {
    // Styles.layoutMode is HORIZONTAL | VERTICAL | NONE. A design system's direction
    // enum is its own vocabulary, so the mode is title-cased to its conventional
    // spelling; NONE names no direction and passes nothing, leaving the default.
    const mode = typeof styles.layoutMode === 'string' ? styles.layoutMode : undefined;
    if (props.direction && mode && mode !== 'NONE') {
      out.push(`${props.direction}="${mode.charAt(0) + mode.slice(1).toLowerCase()}"`);
    }
  }

  return out;
}
