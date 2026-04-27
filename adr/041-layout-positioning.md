# ADR: Layout Positioning — Constraint-Based Naming

**Branch**: `041-layout-positioning`
**Created**: 2026-04-27
**Status**: DRAFT
**Deciders**: Nathan Curtis (author)
**Supersedes**: *(none)*

---

## Context

The current `Styles` type exposes three Figma-derived positioning properties:

- `x` — horizontal pixel offset
- `y` — vertical pixel offset
- `layoutPositioning` — `"AUTO"` or `"ABSOLUTE"` string controlling whether a child participates in auto-layout

These names mirror the Figma API verbatim. However, `x` and `y` are opaque to platform consumers — they carry no information about *how* the element is anchored. Figma's `constraints` property (MIN, MAX, CENTER, STRETCH, SCALE per axis) determines anchor semantics, but that information is currently discarded at the schema boundary.

Meanwhile, `layoutPositioning` uses Figma's internal API name rather than the CSS-aligned `position` concept familiar to web and native platform engineers.

This creates two gaps:

1. **Lost anchor semantics**: A consumer receiving `x: 24` has no way to know whether `24` means "24 px from the left edge" (MIN constraint), "24 px from the right edge" (MAX), or "centered with a 24 px offset" (CENTER). This forces every downstream platform to re-derive semantics that should be declared at the schema level.
2. **Figma-coupled naming**: `layoutPositioning` is Figma jargon; `x`/`y` are axis-raw. Code-centric consumers expect CSS-aligned property names like `position`, `top`, `start`, `bottom`, `end`.

---

## Decision Drivers

- **Code-centric naming**: Property names should align with platform concepts (CSS logical/physical positioning) rather than Figma API names
- **Semantic completeness**: The schema should capture the *meaning* of a positional value (which edge it anchors to), not just the raw number
- **Additive-only change path**: New properties can be added as MINOR; removing `x`, `y`, and `layoutPositioning` is MAJOR — the ADR must define a clean deprecation/removal path
- **Type and schema symmetry**: Every type change must have a corresponding schema change (Constitution I)
- **No runtime logic in this package**: The constraint-to-property mapping is a transformation concern for `specs-from-figma`, not for `specs-schema` (Constitution II)

---

## Options Considered

### Option A: Constraint-Based Positioning Properties *(Selected)*

Replace `x`, `y`, and `layoutPositioning` with semantically richer properties derived from Figma's `constraints`:

**New properties on `Styles`:**

| Property | Type | When present |
|----------|------|-------------|
| `position` | `Style` | Always (replaces `layoutPositioning`) — values: `"AUTO"`, `"ABSOLUTE"` |
| `top` | `Style` | Vertical constraint is `MIN` or `STRETCH` |
| `bottom` | `Style` | Vertical constraint is `MAX` or `STRETCH` |
| `start` | `Style` | Horizontal constraint is `MIN` or `STRETCH` |
| `end` | `Style` | Horizontal constraint is `MAX` or `STRETCH` |
| `centerHorizontalOffset` | `Style` | Horizontal constraint is `CENTER` |
| `centerVerticalOffset` | `Style` | Vertical constraint is `CENTER` |

**Constraint mapping logic** (performed by `specs-from-figma`, not this package):

| Figma Constraint | Horizontal → | Vertical → |
|-----------------|--------------|------------|
| `MIN` | `start` (px from inline-start edge) | `top` (px from block-start edge) |
| `MAX` | `end` (px from inline-end edge) | `bottom` (px from block-end edge) |
| `CENTER` | `centerHorizontalOffset` (px offset from center) | `centerVerticalOffset` (px offset from center) |
| `STRETCH` | `start` + `end` (both edges) | `top` + `bottom` (both edges) |
| `SCALE` | `start` (percentage string, e.g. `"25%"`) | `top` (percentage string, e.g. `"25%"`) |

For `SCALE`, the value is expressed as a percentage string (e.g., `"25%"`) rather than a pixel number, signaling proportional positioning to consumers.

**Removed properties:** `x`, `y`, `layoutPositioning`

**Pros**:
- Consumers immediately know anchor semantics without re-deriving from Figma constraints
- Names align with CSS logical properties (`start`/`end`) and physical properties (`top`/`bottom`)
- `position` is universally understood across web, iOS, and Android platforms
- `STRETCH` naturally decomposes into two edges, matching how CSS `inset` works
- `SCALE` represented as percentage strings avoids type ambiguity (number vs. percentage)

**Cons / Trade-offs**:
- Breaking change: removes three existing properties (`x`, `y`, `layoutPositioning`)
- Requires `specs-from-figma` to implement constraint-to-property mapping transformation
- `centerHorizontalOffset` / `centerVerticalOffset` are longer names, but they're unambiguous

---

### Option B: Keep `x`/`y`, Add Constraint Metadata *(Rejected)*

Keep `x`, `y`, and `layoutPositioning` unchanged. Add a new `constraints` composite object alongside them that describes the anchor mode per axis.

```yaml
# Example output
x: 24
y: 16
layoutPositioning: "ABSOLUTE"
constraints:
  horizontal: "MIN"
  vertical: "CENTER"
```

**Rejected because**: This duplicates information — the consumer still receives `x: 24` and must cross-reference `constraints.horizontal` to interpret it. The schema grows without improving ergonomics. Consumers already have the raw numbers; the gap is in naming and semantics, not in missing metadata.

---

### Option C: Do Nothing *(Rejected)*

Keep the current `x`, `y`, and `layoutPositioning` properties unchanged.

**Rejected because**: Consumers remain unable to determine anchor semantics from the schema output alone. Every platform integration must independently solve the same mapping problem that should be resolved at the schema level. This violates the "semantic completeness" driver.

---

## Decision

### Type changes (`types/Styles.ts`)

| File | Change | Bump |
|------|--------|------|
| `Styles.ts` | Remove field `x` | MAJOR |
| `Styles.ts` | Remove field `y` | MAJOR |
| `Styles.ts` | Remove field `layoutPositioning` | MAJOR |
| `Styles.ts` | Add optional field `position` | MINOR |
| `Styles.ts` | Add optional field `top` | MINOR |
| `Styles.ts` | Add optional field `bottom` | MINOR |
| `Styles.ts` | Add optional field `start` | MINOR |
| `Styles.ts` | Add optional field `end` | MINOR |
| `Styles.ts` | Add optional field `centerHorizontalOffset` | MINOR |
| `Styles.ts` | Add optional field `centerVerticalOffset` | MINOR |
| `Styles.ts` | Update `StyleKey` union: remove `'x'`, `'y'`, `'layoutPositioning'`; add `'position'`, `'top'`, `'bottom'`, `'start'`, `'end'`, `'centerHorizontalOffset'`, `'centerVerticalOffset'` | MAJOR |

**Example — new shape** (`types/Styles.ts`):
```yaml
# Before
Styles:
  x: Style
  y: Style
  layoutPositioning: Style

# After
Styles:
  position: Style           # "AUTO" | "ABSOLUTE" (replaces layoutPositioning)
  top: Style                # vertical offset from top (MIN or STRETCH)
  bottom: Style             # vertical offset from bottom (MAX or STRETCH)
  start: Style              # horizontal offset from inline-start (MIN or STRETCH)
  end: Style                # horizontal offset from inline-end (MAX or STRETCH)
  centerHorizontalOffset: Style  # horizontal offset from center (CENTER)
  centerVerticalOffset: Style    # vertical offset from center (CENTER)
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `styles.schema.json` | Remove properties `x`, `y`, `layoutPositioning` | MAJOR |
| `styles.schema.json` | Add properties `position`, `top`, `bottom`, `start`, `end`, `centerHorizontalOffset`, `centerVerticalOffset` | MINOR |

**Example — new shape** (`schema/styles.schema.json`):
```yaml
# Removed properties
x: { $ref: "#/definitions/NumberStyleValue" }
y: { $ref: "#/definitions/NumberStyleValue" }
layoutPositioning: { $ref: "#/definitions/StringStyleValue" }

# New properties
position:
  $ref: "#/definitions/StringStyleValue"
  description: "Layout positioning mode — AUTO (participates in parent auto-layout) or ABSOLUTE"
top:
  $ref: "#/definitions/NumberStyleValue"
  description: "Offset from block-start (top) edge. Present when vertical constraint is MIN or STRETCH. Percentage string when SCALE."
bottom:
  $ref: "#/definitions/NumberStyleValue"
  description: "Offset from block-end (bottom) edge. Present when vertical constraint is MAX or STRETCH."
start:
  $ref: "#/definitions/NumberStyleValue"
  description: "Offset from inline-start edge. Present when horizontal constraint is MIN or STRETCH. Percentage string when SCALE."
end:
  $ref: "#/definitions/NumberStyleValue"
  description: "Offset from inline-end edge. Present when horizontal constraint is MAX or STRETCH."
centerHorizontalOffset:
  $ref: "#/definitions/NumberStyleValue"
  description: "Horizontal offset from center. Present when horizontal constraint is CENTER."
centerVerticalOffset:
  $ref: "#/definitions/NumberStyleValue"
  description: "Vertical offset from center. Present when vertical constraint is CENTER."
```

### Notes

- `top`/`bottom`/`start`/`end` and `centerHorizontalOffset`/`centerVerticalOffset` carry `NumberStyleValue` type because their values are pixel numbers (or percentage strings for SCALE). The schema ref `NumberStyleValue` already accepts `string | number | null | TokenReference | PropBinding | Conditional` via `Style`, which accommodates percentage strings.
- `position` carries `StringStyleValue` because its values are string literals (`"AUTO"`, `"ABSOLUTE"`).
- Only properties relevant to the node's constraints are emitted. A node with horizontal `MIN` + vertical `CENTER` would produce `start`, `centerVerticalOffset`, and `position` — no other positioning fields.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes — every removed and added type field has a corresponding schema property change
- **Parity check**:
  - `Styles.position` ↔ `styles.schema.json#/definitions/StylesObject/properties/position`
  - `Styles.top` ↔ `…/properties/top`
  - `Styles.bottom` ↔ `…/properties/bottom`
  - `Styles.start` ↔ `…/properties/start`
  - `Styles.end` ↔ `…/properties/end`
  - `Styles.centerHorizontalOffset` ↔ `…/properties/centerHorizontalOffset`
  - `Styles.centerVerticalOffset` ↔ `…/properties/centerVerticalOffset`

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-from-figma` | Must implement constraint-to-property mapping: read Figma `constraints` per axis and emit the appropriate directional property instead of raw `x`/`y`. Rename `layoutPositioning` → `position` in output. | Implement new transformation logic for constraint mapping; update style key references |
| `specs-cli` | Recompile against updated types. No logic change — the CLI passes through whatever `specs-from-figma` produces. | Recompile |
| `specs-plugin` | Recompile against updated types. Same passthrough behavior as CLI. | Recompile |

---

## Semver Decision

**Version bump**: `0.18.0 → 0.19.0` (`MINOR` within pre-1.0 — removing fields before 1.0 is acceptable as a minor bump per pre-1.0 convention)

**Justification**: The package is pre-1.0. Removing `x`, `y`, and `layoutPositioning` while adding replacement properties constitutes a breaking schema change, but pre-1.0 semver allows breaking changes in MINOR bumps. This change ships in the `0.19.0` release.

---

## Consequences

- Consumers receive semantically meaningful positioning properties that map directly to CSS positioning concepts
- The `x`/`y` ambiguity is eliminated — every positional value now indicates which edge it's anchored to
- `STRETCH` is naturally represented as two simultaneous edge values, matching CSS `inset` behavior
- `SCALE` (percentage) is distinguishable from pixel values by string type (`"25%"` vs `24`)
- `CENTER` gets dedicated offset properties, avoiding overloading `top`/`start` with center semantics
- `specs-from-figma` must implement the constraint-aware transformation — this is the primary implementation cost
- All existing test fixtures containing `x`, `y`, or `layoutPositioning` will need updating across `specs-testing`
