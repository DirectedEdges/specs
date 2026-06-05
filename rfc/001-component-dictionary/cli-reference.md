# CLI invocation and configuration

Companion to [`README.md`](README.md). The main RFC references this surface from the Architecture section; this file carries the full flag list, config schema, and resolution order.

## Selection

`--emit` accepts file names, group names, or `all` / `defaults` / `none`, composing with `+` / `-`:

```
specs generate ./specs                                # defaults
specs generate ./specs --emit all                     # every built-in
specs generate ./specs --emit defaults,platform       # add a whole group
specs generate ./specs --emit defaults,+react,+css    # add specific files
specs generate ./specs --emit defaults,-elements      # drop a default
```

Resolution: per-component sidecar (`component.emit.yaml`) > CLI flag > workspace `Config.emit` > built-in defaults.

## `Config.emit` block

`Config.emit` extends the existing `specs-schema` `Config` type and carries `preset`, `include`, `exclude`, and per-emitter `options`:

```yaml
config:
  emit:
    preset: defaults                # group name | 'all' | 'none'
    include: [platform, css]
    exclude: [skeleton]
    options:
      css:        { keys: KEBAB }                      # falls back to config.format.keys
      tailwind:   { layer: components, tokenPathTransform: kebab }
      react:     { textSlotAsChildren: button }        # first text slot by default
```

## Identifier casing

Identifier casing reuses `config.format.keys`; per-emitter `keys` override is available where a platform forces a specific style (e.g. CSS forces kebab regardless of root config).
