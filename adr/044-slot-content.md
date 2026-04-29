# ADR: Slot Content — SlotExample and Element Extensions

**Branch**: `044-slot-content`
**Created**: 2026-04-29
**Status**: DRAFT
**Deciders**: Nathan Curtis (author)
**Depends on**: [ADR-042 — Composition Structural Type](042-composition-type), [ADR-043 — Component Examples](043-component-examples)

---

## Context

ADR-042 established `Composition` as the structural base type. ADR-043 established `InstanceExample` and `Component.examples` for scalar-prop-configured usages.

A second, structurally distinct example type is needed: one that describes the *content* placed inside a component's slot layer rather than the component's own prop configuration. This is a `SlotExample` — a named, reusable anatomy of elements that fills a specific slot.

Two related needs come with it:

1. **Figma-side default** — Figma places elements inside a slot layer when it renders the default state. That default is provenance metadata, not public API; it belongs on the `Element` in `default.elements` or `variants[n].elements` via a Figma-specific `$extensions` field, pointing back to a named entry in `Component.examples`.

2. **Widening `ComponentExamples`** — The named record introduced in ADR-043 must accept `SlotExample` entries alongside `InstanceExample` entries. `InstanceExample.slots` (also introduced in ADR-043 as a forward-compatible field) becomes meaningful here: its values now resolve to `SlotExample` keys.

### Sensitizing example: ActionList and ActionListItem

`ActionList` and `ActionListItem` show why the one-level-deep rule matters.

**ActionListItem** has two slot props — `startVisual` and `endVisual`. Its `SlotExample` entries each describe the anatomy of what fills one slot (a single glyph icon). Three entries total cover both slots and a combined `InstanceExample`.

**ActionList** has one slot prop — `items` — and 8 prop variants. A naive approach that fills each item's `startVisual` and `endVisual` directly on `ActionList` reaches across component boundaries: 8 variants × 3 items × 2 slots = **56** entries.

The one-level-deep rule resolves this: `ActionList`'s `SlotExample` for `items` declares only the anatomy (three `ActionListItem` instances) — not their slot content. `ActionListItem` owns those slot examples. The count becomes **8 SlotExamples + 8 InstanceExamples = 16** on `ActionList`; ~4 on `ActionListItem`.

### Slot-bound containers vs. plain frame containers

In Figma's node model a container element is either a `FrameNode` (static children) or a `SlotNode` (children bound to a slot prop). The schema makes no type distinction — the difference is determined entirely by `Element.children`:

- `children: PropBinding` — slot-bound container (SlotNode); may carry `$extensions['com.figma'].defaultComposition`
- `children: string[]` — plain frame container (FrameNode); must never carry `defaultComposition`

No new element type is introduced by this ADR.

---

## Decision Drivers

- **One level deep** — a `SlotExample` declares the anatomy and element types of what fills the slot but does not recurse into those elements' own slot content; each component is the sole author of its own examples
- **No cross-component references** — all keys in `ComponentExamples` resolve within the same component definition; a `SlotExample`'s anatomy may reference `instanceOf: SomeComponent` but does not reach into that component's examples
- **`SlotExample` extends `Composition`** — same three content fields (`anatomy`, `elements?`, `layout?`) plus `kind: 'slot'` and `slot`; the structural base must not be redefined
- **Figma provenance is not public API** — slot default content is Figma-specific; it belongs in `$extensions['com.figma']` on the element, following the DTCG-derived pattern established on `Props` and `TokenReference`
- **Variant-sensitive slot defaults** — `$extensions` lives in `default.elements` or `variants[n].elements`, making it naturally per-variant
- **Additive-only** — all new fields are optional; `ComponentExamples` is widened not narrowed → MINOR
- **Type ↔ schema symmetry** — every field has a schema counterpart (Constitution §I)
- **No runtime logic** — type declarations and schema only (Constitution §II)

---

## Options Considered

### Option A: `SlotExample` extends `Composition`; `$extensions` on `Element` *(Selected)*

`SlotExample` adds `kind: 'slot'` and `slot: string` to the `Composition` shape. `ComponentExamples` is widened to a `ComponentExample = InstanceExample | SlotExample` discriminated union. `Element.$extensions['com.figma'].defaultComposition` holds the reference back to a `SlotExample` key.

```yaml
# ActionListItem — SlotExample entries for startVisual and endVisual
title: Action List Item
anatomy:
  root:
    type: container
  startVisualSlot:
    type: container   # slot-bound — children: PropBinding
  label:
    type: text
  description:
    type: text
  endVisualSlot:
    type: container   # slot-bound — children: PropBinding

props:
  state:
    type: string
  title:
    type: string
  description:
    type: string
  startVisual:
    type: slot
  endVisual:
    type: slot

examples:
  # --- InstanceExamples from ADR-043, shown for context ---
  defaultState:
    kind: instance
    title: Action List Item – default
    propConfigurations:
      state: default
      title: Browse all issues
      description: 12 open · 3 closed

  # --- SlotExamples introduced in this ADR ---
  iconStart:
    kind: slot
    slot: startVisual
    title: Action List Item – icon in start visual
    anatomy:
      icon:
        type: glyph
    elements:
      icon:
        content: search

  iconEnd:
    kind: slot
    slot: endVisual
    title: Action List Item – icon in end visual
    anatomy:
      icon:
        type: glyph
    elements:
      icon:
        content: chevronRight

  withBothIcons:
    kind: instance
    title: Action List Item – with icons in both visuals
    propConfigurations:
      state: default
      title: Browse all issues
    slots:
      startVisual: iconStart    # references examples.iconStart — SlotExample
      endVisual: iconEnd        # references examples.iconEnd — SlotExample

default:
  elements:
    startVisualSlot:
      children: { $binding: "#/props/startVisual" }
      $extensions:
        com.figma:
          defaultComposition: iconStart   # Figma provenance — not public API
    endVisualSlot:
      children: { $binding: "#/props/endVisual" }
```

```yaml
# ActionList — one SlotExample per variant; one level deep
# SlotExample anatomy stops at the ActionListItem boundary —
# ActionListItem owns its own startVisual/endVisual examples
title: Action List
anatomy:
  root:
    type: container
  itemsSlot:
    type: container   # slot-bound — children: PropBinding

props:
  variant:
    type: string
  items:
    type: slot

examples:
  defaultItems:
    kind: slot
    slot: items
    title: Action List – default items
    anatomy:
      item1:
        type: instance
        instanceOf: ActionListItem
      item2:
        type: instance
        instanceOf: ActionListItem
      item3:
        type: instance
        instanceOf: ActionListItem
    layout:
      - item1
      - item2
      - item3
    # No elements — ActionListItem owns its startVisual/endVisual slot examples

  defaultUsage:
    kind: instance
    title: Action List – default usage
    propConfigurations:
      variant: default
    slots:
      items: defaultItems

  dangerItems:
    kind: slot
    slot: items
    title: Action List – danger items
    anatomy:
      item1:
        type: instance
        instanceOf: ActionListItem
      item2:
        type: instance
        instanceOf: ActionListItem
      item3:
        type: instance
        instanceOf: ActionListItem
    layout:
      - item1
      - item2
      - item3

  dangerUsage:
    kind: instance
    title: Action List – danger usage
    propConfigurations:
      variant: danger
    slots:
      items: dangerItems

  # ... pattern repeats for 6 more variants
  # Total: 8 SlotExamples + 8 InstanceExamples = 16 entries
  # vs. naive cross-component recursion: 8 variants × 3 items × 2 slots = 48+ entries

default:
  elements:
    itemsSlot:
      children: { $binding: "#/props/items" }
      $extensions:
        com.figma:
          defaultComposition: defaultItems   # Figma provenance — not public API
```

**Pros**:
- One-level-deep boundary keeps ActionList's example count at 16, not 56+
- No cross-component references — all keys resolve within each component's own `Component.examples`
- `SlotExample` shares the `Composition` shape — no structural duplication
- `$extensions` follows the DTCG-derived provenance pattern; `Children` and `SlotProp` are unchanged
- All changes additive → MINOR

**Cons / Trade-offs**:
- Filling slots of instances *within* a `SlotExample` (e.g., setting `ActionListItem`'s `startVisual` from `ActionList`'s context) is deferred to a follow-on ADR; the boundary is one level only

---

### Option B: Slot default on `SlotProp.default` *(Rejected)*

Store the default composition reference on `SlotProp.default` rather than on the element.

**Rejected because**: `SlotProp` is a public prop API type; slot default content is Figma provenance. Mixing platform-specific provenance into the public API type creates coupling that violates the `$extensions` separation established for props and token references.

---

### Option C: Separate slot-example file *(Rejected)*

Store slot examples in a separate file alongside the component, rather than in `Component.examples`.

**Rejected because**: Slot examples are component-specific — they describe content for a named slot on that component. They belong in the component definition for discoverability and for `InstanceExample.slots` to resolve keys by string without cross-file reference.

---

## Decision

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `ComponentExample.ts` | Add `SlotExample`; add `ComponentExample = InstanceExample \| SlotExample`; widen `ComponentExamples` | MINOR |
| `InstanceExample.ts` | *(no change — `slots?` was defined in ADR-043)* | — |
| `Element.ts` | Add optional `$extensions?: ElementExtensions`; add `ElementExtensions`, `FigmaElementExtension` | MINOR |
| `index.ts` | Export `SlotExample`, `ComponentExample`, `ElementExtensions`, `FigmaElementExtension` | MINOR |

**Updated `ComponentExample.ts`**:

```yaml
# SlotExample — named content for a specific slot
SlotExample:
  kind: 'slot'              # discriminator
  slot: string              # name of the SlotProp this example fills
  title?: string
  anatomy: Anatomy          # required — declares the content's element type map
  elements?: Elements
  layout?: Layout

# ComponentExample — discriminated union for Component.examples
ComponentExample: InstanceExample | SlotExample

# ComponentExamples — widened from ADR-043
# Before: Record<string, InstanceExample>
# After:  Record<string, ComponentExample>
ComponentExamples: Record<string, ComponentExample>
```

**New types** (in `types/Element.ts`):

```yaml
FigmaElementExtension:
  defaultComposition?: string   # key in Component.examples — valid only when children is PropBinding
  [key: string]: unknown        # open for future Figma-specific fields

ElementExtensions:
  'com.figma'?: FigmaElementExtension
  [key: string]: unknown        # open for future platform extensions
```

**Extended `Element`** (`types/Element.ts`):

```yaml
# Before
Element:
  children?: Children
  parent?: string | null
  styles?: Styles
  propConfigurations?: PropConfigurations
  instanceOf?: string | PropBinding | SubcomponentRef
  content?: string | PropBinding

# After
Element:
  children?: Children
  parent?: string | null
  styles?: Styles
  propConfigurations?: PropConfigurations
  instanceOf?: string | PropBinding | SubcomponentRef
  content?: string | PropBinding
  $extensions?: ElementExtensions    # new — platform-specific element metadata
```

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `component.schema.json` | Add `#/definitions/SlotExample` | MINOR |
| `component.schema.json` | Add `#/definitions/ComponentExample` (`oneOf` discriminated by `kind`) | MINOR |
| `component.schema.json` | Update `#/definitions/ComponentExamples` to use `ComponentExample` | MINOR |
| `component.schema.json` | Add `#/definitions/FigmaElementExtension` | MINOR |
| `component.schema.json` | Add `#/definitions/ElementExtensions` | MINOR |
| `component.schema.json` | Add `$extensions` to `#/definitions/Element/properties` | MINOR |

**New definition** (`#/definitions/SlotExample`):

```yaml
SlotExample:
  type: object
  description: "Named content for a specific slot: anatomy, element bindings, and layout for the elements that fill the slot."
  required: [kind, slot, anatomy]
  properties:
    kind:
      type: string
      enum: [slot]
    slot:
      type: string
      description: "The SlotProp name this example fills."
    title:
      type: string
    anatomy:
      $ref: "#/definitions/Anatomy"
    elements:
      $ref: "#/definitions/Elements"
    layout:
      $ref: "#/definitions/Layout"
  additionalProperties: false
```

**New definition** (`#/definitions/ComponentExample`):

```yaml
ComponentExample:
  oneOf:
    - $ref: "#/definitions/InstanceExample"
    - $ref: "#/definitions/SlotExample"
```

**Updated `#/definitions/ComponentExamples`** (widens `patternProperties` target):

```yaml
# Before (ADR-043)
patternProperties:
  "^[a-zA-Z0-9_-]+$":
    $ref: "#/definitions/InstanceExample"

# After
patternProperties:
  "^[a-zA-Z0-9_-]+$":
    $ref: "#/definitions/ComponentExample"
```

**New definitions** (`#/definitions/FigmaElementExtension` and `#/definitions/ElementExtensions`):

```yaml
FigmaElementExtension:
  type: object
  properties:
    defaultComposition:
      type: string
      description: "Key of a SlotExample in Component.examples. Valid only when Element.children is a PropBinding."
  additionalProperties: true

ElementExtensions:
  type: object
  properties:
    "com.figma":
      $ref: "#/definitions/FigmaElementExtension"
  additionalProperties: true
```

**New property** in `#/definitions/Element/properties`:

```yaml
$extensions:
  $ref: "#/definitions/ElementExtensions"
```

### Out of scope for this ADR

- **Nested slot filling within `SlotExample`** — When a `SlotExample` contains component instances that themselves have slots (e.g., `ActionListItem` instances in `ActionList`'s `items` slot), filling those nested slots from the parent context is deferred to a follow-on ADR. Each component resolves its own slot content independently.
- **`compositions.yaml` file schema** — system-scoped (`layout`, `page`) compositions; a follow-on ADR.

### Notes

- `SlotExample.slot` names the `SlotProp` the example fills, enabling tooling to associate the example with the correct slot without inspecting anatomy.
- `SlotExample.anatomy` is required — every slot example must declare the element type map for its content; `elements` and `layout` are optional because a minimal slot fragment may only need the type declarations.
- The one-level-deep boundary is intentional: `ActionList`'s `SlotExample` for the `items` slot declares three `ActionListItem` instances but does not fill their `startVisual` or `endVisual` slots. `ActionListItem` owns those. This keeps each component's example count proportional to its own variation surface, not to every descendant's.
- `FigmaElementExtension.defaultComposition` is valid only when `Element.children` is a `PropBinding` (slot-bound container). A container with `children: string[]` is a plain FrameNode and must never carry `defaultComposition`. The schema cannot enforce this constraint; it is a consumer validation concern.
- `ElementExtensions` and `FigmaElementExtension` use `additionalProperties: true` — they are open extension objects by design, following the DTCG pattern.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes
- **Parity check**:
  - `SlotExample { kind: 'slot', slot, title?, anatomy, elements?, layout? }` ↔ `#/definitions/SlotExample`
  - `ComponentExample = InstanceExample | SlotExample` ↔ `#/definitions/ComponentExample` (`oneOf`)
  - `ComponentExamples` widened to `Record<string, ComponentExample>` ↔ `patternProperties` updated
  - `FigmaElementExtension { defaultComposition?: string }` ↔ `#/definitions/FigmaElementExtension`
  - `ElementExtensions { 'com.figma'?: FigmaElementExtension }` ↔ `#/definitions/ElementExtensions`
  - `Element.$extensions?: ElementExtensions` ↔ `#/definitions/Element/properties/$extensions`

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-from-figma` | Must detect and emit `SlotExample` from slot layers; must emit `$extensions['com.figma'].defaultComposition` on slot-bound elements in variant data | Read new types; implement slot example detection; update output emitters |
| `specs-cli` | Recompile; output includes `SlotExample` entries and element `$extensions` when present | Recompile; no breaking change |
| `specs-plugin-2` | Recompile; slot example rendering is a follow-on capability | Recompile; pass through data initially |

---

## Semver Decision

**Version bump**: `0.19.0 → 0.20.0` (`MINOR`)

**Justification**: All changes are additive — new types, new optional fields, `ComponentExamples` value union widened (existing `InstanceExample` entries remain valid). No existing type is removed or narrowed → MINOR per Constitution §III.

---

## Consequences

- `SlotExample` is a named structural type that defines what fills a specific slot; it shares the `Composition` shape and lives in `Component.examples` alongside `InstanceExample` entries
- `InstanceExample.slots` (defined in ADR-043) is now meaningful: its values resolve to `SlotExample` keys in the same `Component.examples`
- `Element.$extensions['com.figma'].defaultComposition` wires Figma's default slot content to a named `SlotExample` — `Children` and `SlotProp` are unchanged
- The one-level-deep rule keeps composition scale manageable: each component owns its examples, slot anatomy stops at nested component boundaries
- `ElementExtensions` is an open extension object — future Figma-specific or platform-specific element metadata can be added without a new ADR
- Filling slots of instances within a `SlotExample` is deferred to a follow-on ADR; the one-level-deep boundary is the current accepted limit
