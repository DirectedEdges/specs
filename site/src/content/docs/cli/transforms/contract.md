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

Each component subfolder receives a `generated/{Component}.contract.ts` file, PascalCase-prefixed with the component name (e.g. `generated/DsAlert.contract.ts`). When subcomponents are present, each also receives a `generated/{Sub}.contract.ts` inside its own named subfolder, prefixed with just the subcomponent's own name — see [Subcomponent Contracts](#subcomponent-contracts) below.

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

## Slots and Visibility

When `variants.yaml` is present alongside `api.yaml`, the contract also emits a `Slots` interface and a `SlotRules` const describing which anatomy elements are content-injection points and when each one renders. Slots come from anatomy `slot` elements (unknown content, typed `unknown`) and bound `text` elements (string content, typed `string`). Without `variants.yaml`, slot output is omitted — the contract falls back to props and defaults only.

```ts
export interface DsAlertSlots {
  body: string;
  action?: unknown;
}

export type DsAlertSlotVisibility =
  | { kind: 'always' }
  | { kind: 'whenTrue'; prop: keyof DsAlertProps }
  | { kind: 'whenNotNull'; prop: keyof DsAlertProps }
  | { kind: 'whenValue'; prop: keyof DsAlertProps; value: string };

export const DsAlertSlotRules = {
  body: { kind: 'always' },
  action: { kind: 'whenNotNull', prop: 'onDismiss' },
} satisfies Record<keyof DsAlertSlots, DsAlertSlotVisibility>;
```

A slot is required (non-optional in `Slots`) only when its rule is `always`. The four rule kinds:

| Kind | Meaning |
|------|---------|
| `always` | The slot is always present. |
| `whenTrue` | Present when the named boolean prop is `true`. |
| `whenNotNull` | Present when the named prop is not `null`/`undefined`. |
| `whenValue` | Present when the named prop equals a specific value. |

`SlotRules` is consumed by the [`react` transformer](/cli/transforms/react/) to gate rendering of the corresponding element. Rules inferred with a caveat (e.g. a controlling prop identified heuristically rather than from an explicit spec binding) carry an inline comment on their `SlotRules` entry.

## Config

No transformer-specific options. Prop omission for browser-driven states comes from the [`figma.states`](/settings/states/) convention in `config/conventions.yaml`.

```yaml
# config/conventions.yaml
figma:
  states:                # optional — omit to retain all props in contracts
    hover:
      prop: state
      value: hover
    disabled:
      prop: isDisabled
```

```yaml
# config/pipeline.yaml
transformers:
  - name: contract
```

When the `states` convention is absent, all props from `api.yaml` appear in the generated interface. When present, props mapped to browser-driven concepts (`hover`, `active`, `focus`, `focus-within`, etc.) are omitted — the browser fires these without the application setting them.

## Subcomponent Contracts

When subcomponents are present in `api.yaml`, each receives a `generated/{Sub}.contract.ts` inside its own named subfolder. The subfolder name is the subcomponent's key in the spec (e.g. `group`, `item`), and the filename prefix is just that subcomponent's own PascalCase name — the folder already disambiguates it from the parent, so the file prefix doesn't repeat the parent name. The TypeScript interface and enum type names inside the file are the exception: those are prefixed by both component and subcomponent, since they need to stay unique if ever imported side by side.

```
dsActionList/
  generated/
    DsActionList.contract.ts    ← parent (DsActionListProps, DsActionListDefaults)
  group/
    generated/
      Group.contract.ts         ← subcomponent (DsActionListGroupProps, DsActionListGroupDefaults)
  item/
    generated/
      Item.contract.ts          ← subcomponent (DsActionListItemProps, DsActionListItemDefaults)
```

The parent contract file only includes the parent component's own types — subcomponent types do not appear in it. Configure subcomponent discovery in the [`figma.subcomponents`](/settings/subcomponents/) convention.

## See Also

- [Transforms overview](/cli/transforms/)
- [`figma.states` convention](/settings/states/) — classify which props are browser-driven vs consumer-controlled
- [`css` transformer](/cli/transforms/css/)
- [`react` transformer](/cli/transforms/react/) — consumes `Slots`/`SlotRules` to gate element rendering
- [`stories` transformer](/cli/transforms/stories/)
