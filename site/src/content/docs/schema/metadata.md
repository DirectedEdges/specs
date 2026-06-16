---
title: "Metadata"
description: "Generation metadata — author, schema version, source, and config"
---

Generation metadata attached to the spec. Present when the spec was produced by a tool (plugin, CLI) rather than authored by hand.

## Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `author` | `string` | Yes | Who or what generated the spec |
| `lastUpdated` | `string` | Yes | ISO 8601 timestamp |
| `generator` | `object` | Yes | Tool info — `name`, `version`, `url`, and optional `license` |
| `generator.version` | `string` | Yes | Semver string of the tool that produced the spec (e.g. `"1.10.0"`) |
| `generator.license` | `object` | No | License status (`status`: VALID/EXPIRED/NONE) and `level` (FREE/PRO/EXTENDED) |
| `schema` | `object` | Yes | Schema version info — `url`, `version`, and optional `latest` URL |
| `source` | `object` | Yes | Figma source — `pageId`, `nodeId`, `nodeType` (COMPONENT, COMPONENT_SET, or FRAME) |
| `config` | [`Config`](/specs/schema/config/) | Yes | The configuration used to generate this spec |

## Further Reading

- [ADR 001 — Surface License State in Component Output](https://github.com/DirectedEdges/specs/blob/main/adr/001-metadata.license.md) — adds `generator.license` for downstream entitlement gating
