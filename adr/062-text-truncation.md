# ADR: Text truncation style keys (`textTruncation`, `maxLines`)

**Branch**: `062-text-truncation`
**Created**: 2026-07-09
**Status**: DRAFT
**Deciders**: Nathan Curtis (author)
**Supersedes**: *(none)*

---

## Context

A text node in Figma can be configured to truncate its content with an ellipsis when the content exceeds the node's bounds. Two `TextNode` properties govern this behaviour:

- [`textTruncation`](https://developers.figma.com/docs/plugins/api/properties/TextNode-texttruncation/) — `'DISABLED' | 'ENDING'`. Whether truncation with a trailing ellipsis is applied.
- [`maxLines`](https://developers.figma.com/docs/plugins/api/properties/TextNode-maxlines/) — `number | null`. The maximum number of lines a text node may reach before it truncates. Only meaningful when `textTruncation` is `'ENDING'`; `null` means no line limit.

Neither property is currently represented in the schema. `Styles` in `types/Styles.ts` and the `Styles` definition in `schema/styles.schema.json` have no key for either, and `StyleKey` does not enumerate them. As a result, truncation configuration is silently dropped from spec output — a fidelity gap for line-clamped labels, single-line truncating text, and any component whose text overflow behaviour is part of its design contract. Reverse-direction tooling likewise has no key to write these values back to a Figma node.

Both properties belong to the `TEXT` element type only. Both are structural: they describe a fixed configuration on the node and are **not** token-bindable, prop-bindable, or conditional in Figma.

---

## Decision Drivers

- **Additive-only** — introduce new optional keys without altering any existing type or schema, so downstream consumers incur no breaking change (MINOR bump).
- **Type ↔ schema parity** — every new `types/` field has a matching `schema/` definition; no drift (Constitution I).
- **Structural-enum typing rule** — a closed, non-token-bindable value set MUST be a named type, not `Style` (Constitution "Typing — structural enums vs. `Style`"). This is why `textTruncation` mirrors `LayoutMode`/`Position` rather than reusing `Style`, and `maxLines` mirrors `PositionOffset`.
- **Naming governance** — field names and enum values chosen per Constitution VI (code-platforms-first), documented below.
- **No runtime logic** — this package gains only type declarations and schema definitions (Constitution II).
- **Round-trip fidelity** — the enum member names must survive a Figma → spec → Figma round trip without a translation table the writer would have to invert.

---

## Options Considered

### Option A: Two named structural types — `TextTruncation` and `MaxLines` *(Selected)*

Add `textTruncation` typed as `TextTruncation | null` (`type TextTruncation = 'DISABLED' | 'ENDING'`) and `maxLines` typed as `MaxLines` (`type MaxLines = number | null`), each with a matching `*StyleValue` schema definition. Mirrors the established structural-enum siblings (`LayoutMode`, `Position`, `PositionOffset`).

**Pros**:
- Satisfies the structural-enum typing rule directly — closed value sets get named types.
- Symmetric, self-documenting type and schema definitions consistent with existing structural keys.
- `TextTruncation` is reusable if a future reverse-writer or validator needs the enum by name.

**Cons / Trade-offs**:
- Adds two named types to the public surface rather than reusing generic value types.

---

### Option B: Type both as generic `Style` *(Rejected)*

Type `textTruncation` and `maxLines` as `Style` (like the grandfathered `textAlignHorizontal`).

**Rejected because**: Violates the "structural enums vs. `Style`" rule — both values are closed and non-token-bindable, so they must be named types. `Style` would also imply they can carry `TokenReference`/`PropBinding`/`Conditional`, which is false for these properties. The existing `textAlignHorizontal: Style` typing is a grandfathered inconsistency, not a precedent to extend.

---

### Option C: Single composite `TextTruncation` object `{ mode, maxLines }` *(Rejected)*

Model both properties as one nested object.

**Rejected because**: Figma exposes two independent flat properties; `maxLines` is a valid standalone value on a node even when read alongside `textTruncation`. Composing them invents a shape no source or consumer uses, complicates the flat `Styles` map, and would force the transformer and any writer to pack/unpack a synthetic object. Flat keys mirror the source and keep per-key diffing (`DETAILS: LAYERED`) working unchanged.

---

## Decision

Add two flat, optional, `TEXT`-only structural keys to `Styles`, two named types, and matching schema definitions.

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `types/Styles.ts` | Add field `textTruncation: TextTruncation \| null` to `Styles` | MINOR |
| `types/Styles.ts` | Add field `maxLines: MaxLines` to `Styles` | MINOR |
| `types/Styles.ts` | Add `export type TextTruncation = 'DISABLED' \| 'ENDING'` | MINOR |
| `types/Styles.ts` | Add `export type MaxLines = number \| null` | MINOR |
| `types/Styles.ts` | Add `'textTruncation'` and `'maxLines'` to the `StyleKey` union | MINOR |

**Example — new shape** (`types/Styles.ts`):
```yaml
# After — within the Styles Partial
Styles:
  # …existing text keys…
  textAlignHorizontal: Style
  textAlignVertical: Style
  # Whether text truncates with a trailing ellipsis. Structural — not token-bindable. TEXT only.
  textTruncation: TextTruncation | null
  # Max line count before ENDING truncation applies; null = no limit. Structural — not token-bindable. TEXT only.
  maxLines: MaxLines

# New named types
TextTruncation: "'DISABLED' | 'ENDING'"
MaxLines: "number | null"
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `schema/styles.schema.json` | Add property `textTruncation` → `#/definitions/TextTruncationStyleValue` under `Styles.properties` | MINOR |
| `schema/styles.schema.json` | Add property `maxLines` → `#/definitions/MaxLinesStyleValue` under `Styles.properties` | MINOR |
| `schema/styles.schema.json` | Add definitions `TextTruncationStyleValue` and `MaxLinesStyleValue` | MINOR |

**Example — new shape** (`schema/styles.schema.json`):
```yaml
# Under #/definitions/Styles/properties (additionalProperties stays false)
textTruncation:
  $ref: "#/definitions/TextTruncationStyleValue"
  description: "Whether text truncates with a trailing ellipsis. Structural property — not token-bindable."
maxLines:
  $ref: "#/definitions/MaxLinesStyleValue"
  description: "Maximum number of lines before ENDING truncation applies; null or absent means no limit."

# New definitions (mirror LayoutModeStyleValue / PositionOffset shape)
TextTruncationStyleValue:
  description: "Text truncation value. Structural property — not token-bindable."
  oneOf:
    - { type: string, enum: ["DISABLED", "ENDING"] }
    - { type: "null" }
MaxLinesStyleValue:
  description: "Maximum line count before truncation, or null for no limit. Not token-bindable."
  oneOf:
    - { type: number }
    - { type: "null" }
```

### Notes

- **Both keys optional** — `Styles` is a `Partial`; the keys are present only for `TEXT` elements. `additionalProperties: false` on the `Styles` schema definition means the new properties MUST be declared there for valid text output to pass validation.
- **`| null` on `textTruncation`** — mirrors the sibling structural enums (`LayoutMode`, `Position`, `MainAxisAlignment`), all of which are `TypeName | null`, and tolerates a defensive null read for non-text or unset nodes.
- **Naming — `maxLines`** (Constitution VI, rule 2): a single code platform, Android/Jetpack Compose, names this property exactly `maxLines`, and it coincides with Figma's name — so the code-platform choice imposes zero transformer translation. (SwiftUI `lineLimit`, React Native `numberOfLines` diverge; no 2+ code-platform consensus, so rule 1 does not apply.)
- **Naming — `textTruncation` and values `DISABLED`/`ENDING`** (Constitution VI, rule 3): no code-platform consensus exists for the truncation-mode concept (SwiftUI `truncationMode`, CSS `text-overflow`, Android `TextOverflow`, React Native `ellipsizeMode` all differ). Deferring to Figma's `textTruncation` name and its `'DISABLED' | 'ENDING'` values avoids a lossy mode-mapping table and preserves reverse-direction round-trip fidelity. Values are already `SCREAMING_CASE`, satisfying the enum-casing rule.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes.
- **Parity check**:
  - `Styles.textTruncation` (`TextTruncation | null`) ↔ `Styles.properties.textTruncation` → `TextTruncationStyleValue` (`enum ["DISABLED","ENDING"]` ∪ `null`).
  - `Styles.maxLines` (`MaxLines` = `number | null`) ↔ `Styles.properties.maxLines` → `MaxLinesStyleValue` (`number` ∪ `null`).
  - `StyleKey` gains `'textTruncation'` and `'maxLines'`, matching the two new `Styles` properties.

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-from-figma` | Emits the two new keys for `TEXT` elements | None — generator already reads `textTruncation` (pureString) and `maxLines` (pureNumber) and emits them; recompiles against the new types |
| `specs-cli` | New keys may appear in validated/serialized output | Recompile against the new schema version; no code change |
| `specs-plugin-2` | New keys may appear in plugin-side spec output | Recompile against the new types; no code change |

---

## Semver Decision

**Version bump**: `0.28.0 → 0.28.0` (`MINOR`; lands within the in-progress, unreleased `0.28.0`)

**Justification**: All changes are additive — two new optional fields on `Styles`, two new exported types, two additive `StyleKey` members, and additive schema definitions. No existing type, field, or schema property is removed, renamed, or restructured. Additive changes are `MINOR` per Constitution III and the Versioning policy. Because `0.28.0` is unreleased, the additions ride within that MINOR release rather than requiring a new version line.

---

## Consequences

- Spec output faithfully represents text truncation configuration; line-clamped and single-line-truncating text no longer lose that information.
- Reverse-direction tooling (`figma-from-specs`) gains named keys to write `textTruncation` and `maxLines` back to a Figma `TextNode`.
- Consumers validating against `schema/styles.schema.json` must adopt schema `0.28.0`; text nodes carrying the new keys would fail validation against `0.27.0` (`additionalProperties: false`).
- `TextTruncation` and `MaxLines` become part of the public type surface and are subject to the stability rules of Constitution III going forward.
- The grandfathered `textAlignHorizontal: Style` / `textAlignVertical: Style` typing remains untouched; this ADR does not retrofit those to named types.
