import { describe, it, expect } from 'vitest';
import { generateConfigTemplate } from '../../../src/Config/ConfigTemplates.js';

describe('ConfigTemplates', () => {
  describe('generateConfigTemplate', () => {
    it('should generate a valid YAML template', () => {
      const template = generateConfigTemplate();
      expect(template).toBeTruthy();
      expect(typeof template).toBe('string');
    });

    it('should include sourceDirectory with default value', () => {
      const template = generateConfigTemplate();
      expect(template).toContain('sourceDirectory: ./data');
      expect(template).toContain('Where fetch writes payloads');
    });

    it('should include outputDirectory with default value', () => {
      const template = generateConfigTemplate();
      expect(template).toContain('outputDirectory: ./specs');
      expect(template).toContain('Default location for generated spec files');
    });

    it('should include inline documentation comments', () => {
      const template = generateConfigTemplate();
      expect(template).toContain('#');
      expect(template).toContain('Anova CLI Configuration');
      expect(template).toContain('docs/cli/configuration.md');
    });

    it('should include doc URL references', () => {
      const template = generateConfigTemplate();
      expect(template).toContain('https://docs.anova.dev/cli/configuration#sourceDirectory');
      expect(template).toContain('https://docs.anova.dev/cli/configuration#outputDirectory');
      expect(template).toContain('https://docs.anova.dev/cli/configuration#sources');
      expect(template).toContain('https://docs.anova.dev/cli/configuration#model');
    });

    it('should include Figma sources section', () => {
      const template = generateConfigTemplate();
      expect(template).toContain('sources:');
      expect(template).toContain('Figma file sources');
      expect(template).toContain('FIGMA_FILE_KEY');
    });

    it('should include commented glyphNamePattern option', () => {
      const template = generateConfigTemplate();
      expect(template).toContain('glyphNamePattern');
      expect(template).toContain('icon glyph');
      expect(template).toContain('https://docs.anova.dev/cli/configuration#glyphNamePattern');
    });

    it('should include model processing configuration', () => {
      const template = generateConfigTemplate();
      expect(template).toContain('model:');
      expect(template).toContain('processing:');
      expect(template).toContain('subcomponents:');
      expect(template).toContain('match:');
      expect(template).toContain('variantDepth');
      expect(template).toContain('details');
    });

    it('should include format configuration section', () => {
      const template = generateConfigTemplate();
      expect(template).toContain('format:');
      expect(template).toContain('keys:');
      expect(template).toContain('output:');
      expect(template).toContain('tokens:');
      expect(template).toContain('layout:');
    });

    it('should have consistent line endings', () => {
      const template = generateConfigTemplate();
      // Should use consistent line endings (not mixed \n and \r\n)
      const hasWindows = template.includes('\r\n');
      const hasUnix = template.includes('\n');
      if (hasWindows && hasUnix) {
        expect(false).toBe(true); // Fail if mixed line endings
      }
    });

    it('should be valid YAML structure', () => {
      const template = generateConfigTemplate();
      // Check basic YAML structure: top-level keys, nested indentation
      const lines = template.split('\n');
      const nonCommentLines = lines.filter(line => !line.trim().startsWith('#') && line.trim());

      // Should have top-level keys
      const topLevelKeys = nonCommentLines.filter(line => !line.startsWith(' '));
      expect(topLevelKeys.length).toBeGreaterThan(0);
      expect(topLevelKeys.some(line => line.includes('sourceDirectory'))).toBe(true);
      expect(topLevelKeys.some(line => line.includes('outputDirectory'))).toBe(true);
      expect(topLevelKeys.some(line => line.includes('sources'))).toBe(true);
      expect(topLevelKeys.some(line => line.includes('model'))).toBe(true);
    });

    it('should mention defaults and getting started in comments', () => {
      const template = generateConfigTemplate();
      expect(template).toContain('Default');
      expect(template).toContain('production-ready');
    });
  });
});
