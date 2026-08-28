---
title: "webcomponents-stories"
description: "Emit a web-components Storybook CSF page with one story per prop-expressible variant"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge experimental-badge">Experimental</span>')</script>

Emits a Storybook Component Story Format (CSF) page for each component, targeting the `@storybook/web-components` renderer: a `Default` story plus one story per variant configuration that can be expressed through props. It imports the **authored** element seeded by the [`webcomponents` transformer](/cli/transforms/webcomponents/), so Storybook always reflects your implementation, not the regenerated reference scaffold.

## Use When

- You want a web-components Storybook page scaffolded for every variant combination the spec defines, without writing story boilerplate by hand.
- You want stories that stay attached to your authored element as you edit it, rather than to a regenerated file.

## Invocation

```bash
specs transform webcomponents-stories
```

Requires `variants.yaml` — components without it are skipped with a warning, since stories are generated from the same variant analysis as the `webcomponents` transformer.

## Output

Each component subfolder receives a `generated/webcomponents/{Component}.stories.ts` file:

```
dsAlert/
  generated/
    webcomponents/
      DsAlert.scaffold.ts
      DsAlert.stories.ts        ← imports src/webcomponents/DsAlert, not the scaffold
  src/
    webcomponents/
      DsAlert.ts
```

`{Component}.stories.ts` is regenerated on every run, same as `{Component}.scaffold.ts` — but its import points at the authored `../../src/webcomponents/{Component}` module, not the generated scaffold. The import is a side effect: it registers the custom element's tag, which the stories render.

## Example Output

Given an Alert with `severity` (`info` | `warning` | `error`) and `dismissible` (boolean), both expressible as props:

```ts
// Generated. Do not edit — regenerate with `specs transform`.
import type { Meta, StoryObj } from '@storybook/web-components';
import { html, nothing } from 'lit';
import '../../src/webcomponents/DsAlert';
import { DsAlertDefaults, type DsAlertProps } from '../DsAlert.contract';

type Args = DsAlertProps & {
  body?: unknown;
};

// One render path for every story: bind each contract prop as an
// attribute (typed properties convert them back; attributes survive the
// docs panel's DOM serialization), place slot args into light-DOM children.
const renderComponent = (a: Args) => html`
  <ds-alert severity=${a.severity ?? nothing} ?dismissible=${a.dismissible}>
    ${a.body != null ? html`<div slot="body" style="display: contents">${a.body}</div>` : nothing}
  </ds-alert>
`;

const meta = {
  title: 'Components/DsAlert',
  render: renderComponent,
  argTypes: {
    severity: { control: 'select', options: ["info","warning","error"] },
  },
  args: {
    ...DsAlertDefaults,
    body: 'Slot content',
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Default: Story = {};

export const SeverityWarning: Story = { args: { severity: 'warning' } };
export const SeverityError: Story = { args: { severity: 'error' } };
export const Dismissible: Story = { args: { dismissible: true } };
```

## Story Generation Rules

- **One render helper for every story.** The page defines a single `renderComponent` helper that binds each contract prop and places slot args into light-DOM children (`children` into the default slot, other slot props into `slot`-attributed, layout-neutral holders). `Default`, per-variant stories, and the sticker sheet all render through it.
- **Props bind as attributes, not `.property` bindings** (booleans via `?attr`, everything else via `attr=${value ?? nothing}`; the element's declared property types convert them back). Storybook's web-components docs panel produces its "Show code" snippet by serializing the rendered DOM, and only attributes survive serialization — attribute bindings keep the snippet tracking the current controls and copy-pasteable as plain HTML.
- **Meta args** combine the contract's `Defaults` (when present) with an example value for every string prop that declares `examples` in the spec, plus placeholder text (`'Slot content'`) for every slot prop — so text and slot content render out of the box without extra setup.
- **argTypes** are emitted for enum props (`control: 'select'` with the spec's values), since the web-components renderer has no prop-interface docgen to infer them from.
- **One story per prop-expressible variant configuration.** A variant driven purely by browser-fired states (e.g. `:hover`, `:active`) has no corresponding prop to set, so it's skipped — its styling only shows through real interaction, not a story.
- **Story names** are derived from the variant configuration: a `true` boolean becomes `PascalCase(prop)` (e.g. `Elevated`); a `false` boolean becomes `NotPascalCase(prop)` (e.g. `NotDisabled`); a string/enum value becomes `PascalCase(prop)PascalCase(value)` (e.g. `SeverityWarning`). Multiple config keys concatenate. Name collisions get a numeric suffix (`SeverityWarning2`).

## Config

No transformer-specific options today.

```yaml
config:
  transformers:
    - name: contract
    - name: css
    - name: webcomponents
    - name: webcomponents-stories
```

Running `webcomponents-stories` without `webcomponents` first still works — the `webcomponents` transformer's `src/webcomponents/{Component}.ts` seed step is idempotent and only needs to have run at least once for the imported module to exist. In practice, run `webcomponents` before `webcomponents-stories` so the authored element is in place.

## Subcomponent Output

Each subcomponent gets its own `generated/webcomponents/{Subcomponent}.stories.ts`, importing its own authored element under `src/webcomponents/{Subcomponent}.ts`, following the same rules as the parent — prefixed with just the subcomponent's own name, not the parent's, while its custom-element tag carries the parent namespace.

## See Also

- [Transforms overview](/cli/transforms/)
- [`webcomponents` transformer](/cli/transforms/webcomponents/) — seeds the authored element these stories import
- [`stories` transformer](/cli/transforms/stories/) — the same stories projected onto the React surface
- [`contract` transformer](/cli/transforms/contract/) — source of `Defaults` used in story args
