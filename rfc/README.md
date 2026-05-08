# RFCs (Request for Comments)

This folder holds **strategic, multi-decision design proposals** — broader than ADRs but not yet (or no longer) discrete decisions. RFCs carry the *why*; ADRs carry the *what*.

## When to write an RFC vs. an ADR

| Use an **ADR** when... | Use an **RFC** when... |
|---|---|
| You're locking in a single decision | You're proposing a direction with many decisions inside it |
| The scope is narrow and self-contained | The scope spans architecture, principles, and tradeoffs |
| The shape is "we adopted X over Y because Z" | The shape is "here is a proposed design and the alternatives we considered" |

An RFC may spawn ADRs as specific decisions firm up. The RFC explains the strategic argument; ADRs reference back to it for context rather than re-explaining.

## Structure

Each RFC lives in a numbered folder with `README.md` as the main document. Supporting documents (companions, sketches, appendices) live alongside in the same folder.

```
rfc/
├── README.md                          ← this file (the index)
├── 001-component-dictionary/
│   ├── README.md                      ← the RFC itself
│   ├── <companion docs>.md
│   └── sketches/
└── …
```

## RFC sections

The conventional shape, adapted from common practice (Rust RFCs, Kubernetes KEPs):

- **Status, Authors, Date** — header
- **Summary** — one paragraph
- **Motivation** — the problem being solved
- **Detailed design** — the proposal itself, including principles, architecture, surface area
- **Prior art / relationship to existing tools** — what already exists in this space, what the proposal serves vs. replaces vs. complements
- **Alternatives considered** — what we'd be doing instead, and why we're not
- **Drawbacks** — what's bad about this proposal; what could go wrong
- **Unresolved questions** — what isn't decided yet
- **Future work** — what's anticipated but explicitly out of scope

Not every RFC needs every section. Skip what doesn't apply.

## Status values

- **Proposed** — open for review and revision; expect changes
- **Accepted** — committed direction; further revisions tracked in git history
- **Superseded** — replaced by another RFC (link to it)
- **Withdrawn** — abandoned

## Index

| # | Title | Status |
|---|---|---|
| 001 | [Component Dictionary](001-component-dictionary/) | Proposed |
