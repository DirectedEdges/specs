# Claude Code Onboarding

> **For humans**: paste this into Claude Code (terminal or VS Code panel) and follow the prompts:
>
> ```
> Onboard me to Specs CLI following the ONBOARDING.md instructions in this repo.
> ```
>
> Everything below is a prompt *for Claude*, not a tutorial for you.
> For a manual walkthrough, see the [Getting Started](https://directededges.github.io/specs/cli/getting-started/) guide.

---

## Role

You are setting up Specs CLI for a user in the current working directory. Specs CLI generates component specifications from a Figma design system. Your job is to walk the user through the setup interactively, make every non-obvious decision *with* the user (not for them), and leave them with a working `specs.config.yaml`, a populated `.env`, and a generated spec file.

You must follow this document **top to bottom**. Do not skip steps. Do not batch multiple steps before checking in. After each numbered step, verify the step succeeded before moving on.

---

## Pre-flight (do this before anything else)

Run these checks in order. Stop if any fail.

### P1. Confirm working directory

Run `pwd` and show the output to the user:

> "I'm set up to onboard you to Specs CLI in `<pwd output>`. Is that the right directory?"

If they say no, ask them to `cd` and restart. Do not proceed.

### P2. Confirm the directory is empty or intended

Run `ls -la`. If the directory has any of: `specs.config.yaml`, `specs.config.json`, `.env`, `data/`, `specs/` — assume a previous setup exists:

> "This directory already has `<files>`. Should I (a) overwrite, (b) merge/resume, or (c) stop so you can pick a different directory?"

If the directory has unrelated files (e.g., a `package.json` for another project), confirm:

> "This directory contains `<summary>`. Are you sure you want to set up Specs CLI *alongside* those files?"

Only proceed with explicit confirmation.

### P3. Confirm Node.js is available

Run `node --version` and `npm --version`. Both must print a version. If either fails:

> "Specs CLI needs Node.js 18 or newer. Please install the LTS build from https://nodejs.org and come back."

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

Run `specs init` (or `npx @directededges/specs-cli init`). Verify `specs.config.yaml` appears in the current directory.

Tell the user:

> "I've created `specs.config.yaml` with defaults. We'll fill in the sections together now."

If the user is in VS Code, they can click to open it while you work. In terminal, they can `cat specs.config.yaml` at any time.

---

## Step 3. Choose setup depth

Ask now, before we configure anything that depends on the answer. This decision only affects how many questions you'll ask in Step 5 — nothing else.

> "Pick how deep you want to go.
>
> 1. **Essentials** (recommended) — the minimum to get working specs. I'll ask about your Figma sources, your PAT (plus optional Pro license), output format (YAML/JSON), key naming style, and how to split output files on disk. That's it — production-ready defaults everywhere else.
> 2. **Complete** — everything in Essentials, plus three more format knobs: token representation, layout representation, and invalid-variant handling. Choose this if your pipeline has strict schema needs or you want to see every knob.
>
> Which path?"

Record the choice as `path = essentials` or `path = complete`. Reference it when you reach Step 5.

Either way, the user can interrupt mid-flow and ask about a Complete-only knob — jump to it, apply it, and return to where you were. Paths are starting points, not cages.

---

## Step 4. Configure Figma sources

### 4a. Get the Figma file URL

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

### 4b. Name the source

Ask (default to `library`, pre-filled if your UI supports it):

> "What should I call this source? Default: **library**. Just hit enter to accept, or type a custom name.
>
> Examples:
> - `GDS Library` → I'd save it as `gdsLibrary`
> - `RDS UI Kit` → I'd save it as `rdsUiKit`
> - `library` → stays `library`
>
> Source names become keys in `specs.config.yaml`, so I'll camelCase whatever you give me to keep it YAML-safe."

Take whatever the user provides and convert to camelCase for the YAML key. Preserve spaces/original casing only in explanatory comments, not as the actual key.

### 4c. Additional sources

Ask:

> "Do you have a separate tokens/foundations file to pull from? Many teams keep foundations (colors, spacing, type) in a file distinct from components."

Repeat 4a–4b for each additional source. Every source gets the full data array — we always fetch `file`, `variables`, and `styles`. It's marginally more bandwidth on files that don't need `file`, but it keeps the flow simple and nothing downstream complains.

Typical result:

```yaml
sources:
  library:
    key: <key>
    data: [file, variables, styles]
  foundations:
    key: <key>
    data: [file, variables, styles]
```

Write the full `sources:` block to `specs.config.yaml` now. Show the user what you wrote.

---

## Checkpoint — full config reference

At this point, `specs.config.yaml` should contain everything below. Every knob is either set by the user (**SOURCE**), silently defaulted by `specs init` (**DEFAULT**), asked in Step 5 (**ASKED-5x** — tagged as Essentials or Complete), or intentionally absent because the absence itself disables the feature (**OMITTED**).

This is both a checklist (so the walkthrough's coverage can be audited) and an accurate snapshot of the file state before we tune anything.

```yaml
dataDirectory: ./data                  # DEFAULT
outputDirectory: ./specs               # DEFAULT

sources:                               # SOURCE — set in Step 4
  <yourSource>:
    key: <fileKey>
    data: [file, variables, styles]

config:
  processing:
    subcomponents:                     # DEFAULT — subcomponent detection on with a common pattern
      match:
        - '{C} / _ / {S}'
    # scope: NESTED                    # OMITTED — optional; defaults to NESTED when subcomponents block is present
    # exclude: ['...']                 # OMITTED — optional
    # glyphNamePattern: 'DS Icon /'    # OMITTED — opt-in; absence = glyph detection off
    # codeOnlyPropsPattern: '...'      # OMITTED — opt-in; absence = code-only prop extraction off
    # slotConstraints: false           # OMITTED — opt-in advanced feature
    variantDepth: 9999                 # DEFAULT — unlimited
    details: LAYERED                   # DEFAULT — compact diff-from-default output
    # inferNumberProps: false          # OMITTED — opt-in advanced feature
  format:
    output: JSON                       # ASKED-5a (Essentials) → YAML | JSON
    keys: SAFE                         # ASKED-5b (Essentials) → SAFE | CAMEL | KEBAB | SNAKE | PASCAL | TRAIN
    tokens: TOKEN                      # ASKED-5d (Complete)   → TOKEN | TOKEN_NAME | FIGMA_NAME | TOKEN_FIGMA_EXTENSIONS | CUSTOM
    layout: LAYOUT                     # ASKED-5e (Complete)   → LAYOUT | PARENT_CHILDREN | BOTH
  include:
    invalidVariants: false             # ASKED-5f (Complete)
    invalidCombinations: true          # ASKED-5f (Complete)
    # emptyVariants: false             # OMITTED — opt-in edge case

output:                                # ASKED-5c (Essentials) — file layout on disk
  splitComponents: false               # ASKED-5c
  splitConcerns: false                 # ASKED-5c
  useSubfolders: false                 # ASKED-5c
  # defaultFormat: yaml                # OMITTED — stdout-only knob; the `--format` CLI flag overrides per command
```

If the user later wants to enable anything marked **OMITTED**, point them at the [Configuration Reference](https://directededges.github.io/specs/config/) — those features are opt-in because either (a) absence means the feature is off (`subcomponents`, `glyphNamePattern`, `codeOnlyPropsPattern`), or (b) they're advanced tuning knobs rarely needed in a first setup (`slotConstraints`, `inferNumberProps`, `emptyVariants`, `defaultFormat`).

**Note on `output:`**: `specs init` today does not write this section. If it's missing after Step 2, Claude will create it in sub-step 5c with the defaults shown. If a future `specs init` adds it, the checkpoint still matches.

---

## Step 5. Configure output settings

Based on the path chosen in Step 3:

- **Essentials** → ask **5a, 5b, 5c**, then skip to Step 6.
- **Complete** → ask **5a through 5f**.

For every prompt below: ask, record the answer, write it to `specs.config.yaml`. Do **not** dump all of these at once. If the user says "just use defaults" on any individual question, accept that and move on. If an Essentials user asks about a Complete-only knob mid-flow, jump to it, apply it, and return.

### 5a. `format.output` — JSON or YAML?

> "Should generated specs be in **YAML** (easier for humans to read and diff in PRs) or **JSON** (smaller, strict, better for programmatic consumption)?"
>
> Default: **JSON**. Recommend **YAML** if specs will be reviewed in PRs or eyeballed for debugging; stick with **JSON** if they'll only be consumed by code.

### 5b. `format.keys` — naming style for keys

> "Your Figma component names, element names, and prop names often contain spaces (e.g., component `Text Input`, element `Form Label`, prop `Show Icon`). How should the generated specs name them?
>
> Given the trio `Text Input` / `Form Label` / `Show Icon`:
>
> 1. **SAFE** — preserve as-is: `Text Input` / `Form Label` / `Show Icon`. Best for human review or round-tripping back into Figma tools.
> 2. **CAMEL** — `textInput` / `formLabel` / `showIcon`. Best for JS/TS/JSON consumers.
> 3. **KEBAB** — `text-input` / `form-label` / `show-icon`. Best for CSS, Tailwind, HTML.
> 4. **SNAKE** — `text_input` / `form_label` / `show_icon`. Best for Python, Ruby, DB columns.
> 5. **PASCAL** — `TextInput` / `FormLabel` / `ShowIcon`. Best for C#, type names.
> 6. **TRAIN** — `Text-Input` / `Form-Label` / `Show-Icon`. Rare; HTTP headers.
>
> Default: **SAFE**. Recommended for most codegen pipelines: **CAMEL**."

### 5c. `output` modes — how files are split on disk

> "How should generated specs be organized on disk? Three switches in the top-level `output:` section of `specs.config.yaml`:
>
> - **splitComponents** — one file per component (`button.yaml`, `card.yaml`) instead of one big `library.yaml`. Good for component-level PRs and review ownership.
> - **splitConcerns** — separate the API (anatomy, props) from variants into distinct files (`api.yaml` + `variants.yaml`). Good for API-first development or backend/frontend team separation.
> - **useSubfolders** — wrap each component's files in its own subdirectory (`button/button.yaml` instead of flat `button.yaml`). Only relevant when `splitComponents` is true; useful for large libraries.
>
> Common presets:
>
> - **One file, done** → all three **false** (default).
> - **Component-level PRs** → `splitComponents: true`, others false.
> - **Large library, namespaced** → `splitComponents: true` + `useSubfolders: true`.
> - **API-first / backend-frontend split** → `splitComponents: true` + `splitConcerns: true`.
>
> Which preset (or custom combination)?"

Write an `output:` section to `specs.config.yaml` reflecting the answer:

```yaml
output:
  splitComponents: <true|false>
  splitConcerns: <true|false>
  useSubfolders: <true|false>
```

If `specs init` didn't already write an `output:` section, add it. If it did, update the existing keys in place.

---

**Essentials path stops here.** Skip to Step 6.

**Complete path continues with 5d–5f below.**

---

### 5d. `format.tokens` — how design tokens are referenced

> "When a component uses a design token (e.g., `color.brand.primary`), how should the spec reference it?
>
> - **TOKEN** (default) — resolved semantic reference like `color/brand/primary`. Best for most pipelines.
> - **TOKEN_NAME** — just the name (`primary`), no collection prefix.
> - **FIGMA_NAME** — raw Figma variable path as-is.
> - **TOKEN_FIGMA_EXTENSIONS** — token with extra Figma-specific metadata.
> - **CUSTOM** — for advanced custom token mappings (requires `specs applyCustomTokens`; skip unless you're explicitly doing this).
>
> Recommended: **TOKEN**."

### 5e. `format.layout` — layout representation

> "Every spec has a flat `anatomy` map and a flat `elements` map. This setting controls **where the tree structure lives** — in a separate `layout` array, or attached to each element as `parent`/`children` fields. Here's a simple `Button` with two children (`icon`, `label`) shown three ways:
>
> **LAYOUT** (default) — tree lives in a separate `layout` array; elements stay flat:
> ```yaml
> anatomy:
>   button: { type: container }
>   icon: { type: glyph }
>   label: { type: text }
> default:
>   layout:
>     - button:
>         - icon
>         - label
>   elements:
>     button: { styles: { ... } }
>     icon: { styles: { ... } }
>     label: { styles: { ... } }
> ```
>
> **PARENT_CHILDREN** — no separate `layout` array; each element carries its own `parent` and/or `children`:
> ```yaml
> default:
>   elements:
>     button:
>       children: [icon, label]
>       styles: { ... }
>     icon:
>       parent: button
>       styles: { ... }
>     label:
>       parent: button
>       styles: { ... }
> ```
>
> **BOTH** — both representations present (`layout` array *and* `parent`/`children` on elements). Larger file but the most flexible for downstream tooling.
>
> Recommended: **LAYOUT** for codegen (concise tree, easy to walk); **PARENT_CHILDREN** if downstream tooling works element-by-element and doesn't want to parse a tree."

### 5f. `include.invalidVariants` / `include.invalidCombinations`

> "Your component set may have 'invalid' combinations — variants that aren't wired up, or prop combos that shouldn't exist. Two switches:
>
> - `invalidVariants`: include variants that don't cover all prop combos? (default **false** — cleaner output)
> - `invalidCombinations`: compute and list which prop combinations are invalid? (default **true** — helpful analysis)
>
> Use defaults unless you know you want otherwise."

After this section, show the user the full `config:` block you wrote and ask them to confirm before moving on.

---

## Step 6. Secrets (.env setup)

### CRITICAL RULES — follow these exactly

1. **Create `.gitignore` BEFORE creating `.env`.** Ensure `.gitignore` contains a line with `.env`. If `.gitignore` exists without that line, append it. If it doesn't exist, create it with `.env` as its first entry.
2. **Never echo the token back to the conversation.** If the user pastes their PAT inline, acknowledge receipt ("got it, writing now") without repeating the value, and write it directly to `.env`.
3. **Prefer letting the user paste the token into the file themselves.** Create `.env` with the key stubs (`FIGMA_TOKEN=` and optionally `SPECS_LICENSE_KEY=`), then instruct them to open `.env` and paste their values. This is the safer default.
4. **Never commit or stage `.env`.** If the user asks you to commit setup files, stage `specs.config.yaml` and `.gitignore` only; skip `.env`.
5. **Never log, cat, or grep `.env` contents back to the chat.** If you need to verify the file is populated, check the file exists and is non-empty, not its contents.

### 6a. Figma Personal Access Token

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

### 6b. License key (optional)

Ask:

> "Do you have a Specs **Pro license key**? It unlocks design token references, variable bindings, and invalid-combination analysis. The **free tier** works fine without one — you'll still get full anatomy, props, variants, and raw style values.
>
> - **Yes, I have a key** → paste into `.env` after `SPECS_LICENSE_KEY=`.
> - **Not yet** → skip; you can add it later. We'll run in free-tier mode."

---

## Step 7. Fetch Figma data

Run `specs fetch`. Verify:

1. Command exits 0.
2. Files exist in `dataDirectory` (default `./data/`) matching `<source>.file.json`, `<source>.variables.json`, `<source>.styles.json` for each source (only the data types they configured).
3. The files are non-empty.

If `fetch` fails with an auth error, the token is wrong or missing scopes. Ask the user to regenerate it with all the scopes listed in 6a.

If `fetch` 404s, the file key is wrong or the token's user doesn't have access to that file.

---

## Step 8. Scan for components

If only one source is configured, run:

```
specs scan
```

For each additional source, use `--source <alias>`:

```
specs scan --source <alias>
```

No `-o` flag needed. `scan` writes the manifest to `data/<alias>.manifest.md` by default (`dataDirectory` from config). Let the default do its work — downstream commands and the checkpoint below both assume it.

Verify each manifest file exists at `data/<source>.manifest.md` and has at least one component listed. Show the user the manifest contents (first ~20 lines is fine).

If a source genuinely has no components (e.g., a pure tokens/foundations file), `scan` will return an empty manifest. That's fine — just note it and move on.

---

## Step 9. **STOP — component selection**

**Do not run `generate` yet.** The user needs to curate which components get specs.

Tell the user:

> "Open `data/<source>.manifest.md` and uncheck any components you don't want specs for. By default all are selected. Common things to exclude: internal helpers, slot utilities, experimental components, anything prefixed with `_`.
>
> Let me know when you've saved the manifest and I'll run the generator."

Wait for explicit confirmation. If the user says "just generate everything," still wait for their confirmation that they've looked at the list.

---

## Step 10. Generate specs

Run:

```
specs generate
```

No arguments needed — `generate` reads the default manifest (`data/<alias>.manifest.md`, `library` alias preferred) and writes output to `outputDirectory` from config (default `./specs`). If the user has multiple sources with components, run it once per source by passing the explicit manifest path: `specs generate data/<otherSource>.manifest.md`.

Verify:

1. Command exits 0.
2. The output files exist in `./specs/` (or the configured `outputDirectory`) and are non-empty.
3. Peek at the first ~30 lines of one file to sanity-check: it should start with `components:` and show at least one component's structure.

---

## Step 11. Wrap up

Summarize what exists now:

- `specs.config.yaml` — project config, **safe to commit**.
- `.gitignore` — contains `.env`.
- `.env` — secrets, **never commit**.
- `data/` — raw Figma payloads. Usually gitignored; ask the user if unsure.
- `data/<source>.manifest.md` — manifest, **commit** (it's the curated source of truth). Note: `data/` is often gitignored wholesale — if so, make sure the manifest is explicitly un-ignored (e.g., `!data/*.manifest.md`) so this file still gets tracked.
- `specs/<source>.yaml` — generated specs, **commit** so PRs show spec diffs when design changes.

Suggest immediate next steps:

- Re-run `specs fetch && specs generate` anytime the Figma file updates.
- See the [Workflows](https://directededges.github.io/specs/cli/workflows/) guide for CI/CD automation.
- Enable Pro features later by adding `SPECS_LICENSE_KEY` to `.env`.

Do **not** offer to `git init`, `git add`, or `git commit` unless the user asks.

---

## Forbidden actions

During this flow, never:

- Paste, repeat, or log the Figma PAT or license key back to the conversation.
- Run `git commit`, `git push`, `git add .`, or stage `.env`.
- Call `npm install ../specs/packages/schema` or any similar path — Specs CLI is installed from the npm registry only.
- Guess a Figma file key — always derive from a URL the user provides.
- Proceed past Step 9 without explicit user confirmation.
- Write `FIGMA_TOKEN` or `SPECS_LICENSE_KEY` values into any file other than `.env`.
- Install Specs CLI into an existing `package.json` project's dependencies without asking whether they want that vs. a global install.

---

## Environment notes

This flow is UI-agnostic — it works whether the user is in terminal Claude Code or the VS Code panel.

- **VS Code panel users** can click file links you produce (e.g., `specs.config.yaml`) to open them in a tab. They can edit config or `.env` in place while you continue; just read the file again before your next tool call.
- **Terminal users** won't see files appear visually. After writing any config file, proactively offer to `cat` it so they can review without opening an editor.

Regardless of UI, for the `.env` step, prefer the "create stub file, user pastes secrets themselves" pattern. It's the one behavior difference worth emphasizing.

---

## See also

- [Getting Started](https://directededges.github.io/specs/cli/getting-started/) — the manual walkthrough
- [Configuration Reference](https://directededges.github.io/specs/config/) — full option docs
- [CLI Overview](https://directededges.github.io/specs/cli/) — per-command flags and behavior
