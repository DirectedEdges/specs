---
title: "react"
description: "Scaffold a working React component from the spec, then seed an authored copy you own"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge experimental-badge">Experimental</span>')</script>

Emits a functioning React component — BEM markup from the merged layout tree, `data-*` variant attributes, ARIA state attributes, and slot/element rendering gated on the visibility rules from the [`contract` transformer](/cli/transforms/contract/). Also seeds a one-time authored copy of that component into your source tree, which the [`stories` transformer](/cli/transforms/stories/) imports.

## Use When

- You want a real, renderable starting point for a component's implementation instead of a blank file.
- You want variant and state markup (data attributes, ARIA) wired up consistently with what the `css` transformer expects.
- You want to iterate on styling and behavior in an authored file that regeneration never touches.

## Invocation

```bash
specs transform react
```

Requires `variants.yaml` — components without it are skipped with a warning, since slot visibility and variant data attributes are both derived from variant data.

## Output

Two distinct outputs, at two distinct locations:

```
dsAlert/
  generated/
    DsAlert.contract.ts
    DsAlert.styles.css
    react/
      DsAlert.scaffold.tsx        ← regenerated every run — do not edit
  src/
    react/
      DsAlert.tsx          ← seeded once, then human-owned — never overwritten
      DsAlert.extensions.css
      DsAlert.proposed.css
```

Every output file — generated and authored alike — is PascalCase-prefixed with the component name (`DsAlert.*`), so filenames stay self-describing wherever they're opened, not just when the containing folder is visible.

**`generated/react/{Component}.scaffold.tsx`** is always current with the spec — it's regenerated on every `specs transform react` run, importing `../{Component}.contract` and `../{Component}.styles.css`. Treat it as a live reference, not something to build on directly.

**`src/react/{Component}.tsx`** is created once, the first time the transformer runs for that component, as a copy of the scaffold with imports rewritten to the authored paths (`../../generated/{Component}.contract`, plus three CSS imports — see below). If the file already exists, it's left untouched. This is the file you actually implement against.

Alongside it, two empty CSS files are seeded the same way (created once, never overwritten):

- **`{Component}.extensions.css`** — styling the spec can't express (non-scriptable behavior, one-off visual details).
- **`{Component}.proposed.css`** — styling you're trying out with an eye toward promoting it back into the spec.

The authored component imports all three stylesheets in order: `../../generated/{Component}.styles.css`, then `./{Component}.proposed.css`, then `./{Component}.extensions.css` — so authored overrides win over generated defaults.

## Example Output

Given an Alert with a `severity` enum prop, a `dismissible` boolean, and a `body` slot rendered `always`:

```tsx
// Authored component — seeded once by `specs transform`, never overwritten.
// The always-current generated reference lives at ../../generated/react/DsAlert.scaffold.tsx.
import * as React from 'react';
import '../../generated/DsAlert.styles.css';
import './DsAlert.proposed.css';
import './DsAlert.extensions.css';
import { DsAlertDefaults, type DsAlertProps } from '../../generated/DsAlert.contract';

export interface DsAlertScaffoldProps extends DsAlertProps {
}

// Explicit `undefined` props must not override defaults.
function definedProps<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

export function DsAlert(props: DsAlertScaffoldProps) {
  const p = { ...DsAlertDefaults, ...definedProps(props) } as DsAlertScaffoldProps;
  return (
    <div
      className="ds-alert"
      data-severity={p.severity}
      {...(p.dismissible ? { 'data-dismissible': '' } : {})}
    >
      <span className="ds-alert__body">{p.body}</span>
    </div>
  );
}
```

## Rendering Rules

- **Root element** gets the component's kebab-cased class, every variant prop as a `data-*` attribute (boolean props use presence attributes, string/enum props use value attributes), and ARIA attributes for any prop classified in the [`figma.states`](/settings/states/) convention whose selector resolves to an `aria-*` attribute.
- **Child elements** get the `__element` BEM suffix, matching the `css` transformer's selectors.
- **Slot-typed elements** with a `slot` type surface as an additional `React.ReactNode` prop on `{Component}ScaffoldProps` (not in the spec-derived `Props` interface itself), rendered as `{p.slotName}`.
- **Text elements** bound to a prop render `{p.propName}`; text elements with static spec content render that content verbatim (escaped for JSX).
- **Instance elements** (nested component references) render as a placeholder comment — instance slot rendering isn't implemented yet.
- **Visibility** combines the slot's `SlotRules` entry (from the contract) with any inferred structural condition (an element present in some variant layouts but not others), AND'd together. An element with no rule and no inferred condition always renders.

## Config

No transformer-specific options today.

```yaml
# config/pipeline.yaml
transformers:
  - name: contract
  - name: css
  - name: react
```

## Subcomponent Output

Each subcomponent gets its own `generated/react/{Subcomponent}.scaffold.tsx` and its own seeded `src/react/{Subcomponent}.tsx` + CSS pair, following the same rules as the parent, scoped under the subcomponent's named subfolder. As with `contract` and `css`, the subcomponent's generated and authored files are prefixed with just its own name — the folder already disambiguates it from the parent.

## See Also

- [Transforms overview](/cli/transforms/)
- [`contract` transformer](/cli/transforms/contract/) — Props, Slots, and SlotRules consumed here
- [`css` transformer](/cli/transforms/css/) — stylesheet imported by both the generated and authored component
- [`stories` transformer](/cli/transforms/stories/) — imports the authored component, not the generated scaffold
