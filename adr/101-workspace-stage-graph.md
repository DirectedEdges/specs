# ADR: The Workspace Stage Graph

**Branch**: `feature/compositions-cli`
**Created**: 2026-10-06
**Status**: DRAFT
**Summary**: *(written at implementation — see `/specs.adr.implement`)*
**Deciders**: Nathan Curtis (author)
**Supersedes**: *(none — extends ADR-053 `specs transform` and ADR-096 Specs Directory Layout)*

---

## Scope note

This ADR changes **no types and no schema**. It decides a CLI surface and the
dependency model behind it, in the register's established pattern for
command-surface decisions — ADR-053 (`specs transform`) and ADR-098
(`config/conventions/storybook.yaml`). The `packages/schema/` constitution gates
are not engaged; the Type ↔ Schema Impact section records the absence
explicitly rather than omitting it.

---

## Context

A workspace is a chain of artifacts, each derived from the one before it:

```
Figma REST ──► data/ ──► data/*.manifest.md ──► specs/ ──┬──► react/src/
                                                          ├──► webcomponents/src/
                                                          ├──► storybook/content/
                                                          └──► the Figma file (render)
```

Every edge in that chain is real and already enforced by the commands. What is
missing is any place where the chain itself is **written down**. Today it lives
in the order a person types commands:

```bash
specs scan
specs generate
specs react
specs webcomponents
specs storybook publish
```

Two consequences follow, and both are felt daily.

**Staleness is a human sequencing error.** Skip `specs react` after a
`specs generate` and Storybook shows the previous emission. Nothing reports
this; the output looks finished because it *is* finished — for an input two
revisions old.

**`--watch` exists per command, and only per command.** `specs react --watch`,
`specs webcomponents --watch` and `specs render --watch` each watch their own
input. `specs storybook dev` (ADR-098, specs#644) is the only thing that
composes them — it spawns `specs react --watch` and `specs webcomponents --watch`
alongside the Storybook dev server, and says so in its own header comment:

> You run fetch, generate, and renders yourself; this owns everything that reacts.

That boundary is not a design choice so much as the limit of what a
Storybook-scoped command may reasonably claim. `specs storybook dev` cannot
start the chain at `data/`, because it knows about Storybook, not about what
feeds Storybook. The composition belongs one level up.

The gap this ADR closes is the absence of a **declared stage graph** — stages
with named inputs and outputs — and of the two drivers that should run over it:
one that traverses the graph once and exits, and one that traverses it
continuously.

---

## Decision Drivers

- **One graph, one definition.** A one-shot build and a watch loop that disagree
  about what depends on what is two implementations of the dependency model, and
  the second one is always the stale one. The graph is declared once and both
  drivers read it.
- **CI needs a non-zero exit.** The release stack (`release.testing.fullsuite`)
  needs a command that performs the whole chain and fails loudly. A watcher
  cannot serve that role: it never exits.
- **A change enters at one node.** Editing `specs/Alert/api.yaml` must not
  re-scan `data/`. Entry-node resolution is the correctness property that
  distinguishes a stage graph from "run everything again".
- **Nothing in the default path may touch the network or the Figma file.**
  `specs fetch` costs an API budget and a `FIGMA_TOKEN`. `specs render` mutates
  the connected Figma file and can destroy user content with `--overwrite`. An
  orchestrator that reaches either by default is unsafe.
- **The curation manifest is human-authored.** `data/{alias}.manifest.md`
  carries checkboxes a person ticks. Any automatic re-scan risks rewriting a
  human decision; `settings.curation.preserveManualSelections` already governs
  this and must be honoured identically by both drivers.
- **No new schema surface without a need.** Workspace layout is already
  detectable (`storybook/workspace.ts` does it today). A settings key that
  restates what detection can read is surface for nothing.
- **Silent invalidation is undebuggable.** When an orchestrator decides what to
  re-run, a wrong decision is indistinguishable from a transform bug. The plan
  must be printed, not inferred.
- **Entitlement is resolved once per invocation.** One license resolution per
  `specs build`, and one per `specs run` *session* — not once per stage, and
  not once per traversal. Today entitlement is memoised in a process-local
  closure (`createEntitlement`) and bound per package, so every stage that runs
  in its own process pays its own validate call. The license proxy is rate
  limited, and a throttled check is not a verdict: `rate-limited` is a
  `TRANSIENT_STATE`, which the target emitters raise as
  `LICENSE_NOT_VALIDATED` but which `LicenseManager.resolve()` maps to `FREE`.
  An orchestrator that multiplies license calls therefore does not merely waste
  requests — it manufactures silent free-tier output under a valid key. This
  driver constrains the execution model, not just a cache.

---

## Options Considered — Command surface

### Option A: `specs build` (one-shot) and `specs run` (watch) *(Selected)*

Two commands over one graph definition. `build` performs a topological
traversal, prints what it ran, and exits non-zero on the first stage failure.
`run` performs the same traversal once at startup, then watches every stage's
declared inputs and re-traverses from the entry node on change.

**Pros**:
- Satisfies *CI needs a non-zero exit* and *one graph, one definition*
  simultaneously — the thing CI runs and the thing a designer runs are the same
  traversal with different drivers.
- Matches the convention every adjacent tool already set (`vite build` /
  `vite dev`, `tsc` / `tsc --watch`, `turbo run build` / `turbo watch`), so the
  surface needs no explanation.
- Each command's failure semantics are honest: `build` stops; `run` reports the
  failed stage and keeps watching, because the fix is the next file save.

**Cons / Trade-offs**:
- Two help entries where the original request described one.
- The names are not quite symmetric in English — "run" does not obviously mean
  "watch". Addressed in the naming decision below.

---

### Option B: `specs build` with `--watch` *(Rejected)*

One command, a flag selecting the driver.

**Rejected because**: it reads as though watching is a mode of building, and the
two differ in more than persistence — `build` has a terminal node
(`storybook publish` writes and the process ends), while `run` has a *sink* (a
Storybook dev server that stays up and hot-reloads). Those are different graphs
at the last edge, and a flag hides that. The flag also invites
`--no-watch`-shaped drift the moment CI wants different defaults.

---

### Option C: `specs run` only, with `build` as an alias *(Rejected)*

The literal form of the original request: the two are equivalent.

**Rejected because**: it violates *CI needs a non-zero exit*. A command that
sometimes exits and sometimes does not cannot be put in a CI step or a release
script. Aliasing also forfeits the one place the distinction is cheap to teach —
the help text.

---

## Options Considered — Naming

### Option A: `run` and `build` *(Selected)*

**Pros**:
- `specs build` is unambiguous and already the word used for the artifact-
  producing pass in every adjacent toolchain.
- `run` is short, and the command it most resembles — `npm run` — is the one a
  person types to start a long-lived process.

**Cons / Trade-offs**:
- `specs storybook dev` keeps its own name, so the workspace has both `run` and
  `dev` meaning "watch". The ADR accepts this: `dev` is scoped to a subcommand
  that only starts Storybook, and renaming it would break a surface shipped in
  ADR-098.

---

### Option B: `dev` and `build` *(Rejected)*

**Rejected because**: it is the more consistent pair in isolation, but `specs dev`
and `specs storybook dev` differing only by scope is a worse collision than two
distinct words. It would also be a rename of a shipped command if the subcommand
were to follow.

---

## Options Considered — How the graph is declared

### Option A: Derived from workspace detection *(Selected)*

The graph is a constant in the CLI. Which of its stages are *active* in a given
workspace is read from the filesystem, exactly as `resolveWorkspace()` already
does — `react/src` exists → the react stage is active; `storybook/.storybook`
exists → the publish stage is active; a configured source with `fetch: [file]`
→ scan and generate have an input.

```yaml
# No new settings. The workspace already says what it is:
#   data/ds.file/            → scan has an input
#   data/ds.manifest.md      → generate has an input
#   specs/                   → the target stages have an input
#   react/src/               → the react stage is active
#   webcomponents/src/       → the webcomponents stage is active
#   storybook/.storybook/    → the publish stage is active
```

**Pros**:
- Satisfies *no new schema surface without a need*. Zero keys added to
  `Settings`, so no type, no JSON schema property, no migration, no docs page in
  `settings/`.
- Cannot drift from reality. A declared stage list can name a tree that was
  deleted; detection cannot.
- Reuses machinery that exists and is already tested.

**Cons / Trade-offs**:
- A workspace cannot express "I have a `react/` tree but never build it" without
  a flag on the invocation. Accepted: `--only` and `--skip` cover it, and a
  standing preference is better evidence of a need than a guess at one.

---

### Option B: An authored stage list in settings *(Rejected)*

A new `settings.build.stages` naming the stages and their order.

**Rejected because**: it adds schema surface to restate what the directory
layout already states, and it introduces a second source of truth for the
dependency order — the one place a mistake is both easy to make and impossible
to detect from the output. It also reopens a settled question: ADR-096 made the
directory layout the declaration of what a workspace contains.

---

### Option C: Detection, plus settings for the opt-in stages only *(Rejected for now)*

Detection for the local stages; a `settings.build` key to let a workspace opt
`fetch` or `render` into the default graph permanently.

**Rejected because**: a persistent setting that makes a mutating Figma write part
of a routine build is a footgun with no undo, and nothing yet shows a workspace
wants it. Recorded here as the shape to adopt *if* that need appears, so the
next author does not have to re-derive it.

---

## Options Considered — How a stage is executed

The current composition, `specs storybook dev`, spawns this same CLI binary as a
child process per watcher, and says why: *"spawns this same CLI binary for the
watchers, so no PATH assumptions."* That reasoning is sound for two long-lived
watchers. It does not survive a graph that re-traverses on every file save.

Measured against today's code, one spawn-based traversal costs:

| Stage | Proxy calls | Why |
|-------|-------------|-----|
| `generate` | 2 | `LicenseManager.resolve()` is uncached, and the dual-write flip validates a second time — noted in `GenerateCommand.ts` as "(Validates the license a second time.)" |
| `react` | 1 | `createEntitlement('react')` — memoised, but only within its own process |
| `webcomponents` | 1 | `createEntitlement('webcomponents')` — a separate binding, so a separate call |
| **Total** | **4** | per traversal, every traversal |

Our own testing notes put the validate endpoint at roughly three requests per
thirty-two seconds. A single startup traversal exceeds that, and the first
file-save re-traversal lands in `rate-limited`.

### Option A: Stages run in-process, with entitlement hoisted into the driver *(Selected)*

Each stage is a callable function the driver invokes directly. The driver
resolves entitlement **once**, before the first stage, and injects the resolved
value into every stage that needs it.

The seam for this already exists and was built for exactly this reason —
`EmitRun.proEntitled` is a caller-supplied callback, documented as:

> Supplied by the caller rather than resolved here, so the answer comes from the
> emitter package's own already-bound entitlement: resolving it here would mean a
> second license call […]

The driver becomes that caller: it resolves once and passes
`proEntitled: () => Promise.resolve(resolved)` to every target stage, so no
closed package changes and no test hook is used in production.

**Pros**:
- Satisfies *entitlement is resolved once per invocation* — one call per
  `build`, one per `run` session, regardless of stage count or traversal count.
- Removes the rate-limit failure mode rather than pacing around it, which is
  the posture this workspace already takes toward dev affordances.
- Process startup disappears from every re-traversal, which is most of the
  latency in a scoped single-component re-emit.
- Entitlement becomes a property of the *run*, so a mixed result — Pro
  components and free compositions in one traversal — is no longer reachable.

**Cons / Trade-offs**:
- Stage bodies must be callable, not just registered. `runEmitters()` and the
  Storybook `publish()`/`init()` functions already are; `ScanCommand` and
  `GenerateCommand` keep their logic inside Commander action handlers that call
  `process.exit()`. Extracting those is the bulk of the implementation.
- One stage can crash the driver. Each stage call is therefore wrapped, and a
  thrown stage is reported as a failed stage rather than a dead process.

---

### Option B: Stages run as spawned CLI child processes *(Rejected)*

Extend what `specs storybook dev` does today: the driver shells out to
`specs scan`, `specs generate`, `specs react --components …` in order.

**Rejected because**: it violates *entitlement is resolved once per invocation*
at four calls per traversal, and the failure it produces is the dangerous kind —
`rate-limited` resolving to `FREE` inside `generate` means specs written at the
wrong tier with a successful exit code. It also forfeits scoping precision
(every re-run pays full process startup) and makes cancelling an in-flight
traversal a matter of killing processes mid-write.

---

### Option C: Spawn, with an entitlement token passed to children *(Rejected)*

Keep spawning, but have the driver resolve once and pass the verdict to each
child through an environment variable.

**Rejected because**: an environment variable that tells a child process it is
Pro is an entitlement bypass with a published name. The existing local-resolution
path (`SPECS_DEV_TIER`) is compiled out of release bundles precisely so no such
path ships; re-introducing one as the production mechanism inverts that
decision.

---

## Options Considered — Which stages are in the default graph

### Option A: Local, deterministic stages only; network and mutation opt in *(Selected)*

| Stage | Reads | Writes | Default |
|-------|-------|--------|---------|
| `fetch` | Figma REST API | `data/` | **No** — `--fetch` |
| `scan` | `data/{alias}.file/` | `data/{alias}.manifest.md` | Yes |
| `generate` | `data/{alias}.manifest.md`, `data/{alias}.file/` | `specs/` | Yes |
| `react` | `specs/`, `config/` | `react/src/` | When `react/src/` exists |
| `webcomponents` | `specs/`, `config/` | `webcomponents/src/` | When `webcomponents/src/` exists |
| `storybook publish` | `config/`, `specs/`, `assets/` | `storybook/content/` | When `storybook/.storybook/` exists |
| `render` | `specs/` | **the connected Figma file** | **No** — `--render` |

**Pros**:
- Satisfies *nothing in the default path may touch the network or the Figma
  file*. `specs build` in CI needs no `FIGMA_TOKEN` and cannot reach a live file.
- Every default stage is deterministic in the sense the workspace already
  commits to — same input, identical output — so a `build` that changes nothing
  is a build that *reports* nothing changed.
- `render` stays where the existing safety rules put it: an explicit act against
  a live file, never a side effect of saving a spec.

**Cons / Trade-offs**:
- A designer who fetched fresh data still types `specs fetch` first, or
  `specs run --fetch`. This is intentional: the fetch boundary is where an API
  budget is spent.

---

### Option B: Every stage by default, with `--no-*` opt-outs *(Rejected)*

**Rejected because**: the default would render into a live Figma file. The
blast radius of getting that wrong — `--overwrite` deleting a page component —
is unrecoverable, and the opt-out only protects people who already know to use
it.

---

### Option C: Stop the default graph at `specs/`, leaving the targets opt-in *(Rejected)*

**Rejected because**: it reproduces the exact staleness this ADR exists to
remove. `specs/` current and `react/src/` two revisions behind is the failure
mode, not an acceptable default.

---

## Options Considered — Whether the curation manifest is a graph node

### Option A: The manifest is a node; `data/` and the manifest are separate entry points *(Selected)*

`scan` writes `data/{alias}.manifest.md`; `generate` reads it. The manifest is
therefore an ordinary edge in the graph, which means a **human edit to the
manifest is a graph event** — ticking a checkbox triggers `generate` and
everything downstream, with no re-scan.

| Input changed | Entry node |
|---------------|------------|
| `data/{alias}.file/**` | `scan` |
| `data/{alias}.manifest.md` | `generate` |

**Pros**:
- Curation becomes a first-class input to the loop rather than something a
  person does and then separately remembers to act on.
- Avoids the hazard directly: a manifest edit never re-runs the stage that would
  overwrite it.

**Cons / Trade-offs**:
- `scan` writing the manifest must not re-trigger itself. The driver suppresses
  events on a stage's own declared outputs — required for every stage, not just
  this one.
- When `settings.curation.preserveManualSelections` is `false` (the default), a
  `data/` change re-derives checkboxes from `devStatus` and can silently
  de-select a component mid-session. Both drivers honour the setting
  identically — `run` must not quietly pass `--keep-checks`, because that would
  make the watch loop and the CI build disagree. Instead `run` **warns once at
  startup** when a manifest exists and the setting is `false`, naming the
  setting that would make the loop safe.

---

### Option B: `data/` is the only upstream entry; the manifest is an intermediate *(Rejected)*

**Rejected because**: it makes a human's curation edit invisible to the loop.
The person ticks a box and nothing happens, which is indistinguishable from the
watcher being broken.

---

### Option C: `scan` is opt-in, like `render` *(Rejected)*

**Rejected because**: `scan` is local, deterministic, and cheap, and its only
hazard — the checkbox rewrite — is already governed by an existing setting.
Excluding it would mean a fresh `data/` payload never reaches `specs/` without
manual intervention, which is the stated problem.

---

## Options Considered — Invalidation granularity

### Option A: Declared per input path, with key scoping where a stage supports it *(Selected)*

A stage declares its inputs as paths, not as directories-by-convention. Within
`config/`, that is per *file* — the layout ADR-098 established already splits
concerns into separate files, so `config/conventions/storybook.yaml` invalidates
`storybook publish` alone, while a change under `config/settings.yaml` reaches
the stages that read settings.

Where a stage already accepts a scope flag, the driver passes one. `specs react`
and `specs webcomponents` take `--components <keys...>`; `specs generate` takes
`-c`. A change to `specs/Alert/api.yaml` therefore re-emits `Alert`, not the
catalogue.

**Pros**:
- Satisfies *a change enters at one node* at the granularity that makes a watch
  loop usable on a real catalogue rather than merely correct.
- Respects the existing posture that full-catalogue runs are expensive and
  deliberate.

**Cons / Trade-offs**:
- Scoped emission can mask a cross-component effect — a shared token change that
  should have re-emitted everything. Mitigated by scoping only on inputs that
  are *per-component by construction* (a spec folder), and never on shared
  inputs (`config/`, `assets/`, the cssvars source), which always invalidate the
  whole stage.

---

### Option B: Whole-stage invalidation only *(Rejected)*

**Rejected because**: correct, and unusable. Every spec save would re-emit the
entire catalogue for both platforms, which is the cost that makes people stop
running the watcher.

---

## Decision

### Command surface

Two new top-level commands on `specs`:

```
specs build [options]     Traverse the stage graph once, in order, then exit.
specs run   [options]     Traverse once, then watch and re-traverse from the
                          entry node on every change. Runs until Ctrl-C.
```

Shared options:

| Option | Effect |
|--------|--------|
| `--config <path>` | Workspace config directory, as every other command |
| `--only <stage...>` | Run these stages and nothing else |
| `--skip <stage...>` | Run the graph without these stages |
| `--components <keys...>` | Scope the traversal to these component folders |
| `--fetch` | Add the `fetch` stage at the head of the graph |
| `--render` | Add the `render` stage as a leaf — writes to the connected Figma file |
| `--dry-run` | Print the resolved plan and exit without running a stage |
| `--verbose` | Per-stage detail, as every other command |

`run` additionally starts the Storybook dev server as a sink when
`storybook/.storybook/` exists, which is what `specs storybook dev` does today.

### The graph

Stages, inputs, and outputs are as given in the stage table above. The default
set is every active local stage; `fetch` and `render` join only on their flags.

### Execution and entitlement

Stages run **in-process**. The driver owns one entitlement resolution and hands
the result to every stage:

| | Resolved | Scope |
|---|---|---|
| `specs build` | Once, before the first stage | The whole traversal |
| `specs run` | Once, at startup | The whole session — every re-traversal reuses it |

Rules:

- **One resolution, injected.** The driver resolves entitlement, then supplies
  each target stage with `proEntitled: () => Promise.resolve(resolved)` through
  the existing `EmitRun.proEntitled` seam. No stage resolves for itself.
- **A transient failure aborts the traversal.** `error`, `network-error` and
  `rate-limited` are not verdicts. A key that was provided and could not be
  checked stops the run before the first stage, with the guidance
  `transientFailureGuidance()` already produces. It is never retried per stage —
  retrying is what saturates the window that caused it.
- **`run` does not re-resolve on its own.** A session that started free stays
  free until restarted. The startup line says which tier the session is running
  at, so this is visible rather than inferred.
- **The tier is stated once per session, not once per stage.** Today each
  package's binding prints its own dev-tier warning; under one resolution there
  is one line.

### Plan output

Every traversal prints what it resolved, in both drivers. Without this the
orchestrator is undebuggable — a missed invalidation is indistinguishable from a
transform bug, which is the failure mode this workspace has already paid for
once with a stale `dist/bridge-server.js`.

```
$ specs run
[specs run] license: PRO (active) — resolved once for this session
[specs run] plan: scan → generate → react, webcomponents → storybook publish
[specs run] watching data/, specs/, config/, assets/

specs/Alert/api.yaml changed
  → generate (Alert) → react (Alert), webcomponents (Alert) → storybook publish
  ✓ 3 stages, 1 component, 1.4s
```

### Driver semantics

| | `specs build` | `specs run` |
|---|---|---|
| Traversal | Once | Once at startup, then per change |
| Stage failure | Stop; exit non-zero | Report the stage; keep watching |
| Terminal node | `storybook publish` writes, process exits | Storybook dev server stays up and hot-reloads |
| Concurrency | Independent stages may run in parallel | Same, plus in-flight runs are cancelled by a newer change |
| Entitlement | Resolved once, before the first stage | Resolved once, at startup, for the session |
| Exit | `0` all stages succeeded, non-zero otherwise | Only on Ctrl-C |

A burst of file events — what a `specs fetch` or a multi-file save produces — is
coalesced into one traversal. A change arriving mid-traversal cancels the
in-flight run from the affected node downward and restarts it; stages already
complete and unaffected are not re-run.

### Relationship to `specs storybook dev`

`specs storybook dev` keeps its name, its flags and its behaviour — the command
for someone who wants the server and the target watchers and nothing upstream.
`specs run` supersedes it for whole-workspace watching, and its docs page says
so. No deprecation: the composition moving up a level does not make the scoped
command wrong.

Its *implementation* does change. It is re-expressed as the same driver scoped
to the target and publish stages, rather than as its own process-spawning
watcher. Left as it is, it would be the one path still paying two license calls
per session and still unable to scope an emit to the component that changed. One
driver, two entry points.

### Notes

- The `fetch` stage, when enabled, is never scoped by `--components`; a partial
  fetch is `specs fetch --only`, which remains its own command.
- `--only` and `--skip` name stages, not commands, and are mutually exclusive.
- Stage names in both flags are the table's first column (`fetch`, `scan`,
  `generate`, `react`, `webcomponents`, `storybook`, `render`).
- `--dry-run` resolves no license. Printing a plan is not running one, and a
  dry run that spent a validate call against a rate-limited window would make
  the debugging tool part of the problem it is used to diagnose.

---

## Type ↔ Schema Impact

- **Symmetric**: N/A — no type and no schema change. `packages/schema/` is
  untouched by this ADR.
- **Parity check**: Not engaged. The graph is derived from workspace detection
  (`resolveWorkspace()`), deliberately adding no `Settings` key. If a later need
  forces one, it is the shape recorded as the rejected Option C under *How the
  graph is declared*, and it needs its own ADR.

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-cli` | Implements both commands and the graph | New `src/pipeline/` module; `index.ts` registers `Build` and `Run`; stage bodies extracted from `ScanCommand` and `GenerateCommand` so they are callable without `process.exit()`; `storybook/dev.ts` reduced to the Storybook sink the graph drives |
| `specs-schema` | None | None — no types, no schema properties |
| `specs-from-figma` | Needs one additive seam for a pre-resolved license | Accept an already-resolved `LicenseResult` where the capture path currently takes a raw `LicenseInput` and calls `resolve()` itself. Additive and optional — the existing signature keeps working for direct `specs generate`. Removes the second validate the dual-write flip performs today |
| `specs-plugin-2` | None | None — `render` reaches the plugin through the existing bridge, unchanged |
| `specs-testing` | None required | May replace scripted command sequences with `specs build` |

---

## Semver Decision

**Target version**: `0.32.0` — `packages/cli/package.json` on `release/next`.

**Change class**: `MINOR` — two new commands and a new module; no existing
command, flag, or output changes behaviour. `specs storybook dev` is retained
with its current surface.

**Justification**: Purely additive to the CLI's public surface. The schema
package is untouched, so no constitution gate applies and no schema version
moves.

---

## Consequences

- A workspace has one command that brings every derived artifact current, and
  one that keeps them current. Staleness stops being a sequencing error a person
  can make.
- The dependency order is written down in one place for the first time. Adding a
  platform target becomes a stage declaration rather than a new entry in a
  remembered sequence.
- CI and release verification gain a single command with a meaningful exit code.
- Curation becomes reactive: ticking a checkbox in the manifest regenerates what
  it selected.
- A workspace running `specs run` with
  `settings.curation.preserveManualSelections: false` is warned once at startup
  that a `data/` change can re-derive its checkboxes. The setting's behaviour is
  unchanged; only its visibility is.
- `specs storybook dev` becomes the scoped case of a general mechanism. Its
  header comment — "fetch, generate, and renders stay yours" — stops being a
  limitation of the tooling and becomes an accurate description of that
  command's scope.
- **One license call per invocation, down from four per traversal.** A
  `specs run` session validates once at startup and never again; `specs build`
  validates once. The rate-limit failure that produced silent free-tier output
  mid-run is removed by construction rather than paced around.
- The double validation inside `specs generate` — present today, and labelled in
  its own source — is resolved as a consequence of hoisting, for the orchestrated
  path immediately and for the direct path once the seam lands.
- Entitlement becomes a property of a run rather than of a package binding. A
  traversal cannot emit Pro components alongside free compositions because two
  bindings disagreed.
- Stages become callable functions, which makes them directly testable for the
  first time. `ScanCommand` and `GenerateCommand` currently end in
  `process.exit()`, so they can only be tested through a spawned process.
- A new risk is introduced: the orchestrator can invalidate wrongly, and a wrong
  invalidation looks like a transform bug. The printed plan and `--dry-run` are
  the mitigation, and they are load-bearing rather than conveniences.
- A second new risk: in-process execution means one stage's uncaught throw can
  end the driver, where a spawned child could only end itself. Each stage call
  is wrapped for this reason, and `run` reports a failed stage and keeps
  watching.
