---
title: "Output"
description: "Control where and how generated specifications are written"
---

Controls where and how to write generated specifications. Run choices, configured via the `spec` block in `config/settings.yaml` or CLI flags — any split arrangement carries the same spec data.

```yaml
spec:
  splitComponents: false    # Create separate file per component
  splitConcerns: false      # Separate API, variants, and examples
  useSubfolders: false      # Use component subdirectories
```

## Output Modes

The CLI supports four output modes based on flag combinations:

| Mode | `--split-components` | `--split-concerns` | Output Structure |
|------|---------------------|-------------------|------------------|
| **Single-file** | - | - | `library.yaml` (all components) |
| **Per-component** | yes | - | `button.yaml`, `alert.yaml`, ... |
| **Per-concern** | - | yes | `api.yaml` + `variants.yaml` (+ `examples.yaml` if any examples) |
| **Combined** | yes | yes | `button/api.yaml`, `button/variants.yaml` (+ `button/examples.yaml` if examples), ... |

## `splitComponents`

Create separate file per component.

- **Type**: boolean
- **Default**: `false` (single library file)
- **CLI Flag**: `--split-components`

```yaml
spec:
  splitComponents: true
  useSubfolders: false  # button.yaml, alert.yaml (flat)
```

```yaml
spec:
  splitComponents: true
  useSubfolders: true   # button/button.yaml, alert/alert.yaml
```

File naming converts display names to camelCase (e.g., `"DS Alert"` → `dsAlert.yaml`).

## `splitConcerns`

Separate API specification, variant configuration, and examples.

- **Type**: boolean
- **Default**: `false` (complete component data)
- **CLI Flag**: `--split-concerns`

```yaml
spec:
  splitConcerns: true
```

**API file** (`api.yaml`):
```yaml
components:
  - name: Button
    anatomy: ...
    props: ...
```

**Variants file** (`variants.yaml`):
```yaml
components:
  - name: Button
    default: ...
    variants: ...
```

**Examples file** (`examples.yaml`):
```yaml
components:
  - name: Alert
    slotContentExamples: ...
    instanceExamples: ...
```

`examples.yaml` is written only when at least one component has `slotContentExamples`
or `instanceExamples`; components without examples are omitted from it. Without this
file the `$slotContent` references in `default`/`variants` would have no target.

Example output is a [Pro feature](/settings/default-slot-content/) — on the free tier no example data is produced, so `examples.yaml` is never written.

## `useSubfolders`

Create component subdirectories when splitting by component.

- **Type**: boolean
- **Default**: `false` (flat structure)
- **Effect**: Only applies when `splitComponents: true`
- **CLI Flag**: `--use-subfolders`

**Without subfolders** (flat):
```
specs/
├── button.yaml
├── alert.yaml
└── card.yaml
```

**With subfolders**:
```
specs/
├── button/
│   └── button.yaml
├── alert/
│   └── alert.yaml
└── card/
    └── card.yaml
```

## Combined Mode

Using both `splitComponents` and `splitConcerns` creates component directories with concern files:

```yaml
spec:
  splitComponents: true
  splitConcerns: true
  useSubfolders: false  # Component dirs created automatically
```

```
specs/
├── button/
│   ├── api.yaml       # Anatomy + props
│   └── variants.yaml  # Default + variants
├── alert/
│   ├── api.yaml
│   ├── variants.yaml
│   └── examples.yaml  # slotContentExamples + instanceExamples (only if present)
└── card/
    ├── api.yaml
    └── variants.yaml
```

## CLI Flag Priority

Output configuration follows the standard [priority system](/settings/#priority-system):

1. **CLI flags** (highest): `--split-components`, `--split-concerns`, `--use-subfolders`
2. **Config file**: `spec` block in `config/settings.yaml`
3. **Defaults** (lowest): Single-file mode, YAML format

In the pre-split `specs.config.yaml`, these flags lived in a root-level `output` block. That file is no longer read — [`specs migrate config`](/cli/commands/migrate/) converts it, moving them to `spec`.

```bash
# Config has splitComponents: false
# CLI overrides to true
specs generate --split-components
```
