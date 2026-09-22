---
title: "stories"
description: "Storybook CSF: controls typed from the contract, a story per variant axis, a sticker sheet"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge experimental-badge">Experimental</span>')</script>

A Storybook CSF file per component — `stories.tsx` for React, `stories.ts` for Web Components. Controls are typed from the [contract](/code/contract/), one story is emitted per variant axis, and a sticker sheet renders every combination on one page.

Stories are emitted by default. `--no-stories` omits them, for a consumer who does not use Storybook.

## Shape

```tsx
// Generated. Do not edit — regenerate with `specs react`.
import type { Meta, StoryObj } from '@storybook/react';
import { Checkbox } from './scaffold';
import { CheckboxDefaults } from './contract';

const meta = {
  title: 'React/Checkbox',
  component: Checkbox,
  argTypes: {
    checked: { control: 'select', options: ["indeterminate","unchecked","checked"], table: { defaultValue: { summary: "unchecked" } } },
    disabled: { table: { defaultValue: { summary: "false" } } },
    label: { control: 'select', options: ["(none)","{Label}"], mapping: { "(none)": null } },
  },
  args: {
    ...CheckboxDefaults,
    label: "{Label}",
  },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = { args: { disabled: true } };
export const CheckedIndeterminate: Story = { args: { checked: "indeterminate" } };
export const CheckedChecked: Story = { args: { checked: "checked" } };
export const CheckedCheckedDisabled: Story = { args: { checked: "checked", disabled: true } };
```

| Emitted | From |
|---|---|
| `argTypes` per prop | The contract's enums — `control: 'select'` with the enum's values as options |
| `defaultValue.summary` | The defaults constant, so the control panel shows what the component does with no args |
| `args` | The defaults, plus the spec's example content for each text slot |
| `mapping: { "(none)": null }` | A nullable text prop needs a control value that means *absent*, and Storybook cannot put `null` in a select |
| One story per variant value | Every value of every enum, and both states of every boolean |
| Compound stories | Combinations across axes — licensed |
| `StickerSheet` | Every story rendered on one page, grouped by axis, with controls disabled |

The import is the seam: the stories import `./scaffold` unless an authored `component.tsx` sits beside it, in which case they import that instead. The stories always show what a consumer actually gets.

## Web Components

The same file, adapted to how Lit renders. Stories are `render` functions returning a template rather than a `component` reference, and the element is imported for its side effect — defining the tag — rather than for a symbol.

```ts
import type { Meta, StoryObj } from '@storybook/react';
import { html } from 'lit';
import './scaffold';
import { CheckboxDefaults } from './contract';
```

The React Storybook host that lets a Lit element render inside the harness lives in `storybook/lib/`, not in the component tree. A Lit component library has no business importing React for a harness it never uses at runtime.

## Free and Pro

Free output encodes variant, boolean and text props, with one story per variant-prop axis. Compound stories, sticker sheets, glyphs, background images and composed content require a licence.

Without one, a component's stories still cover every single-axis variant — the grid of combinations is what is missing, not the component.

## See Also

- [contract](/code/contract/) — the enums and defaults the controls are built from
- [scaffold](/code/scaffold/) — what the stories import, unless you authored a sibling
- [`react`](/cli/commands/react/) — `--no-stories` and the rest of the options
