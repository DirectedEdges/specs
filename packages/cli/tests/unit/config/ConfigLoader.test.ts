/**
 * ConfigLoader unit tests
 *
 * Covers the split `config/` directory (ADR-071): conventions.yaml,
 * settings.yaml, and pipeline.yaml, each optional and independently
 * defaulted. A pre-split `specs.config.yaml`/`.json` is refused with a
 * pointer to `specs migrate config` — the legacy mapping itself is
 * exercised in tests/unit/commands/MigrateCommand.test.ts.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { ConfigLoader } from '../../../src/Config/ConfigLoader.js';
import { DEFAULT_SETTINGS } from '@directededges/specs-schema';

describe('ConfigLoader', () => {
  let configLoader: ConfigLoader;
  let testDir: string;
  let originalHome: string | undefined;

  beforeEach(() => {
    configLoader = new ConfigLoader();
    // Create temporary test directory
    testDir = path.join(process.cwd(), 'tests', 'tmp', `test-${Date.now()}`);
    fs.ensureDirSync(testDir);

    // Store original values
    originalHome = process.env.HOME;

    // Mock process.cwd() to return test directory
    vi.spyOn(process, 'cwd').mockReturnValue(testDir);
    // Silence validation warnings by default; individual tests spy on
    // console.warn where the warning itself is under test.
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original values
    vi.restoreAllMocks();
    process.env.HOME = originalHome;

    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.removeSync(testDir);
    }
  });

  /** Write one file of a split `config/` directory in the test workspace. */
  function writeSplitFile(name: string, content: string) {
    const dir = path.join(testDir, 'config');
    fs.ensureDirSync(dir);
    fs.writeFileSync(path.join(dir, name), content);
  }

  /** Write a pre-split (v1) config file in the test workspace root. */
  function writeLegacyFile(content: string, name = 'specs.config.yaml') {
    fs.writeFileSync(path.join(testDir, name), content);
  }

  describe('split config/ directory (ADR-071)', () => {
    it('loads conventions, settings, and pipeline from config/', () => {
      writeSplitFile('conventions.yaml', `
figma:
  naming: SENTENCE
  glyphs:
    match: 'DS Icon Glyph / {i}'
  slotConstraints: true
`);
      writeSplitFile('settings.yaml', `
author: Test Author
spec:
  format: YAML
  variantDepth: 2
`);
      writeSplitFile('pipeline.yaml', `
transformers:
  - name: contract
  - name: css
analyses:
  - name: dependencies
`);

      const config = configLoader.load();
      expect(config.conventions.figma.naming).toBe('SENTENCE');
      expect(config.conventions.figma.glyphs).toEqual({ match: 'DS Icon Glyph / {i}' });
      expect(config.conventions.figma.slotConstraints).toBe(true);
      expect(config.settings.author).toBe('Test Author');
      expect(config.settings.spec.format).toBe('YAML');
      expect(config.settings.spec.variantDepth).toBe(2);
      expect(config.pipeline.transformers).toEqual([{ name: 'contract' }, { name: 'css' }]);
      expect(config.pipeline.analyses).toEqual([{ name: 'dependencies' }]);
    });

    it('defaults each missing split file independently', () => {
      writeSplitFile('settings.yaml', 'spec:\n  variantDepth: 3');

      const config = configLoader.load();
      // conventions.yaml absent — resolved conventions defaults
      expect(config.conventions).toEqual({
        figma: { naming: 'NONE', slotConstraints: false, inferNumberProps: false },
      });
      // pipeline.yaml absent — empty lists
      expect(config.pipeline).toEqual({ transformers: [], analyses: [] });
      // settings.yaml present — merged over DEFAULT_SETTINGS
      expect(config.settings.spec.variantDepth).toBe(3);
      expect(config.settings.spec.format).toBe(DEFAULT_SETTINGS.spec.format);
    });

    it('accepts .json split files', () => {
      writeSplitFile('conventions.json', JSON.stringify({ figma: { naming: 'TITLE' } }));

      const config = configLoader.load();
      expect(config.conventions.figma.naming).toBe('TITLE');
    });

    it('loads normally (no throw) when config/ is present alongside a legacy specs.config.yaml', () => {
      writeSplitFile('settings.yaml', 'spec:\n  variantDepth: 2');
      writeLegacyFile('config:\n  processing:\n    variantDepth: 1');

      let config;
      expect(() => {
        config = configLoader.load();
      }).not.toThrow();
      expect(config!.settings.spec.variantDepth).toBe(2); // config/ wins
    });

    it('loads an explicit directory path', () => {
      const dir = path.join(testDir, 'elsewhere', 'config');
      fs.ensureDirSync(dir);
      fs.writeFileSync(path.join(dir, 'settings.yaml'), 'spec:\n  format: YAML');

      const config = configLoader.load(dir);
      expect(config.settings.spec.format).toBe('YAML');
    });

    it('resolves relative directories against the workspace root (parent of config/)', () => {
      writeSplitFile('settings.yaml', 'data:\n  directory: ./my-data\nspec:\n  directory: ./my-specs');

      const config = configLoader.load();
      expect(config.settings.data?.directory).toBe(path.resolve(testDir, 'my-data'));
      expect(config.settings.spec.directory).toBe(path.resolve(testDir, 'my-specs'));
      expect(config.configDir).toBe(testDir);
    });
  });

  describe('legacy file refusal (ADR-071)', () => {
    it('refuses a discovered specs.config.yaml with a pointer to specs migrate config', () => {
      writeLegacyFile('config:\n  processing:\n    variantDepth: 2');

      expect(() => configLoader.load()).toThrow(/specs\.config\.yaml is no longer read \(ADR-071\)/);
      expect(() => configLoader.load()).toThrow(/specs migrate config/);
      expect(() => configLoader.load()).toThrow(/config\/conventions\.yaml, config\/settings\.yaml and config\/pipeline\.yaml/);
      expect(() => configLoader.load()).toThrow(/https:\/\/specs\.directededges\.com\/settings\//);
    });

    it('refuses a discovered specs.config.json', () => {
      writeLegacyFile(
        JSON.stringify({ config: { processing: { variantDepth: 3 } } }),
        'specs.config.json'
      );

      expect(() => configLoader.load()).toThrow(/specs\.config\.json is no longer read \(ADR-071\)/);
    });

    it('refuses a discovered ~/.specs/config.yaml', () => {
      const home = path.join(testDir, 'home');
      fs.ensureDirSync(path.join(home, '.specs'));
      fs.writeFileSync(path.join(home, '.specs', 'config.yaml'), 'author: Home Author');
      process.env.HOME = home;

      expect(() => configLoader.load()).toThrow(/config\.yaml is no longer read \(ADR-071\)/);
    });

    it('names a working remedy for a file discovery would not find', () => {
      const customPath = path.join(testDir, 'custom-config.yaml');
      fs.writeFileSync(customPath, 'config:\n  processing:\n    variantDepth: 2');

      // `specs migrate config` alone would report "nothing to migrate" here, so
      // the refusal has to name the source explicitly.
      expect(() => configLoader.load(customPath)).toThrow(
        /specs migrate config --source custom-config\.yaml/
      );
    });

    it('refuses an explicit --config path pointing at a legacy file', () => {
      const customPath = path.join(testDir, 'custom-config.yaml');
      fs.writeFileSync(customPath, 'config:\n  processing:\n    variantDepth: 2');

      expect(() => configLoader.load(customPath)).toThrow(/custom-config\.yaml is no longer read \(ADR-071\)/);
    });

    it('is a hard stop — never falls back to defaults', () => {
      const error = vi.mocked(console.error);
      writeLegacyFile('config:\n  processing:\n    variantDepth: 2');

      expect(() => configLoader.load()).toThrow();
      // The refusal throws before the try/catch that degrades load failures
      // into defaults, so the fallback path must never run.
      expect(error).not.toHaveBeenCalledWith('Falling back to default configuration');
    });
  });

  describe('defaults (no configuration found)', () => {
    it('returns defaults when no config exists', () => {
      const config = configLoader.load();
      const { directory, ...spec } = config.settings.spec;
      expect(spec).toEqual(DEFAULT_SETTINGS.spec);
      expect(directory).toBeTruthy();
      expect(config.conventions).toEqual({
        figma: { naming: 'NONE', slotConstraints: false, inferNumberProps: false },
      });
      expect(config.pipeline).toEqual({ transformers: [], analyses: [] });
    });

    it('returns defaults when an explicit path does not exist', () => {
      const nonExistentPath = path.join(testDir, 'does-not-exist.yaml');
      const config = configLoader.load(nonExistentPath);
      const { directory, ...spec } = config.settings.spec;
      expect(spec).toEqual(DEFAULT_SETTINGS.spec);
    });
  });

  describe('settings validation (config/settings.yaml)', () => {
    it('should validate variantDepth and use default for invalid values', () => {
      writeSplitFile('settings.yaml', 'spec:\n  variantDepth: 999'); // Invalid

      const config = configLoader.load();
      expect(config.settings.spec.variantDepth).toBe(9999); // Default
    });

    it('should validate details and use default for invalid values', () => {
      writeSplitFile('settings.yaml', 'spec:\n  details: INVALID');

      const config = configLoader.load();
      expect(config.settings.spec.details).toBe('LAYERED'); // Default
    });

    it('should validate spec.keys and use default for invalid values', () => {
      writeSplitFile('settings.yaml', 'spec:\n  keys: INVALID');

      const config = configLoader.load();
      expect(config.settings.spec.keys).toBe('SAFE'); // Default
    });

    it('should validate spec.format and use default for invalid values', () => {
      writeSplitFile('settings.yaml', 'spec:\n  format: XML');

      const config = configLoader.load();
      expect(config.settings.spec.format).toBe('JSON'); // Default
    });

    it('should validate spec.layout and use default for invalid values', () => {
      writeSplitFile('settings.yaml', 'spec:\n  layout: INVALID');

      const config = configLoader.load();
      expect(config.settings.spec.layout).toBe('LAYOUT'); // Default
    });

    it('should validate spec.tokens and use default for invalid values', () => {
      writeSplitFile('settings.yaml', 'spec:\n  tokens: INVALID');

      const config = configLoader.load();
      expect(config.settings.spec.tokens).toBe('TOKEN'); // Default
    });

    it('should accept all valid spec.tokens values', () => {
      const validValues = ['TOKEN', 'TOKEN_NAME', 'TOKEN_FIGMA_EXTENSIONS', 'FIGMA_NAME', 'CUSTOM', 'FIGMA_SYNTAX_WEB', 'FIGMA_SYNTAX_IOS', 'FIGMA_SYNTAX_ANDROID'];

      validValues.forEach(value => {
        writeSplitFile('settings.yaml', `spec:\n  tokens: ${value}`);

        const config = configLoader.load();
        expect(config.settings.spec.tokens).toBe(value);
      });
    });

    it('should normalize lowercase spec.tokens to uppercase', () => {
      writeSplitFile('settings.yaml', 'spec:\n  tokens: figma_syntax_ios');

      const config = configLoader.load();
      expect(config.settings.spec.tokens).toBe('FIGMA_SYNTAX_IOS');
    });

    it('should validate spec.color and use default for invalid values', () => {
      writeSplitFile('settings.yaml', 'spec:\n  color: INVALID');

      const config = configLoader.load();
      expect(config.settings.spec.color).toBe('HEX'); // Default
    });

    it('should accept all valid spec.color values', () => {
      const validValues = ['HEX', 'HEXA', 'RGB', 'RGBA', 'HSLA', 'HSB', 'OKLCH', 'OKLAB', 'OBJECT'];

      validValues.forEach(value => {
        writeSplitFile('settings.yaml', `spec:\n  color: ${value}`);

        const config = configLoader.load();
        expect(config.settings.spec.color).toBe(value);
      });
    });

    it('should normalize lowercase spec.color to uppercase', () => {
      writeSplitFile('settings.yaml', 'spec:\n  color: oklch');

      const config = configLoader.load();
      expect(config.settings.spec.color).toBe('OKLCH');
    });

    it('should accept all valid variantDepth values', () => {
      const validValues = [1, 2, 3, 9999];

      validValues.forEach(value => {
        writeSplitFile('settings.yaml', `spec:\n  variantDepth: ${value}`);

        const config = configLoader.load();
        expect(config.settings.spec.variantDepth).toBe(value);
      });
    });

    it('should accept all valid spec.keys values', () => {
      const validValues = ['SAFE', 'CAMEL', 'SNAKE', 'KEBAB', 'PASCAL', 'TRAIN'];

      validValues.forEach(value => {
        writeSplitFile('settings.yaml', `spec:\n  keys: ${value}`);

        const config = configLoader.load();
        expect(config.settings.spec.keys).toBe(value);
      });
    });

    it('should default the split layout on when settings.yaml omits the flags', () => {
      writeSplitFile('settings.yaml', 'spec:\n  format: YAML');

      const config = configLoader.load();
      expect(config.settings.spec.splitComponents).toBe(true);
      expect(config.settings.spec.splitConcerns).toBe(true);
      expect(config.settings.spec.useSubfolders).toBe(true);
    });

    it('should let settings.yaml turn the split layout off', () => {
      writeSplitFile(
        'settings.yaml',
        'spec:\n  splitComponents: false\n  splitConcerns: false\n  useSubfolders: false'
      );

      const config = configLoader.load();
      expect(config.settings.spec.splitComponents).toBe(false);
      expect(config.settings.spec.splitConcerns).toBe(false);
      expect(config.settings.spec.useSubfolders).toBe(false);
    });

    it('should validate split flags: a non-boolean warns and falls back to the default', () => {
      const warn = vi.mocked(console.warn);
      writeSplitFile('settings.yaml', 'spec:\n  splitComponents: "yes"');

      const config = configLoader.load();
      expect(config.settings.spec.splitComponents).toBe(true);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid settings.spec.splitComponents')
      );
    });
  });

  describe('spec.defaultSlotContent validation', () => {
    it('preserves a valid boolean (true)', () => {
      writeSplitFile('settings.yaml', 'spec:\n  defaultSlotContent: true');

      const config = configLoader.load();
      expect(config.settings.spec.defaultSlotContent).toBe(true);
    });

    it('preserves a valid boolean (false)', () => {
      writeSplitFile('settings.yaml', 'spec:\n  defaultSlotContent: false');

      const config = configLoader.load();
      expect(config.settings.spec.defaultSlotContent).toBe(false);
    });

    // defaultSlotContent activates only on a literal boolean `true`; any other
    // value is coerced to false (ConfigLoader.ts resolveSettings).
    it('coerces a non-boolean defaultSlotContent value to false', () => {
      writeSplitFile('settings.json', JSON.stringify({ spec: { defaultSlotContent: 'yes' } }));

      const config = configLoader.load();
      expect(config.settings.spec.defaultSlotContent).toBe(false);
    });

    it('coerces a truthy-but-not-true value (e.g. 1) to false', () => {
      writeSplitFile('settings.json', JSON.stringify({ spec: { defaultSlotContent: 1 } }));

      const config = configLoader.load();
      expect(config.settings.spec.defaultSlotContent).toBe(false);
    });
  });

  describe('conventions validation (config/conventions.yaml)', () => {
    it('should preserve a valid glyphs.match', () => {
      writeSplitFile('conventions.yaml', 'figma:\n  glyphs:\n    match: "DS Icon Glyph /"');

      const config = configLoader.load();
      expect(config.conventions.figma.glyphs).toEqual({ match: 'DS Icon Glyph /' });
    });

    it('should strip an invalid glyphs.match (non-string)', () => {
      writeSplitFile('conventions.yaml', 'figma:\n  glyphs:\n    match: 123');

      const config = configLoader.load();
      expect(config.conventions.figma.glyphs).toBeUndefined();
    });

    it('should strip an empty glyphs.match', () => {
      writeSplitFile('conventions.yaml', "figma:\n  glyphs:\n    match: '  '");

      const config = configLoader.load();
      expect(config.conventions.figma.glyphs).toBeUndefined();
    });

    it('should default subcomponents.scope to NESTED when a valid match is given', () => {
      writeSplitFile('conventions.yaml', `
figma:
  subcomponents:
    match:
      - "{C} / {S}"
`);

      const config = configLoader.load();
      expect(config.conventions.figma.subcomponents).toEqual({ scope: 'NESTED', match: ['{C} / {S}'] });
    });

    it('should remove subcomponents (and warn) when match is empty', () => {
      const warn = vi.mocked(console.warn);
      writeSplitFile('conventions.json', JSON.stringify({ figma: { subcomponents: { match: [] } } }));

      const config = configLoader.load();
      expect(config.conventions.figma.subcomponents).toBeUndefined();
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid conventions.figma.subcomponents.match')
      );
    });
  });

  describe('conventions.figma.instanceExamples validation (ADR-050)', () => {
    it('defaults an invalid scope to PAGE while keeping a valid match', () => {
      writeSplitFile('conventions.yaml', `
figma:
  instanceExamples:
    scope: SIDEWAYS
    match:
      - "{C} / Examples / {S}"
`);

      const config = configLoader.load();
      expect(config.conventions.figma.instanceExamples).toEqual({
        scope: 'PAGE',
        match: ['{C} / Examples / {S}'],
      });
    });

    it('preserves a valid scope (FILE)', () => {
      writeSplitFile('conventions.yaml', `
figma:
  instanceExamples:
    scope: FILE
    match:
      - "{C} / Examples / {S}"
`);

      const config = configLoader.load();
      expect(config.conventions.figma.instanceExamples?.scope).toBe('FILE');
    });

    it('keeps the block when match is omitted (match is optional — ADR-050)', () => {
      const warn = vi.mocked(console.warn);
      writeSplitFile('conventions.yaml', `
figma:
  instanceExamples:
    scope: PAGE
    parentNames:
      - Ready-made examples
`);

      const config = configLoader.load();
      // Presence of the block is the on-switch; no match means every in-scope
      // instance qualifies, narrowed here by parentNames.
      expect(config.conventions.figma.instanceExamples).toEqual({
        scope: 'PAGE',
        parentNames: ['Ready-made examples'],
      });
      expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('Invalid'));
    });

    it('keeps the block but ignores match (and warns) when match is an empty array', () => {
      const warn = vi.mocked(console.warn);
      writeSplitFile('conventions.json', JSON.stringify({
        figma: { instanceExamples: { scope: 'PAGE', match: [] } },
      }));

      const config = configLoader.load();
      const ie = config.conventions.figma.instanceExamples as Record<string, unknown>;
      expect(ie).toEqual({ scope: 'PAGE' });
      expect(ie).not.toHaveProperty('match');
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid conventions.figma.instanceExamples.match')
      );
    });

    it('strips a non-array exclude while keeping the rest of the block', () => {
      writeSplitFile('conventions.json', JSON.stringify({
        figma: {
          instanceExamples: { match: ['{C} / Examples / {S}'], exclude: 'nope' },
        },
      }));

      const config = configLoader.load();
      const ie = config.conventions.figma.instanceExamples as Record<string, unknown>;
      expect(ie.match).toEqual(['{C} / Examples / {S}']);
      expect(ie.exclude).toBeUndefined();
    });

    it('strips a non-array parentNames while keeping the rest of the block', () => {
      writeSplitFile('conventions.json', JSON.stringify({
        figma: {
          instanceExamples: { match: ['{C} / Examples / {S}'], parentNames: 123 },
        },
      }));

      const config = configLoader.load();
      const ie = config.conventions.figma.instanceExamples as Record<string, unknown>;
      expect(ie.match).toEqual(['{C} / Examples / {S}']);
      expect(ie.parentNames).toBeUndefined();
    });

    it('passes a fully valid block through unchanged', () => {
      const block = {
        scope: 'PAGE',
        match: ['{C} / Examples / {S}'],
        exclude: ['{C} / Examples / Internal / {S}'],
        parentNames: ['Examples'],
      };
      writeSplitFile('conventions.json', JSON.stringify({
        figma: { instanceExamples: block },
      }));

      const config = configLoader.load();
      expect(config.conventions.figma.instanceExamples).toEqual(block);
    });
  });

  describe('conventions.figma.images validation (ADR-063)', () => {
    it('resolves a full block: backgroundImage, trimmed match, trimmed sourceProps', () => {
      writeSplitFile('conventions.json', JSON.stringify({
        figma: { images: { backgroundImage: true, match: ' DS Image ', sourceProps: [' imageSource ', 'src'] } },
      }));

      const config = configLoader.load();
      expect(config.conventions.figma.images).toEqual({
        backgroundImage: true,
        match: 'DS Image',
        sourceProps: ['imageSource', 'src'],
      });
    });

    it('fills-only: backgroundImage alone resolves with defaults', () => {
      writeSplitFile('conventions.yaml', 'figma:\n  images:\n    backgroundImage: true');

      const config = configLoader.load();
      expect(config.conventions.figma.images).toEqual({ backgroundImage: true, sourceProps: [] });
    });

    it('sourceProps-only: re-typing without fills or component', () => {
      writeSplitFile('conventions.json', JSON.stringify({
        figma: { images: { sourceProps: ['Image'] } },
      }));

      const config = configLoader.load();
      expect(config.conventions.figma.images).toEqual({ backgroundImage: false, sourceProps: ['Image'] });
    });

    it('match without sourceProps is dropped (needs a forwarding target)', () => {
      writeSplitFile('conventions.json', JSON.stringify({
        figma: { images: { backgroundImage: true, match: 'DS Image' } },
      }));

      const config = configLoader.load();
      expect(config.conventions.figma.images).toEqual({ backgroundImage: true, sourceProps: [] });
      expect(config.conventions.figma.images).not.toHaveProperty('match');
    });

    it('coerces a non-boolean backgroundImage to false', () => {
      writeSplitFile('conventions.json', JSON.stringify({
        figma: { images: { backgroundImage: 'yes' } },
      }));

      const config = configLoader.load();
      expect(config.conventions.figma.images?.backgroundImage).toBe(false);
    });

    it('is absent by default (presence is the on-switch)', () => {
      writeSplitFile('conventions.yaml', 'figma:\n  naming: NONE');

      const config = configLoader.load();
      expect(config.conventions.figma.images).toBeUndefined();
    });
  });

  describe('Merging with defaults', () => {
    it('should merge partial settings with defaults', () => {
      writeSplitFile('settings.yaml', 'spec:\n  variantDepth: 2');

      const config = configLoader.load();

      // Overridden value
      expect(config.settings.spec.variantDepth).toBe(2);

      // Default values preserved
      expect(config.settings.spec.details).toBe(DEFAULT_SETTINGS.spec.details);
      expect(config.settings.spec.keys).toBe(DEFAULT_SETTINGS.spec.keys);
      // No subcomponents convention declared — no default can supply one
      expect(config.conventions.figma.subcomponents).toBeUndefined();
    });
  });
});
