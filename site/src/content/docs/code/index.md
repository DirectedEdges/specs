---
title: "What gets emitted"
description: "The files specs react and specs webcomponents write for every component, and what each one is for"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge experimental-badge">Experimental</span>')</script>

[`specs react`](/cli/commands/react/) and [`specs webcomponents`](/cli/commands/webcomponents/) each emit a target whole. A component is not a file — it is a small set of files that only make sense together, and these pages describe them one at a time.

## The set

| File | Page | What it is |
|---|---|---|
| `contract.ts` | [contract](/code/contract/) | The props interface, the enums those props draw from, and a defaults constant. Shared by both targets. |
| `scaffold.tsx` / `scaffold.ts` | [scaffold](/code/scaffold/) | The working component — markup, variant attributes, conditional slots, subcomponent calls. |
| `styles.css` / `host.css` + `light.css` | [styles](/code/styles/) | The stylesheet the scaffold imports: one rule per anatomy element, variant selectors, token `var()` references. |
| `stories.tsx` / `stories.ts` | [stories](/code/stories/) | Storybook CSF — controls typed from the contract, a story per variant axis, a sticker sheet. |
| `cssvars.css` + `modes.json` | [cssvars](/code/cssvars/) | Library-level custom properties the stylesheets resolve against. Written once, shared by both targets. |

Two more files appear when a component earns them: `metadata.ts` (slot shapes and visibility rules) when the component has slots, and `api.ts` (tag, parts, element-tag map) for every Web Components root. Both are covered on the [contract](/code/contract/) page, because they are the same job — declaring the surface — for a different consumer.

## Where they land

The directory is named for the component, so the files inside it do not repeat the name.

```
react/
├── src/
│   ├── _runtime.ts                 shared helpers, one per tree
│   └── components/
│       └── Checkbox/
│           ├── contract.ts
│           ├── metadata.ts
│           ├── scaffold.tsx
│           ├── styles.css
│           ├── stories.tsx
│           └── Control/            a subcomponent, nested as its spec is
│               └── …

webcomponents/
└── src/
    ├── _runtime.ts
    └── components/
        └── Checkbox/
            ├── contract.ts
            ├── metadata.ts
            ├── api.ts
            ├── scaffold.ts
            ├── host.css
            ├── light.css
            ├── stories.ts
            └── Control/
                └── …

assets/
└── cssvars/
    ├── cssvars.css
    └── modes.json
```

A subcomponent is emitted as completely as a component — its own contract, stylesheet and stories — in its own directory under the parent, following the same rule.

## Regenerated, and what isn't

Every file on this page opens with a `Generated. Do not edit` header, and every run overwrites it. Nothing here is a starting point you edit in place.

The seam is a sibling: an authored `component.tsx` (React) or `component.ts` (Web Components) is never written by a command, and when it exists it is what the stories import instead of the scaffold. That is where an implementation the spec cannot express belongs.

`_runtime.ts` is written once per tree rather than per component — prop-splitting and glyph-URL helpers the scaffolds import. It is generated too.

## What decides the content

| Read from | Decides |
|---|---|
| `specs/<component>/api.yaml` | props, enums, anatomy, roles, actions, subcomponents |
| `specs/<component>/variants.yaml` | the layout tree, per-variant styling, slot visibility |
| `specs/<component>/examples.yaml` | instance and slot-content examples, for stories |
| `config/conventions/<platform>.yaml` | naming and emission conventions for that target |
| `config/conventions/specs.yaml` | state classification, accessibility and value props |

A component with no `variants.yaml` is skipped with a warning rather than emitted empty — slot visibility and variant attributes both come from variant data.

The [scaffold](/code/scaffold/#source) page shows one component in both surfaces — the annotated Figma layers, and the `anatomy` block `specs generate` writes from them.

## See Also

- [`react`](/cli/commands/react/) and [`webcomponents`](/cli/commands/webcomponents/) — the commands, their options, and the free/Pro seams
- [Roles](/roles/) — what a role changes about the element emitted and the props declared
