---
title: "react"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge experimental-badge">Experimental</span>')</script>

Emits the React target: a working component for every spec, its contract, its stylesheet, and its Storybook stories — into `react/`, a directory shaped like the package it could become.

Everything one component needs is written together, because everything it needs is decided together. A role annotated in Figma changes the element the scaffold emits, the props its contract declares, and the user-agent styling its CSS resets. Those were once three transformers you had to name in the right order; they are one command.

## Usage

```bash
specs react [options]
```

No arguments. The target is the command.

## What it writes

Two trees: its own, and the shared assets every target uses.

```
react/
├── src/
│   ├── _runtime.ts                 shared helpers, one per tree
│   └── components/
│       └── ActionList/
│           ├── contract.ts         props, defaults, enums
│           ├── metadata.ts         slot shapes and rules, when it has slots
│           ├── scaffold.tsx        the component
│           ├── styles.css          the stylesheet the scaffold imports
│           ├── stories.tsx         Storybook CSF
│           └── Item/               a subcomponent, nested as its spec is
│               ├── contract.ts
│               ├── metadata.ts
│               ├── scaffold.tsx
│               ├── styles.css
│               └── stories.tsx
└── …

assets/
└── cssvars/
    ├── cssvars.css                           the library's CSS custom properties
    └── modes.json
```

A component directory is named in PascalCase, from the spec folder's own spelling. Subcomponents nest beneath their parent exactly as their specs nest beneath the parent's spec folder, so the two trees read the same way, and a subcomponent is emitted as completely as a component — its own contract, stylesheet and stories.

The directory is already named for the component, so the files inside it do not repeat the name.

`assets/cssvars/` comes from the Figma variables and styles the specs reference. It is platform-neutral and identical whichever target produces it, so [`webcomponents`](/cli/commands/webcomponents/) writes the same file. Running both is not a conflict; the second write is a no-op when the content matches.

## Each file in detail

| File | What it carries |
|---|---|
| [`contract.ts`](/code/contract/) | The props interface, the enums those props draw from, and a defaults constant. Both targets emit it identically |
| [`metadata.ts`](/code/contract/#metadatats) | Slot shapes and the visibility rule governing each — emitted only when the component has slots |
| [`scaffold.tsx`](/code/scaffold/) | The working component: BEM markup from the merged layout tree, `data-*` variant attributes, ARIA state attributes, conditional slots, subcomponent calls |
| [`styles.css`](/code/styles/) | A rule per anatomy element, token references as `var()`, a selector per variant, and structural presence and stacking fixes |
| [`stories.tsx`](/code/stories/) | Storybook CSF: controls typed from the contract, a story per variant axis, a sticker sheet |
| [`cssvars.css`](/code/cssvars/) | The library's custom properties — what every `var()` above resolves against |

Every one of them opens with a `Generated. Do not edit` header and is overwritten on each run. The seam for code you own is a sibling `component.tsx`, which no command writes and the stories import instead of the scaffold when it exists. [What gets emitted](/code/) covers all of it.

## Options

### `--components <keys...>`

Only emit the named component folders instead of every component with an `api.yaml`. Unknown keys log a warning and are skipped.

```bash
specs react --components dsAlert dsBadge
```

Scoped runs skip library-level output, since a subset cannot have invalidated it. Nothing writes to `assets/cssvars/` in a scoped run.

### `--no-stories`

Emit the component, its contract and its stylesheet, but no Storybook stories.

For a consumer who does not use Storybook. Stories are part of the target by default because a component you cannot see is hard to trust, and the cost of emitting them is a file nobody has to open.

### `--watch`

Watch the specs directory and re-emit on every change. Changes are debounced (300ms), an emit in flight defers the next one rather than overlapping, and the run continues until interrupted with Ctrl+C.

Every change re-emits the whole set, not the changed component. A spec edit can change what one component imports from another, and a partial re-emit would leave the tree internally inconsistent — which Storybook's HMR serves without complaint. `--components` still narrows the set, and the narrowed set is what re-emits.

A failed component is logged and the watch continues, rather than exiting — the next save may fix it. Only the first pass can exit, and only for a condition that stops it before any component is emitted.

```bash
specs react --watch
```

Pair it with [`render --watch`](/cli/commands/render/#--watch) and a running Storybook to edit a spec and see it land in both Figma and the browser.

### `-o, --output <path>`

The specs directory to read from. Defaults to `spec.directory` in `config/settings.yaml`.

The platform trees are resolved from the workspace root — the parent of the specs directory — so pointing this elsewhere moves both what is read and where output lands, together.

### `--config <path>`

Use a specific `config/` directory.

### `--verbose`

Report each component as it is emitted.

## What it reads

| From | For |
|---|---|
| `specs/<component>/api.yaml` | props, anatomy, roles, actions, subcomponents |
| `specs/<component>/variants.yaml` | the layout tree and per-variant styling |
| `specs/<component>/examples.yaml` | instance and slot-content examples, for stories |
| `config/conventions/react.yaml` | this platform's conventions |
| `config/conventions/specs.yaml` | state classification, accessibility and value props |

A component with no `variants.yaml` is skipped with a warning rather than emitted empty.

## Free and Pro

The component, its contract, its stylesheet and its stories are **free**.

Composition, glyphs, background images, compound stories and sticker sheets require a licence, and free output encodes variant, boolean and text props with one story per variant-prop axis. Roles and actions are also licensed: without one, an annotated spec emits exactly what it would emit unannotated — a container rather than a native control, and no role-derived props in the contract.

## See Also

- [webcomponents](/cli/commands/webcomponents/) — the peer target, same shape
- [What gets emitted](/code/) — each artifact in detail
- [Roles](/roles/) — what a role changes about the emitted component and its contract
- [states convention](/settings/states/) — which prop carries which state concept
