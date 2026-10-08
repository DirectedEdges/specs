---
title: "testing visual"
---

<script>document.querySelector('#_top').insertAdjacentHTML('beforeend',' <span class="sl-badge experimental-badge">Experimental</span>')</script>

Visual testing over your emitted Storybook, against two baselines. **Fidelity** diffs every variant's render against a Figma export of the same node — does the code match the design? **Regression** diffs against the renders you last accepted — did this regeneration change anything? Both components and compositions are covered, stored separately so a shared name cannot collide.

The CLI never ships or installs a browser: `init` writes a `package.json` that declares Playwright, pixelmatch and pngjs, and you run the one install in your own workspace.

## Usage

```bash
specs testing visual init                      # scaffold testing/visual/, once
specs testing visual manifest [--check]        # payloads + specs + contracts → manifest
specs testing visual status                    # which baselines exist
specs testing visual baseline                  # capture Figma exports — only when you ask
specs testing visual shoot                     # screenshot the running Storybook
specs testing visual diff [--against accepted] # score pairs, write the report
specs testing visual accept --components …     # promote renders into the regression baseline
specs testing visual                           # = shoot → diff
```

Every form accepts `--config <path>`, and the per-spec stages accept `--components <keys...>`.

## Stages and what they cost

Each stage is its own subcommand because each has a different cost — tuning a tolerance must cost seconds, not a browser run:

| Stage | Cost | Needs network | Needs browser |
|---|---|---|---|
| `init` | instant | — | — |
| `manifest` | seconds | — | — |
| `status` | instant | — | — |
| `baseline` | slow, rate-limited | **Figma REST** | — |
| `shoot` | minutes | — | **Playwright** |
| `diff` | seconds | — | — |
| `report` | instant | — | — |
| `accept` | instant | — | — |

## `specs testing visual init`

Writes `testing/visual/package.json` declaring the dependencies and prints the install:

```bash
cd testing/visual && npm install && npx playwright install chromium
```

`--force` rewrites the scaffold's own files only — it never touches `visual-ignore.yaml` or anything else you keep beside them. Everything except `shoot` works with nothing installed.

## `specs testing visual manifest`

For every spec carrying a Figma source node, locates the node in your fetched payload, enumerates its variant children, and precomputes which story answers for each variant. A component yields one pair per variant; a composition is a single frame and yields exactly one.

Prop mapping is declared, never guessed. A Figma prop maps through the spec's declared Figma name, else its camelCase form when that key exists — anything else lands in a reported unmapped list.

### `--check`

Dry run: report mapping problems and write nothing. **Drive this to zero before trusting a library's numbers** — an unmapped prop defers every variant that uses it.

## `specs testing visual baseline`

Captures Figma exports for shootable variants over the REST images API, 50 nodes per request, PNG at scale 2. Needs `FIGMA_TOKEN` in the environment or the workspace `.env`.

**Capture never runs implicitly.** It is not part of the bare command, no watcher triggers it, and `specs build` / `specs run` never invoke it — it is slow, rate-limited, and spends your API quota, so it runs only when you name it. Without `--components` it captures everything missing; `--force` recaptures its scope. There is no mode that guesses what changed.

Each capture records when it happened and when the payload it read was fetched, so a report can show that a baseline predates the design — provenance you can read, never a trigger.

## `specs testing visual shoot`

Screenshots the running Storybook for every shootable variant on a pool of parallel pages. Needs the Storybook up ([`specs storybook dev`](/cli/commands/storybook/)) and the customer-installed Playwright.

Renders are pinned to each variant's authored width — Figma constrains a fill root by the frame it sits in, and Storybook has no equivalent. Compositions pin height too when the frame's vertical sizing is fixed. The [measurement guide](/guides/visual-testing-measurement/) explains both rules and why the obvious alternatives measure worse.

| Flag | Effect |
|---|---|
| `--workers <n>` | Parallel pages (default 8) |
| `--port <port>` | Storybook port (default: read from the scaffolded npm script) |
| `--target react\|webcomponents` | Which emitted tree's stories to shoot (default react) |

If the running Storybook's index doesn't match the manifest, the shoot says so — a stale server measures the old code and would read as a pass.

## `specs testing visual diff`

Scores every baseline/render pair and writes the report. Both images are flattened onto a shared opaque canvas before comparison, then pixel-diffed. A pair passes when its dimensions match within tolerance **and** its pixel difference is at or under the pass threshold — dimension deltas are reported separately as first-class signal.

| Flag | Effect |
|---|---|
| `--against figma` | Fidelity: diff against Figma exports (default) → `report/fidelity.{json,md}` |
| `--against accepted` | Regression: diff against the renders you accepted → `report/regression.{json,md}` |

Each mode keeps its own report, so running one never overwrites the other, and each chains its improvement deltas against its own history. Scoped runs merge: only the named specs' rows are replaced, and each row keeps its prior summary for the delta column.

**Composition results are informational.** A page is built from components, so when a component is off, every page using it looks off too — composition rows report with full pixel counts but never decide the exit status. Fix the components first.

This is the only stage that reads `visual-ignore.yaml`, so a tolerance edit re-scores in seconds with no browser.

### `visual-ignore.yaml`

The one place a workspace states what its own fixtures cannot settle:

```yaml
$defaults:
  passPct: 3            # Chrome and Figma never rasterize identically
  dimTolerancePx: 4

components:
  button:
    passPct: 6
    note: letterform-only noise until licensed fonts land
  card:
    skipVariants:
      - Elevated: "True"
    note: Figma exports include shadow bounds; the crop doesn't

compositions:
  homeSmall:
    skip: true
    note: awaiting image fixtures
```

Flat top-level keys (the pre-kind shape) still work and apply to components.

| Key | Read by | Effect |
|---|---|---|
| `passPct` | diff | Pixel-diff percentage at or under which a pair passes |
| `dimTolerancePx` | diff | Allowed width/height delta, in baseline (2×) pixels |
| `threshold` | diff | Per-pixel colour threshold — rarely touched |
| `skip: true` | diff | Not scored at all; pairs report ignored, neither pass nor fail |
| `skipVariants` | diff | Figma configurations to skip, matched exactly |
| `note` | diff | **Required** on every entry — see below |
| `sampleVariants: N` | **manifest** | Cap a spec at N variants on an even stride |
| `pinWidth: false` | **manifest** | Opt out of the render width pin |

Which stage reads a key matters: the scoring keys take effect on a re-diff alone; the manifest keys need a rebuild and a re-shoot before they mean anything.

Every entry needs a `note:` saying why — these entries suppress real signal, and the note is what separates a permanent measurement fact from a temporary allowance. An entry without one earns a warning, because it is indistinguishable from a bug someone hid.

## `specs testing visual accept`

Promotes the current run's renders into `accepted/` — the regression baseline. Scope is explicit (`--components <keys...>` or `--all`); promoting everything silently would bless renders nobody reviewed.

There is no accepting in fidelity mode, by construction: the Figma export *is* the design, and a render that disagrees with it is wrong by definition. `accept` writes only the accepted tree and can never touch a Figma baseline.

## Reports and the Storybook pages

`diff` writes machine-readable JSON and a ranked markdown view per mode under `testing/visual/report/`. When a report exists, [`specs storybook`](/cli/commands/storybook/) publishes its page — **Testing → Fidelity to Figma** and **Testing → Changes vs Accepted** — each reading its report live, so a re-diff updates the open page on reload. Every failing pair carries a baseline | render | diff composite image, the unit of diagnosis.

Ranking comes from [`specs analyze dependencies`](/cli/commands/build/): graph leaves first, because fixing a leaf shrinks every diff downstream of it. Without the analysis the report still works; every spec just ranks at unknown depth.

## On disk

```
testing/visual/
├── package.json          your install: playwright, pixelmatch, pngjs
├── manifest.json
├── visual-ignore.yaml    yours — scoring judgments, each with its note
├── figma/<kind>/<key>/   Figma exports + .capture.json   (durable, local)
├── accepted/<kind>/<key>/  renders you promoted           (regression baseline)
├── render/<kind>/<key>/  this run                        (rebuilt on demand)
├── diff/<kind>/<key>/    masks + composites              (rebuilt on demand)
└── report/               fidelity.{json,md}, regression.{json,md}
```

`<kind>` is `components` or `compositions` — a component and a composition may share a name, and the kind directory is what keeps their baselines apart.
