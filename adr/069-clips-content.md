# ADR: Rename `clipContent` to `clipsContent`

**Branch**: `069-clips-content`
**Created**: 2026-08-14
**Status**: DRAFT
**Summary**: *(written at implementation — see `/specs.adr.implement`)*
**Deciders**: Nathan Curtis (author)
**Supersedes**: *(none)*

---

## Context

`Styles` declares a boolean style named `clipContent`:

```yaml
# types/Styles.ts — current
Styles:
  clipContent: Style
```

The name is wrong. The property it describes is Figma's node property `clipsContent` — third-person singular, with the `s`. Because the declared key never matched the key the data actually carries, nothing downstream has ever matched on it:

- The `styles.schema.json` property `clipContent` never validates against emitted spec output.
- The `StyleKey` union member `'clipContent'` never selects a real style.
- The CSS mapping rule for `clipContent → overflow` never fires, so `overflow: hidden` / `overflow: visible` is never emitted.

This is a defect, not a design gap: the feature was built end to end and has been inert since it shipped because of a one-character naming error.

---

## Decision Drivers

- **Correctness first**: a public field name that matches nothing is worse than no field at all — it advertises a capability the contract cannot deliver.
- **Type ↔ schema symmetry**: the type, the schema property, and the `StyleKey` union must all move together (Constitution IV).
- **Naming governance (Constitution VI)**: the chosen name must be justified against the code-platform preference order, not adopted by default.
- **No abbreviations, full words**: both candidate names satisfy this; it is not a differentiator.
- **Breaking-change discipline (Constitution III)**: renaming a named field within an exported type is breaking and MUST be versioned accordingly.

---

## Options Considered

### Option A: Rename to `clipsContent` *(Selected)*

Rename the field, the schema property, and the `StyleKey` member to `clipsContent`.

**Pros**:
- Matches the name the data has always carried, so the style, its schema property, and the CSS mapping become live for the first time.
- Constitution VI rule 3 applies: no code platform expresses a strong opinion on a *boolean* clip flag — CSS models overflow as a multi-valued enum (`overflow`), SwiftUI as a `.clipped()` modifier, Compose as `.clip(...)` — so none of them offers a boolean field name to borrow. Where no code platform has a competing term, Figma's vocabulary stands.
- Smallest possible change surface: one word, three declaration sites.

**Cons / Trade-offs**:
- Breaking rename of a published field name, even though no consumer can be relying on it working.

---

### Option B: Keep `clipContent` and translate upstream *(Rejected)*

Leave the schema name alone and have the transformer rename `clipsContent` → `clipContent` on the way out.

**Rejected because**: it preserves a name chosen by mistake and pays for it with a permanent translation step, contradicting Constitution VI's rationale that only genuine naming decisions — not typos — justify making the transformer translate.

---

### Option C: Rename to an overflow-shaped enum *(Rejected)*

Replace the boolean with a CSS-shaped `overflow: 'HIDDEN' | 'VISIBLE'` style.

**Rejected because**: it redesigns the property under cover of a bug fix, widening a one-word correction into a modeled-value change with its own downstream migration. If an overflow enum is wanted, it deserves its own ADR.

---

## Decision

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `Styles.ts` | Renamed field `clipContent` → `clipsContent` on `Styles` | MAJOR |
| `Styles.ts` | Renamed `StyleKey` union member `'clipContent'` → `'clipsContent'` | MAJOR |

**Example — new shape** (`types/Styles.ts`):
```yaml
# Before
Styles:
  effects: TokenReference | Effects
  clipContent: Style
  cornerRadius: Style | Corners

# After
Styles:
  effects: TokenReference | Effects
  clipsContent: Style
  cornerRadius: Style | Corners
```

```yaml
# StyleKey — before
StyleKey:
  - effects
  - clipContent
  - cornerRadius

# StyleKey — after
StyleKey:
  - effects
  - clipsContent
  - cornerRadius
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `styles.schema.json` | Renamed property `clipContent` → `clipsContent` | MAJOR |

**Example — new shape** (`schema/styles.schema.json`):
```yaml
# Before — under #/definitions/Styles/properties
clipContent:
  $ref: "#/definitions/BooleanStyleValue"
  description: "Clip content"

# After
clipsContent:
  $ref: "#/definitions/BooleanStyleValue"
  description: "Whether the element clips content that overflows its bounds"
```

### Notes

- The type (`Style`), the schema `$ref` (`BooleanStyleValue`), and the property's optionality are all unchanged — only the key changes.
- No deprecation alias is introduced. An alias would keep a name alive that has never resolved to a value, and would require consumers to handle two keys for one concept.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes.
- **Parity check**: `Styles.clipsContent` ↔ `#/definitions/Styles/properties/clipsContent`; the `StyleKey` union member `'clipsContent'` names the same key. All three rename in one change; no drift is introduced.

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-cli` | The CSS mapping keyed on the old name stops being dead code once the key matches | Update the key used by the style-to-CSS mapping and its mapping documentation; recompile |
| `specs-from-figma` | Emitted output already uses `clipsContent`; it now validates against the schema | Recompile against the new types; confirm no code references the old key |
| `specs-plugin-2` | Consumes the same style key surface | Recompile; update any reference to the old key |
| Docs site | A styles reference page is published under the old name | Rename the page and update references to the new key |

---

## Semver Decision

**Version bump**: `0.30.0 → 0.31.0` (`MAJOR`-class change)

**Justification**: Renaming a named field within an exported type and renaming a schema property are both breaking changes under Constitution III and the Versioning rule ("`MAJOR` for any breaking change to a type signature, field name, field presence, or schema structure"). The package is pre-1.0, so the breaking change is carried by a MINOR-position bump per 0.x convention, and MUST be called out as breaking in `CHANGELOG.md`.

---

## Consequences

- `clipsContent` resolves against real data for the first time, so the style appears in spec output and the schema validates it.
- Consumers that map this style — including the CSS `overflow` mapping — begin producing output where they previously produced nothing.
- The name `clipContent` is gone with no alias; any consumer referencing it fails at compile time rather than silently matching nothing.
- Published spec documents produced before this change carry no `clipContent` key to migrate, since the key was never emitted.
