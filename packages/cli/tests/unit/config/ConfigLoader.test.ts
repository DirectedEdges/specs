/**
 * ConfigLoader unit tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { ConfigLoader } from '../../../src/Config/ConfigLoader.js';
import { DEFAULT_CONFIG as DEFAULT_MODEL_CONFIG } from '@directededges/specs-schema';

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
    it('should find .specs.config.yaml in current directory', () => {
      const configPath = path.join(testDir, '.specs.config.yaml');
      fs.writeFileSync(configPath, 'model:\n  processing:\n    variantDepth: 2');

      const config = configLoader.load();
      expect(config.model.processing.variantDepth).toBe(2);
    });

    it('should find .specs.config.json in current directory', () => {
      const configPath = path.join(testDir, '.specs.config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        model: { processing: { variantDepth: 3 } }
      }));

      const config = configLoader.load();
      expect(config.model.processing.variantDepth).toBe(3);
    });

    it('should prefer .specs.config.yaml over .json', () => {
      const yamlPath = path.join(testDir, '.specs.config.yaml');
      const jsonPath = path.join(testDir, '.specs.config.json');

      fs.writeFileSync(yamlPath, 'model:\n  processing:\n    variantDepth: 1');
      fs.writeFileSync(jsonPath, JSON.stringify({
        model: { processing: { variantDepth: 2 } }
      }));

      const config = configLoader.load();
      expect(config.model.processing.variantDepth).toBe(1); // YAML wins
    });

    it('should return defaults when no config file exists', () => {
      const config = configLoader.load();
      expect(config.model).toEqual(DEFAULT_MODEL_CONFIG);
    });

    it('should use explicit config path when provided', () => {
      const customPath = path.join(testDir, 'custom-config.yaml');
      fs.writeFileSync(customPath, 'model:\n  processing:\n    variantDepth: 2');

      const config = configLoader.load(customPath);
      expect(config.model.processing.variantDepth).toBe(2);
    });

    it('should return defaults when explicit path does not exist', () => {
      const nonExistentPath = path.join(testDir, 'does-not-exist.yaml');
      const config = configLoader.load(nonExistentPath);
      expect(config.model).toEqual(DEFAULT_MODEL_CONFIG);
    });
  });

  describe('YAML parsing', () => {
    it('should parse valid YAML config', () => {
      const configPath = path.join(testDir, '.specs.config.yaml');
      const yamlContent = `
model:
  processing:
    variantDepth: 2
    details: FULL
  format:
    keys: CAMEL
`;
      fs.writeFileSync(configPath, yamlContent);

      const config = configLoader.load();
      expect(config.model.processing.variantDepth).toBe(2);
      expect(config.model.processing.details).toBe('FULL');
      expect(config.model.format.keys).toBe('CAMEL');
    });

    it('should handle complex YAML config', () => {
      const configPath = path.join(testDir, '.specs.config.yaml');
      const yamlContent = `
model:
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
    variantNames: true
    invalidVariants: false
    invalidCombinations: false
sources:
  variables: ./variables.json
  styles: ./styles.json
`;
      fs.writeFileSync(configPath, yamlContent);

      const config = configLoader.load();
      expect(config.model.processing.subcomponents).toEqual({ match: ['{C} / {S}'] });
      expect(config.model.processing.variantDepth).toBe(3);
      expect(config.model.format.output).toBe('YAML');
      expect(config.model.format.keys).toBe('SNAKE');
      expect(config.sources).toEqual({
        variables: './variables.json',
        styles: './styles.json'
      });
    });
  });

  describe('JSON parsing', () => {
    it('should parse valid JSON config', () => {
      const configPath = path.join(testDir, '.specs.config.json');
      const jsonContent = {
        model: {
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
      expect(config.model.processing.variantDepth).toBe(1);
      expect(config.model.processing.details).toBe('LAYERED');
      expect(config.model.format.keys).toBe('KEBAB');
    });
  });

  describe('Config validation', () => {
    it('should validate variantDepth and use default for invalid values', () => {
      const configPath = path.join(testDir, '.specs.config.yaml');
      fs.writeFileSync(configPath, 'model:\n  processing:\n    variantDepth: 999'); // Invalid

      const config = configLoader.load();
      expect(config.model.processing.variantDepth).toBe(9999); // Default
    });

    it('should validate details and use default for invalid values', () => {
      const configPath = path.join(testDir, '.specs.config.yaml');
      fs.writeFileSync(configPath, 'model:\n  processing:\n    details: INVALID');

      const config = configLoader.load();
      expect(config.model.processing.details).toBe('LAYERED'); // Default
    });

    it('should validate format.keys and use default for invalid values', () => {
      const configPath = path.join(testDir, '.specs.config.yaml');
      fs.writeFileSync(configPath, 'model:\n  format:\n    keys: INVALID');

      const config = configLoader.load();
      expect(config.model.format.keys).toBe('SAFE'); // Default
    });

    it('should validate format.output and use default for invalid values', () => {
      const configPath = path.join(testDir, '.specs.config.yaml');
      fs.writeFileSync(configPath, 'model:\n  format:\n    output: XML');

      const config = configLoader.load();
      expect(config.model.format.output).toBe('JSON'); // Default
    });

    it('should validate format.layout and use default for invalid values', () => {
      const configPath = path.join(testDir, '.specs.config.yaml');
      fs.writeFileSync(configPath, 'model:\n  format:\n    layout: INVALID');

      const config = configLoader.load();
      expect(config.model.format.layout).toBe('LAYOUT'); // Default
    });

    it('should validate format.tokens and use default for invalid values', () => {
      const configPath = path.join(testDir, '.specs.config.yaml');
      fs.writeFileSync(configPath, 'model:\n  format:\n    tokens: INVALID');

      const config = configLoader.load();
      expect(config.model.format.tokens).toBe('TOKEN'); // Default
    });

    it('should preserve valid glyphNamePattern string', () => {
      const configPath = path.join(testDir, '.specs.config.yaml');
      fs.writeFileSync(configPath, 'model:\n  processing:\n    glyphNamePattern: "DS Icon Glyph /"');

      const config = configLoader.load();
      expect(config.model.processing.glyphNamePattern).toBe('DS Icon Glyph /');
    });

    it('should strip invalid glyphNamePattern (non-string)', () => {
      const configPath = path.join(testDir, '.specs.config.yaml');
      fs.writeFileSync(configPath, 'model:\n  processing:\n    glyphNamePattern: 123');

      const config = configLoader.load();
      expect(config.model.processing.glyphNamePattern).toBeUndefined();
    });

    it('should strip empty glyphNamePattern', () => {
      const configPath = path.join(testDir, '.specs.config.yaml');
      fs.writeFileSync(configPath, "model:\n  processing:\n    glyphNamePattern: '  '");

      const config = configLoader.load();
      expect(config.model.processing.glyphNamePattern).toBeUndefined();
    });

    it('should accept all valid variantDepth values', () => {
      const validValues = [1, 2, 3, 9999];

      validValues.forEach(value => {
        const configPath = path.join(testDir, '.specs.config.yaml');
        fs.writeFileSync(configPath, `model:\n  processing:\n    variantDepth: ${value}`);

        const config = configLoader.load();
        expect(config.model.processing.variantDepth).toBe(value);
      });
    });

    it('should accept all valid format.keys values', () => {
      const validValues = ['SAFE', 'CAMEL', 'SNAKE', 'KEBAB', 'PASCAL', 'TRAIN'];

      validValues.forEach(value => {
        const configPath = path.join(testDir, '.specs.config.yaml');
        fs.writeFileSync(configPath, `model:\n  format:\n    keys: ${value}`);

        const config = configLoader.load();
        expect(config.model.format.keys).toBe(value);
      });
    });
  });

  describe('Merging with defaults', () => {
    it('should merge partial config with defaults', () => {
      const configPath = path.join(testDir, '.specs.config.yaml');
      fs.writeFileSync(configPath, 'model:\n  processing:\n    variantDepth: 2');

      const config = configLoader.load();

      // Overridden value
      expect(config.model.processing.variantDepth).toBe(2);

      // Default values preserved
      expect(config.model.processing.details).toBe(DEFAULT_MODEL_CONFIG.processing.details);
      expect(config.model.processing.subcomponentNamePattern).toBe(DEFAULT_MODEL_CONFIG.processing.subcomponentNamePattern);
      expect(config.model.format.keys).toBe(DEFAULT_MODEL_CONFIG.format.keys);
    });
  });
});
