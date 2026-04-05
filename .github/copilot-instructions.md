# GitHub Copilot Custom Instructions

## Instructions
- **Don't Get Ahead:** Only edit or suggest code based on the current task, file and context provided. Do not continue on to next tasks without explicit instruction.

## Context Management
- **Prioritize Active File:** Always prioritize the logic in the currently active file over other open tabs.
- **Ignore Build Artifacts:** Never scan or reference files in `dist/`, `build/`, or `node_modules/` unless explicitly verifying output or directly asked to.
- **Ignore Documentation Files:** Unless explicitly asked, do not ingest `.md` or `.txt` files from `/docs`, `/specs` or `/adr` folders into chat context.

## Project Constitution
- **Always apply**: The project constitution at `.specify/memory/constitution.md` governs all development decisions. Read it when planning or reviewing changes to ensure alignment with core principles, quality gates, and governance rules.

## Response Style
- **Be Concise:** Keep explanations very brief unless asked for a report.
- **Favor code over prose responses:** Focus on code snippets rather than prose responses to save tokens.
- **Incremental Changes:** Propose small, modular changes instead of rewriting entire files.
- **No Summary Needed:** Do not summarize my previous prompts unless I ask for a recap.
