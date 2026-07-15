import { describe, it, expect } from 'vitest';
import yaml from 'yaml';
import { generateConfigTemplate } from '../../../src/Config/ConfigTemplates.js';

describe('ConfigTemplates', () => {
  describe('generateConfigTemplate', () => {
    it('should generate a valid YAML template', () => {
      const template = generateConfigTemplate();
      expect(template).toBeTruthy();
      expect(typeof template).toBe('string');
      // Must parse as YAML — commented example blocks included.
      expect(() => yaml.parse(template)).not.toThrow();
    });

    it('documents every feature-toggle block (commented) with a doc link', () => {
      const template = generateConfigTemplate();
      for (const block of ['instanceExamples:', 'states:', 'imageComponent:', 'defaultSlotContent:', 'imageData:']) {
        expect(template).toContain(block);
      }
      expect(template).toContain('directededges.github.io/specs/guides/images/');
      expect(template).toContain('directededges.github.io/specs/guides/instance-examples/');
      expect(template).toContain('directededges.github.io/specs/settings/states/');
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
      expect(template).toContain('directededges.github.io/specs/settings/');
    });

    it('should include doc URL references', () => {
      const template = generateConfigTemplate();
      expect(template).toContain('directededges.github.io/specs/settings/');
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
      expect(template).toContain('collapsePrimitiveWrapper');
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

    it('includes a commented-out transformers: block under config:', () => {
      const template = generateConfigTemplate();
      expect(template).toContain('# transformers:');
    });

    it('includes commented-out transformer entries for contract, css, styling', () => {
      const template = generateConfigTemplate();
      expect(template).toContain('#   - name: contract');
      expect(template).toContain('#   - name: css');
      expect(template).toContain('#   - name: styling');
    });

    it('transformers block appears after the include: section', () => {
      const template = generateConfigTemplate();
      const includeIdx = template.indexOf('include:');
      const transformIdx = template.indexOf('# transformers:');
      expect(includeIdx).toBeGreaterThanOrEqual(0);
      expect(transformIdx).toBeGreaterThan(includeIdx);
    });
  });
});
