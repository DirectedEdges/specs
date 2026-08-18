/**
 * ConfigLoader unit tests
 *
 * Covers both configuration sources (ADR-071):
 * - the split `config/` directory (conventions.yaml, settings.yaml, pipeline.yaml)
 * - the legacy single-file `specs.config.yaml`/`.json`, which still loads via
 *   in-memory migration with a one-time deprecation warning
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
    // Silence the legacy-file deprecation warning by default; individual tests
    // spy on console.warn where the warning itself is under test.
    vi.spyOn(console, 'warn').mockImplementation(() => {});
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

    it('prefers config/ over a legacy specs.config.yaml and does not warn', () => {
      const warn = vi.mocked(console.warn);
      writeSplitFile('settings.yaml', 'spec:\n  variantDepth: 2');
      fs.writeFileSync(
        path.join(testDir, 'specs.config.yaml'),
        'config:\n  processing:\n    variantDepth: 1'
      );

      const config = configLoader.load();
      expect(config.settings.spec.variantDepth).toBe(2); // config/ wins
      expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('deprecated'));
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

    it('validates settings from a split file the same as legacy (invalid enum falls back)', () => {
      writeSplitFile('settings.yaml', 'spec:\n  keys: INVALID\n  variantDepth: 999');

      const config = configLoader.load();
      expect(config.settings.spec.keys).toBe('SAFE');
      expect(config.settings.spec.variantDepth).toBe(9999);
    });
  });

  describe('Config file discovery (findConfigSource)', () => {
    it('should find specs.config.yaml in current directory', () => {
      const configPath = path.join(testDir, 'specs.config.yaml');
      fs.writeFileSync(configPath, 'config:\n  processing:\n    variantDepth: 2');

      const config = configLoader.load();
      expect(config.settings.spec.variantDepth).toBe(2);
    });

    it('should find specs.config.json in current directory', () => {
      const configPath = path.join(testDir, 'specs.config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        config: { processing: { variantDepth: 3 } }
      }));

      const config = configLoader.load();
      expect(config.settings.spec.variantDepth).toBe(3);
    });

    it('should prefer specs.config.yaml over .json', () => {
      const yamlPath = path.join(testDir, 'specs.config.yaml');
      const jsonPath = path.join(testDir, 'specs.config.json');

      fs.writeFileSync(yamlPath, 'config:\n  processing:\n    variantDepth: 1');
      fs.writeFileSync(jsonPath, JSON.stringify({
        config: { processing: { variantDepth: 2 } }
      }));

      const config = configLoader.load();
      expect(config.settings.spec.variantDepth).toBe(1); // YAML wins
    });

    it('should return defaults when no config file exists', () => {
      const config = configLoader.load();
      const { directory, ...spec } = config.settings.spec;
      expect(spec).toEqual(DEFAULT_SETTINGS.spec);
      expect(directory).toBeTruthy();
      expect(config.conventions).toEqual({
        figma: { naming: 'NONE', slotConstraints: false, inferNumberProps: false },
      });
      expect(config.pipeline).toEqual({ transformers: [], analyses: [] });
    });

    it('should use explicit config path when provided', () => {
      const customPath = path.join(testDir, 'custom-config.yaml');
      fs.writeFileSync(customPath, 'config:\n  processing:\n    variantDepth: 2');

      const config = configLoader.load(customPath);
      expect(config.settings.spec.variantDepth).toBe(2);
    });

    it('should return defaults when explicit path does not exist', () => {
      const nonExistentPath = path.join(testDir, 'does-not-exist.yaml');
      const config = configLoader.load(nonExistentPath);
      const { directory, ...spec } = config.settings.spec;
      expect(spec).toEqual(DEFAULT_SETTINGS.spec);
    });
  });

  describe('Legacy migration (deprecation)', () => {
    it('warns once that the single-file format is deprecated', () => {
      const warn = vi.mocked(console.warn);
      fs.writeFileSync(
        path.join(testDir, 'specs.config.yaml'),
        'config:\n  processing:\n    variantDepth: 2'
      );

      configLoader.load();
      const deprecations = warn.mock.calls.filter(
        (args: unknown[]) => typeof args[0] === 'string' && (args[0] as string).includes('deprecated')
      );
      expect(deprecations).toHaveLength(1);
    });

    it('migrates top-level members: dataDirectory, outputDirectory, author', () => {
      fs.writeFileSync(path.join(testDir, 'specs.config.yaml'), `
dataDirectory: ./data-in
outputDirectory: ./specs-out
author: Test Author
`);

      const config = configLoader.load();
      expect(config.settings.data?.directory).toBe(path.resolve(testDir, 'data-in'));
      expect(config.settings.spec.directory).toBe(path.resolve(testDir, 'specs-out'));
      expect(config.settings.author).toBe('Test Author');
      expect(config.configDir).toBe(testDir);
    });

    it('migrates sources, renaming each source\'s data array to fetch', () => {
      fs.writeFileSync(path.join(testDir, 'specs.config.yaml'), `
sources:
  library:
    key: ABC123
    data: [file, variables, styles]
  icons:
    key: DEF456
`);

      const config = configLoader.load();
      expect(config.settings.data?.sources).toEqual({
        library: { key: 'ABC123', fetch: ['file', 'variables', 'styles'] },
        icons: { key: 'DEF456' },
      });
    });

    it('migrates output split flags into settings.spec', () => {
      fs.writeFileSync(path.join(testDir, 'specs.config.yaml'), `
output:
  splitComponents: true
  splitConcerns: true
  useSubfolders: true
`);

      const config = configLoader.load();
      expect(config.settings.spec.splitComponents).toBe(true);
      expect(config.settings.spec.splitConcerns).toBe(true);
      expect(config.settings.spec.useSubfolders).toBe(true);
    });

    it('supports deprecated sourceDirectory as dataDirectory', () => {
      fs.writeFileSync(path.join(testDir, 'specs.config.yaml'), 'sourceDirectory: ./old-data');

      const config = configLoader.load();
      expect(config.settings.data?.directory).toBe(path.resolve(testDir, 'old-data'));
    });

    it('migrates config.format.figmaKeys into conventions.figma.naming', () => {
      fs.writeFileSync(
        path.join(testDir, 'specs.config.yaml'),
        'config:\n  format:\n    figmaKeys: SENTENCE'
      );

      const config = configLoader.load();
      expect(config.conventions.figma.naming).toBe('SENTENCE');
    });

    it('migrates config.transformers into pipeline.transformers', () => {
      fs.writeFileSync(path.join(testDir, 'specs.config.yaml'), `
config:
  transformers:
    - name: contract
    - name: css
      rules: [layout]
`);

      const config = configLoader.load();
      expect(config.pipeline.transformers).toEqual([
        { name: 'contract' },
        { name: 'css', rules: ['layout'] },
      ]);
      expect(config.pipeline.analyses).toEqual([]);
    });
  });

  describe('YAML parsing', () => {
    it('should parse valid YAML config', () => {
      const configPath = path.join(testDir, 'specs.config.yaml');
      const yamlContent = `
config:
  processing:
    variantDepth: 2
    details: FULL
  format:
    keys: CAMEL
`;
      fs.writeFileSync(configPath, yamlContent);

      const config = configLoader.load();
      expect(config.settings.spec.variantDepth).toBe(2);
      expect(config.settings.spec.details).toBe('FULL');
      expect(config.settings.spec.keys).toBe('CAMEL');
    });

    it('should handle complex YAML config', () => {
      const configPath = path.join(testDir, 'specs.config.yaml');
      const yamlContent = `
config:
  processing:
    subcomponents:
      match:
        - "{C} / {S}"
    variantDepth: 3
    details: FULL
  format:
    output: YAML
    keys: SNAKE
    layout: BOTH
    tokens: TOKEN_NAME
  include:
    invalidVariants: false
    invalidCombinations: false
sources:
  library:
    key: ABC123
    data: [variables, styles]
`;
      fs.writeFileSync(configPath, yamlContent);

      const config = configLoader.load();
      expect(config.conventions.figma.subcomponents).toEqual({ scope: 'NESTED', match: ['{C} / {S}'] });
      expect(config.settings.spec.variantDepth).toBe(3);
      expect(config.settings.spec.format).toBe('YAML');
      expect(config.settings.spec.keys).toBe('SNAKE');
      expect(config.settings.spec.invalidVariants).toBe(false);
      expect(config.settings.spec.invalidCombinations).toBe(false);
      expect(config.settings.data?.sources).toEqual({
        library: { key: 'ABC123', fetch: ['variables', 'styles'] },
      });
    });
  });

  describe('JSON parsing', () => {
    it('should parse valid JSON config', () => {
      const configPath = path.join(testDir, 'specs.config.json');
      const jsonContent = {
        config: {
          processing: {
            variantDepth: 1,
            details: 'LAYERED'
          },
          format: {
            keys: 'KEBAB'
          }
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(jsonContent, null, 2));

      const config = configLoader.load();
      expect(config.settings.spec.variantDepth).toBe(1);
      expect(config.settings.spec.details).toBe('LAYERED');
      expect(config.settings.spec.keys).toBe('KEBAB');
    });
  });

  describe('Config validation', () => {
    it('should validate variantDepth and use default for invalid values', () => {
      const configPath = path.join(testDir, 'specs.config.yaml');
      fs.writeFileSync(configPath, 'config:\n  processing:\n    variantDepth: 999'); // Invalid

      const config = configLoader.load();
      expect(config.settings.spec.variantDepth).toBe(9999); // Default
    });

    it('should validate details and use default for invalid values', () => {
      const configPath = path.join(testDir, 'specs.config.yaml');
      fs.writeFileSync(configPath, 'config:\n  processing:\n    details: INVALID');

      const config = configLoader.load();
      expect(config.settings.spec.details).toBe('LAYERED'); // Default
    });

    it('should validate spec.keys and use default for invalid values', () => {
      const configPath = path.join(testDir, 'specs.config.yaml');
      fs.writeFileSync(configPath, 'config:\n  format:\n    keys: INVALID');

      const config = configLoader.load();
      expect(config.settings.spec.keys).toBe('SAFE'); // Default
    });

    it('should validate spec.format and use default for invalid values', () => {
      const configPath = path.join(testDir, 'specs.config.yaml');
      fs.writeFileSync(configPath, 'config:\n  format:\n    output: XML');

      const config = configLoader.load();
      expect(config.settings.spec.format).toBe('JSON'); // Default
    });

    it('should validate spec.layout and use default for invalid values', () => {
      const configPath = path.join(testDir, 'specs.config.yaml');
      fs.writeFileSync(configPath, 'config:\n  format:\n    layout: INVALID');

      const config = configLoader.load();
      expect(config.settings.spec.layout).toBe('LAYOUT'); // Default
    });

    it('should validate spec.tokens and use default for invalid values', () => {
      const configPath = path.join(testDir, 'specs.config.yaml');
      fs.writeFileSync(configPath, 'config:\n  format:\n    tokens: INVALID');

      const config = configLoader.load();
      expect(config.settings.spec.tokens).toBe('TOKEN'); // Default
    });

    it('should accept all valid spec.tokens values', () => {
      const validValues = ['TOKEN', 'TOKEN_NAME', 'TOKEN_FIGMA_EXTENSIONS', 'FIGMA_NAME', 'CUSTOM', 'FIGMA_SYNTAX_WEB', 'FIGMA_SYNTAX_IOS', 'FIGMA_SYNTAX_ANDROID'];

      validValues.forEach(value => {
        const configPath = path.join(testDir, 'specs.config.yaml');
        fs.writeFileSync(configPath, `config:\n  format:\n    tokens: ${value}`);

        const config = configLoader.load();
        expect(config.settings.spec.tokens).toBe(value);
      });
    });

    it('should normalize lowercase spec.tokens to uppercase', () => {
      const configPath = path.join(testDir, 'specs.config.yaml');
      fs.writeFileSync(configPath, 'config:\n  format:\n    tokens: figma_syntax_ios');

      const config = configLoader.load();
      expect(config.settings.spec.tokens).toBe('FIGMA_SYNTAX_IOS');
    });

    it('should validate spec.color and use default for invalid values', () => {
      const configPath = path.join(testDir, 'specs.config.yaml');
      fs.writeFileSync(configPath, 'config:\n  format:\n    color: INVALID');

      const config = configLoader.load();
      expect(config.settings.spec.color).toBe('HEX'); // Default
    });

    it('should accept all valid spec.color values', () => {
      const validValues = ['HEX', 'HEXA', 'RGB', 'RGBA', 'HSLA', 'HSB', 'OKLCH', 'OKLAB', 'OBJECT'];

      validValues.forEach(value => {
        const configPath = path.join(testDir, 'specs.config.yaml');
        fs.writeFileSync(configPath, `config:\n  format:\n    color: ${value}`);

        const config = configLoader.load();
        expect(config.settings.spec.color).toBe(value);
      });
    });

    it('should normalize lowercase spec.color to uppercase', () => {
      const configPath = path.join(testDir, 'specs.config.yaml');
      fs.writeFileSync(configPath, 'config:\n  format:\n    color: oklch');

      const config = configLoader.load();
      expect(config.settings.spec.color).toBe('OKLCH');
    });

    it('should preserve valid glyphNamePattern as conventions.figma.glyphs.match', () => {
      const configPath = path.join(testDir, 'specs.config.yaml');
      fs.writeFileSync(configPath, 'config:\n  processing:\n    glyphNamePattern: "DS Icon Glyph /"');

      const config = configLoader.load();
      expect(config.conventions.figma.glyphs).toEqual({ match: 'DS Icon Glyph /' });
    });

    it('should strip invalid glyphNamePattern (non-string)', () => {
      const configPath = path.join(testDir, 'specs.config.yaml');
      fs.writeFileSync(configPath, 'config:\n  processing:\n    glyphNamePattern: 123');

      const config = configLoader.load();
      expect(config.conventions.figma.glyphs).toBeUndefined();
    });

    it('should strip empty glyphNamePattern', () => {
      const configPath = path.join(testDir, 'specs.config.yaml');
      fs.writeFileSync(configPath, "config:\n  processing:\n    glyphNamePattern: '  '");

      const config = configLoader.load();
      expect(config.conventions.figma.glyphs).toBeUndefined();
    });

    it('should accept all valid variantDepth values', () => {
      const validValues = [1, 2, 3, 9999];

      validValues.forEach(value => {
        const configPath = path.join(testDir, 'specs.config.yaml');
        fs.writeFileSync(configPath, `config:\n  processing:\n    variantDepth: ${value}`);

        const config = configLoader.load();
        expect(config.settings.spec.variantDepth).toBe(value);
      });
    });

    it('should accept all valid spec.keys values', () => {
      const validValues = ['SAFE', 'CAMEL', 'SNAKE', 'KEBAB', 'PASCAL', 'TRAIN'];

      validValues.forEach(value => {
        const configPath = path.join(testDir, 'specs.config.yaml');
        fs.writeFileSync(configPath, `config:\n  format:\n    keys: ${value}`);

        const config = configLoader.load();
        expect(config.settings.spec.keys).toBe(value);
      });
    });
  });

  describe('conventions.figma.instanceExamples validation (ADR-050)', () => {
    it('defaults an invalid scope to PAGE while keeping a valid match', () => {
      const configPath = path.join(testDir, 'specs.config.yaml');
      fs.writeFileSync(configPath, `
config:
  processing:
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
      const configPath = path.join(testDir, 'specs.config.yaml');
      fs.writeFileSync(configPath, `
config:
  processing:
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
      const configPath = path.join(testDir, 'specs.config.yaml');
      fs.writeFileSync(configPath, `
config:
  processing:
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
      const configPath = path.join(testDir, 'specs.config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        config: { processing: { instanceExamples: { scope: 'PAGE', match: [] } } },
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
      const configPath = path.join(testDir, 'specs.config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        config: {
          processing: {
            instanceExamples: { match: ['{C} / Examples / {S}'], exclude: 'nope' },
          },
        },
      }));

      const config = configLoader.load();
      const ie = config.conventions.figma.instanceExamples as Record<string, unknown>;
      expect(ie.match).toEqual(['{C} / Examples / {S}']);
      expect(ie.exclude).toBeUndefined();
    });

    it('strips a non-array parentNames while keeping the rest of the block', () => {
      const configPath = path.join(testDir, 'specs.config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        config: {
          processing: {
            instanceExamples: { match: ['{C} / Examples / {S}'], parentNames: 123 },
          },
        },
      }));

      const config = configLoader.load();
      const ie = config.conventions.figma.instanceExamples as Record<string, unknown>;
      expect(ie.match).toEqual(['{C} / Examples / {S}']);
      expect(ie.parentNames).toBeUndefined();
    });

    it('passes a fully valid block through unchanged', () => {
      const configPath = path.join(testDir, 'specs.config.json');
      const block = {
        scope: 'PAGE',
        match: ['{C} / Examples / {S}'],
        exclude: ['{C} / Examples / Internal / {S}'],
        parentNames: ['Examples'],
      };
      fs.writeFileSync(configPath, JSON.stringify({
        config: { processing: { instanceExamples: block } },
      }));

      const config = configLoader.load();
      expect(config.conventions.figma.instanceExamples).toEqual(block);
    });
  });

  describe('spec.defaultSlotContent validation', () => {
    it('preserves a valid boolean (true)', () => {
      const configPath = path.join(testDir, 'specs.config.yaml');
      fs.writeFileSync(configPath, 'config:\n  include:\n    defaultSlotContent: true');

      const config = configLoader.load();
      expect(config.settings.spec.defaultSlotContent).toBe(true);
    });

    it('preserves a valid boolean (false)', () => {
      const configPath = path.join(testDir, 'specs.config.yaml');
      fs.writeFileSync(configPath, 'config:\n  include:\n    defaultSlotContent: false');

      const config = configLoader.load();
      expect(config.settings.spec.defaultSlotContent).toBe(false);
    });

    it('keeps defaultSlotContent in the migrated include allowlist (does not strip the key)', () => {
      const configPath = path.join(testDir, 'specs.config.yaml');
      fs.writeFileSync(configPath, 'config:\n  include:\n    defaultSlotContent: true');

      const config = configLoader.load();
      expect(Object.keys(config.settings.spec)).toContain('defaultSlotContent');
    });

    it('strips an unknown include key (EOLed allowlist) but keeps defaultSlotContent', () => {
      const configPath = path.join(testDir, 'specs.config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        config: { include: { defaultSlotContent: true, instanceExamples: true } },
      }));

      const config = configLoader.load();
      const spec = config.settings.spec as Record<string, unknown>;
      // instanceExamples is not a valid include key — must not be migrated.
      expect(spec.instanceExamples).toBeUndefined();
      expect(config.conventions.figma.instanceExamples).toBeUndefined();
      expect(spec.defaultSlotContent).toBe(true);
    });

    // defaultSlotContent activates only on a literal boolean `true`; any other
    // value is coerced to false (ConfigLoader.ts resolveSettings).
    it('coerces a non-boolean defaultSlotContent value to false', () => {
      const configPath = path.join(testDir, 'specs.config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        config: { include: { defaultSlotContent: 'yes' } },
      }));

      const config = configLoader.load();
      expect(config.settings.spec.defaultSlotContent).toBe(false);
    });

    it('coerces a truthy-but-not-true value (e.g. 1) to false', () => {
      const configPath = path.join(testDir, 'specs.config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        config: { include: { defaultSlotContent: 1 } },
      }));

      const config = configLoader.load();
      expect(config.settings.spec.defaultSlotContent).toBe(false);
    });
  });

  describe('conventions.figma.images validation (ADR-063)', () => {
    it('resolves a full block: backgroundImage, trimmed match, trimmed sourceProps', () => {
      const configPath = path.join(testDir, 'specs.config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        config: { processing: { images: { backgroundImage: true, imageComponent: ' DS Image ', sourceProps: [' imageSource ', 'src'] } } },
      }));

      const config = configLoader.load();
      expect(config.conventions.figma.images).toEqual({
        backgroundImage: true,
        match: 'DS Image',
        sourceProps: ['imageSource', 'src'],
      });
    });

    it('fills-only: backgroundImage alone resolves with defaults', () => {
      const configPath = path.join(testDir, 'specs.config.yaml');
      fs.writeFileSync(configPath, 'config:\n  processing:\n    images:\n      backgroundImage: true');

      const config = configLoader.load();
      expect(config.conventions.figma.images).toEqual({ backgroundImage: true, sourceProps: [] });
    });

    it('sourceProps-only: re-typing without fills or component', () => {
      const configPath = path.join(testDir, 'specs.config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        config: { processing: { images: { sourceProps: ['Image'] } } },
      }));

      const config = configLoader.load();
      expect(config.conventions.figma.images).toEqual({ backgroundImage: false, sourceProps: ['Image'] });
    });

    it('imageComponent without sourceProps is dropped (needs a forwarding target)', () => {
      const configPath = path.join(testDir, 'specs.config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        config: { processing: { images: { backgroundImage: true, imageComponent: 'DS Image' } } },
      }));

      const config = configLoader.load();
      expect(config.conventions.figma.images).toEqual({ backgroundImage: true, sourceProps: [] });
      expect(config.conventions.figma.images).not.toHaveProperty('match');
    });

    it('coerces a non-boolean backgroundImage to false', () => {
      const configPath = path.join(testDir, 'specs.config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        config: { processing: { images: { backgroundImage: 'yes' } } },
      }));

      const config = configLoader.load();
      expect(config.conventions.figma.images?.backgroundImage).toBe(false);
    });

    it('is absent by default (presence is the on-switch)', () => {
      const configPath = path.join(testDir, 'specs.config.yaml');
      fs.writeFileSync(configPath, 'config:\n  processing:\n    variantDepth: 2');

      const config = configLoader.load();
      expect(config.conventions.figma.images).toBeUndefined();
    });

    it('strips the retired include.imageData key', () => {
      const configPath = path.join(testDir, 'specs.config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        config: { include: { imageData: true } },
      }));

      const config = configLoader.load();
      expect((config.settings.spec as Record<string, unknown>).imageData).toBeUndefined();
    });
  });

  describe('Merging with defaults', () => {
    it('should merge partial config with defaults', () => {
      const configPath = path.join(testDir, 'specs.config.yaml');
      fs.writeFileSync(configPath, 'config:\n  processing:\n    variantDepth: 2');

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
