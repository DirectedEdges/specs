---
title: Visual Testing Measurement Rules
---

How [`specs testing visual`](/cli/commands/testing/) decides what to measure, and why two of its rules are the opposite of the obvious choice. Both were settled by measurement, not argument — if you are about to narrow a pin or loosen a crop, the change you are considering has probably been tried, and the numbers are here.

## Rule 1 — Every render is pinned to its authored width

In Figma, a fill-width node is constrained by the frame it sits in. Storybook has no equivalent frame, so an unpinned fill root stretches to the preview viewport and the diff measures the canvas, not the component. The shoot therefore injects the variant's authored width onto the render before measuring.

**The obvious refinement — pin only fill roots — was implemented and reverted.** A hug root sizes itself, so pinning it looks wrong. Measured across two full fixture catalogues:

| Fixture | Pin everything | Pin fill only |
|---|---|---|
| A | 350 pass / 320 fail | 324 pass / 346 fail |
| B | 140 pass / 113 fail | 135 pass / 118 fail |

Every regressed component was a hug one. The pin was quietly absorbing fallback-font width drift: without the licensed fonts installed, hug widths render wider than the design, and unpinned that drift lands as dimension failures across the whole catalogue. The wrap risk the refinement worried about is real but far rarer than the benefit.

`pinWidth: false` in `visual-ignore.yaml` remains the escape hatch for a component that genuinely renders truest unpinned. Do not reach for it to fix a width complaint on text — that returns the component to measuring the viewport.

## Rule 2 — A width gap on text is usually a cropping convention

After pinning, text can still show a small width difference while its pixels agree almost exactly. That is not fonts and not the transform:

- Figma trims a text export to the glyphs' **ink bounds**
- the shoot crops the render to the **element's box**

The difference is the node's trailing space — the two sides agree on the picture and disagree on where it ends. Absorb it with `dimTolerancePx`, and give the entry a `note:` saying it is a measurement fact, not a defect.

## Rule 3 — Compositions pin width always, height only when fixed

A composition is a frame placed directly on a page, so its width is always fixed — the width pin applies unconditionally. Height follows the frame's own sizing: a fixed-height frame pins, so vertical overflow shows up as visible pixels; a hugging frame keeps its natural height, so content-driven growth is not punished as a dimension mismatch.

## Rule 4 — Pass thresholds have a floor, and it is above zero

Chrome and Figma never rasterize identically — anti-aliasing alone separates them. A workspace that leaves `$defaults.passPct` unset falls through to a floor below what the two renderers can agree on, and the same component then reads green in one workspace and red in another for no reason in the code. Set the default deliberately, and expect to retune it when the rendering engine changes: a browser upgrade can push near-the-bar components over it with dimensions still exact.

## Reading a failure

| Signature | Usually means |
|---|---|
| Dimensions exact, diff % just over the bar | Rasterization/letterform noise — check whether the bar predates a browser or font change |
| Dimensions exact, diff % very high (80%+) | Content mismatch — the right-sized box is showing different content, typically images |
| Width off, pixels near 0% | The ink-bounds cropping convention (Rule 2) |
| Height short, width exact, pixels under the bar | The design frame holds more vertical space than the component ships — reported as its own category, not failed |
| Render far wider than the design | A pin that did not apply — check `pinWidth` and the manifest |

Every failing pair carries a baseline | render | diff composite in the report. Read the composite before the numbers — it answers most of these in one glance.
