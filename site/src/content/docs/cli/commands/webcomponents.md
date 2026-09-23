---
title: "webcomponents"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge experimental-badge">Experimental</span>')</script>

Emits the Web Components target: a Lit custom element for every spec, its contract, its element API, its stylesheets, and its Storybook stories — into `webcomponents/`, a directory shaped like the package it could become.

The peer of [`react`](/cli/commands/react/), and deliberately the same shape. What differs is only what genuinely differs between the platforms.

## Usage

```bash
specs webcomponents [options]
```

No arguments. The target is the command.

## What it writes

Two trees: its own, and the shared assets every target uses.

```
webcomponents/
├── src/
│   ├── _runtime.ts                 shared helpers, one per tree
│   └── components/
│       └── ActionList/
│           ├── contract.ts         props, defaults, enums
│           ├── metadata.ts         slot shapes and rules, when it has slots
│           ├── api.ts              tag name, parts, element-tag map
│           ├── scaffold.ts         the custom element
│           ├── host.css            the host's own styling
│           ├── light.css           light-DOM styling for slotted content
│           ├── stories.ts          Storybook CSF
│           └── Item/               a subcomponent, nested as its spec is
│               ├── contract.ts
│               ├── metadata.ts
│               ├── scaffold.ts
│               ├── host.css
│               ├── light.css
│               └── stories.ts
└── …

assets/
└── cssvars/
    ├── cssvars.css
    └── modes.json
```

A subcomponent is emitted as completely as a component, minus the element API: its tag is namespaced by its parent, so the parent's `api.ts` carries it. The directory is already named for the component, so the files inside it do not repeat the name.

`assets/cssvars/` holds the same platform-neutral custom properties [`react`](/cli/commands/react/) writes. Whichever target runs produces it; running both is not a conflict.

Storybook glue lands in `storybook/lib/`, not here. A Lit element renders inside a React Storybook through a small React host component — which belongs to the Storybook project, because a Lit component library has no business importing React for a harness it never uses at runtime.

## Each file in detail

| File | What it carries |
|---|---|
| [`contract.ts`](/code/contract/) | The props interface, the enums those props draw from, and a defaults constant — byte-for-byte what [`react`](/cli/commands/react/) emits |
| [`metadata.ts`](/code/contract/#metadatats) | Slot shapes and the visibility rule governing each — emitted only when the component has slots |
| [`api.ts`](/code/contract/#apits) | The custom-element surface: tag name, the `::part()` names, and the `HTMLElementTagNameMap` entry |
| [`scaffold.ts`](/code/scaffold/) | The Lit element: reflected properties, `part`-annotated markup from the merged layout tree, conditional slots |
| [`host.css`](/code/styles/) and [`light.css`](/code/styles/#the-web-components-split) | The element's own styling, and the styling for content a consumer slots in |
| [`stories.ts`](/code/stories/) | Storybook CSF: controls typed from the contract, a story per variant axis, a sticker sheet |
| [`cssvars.css`](/code/cssvars/) | The library's custom properties — what every `var()` above resolves against |

Every one of them opens with a `Generated. Do not edit` header and is overwritten on each run. The seam for code you own is a sibling `component.ts`, which no command writes and the stories import instead of the scaffold when it exists. [What gets emitted](/code/) covers all of it.

## Two stylesheets, not one

`host.css` styles the custom element itself. `light.css` styles content a consumer slots into it, which the shadow root cannot reach.

The split is not a preference. A shadow boundary means one stylesheet cannot do both jobs, and a single file would silently fail on whichever side it was not written for.

## Where this differs from React

The custom element **is** the component's root. React can replace a root's tag when a role calls for a native control; this target cannot, because the root is already the element the consumer wrote.

So a root control role emits its semantic element *inside* the shadow root, wrapping the root's content, and the shadow root delegates focus to it. A `button` role produces a real `<button>` there rather than ARIA on the host — `role="button"` buys the announcement and nothing else, while a native element supplies keyboard activation, `:disabled` blocking events, `:focus-visible`, and form participation.

The inner element is styled to nothing and takes no box, so the host keeps the root's layout and appearance exactly as the stylesheet describes them.

A state the role expresses natively lives on that inner element, out of reach of any `:host()` selector — and a host is not a form control, so `:host(:disabled)` cannot match either. The host therefore carries a plain styling attribute for the concept, so the stylesheet still has something to select. See [precedence](/roles/precedence/).

## Options

Identical to [`react`](/cli/commands/react/):

### `--components <keys...>`

Only emit the named component folders. Unknown keys warn and are skipped. Scoped runs skip library-level output.

### `--no-stories`

Emit the element, its contract, its API and its stylesheets, but no Storybook stories.

### `--watch`

Watch the specs directory and re-emit on every change. Debounced, non-overlapping, and a failed component is logged rather than fatal. Same behaviour as [`react --watch`](/cli/commands/react/#--watch), including re-emitting the whole set on every change.

```bash
specs webcomponents --watch
```

### `-o, --output <path>`

The specs directory to read from. Defaults to `spec.directory` in `config/settings.yaml`.

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
| `config/conventions/web-components.yaml` | this platform's conventions |
| `config/conventions/specs.yaml` | state classification, accessibility and value props |

A component with no `variants.yaml` is skipped with a warning rather than emitted empty.

## Free and Pro

The same seams as [`react`](/cli/commands/react/): the element, its contract, its API, its stylesheets and its stories are free; composition, glyphs, background images, compound stories, sticker sheets, roles and actions are licensed.

## See Also

- [react](/cli/commands/react/) — the peer target
- [What gets emitted](/code/) — each artifact in detail
- [Roles](/roles/) — and [precedence](/roles/precedence/) for how a shadow host carries state
