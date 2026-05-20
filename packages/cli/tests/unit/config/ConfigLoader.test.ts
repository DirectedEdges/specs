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
