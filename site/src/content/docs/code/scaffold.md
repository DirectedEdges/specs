---
title: "scaffold"
description: "The working component: markup from the layout tree, variant attributes, conditional slots"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge experimental-badge">Experimental</span>')</script>

The renderable component — `scaffold.tsx` for React, `scaffold.ts` for Web Components. It imports the [contract](/code/contract/) and the [stylesheet](/code/styles/), renders the merged layout tree as BEM-classed markup, and gates each element on the visibility rule its spec declares.

It is regenerated on every run. An implementation you own goes in a sibling `component.tsx` / `component.ts`, which no command writes and the stories import in the scaffold's place when it exists.

## React

A text input, with a label, an optional leading visual, a value, and an error message shown under one validation value.

```tsx
// Generated. Do not edit — regenerate with `specs react`.
import * as React from 'react';
import './styles.css';
import { TextInputDefaults, type TextInputProps } from './contract';
import { definedProps, restProps } from '../../_runtime';
import { FormErrorMessage } from '../FormErrorMessage/scaffold';

export interface TextInputScaffoldProps
  extends TextInputProps,
    Omit<React.ComponentPropsWithRef<'div'>, keyof TextInputProps | "className" | "style" | "startVisual"> {
  startVisual?: React.ReactNode;
  /** Merged onto the root, so a caller can place and size this component. */
  className?: string;
  style?: React.CSSProperties;
}

const TextInputOwned = [
  "validation", "disabled", "readOnly", "required",
  "label", "value", "placeholder", "startVisual",
  "className", "style",
] as const;

export function TextInput(props: TextInputScaffoldProps) {
  const p = { ...TextInputDefaults, ...definedProps(props) } as TextInputScaffoldProps;
  const rest = restProps(props, TextInputOwned);
  return (
    <div
      className={['text-input', p.className].filter(Boolean).join(' ')}
      data-element="root"
      data-validation={p.validation}
      {...(p.readOnly ? { 'data-read-only': '' } : {})}
      aria-disabled={p.disabled ? 'true' : undefined}
      aria-required={p.required ? 'true' : undefined}
      aria-invalid={p.validation === "error" ? 'true' : undefined}
      {...rest}
      style={p.style}
    >
      <div className="text-input__display" data-element="display">
        {p.startVisual != null && (
          <div className="text-input__start-visual" data-element="startVisual">
            {p.startVisual}
          </div>
        )}
        <div className="text-input__label-and-value" data-element="labelAndValue">
          <span className="text-input__label" data-element="label">{p.label}</span>
          <span className="text-input__value" data-element="value">
            {p.value != null ? p.value : p.placeholder}
          </span>
        </div>
      </div>
      {p.validation === "error" && (
        <div className="text-input__error" data-element="error">
          <FormErrorMessage {...{ text: "{Error message}" }} />
        </div>
      )}
    </div>
  );
}
```

| Emitted | Why |
|---|---|
| `{ ...Defaults, ...definedProps(props) }` | An explicitly passed `undefined` must not beat a default; `definedProps` drops those keys before the merge |
| `restProps(props, Owned)` | Everything the component does not own — `id`, `onClick`, `data-testid` — passes through to the root |
| `className` merged, not replaced | A caller places and sizes the component without losing its own class |
| `data-<prop>` on the root | What the [stylesheet's](/code/styles/) variant selectors match. A boolean prop emits presence, an enum emits a value |
| `aria-*` from state props | Which prop maps to which attribute is the [states convention](/settings/states/) |
| `{p.x != null && …}` | The slot rule from [`metadata.ts`](/code/contract/#metadatats), compiled into a conditional |
| A `ReactNode` prop outside the contract | A slot that takes arbitrary content is a scaffold concern, not part of the typed props API |

## Web Components

The same layout tree, adapted to Lit. The custom element **is** the root, so the host carries what React puts on a root `<div>`, and children are declared as `part`s so a consumer can reach them through the shadow boundary.

```ts
// Generated. Do not edit — regenerate with `specs webcomponents`.
import { LitElement, html, css, unsafeCSS, nothing } from 'lit';
// @ts-ignore — vite resolves `?inline` to the stylesheet text
import styles0 from './host.css?inline';
import './light.css';
import { TextInputDefaults, type TextInputProps } from './contract';
import '../FormErrorMessage/scaffold';

export class TextInput extends LitElement {
  static styles = [
    css`@layer specs { :host { display: block; } }`,
    unsafeCSS(styles0),
  ];

  static properties = {
    validation: { type: String, reflect: true },
    disabled: { type: Boolean },
    readOnly: { type: Boolean, attribute: 'read-only' },
    label: { type: String },
    value: { type: String },
  };

  declare validation: TextInputProps['validation'];
  declare disabled: TextInputProps['disabled'];

  constructor() {
    super();
    Object.assign(this, TextInputDefaults);
  }

  willUpdate() {
    this.setAttribute('data-element', 'root');
    { const v = this.disabled ? 'true' : null; if (v == null || v === false) this.removeAttribute('aria-disabled'); else this.setAttribute('aria-disabled', v === true ? '' : String(v)); }
  }

  render() {
    return html`
      <div class="text-input__display" part="display" data-element="display">
        <span class="text-input__label" part="label">${this.label}</span>
        <span class="text-input__value" part="value">${this.value}</span>
      </div>
      ${this.validation === "error" ? html`
        <div class="text-input__error" part="error">
          <ui-form-error-message .text=${"{Error message}"}></ui-form-error-message>
        </div>
      ` : nothing}
    `;
  }
}
```

| Emitted | Why |
|---|---|
| `reflect: true` on variant props | The stylesheet selects on the attribute, so the property must write it back |
| `attribute: 'read-only'` | A camelCase property needs an explicit kebab attribute name |
| `Object.assign(this, Defaults)` in the constructor | Lit has no props-merge step; defaults are assigned once at construction |
| `part="…"` on every anatomy element | Shadow DOM hides these; `part` is the only way a consumer styles them. The list is in [`api.ts`](/code/contract/#apits) |
| `@layer specs { :host { display: block } }` floor | A custom element is `display: inline` by default. Layered so the sheet's own layered rules still win |
| `willUpdate()` writing host attributes | The host has no JSX to carry them; they are set imperatively before each render |
| `nothing`, not `''` | Lit removes the node rather than rendering an empty one |
| `.property=${…}` on a child tag | A subcomponent takes objects and booleans as properties; attributes are strings |

## Subcomponents

A composed element renders as a call to its subcomponent's scaffold, with the props the parent's variant data pins. React passes them as spread objects and imports the function; Lit imports the module for its side effect — defining the tag — and passes `.property` bindings. Either way the child comes from its own directory, so a change to the child's contract is a compile error in the parent rather than silent drift.

## What changes the output

The scaffold above is what a component's own spec data produces. Four other inputs change it, and each changes it in a different place.

### Variant data

The layout tree is merged across every variant before anything is emitted, so the scaffold renders the union. An element only some variants include becomes a conditional, and the `data-*` attributes on the root are what let the [stylesheet](/code/styles/) style the rest. A component with no `variants.yaml` is skipped rather than emitted empty — there would be nothing to gate on.

### The states convention

Without one, every variant prop stays a `data-*` attribute. With one, a classified prop emits the semantic attribute instead — `aria-disabled`, `aria-invalid`, `aria-required` above are all this. See the [states convention](/settings/states/).

### Roles

An annotated element is emitted as the thing it was annotated as, rather than as the container it looks like in Figma. On the text input above, a `textbox` role on the value's container replaces that `<div>` with a real `<input type="text">`, and with it come the things a native control needs and a container never does:

```tsx
const controlId = React.useId();
const descriptionId = React.useId();
const [value, setValue] = React.useState(p.value ?? '');
…
<input
  id={controlId}
  type="text"
  value={value}
  onChange={(e) => { setValue(e.target.value); p.onChange?.(e); }}
  disabled={p.disabled}
  readOnly={p.readOnly}
  aria-describedby={descriptionId}
/>
```

`disabled` and `readOnly` stop being ARIA announcements and become real attributes the browser enforces; `onChange` and `onBlur` join the [contract](/code/contract/); the ids wire the control to a label that may live in a different component.

Web Components diverge here, because the root is already the tag the consumer wrote and cannot be replaced. The semantic element is emitted inside the shadow root with `delegatesFocus`, and the host carries a plain styling attribute for any state the inner element now expresses natively. [Roles](/roles/) covers the inventory; [precedence](/roles/precedence/) covers that last part.

### The licence

Without one, an annotated spec emits what it would emit unannotated — the container, and no role-derived props. Composition, glyphs and background images are licensed the same way. Free output is a correct component, with less in it.

## See Also

- [contract](/code/contract/) — the props, enums and defaults this file consumes
- [styles](/code/styles/) — the stylesheet these class names and data attributes are written against
- [stories](/code/stories/) — what imports this file, unless you authored a sibling
