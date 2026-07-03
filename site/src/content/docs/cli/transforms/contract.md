---
title: "contract"
description: "Emit a TypeScript Props interface and defaults object for each component"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge experimental-badge">Experimental</span>')</script>

Emits a TypeScript `Props` interface and a `Defaults` const for each component, derived from `api.yaml`.

## Use When

- You want a typed contract for a component that can be imported into your implementation.
- You want a single source of truth for prop names, types, enums, and defaults.
- You want to keep implementation types in sync with the spec without writing them by hand.

## Invocation

```bash
specs transform contract
```

This is the CLI default — running `specs transform` with no arguments runs `contract`.

## Output

Each component subfolder receives a `contract.ts` file. When subcomponents are present, each also receives a `contract.ts` inside its own named subfolder — see [Subcomponent Contracts](#subcomponent-contracts) below.

## Example Output

Given an Alert component with `severity` (enum), `dismissible` (boolean), and `icon` (nullable string):

```ts
// Generated. Do not edit — regenerate with `specs transform`.

export type DsAlertSeverity =
  | 'info'
  | 'warning'
  | 'error'
  | 'critical';

export interface DsAlertProps {
  severity?: DsAlertSeverity;
  dismissible?: boolean;
  icon?: string | null;
}

export const DsAlertDefaults = {
  severity: "info",
  dismissible: false,
  icon: null,
} satisfies DsAlertProps;
```

Enum props emit a companion union type. Nullable props are typed `T | null`. All props are optional — the `Defaults` const covers the required baseline.

## Config

No transformer-specific options. Prop omission for browser-driven states comes from [`config.processing.states`](/specs/settings/states/).

```yaml
config:
  processing:
    states:              # optional — omit to retain all props in contracts
      hover:
        prop: state
        value: hover
      disabled:
        prop: isDisabled
  transformers:
    - name: contract
```

When `processing.states` is absent, all props from `api.yaml` appear in the generated interface. When present, props mapped to browser-driven concepts (`hover`, `active`, `focus`, `focus-within`, etc.) are omitted — the browser fires these without the application setting them.

## Subcomponent Contracts

When subcomponents are present in `api.yaml`, each receives a `contract.ts` inside its own named subfolder. The subfolder name is the subcomponent's key in the spec (e.g. `group`, `item`). Interface and enum type names are prefixed by both component and subcomponent.

```
dsActionList/
  contract.ts           ← parent (DsActionListProps, DsActionListDefaults)
  group/
    contract.ts         ← subcomponent (DsActionListGroupProps, DsActionListGroupDefaults)
  item/
    contract.ts         ← subcomponent (DsActionListItemProps, DsActionListItemDefaults)
```

The parent `contract.ts` only includes the parent component's own types — subcomponent types do not appear in it. Configure subcomponent discovery in [`config.processing.subcomponents`](/specs/settings/subcomponents/).

## See Also

- [Transforms overview](/specs/cli/transforms/)
- [`processing.states` config](/specs/settings/states/) — classify which props are browser-driven vs consumer-controlled
- [`css` transformer](/specs/cli/transforms/css/)
- [`styling` transformer](/specs/cli/transforms/styling/)
