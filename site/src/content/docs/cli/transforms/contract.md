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

Each component subfolder receives a `contract.ts` file.

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

No transformer-specific options. Controls which transformers run:

```yaml
config:
  transform:
    transformers:
      - name: contract
```

## See Also

- [Transforms overview](/specs/cli/transforms/)
- [`css` transformer](/specs/cli/transforms/css/)
- [`styling` transformer](/specs/cli/transforms/styling/)
