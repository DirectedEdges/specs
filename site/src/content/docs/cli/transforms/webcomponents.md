---
title: "webcomponents"
description: "Scaffold a working Lit web component from the spec, then seed an authored copy you own"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge experimental-badge">Experimental</span>')</script>

Emits a functioning [Lit](https://lit.dev) element — the same merged layout tree, BEM markup, `data-*` variant attributes, and ARIA state attributes as the [`react` transformer](/cli/transforms/react/), rendered into a shadow root that adopts the generated stylesheet. Also seeds a one-time authored copy of that element into your source tree, which the [`webcomponents-stories` transformer](/cli/transforms/webcomponents-stories/) imports.

The react and webcomponents transformers consume the same contract and the same stylesheet: one spec drives both surfaces from identical CSS.

## Use When

- You want a real, renderable web-component starting point for a component's implementation instead of a blank file.
- You want variant and state markup (data attributes, ARIA) wired up consistently with what the `css` transformer expects — identical to the react scaffold's DOM.
- You want to iterate on styling and behavior in an authored file that regeneration never touches.

## Invocation

```bash
specs transform webcomponents
```

Requires `variants.yaml` — components without it are skipped with a warning, since slot visibility and variant data attributes are both derived from variant data.

## Output

Two distinct outputs, at two distinct locations:

```
dsAlert/
  generated/
    DsAlert.contract.ts
    DsAlert.styles.css
    webcomponents/
      DsAlert.scaffold.ts        ← regenerated every run — do not edit
  src/
    webcomponents/
      DsAlert.ts          ← seeded once, then human-owned — never overwritten
      DsAlert.extensions.css
      DsAlert.proposed.css
```

**`generated/webcomponents/{Component}.scaffold.ts`** is always current with the spec — it's regenerated on every `specs transform webcomponents` run, importing `../{Component}.contract` and adopting `../{Component}.styles.css`. Treat it as a live reference, not something to build on directly.

**`src/webcomponents/{Component}.ts`** is created once, the first time the transformer runs for that component, as a copy of the scaffold with imports rewritten to the authored paths. If the file already exists, it's left untouched. This is the file you actually implement against.

Alongside it, two empty CSS files are seeded the same way (created once, never overwritten):

- **`{Component}.extensions.css`** — styling the spec can't express (non-scriptable behavior, one-off visual details).
- **`{Component}.proposed.css`** — styling you're trying out with an eye toward promoting it back into the spec.

The authored element adopts all three stylesheets in order — `../../generated/{Component}.styles.css`, then `./{Component}.proposed.css`, then `./{Component}.extensions.css` — so authored overrides win over generated defaults.

## Example Output

Given an Alert with a `severity` enum prop, a `dismissible` boolean, and a `body` slot rendered `always`:

```ts
// Authored component — seeded once by `specs transform`, never overwritten.
import { LitElement, html, css, unsafeCSS, nothing } from 'lit';
// @ts-ignore — vite resolves `?inline` to the stylesheet text
import styles0 from '../../generated/DsAlert.styles.css?inline';
// @ts-ignore — vite resolves `?inline` to the stylesheet text
import styles1 from './DsAlert.proposed.css?inline';
// @ts-ignore — vite resolves `?inline` to the stylesheet text
import styles2 from './DsAlert.extensions.css?inline';
import { DsAlertDefaults, type DsAlertProps } from '../../generated/DsAlert.contract';

const TAG = 'ds-alert';

export class DsAlert extends LitElement {
  // The host is layout-neutral; the inner root element carries the
  // generated stylesheet's block class, mirroring the react scaffold.
  static styles = [
    css`:host { display: contents; }`,
    unsafeCSS(styles0),
    unsafeCSS(styles1),
    unsafeCSS(styles2),
  ];

  static properties = {
    severity: { type: String },
    dismissible: { type: Boolean },
  };

  declare severity: DsAlertProps['severity'];
  declare dismissible: DsAlertProps['dismissible'];

  constructor() {
    super();
    Object.assign(this, DsAlertDefaults);
  }

  render() {
    const p = this;
    return html`
      <div
        class="ds-alert"
        data-element="root"
        data-severity=${p.severity ?? nothing}
        data-dismissible=${p.dismissible ? '' : nothing}
      >
        <span class="ds-alert__body" data-element="body">
          <slot></slot>
        </span>
      </div>
    `;
  }
}

// The registry is global — the authored and generated copies share a tag;
// whichever module loads first wins.
if (!customElements.get(TAG)) customElements.define(TAG, DsAlert);
```

## Rendering Rules

- **Shadow DOM with a layout-neutral host.** The element renders into a shadow root whose adopted stylesheets are the generated CSS (imported with vite's `?inline` suffix and wrapped in `unsafeCSS`). `:host { display: contents }` removes the host from layout, so the inner root element participates in the page exactly like the react scaffold's root `div`. CSS custom properties (the `cssvars` output) inherit into shadow roots, so token references resolve unchanged.
- **Root element** gets the component's kebab-cased class, every variant prop as a `data-*` attribute (boolean props use presence attributes via `nothing`, string/enum props use value attributes), and ARIA attributes for any prop classified in the [`figma.states`](/settings/states/) convention whose selector resolves to an `aria-*` attribute.
- **Child elements** get the `__element` BEM suffix, matching the `css` transformer's selectors.
- **Slot-typed elements** surface as native `<slot>` projection points: the `children` prop maps to the default slot, other slot props to `<slot name="kebab-case-prop">`. Slot props are not reactive properties — content is projected from light-DOM children.
- **Text elements** bound to a prop render `${p.propName}`; text elements with static spec content render that content verbatim (escaped for HTML and the template literal).
- **Instance elements** (nested component references) render as a placeholder comment — instance slot rendering isn't implemented yet.
- **Visibility** combines the slot's `SlotRules` entry (from the contract) with any inferred structural condition (an element present in some variant layouts but not others), AND'd together. Conditional elements render through `${cond ? html`…` : nothing}`.
- **Tag names** kebab-case the component key (`dsAlert` → `ds-alert`). Subcomponent tags are namespaced by their parent (`control` under `dsCheckbox` → `ds-checkbox-control`) since the custom-element registry is global; single-word keys get an `-el` suffix so the tag always contains a hyphen.

## Config

No transformer-specific options today.

```yaml
config:
  transformers:
    - name: contract
    - name: css
    - name: webcomponents
```

## Subcomponent Output

Each subcomponent gets its own `generated/webcomponents/{Subcomponent}.scaffold.ts` and its own seeded `src/webcomponents/{Subcomponent}.ts` + CSS pair, following the same rules as the parent, scoped under the subcomponent's named subfolder. Files are prefixed with just the subcomponent's own name — the folder already disambiguates it from the parent — while its custom-element tag carries the parent namespace.

## See Also

- [Transforms overview](/cli/transforms/)
- [`contract` transformer](/cli/transforms/contract/) — Props, Slots, and SlotRules consumed here
- [`css` transformer](/cli/transforms/css/) — stylesheet adopted by both the generated and authored element
- [`react` transformer](/cli/transforms/react/) — the same spec projected onto the React surface
- [`webcomponents-stories` transformer](/cli/transforms/webcomponents-stories/) — imports the authored element, not the generated scaffold
