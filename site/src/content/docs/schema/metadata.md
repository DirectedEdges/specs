---
title: "Metadata"
description: "Generation metadata — author, schema version, source, and settings"
---

Generation metadata attached to the spec. Present when the spec was produced by a tool (plugin, CLI) rather than authored by hand.

Only `source` describes the component that carries it. The other six properties describe the *run* that produced the spec — they are identical for every component generated together — and a run may state them once in a separate run metadata document instead of repeating them on each component (ADR-089). All six are therefore optional here: absent means "read them from the run metadata document", not "unknown".

## Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `source` | `object` | Yes | Figma source — `pageId`, `nodeId`, `nodeType` (COMPONENT, COMPONENT_SET, or FRAME) |
| `author` | `string` | No | Who or what generated the spec |
| `lastUpdated` | `string` | No | ISO 8601 timestamp |
| `generator` | `object` | No | Tool info — `name`, `version`, `url`, and optional `license` |
| `generator.version` | `string` | Yes, within `generator` | Semver string of the tool that produced the spec (e.g. `"1.10.0"`) |
| `generator.license` | `object` | No | License status (`status`: VALID/EXPIRED/NONE) and `level` (FREE/PRO/EXTENDED) |
| `schema` | `object` | No | Schema version info — `url`, `version`, and optional `latest` URL |
| `conventions` | `MetadataConventions` | No | Exactly the one platform entry that produced this spec — `platforms.figma` for a Figma capture — not every platform the workspace configures (ADR-079); see [Conventions](/schema/conventions/) |
| `settings` | [`Settings`](/schema/settings/) | No | Choices about the run that generated this spec |
| `concern` | `Concern` | No | Which slice of a component this document carries — `api`, `variants`, or `examples` — when a run wrote one file per concern. Absent on a single-file component; see [Component](/schema/component/) |

### Full form

```yaml
metadata:
  author: Design Systems Team
  lastUpdated: "2026-09-15T00:00:00.000Z"
  generator: { url: "https://...", version: "0.30.0", name: specs-cli }
  schema: { url: "https://.../v0.33.0/schema/component.schema.json", version: "0.33.0" }
  source: { pageId: "12:0", nodeId: "12:345", nodeType: COMPONENT_SET }
  conventions: { ... }
  settings: { ... }
```

### Reduced form

```yaml
metadata:
  source: { pageId: "12:0", nodeId: "12:345", nodeType: COMPONENT_SET }
```

## RunMetadata

`RunMetadata` is the run's six facts on their own, as a document in its own right. It carries no per-component data, and all six properties are required — the document exists to state the run's facts, so a partial one would leave a reader unable to tell a missing fact from one stated elsewhere.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `author` | `string` | Yes | Who or what generated the specs |
| `lastUpdated` | `string` | Yes | ISO 8601 timestamp |
| `generator` | `object` | Yes | Tool info — `name`, `version`, `url`, and optional `license` |
| `schema` | `object` | Yes | Schema version info — `url`, `version`, and optional `latest` URL |
| `conventions` | `MetadataConventions` | Yes | The one platform entry that produced the specs; see [Conventions](/schema/conventions/) |
| `settings` | [`Settings`](/schema/settings/) | Yes | Choices about the run that generated the specs |

```yaml
author: Design Systems Team
lastUpdated: "2026-09-15T00:00:00.000Z"
generator:
  url: "https://..."
  version: "0.30.0"
  name: specs-cli
  license: { status: VALID, level: PRO }
schema:
  url: "https://.../v0.33.0/schema/component.schema.json"
  version: "0.33.0"
conventions: { ... }
settings: { ... }
```

The document validates against `metadata.schema.json`, exported as `@directededges/specs-schema/schema/metadata` and reachable from `root.schema.json` alongside a component and a component set.

## Further Reading

- [ADR 001 — Surface License State in Component Output](https://github.com/DirectedEdges/specs/blob/main/adr/001-metadata.license.md) — adds `generator.license` for downstream entitlement gating
- [ADR 089 — Run Metadata Factored Out of the Component Spec](https://github.com/DirectedEdges/specs/blob/main/adr/089-manifest-shared-metadata.md) — adds `RunMetadata` and narrows the required set on `Metadata` to `source`
