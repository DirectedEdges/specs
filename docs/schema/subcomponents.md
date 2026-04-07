---
title: Subcomponents
order: 6
description: Embedded child component definitions and $ref linking
---

# Subcomponents

Subcomponents are smaller components embedded within a parent component's spec. They follow the same structure as a top-level `Component` but without `metadata` or nested subcomponents.

```ts
type Subcomponent = Omit<Component, 'metadata' | 'subcomponents'>;
type Subcomponents = Record<string, Subcomponent>;
```

## Structure

A `Subcomponent` contains:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `title` | `string` | Yes | Subcomponent name |
| `anatomy` | [`Anatomy`](anatomy.md) | Yes | Element map |
| `props` | [`Props`](props.md) | No | Prop definitions |
| `default` | [`Variant`](variants.md#variant) | Yes | Default variant |
| `variants` | [`Variant[]`](variants.md) | No | Variant overrides |
| `invalidVariantCombinations` | [`PropConfigurations[]`](prop-configurations.md) | No | Invalid prop combinations |

## Linking

Elements in the parent anatomy reference subcomponents via `$ref`:

```yaml
anatomy:
  label:
    type: instance
    instanceOf:
      $ref: "#/subcomponents/formLabel"
```

The `$ref` is a JSON Pointer into the same spec document.

## Detection

Subcomponent detection is controlled by [`config.processing.subcomponents`](config.md#processing):

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `scope` | `'NESTED' \| 'PAGE'` | `'NESTED'` | Where to search — within the component frame or across the entire page |
| `match` | `string[]` | `['{C} / _ / {S}']` | Name patterns for matching. `{C}` = parent component name, `{S}` = subcomponent name |
| `exclude` | `string[]` | — | Patterns to exclude from matching |

## Further Reading

- [ADR 030 — Subcomponent $ref for instanceOf](../../adr/030-subcomponent-refs.md) — adds `SubcomponentRef` for linking anatomy elements to subcomponents
- [ADR 031 — Subcomponent Search Scope Config](../../adr/031-subcomponent-search-scope.md) — replaces `subcomponentNamePattern` with structured `scope`, `match[]`, `exclude[]`
