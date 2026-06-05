import { describe, it, expect } from 'vitest';
import { generateConfigTemplate } from '../../../src/Config/ConfigTemplates.js';

describe('ConfigTemplates', () => {
  describe('generateConfigTemplate', () => {
    it('should generate a valid YAML template', () => {
      const template = generateConfigTemplate();
      expect(template).toBeTruthy();
      expect(typeof template).toBe('string');
    });

    it('should include dataDirectory with default value', () => {
      const template = generateConfigTemplate();
      expect(template).toContain('dataDirectory: ./data');
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
      expect(template).toContain('Specs CLI Configuration');
      expect(template).toContain('directededges.github.io/specs/config/');
    });

    it('should include doc URL references', () => {
      const template = generateConfigTemplate();
      expect(template).toContain('directededges.github.io/specs/config/');
      expect(template).toContain('directededges.github.io/specs/');
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
    });

    it('should include config processing configuration', () => {
      const template = generateConfigTemplate();
      expect(template).toContain('config:');
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
      expect(topLevelKeys.some(line => line.includes('dataDirectory'))).toBe(true);
      expect(topLevelKeys.some(line => line.includes('outputDirectory'))).toBe(true);
      expect(topLevelKeys.some(line => line.includes('sources'))).toBe(true);
      expect(topLevelKeys.some(line => line.includes('config'))).toBe(true);
    });

    it('should mention defaults in comments', () => {
      const template = generateConfigTemplate();
      expect(template).toContain('Default');
      expect(template).toContain('default');
    });

    it('includes a commented-out transform: block under config:', () => {
      const template = generateConfigTemplate();
      expect(template).toContain('# transform:');
    });

    it('includes commented-out transformers: list with contract, css, styling', () => {
      const template = generateConfigTemplate();
      expect(template).toContain('#   transformers:');
      expect(template).toContain('#     - name: contract');
      expect(template).toContain('#     - name: css');
      expect(template).toContain('#     - name: styling');
    });

    it('transform block appears after the include: section', () => {
      const template = generateConfigTemplate();
      const includeIdx = template.indexOf('include:');
      const transformIdx = template.indexOf('# transform:');
      expect(includeIdx).toBeGreaterThanOrEqual(0);
      expect(transformIdx).toBeGreaterThan(includeIdx);
    });
  });
});
