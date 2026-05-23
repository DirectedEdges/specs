# Downstream Implementer Reaction: "Big Decisions"

From the perspective of a downstream toolchain—encompassing a code-generation factory (for React, iOS, Android), an analysis suite (for monitoring design system health/reuse), and a documentation authoring pipeline—here is a reaction to the open structural and naming choices.

---

### 1. Flat vs. Nested Compositions (ADR-049) -> **Strongly Prefer Flat (Option B)**
* **Code Generation Pipelines:** Generating code for flat, named references aligns perfectly with modern component architecture. A shared `$composition` reference maps seamlessly to a standalone helper function, a separate sub-component, or an imported variable. The "Nested" (inline) approach guarantees massive, bloated render trees and forces the code generator to attempt highly complex AST deduplication. 
* **Analysis Suites:** Health metrics require tracking pattern reuse. Deeply nested inline objects disguise duplicated effort. A flat, pointer-based registry allows analysis tools to instantly track reference frequency and identify orphaned designs.
* **Documentation Pipelines:** Documentation thrives on explicit intent and named concepts. Authors specifying flat compositions inherently provide titles/keys that become the headers for generated Storybook instances or Doc site snippets.

### 2. Consolidated `examples` vs. Sibling Fields -> **Prefer Sibling Fields**
* **Code Generation & Docs:** Grouping conceptually distinct payloads into one array forces every downstream consumer to immediately apply a `.filter(e => e.kind === ...)` step. `instanceExamples` (top-level usage demonstrations) power interactive playgrounds and public documentation. `slotContent` (internal component fills) power automated testing fixtures and default slot rendering paths. They have different audiences and lifecycles. Schema-level structural isolation is much safer for type safety.

### 3. Consolidated vs. Separated `anatomy` / `elements` -> **Prefer Separated**
* **Code Generation:** Keeping `anatomy` separated from `elements` in `Composition` means the downstream parsing pipeline can reuse the exact same logic it uses for processing a `Variant`. Downstream factories often treat `anatomy` as the shape of the render tree (the JSX nodes), and `elements` as the data payload (the props bound to those nodes). Converging them would break architectural symmetry and complicate type generation logic. 

### 4 & 5. Naming `$composition` and JSON Pointers -> **Strongly Support JSON Pointers**
* **Analysis & Code Generation:** Reusing the exact JSON Pointer syntax from `$binding` (`#/props/label`) for `$composition` (`#/compositions/pageHeader`) is a massive win. Tooling can leverage a unified reference-resolution utility traversing the specification. Using `$composition` as the key distinguishes semantic intent perfectly from a generic schema `$ref`, making AST walking unambiguous.

### 6. Where the Figma Default Lives -> **Strongly Support `$extensions['com.figma']`**
* **Code Generation:** This is arguably the most crucial decision for platform implementers. In React, Android, and iOS, the handling of an empty slot relies on conditional rendering or default prop values hardcoded in the application layer—*not* injected data. Placing authoring metadata inside `$extensions['com.figma']` safely quarantines it. Code factories can blanket-ignore `$extensions` to avoid emitting unwanted hardcoded Figma fallback elements.

### 7. Unifying `SlotBinding` and `CompositionRef` -> **Prefer Parallel-but-Distinct**
* **AST Parsing:** Although both resolve to structural data, they describe inverse relationship directions. `SlotBinding` is an *inbound* mapping (how an external prop maps into an element). `CompositionRef` is an *outbound* mapping (how an element outputs to an external composition). Keeping them distinct avoids parsing ambiguity when the tool is building its relationship graph.

### 8 & 9. `kind` values (If Consolidation Lands) -> **Avoid `nestedSlotContent` discrimination**
* **Analysis:** If Option 2 does land on consolidation, avoid tracking topological depth in the `kind` enum. To a structural parser, `slotContent` and `nestedSlotContent` are identical: they are both structural trees resolving from a reference. Storing reference depth at the definition level adds artificial complexity to the schema typing. Keep the definition structurally unaware of its calling context.