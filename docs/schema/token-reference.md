---
title: TokenReference
order: 11
description: Design token reference following the DTCG format
---

# TokenReference

A reference to a design token, following the [Design Tokens Community Group](https://design-tokens.github.io/community-group/format/) (DTCG) format. Token references appear wherever a style value can be a token instead of a literal.

```ts
interface TokenReference {
  $token: string;
  $type: string;
  $extensions?: object;
}
```

## Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `$token` | `string` | Yes | Dot-separated token path |
| `$type` | `string` | Yes | Token type |
| `$extensions` | `object` | No | Vendor extensions |

### `$token`

The dot-separated path to the token, e.g. `"DS Color.Text.Primary"` or `"DS.Space.400"`.

### `$type`

One of: `color`, `dimension`, `string`, `number`, `boolean`, `shadow`, `gradient`, `typography`, `effects`.

### `$extensions`

Optional vendor-specific metadata. The `com.figma` extension includes:

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Figma variable ID |
| `name` | `string` | Figma variable name |
| `collectionName` | `string` | Variable collection name |
| `rawValue` | `string \| number \| boolean` | Resolved raw value |

## Example

```yaml
$token: DS Color.Text.Primary
$type: color
$extensions:
  com.figma:
    id: VariableID:123:456
    collectionName: DS Color
```

## Further Reading

- [ADR 006 — Unified Token Reference Type](../../adr/006-token-references.md) — introduces the DTCG-aligned `TokenReference` type
- [ADR 007 — Consolidate Token Format Configuration](../../adr/007-token-reference-config.md) — introduces the `format.tokens` config option controlling token output shape
