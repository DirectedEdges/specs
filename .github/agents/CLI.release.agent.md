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
   - A **Summary** line exists at the top of the version entry (immediately after the heading), providing a high-level overview of this release
   - The entry has content under Added/Changed/Removed/Fixed
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

4. **Verify npm auth** (use the same `--userconfig` as publish):
   ```bash
   npm whoami --registry https://registry.npmjs.org/ --userconfig "$WORKSPACE_ROOT/.npmrc.public"
   ```
   where `$WORKSPACE_ROOT` is the specs-local-workspace directory (typically `../specs-local-workspace` relative to this repo).
   If this fails with 401, STOP and report. The token in `.npmrc.public` is likely expired. The user should:
   1. Generate a new access token at https://www.npmjs.com/settings/tokens
   2. Update `$WORKSPACE_ROOT/.npmrc.public` with the new token

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
   3. Publish from the package directory (uses workspace `.npmrc.public` token to target npmjs.org):
      ```bash
      cd packages/cli && npm publish --access public --userconfig "$WORKSPACE_ROOT/.npmrc.public"
      ```
      where `$WORKSPACE_ROOT` is the specs-local-workspace directory (typically `../specs-local-workspace` relative to this repo).
      If publish fails with "previously published version", report and ask the user whether to bump the patch version or skip.

      > **Alternative:** instead of publishing locally with the token, you can let CI publish via OIDC Trusted Publishing — see [Trusted Publishing (CI)](#trusted-publishing-ci--alternative-publish-path) below. If you choose CI, **skip this local `npm publish` step** (still commit + tag here, then push the tag in the finalize gate so CI can publish it). Do not do both for the same version, or the second publish fails with "previously published version".

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
- Two gates only: **ship** (commit + tag + publish) and **finalize** (push + PR + GitHub release).
- If any verification step fails, halt immediately — do not skip to later steps. For test failures, ask the user whether to proceed.
- The committed state has **versioned** dependency references (not `file:` paths). This is intentional — `file:` paths are a local development convenience, not committed to GitHub.
- If any step fails after refs were swapped, run `git restore packages/cli/package.json` before reporting the error.
- Cleanup (branch deletion after PR merge) is handled by the release orchestrator, not this agent.
