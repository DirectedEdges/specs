---
description: Release @directededges/specs-cli to npm. Swaps file: refs to versioned, verifies, builds, tests, publishes with confirmation gates.
---

## User Input

```text
$ARGUMENTS
```

Arguments: `<version> <schema-version> <specs-from-figma-version>`
- First argument: the CLI version to release (e.g., `0.6.0`)
- Second argument: the @directededges/specs-schema version to reference (e.g., `0.16.0`)
- Third argument: the @directededges/specs-from-figma version to reference (e.g., `0.7.0`)

You **MUST** have all three values before proceeding. If any are missing, ask for them.

## Working Directory

All commands in this agent run from the **CLI package directory**: `packages/cli` (relative to repo root). Use absolute paths for file reads, but run shell commands from `packages/cli`.

## Outline

0. **Ensure a tracking PR exists for this release branch** — do this FIRST, before any other step, every time this agent runs. An in-flight release must always be discoverable in `gh pr list` so a release branch can never be silently abandoned.
   1. Confirm the current branch matches `release/*`. If not, STOP and report — this agent only runs from a release branch.
   2. Check for an existing PR:
      ```bash
      gh pr list --repo DirectedEdges/specs --head "$(git branch --show-current)" --state all --json number,state,isDraft --jq '.[0]'
      ```
   3. If no PR exists, push the branch and create a **draft** PR immediately:
      ```bash
      git push -u origin "$(git branch --show-current)" 2>/dev/null || true
      gh pr create --draft --base main --head "$(git branch --show-current)" \
        --title "release: $(git branch --show-current)" \
        --body "Draft release PR — opened automatically by CLI.release agent so the in-flight release is visible. Versions, CHANGELOG, build, tests, and publish will be finalized before this is marked ready."
      ```
   4. Report the PR URL and continue.

1. **Verify version**: Read `packages/cli/package.json`. Confirm the `version` field matches the first argument. If not, STOP and ask whether to update it or abort.

2. **Verify CHANGELOG**: Read `packages/cli/CHANGELOG.md`. Confirm:
   - An entry exists for this version (e.g., `## [0.6.0]`)
   - The entry has a date (use today if missing)
   - A **Summary paragraph** exists at the top of the version entry (immediately after the heading). This is written last, after all bullets are done. It must:
     - Open with the most important user-facing capability in this release
     - Answer "So what?" — what can users now do that they couldn't before?
     - Avoid implementation vocabulary (registries, transformer pipelines, ref swaps, upstream) in favor of plain language
     - Be 2–4 sentences; every sentence should carry meaning a user cares about
     - If missing or too technical, draft a replacement and update the file before continuing
   - Individual bullets lead with a **bold plain sentence** that describes what the change *enables* — not just what was added. "A new command for analyzing props across a catalog" not "New command for on-demand analysis passes over component specs." If bullets read like API docs, rewrite them before continuing.
   - **Empty sections are removed** — if `### Changed`, `### Removed`, or `### Fixed` has no bullets, delete that section heading entirely. Do not leave placeholder empty sections.
   - The entry has content under at least one of Added/Changed/Fixed
   - A **Dependency updates** subsection summarizes what changed in upstream packages. To write this:
     1. Read the specs-schema CHANGELOG (`packages/schema/CHANGELOG.md`) for the `<schema-version>` entry
     2. Read the specs-from-figma CHANGELOG for the `<specs-from-figma-version>` entry
     3. Summarize in plain language what these upstream changes mean for CLI users — focus on user-visible behavior changes (new output fields, changed data shapes, corrected values) rather than internal code structure. Write from the CLI user's perspective (e.g., "Specs now include..." not "The transformer refactored...")
   If incomplete, STOP and report what's missing.

3. **Verify clean working tree**:
   ```bash
   git status --porcelain
   ```
   If dirty, STOP and report. Exception: changes made by this agent (e.g., CHANGELOG date, ref swap) are expected.

4. **Verify npm auth** — this package publishes via the user's **personal** login (2FA), not the automation token (see step 9). Check the default login:
   ```bash
   npm whoami
   ```
   If this errors (401/E401), the user isn't logged in yet — that's fine; they'll run `npm login` at the publish step (9.3). Do not use `--userconfig "$WORKSPACE_ROOT/.npmrc.public"` for the CLI: that automation token is rejected by the package's 2FA policy (403).

5. **Verify dependency versions**: Read `packages/cli/package.json` and confirm:
   - `@directededges/specs-schema` matches `^[schema-version]`
   - `@directededges/specs-from-figma` matches `^[specs-from-figma-version]`
   If either is a `file:` path, update it to the versioned reference. If the version doesn't match, ask whether to update or abort.

6. **Build**:
   ```bash
   cd packages/cli && npm run build
   ```
   If build fails, STOP.

7. **Run tests**:
   ```bash
   cd packages/cli && npm test
   ```
   If tests fail, report the failures and ask the user whether to proceed or abort.

8. **Present setup summary**:
   ```
   @directededges/specs-cli v[version] — Setup Summary
     ✓ Version: [version]
     ✓ CHANGELOG: [version] — [date]
     ✓ Working tree: clean (before ref swap)
     ✓ Auth: [username]
     ✓ Dependencies: specs-schema → ^[schema-version], specs-from-figma → ^[fts-version]
     ✓ Build: passed
     ✓ Tests: passed (or ⚠ with note)
   ```

9. **Ship gate**: Use `AskUserQuestion` with Yes/No options: **"Ready to commit, tag, and publish @directededges/specs-cli v[version]?"**
   On Yes:
   1. Commit (if there are uncommitted changes):
      ```bash
      git add -A && git commit -m "release: @directededges/specs-cli v[version]"
      ```
   2. Tag (scoped for monorepo):
      ```bash
      git tag -a "specs-cli@[version]" -m "release: @directededges/specs-cli v[version]"
      ```
   3. **Publish — local, 2FA, command-line (GO-FORWARD DEFAULT).**

      `@directededges/specs-cli` is configured on npm to **require 2FA and disallow automation tokens**, so the `.npmrc.public` token path fails with 403 and CI OIDC Trusted Publishing is not used. The package owner (Nathan) publishes it himself with his personal login + a one-time password. **You (the agent) cannot run this step — you can't enter the OTP.** Instead, print the exact commands for the user to copy-paste, then wait.

      Present this block verbatim (it is safe to copy as-is — paths are absolute):
      ```bash
      # 1. One-time per session: log in as yourself (NOT the automation token)
      npm whoami || npm login
      # 2. Publish (npm will prompt for your 2FA OTP)
      cd "/Users/nathanacurtis/Github Desktop/specs/packages/cli" && npm publish --access public
      ```
      Do **not** pass `--userconfig .npmrc.public` here — that forces the rejected automation token. Tell the user to look for npm's `+ @directededges/specs-cli@[version]` success line.

      Then **verify from the registry** (this you can run — it's the authoritative confirmation, independent of their terminal):
      ```bash
      npm view @directededges/specs-cli version   # must report [version]
      ```
      Do not proceed to the finalize gate until this reports `[version]`. If publish failed with "previously published version", report and ask whether to bump the patch or skip.

      > **CI Trusted Publishing (`release-cli.yml`) is NOT the go-forward path.** It remains in the repo but is not used: the 2FA-required package plus an unresolved `setup-node`/OIDC token-fallback issue made it unreliable, and Nathan prefers per-release local 2FA (cheaper than debugging CI). Details in [Trusted Publishing (CI)](#trusted-publishing-ci--alternative-publish-path) below.

10. **Finalize gate**: Use `AskUserQuestion` with Yes/No options: **"Ready to push, create PR, and GitHub Release for @directededges/specs-cli v[version]?"**
    On Yes:
    1. Push to remote (including the tag):
       ```bash
       git push --follow-tags
       ```
    2. **Collect issue references** from both PR bodies and commit messages on this release branch since it diverged from main. Capture cross-repo refs (e.g. `DirectedEdges/specs-plugin-2#42`) as well as bare `#N` refs — required because closing trailers can live on commits that touch upstream issues in sibling repos, not just on PRs in this repo:
       ```bash
       BRANCH=$(git branch --show-current)
       {
         gh pr list --repo DirectedEdges/specs --base "$BRANCH" --state merged --json body --jq '.[].body'
         git log main.."$BRANCH" --pretty=%B
       } | grep -oiE '(closes|fixes|resolves)[[:space:]]+([A-Za-z0-9._-]+/[A-Za-z0-9._-]+)?#[0-9]+' | sort -fu
       ```
       Normalize each match to `Closes <ref>` (preserving any `owner/repo` prefix) and append one per line to the PR body so issues auto-close when this PR merges to main. Cross-repo refs require `owner/repo#N` — without that prefix GitHub won't reach the sibling repo's issue.

    3. Finalize the tracking PR. Step 0 opened a draft PR at the start; now mark it ready and update title/body:
       ```bash
       PR_NUM=$(gh pr list --repo DirectedEdges/specs --head "$(git branch --show-current)" --state open --json number --jq '.[0].number')
       gh pr ready "$PR_NUM"
       gh pr edit "$PR_NUM" --title "release: @directededges/specs-cli v[version]" --body "$(cat <<'EOF'
       ## Summary
       - Release @directededges/specs-cli v[version]
       - Compatible with @directededges/specs-schema ^[schema-version] and @directededges/specs-from-figma ^[fts-version]
       - See packages/cli/CHANGELOG.md for details

       [collected Closes #N lines, one per line]
       EOF
       )"
       ```
       If no PR exists at this point (step 0 was skipped), create one with `gh pr create --base main --head <branch> --title "..." --body "..."`.
    4. Create the GitHub Release (scoped tag):
       - Extract the release notes from `packages/cli/CHANGELOG.md` for this version.
       ```bash
       gh release create "specs-cli@[version]" --title "@directededges/specs-cli v[version]" --notes "$(cat <<'EOF'
       [extracted CHANGELOG content for this version]
       EOF
       )"
       ```
       - Verify the release was created:
       ```bash
       gh release view "specs-cli@[version]" --json url --jq '.url'
       ```
    4. Report the PR URL and release URL.

## Trusted Publishing (CI) — alternative publish path

There are **two ways** to publish `@directededges/specs-cli`, and they are mutually exclusive **per version** (publishing once makes the version immutable):

| | Local token publish (default) | CI Trusted Publishing |
|---|---|---|
| Where | Your machine, this agent's ship gate | GitHub Actions (`.github/workflows/release-cli.yml`) |
| Auth | Long-lived token in `$WORKSPACE_ROOT/.npmrc.public` | Short-lived OIDC token minted per run (no stored secret) |
| Provenance | No | Yes (signed attestation, public repo + public package) |
| Trigger | Interactive (Yes/No gates here) | `workflow_dispatch` with the tag, gated by the `npm-publish` environment |

This workflow exists **in addition to** the local flow and does not retire it. Trusted Publishing cannot run from a laptop — only from GitHub-hosted runners — so the local token path remains the fallback (and the only option for any urgent hotfix you can't route through CI).

**To release a version via CI instead of locally:**

1. Run this agent's steps 0–8 and the ship gate's commit + tag (steps 9.1–9.2), but **skip the local `npm publish`** (step 9.3).
2. In the finalize gate, `git push --follow-tags` so the `specs-cli@<version>` tag reaches GitHub.
3. Trigger the workflow on that tag:
   ```bash
   gh workflow run release-cli.yml --repo DirectedEdges/specs -f tag=specs-cli@[version]
   ```
4. Approve the run if the `npm-publish` environment requires it, then continue the finalize gate (PR ready + GitHub Release) as usual.

**One-time setup (must be done before CI publish works):**

- On npmjs.com → `@directededges/specs-cli` → Settings → **Trusted Publisher**: register owner `DirectedEdges`, repository `specs`, workflow filename `release-cli.yml`.
- (Recommended) Create a GitHub **Environment** named `npm-publish` with required reviewers, for a manual-approval gate equivalent to the local ship gate.
- After CI is verified, you may optionally tighten the package to **"Require two-factor authentication and disallow tokens"** and revoke the automation token — but only do this once you're ready to drop the local token path entirely (it would disable the default flow above).

## Key rules

- Use absolute paths for all file operations.
- All shell commands run from `packages/cli` unless they are git or gh commands (which run from repo root).
- **Tag format**: `specs-cli@[version]` — scoped to distinguish from schema releases in the same repo.
- Two gates only: **ship** (agent commits + tags; **user** runs the 2FA `npm publish`, agent verifies via `npm view`) and **finalize** (push + PR + GitHub release).
- If any verification step fails, halt immediately — do not skip to later steps. For test failures, ask the user whether to proceed.
- The committed state has **versioned** dependency references (not `file:` paths). This is intentional — `file:` paths are a local development convenience, not committed to GitHub.
- If any step fails after refs were swapped, run `git restore packages/cli/package.json` before reporting the error.
- Cleanup (branch deletion after PR merge) is handled by the release orchestrator, not this agent.
