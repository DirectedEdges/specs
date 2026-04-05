# ADR 031 — CLI Adaptation Plan

## Context

ADR 031 restructures subcomponent configuration in `@directededges/anova`. The existing flat fields (`processing.subcomponentNamePattern` and `include.subcomponents`) are replaced by a nested `processing.subcomponents` object with `scope?`, `match[]`, and `exclude?[]`. The CLI must update its config template, config validation, and documentation to match.

ADR source: `anova/adr/031-subcomponent-search-scope.md`

## Summary of Changes

The CLI has no subcomponent-specific UI or flags — it passes config through to `Component.fromRestApi()`. The changes are limited to:

1. **Config template** (`anova init`) — replace `subcomponentNamePattern` and `include.subcomponents` with the new `processing.subcomponents` block
2. **Config validation** — remove `subcomponentNamePattern` validation; add validation for `processing.subcomponents` shape
3. **Documentation** — update all docs referencing the old fields

No changes to `GenerateCommand.ts`, `BatchCommand.ts`, or `FetchCommand.ts` — they pass `modelConfig` through without inspecting subcomponent fields.

## Affected Files

| File | Action | Description |
|------|--------|-------------|
| `src/Config/ConfigTemplates.ts` | **Modify** | Replace `subcomponentNamePattern` and `include.subcomponents` in YAML template with `processing.subcomponents` block |
| `src/Config/ConfigLoader.ts` | **Modify** | Update `validateAndCorrectModelConfig()` to validate `processing.subcomponents` shape instead of `subcomponentNamePattern` |
| `docs/configuration.md` | **Modify** | Replace `subcomponentNamePattern` and `include.subcomponents` docs with `processing.subcomponents` docs |
| `docs/commands/init.md` | **Modify** | Update example template output |
| `docs/getting-started.md` | **Modify** | Update config example |
| `docs/examples.md` | **Modify** | Update all config examples (YAML and JSON) |
| `docs/index.md` | **Modify** | Update config example |

## Detailed Changes

### 1. `src/Config/ConfigTemplates.ts`

**`generateConfigTemplate()`** — replace the `processing` and `include` sections:

Remove:
```yaml
    subcomponentNamePattern: '${DEFAULT_MODEL_CONFIG.processing?.subcomponentNamePattern || '_.+'}'
```

Add:
```yaml
    # Subcomponent discovery configuration.
    # Presence of this block enables subcomponent detection.
    # See: https://docs.anova.dev/cli/configuration#subcomponents
    subcomponents:
      # Where to search: NESTED (component anatomy only) or PAGE (also search Figma page)
      # scope: NESTED

      # Template patterns defining which assets are subcomponents.
      # Uses {C} (component name) and {S} (subcomponent name) placeholders.
      match:
        - '{C} / _ / {S}'

      # Template patterns to exclude from matches (optional).
      # exclude:
      #   - '{C} / Examples / {S}'
```

Note: the `match` default value comes from `DEFAULT_MODEL_CONFIG.processing.subcomponents.match` once anova 0.15.0 is published. Until then, hardcode the default.

Remove from `include` section:
```yaml
    subcomponents: ${DEFAULT_MODEL_CONFIG.include?.subcomponents !== false ? 'true' : 'false'}
```

And update the include comment to note that subcomponent inclusion is now controlled by the presence of `processing.subcomponents`.

**`generateConfigTemplateJson()`** — no change needed; it passes `DEFAULT_MODEL_CONFIG` directly, which will carry the new shape once anova is updated.

### 2. `src/Config/ConfigLoader.ts`

**`validateAndCorrectModelConfig()`** — remove `subcomponentNamePattern` validation (lines referencing it don't exist today, but the `deepMerge` will propagate the old field if present in user config).

Add validation for `processing.subcomponents` when present:
```typescript
// Validate processing.subcomponents
if (corrected.processing.subcomponents !== undefined) {
  const subs = corrected.processing.subcomponents;

  // scope must be NESTED or PAGE
  const validScopes = ['NESTED', 'PAGE'];
  if (subs.scope !== undefined && !validScopes.includes(subs.scope)) {
    subs.scope = 'NESTED';
  }

  // match must be a non-empty string array
  if (!Array.isArray(subs.match) || subs.match.length === 0) {
    console.warn('Invalid processing.subcomponents.match: must be a non-empty array of strings. Removing subcomponents config.');
    delete corrected.processing.subcomponents;
  }

  // exclude, if present, must be a string array
  if (subs.exclude !== undefined && !Array.isArray(subs.exclude)) {
    delete subs.exclude;
  }
}
```

**Migration handling** — if the user config still has `processing.subcomponentNamePattern` (old format), the `deepMerge` will carry it through harmlessly since the anova types no longer declare it. No explicit migration is needed — the field is simply ignored by the transformer.

Similarly, `include.subcomponents` in old configs will be ignored since anova's `Config.include` no longer declares it.

### 3. `docs/configuration.md`

Replace `#### subcomponentNamePattern (string)` section (lines ~78–88) with:

```markdown
#### `subcomponents` (object, optional)

Subcomponent discovery configuration. When present, enables subcomponent detection. When absent, subcomponents are not detected.

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `scope` | `"NESTED"` \| `"PAGE"` | No | `NESTED` | Where to search. `NESTED` = component anatomy only; `PAGE` = also search the Figma page |
| `match` | `string[]` | Yes | — | Template patterns using `{C}` (component name) and `{S}` (subcomponent name) placeholders |
| `exclude` | `string[]` | No | — | Template patterns to exclude from matches. Same `{C}/{S}` syntax |

```yaml
processing:
  subcomponents:
    scope: PAGE
    match:
      - '{C} / {S}'
      - '{C} / _ / {S}'
    exclude:
      - '{C} / Examples / {S}'
```
```

Remove `#### subcomponents (boolean)` section from the `include` docs (lines ~199–208). Add a note:

```markdown
> **Note**: Subcomponent inclusion is now controlled by the presence of `processing.subcomponents`. The `include.subcomponents` toggle has been removed.
```

Update all full-config examples in the file to use the new shape.

### 4. `docs/commands/init.md`

Update the example template output (~line 114) to show `processing.subcomponents.match` instead of `subcomponentNamePattern`, and remove `include.subcomponents`.

### 5. `docs/getting-started.md`

Update the config example (~line 131) to remove `include.subcomponents: true`.

### 6. `docs/examples.md`

Update all config examples:
- YAML examples (~lines 157, 168): replace `subcomponentNamePattern` with `subcomponents.match`, remove `include.subcomponents`
- JSON examples (~lines 458, 469): same replacements in JSON format

### 7. `docs/index.md`

Update the config snippet (~line 73) to remove `include.subcomponents: true`.

## Out of Scope

- **GenerateCommand / BatchCommand / FetchCommand**: These pass `modelConfig` through to `Component.fromRestApi()` without inspecting subcomponent fields. No changes needed.
- **CLIConfig type**: `model` is typed as `ModelConfig` from `@directededges/anova` — it picks up the new shape automatically.
- **ConfigDefaults.ts**: CLI defaults delegate to `DEFAULT_MODEL_CONFIG` from anova. No CLI-specific subcomponent defaults needed.
- **CLI flags for subcomponents**: No CLI flags exist for subcomponent config today; none are being added. Users configure subcomponents via the config file.

## Verification

1. `cd anova-kit && npm run build` — confirm no TypeScript or build errors
2. `anova init` — verify generated `.anova.config.yaml` shows new `processing.subcomponents` block (not `subcomponentNamePattern`)
3. Verify `include.subcomponents` is absent from the generated template
4. Create a config with old fields (`subcomponentNamePattern`, `include.subcomponents`) — verify no crash, fields ignored gracefully
5. Create a config with new fields — verify `processing.subcomponents` passes through to `Component.fromRestApi()` correctly
6. Create a config with invalid `processing.subcomponents.scope` value — verify warning and fallback to `NESTED`
7. Create a config with empty `processing.subcomponents.match` — verify warning and removal of subcomponents config
