---
description: Draft an Architecture Decision Record (ADR) for a proposed change to the specs-schema types or schema package.
handoffs:
  - label: Implement the ADR
    agent: Specs.adr.implement
    prompt: Implement the necessary changes for this ADR
    send: true
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Efficiency mandate

**Ask first, explore later.** This command MUST be fast and interactive. Do NOT read schema files, type files, or any source code until the user has described their proposed change. The user's description drives all subsequent exploration — never explore speculatively.

**Use dedicated tools, not Bash.** Use Read (not `cat`/`head`), Glob (not `find`/`ls`), and Grep (not `grep`/`rg`) for all file operations. Reserve Bash exclusively for git commands and running scripts.

## Outline

1. **Gather intent** — collect all information from the user before doing any exploration. This step has two parts:

   **Step 1a — Detect release branch (silent, no user prompt)**
   Before asking any questions, find the active release branch with `git branch -r --list 'origin/release/*'`. Infer `RELEASE_BRANCH`:
   - If exactly one `origin/release/*` branch exists, use it as `RELEASE_BRANCH`. Do not cross-reference it against `package.json` version — the branch name reflects where the release started, not the final published version.
   - If multiple `origin/release/*` branches exist, pick the most recently created one (latest commit date) as the default and surface it in Question 2 for confirmation.
   - If no `origin/release/*` branch exists, fall back to `main` and note this in Question 2 so the user can confirm or provide a branch.

   **Step 1b — Sync release branch and determine next ADR number (silent, no user prompt)**
   Run `git fetch origin $RELEASE_BRANCH` and fast-forward the local branch if behind (`git pull origin $RELEASE_BRANCH`). Then determine `NEXT_ADR_NUMBER` by finding the highest existing ADR number across **both** sources (zero-padded to 3 digits):
   1. List `adr/` on the synced branch to find numbered ADR files (e.g., `014-prop-examples.md` → 14).
   2. List remote branches matching the `###-*` pattern (`git branch -r --list 'origin/[0-9][0-9][0-9]-*'`) to find in-flight ADR branches that may not have merged files yet (e.g., `origin/015-some-feature` → 15).
   Take the maximum number from both sources and add 1.

   **Step 1c — Ask the user** using VS Code's interactive question UI. Present ALL questions in a single prompt:

   **Question 1 — Describe the change**
   - Header: `Change`
   - Question: "What change are you proposing? Describe the types/schema modification at a high level (e.g., 'Add structured border properties to replace flat per-side fields on Styles')."
   - Allow free-form input. No predefined options.

   **Question 2 — Confirm release branch**
   - Header: `Release`
   - Question: "Detected release branch: `[RELEASE_BRANCH]`. Target this release?"
   - Options (single-select):
     1. `Yes, use [RELEASE_BRANCH]` — keep the detected value
     2. `Different branch` — allow free-form input to specify another branch

   **Question 3 — ADR file name**
   - Header: `ADR file`
   - Question: "Next ADR number is `[NEXT_ADR_NUMBER]`. What should the ADR be named? This becomes `adr/[name].md` and the ADR branch `[name]`. Use the format `###-short-description` (e.g. `[NEXT_ADR_NUMBER]-shadows`)."
   - Allow free-form input. No predefined options.

   Parse answers as `CHANGE_DESCRIPTION`, `RELEASE_BRANCH`, and `ADR_NAME`.
   - Derive `ADR_BRANCH` as `$ADR_NAME`.

2. **Branch setup**:
   - If not already on `$ADR_BRANCH`, check if it exists — switch to it or create it from `$RELEASE_BRANCH`. The branch must exist before running `check-prerequisites.sh` (it validates the branch name pattern).
   - Run `scripts/check-prerequisites.sh --json --paths-only` from the **git repo root** (the directory containing `.git/`). Parse `REPO_ROOT` from the JSON output. **Do not guess `REPO_ROOT`** — always derive it from the script output.
   - Verify `$RELEASE_BRANCH` is synced with remote (already fetched and fast-forwarded in Step 1b).
   - Set `SPEC_FILE=$REPO_ROOT/adr/$ADR_NAME.md`. The `adr/` directory is at the **repo root**, not inside any package subdirectory.
   - If `$SPEC_FILE` exists, read it and continue editing rather than overwriting.
   - All paths must be absolute.

3. **Load context**: Read `packages/schema/CONSTITUTION.md` and `adr/adr-template.md` (the output template).

4. **Targeted exploration**: Using `CHANGE_DESCRIPTION` as your guide, read **only** the specific type and schema files relevant to the proposed change. Do not scan directories broadly. If the user said "border properties on Styles", read `types/Styles.ts` and `schema/Styles.yaml` — not everything in `types/` and `schema/`. Determine:
   - Which schema files in `schema/` are affected
   - Which types in `types/` are affected (added, removed, renamed fields)
   - Whether the change is MAJOR (breaking), MINOR (additive), or PATCH (non-semantic) per the constitution

5. **Evaluate options** *(skip if the decision is already made)*:
   - If the user's description or context indicates the decision is pre-decided (e.g., "record and implement this decision"), omit this step and mark the Options Considered section as *(Pre-decided — no alternatives evaluated)*.
   - **First, list the independent decisions in scope.** Schema shape, authoring surface and semantics, and vocabulary are separate decisions. Each gets its own Options section, titled by the decision it resolves, with its own selected and rejected alternatives. Never bundle two decisions into one option — a "Selected" option carrying both forces an all-or-nothing verdict and hides one of them from evaluation entirely.
   - If a decision is out of scope for this ADR, say so explicitly in Context and point to where it is taken. Do not resolve it in passing.
   - Within each Options section, identify at least two alternative approaches, assess each against the constitution's Decision Drivers, and state which is selected with rationale.

6. **Draft the ADR**: Fill `adr-template.md` and write to `$SPEC_FILE`:
   - **Branch**: `ADR_NAME`
   - **Status**: `DRAFT`
   - **Context**: Current state of the relevant types/schema and what gap or opportunity this addresses
   - **Decision Drivers**: Enumerate the constraints from the constitution that apply
   - **Options Considered**: At least two options with pros/cons relative to the drivers
   - **Decision**: Precise list of type and schema changes (file, field, modification type)
   - **Type ↔ Schema Impact**: Confirm symmetry or document justified asymmetry
   - **Downstream Impact**: All affected consumers (`specs-cli`, `specs-from-figma`, `specs-plugin-2`) — see Key rules below
   - **Semver Decision**: the **target version** read verbatim from the active release branch name (e.g. `release/schema-0.31.0+cli-0.28.0` → `0.31.0`), plus the **change class** (MAJOR / MINOR / PATCH) with justification citing the constitution. Never propose a version bump — an ADR ships *inside* a release that already has a version, so `0.30.0 → 0.31.0` invents a version the release process never asked for and conflicts with the branch it merges into.
   - **Consequences**: What becomes true after acceptance

7. **Claim ADR number in INDEX**: Update `adr/INDEX.md` to reserve the ADR number and prevent collisions.
   - On the current ADR branch, add a row to the **Draft** table (descending by number) with the ADR number and title but **no highlight** (leave the Highlights cell empty).
   - Commit this INDEX update on the ADR branch.
   - Then cherry-pick the INDEX change onto `main` (and `$RELEASE_BRANCH` if it differs from `main`):
     1. `git stash` any uncommitted work (if needed).
     2. `git checkout main && git cherry-pick <commit> && git push origin main`
     3. If `$RELEASE_BRANCH` ≠ `main`: `git checkout $RELEASE_BRANCH && git cherry-pick <commit> && git push origin $RELEASE_BRANCH`
     4. `git checkout $ADR_BRANCH` to return to the working branch.
   - This ensures other ADR authors see the claimed number immediately.

8. **Report**: Output `$SPEC_FILE` path, the `$ADR_BRANCH` name, the target `$RELEASE_BRANCH`, and a one-paragraph summary of the decision.
## Formatting rules (apply when drafting the ADR)

- **Examples over prose**: Wherever a type shape, schema property, or field change is described, include a YAML example showing the before/after or the new structure. Prefer this over sentences explaining the same idea in abstract terms.
- **Bullets over enumeration**: Use bullet lists for Decision Drivers, Consequences, and any list of more than two items. Do not write "X, Y, and Z" as a sentence when a list would be clearer.
- **Backticks for terms**: All type names, field names, file names, and schema property paths MUST be in backtick format (e.g., `Config`, `license`, `types/Config.ts`, `#/properties/license`).
- **Types and schema only**: The ADR MUST describe only changes to `types/` and `schema/` within this package. Do NOT reference implementation classes, internal files, or processing logic from downstream packages (`specs-from-figma`, `specs-plugin-2`, `specs-cli`). Downstream impact is described in terms of the observable API surface — what types or schema keys change — not how those packages implement consumption.

## Key rules

- Status MUST be `DRAFT` — never set to `ACCEPTED` in this command.
- The Semver section states the release branch's version and the change class. It MUST NOT contain a bump arrow.
- One decision per Options section. The **Decision** section only records what the option sets above already resolved — if a choice appears there for the first time, it needs its own Options section.
- The ADR describes *what* will change and *why*. It does not contain type or schema file content — those changes are applied directly by `/specs.adr.implement`.
- **Downstream Impact table**: Include rows for all consumers affected by the change: `specs-cli`, `specs-from-figma`, and `specs-plugin-2`. Describe impact and required action in general terms (e.g., "Update value mapping", "Recompile") — do not reference internal classes, methods, or implementation details of those packages.
- If the change clearly violates a constitution gate (e.g., adds runtime logic), state the violation explicitly in the ADR and halt rather than proceeding without justification.
- Use absolute paths for all file operations.
