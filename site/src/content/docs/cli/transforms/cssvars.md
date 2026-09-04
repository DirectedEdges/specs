---
title: "cssvars"
description: "Emit CSS variable definitions for your library's tokens, styles, and modes"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge experimental-badge">Experimental</span>')</script>

Emits the CSS variable definitions that the [`css`](/cli/transforms/css/) transform's `var(--…)` references resolve against — variables, text styles, effect styles, fill styles, and collection modes — from your fetched library data. Together, `css` + `cssvars` produce stylesheets that render with no hand-maintained token files.

Unlike the per-component transformers, `cssvars` is **library-level**: it runs once per transform pass and writes a single folder at the root of the output directory, alongside library-level folders like `_images/`.

## Use When

- You want generated stylesheets to actually render — every `var(--…)` reference defined by generated output.
- You want mode switching (light/dark, brand themes) driven by your Figma variable collections.
- You want Storybook or a sandbox to consume tokens without maintaining a parallel token pipeline.

## Invocation

```bash
specs transform cssvars
```

## Output

```
output/
  cssvars/
    cssvars.css   # all variable definitions + mode override blocks
    modes.json    # mode manifest: collection → attribute, mode names, default
```

## What It Emits

- **Variables** — every variable in the fetched data, including subscribed (remote) collections, named `--{collection-name}-{variable-path}` to match the `css` transform's derivation. Aliases resolve to `var()` references; unresolvable aliases (targets outside the fetched payload) are skipped and counted.
- **Collection modes** — each local multi-mode collection gets attribute-scoped override blocks, switched by stamping a data attribute on the root element:

  ```css
  :root[data-theme="dark"] {
    --theme-surface-primary: #000000;
  }
  ```

  `modes.json` describes each switchable collection (`attr`, mode names, default) so a toolbar or theme switcher can be built without parsing the CSS.
- **Text styles** — font shorthands (`--{style-name}: 500 12px/16px "Inter", sans-serif`), plus a `-letter-spacing` companion when present.
- **Effect styles** — one variable per role, matching how the `css` transform applies effect-style references:

  ```css
  --elevation-raised-shadows: 0 4px 4px 0 rgba(0, 0, 0, 0.25);
  --elevation-raised-layer-blur: blur(4px);
  --elevation-raised-background-blur: blur(6px);
  ```

  Only roles the style actually uses are emitted; the `css` transform applies all three properties with `none` fallbacks, so absent roles are no-ops. Effect fields bound to variables resolve to `var()` references.
- **Fill styles** — a color or CSS gradient function from the style's topmost visible paint.

## Data Requirements

`cssvars` reads the workspace data directory (`dataDirectory` in config) populated by `specs fetch`:

- `{alias}.variables.json` — variable and collection definitions
- `{alias}.file.json` — the file document; style *values* are recovered from nodes that use each style, since the styles endpoint carries no definitions
- `{alias}.styles.json` — style names for published styles

The transform degrades gracefully: without variables data (for example, on plans where the variables endpoint isn't available) it still emits everything recoverable from the file document. Styles no node in the file uses can't be recovered and are reported in the run summary.

## Name Sanitization

Variable and style names pass through the same derivation as the `css` transform, so references and definitions always agree. Characters invalid in CSS custom property names are dropped, and a warning summary with per-name counts prints at the end of the run.

## See Also

- [`css`](/cli/transforms/css/) — the stylesheets these variables resolve
- [tokens config](/settings/tokens/) — control how token references are serialized in spec output
