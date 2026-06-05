# CSS States Setup — Library Analysis Skill

Scans a generated specs output directory, identifies variant configuration props that are
candidates for `processing.states` concepts, and proposes a `states:` block for `specs.config.yaml`.

---

## When to use

Run this once when setting up the `css` and `contract` transformers for a new library, or when
the library has grown and you want to audit whether new state props have appeared.

## How to run

Invoke this skill and pass the path to the specs output directory (the folder containing
component subfolders with `variants.yaml` files).

## What it does

1. Reads every `variants.yaml` in the output directory.
2. Collects all prop names and values appearing in `configuration` objects across all variants.
3. Scores each prop/value pair against the concept table below.
4. Emits a proposed `states:` block — high-confidence matches uncommented, lower-confidence
   matches commented out for review.
5. Lists unrecognized props so nothing is silently treated as a `data-*` attribute when it
   might be a state.

---

## Concept reference table

Each concept has a canonical CSS selector and a contract default (whether the prop appears
in the generated Props interface).

| Concept | Prop convention | Value convention | CSS selector | Contract |
|---|---|---|---|---|
| `hover` | `state` | `hover` | `:hover` | omitted |
| `active` | `state` | `pressed` or `active` | `:active` | omitted |
| `focus` | `state` | `focused` | `:focus-visible` | omitted |
| `focus-visible` | `state` | `focused` | `:focus-visible` | omitted |
| `focus-within` | `focused` | `true` | `:focus-within` | omitted |
| `placeholder-shown` | `state` | `placeholder` | `:placeholder-shown` | omitted |
| `disabled` | `disabled` / `isDisabled` | `true` | `:disabled, [aria-disabled="true"]` | included |
| `readonly` | `readOnly` | `true` | `[readonly], [aria-readonly="true"]` | included |
| `required` | `required` / `isRequired` | `true` | `[required], [aria-required="true"]` | included |
| `invalid` | `validation` | `invalid` | `[aria-invalid="true"]` | included |
| `valid` | `validation` | `valid` | `[aria-invalid="false"]` | included |
| `selected` | `selected` | `true` | `[aria-selected="true"]` | included |
| `checked` | `checked` | `true` | `:checked, [aria-checked="true"]` | included |
| `indeterminate` | `checkState` | `indeterminate` | `:indeterminate, [aria-checked="mixed"]` | included |
| `expanded` | `expanded` | `true` | `[aria-expanded="true"]` | included |
| `collapsed` | `expanded` | `false` | `[aria-expanded="false"]` | included |
| `pressed` | `toggleState` | `pressed` | `[aria-pressed="true"]` | included |
| `busy` | `loading` | `true` | `[aria-busy="true"]` | included |
| `current` | `current` | `true` | `[aria-current="true"]` | included |

**Omitted-contract concepts** (hover, active, focus, focus-visible, focus-within,
placeholder-shown) are browser-driven — the browser fires them without the application setting
anything, so they are excluded from generated Props interfaces.

**Included-contract concepts** (all others) are consumer-controlled — the application sets them
and the component bridges them to the appropriate HTML or ARIA attribute.

The `contract` field is only needed in the config when overriding the concept's canonical default.

---

## Instructions

Given a specs output directory path:

1. List all subdirectories that contain a `variants.yaml`.
2. For each, parse the `variants` array and collect every `[prop, value]` pair from each
   `configuration` object. Track which components use each pair.
3. Match props and values against the concept table above. Separate into:
   - **High-confidence**: prop name and value both match the convention column
   - **Lower-confidence**: prop name matches but value is ambiguous or non-standard
   - **Unrecognized**: no match found
4. For `state` props with multiple values, map each value to its concept individually.
   Values like `rest`, `default`, `none` are base states — skip them (they're covered by
   the base selector and produce no variant block).
5. Print a summary table: prop → values seen → concept → components using it.
6. Emit the proposed YAML block. High-confidence entries go in uncommented.
   Lower-confidence entries go in as comments with a note. Unrecognized props are listed
   after as a "Review manually" section.

## Output format

```yaml
# Proposed states config — paste into specs.config.yaml under config.processing
processing:
  states:
    hover:
      prop: state
      value: hover
    active:
      prop: state
      value: pressed      # Figma uses "pressed" for cross-platform pointer-down
    focus-within:
      prop: focused       # boolean prop; value defaults to "true"
    disabled:
      prop: isDisabled    # library uses "is" prefix convention
    readonly:
      prop: readOnly
    invalid:
      prop: validation
      value: invalid      # only the invalid enum value maps to this concept
    expanded:
      prop: expanded
    # Lower-confidence — review before enabling:
    # selected:
    #   prop: selected    # confirm this prop drives aria-selected on the host element
```

Unrecognized props (review manually):
- `{propName}`: values `{v1, v2, …}` — seen in {componentA, componentB}
