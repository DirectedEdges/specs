# ADR: Component Slot Examples

**Branch**: `047-component-slot-examples`
**Created**: 2026-04-29
**Status**: DRAFT
**Deciders**: Nathan Curtis (author)
**Depends on**: [ADR-042 — Composition Structural Type](042-composition-type), [ADR-046 — Slots and Slot References](046-slots-and-slot-references)
**Extended by**: ADR-048 (Component Instance Examples), ADR-049 (Prop Configurations and Bindings)

---

## Context

ADR-042 established `Composition` as the named structural unit. ADR-046 established `SlotContent` as the anonymous structural triplet, `slotContent` on `Composition` for bundled fills, and `SlotContentRef` as the universal `$slotContent` pointer.

This ADR addresses the component side of slot content: two authoring needs arise from Figma's slot model.

1. **Where do named slot fill examples live on `Component`?** A component designer authors named, reusable fills for a component's slot props — for example, an icon that fills `ActionListItem`'s `startVisual` slot by default. These fills are examples and test cases; they carry no implementation obligation for code consumers. They need a named home on `Component`, sibling to whatever field holds instance examples (ADR-048).

2. **How does Figma's default slot fill get expressed in the spec?** A slot-bound container in `default.elements` or `variants[n].elements` binds `children` to a slot prop via `PropBinding`. In the Figma file, that slot layer has content placed inside it — the design-tool default. That default is Figma authoring provenance: code components resolve missing slots through logic, not data, so code consumers must be able to correctly ignore it. The reference must be colocated with the slot binding it documents and live in a namespace that marks it as design-tool-only.

The existing `Element.children` type (`string[] | PropBinding` — plain-frame children vs. slot-bound binding) is extended here; no new element type is introduced.

---

## Decision Drivers

- **Examples, not contracts** — `slotContentExamples` entries carry no implementation obligation for code consumers; they are authored examples and test cases, parallel in intent to `instanceExamples` (ADR-048). The `-Examples` suffix signals this correctly.
- **Slot-agnostic entries** — the same fill (e.g., a glyph icon) may fill `startVisual` or `endVisual`; binding content to a specific slot at the entry site forces duplication. Binding happens at the reference site.
- **Separation from instance examples** — `InstanceExample` documents a whole-component usage configured via scalar props; slot content documents fill for a named slot. Different purposes, different audiences, different reference patterns. A flat sibling field on `Component` makes the split explicit.
- **Figma default is design-tool provenance** — Figma stores what's placed inside a slot layer as part of the design file. Code consumers have no "default slot data" concept; defaults in code are logic. The reference must live in a namespace that code consumers correctly ignore — `$extensions['com.figma']` is that mechanism (DTCG pattern, used elsewhere in the schema for `Props` and `TokenReference`).
- **Default colocated with binding** — the slot binding and its Figma default describe the same object; they live on the same `SlotBinding`, not separated across fields.
- **`PropBinding` stays narrow** — `PropBinding` is used by `content`, `instanceOf`, and `visible` as well as `children`. The Figma default is meaningful only for slot-bound `children`; it goes on a `children`-specific extension (`SlotBinding`), not on `PropBinding` itself.
- **Variant-sensitive defaults for free** — `Element.children` lives in `default.elements` and `variants[n].elements`; per-variant Figma defaults fall out without any new mechanism.
- **Additive-only** — all new fields are optional; no existing type narrows → MINOR
- **Type ↔ schema symmetry** — Constitution §I
- **No runtime logic** — Constitution §II

---

## Options Considered

### Option A: `Component.slotContentExamples: Record<string, SlotContent>` + `SlotBinding.$extensions['com.figma'].default` *(Selected)*

A new top-level field `Component.slotContentExamples` holds named `SlotContent` entries — sibling to `Component.instanceExamples` (ADR-048). `SlotContent` is defined in ADR-046.

A new interface `SlotBinding` extends `PropBinding` with an optional `$extensions` field. `Children` widens from `string[] | PropBinding` to `string[] | SlotBinding`. The Figma default-fill reference lives at `SlotBinding.$extensions['com.figma'].default` as a plain JSON Pointer string — same resolution rules as `$slotContent`, without the discriminated-object wrapper (code consumers that ignore `$extensions` never see it).

```yaml
# ActionListItem — slotContentExamples and SlotBinding together
components:
  actionListItem:
    props:
      startVisual: { type: slot }

    slotContentExamples:
      searchIcon:
        anatomy:
          icon: { type: glyph }
        elements:
          icon:
            content: search
            styles: { width: 16, height: 16 }
        layout: [icon]

    default:
      elements:
        startVisualSlot:
          children:
            $binding: "#/components/actionListItem/props/startVisual"
            $extensions:
              com.figma:
                default: "#/components/actionListItem/slotContentExamples/searchIcon"
```

The `default` value resolves using the same rules as `$slotContent` (ADR-046): it is a JSON Pointer to a `SlotContent` in `slotContentExamples` or to a `Composition` in an external compositions file.

#### Naming `slotContentExamples`

- **`slotContentExamples`** *(Selected)* — mirrors `instanceExamples` in suffix and semantics. Entries are examples and test cases; code consumers are not obligated by them. Figma references them as authoring defaults, but the binding lives on `SlotBinding` — the entries themselves are examples Figma happens to reference. "Content" qualifies the kind of example (slot fill, not whole-component usage).
- **`slotContent`** — drops the `-Examples` suffix, implying a stronger contract than these entries carry.
- **`slotExamples`** — reads as "examples of slots" rather than "examples of content for slots."
- **`slotCompositions`** — accurate to the structural shape but not everyday authoring vocabulary.
- **`slots`** — collides with `SlotProp` usage on `Component.props`.
- **`fills`** / **`slotFills`** — jargony; no precedent in target platform vocabularies.

#### Naming `default` inside `$extensions['com.figma']`

- **`default`** *(Selected)* — concise, reads naturally in scope (`$extensions.com.figma.default` = "Figma's default"). The enclosing namespace qualifies it; no collision risk within the extension object.
- **`defaultContent`** — verbose given the namespace already implies Figma's default for this slot binding.
- **`defaultSlotContent`** — redundant; the `com.figma` namespace plus the `SlotBinding` context already carry that meaning.

**Pros**:
- `slotContentExamples` and `instanceExamples` are siblings with one purpose each; no `kind` discriminator on either
- Slot-agnostic entries: one `SlotContent` can be referenced from `startVisual` and `endVisual` without duplication
- `SlotBinding.$extensions['com.figma'].default` colocates the Figma default with the binding, inside `$extensions` — design-tool provenance, correctly ignored by code consumers
- Per-variant Figma defaults fall out for free — `children` already lives on `Element`, which is mapped through `default`/`variants`
- `SlotBinding extends PropBinding` — existing `children: { $binding }` values still validate; `$extensions` is optional

**Cons / Trade-offs**:
- Two sibling fields (`slotContentExamples`, `instanceExamples`) — a consumer wanting all authored examples must read both
- Schema cannot enforce that `$extensions['com.figma'].default` pointers resolve — consumer validation concern

---

### Option B: `SlotExample` type; entries bundled in `Component.instanceExamples` *(Rejected)*

Introduce `SlotExample extends SlotContent` with an added `slot: string`; widen `Component.instanceExamples` to `ComponentExample = InstanceExample | SlotExample` discriminated by a `kind` field.

**Rejected because**:
- `slot` hard-codes a content entry to one slot; the same icon used in `startVisual` and `endVisual` requires duplication.
- `SlotExample` adds no structure over `SlotContent` once `slot` is removed — it's an alias.
- The `kind` discriminator is schema bookkeeping with no authoring value. `InstanceExample` is consumed by docs/rendering tooling; slot content is consumed by slot-rendering and Figma default references. Bundling forces every consumer to filter by `kind`.

---

### Option C: Slot default on `SlotProp.default` *(Rejected)*

Store the default-content reference on `SlotProp.default`.

**Rejected because**: `SlotProp` is the public prop API surface. Default content is per-variant element data — variant-sensitive and tied to a specific element in the tree (the slot-bound container), not to the prop definition.

---

### Option D: Separate slot-content file *(Rejected)*

Store slot content in a separate file alongside the component definition.

**Rejected because**: Slot-content entries are component-specific. They belong in the component definition so that `propConfigurations.<slotName>` references and the Figma default reference can resolve via JSON Pointer paths inside the same spec file.

---

### Option E: New top-level field on `Element` *(Rejected)*

Place the Figma default-fill reference as a new sibling field on `Element` (`defaultContent`, `defaultChildren`, or similar) alongside `content` and `children`.

**Rejected because**:
- Any name collides conceptually with existing `Element` fields (`content` is text body; `children` is layout structure).
- The reference is separated from the binding it documents: `children` holds the slot binding; the new field holds the default. Two objects, one fact.
- It pollutes `Element`'s public surface with a field whose meaning depends on a sibling field's shape and whose audience is a single platform (Figma). `SlotBinding.$extensions['com.figma'].default` colocates with the binding and lives in the namespace that signals "design-tool provenance."

---

### Option F: Widen `Element.content` to accept slot-content keys *(Rejected)*

When `Element.children` is a slot binding, interpret a string in `Element.content` as a key into `slotContentExamples` instead of as literal text.

**Rejected because**: `content` is typed `string | PropBinding`. Making the same `string` mean "literal text" in one element shape and "slot-content key" in another is a conditional JSON Schema cannot express. A field's meaning must not depend on a sibling field's shape.

---

## Decision

### Type changes (`types/`)

| File | Change | Bump |
|------|--------|------|
| `Component.ts` | Add optional `slotContentExamples?: Record<string, SlotContent>` | MINOR |
| `Children.ts` | Add `SlotBinding`, `SlotBindingExtensions`, `FigmaSlotBindingExtension`; widen `Children` to `string[] \| SlotBinding` | MINOR |
| `index.ts` | Export `SlotBinding`, `SlotBindingExtensions`, `FigmaSlotBindingExtension` | MINOR |

`SlotContent` is defined in ADR-046 (`types/SlotContent.ts`) and imported here.

**`Children` widening** (`types/Children.ts`):

```ts
import type { PropBinding } from './PropBinding.js';

/** Figma authoring metadata on a slot binding. Not honored by code consumers. */
export interface FigmaSlotBindingExtension {
  /**
   * JSON Pointer to a SlotContent or Composition — Figma's default fill for
   * this slot (the content placed inside the slot layer in the design file).
   * Resolves using the same rules as $slotContent (ADR-046). Code consumers
   * handle missing slots through component logic and ignore this field.
   */
  default?: string;
  [key: string]: unknown;
}

/** Open extension bag on a SlotBinding for platform-specific metadata. */
export interface SlotBindingExtensions {
  'com.figma'?: FigmaSlotBindingExtension;
  [key: string]: unknown;
}

/** A slot binding: PropBinding to a slot prop with optional platform extensions. */
export interface SlotBinding extends PropBinding {
  $extensions?: SlotBindingExtensions;
}

export type Children = string[] | SlotBinding;
```

**`Component` extension** (`types/Component.ts`):

```yaml
# Before (after ADR-046)
Component:
  title: string
  anatomy: Anatomy
  props?: Props
  subcomponents?: Subcomponents
  default: Variant
  variants?: Variants
  invalidVariantCombinations?: PropConfigurations[]
  metadata?: Metadata

# After
Component:
  ...                                                  # all fields above unchanged
  slotContentExamples?: Record<string, SlotContent>   # new
```

`instanceExamples` is added in ADR-048.

### Schema changes (`schema/`)

| File | Change | Bump |
|------|--------|------|
| `component.schema.json` | Add `slotContentExamples` to `#/definitions/Component` | MINOR |
| `component.schema.json` | Add `#/definitions/SlotBinding`, `SlotBindingExtensions`, `FigmaSlotBindingExtension`; update `#/definitions/Children` | MINOR |

**`slotContentExamples`** in `#/definitions/Component/properties`:

```yaml
slotContentExamples:
  type: object
  description: "Named slot fill examples for this component. Each entry is a SlotContent (ADR-046). Referenced via JSON Pointer from SlotBinding.$extensions['com.figma'].default and from Element.propConfigurations slot-prop entries (ADR-049)."
  patternProperties:
    "^[a-zA-Z0-9_-]+$":
      $ref: "#/definitions/SlotContent"
  additionalProperties: false
```

**New definitions** in `#/definitions`:

```yaml
FigmaSlotBindingExtension:
  type: object
  description: "Figma authoring metadata on a slot binding. Not honored by code consumers."
  properties:
    default:
      type: string
      description: "JSON Pointer to a SlotContent or Composition — Figma's default fill for this slot. Resolves using $slotContent rules (ADR-046)."
  additionalProperties: true

SlotBindingExtensions:
  type: object
  description: "Open extension bag on a SlotBinding for platform-specific metadata."
  properties:
    "com.figma":
      $ref: "#/definitions/FigmaSlotBindingExtension"
  additionalProperties: true

SlotBinding:
  type: object
  description: "Slot binding: a PropBinding to a slot prop with optional platform-specific authoring metadata."
  required: [$binding]
  properties:
    $binding:
      type: string
      description: "JSON Pointer to the bound slot prop."
    $extensions:
      $ref: "#/definitions/SlotBindingExtensions"
  additionalProperties: false

Children:
  oneOf:
    - type: array
      items: { type: string }
    - $ref: "#/definitions/SlotBinding"
```

### Out of scope for this ADR

- **`Component.instanceExamples`** and `InstanceExample` — see ADR-048
- **`PropConfigurations` widening to accept `SlotContentRef`** — see ADR-049
- **External `compositions.yaml` file schema** — follow-on ADR

### Notes

- **`slotContentExamples` entries are slot-agnostic.** The same `SlotContent` (e.g., a glyph icon) can be referenced from multiple `propConfigurations.<slotName>` sites and from multiple `SlotBinding.$extensions['com.figma'].default` values. Authors are not forced to duplicate identical content per slot.
- **`SlotBinding.$extensions` is structurally available only in the slot-binding arm of `Children`.** A container with `children: string[]` (plain frame children) cannot carry a Figma default — the schema enforces this through the `Children` discriminant.
- **Per-variant Figma defaults are free.** `children` lives in `default.elements` and `variants[n].elements`; different variants may declare different Figma defaults for the same slot-bound container without any special-case mechanism.
- **`PropBinding` is unchanged.** `SlotBinding extends PropBinding` adds `$extensions` only for the `children`-binding case. `PropBinding`'s other use sites (`content`, `instanceOf`, `visible`) are unaffected.
- **`FigmaSlotBindingExtension` and `SlotBindingExtensions` use `additionalProperties: true`** — open extension objects by design, following the DTCG pattern.
- **The `default` pointer is a plain string, not a `SlotContentRef` object.** It lives inside `$extensions['com.figma']`, which code consumers already skip entirely; wrapping it in `{ $slotContent: ... }` would add structure with no benefit inside a namespace that is already ignored.

---

## Type ↔ Schema Impact

- **Symmetric**: Yes
- **Parity check**:
  - `Component.slotContentExamples?: Record<string, SlotContent>` ↔ `#/definitions/Component/properties/slotContentExamples` (`patternProperties` → `SlotContent`)
  - `FigmaSlotBindingExtension { default?: string }` ↔ `#/definitions/FigmaSlotBindingExtension`
  - `SlotBindingExtensions { 'com.figma'?: FigmaSlotBindingExtension }` ↔ `#/definitions/SlotBindingExtensions`
  - `SlotBinding extends PropBinding { $extensions?: SlotBindingExtensions }` ↔ `#/definitions/SlotBinding`
  - `Children = string[] | SlotBinding` ↔ `#/definitions/Children` (`oneOf`)

---

## Downstream Impact

| Consumer | Impact | Action required |
|----------|--------|-----------------|
| `specs-from-figma` | Must detect and emit `slotContentExamples` from slot layers; de-duplicate entries by structural equality across variants and slots — when two fills are identical, emit one entry and reference it from both call sites; must emit `$extensions['com.figma'].default` on slot bindings in `default.elements` / `variants[n].elements` | Read new fields; implement slot-content detection with de-duplication; update output emitters |
| `specs-cli` | Recompile; output includes `slotContentExamples` and `SlotBinding.$extensions` when present | Recompile; no breaking change |
| `specs-plugin-2` | Recompile; slot-content rendering is a follow-on capability | Recompile; pass through data initially |

---

## Semver Decision

**Version bump**: `0.21.0 → 0.22.0` (`MINOR`)

**Justification**: Optional `slotContentExamples` field added to `Component`; new `SlotBinding`, `SlotBindingExtensions`, `FigmaSlotBindingExtension` interfaces; `Children` widened from `string[] | PropBinding` to `string[] | SlotBinding` where `SlotBinding` is a structural superset of `PropBinding` (existing `{ $binding }` values still validate). All additive → MINOR per Constitution §III.

---

## Consequences

- `Component.slotContentExamples` and `Component.instanceExamples` (ADR-048) are siblings: each holds one type with one purpose. `instanceExamples` documents whole-component prop-configured usages; `slotContentExamples` holds named slot fill examples.
- Slot-content entries are slot-agnostic; binding to a specific slot happens at the reference site — `propConfigurations.<slotName>` via `SlotContentRef` (ADR-049) for authored usage, `SlotBinding.$extensions['com.figma'].default` for Figma authoring provenance.
- `SlotBinding.$extensions['com.figma'].default` colocates the Figma default with the slot binding inside `Element.children`. The `$extensions` framing marks it as design-tool provenance — code consumers ignore it. Per-variant defaults fall out because `children` already lives on `Element`.
- `SlotBindingExtensions` is an open extension object — future platform-specific slot-binding metadata can be added without a new ADR.
