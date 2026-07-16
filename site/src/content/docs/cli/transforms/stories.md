---
title: "stories"
description: "Emit a Storybook CSF page with one story per prop-expressible variant"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge experimental-badge">Experimental</span>')</script>

Emits a Storybook Component Story Format (CSF) page for each component: a `Default` story plus one story per variant configuration that can be expressed through props. It imports the **authored** component seeded by the [`react` transformer](/cli/transforms/react/), so Storybook always reflects your implementation, not the regenerated reference scaffold.

## Use When

- You want a Storybook page scaffolded for every variant combination the spec defines, without writing story boilerplate by hand.
- You want stories that stay attached to your authored component as you edit it, rather than to a regenerated file.

## Invocation

```bash
specs transform stories
```

Requires `variants.yaml` — components without it are skipped with a warning, since stories are generated from the same variant analysis as the `react` transformer.

## Output

Each component subfolder receives a `generated/react/{Component}.stories.tsx` file:

```
dsAlert/
  generated/
    react/
      DsAlert.scaffold.tsx
      DsAlert.stories.tsx        ← imports src/react/DsAlert, not scaffold.tsx
  src/
    react/
      DsAlert.tsx
```

`{Component}.stories.tsx` is regenerated on every run, same as `{Component}.scaffold.tsx` — but its import points at the authored `../../src/react/{Component}` module, not the generated scaffold.

## Example Output

Given an Alert with `severity` (`info` | `warning` | `error`) and `dismissible` (boolean), both expressible as props:

```tsx
// Generated. Do not edit — regenerate with `specs transform`.
import type { Meta, StoryObj } from '@storybook/react';
import { DsAlert } from '../../src/react/DsAlert';
import { DsAlertDefaults } from '../DsAlert.contract';

const meta = {
  title: 'Components/DsAlert',
  component: DsAlert,
  args: {
    ...DsAlertDefaults,
  },
} satisfies Meta<typeof DsAlert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SeverityWarning: Story = { args: { severity: 'warning' } };
export const SeverityError: Story = { args: { severity: 'error' } };
export const Dismissible: Story = { args: { dismissible: true } };
```

## Story Generation Rules

- **Meta args** combine the contract's `Defaults` (when present) with an example value for every string prop that declares `examples` in the spec, plus placeholder text (`'Slot content'`) for every slot prop — so text and slot content render out of the box without extra setup.
- **One story per prop-expressible variant configuration.** A variant driven purely by browser-fired states (e.g. `:hover`, `:active`) has no corresponding prop to set, so it's skipped — its styling only shows through real interaction, not a story.
- **Story names** are derived from the variant configuration: a `true` boolean becomes `PascalCase(prop)` (e.g. `Elevated`); a `false` boolean becomes `NotPascalCase(prop)` (e.g. `NotDisabled`); a string/enum value becomes `PascalCase(prop)PascalCase(value)` (e.g. `SeverityWarning`). Multiple config keys concatenate. Name collisions get a numeric suffix (`SeverityWarning2`).

## Config

No transformer-specific options today.

```yaml
config:
  transformers:
    - name: contract
    - name: css
    - name: react
    - name: stories
```

Running `stories` without `react` first still works — the `react` transformer's `src/react/{Component}.tsx` seed step is idempotent and only needs to have run at least once for the imported module to exist. In practice, run `react` before `stories` so the authored component is in place.

## Subcomponent Output

Each subcomponent gets its own `generated/react/{Subcomponent}.stories.tsx`, importing its own authored component under `src/react/{Subcomponent}.tsx`, following the same rules as the parent — prefixed with just the subcomponent's own name, not the parent's.

## See Also

- [Transforms overview](/cli/transforms/)
- [`react` transformer](/cli/transforms/react/) — seeds the authored component these stories import
- [`contract` transformer](/cli/transforms/contract/) — source of `Defaults` used in story args
