---
title: "contract.ts"
description: "The props interface, enums and defaults every other emitted file reads"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge experimental-badge">Experimental</span>')</script>

The component's typed surface: one enum per multi-value prop, an interface that uses them, and a defaults constant. It is the only emitted file both targets share byte-for-byte, because a prop named in Figma is the same prop whichever platform renders it.

Everything else reads from here. The scaffold spreads the defaults and destructures the interface; the stories type their controls from the enums; the stylesheet's variant selectors match the values the enums list.

## Shape

```ts
// Generated. Do not edit — regenerate with `specs react`.

export type CheckboxChecked =
  | 'indeterminate'
  | 'unchecked'
  | 'checked';
export type CheckboxValidation =
  | 'none'
  | 'error';
export type CheckboxSize =
  | 'small'
  | 'medium';

export interface CheckboxProps {
  checked?: CheckboxChecked;
  validation?: CheckboxValidation;
  disabled?: boolean;
  size?: CheckboxSize;
  label?: string | null;
  helpText?: string | null;
}

export const CheckboxDefaults = {
  checked: "unchecked",
  validation: "none",
  disabled: false,
  size: "small",
} satisfies CheckboxProps;
```

## What each part comes from

| Emitted | From | Notes |
|---|---|---|
| `type <Component><Prop>` | a variant property with more than one value | Named `<Component><Prop>` so two components' `size` enums never collide on import |
| `boolean` prop | a variant property with exactly two values that read as on/off | See [prop naming](/guides/prop-naming/) for which pairs qualify |
| `string \| null` prop | a text or slot-bearing element | `null` is the absence of the content, which is how the scaffold hides the element |
| `<Component>Defaults` | each variant property's default value | `satisfies`, not `as` — a default outside its own enum fails to compile rather than emitting a lie |

Every prop is optional. A consumer who writes `<Checkbox />` gets the defaults, and the scaffold merges them over whatever was passed.

Text props carry no default, because the default for a text slot is the spec's example content — not a value the component should assert. The stories supply the example; a consumer supplies the real thing.

## `metadata.ts`

Emitted only when the component has slots. It declares slot shapes and the rule that governs each slot's visibility — the same rules the scaffold compiles into conditionals, kept readable for tooling that reasons about the component without parsing JSX.

```ts
export interface CheckboxSlots {
  label: string;
  helpText?: string;
}

export type CheckboxSlotVisibility =
  | { kind: 'always' }
  | { kind: 'whenTrue'; prop: CheckboxSlotRuleProp }
  | { kind: 'whenNotNull'; prop: CheckboxSlotRuleProp }
  | { kind: 'whenNull'; prop: CheckboxSlotRuleProp }
  | { kind: 'whenValue'; prop: CheckboxSlotRuleProp; value: string };

export const CheckboxSlotRules = {
  label: { kind: 'always' },
  helpText: { kind: 'whenNotNull', prop: 'helpText' },
} satisfies Record<keyof CheckboxSlots, CheckboxSlotVisibility>;
```

This is not part of the props API. A consumer writes `CheckboxProps`; `metadata.ts` is for code that generates, validates or documents.

## `api.ts`

Web Components only, and only on a root component. The custom-element surface that has no React equivalent: the tag name, the shadow-root elements a consumer may reach with `::part()`, and the global element-tag map entry that makes `document.querySelector('ui-checkbox')` typed.

```ts
export const CheckboxTag = "ui-checkbox" as const;

/** Shadow-root elements a consumer may target with `::part()`. */
export const CheckboxParts = [
  "labelContainer",
  "label",
  "helpText",
  "checkbox",
  "box",
  "check",
] as const;

export type CheckboxPart = (typeof CheckboxParts)[number];

declare global {
  interface HTMLElementTagNameMap {
    "ui-checkbox": Checkbox;
  }
}
```

Props and defaults stay in `contract.ts`, which both targets read — `api.ts` carries only what is element-specific. A subcomponent has no `api.ts` of its own: its tag is namespaced by its parent, so the parent's file carries it.

## See Also

- [scaffold](/code/scaffold/) — how the contract is consumed at render time
- [stories](/code/stories/) — the enums become Storybook controls
- [Prop Naming](/guides/prop-naming/) — how a Figma variant property becomes a prop name and type
