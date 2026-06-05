# Template-driven emitters (deferred)

Companion to [`README.md`](README.md). Not part of v1, but worth defining now so the v1 architecture leaves room. The question this answers: can consumers customize *what an output looks like* without forking the emitter registry?

## The shape

Each emitter is split into two parts:

```
emitter = ( spec → context )  +  ( context + template → string )
            ^^^^^^^^^^^^^^         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
            assembly function       template render
            (TS, in registry)       (Handlebars / EJS / etc.)
```

The **assembly function** walks the spec, selects and normalizes the data the emitter cares about, and produces a structured `context` object. This stays in `specs-cli`, written in TypeScript, fixture-tested. It is the only thing that decides *what data* the output contains.

The **template** receives that context and renders it to a string. It uses a fixed registry of helpers (kebab, camel, formatToken, pluralize, indent — closed set, not extensible at runtime). It can reorder sections, change presentation (table ↔ list), drop sections entirely, rename headings — anything that's pure presentation. It cannot define new derived data, run user code, or fetch anything external.

## Consumer override

A consumer drops a template at a known location and the registry uses it instead of the built-in:

```
my-design-system/
├─ specs/
│  └─ button.yaml
└─ .specs/
   └─ templates/
      ├─ md.hbs           ← overrides built-in for every component
      └─ button.md.hbs    ← overrides just for button
```

Resolution order: per-component template → workspace template → built-in. Per-component templates are escape hatches; workspace templates are the team's house style.

## What templates can do

- Reorder sections, rename headings, change list ↔ table form
- Drop sections (e.g. omit `Provenance` for internal docs)
- Add static prose around the emitted data (a CMS-shaped header, a footer, an org-specific banner)
- Use the fixed helper set to format identifiers consistently with the team's conventions

## What templates cannot do

- Define new data fields not in the assembly context (need a new emitter or upstream schema field)
- Run arbitrary code at emit time
- Make decisions that vary the data based on inference ("if this looks like a form control, show…") — that's smoothing, not emitting

## Maintenance constraints

To keep this from sprawling:

- One assembly function per emitter; one default template per emitter. Both ship from the registry, both fixture-tested together.
- The `context` shape is part of the emitter's public contract — versioned, documented, breaking changes get a major bump.
- The helper registry is closed. Adding a helper requires a registry change, not a sidecar.
- Templates with logic-heavy presentation are a smell. If a template is doing real work, that work belongs in the assembly function or a new emitter.

## Why not now

Templates double the surface area. A consumer with no customization needs gets nothing from this design — they just want the default output. Until there's clear evidence teams want per-team variation, the registry stays single-stage (assembly directly produces strings), and templates are deferred to the day someone files the request.

The point of describing them here is to keep the v1 implementation compatible with this future split: keep the assembly logic separate from the string-formation logic inside each emitter, even if the latter is just a tagged template literal for now. That's a cheap discipline today and a clean upgrade path later.
