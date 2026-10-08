---
title: "Testing Getting Started"
description: "From nothing to a scored visual report: scaffold, capture, shoot, diff, and read the results."
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge experimental-badge">Experimental</span>')</script>

This walks a workspace from nothing to a scored fidelity report, then sets up the everyday regression loop. It assumes a working workspace: specs generated, a platform tree emitted ([`specs react`](/cli/commands/react/)), and the [Storybook host](/storybook/) scaffolded. The [Overview](/testing/) explains what each stage is for; the [command reference](/cli/commands/testing/) has every flag.

**Quick nav:**
1. [Scaffold and install](#step-1-scaffold-and-install)
2. [Build the manifest](#step-2-build-the-manifest)
3. [Capture Figma baselines](#step-3-capture-figma-baselines)
4. [Shoot and diff](#step-4-shoot-and-diff)
5. [Read the report](#step-5-read-the-report)
6. [Tune the scoring](#step-6-tune-the-scoring)
7. [The regression loop](#step-7-the-regression-loop)

---

## Step 1: Scaffold and install

```bash
specs testing visual init
cd testing/visual && npm install && npx playwright install chromium && cd ../..
```

`init` writes a `package.json` declaring Playwright, pixelmatch and pngjs; the install is yours to run, once. The CLI never ships a browser.

## Step 2: Build the manifest

```bash
specs testing visual manifest --check
```

`--check` is a dry run. It reports every Figma prop it could not map to a spec prop — and an unmapped prop defers every variant that uses it, so **drive this list to zero** (or confirm each entry is expected) before trusting any numbers. Then write it for real:

```bash
specs testing visual manifest
```

## Step 3: Capture Figma baselines

Needs `FIGMA_TOKEN` in your environment or workspace `.env` — the same token [`specs fetch`](/cli/commands/fetch/) uses.

```bash
specs testing visual status          # what would be captured
specs testing visual baseline       # capture everything missing
```

Capture is deliberate and scoped: start with a few components (`--components button badge`) if you want to see the loop work before spending quota on the whole catalog. Baselines are durable — captured once, they stay until you `--force` a recapture.

## Step 4: Shoot and diff

With your Storybook running ([`specs storybook dev`](/cli/commands/storybook/)):

```bash
specs testing visual shoot
specs testing visual diff
```

Or both at once — the bare command is shoot → diff (capture is never part of it):

```bash
specs testing visual
```

## Step 5: Read the report

Open your Storybook's **Testing → Fidelity to Figma** page. Results are ranked with dependency-graph leaves first — fix a leaf and every component built on it improves for free. Click a failing row: its worst variants expand as **baseline | render | diff** composites.

Reading a failure from its numbers:

| Signature | Usually means |
|---|---|
| Dimensions exact, diff % just over the bar | Rasterization noise — Chrome and Figma never paint text identically |
| Dimensions exact, diff % very high | Right-sized box, different content — typically images |
| Width off by a little, pixels near 0% | Figma trims text exports to the glyphs' ink; the render crops to the element box. A cropping convention, not a defect |
| Render far wider than the design | The variant rendered unpinned — check the manifest |

Compositions appear in their own section, informational only — their diffs aggregate their components' diffs, so they never fail the run.

## Step 6: Tune the scoring

`testing/visual/visual-ignore.yaml` is where your workspace records measurement judgments:

```yaml
$defaults:
  passPct: 3            # Chrome and Figma never rasterize identically
  dimTolerancePx: 4

components:
  badge:
    passPct: 8
    note: letterform-only noise until licensed fonts land
  text:
    dimTolerancePx: 48
    note: Figma trims text exports to ink bounds; pixels verify at ~0.04%
```

Scoring keys take effect on a re-diff alone — seconds, no browser:

```bash
specs testing visual diff --components badge
```

Two rules keep the file honest: every entry needs a `note:` saying why (the diff warns otherwise), and prefer the narrowest key — a raised `passPct` over `skipVariants`, `skipVariants` over `skip`, because a skipped component can regress invisibly.

## Step 7: The regression loop

Once fidelity results look right, promote the renders you reviewed:

```bash
specs testing visual accept --all
```

From then on, after any regeneration:

```bash
specs testing visual shoot
specs testing visual diff --against accepted
```

No Figma access, no token, no tolerance tuning — emitted output is deterministic, so an unchanged component diffs at **exactly zero pixels**, and anything nonzero is a real change to review on **Testing → Changes vs Accepted**. Accept the changes you meant; investigate the ones you didn't.
