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
│   ├── _runtime.ts                           shared helpers, one per tree
│   └── components/
│       └── ActionList/
│           ├── ActionList.scaffold.tsx       the component
│           ├── ActionList.contract.ts        props, defaults, enums
│           ├── ActionList.styles.css         the stylesheet the scaffold imports
│           ├── ActionList.stories.tsx        Storybook CSF
│           └── Item/                         a subcomponent, nested as its spec is
│               ├── Item.scaffold.tsx
│               ├── Item.contract.ts
│               ├── Item.metadata.ts          slot shapes and rules, when it has slots
│               ├── Item.styles.css
│               └── Item.stories.tsx
└── …

assets/
└── cssvars/
    ├── cssvars.css                           the library's CSS custom properties
    └── modes.json
```

A component directory is named in PascalCase, from the spec folder's own spelling. Subcomponents nest beneath their parent exactly as their specs nest beneath the parent's spec folder, so the two trees read the same way, and a subcomponent is emitted as completely as a component — its own contract, stylesheet and stories.

`assets/cssvars/` comes from the Figma variables and styles the specs reference. It is platform-neutral and identical whichever target produces it, so [`webcomponents`](/cli/commands/webcomponents/) writes the same file. Running both is not a conflict; the second write is a no-op when the content matches.

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
- [What gets emitted](/cli/transforms/) — each artifact in detail
- [Roles](/roles/) — what a role changes about the emitted component and its contract
- [states convention](/settings/states/) — which prop carries which state concept
