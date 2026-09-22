---
title: "scaffold"
description: "The working component: markup from the layout tree, variant attributes, conditional slots"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge experimental-badge">Experimental</span>')</script>

The renderable component — `scaffold.tsx` for React, `scaffold.ts` for Web Components. It imports the [contract](/code/contract/) and the [stylesheet](/code/styles/), renders the merged layout tree as BEM-classed markup, and gates each element on the visibility rule its spec declares.

It is regenerated on every run. An implementation you own goes in a sibling `component.tsx` / `component.ts`, which no command writes and the stories import in the scaffold's place when it exists.

The examples below are a text input whose container element carries the `textbox` role. A role is the clearest way to read this file, because it is the one annotation that changes every part of it at once — the element emitted, the props the contract declares, and the accessibility wiring between them.

## React

```tsx
// Generated. Do not edit — regenerate with `specs react`.
import * as React from 'react';
import './styles.css';
import { TextInputDefaults, type TextInputProps } from './contract';
import { definedProps, restProps } from '../../_runtime';
import { FormLabel } from '../FormLabel/scaffold';
import { FormErrorMessage } from '../FormErrorMessage/scaffold';

export interface TextInputScaffoldProps
  extends TextInputProps,
    Omit<React.ComponentPropsWithRef<'div'>, keyof TextInputProps | "className" | "style" | "onChange" | "onBlur" | "name"> {
  /** Fires on every keystroke, after the value updates. */
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** What happens on blur — typically validation — is the consumer's. */
  onBlur?: (e: React.FocusEvent) => void;
  /** Form submission identity. */
  name?: string;
  /** Merged onto the root, so a caller can place and size this component. */
  className?: string;
  style?: React.CSSProperties;
}

export function TextInput(props: TextInputScaffoldProps) {
  const p = { ...TextInputDefaults, ...definedProps(props) } as TextInputScaffoldProps;
  const rest = restProps(props, TextInputOwned);
  const containerRoleId = React.useId();
  const formLabelDescriptionRoleId = React.useId();
  const errorMessageRoleId = React.useId();
  const valueProp = p.value ?? '';
  const [value, setValue] = React.useState(valueProp);
  const [prevValue, setPrevValue] = React.useState(valueProp);
  if (prevValue !== valueProp) { setPrevValue(valueProp); setValue(valueProp); }
  p.value = value;
  return (
    <div
      className={['text-input', p.className].filter(Boolean).join(' ')}
      data-element="root"
      {...(p.disabled ? { 'data-disabled': '' } : {})}
      {...(p.readOnly ? { 'data-read-only': '' } : {})}
      data-validation={p.validation}
      {...rest}
      style={p.style}
    >
      <div className="text-input__form-label" data-element="formLabel">
        <FormLabel {...{ required: false, label: "{Label}", size: "medium" }}
          htmlFor={containerRoleId} descriptionId={formLabelDescriptionRoleId} />
      </div>
      {p.startIconName != null && (
        <span className="text-input__start-icon" data-element="startIcon" aria-hidden="true">{p.startIconName}</span>
      )}
      <input
        className="text-input__container"
        data-element="container"
        id={containerRoleId}
        type="text"
        value={value}
        onChange={(e) => { const next = e.target.value; setValue(next); p.onChange?.(e); }}
        placeholder={p.placeholder ?? undefined}
        disabled={p.disabled}
        readOnly={p.readOnly}
        aria-invalid={p.validation === "error" ? 'true' : undefined}
        aria-describedby={[formLabelDescriptionRoleId, p.validation === "error" ? errorMessageRoleId : null].filter(Boolean).join(' ') || undefined}
        name={p.name}
        onBlur={p.onBlur}
      />
      {p.validation === "error" && (
        <div className="text-input__error-message" data-element="errorMessage">
          <FormErrorMessage {...{ label: "{Error text}", size: "small" }} errorMessageId={errorMessageRoleId} />
        </div>
      )}
    </div>
  );
}
```

| Emitted | Why |
|---|---|
| `{ ...Defaults, ...definedProps(props) }` | An explicitly passed `undefined` must not beat a default; `definedProps` drops those keys before the merge |
| `restProps(props, Owned)` | Everything the component does not own — `id`, `onFocus`, `data-testid` — passes through to the root |
| `className` merged, not replaced | A caller places and sizes the component without losing its own class |
| `data-<prop>` on the root | What the [stylesheet's](/code/styles/) variant selectors match |
| `{p.x != null && …}` | The slot rule from [`metadata.ts`](/code/contract/#metadatats), compiled |
| `aria-hidden` on a decorative element | A glyph beside a labelled control adds nothing to the accessible name |

### What the role added

The `textbox` role on the container element is responsible for everything in that file a container could not have produced on its own.

| Emitted | Because |
|---|---|
| `<input type="text">` in place of a `<div>` | The role names a native control, and React can replace a root or child tag with it |
| `value` / `onChange` / `useState` | A native input is stateful; an uncontrolled one would ignore a `value` prop after first paint. The `prevValue` comparison re-syncs when the prop changes, without an effect |
| `disabled` and `readOnly` as real attributes | The native element enforces them — blocking events and excluding the field from form submission — rather than announcing them with ARIA |
| `React.useId()` for the control and its description | `htmlFor` and `aria-describedby` need matching ids on two elements the spec knows only as anatomy names |
| `htmlFor`/`descriptionId` passed into `FormLabel` | The label is a separate component. The role wires the pair across that boundary rather than assuming one element |
| `aria-describedby` accumulating the error id | Only when validation is in error, so the description is announced exactly while it is shown |
| `onChange` / `onBlur` in the contract | Role-derived props. A container declares no events; a textbox has to |

Without a licence, an annotated spec emits what it would emit unannotated — a `<div>` container, no role-derived props, no wiring — so the free output is still a correct component, just not a native control.

## Web Components

The same layout tree, adapted to Lit. The custom element **is** the root, so the host carries what React puts on a root `<div>`, and children are declared as `part`s so a consumer can reach them through the shadow boundary.

```ts
// Generated. Do not edit — regenerate with `specs webcomponents`.
import { LitElement, html, css, unsafeCSS, nothing } from 'lit';
// @ts-ignore — vite resolves `?inline` to the stylesheet text
import styles0 from './host.css?inline';
import './light.css';
import { TextInputDefaults, type TextInputProps } from './contract';
import '../FormLabel/scaffold';

export class TextInput extends LitElement {
  static styles = [
    css`@layer specs { :host { display: block; } }`,
    unsafeCSS(styles0),
  ];

  static properties = {
    validation: { type: String, reflect: true },
    disabled: { type: Boolean },
    readOnly: { type: Boolean, attribute: 'read-only' },
    placeholder: { type: String },
    startIconName: { type: String, attribute: 'start-icon-name' },
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
      <div class="text-input__form-label" part="formLabel" data-element="formLabel">
        <ui-form-label .label=${"{Label}"} .size=${"medium"}></ui-form-label>
      </div>
      ${this.startIconName != null ? html`
        <span class="text-input__start-icon" part="startIcon" aria-hidden="true">${this.startIconName}</span>
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

### Where the role lands differently

React can replace a root's tag when a role calls for a native control. This target cannot — the root is already the element the consumer wrote. So the semantic element is emitted *inside* the shadow root, wrapping the root's content, with focus delegated to it:

```ts
export class Button extends LitElement {
  // The shadow root contains a real interactive element; delegating focus
  // makes the host a real tab stop and keeps `:host(:focus-visible)`
  // matching, so the stylesheet needs no knowledge of the inner element.
  static shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };

  render() {
    return html`
      <button part="button" type="button" ?disabled=${this.disabled}
        @click=${(e: MouseEvent) => this.onClick?.(e)}>
        …
      </button>
    `;
  }
}
```

The inner element is styled to nothing and takes no box, so the host keeps the root's layout and appearance exactly as the stylesheet describes them.

A state the role expresses natively — `:disabled`, `:checked` — then lives on an element no `:host()` selector can reach, and a host is not a form control, so `:host(:disabled)` cannot match either. The host carries a plain styling attribute for the concept so the stylesheet still has something to select. See [precedence](/roles/precedence/).

## Subcomponents

A composed element renders as a call to its subcomponent's scaffold, with the props the parent's variant data pins. React passes them as spread objects and imports the function; Lit imports the module for its side effect — defining the tag — and passes `.property` bindings. Either way the child comes from its own directory, so a change to the child's contract is a compile error in the parent rather than silent drift.

When a role spans that boundary — a label in one component describing a control in another — the parent generates the ids and passes them down as explicit props, as `htmlFor` and `descriptionId` above.

## See Also

- [contract](/code/contract/) — the props, enums and defaults this file consumes
- [styles](/code/styles/) — the stylesheet these class names and data attributes are written against
- [Roles](/roles/) — the full inventory and what each one changes
