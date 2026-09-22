---
title: "cssvars"
description: "The library-level CSS custom properties every emitted stylesheet resolves against"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge experimental-badge">Experimental</span>')</script>

Every `var(--…)` an emitted [stylesheet](/code/styles/) references is defined here: variables, text styles, effect styles, fill styles, and mode override blocks, derived from your fetched library data. Together they render with no hand-maintained token file anywhere in the loop.

Unlike everything else on these pages, this is library-level — written once per run, not once per component, into `assets/cssvars/` at the workspace root.

```
assets/
└── cssvars/
    ├── cssvars.css    all variable definitions + mode override blocks
    └── modes.json     collection → attribute, mode names, default
```

It is platform-neutral and identical whichever target produces it, so `specs react` and `specs webcomponents` write the same file. Running both is not a conflict; the second write is a no-op when the content matches. A scoped run (`--components`) writes nothing here — a subset of components cannot have invalidated the library's tokens.

## What it emits

| Kind | Emitted as |
|---|---|
| Variables | `--{collection-name}-{variable-path}`, matching the stylesheet's derivation exactly. Aliases resolve to `var()` references; aliases pointing outside the fetched payload are skipped and counted |
| Collection modes | Attribute-scoped override blocks per local multi-mode collection |
| Text styles | A font shorthand, plus a `-letter-spacing` companion when present |
| Effect styles | One variable per role the style uses — shadows, layer blur, background blur |
| Fill styles | A color or CSS gradient function, from the style's topmost visible paint |

```css
:root {
  --color-surface-primary: var(--palette-neutral-100);
  --body-small: 400 12px/16px "Inter", sans-serif;
  --elevation-raised-shadows: 0 4px 4px 0 rgba(0, 0, 0, 0.25);
}

:root[data-theme="dark"] {
  --color-surface-primary: #000000;
}
```

Only the effect roles a style actually uses are emitted. The stylesheet applies all three with `none` fallbacks, so an absent role is a no-op rather than a break.

## Modes

`modes.json` describes each switchable collection — its attribute, its mode names, its default — so a theme toolbar can be built without parsing the CSS.

```json
{
  "Color": { "attr": "data-color", "modes": ["Light", "Dark"], "default": "Light" },
  "Space": { "attr": "data-space", "modes": ["Cozy", "Compact"], "default": "Cozy" }
}
```

Switching a mode is stamping the attribute on the root element. Nothing re-renders and no component knows it happened.

## What it reads

The workspace data directory (`dataDirectory` in config), populated by [`specs fetch`](/cli/commands/fetch/):

| File | For |
|---|---|
| `{alias}.variables.json` | variable and collection definitions |
| `{alias}.file.json` | style *values*, recovered from nodes that use each style — the styles endpoint carries no definitions |
| `{alias}.styles.json` | names for published styles |

It degrades rather than failing. Without variables data — on a plan where the variables endpoint is unavailable — it still emits everything recoverable from the file document. A style no node in the file uses cannot be recovered, and is reported in the run summary.

## Name sanitization

Names pass through the same derivation the stylesheets use, so a reference and its definition always agree. Characters invalid in a CSS custom property name are dropped, and a warning summary with per-name counts prints at the end of the run.

## See Also

- [styles](/code/styles/) — the stylesheets these variables resolve
- [`fetch`](/cli/commands/fetch/) — populates the data these are derived from
- [tokens setting](/settings/tokens/) — how token references are serialized in spec output
