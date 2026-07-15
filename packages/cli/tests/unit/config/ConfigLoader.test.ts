/**
 * ConfigLoader unit tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { ConfigLoader } from '../../../src/Config/ConfigLoader.js';
import { DEFAULT_CONFIG as DEFAULT_CONFIG } from '@directededges/specs-schema';

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

  describe('Config file discovery (findConfigFile)', () => {
    it('should find specs.config.yaml in current directory', () => {
      const configPath = path.join(testDir, 'specs.config.yaml');
      fs.writeFileSync(configPath, 'config:\n  processing:\n    variantDepth: 2');

      const config = configLoader.load();
      expect(config.config.processing.variantDepth).toBe(2);
    });

    it('should find specs.config.json in current directory', () => {
      const configPath = path.join(testDir, 'specs.config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        config: { processing: { variantDepth: 3 } }
      }));

      const config = configLoader.load();
      expect(config.config.processing.variantDepth).toBe(3);
    });

    it('should prefer specs.config.yaml over .json', () => {
      const yamlPath = path.join(testDir, 'specs.config.yaml');
      const jsonPath = path.join(testDir, 'specs.config.json');

      fs.writeFileSync(yamlPath, 'config:\n  processing:\n    variantDepth: 1');
      fs.writeFileSync(jsonPath, JSON.stringify({
        config: { processing: { variantDepth: 2 } }
      }));

      const config = configLoader.load();
      expect(config.config.processing.variantDepth).toBe(1); // YAML wins
    });

    it('should return defaults when no config file exists', () => {
      const config = configLoader.load();
      expect(config.config).toEqual(DEFAULT_CONFIG);
    });

    it('should use explicit config path when provided', () => {
      const customPath = path.join(testDir, 'custom-config.yaml');
      fs.writeFileSync(customPath, 'config:\n  processing:\n    variantDepth: 2');

      const config = configLoader.load(customPath);
      expect(config.config.processing.variantDepth).toBe(2);
    });

    it('should return defaults when explicit path does not exist', () => {
      const nonExistentPath = path.join(testDir, 'does-not-exist.yaml');
      const config = configLoader.load(nonExistentPath);
      expect(config.config).toEqual(DEFAULT_CONFIG);
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
      expect(config.config.processing.variantDepth).toBe(2);
      expect(config.config.processing.details).toBe('FULL');
      expect(config.config.format.keys).toBe('CAMEL');
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
  variables: ./variables.json
  styles: ./styles.json
`;
      fs.writeFileSync(configPath, yamlContent);

      const config = configLoader.load();
      expect(config.config.processing.subcomponents).toEqual({ match: ['{C} / {S}'] });
      expect(config.config.processing.variantDepth).toBe(3);
      expect(config.config.format.output).toBe('YAML');
      expect(config.config.format.keys).toBe('SNAKE');
      expect(config.sources).toEqual({
        variables: './variables.json',
        styles: './styles.json'
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
      expect(config.config.processing.variantDepth).toBe(1);
      expect(config.config.processing.details).toBe('LAYERED');
      expect(config.config.format.keys).toBe('KEBAB');
    });
  });

  describe('Config validation', () => {
    it('should validate variantDepth and use default for invalid values', () => {
      const configPath = path.join(testDir, 'specs.config.yaml');
      fs.writeFileSync(configPath, 'config:\n  processing:\n    variantDepth: 999'); // Invalid

      const config = configLoader.load();
      expect(config.config.processing.variantDepth).toBe(9999); // Default
    });

    it('should validate details and use default for invalid values', () => {
      const configPath = path.join(testDir, 'specs.config.yaml');
      fs.writeFileSync(configPath, 'config:\n  processing:\n    details: INVALID');

      const config = configLoader.load();
      expect(config.config.processing.details).toBe('LAYERED'); // Default
    });

    it('should validate format.keys and use default for invalid values', () => {
      const configPath = path.join(testDir, 'specs.config.yaml');
      fs.writeFileSync(configPath, 'config:\n  format:\n    keys: INVALID');

      const config = configLoader.load();
      expect(config.config.format.keys).toBe('SAFE'); // Default
    });

    it('should validate format.output and use default for invalid values', () => {
      const configPath = path.join(testDir, 'specs.config.yaml');
      fs.writeFileSync(configPath, 'config:\n  format:\n    output: XML');

      const config = configLoader.load();
      expect(config.config.format.output).toBe('JSON'); // Default
    });

    it('should validate format.layout and use default for invalid values', () => {
      const configPath = path.join(testDir, 'specs.config.yaml');
      fs.writeFileSync(configPath, 'config:\n  format:\n    layout: INVALID');

      const config = configLoader.load();
      expect(config.config.format.layout).toBe('LAYOUT'); // Default
    });

    it('should validate format.tokens and use default for invalid values', () => {
      const configPath = path.join(testDir, 'specs.config.yaml');
      fs.writeFileSync(configPath, 'config:\n  format:\n    tokens: INVALID');

      const config = configLoader.load();
      expect(config.config.format.tokens).toBe('TOKEN'); // Default
    });

    it('should accept all valid format.tokens values', () => {
      const validValues = ['TOKEN', 'TOKEN_NAME', 'TOKEN_FIGMA_EXTENSIONS', 'FIGMA_NAME', 'CUSTOM', 'FIGMA_SYNTAX_WEB', 'FIGMA_SYNTAX_IOS', 'FIGMA_SYNTAX_ANDROID'];

      validValues.forEach(value => {
        const configPath = path.join(testDir, 'specs.config.yaml');
        fs.writeFileSync(configPath, `config:\n  format:\n    tokens: ${value}`);

        const config = configLoader.load();
        expect(config.config.format.tokens).toBe(value);
      });
    });

    it('should normalize lowercase format.tokens to uppercase', () => {
      const configPath = path.join(testDir, 'specs.config.yaml');
      fs.writeFileSync(configPath, 'config:\n  format:\n    tokens: figma_syntax_ios');

      const config = configLoader.load();
      expect(config.config.format.tokens).toBe('FIGMA_SYNTAX_IOS');
    });

    it('should validate format.color and use default for invalid values', () => {
      const configPath = path.join(testDir, 'specs.config.yaml');
      fs.writeFileSync(configPath, 'config:\n  format:\n    color: INVALID');

      const config = configLoader.load();
      expect(config.config.format.color).toBe('HEX'); // Default
    });

    it('should accept all valid format.color values', () => {
      const validValues = ['HEX', 'HEXA', 'RGB', 'RGBA', 'HSLA', 'HSB', 'OKLCH', 'OKLAB', 'OBJECT'];

      validValues.forEach(value => {
        const configPath = path.join(testDir, 'specs.config.yaml');
        fs.writeFileSync(configPath, `config:\n  format:\n    color: ${value}`);

        const config = configLoader.load();
        expect(config.config.format.color).toBe(value);
      });
    });

    it('should normalize lowercase format.color to uppercase', () => {
      const configPath = path.join(testDir, 'specs.config.yaml');
      fs.writeFileSync(configPath, 'config:\n  format:\n    color: oklch');

      const config = configLoader.load();
      expect(config.config.format.color).toBe('OKLCH');
    });

    it('should preserve valid glyphNamePattern string', () => {
      const configPath = path.join(testDir, 'specs.config.yaml');
      fs.writeFileSync(configPath, 'config:\n  processing:\n    glyphNamePattern: "DS Icon Glyph /"');

      const config = configLoader.load();
      expect(config.config.processing.glyphNamePattern).toBe('DS Icon Glyph /');
    });

    it('should strip invalid glyphNamePattern (non-string)', () => {
      const configPath = path.join(testDir, 'specs.config.yaml');
      fs.writeFileSync(configPath, 'config:\n  processing:\n    glyphNamePattern: 123');

      const config = configLoader.load();
      expect(config.config.processing.glyphNamePattern).toBeUndefined();
    });

    it('should strip empty glyphNamePattern', () => {
      const configPath = path.join(testDir, 'specs.config.yaml');
      fs.writeFileSync(configPath, "config:\n  processing:\n    glyphNamePattern: '  '");

      const config = configLoader.load();
      expect(config.config.processing.glyphNamePattern).toBeUndefined();
    });

    it('should accept all valid variantDepth values', () => {
      const validValues = [1, 2, 3, 9999];

      validValues.forEach(value => {
        const configPath = path.join(testDir, 'specs.config.yaml');
        fs.writeFileSync(configPath, `config:\n  processing:\n    variantDepth: ${value}`);

        const config = configLoader.load();
        expect(config.config.processing.variantDepth).toBe(value);
      });
    });

    it('should accept all valid format.keys values', () => {
      const validValues = ['SAFE', 'CAMEL', 'SNAKE', 'KEBAB', 'PASCAL', 'TRAIN'];

      validValues.forEach(value => {
        const configPath = path.join(testDir, 'specs.config.yaml');
        fs.writeFileSync(configPath, `config:\n  format:\n    keys: ${value}`);

        const config = configLoader.load();
        expect(config.config.format.keys).toBe(value);
      });
    });
  });

  describe('processing.instanceExamples validation (ADR-050)', () => {
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
      expect(config.config.processing.instanceExamples).toEqual({
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
      expect(config.config.processing.instanceExamples?.scope).toBe('FILE');
    });

    it('keeps the block when match is omitted (match is optional — ADR-050)', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
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
      expect(config.config.processing.instanceExamples).toEqual({
        scope: 'PAGE',
        parentNames: ['Ready-made examples'],
      });
      expect(warn).not.toHaveBeenCalled();
    });

    it('keeps the block but ignores match (and warns) when match is an empty array', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const configPath = path.join(testDir, 'specs.config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        config: { processing: { instanceExamples: { scope: 'PAGE', match: [] } } },
      }));

      const config = configLoader.load();
      const ie = config.config.processing.instanceExamples as Record<string, unknown>;
      expect(ie).toEqual({ scope: 'PAGE' });
      expect(ie).not.toHaveProperty('match');
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid processing.instanceExamples.match')
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
      const ie = config.config.processing.instanceExamples as Record<string, unknown>;
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
      const ie = config.config.processing.instanceExamples as Record<string, unknown>;
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
      expect(config.config.processing.instanceExamples).toEqual(block);
    });
  });

  describe('include.defaultSlotContent validation', () => {
    it('preserves a valid boolean (true)', () => {
      const configPath = path.join(testDir, 'specs.config.yaml');
      fs.writeFileSync(configPath, 'config:\n  include:\n    defaultSlotContent: true');

      const config = configLoader.load();
      expect(config.config.include.defaultSlotContent).toBe(true);
    });

    it('preserves a valid boolean (false)', () => {
      const configPath = path.join(testDir, 'specs.config.yaml');
      fs.writeFileSync(configPath, 'config:\n  include:\n    defaultSlotContent: false');

      const config = configLoader.load();
      expect(config.config.include.defaultSlotContent).toBe(false);
    });

    it('keeps defaultSlotContent in the include allowlist (does not strip the key)', () => {
      const configPath = path.join(testDir, 'specs.config.yaml');
      fs.writeFileSync(configPath, 'config:\n  include:\n    defaultSlotContent: true');

      const config = configLoader.load();
      expect(Object.keys(config.config.include)).toContain('defaultSlotContent');
    });

    it('strips an unknown include key (EOLed allowlist) but keeps defaultSlotContent', () => {
      const configPath = path.join(testDir, 'specs.config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        config: { include: { defaultSlotContent: true, instanceExamples: true } },
      }));

      const config = configLoader.load();
      const include = config.config.include as Record<string, unknown>;
      // instanceExamples is not a valid include key — must be stripped.
      expect(include.instanceExamples).toBeUndefined();
      expect(include.defaultSlotContent).toBe(true);
    });

    // defaultSlotContent activates only on a literal boolean `true`; any other
    // value is coerced to false (ConfigLoader.ts validateAndCorrectConfig).
    it('coerces a non-boolean defaultSlotContent value to false', () => {
      const configPath = path.join(testDir, 'specs.config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        config: { include: { defaultSlotContent: 'yes' } },
      }));

      const config = configLoader.load();
      expect(config.config.include.defaultSlotContent).toBe(false);
    });

    it('coerces a truthy-but-not-true value (e.g. 1) to false', () => {
      const configPath = path.join(testDir, 'specs.config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        config: { include: { defaultSlotContent: 1 } },
      }));

      const config = configLoader.load();
      expect(config.config.include.defaultSlotContent).toBe(false);
    });
  });

  describe('include.imageData validation (ADR-063)', () => {
    it('preserves a literal true through the include allowlist', () => {
      const configPath = path.join(testDir, 'specs.config.yaml');
      fs.writeFileSync(configPath, 'config:\n  include:\n    imageData: true');

      const config = configLoader.load();
      expect(config.config.include.imageData).toBe(true);
    });

    it('defaults to false when omitted', () => {
      const configPath = path.join(testDir, 'specs.config.yaml');
      fs.writeFileSync(configPath, 'config:\n  include:\n    invalidVariants: true');

      const config = configLoader.load();
      expect(config.config.include.imageData).toBe(false);
    });

    it('coerces a non-boolean imageData value to false', () => {
      const configPath = path.join(testDir, 'specs.config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        config: { include: { imageData: 'yes' } },
      }));

      const config = configLoader.load();
      expect(config.config.include.imageData).toBe(false);
    });
  });

  describe('processing.imageComponent validation (ADR-063)', () => {
    it('preserves a valid block, trims fields, and defaults fallback to true', () => {
      const configPath = path.join(testDir, 'specs.config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        config: { processing: { imageComponent: { name: ' DS Image ', sourceProperty: 'imageSource' } } },
      }));

      const config = configLoader.load();
      expect(config.config.processing.imageComponent).toEqual({
        name: 'DS Image',
        sourceProperty: 'imageSource',
        fallback: true,
      });
    });

    it('preserves an explicit fallback: false', () => {
      const configPath = path.join(testDir, 'specs.config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        config: { processing: { imageComponent: { name: 'DS Image', sourceProperty: 'imageSource', fallback: false } } },
      }));

      const config = configLoader.load();
      expect(config.config.processing.imageComponent?.fallback).toBe(false);
    });

    it('removes the block when name or sourceProperty is missing or blank', () => {
      const configPath = path.join(testDir, 'specs.config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        config: { processing: { imageComponent: { name: 'DS Image', sourceProperty: '  ' } } },
      }));

      const config = configLoader.load();
      expect(config.config.processing.imageComponent).toBeUndefined();
    });

    it('is absent by default', () => {
      const configPath = path.join(testDir, 'specs.config.yaml');
      fs.writeFileSync(configPath, 'config:\n  processing:\n    variantDepth: 2');

      const config = configLoader.load();
      expect(config.config.processing.imageComponent).toBeUndefined();
    });
  });

  describe('Merging with defaults', () => {
    it('should merge partial config with defaults', () => {
      const configPath = path.join(testDir, 'specs.config.yaml');
      fs.writeFileSync(configPath, 'config:\n  processing:\n    variantDepth: 2');

      const config = configLoader.load();

      // Overridden value
      expect(config.config.processing.variantDepth).toBe(2);

      // Default values preserved
      expect(config.config.processing.details).toBe(DEFAULT_CONFIG.processing.details);
      expect(config.config.processing.subcomponents).toEqual(DEFAULT_CONFIG.processing.subcomponents);
      expect(config.config.format.keys).toBe(DEFAULT_CONFIG.format.keys);
    });
  });
});
