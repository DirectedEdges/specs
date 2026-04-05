---
description: Confirms the implementation is clean, then marks the ADR as ACCEPTED. Run this after reviewing the diff from /specs.adr.implement.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Setup**: Run `.specify/scripts/bash/check-prerequisites.sh --json --paths-only` from repo root. Parse `REPO_ROOT`, `BRANCH`. All paths must be absolute.
   - Derive `ADR_NAME` from `BRANCH`:
     - Use `BRANCH` directly as `ADR_NAME` (e.g., `011-icon-glyph-as-content`).
   - The branch name must match an ADR name pattern (starts with a number sequence followed by a hyphen, e.g., `011-`). If no ADR number is found, halt: "Branch does not appear to be an ADR branch."

2. **Load context**:
   - **REQUIRED**: Read `$REPO_ROOT/adr/$ADR_NAME.md` — confirm Status is `DRAFT` (if already `ACCEPTED`, report and halt)
   - Confirm that `types/`, `schema/`, `package.json`, and `CHANGELOG.md` have been modified by the implement agent (check git status or file timestamps)
   - If no changes are detected, halt: "Run the implement agent first."

3. **Re-run validation gates**:
   - Run: `tsc -p tsconfig.build.json --noEmit`
     - If exit code ≠ 0: halt and display errors. Do not set ACCEPTED.
   - Run: `.specify/scripts/bash/validate-schema.sh`
     - If any schema fails: halt and report. Do not set ACCEPTED.
   - Run: `tsc --noEmit --strict tests/*.test-d.ts` (if `tests/*.test-d.ts` files exist)
     - If exit code ≠ 0: halt and display errors. Do not set ACCEPTED.

4. **Mark ADR ACCEPTED**: In `$REPO_ROOT/adr/$ADR_NAME.md` header, change `Status: DRAFT` to `Status: ACCEPTED`.

5. **Update INDEX**: Read `adr/INDEX.md` and update the entry for this ADR:
   - Move the row from the **Draft** table to the **Accepted** table (descending by number).
   - Update the **Title** to match the final ADR heading (it may have changed during implementation).
   - Add a **Highlights** summary (max 144 characters) describing the key change as accepted.
   - If no entry exists in the Draft table (older ADR created before INDEX tracking), add the row directly to the Accepted table.

6. **Determine release branch**: Read the ADR's `## Semver Decision` section to find the target version (e.g., `0.12.0`). The release branch name is the version number itself (e.g., `0.12.0`).

7. **Create PR**: Commit any uncommitted changes (the status flip and INDEX update), push `$BRANCH`, and open a PR into the release branch using `gh pr create --base $RELEASE_BRANCH`.

8. **Report**: Confirm all gates passed, the ADR is ACCEPTED, and the PR has been created. List the next steps:
   - Review and merge the PR into the release branch
   - When all ADRs for the release are complete, merge `$RELEASE_BRANCH` into `main` and `npm publish`

## Key rules

- This command only flips the ADR status — it does not apply any code changes.
- Status MUST only move to `ACCEPTED` after all three validation gates pass in step 3.
- Use absolute paths for all file operations.
