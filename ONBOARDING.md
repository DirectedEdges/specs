# Claude Code Onboarding

> **For humans**: paste this into Claude Code (terminal or VS Code panel) and follow the prompts:
>
> ```
> Onboard me to Specs CLI following the ONBOARDING.md instructions in this repo.
> ```
>
> Everything below is a prompt *for Claude*, not a tutorial for you.
> For a manual walkthrough, see the [Getting Started](https://www.specsplugin.com/cli/getting-started/) guide.

---

## Role

You are setting up Specs CLI for a user in the current working directory. Specs CLI generates component specifications from a Figma design system, and working code from those specifications. Your job is to walk the user through the setup interactively, make every non-obvious decision *with* the user (not for them), and leave them with a Storybook running in their browser showing their own design system.

By the end they will have a `config/` directory, a populated `.env`, generated specs, analysis reports, React and Web Components trees, and a URL to open.

You must follow this document **top to bottom**. Do not skip steps. Do not batch multiple steps before checking in. After each numbered step, verify the step succeeded before moving on.

Step 11 is the one exception: it is explicitly optional, and the user declining it is a normal completion rather than a skipped step.

**Ask only what this document tells you to ask.** Everything else has a default that is already correct. A question you invent is friction.

---

## Pre-flight (do this before anything else)

Run these checks in order. Stop if any fail.

### P1. Confirm working directory

Run `pwd` and show the output to the user:

> "I'm set up to onboard you to Specs CLI in `<pwd output>`. Is that the right directory?"

If they say no, ask them to `cd` and restart. Do not proceed.

### P2. Confirm the directory is empty or intended

Run `ls -la`. If the directory has a `specs.config.yaml` or `specs.config.json`, that's a **pre-split configuration** (ADR-071). The CLI refuses to read it — `specs init` will refuse too — so it must be converted first:

> "This directory has a `specs.config.yaml` from an earlier Specs CLI. I can run `specs migrate config` to convert it — it writes `config/conventions/` (per-platform files) and `config/settings.yaml`, and renames the old file to `.migrated`. Or should I stop so you can pick a different directory?"

If they choose migration, continue to Step 1 to install the CLI, then run `specs migrate config` in place of Step 2 and show them the generated files. Resume from Step 5 (secrets) — the migrated files already carry their sources and settings, so confirm rather than re-ask.

A leftover `config/conventions.yaml` (flat file) or `config/pipeline.yaml` is also pre-split residue: the conventions file makes the CLI refuse; the pipeline file is ignored with a warning (its transformers became `specs react` / `specs webcomponents`, and `specs analyze` takes its analyzers as arguments). `specs migrate config` cleans both up.

If the directory has any of: `config/`, `data/`, `specs/` — assume a previous setup exists:

> "This directory already has `<files>`. Should I (a) overwrite, (b) merge/resume, or (c) stop so you can pick a different directory?"

A `.env` on its own, with no `config/`, is **not** a previous setup. Pre-provisioning the Figma token before anyone runs the CLI is a normal enterprise pattern, so treat the directory as fresh and say what you found instead of asking the overwrite question:

> "You already have a `.env` here, so I'll read the Figma token from it rather than asking you for one. Nothing else is set up yet, so we're starting fresh."

When you reach Step 5, confirm the file carries a populated `FIGMA_TOKEN=` line without printing its value, and skip the token walkthrough.

If the directory has unrelated files (e.g., a `package.json` for another project), confirm:

> "This directory contains `<summary>`. Are you sure you want to set up Specs CLI *alongside* those files?"

Only proceed with explicit confirmation.

### P3. Confirm Node.js is available

Run `node --version` and `npm --version`. Both must print a version, and Node must be **20.19 or newer** — the Storybook host in Step 14 declares that floor and `npm install` will refuse below it. If either command fails or the version is too old:

> "Specs CLI needs Node.js 20.19 or newer. Please install the current LTS build from https://nodejs.org and come back."

Stop. Do not try to install Node.js yourself.

---

## Step 1. Install Specs CLI

Ask:

> "Install Specs CLI globally (recommended for first-time users), or run it ad-hoc via `npx`?"

- **Global**: `npm install -g @directededges/specs-cli`, then verify with `specs --version`.
- **Ad-hoc**: Skip install. Use `npx @directededges/specs-cli <command>` everywhere below.

Record which choice was made and use it consistently for the rest of the session.

**Verify**: the version command prints a version number. If it fails with a permissions error on macOS/Linux, suggest `npm config set prefix ~/.npm-global` rather than `sudo`.

---

## Step 2. Scaffold the config

Run `specs init` (or `npx @directededges/specs-cli init`). Verify a `config/` directory appears holding a `conventions/` folder and `settings.yaml`:

- `config/conventions/figma.yaml` — **facts about the Figma library** (naming patterns, glyph and subcomponent matching, images). A wrong value here produces *incorrect* output.
- `config/conventions/specs.yaml` — **conventions about the spec itself** (states classification, accessibility props). Scaffolded fully commented; leave it alone during onboarding.
- `config/conventions/react.yaml` and `config/conventions/web-components.yaml` — **what each code platform calls the things the spec models**. Scaffolded fully commented; leave them alone during onboarding.
- `config/settings.yaml` — **choices about the run** (sources, format, file layout). A different value here produces merely *different* output.

Tell the user:

> "I've created a `config/` directory: `conventions/` holds facts about your Figma library, and `settings.yaml` holds choices about this run. The scaffold's defaults are production-ready, so the only thing we need to fill in is your Figma file."

The scaffold is commented throughout — every setting names what it does and links to its documentation. Read the files rather than asking the user about a setting, and never recite the scaffold's contents back at them. They can open it themselves at any time.

If `specs init` refuses because it found a `specs.config.yaml`, you skipped P2 — go back and run `specs migrate config` first.

### 2a. Install the skills

```
specs skills install
```

Instant, and it commits to nothing — it writes the shipped procedures into `.claude/skills/` for whenever they are needed. Two later steps call on them: Step 7a if the icons file needs a structural convention, and Step 11 for the optional states and roles passes.

Verify the command exits 0. Do not describe the skills to the user here; the steps that use them do that.

---

## Step 3. Configure Figma sources

### 3a. Get the Figma file URL

Ask:

> "Paste the URL of your Figma file — the one you'd share with a teammate."

Figma URLs come in two shapes. Handle both:

- **Main file URL** — format:
  `https://www.figma.com/design/<fileKey>/<filename>?node-id=...`
  Example: `https://www.figma.com/design/AbC123XyZ/My-Design-System`
  → use `AbC123XyZ` as the key.

- **Branch URL** — format:
  `https://www.figma.com/design/<mainKey>/branch/<branchKey>/<filename>`
  Example: `https://www.figma.com/design/AbC123XyZ/branch/Br4nch789/My-Design-System`
  → use `Br4nch789` as the key (the branch key, **not** the main key).

Extract the key yourself from whichever URL the user pastes. Do **not** ask the user to extract it — that's the kind of friction this flow exists to remove.

If the URL is a branch URL, warn:

> "This URL points to a Figma branch. Generated specs will reflect the branch contents, including unpublished changes. Proceed?"

### 3b. Name the source

Ask (default to `library`, pre-filled if your UI supports it):

> "What should I call this source? Default: **library**. Just hit enter to accept, or type a custom name.
>
> Examples:
> - `GDS Library` → I'd save it as `gdsLibrary`
> - `RDS UI Kit` → I'd save it as `rdsUiKit`
> - `library` → stays `library`
>
> Source names become keys in `config/settings.yaml`, so I'll camelCase whatever you give me to keep it YAML-safe."

Take whatever the user provides and convert to camelCase for the YAML key. Preserve spaces/original casing only in explanatory comments, not as the actual key.

### 3c. Additional sources

Ask:

> "Do you have a separate tokens/foundations file to pull from? Many teams keep foundations (colors, spacing, type) in a file distinct from components."

Repeat 3a–3b for each additional source. A components or foundations source gets the full `fetch` list — `file`, `variables`, and `styles`. It is marginally more bandwidth on a file that does not need all three, and it keeps the flow simple.

**An icons source is the exception: give it `fetch: [file]` only.** The `icons` kind needs a `glyphs` convention in `config/conventions/figma.yaml`, which onboarding leaves commented out, and `specs fetch` refuses to start without it — so an icons file cannot fetch icons during onboarding. Handing it the full list instead is worse than it looks: icon files are large, and `variables` and `styles` on a file that holds only glyphs download hundreds of megabytes that nothing downstream reads.

Say so rather than quietly dropping what they asked for:

> "Your icons file needs a glyph naming pattern configured before `specs` can pull icons from it, which is a step past onboarding. I'll register the file now and fetch just its structure — we can turn icons on afterwards."

**If there is more than one source, `library` is the best name for the one holding the components** — but it is a recommendation, not a requirement, and **the name the user gave in 3b wins.** `specs generate` looks for the alias `library` first; with no `library` it falls back to the first source that fetches `file`, which depends on key order in the file. So:

- If the user did not name it, or had no preference, use `library` and say why.
- If the user named it something else, keep their name and **write it first in the `sources:` block**. That makes it the `file` fallback, so a bare `specs generate` still lands on it. Confirm this in Step 9 by checking which source the run reports.

Never rename a source the user named. Tell them what you did:

> "I'll keep your name `<theirs>` for the components file and write it first, so the later commands still run with no arguments. (`library` is the conventional name if you'd rather switch.)"

Typical result (in `config/settings.yaml`):

```yaml
data:
  directory: ./data
  sources:
    library:
      key: <key>
      fetch: [file, variables, styles]
    foundations:
      key: <key>
      fetch: [file, variables, styles]
    icons:                        # only if they have a separate icons file
      key: <key>
      fetch: [file]               # not `icons` — see above
```

Write the full `data.sources:` block to `config/settings.yaml` now, replacing the placeholder `library:` entry `specs init` wrote. **The `icons` fetch kind never appears during onboarding**, for the reason given above. Show the user what you wrote.

---

## Step 4. Confirm the output settings

**Do not ask the user about any of these.** `specs init` already scaffolded the values this flow wants. Read `config/settings.yaml`, confirm each one reads as below, and fix only a mismatch:

| Setting | Value | Why this one |
|---|---|---|
| `spec.format` | `YAML` | Readable and diffable in PRs, which is where spec changes get reviewed |
| `spec.keys` | `CAMEL` | Matches the JS/TS consumers the React and Web Components trees emit into |
| `spec.layout` | `LAYOUT` | The tree lives in one `layout` array rather than on every element; concise and easy to walk |
| `spec.tokens` | `TOKEN` | Resolved semantic references like `color/brand/primary` (Pro; free tier emits raw values) |

Those four are the ones `specs init` writes as live values. **Everything else is commented out in the scaffold, and that is correct — an absent key means the built-in default applies.** Do not go looking for the split flags or `spec.invalidCombinations`; they are not there to read, and a commented line is not a mismatch to fix. Read the four, confirm them, move on.

Then tell the user what they have, in one message — not a question:

> "Your settings are ready: YAML specs with camelCase keys, a folder per component, and design tokens as semantic references. Everything else is on a production-ready default. You can change any of it later in `config/settings.yaml` — it's commented throughout, and the [Settings Reference](https://www.specsplugin.com/settings/) covers the rest."

If the user asks about a setting, answer from the scaffold's comments and the Settings Reference, apply the change, and carry on where you left off.

---

## Step 5. Secrets (.env setup)

### CRITICAL RULES — follow these exactly

1. **Create `.gitignore` BEFORE creating `.env`.** Ensure `.gitignore` contains a line with `.env`. If `.gitignore` exists without that line, append it. If it doesn't exist, create it with `.env` as its first entry.
2. **Never echo the token back to the conversation.** If the user pastes their PAT inline, acknowledge receipt ("got it, writing now") without repeating the value, and write it directly to `.env`.
3. **Prefer letting the user paste the token into the file themselves.** Create `.env` with the key stubs (`FIGMA_TOKEN=` and optionally `SPECS_LICENSE_KEY=`), then instruct them to open `.env` and paste their values. This is the safer default.
4. **Never commit or stage `.env`.** If the user asks you to commit setup files, stage the `config/` directory and `.gitignore` only; skip `.env`.
5. **Never log, cat, or grep `.env` contents back to the chat.** If you need to verify the file is populated, check the file exists and is non-empty, not its contents.

### 5a. Figma Personal Access Token

Walk the user through:

> "You need a Figma Personal Access Token. I'll open the page for you:
>
> https://www.figma.com/settings/tokens
>
> Click **Generate new token** with the name 'Specs CLI' and these scopes:
> - `file_metadata:read`
> - `file_content:read`
> - `library_assets:read`
> - `library_content:read`
> - `file_variables:read` (Enterprise only — skip if unavailable)
>
> Copy the token. I've created `.env` for you — open it and paste the token after `FIGMA_TOKEN=`. Let me know when it's saved."

Wait for explicit confirmation before proceeding.

### 5b. License key (optional)

Ask:

> "Do you have a Specs **Pro license key**? It unlocks design token references, variable bindings, invalid-combination analysis, and composition specs. The **free tier** works fine without one — you'll still get full anatomy, props, variants, raw style values, working React and Web Components, and Storybook.
>
> - **Yes, I have a key** → paste into `.env` after `SPECS_LICENSE_KEY=`.
> - **Not yet** → skip; you can add it later. We'll run in free-tier mode."

If they add a key, note that `specs react` and `specs webcomponents` in Steps 11 and 12 **fail the run** rather than falling back to free tier when a key is present but cannot be validated — offline, rate-limited, interrupted. That is deliberate: a silent fallback would write a whole free-tier tree under a valid key and report success.

---

## Step 6. Fetch Figma data

Set expectations before you start it. A large enterprise library is a large download — a ~950MB components file takes around four minutes, most of it silent while Figma builds the payload before sending a byte. Tell the user:

> "This first fetch can take several minutes on a big library, and most of that time looks like nothing happening while Figma assembles the file. A transient disconnect partway through is normal — I'll re-run the part that failed."

If the download fails mid-transfer, re-run it following the retry hint `fetch` prints: the hint names the source and every data kind still missing, so one `--only` run recovers the source without re-downloading the ones that already succeeded. Repeated failures or a payload too large to read are the case for `--no-geometry`, which drops `fillGeometry`, `strokeGeometry`, `size`, and `relativeTransform` and makes the payload around a third smaller:

```
specs fetch --no-geometry
```

It is safe whenever the user doesn't need vector path data. Width and height fall back to `absoluteBoundingBox`, which is accurate for every non-rotated node — so the only specs it degrades are ones with rotated layers. Offer it as the remedy for size, not as the default.

Run `specs fetch`. Verify:

1. Command exits 0.
2. Artifacts exist in `data.directory` (default `./data/`) for each source (only the fetch kinds they configured): a `<source>.file/` directory (the file payload, split into `root.json` plus one JSON per Figma page) and `<source>.variables.json` / `<source>.styles.json` files.
3. The files are non-empty.

If `fetch` fails with an auth error, the token is wrong or missing scopes. Ask the user to regenerate it with all the scopes listed in 5a.

If `fetch` 404s, the file key is wrong or the token's user doesn't have access to that file.

---

## Step 7. Scan for components

With exactly one source configured, run:

```
specs scan
```

**With more than one source, run `scan` once per source and name each one with `--source <alias>` — including the first.** A bare `specs scan` fails when it has more than one source to choose between; it will not silently pick the first:

```
specs scan --source library
specs scan --source foundations
```

No `-o` flag needed. `scan` writes the manifest to `data/<alias>.manifest.md` by default (`data.directory` from `config/settings.yaml`). Let the default do its work — every command downstream assumes it.

Verify each manifest file exists at `data/<source>.manifest.md` and has at least one component listed. Show the user the manifest contents (first ~20 lines is fine).

If a source genuinely has no components (e.g., a pure tokens/foundations file), `scan` will return an empty manifest. That's fine — just note it and move on.

### 7a. If there is an icons source, read its manifest for a naming pattern

An icons file is registered with `fetch: [file]` (§3c), so its icons are not pulled yet. The `glyphs` convention is what turns its components into named icons, and the manifest you just wrote is the evidence for it.

Read the icons manifest and look for a shared naming pattern with the icon's own name varying inside it — something a single `glyphs.match` pattern with `{i}` would capture.

| What the manifest shows | Do this |
|---|---|
| **An obvious pattern** across effectively all of them | Write it yourself: `glyphs: match: '<pattern with {i}>'` in `config/conventions/figma.yaml`. Show the user the pattern and the count it matches. |
| **No pattern** — names are plainly the icon (`Cross`, `Chevron down`), or several generations of naming disagree | **Run the `specs-cli.icons.setup` skill.** Membership has to come from the components' child structure, which is a judgment over the payload and not something to guess at here. |

Either way, once a convention exists, add `icons` to that source's fetch list and **refetch just that source**:

```
specs fetch --source <alias>
```

Tell the user the refetch is coming and why. On a large icon file it is the slowest single step in setup, and an unexplained second download reads as a loop.

If no convention can be established, say so plainly and continue — the rest of onboarding is unaffected, and icons can be turned on later. Do not block the flow on it, and do not invent a pattern to move past the step.

---

## Step 8. **STOP — component selection**

**Do not run `generate` yet.** The user needs to curate which components get specs.

Tell the user:

> "Open `data/<source>.manifest.md` and uncheck any components you don't want specs for. By default all are selected. Common things to exclude: internal helpers, slot utilities, experimental components, anything prefixed with `_`.
>
> Let me know when you've saved the manifest and I'll run the generator."

A first-time manifest from a real library is long, so give the user the naming patterns to sort it by rather than leaving them to read every line. Read the manifest yourself and point at whichever of these it actually shows:

- **A shared prefix marks the published set.** The component sets a team publishes to its consumers usually share one prefix; everything without it is internal. Offer to select by that prefix.
- **A leading `.` or `_` marks a private component.** Figma's own convention for a component the library does not publish.
- **A sigil such as `❖` is decoration, not meaning.** Teams use it to mark component sets in layer names; it says nothing about whether the component should get a spec.
- **A helper path prefix marks a utility.** Names under a path segment like `Helpers /`, `Internal /`, or `Slots /` are scaffolding for other components rather than components a consumer uses.

State these as heuristics the user confirms, not as exclusions you apply. Their library may deliberately publish something that looks internal.

**On a large library the operation is inverted, and the document's wording above is not.** Selecting 8 components out of 376 is not "uncheck what you don't want" — it is uncheck everything, then check eight. Say it that way round when the manifest is long, and do the bulk edit yourself rather than asking the user to.

**Then print the exact list you checked, and count it.** Not the headline names you were aiming for — every row. A selection is easy to make and hard to verify afterwards, and the next step bills by component: every extra row is time in Step 9 and again in Steps 12 and 13. If the count surprises you, re-read the manifest before generating rather than after.

Wait for explicit confirmation. If the user says "just generate everything," still wait for their confirmation that they've looked at the list.

---

## Step 9. Generate specs

Run:

```
specs generate
```

No arguments needed — `generate` reads the default manifest (`data/<alias>.manifest.md`, resolved to the `library` alias as described in 3c) and writes output to `spec.directory` from `config/settings.yaml` (default `./specs`). If the user has multiple sources with components, run it once per source by passing the explicit manifest path: `specs generate data/<otherSource>.manifest.md`.

Verify:

1. Command exits 0.
2. Files exist under `specs/components/` and are non-empty.
3. Peek at the first ~30 lines of one file. Each component has its own folder (e.g. `specs/components/button/`) holding `api` and `variants` files, and the api file opens with the component's `title:` and `anatomy:`.

Tell the user how many components were specced, and show them one spec. This is the first moment the setup has produced something about *their* design system — say so.

---

## Step 10. Run the analysis reports

Run:

```
specs analyze
```

No arguments — with no analyzer named, every analyzer runs: `props`, `styling`, `dependencies`, `keys`, and `roles`. Reports land in `specs/analysis/`.

Verify the command exits 0 and the report files exist. Then tell the user what each one answers, and point at a number from their own reports rather than describing the report in the abstract:

- **props** — the prop inventory across the library: which props exist, which components share them, where one concept is spelled two ways.
- **styling** — where design tokens are used and which are used nowhere.
- **dependencies** — which components are built from which, so a change's blast radius is visible before it is made.
- **keys** — names that the chosen key format cannot reconstruct, which is the list to fix in Figma. Expect this one to be empty after onboarding and say so: it measures round-tripping against a declared `naming` convention, and onboarding leaves `naming` undeclared. An empty keys report here means the check did not run, not that the library is clean.
- **roles** — which anatomy elements declare what each element *is*, and which concepts the library has never used. Expect every element bare at this point; it is the before-snapshot for the roles pass in Step 11.

Analysis is free on every tier. Nothing downstream reads these reports — they are for the user — but Storybook publishes them as pages in Step 14.

---

## Step 11. Two optional judgment passes — mention, then move on

**This entire step is optional, and skipping it is the expected outcome of a first onboarding.** Default to skipping. Say the two passes exist, say they can be run any time later, and continue to Step 12 unless the user asks for one.

Everything so far was mechanical: the pipeline read Figma and wrote down what it found. Two facts about a library are not in Figma, so nothing upstream can supply them.

- **States** — which variant prop means "disabled", which means "expanded". Without it, every prop emits as a `data-*` attribute, so the stylesheet styles `[data-state="Hover"]` rather than `:hover`.
- **Roles** — what each element in a component *is*. Without it, a checkbox emits a `<div>`, and nothing carries `aria-expanded`, `aria-checked` or a label association.

Neither is a gap in the output. The React tree in Step 12 is complete and correct without either; these make it semantic rather than structural, and they can be added at any point afterwards.

### 11a. The skills are already installed

Step 2a put them in `.claude/skills/`. Nothing to run here. If that step was skipped, run `specs skills install` now.

### 11b. Say what exists, in one pass, and let them decline

Tell them both skills are now installed, name what each one buys in a sentence, and say they can run either later. Then **ask once** whether they want to do either now.

**Take the first "no" or "later" as final.** Do not re-offer, do not ask about the second skill after they decline the first, and do not describe either skill in more detail unless they ask. Then go to Step 12.

| If they ask for | Invoke | Scope of what it changes |
|---|---|---|
| States | `specs-cli.states.setup` | one block in `config/conventions/specs.yaml` — local, reversible |
| Roles | `specs-cli.roles.propose`, then `specs-cli.roles.apply` | **their Figma file** — see 11d |

If they want both, do states first. It is confined to their config, so the result shows up in one `specs react` run with nothing upstream touched.

### 11c. States, if they asked for it

The skill reads `specs/analysis/props.yaml` and the specs that Step 10 already produced, proposes a row per state concept with the evidence behind it, and stops at a report. Pasting its block is the only change it leads to, and Step 12 shows the result.

Nothing else in the pipeline re-runs. If the user dislikes the outcome, deleting the block restores exactly what they had.

### 11d. Roles, if they explicitly asked for it

**This one edits the user's Figma file.** Treat it as the serious step it is.

Do not start it on an inferred yes. The user must have asked for roles specifically, after being told that applying them writes into their Figma file. "Yes, do the recommended thing" is not that. If there is any doubt, ask again in those words, and accept no as the answer.

What they are agreeing to:

- **Annotations are written into their Figma file.** The write is additive — existing notes, `action:` lines and prose all survive, and an element that already carries a role is skipped — but it is a real change to their source of truth, made across many components.
- Two gates are built in. `roles.propose` only writes a report, and `roles.apply` goes one Figma page at a time so they can watch it and stop.
- It needs the plugin bridge connected to **this user's file**. Run `specs bridge status` before proposing anything, and read the file key it prints:

  ```
  Bridge running (pid 36652). 1 plugin connected:
    043ln8eiOoivUN5FicuGCF (ADS Components) — connected
  ```

  **Compare that key against `data.sources` in `config/settings.yaml`.** If it does not match one of them, the bridge is attached to somebody else's file — stop, say which file it found, and ask them to open the plugin on theirs. "Connected" on its own is not the gate: a bridge left running from unrelated work answers exactly like the right one, and every annotation would land in that file instead, silently and unrecoverably.
- `settings.spec.roles` must be `true` in `config/settings.yaml` for generated specs to carry what was written.
- `specs fetch` and `specs generate` both have to run again afterwards to pick the annotations up. Say this before they start, not after.

If the bridge is not connected, or is connected to a file that is not theirs, say what to open and stop there. Do not write roles into the specs by hand as a substitute, and do not continue to `roles.apply` without them having seen the proposal report.

`specs/analysis/roles.yaml` from Step 10 is the read-only way to answer a roles question with the bridge unavailable — it reports which elements carry a role and which concepts the library has never used, without touching Figma.

A user who starts roles and changes their mind mid-sweep has lost nothing: what was applied is valid, and the rest can be applied later or never.

---

## Step 12. Emit the React tree

Run:

```
specs react
```

No arguments — the target is the command. It writes `react/src/components/<Name>/` for every spec, each with its contract, scaffold, stylesheet and Storybook stories, plus the shared `assets/cssvars/` tree.

Verify the command exits 0 and `react/src/components/` holds a folder per specced component. Open one `scaffold.tsx` and show it to the user — this is their Figma component as working React.

Two things to say, both only if they apply:

- On the free tier, compositions are skipped and the run says so once. Components are emitted as normal.
- If the run failed with a license error and they entered a key in 5b, the check could not be completed rather than the key being bad. Re-run it.

---

## Step 13. Emit the Web Components tree

Run:

```
specs webcomponents
```

Same shape: no arguments, a folder per component under `webcomponents/src/components/`, and the same shared `assets/cssvars/` tree. Running both targets is not a conflict — they share those assets by design.

Verify it exits 0 and the tree exists. Then tell the user:

> "You now have the same design system as React and as framework-free custom elements, both generated from the same specs. Neither is a translation of the other."

If the user says they only want one platform, skip the other and note that the command is there when they want it.

---

## Step 14. Storybook

Three stages. Do them in order and verify each before the next.

### 14a. Scaffold the host

```
specs storybook init
```

Writes `storybook/` — a `package.json` declaring Storybook, the `.storybook/` config, and a seeded `content/` tree. It prints the install command and the next steps rather than running them, and refuses if `.storybook/` already exists.

Read the port out of the scaffolded `storybook/package.json` dev script and record it. On a fresh workspace it is **6006**.

### 14b. Install it

The CLI never ships or installs Storybook itself — the install is the user's, in their own workspace:

```
cd storybook && npm install
```

This takes a few minutes and prints a lot. Verify it exits 0. If it refuses on the Node version, the floor is 20.19 — back to P3.

### 14c. Run the dev environment

From the workspace root, not from `storybook/`:

```
specs storybook dev
```

This publishes the content pages once, then stays running until Ctrl-C, with three children: a React watcher, a Web Components watcher, and Storybook itself. Saving a spec re-emits the code and the browser updates.

**Always start Storybook with `specs storybook dev`, never with `npm run storybook` or a raw `storybook dev`.** The raw command prompts for telemetry consent and for a fallback port, and when those prompts go unanswered it exits without starting anything while a stale server keeps answering on the port.

Run it in the background, or in a second terminal, so you can keep talking to the user. Wait for the server to report it is listening before moving on.

If the Storybook index returns a 500 after it was working, that is a cached per-file parse failure, not a dead server. `dev` detects it, names the file, and re-triggers the parse. Fix and re-save the named file; never restart Storybook for this.

---

## Step 15. Wrap up

Give them the URL, first and on its own line:

> **Your design system is running at http://localhost:6006**

(Use the port recorded in 14a if it is not 6006.)

Then tell them what to click: the foundations pages built from their variables and styles, a component's stories, and the analysis reports from Step 10.

Summarize what exists now:

| Path | What it is | Commit it? |
|---|---|---|
| `config/` | `conventions/` and `settings.yaml` — project config | **Yes** |
| `.gitignore` | contains `.env` | **Yes** |
| `.env` | secrets | **Never** |
| `data/` | raw Figma payloads | Usually ignored — ask if unsure |
| `data/<source>.manifest.md` | the curated component selection | **Yes** — see the note below |
| `specs/` | generated specs and analysis reports | **Yes** — so PRs show spec diffs when design changes |
| `react/`, `webcomponents/` | generated code | **Yes** — so PRs show code diffs too |
| `assets/` | icons, generated CSS, fonts | **Yes** |
| `storybook/` | the host — but not its `node_modules/` | **Yes** |

The manifest needs one piece of care: `data/` is often gitignored wholesale, so un-ignore the manifest explicitly (e.g. `!data/*.manifest.md`) or the curated selection goes untracked.

Suggest immediate next steps:

- Re-run `specs fetch && specs generate` anytime the Figma file updates; the watchers in `specs storybook dev` carry it through to the browser.
- See the [Workflows](https://www.specsplugin.com/cli/workflows/) guide for CI/CD automation.
- Enable Pro features later by adding `SPECS_LICENSE_KEY` to `.env`.
- When the library evolves, [`specs version`](https://www.specsplugin.com/cli/commands/version/) compares versions, classifies changes, and generates reports and changelogs; [`specs skills`](https://www.specsplugin.com/cli/commands/skills/) installs the AI orchestration skills that sequence those workflows.

Do **not** offer to `git init`, `git add`, or `git commit` unless the user asks.

---

## Forbidden actions

During this flow, never:

- Paste, repeat, or log the Figma PAT or license key back to the conversation.
- Run `git commit`, `git push`, `git add .`, or stage `.env`.
- Call `npm install ../specs/packages/schema` or any similar path — Specs CLI is installed from the npm registry only.
- Guess a Figma file key — always derive from a URL the user provides.
- Proceed past Step 8 without explicit user confirmation.
- Run `specs-cli.roles.apply`, or any other write to the user's Figma file, without them having asked for roles by name and seen the proposal report. Step 11 is optional; treat a vague yes, a silence, or an unrelated "sounds good" as a no.
- Write `FIGMA_TOKEN` or `SPECS_LICENSE_KEY` values into any file other than `.env`.
- Install Specs CLI into an existing `package.json` project's dependencies without asking whether they want that vs. a global install.
- Start Storybook with anything other than `specs storybook dev`.
- Ask the user about a setting this document tells you to apply.

---

## Environment notes

This flow is UI-agnostic — it works whether the user is in terminal Claude Code or the VS Code panel.

- **VS Code panel users** can click file links you produce (e.g., `config/settings.yaml`) to open them in a tab. They can edit config or `.env` in place while you continue; just read the file again before your next tool call.
- **Terminal users** won't see files appear visually. After writing any config file, proactively offer to `cat` it so they can review without opening an editor.

Regardless of UI, for the `.env` step, prefer the "create stub file, user pastes secrets themselves" pattern. It's the one behavior difference worth emphasizing.

---

## See also

- [Getting Started](https://www.specsplugin.com/cli/getting-started/) — the manual walkthrough
- [Settings Reference](https://www.specsplugin.com/settings/) — full convention and setting docs
- [CLI Overview](https://www.specsplugin.com/cli/) — per-command flags and behavior
