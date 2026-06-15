---
description: Release @directededges/specs-schema to npm. Verifies version, CHANGELOG, builds, and publishes with confirmation gates.
---

## User Input

```text
$ARGUMENTS
```

The argument is the version to release (e.g., `0.16.0`). You **MUST** have a version before proceeding.

## Working Directory

All commands in this agent run from the **schema package directory**: `packages/schema` (relative to repo root). Use absolute paths for file reads, but run shell commands from `packages/schema`.

## Outline

0. **Ensure a tracking PR exists for this release branch** — do this FIRST, before any other step, every time this agent runs. An in-flight release must always be discoverable in `gh pr list` so a release branch can never be silently abandoned.
   1. Confirm the current branch matches `release/*`. If not, STOP and report — this agent only runs from a release branch.
   2. Check for an existing PR:
      ```bash
      gh pr list --repo DirectedEdges/specs --head "$(git branch --show-current)" --state all --json number,state,isDraft --jq '.[0]'
      ```
   3. If no PR exists, push the branch (if not already pushed) and create a **draft** PR immediately, even if the version/CHANGELOG isn't finalized yet:
      ```bash
      git push -u origin "$(git branch --show-current)" 2>/dev/null || true
      gh pr create --draft --base main --head "$(git branch --show-current)" \
        --title "release: $(git branch --show-current)" \
        --body "Draft release PR — opened automatically by Schema.release agent so the in-flight release is visible. Versions, CHANGELOG, build, tests, and publish will be finalized before this is marked ready."
      ```
   4. Report the PR URL and continue.

1. **Verify version**: Read `packages/schema/package.json`. Confirm the `version` field matches the argument. If not, STOP and ask whether to update it or abort.

2. **Verify CHANGELOG**: Read `packages/schema/CHANGELOG.md`. Confirm:
   - An entry exists for this version (e.g., `## [0.16.0]`)
   - The entry has an appended date (e.g., `## [0.16.0] - 2026-04-05`). If missing, use today's date.
   - A **Summary paragraph** exists at the top of the version entry (immediately after the heading). This is written last, after all bullets are done. It must:
     - Open with the most important user-facing capability in this release
     - Answer "So what?" — what can consumers of this schema now express or do that they couldn't before?
     - Avoid implementation vocabulary (type aliases, discriminated unions, internal identifiers) in favor of plain language about what the types *enable*
     - Be 2–4 sentences; every sentence should carry meaning a user cares about
     - If missing or too technical, draft a replacement and update the file before continuing
   - Individual bullets lead with a **bold plain sentence** that describes what the property or type *enables* — not just what was added. If bullets read like type declaration docs, rewrite them before continuing.
   - **Empty sections are removed** — if `### Changed`, `### Removed`, or `### Fixed` has no bullets, delete that section heading entirely.
   - The entry groups content under at least one of Added/Changed/Removed/Fixed

   If incomplete, STOP and report what's missing.

3. **Verify clean working tree**:
   ```bash
   git status --porcelain
   ```
   If dirty, STOP and report. Exception: changes made by this agent (e.g., CHANGELOG date added) are expected.

4. **Verify npm auth** (use the same `--userconfig` as publish):
   ```bash
   npm whoami --registry https://registry.npmjs.org/ --userconfig "$WORKSPACE_ROOT/.npmrc.public"
   ```
   where `$WORKSPACE_ROOT` is the specs-local-workspace directory (typically `../specs-local-workspace` relative to this repo).
   If this fails with 401, STOP and report. The token in `.npmrc.public` is likely expired. The user should:
   1. Generate a new access token at https://www.npmjs.com/settings/tokens
   2. Update `$WORKSPACE_ROOT/.npmrc.public` with the new token

5. **Build**:
   ```bash
   cd packages/schema && npm run build
   ```
   If build fails, STOP.

6. **Run type-level tests**:
   ```bash
   cd packages/schema && npx tsc --noEmit --strict tests/*.test-d.ts
   ```
   If tests fail, report errors and ask the user whether to proceed or abort.

7. **Present setup summary**:
   ```
   @directededges/specs-schema v[version] — Setup Summary
     ✓ Version: [version]
     ✓ CHANGELOG: [version] — [date]
     ✓ Working tree: clean
     ✓ Auth: [username]
     ✓ Build: passed
     ✓ Type tests: passed (or ⚠ with note)
   ```

8. **Ship gate**: Use `AskUserQuestion` with Yes/No options: **"Ready to commit, tag, and publish @directededges/specs-schema v[version]?"**
   On Yes:
   1. Commit (if there are uncommitted changes):
      ```bash
      git add -A && git commit -m "release: @directededges/specs-schema v[version]"
      ```
   2. Tag (scoped for monorepo):
      ```bash
      git tag -a "specs-schema@[version]" -m "release: @directededges/specs-schema v[version]"
      ```
   3. Publish from the package directory (uses workspace `.npmrc.public` token to target npmjs.org):
      ```bash
      cd packages/schema && npm publish --access public --userconfig "$WORKSPACE_ROOT/.npmrc.public"
      ```
      where `$WORKSPACE_ROOT` is the specs-local-workspace directory (typically `../specs-local-workspace` relative to this repo).
      If publish fails with "previously published version", report and ask the user whether to bump the patch version or skip.
      If publish fails **403 "Two-factor authentication is required ... automation token was specified"**, this package has been locked to 2FA like `specs-cli`. Switch to the go-forward local-2FA flow: the user runs it themselves (`npm whoami || npm login`, then `cd packages/schema && npm publish --access public` — **no** `--userconfig`, npm prompts for the OTP); you then verify with `npm view @directededges/specs-schema version`. See `CLI.release.agent.md` step 9.3.

9. **Finalize gate**: Use `AskUserQuestion` with Yes/No options: **"Ready to push, create PR, and GitHub Release for @directededges/specs-schema v[version]?"**
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
      gh pr edit "$PR_NUM" --title "release: @directededges/specs-schema v[version]" --body "$(cat <<'EOF'
      ## Summary
      - Release @directededges/specs-schema v[version]
      - See packages/schema/CHANGELOG.md for details

      [collected Closes #N lines, one per line]
      EOF
      )"
      ```
      If no PR exists at this point (step 0 was skipped), create one with `gh pr create --base main --head <branch> --title "release: @directededges/specs-schema v[version]" --body "..."`.
   4. Create the GitHub Release (scoped tag):
      - Extract the release notes from `packages/schema/CHANGELOG.md` for this version: the **Summary** paragraph and all content under the `## [version]` heading, up to (but not including) the next `##` heading.
      ```bash
      gh release create "specs-schema@[version]" --title "@directededges/specs-schema v[version]" --notes "$(cat <<'EOF'
      [extracted CHANGELOG content for this version]
      EOF
      )"
      ```
      - Verify the release was created:
      ```bash
      gh release view "specs-schema@[version]" --json url --jq '.url'
      ```
   4. Report the PR URL and release URL.

## Key rules

- Use absolute paths for all file operations.
- All shell commands run from `packages/schema` unless they are git or gh commands (which run from repo root).
- **Tag format**: `specs-schema@[version]` — scoped to distinguish from CLI releases in the same repo.
- Two gates only: **ship** (commit + tag + publish) and **finalize** (push + PR + GitHub release).
- If any verification step fails, halt immediately — do not skip to later steps. For test failures, ask the user whether to proceed.
- This package has no @directededges dependencies, so no reference swapping is needed.
- Cleanup (branch deletion after PR merge) is handled by the release orchestrator, not this agent.
