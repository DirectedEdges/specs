# ADR: Text truncation style keys (`textTruncation`, `maxLines`)

**Branch**: `062-text-truncation`
**Created**: 2026-07-09
**Status**: DRAFT
**Deciders**: Nathan Curtis (author)
**Supersedes**: *(none)*

---

## Context

A text node in Figma can be configured to truncate its content with an ellipsis when the content exceeds the node's bounds. Two `TextNode` properties govern this behaviour:

- [`textTruncation`](https://developers.figma.com/docs/plugins/api/properties/TextNode-texttruncation/) — `'DISABLED' | 'ENDING'`. Whether truncation with a trailing ellipsis is applied. A closed enum.
- [`maxLines`](https://developers.figma.com/docs/plugins/api/properties/TextNode-maxlines/) — `number | null`. The maximum number of lines a text node may reach before it truncates. Only meaningful when `textTruncation` is `'ENDING'`; `null` means no line limit. An ordinary number.

Neither property is currently represented in the schema. `Styles` in `types/Styles.ts` and the `Styles` definition in `schema/styles.schema.json` have no key for either, and `StyleKey` does not enumerate them. As a result, truncation configuration is silently dropped from spec output — a fidelity gap for line-clamped labels, single-line truncating text, and any component whose text overflow behaviour is part of its design contract.

Both properties belong to the `TEXT` element type only. `textTruncation` is a structural enum that is not token-bindable. `maxLines` is a plain number — the same shape as `width`, `height`, `opacity`, and `cornerSmoothing`, all of which are already typed as `Style`.

---

## Decision Drivers

- **Additive-only** — introduce new optional keys without altering any existing type or schema, so downstream consumers incur no breaking change (MINOR bump).
- **Type ↔ schema parity** — every new `types/` field has a matching `schema/` definition; no drift (Constitution I).
- **Structural-enum typing rule** — a closed, non-token-bindable value set MUST be a named type, not `Style` (Constitution "Typing — structural enums vs. `Style`"). This governs `textTruncation`.
- **Consistency for plain numbers** — a numeric property with no closed value set is typed as `Style`, exactly like every other numeric key on `Styles` (`width`, `opacity`, `cornerSmoothing`). This governs `maxLines`. The named-narrow-type rule targets shapes like `PositionOffset` (`number | string | null`), not a plain number.
- **Naming governance** — field names and enum values chosen per Constitution VI (code-platforms-first), documented below.
- **No runtime logic** — this package gains only type declarations and schema definitions (Constitution II).

---

## Options Considered

### Option A: `textTruncation` as a named enum; `maxLines` as `Style` *(Selected)*

- `textTruncation`: `TextTruncation | null` where `type TextTruncation = 'DISABLED' | 'ENDING'`, with a `TextTruncationStyleValue` schema definition — mirrors `LayoutMode`/`Position`.
- `maxLines`: `Style`, with the shared `NumberStyleValue` schema definition — mirrors `width`, `opacity`, `cornerSmoothing`.

**Pros**:
- Each property is typed by its actual nature: a closed enum gets a named type; a plain number gets `Style`.
- `maxLines` stays consistent with every other numeric key and needs no bespoke type or schema definition.
- `Style` correctly permits a `TokenReference` for `maxLines`, matching Figma's variable-binding capability for numeric properties and the transformer's existing treatment (a token-bindable pure number).

**Cons / Trade-offs**:
- Two properties in the same feature are typed differently. This reflects a real difference in their value domains, not an inconsistency.

---

### Option B: Both as named structural types (`TextTruncation`, `MaxLines`) *(Rejected)*

Give `maxLines` a dedicated `MaxLines = number | null` type and a `MaxLinesStyleValue` schema definition.

**Rejected because**: `maxLines` is a plain number with no closed value set and is token-bindable like other numeric properties. A named narrow type is reserved for non-`Style` shapes such as `PositionOffset`. Introducing `MaxLines` would make `maxLines` gratuitously inconsistent with `width`, `height`, and `opacity`, and would wrongly exclude `TokenReference` from its value set.

---

### Option C: Both as generic `Style` *(Rejected)*

Type `textTruncation` as `Style` too (like the grandfathered `textAlignHorizontal`).

**Rejected because**: `textTruncation` has a closed, non-token-bindable value set, so the "structural enums vs. `Style`" rule requires a named type. `Style` would also wrongly imply it can carry `TokenReference`/`PropBinding`/`Conditional`. The `textAlignHorizontal: Style` typing is a grandfathered inconsistency, not a precedent to extend.

---

## Decision

Add two flat, optional, `TEXT`-only style keys to `Styles`, one named enum type, and matching schema definitions.

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `types/Styles.ts` | Add field `textTruncation: TextTruncation \| null` to `Styles` | MINOR |
| `types/Styles.ts` | Add field `maxLines: Style` to `Styles` | MINOR |
| `types/Styles.ts` | Add `export type TextTruncation = 'DISABLED' \| 'ENDING'` | MINOR |
| `types/index.ts` | Re-export `TextTruncation` from the barrel | MINOR |
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
  # Max line count before ENDING truncation applies; null = no limit. Plain number. TEXT only.
  maxLines: Style

# New named type (enum only — maxLines needs none)
TextTruncation: "'DISABLED' | 'ENDING'"
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `schema/styles.schema.json` | Add property `textTruncation` → `#/definitions/TextTruncationStyleValue` under `Styles.properties` | MINOR |
| `schema/styles.schema.json` | Add property `maxLines` → `#/definitions/NumberStyleValue` under `Styles.properties` | MINOR |
| `schema/styles.schema.json` | Add definition `TextTruncationStyleValue` | MINOR |

**Example — new shape** (`schema/styles.schema.json`):
```yaml
# Under #/definitions/Styles/properties (additionalProperties stays false)
textTruncation:
  $ref: "#/definitions/TextTruncationStyleValue"
  description: "Whether text truncates with a trailing ellipsis when content exceeds bounds. Structural property — not token-bindable."
maxLines:
  $ref: "#/definitions/NumberStyleValue"   # reuses the shared number value (number | TokenReference | null)
  description: "Maximum number of lines before ENDING truncation applies; null or absent means no limit."

# New definition (mirror LayoutModeStyleValue)
TextTruncationStyleValue:
  description: "Text truncation value. Structural property — not token-bindable."
  oneOf:
    - { type: string, enum: ["DISABLED", "ENDING"] }
    - { type: "null" }
```

### Notes

- **`maxLines` reuses `NumberStyleValue`** — the same definition backing `width`, `height`, `opacity`, and `cornerSmoothing` (`number | TokenReference | null`). No new type or schema definition is introduced for it.
- **Both keys optional** — `Styles` is a `Partial`; the keys are present only for `TEXT` elements. `additionalProperties: false` on the `Styles` schema definition means the new properties MUST be declared there for valid text output to pass validation.
- **`| null` on `textTruncation`** — mirrors the sibling structural enums (`LayoutMode`, `Position`, `MainAxisAlignment`), all typed `TypeName | null`.
- **Naming — `maxLines`** (Constitution VI, rule 2): a single code platform, Android/Jetpack Compose, names this property exactly `maxLines`, coinciding with Figma's name — zero transformer translation. (SwiftUI `lineLimit`, React Native `numberOfLines` diverge; no 2+ code-platform consensus, so rule 1 does not apply.)
- **Naming — `textTruncation` and values `DISABLED`/`ENDING`** (Constitution VI, rule 3): no code-platform consensus exists for the truncation-mode concept (SwiftUI `truncationMode`, CSS `text-overflow`, Android `TextOverflow`, React Native `ellipsizeMode` all differ). Deferring to Figma's `textTruncation` name and its `'DISABLED' | 'ENDING'` values avoids a lossy mode-mapping table and preserves reverse-direction round-trip fidelity. Values are already `SCREAMING_CASE`, satisfying the enum-casing rule.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes.
- **Parity check**:
  - `Styles.textTruncation` (`TextTruncation | null`) ↔ `Styles.properties.textTruncation` → `TextTruncationStyleValue` (`enum ["DISABLED","ENDING"]` ∪ `null`).
  - `Styles.maxLines` (`Style`) ↔ `Styles.properties.maxLines` → `NumberStyleValue` (`number` ∪ `TokenReference` ∪ `null`).
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

**Justification**: All changes are additive — two new optional fields on `Styles`, one new exported type, two additive `StyleKey` members, and one additive schema definition (plus a reuse of the existing `NumberStyleValue`). No existing type, field, or schema property is removed, renamed, or restructured. Additive changes are `MINOR` per Constitution III and the Versioning policy. Because `0.28.0` is unreleased, the additions ride within that MINOR release.

---

## Consequences

- Spec output faithfully represents text truncation configuration; line-clamped and single-line-truncating text no longer lose that information.
- Reverse-direction tooling (`figma-from-specs`) gains named keys to write `textTruncation` and `maxLines` back to a Figma `TextNode`.
- `maxLines` behaves like every other numeric style key — it can carry a plain number, a `TokenReference`, or `null`, and needs no special handling in consumers.
- Consumers validating against `schema/styles.schema.json` must adopt schema `0.28.0`; text nodes carrying the new keys would fail validation against `0.27.0` (`additionalProperties: false`).
- `TextTruncation` becomes part of the public type surface and is subject to the stability rules of Constitution III going forward.
- The grandfathered `textAlignHorizontal: Style` / `textAlignVertical: Style` typing remains untouched; this ADR does not retrofit those to named types.
