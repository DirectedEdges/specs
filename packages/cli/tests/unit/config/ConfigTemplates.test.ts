import { describe, it, expect } from 'vitest';
import yaml from 'yaml';
import {
  generateFigmaConventionsTemplate,
  generateSettingsTemplate,
  generatePipelineTemplate,
  generateConfigTemplates,
} from '../../../src/Config/ConfigTemplates.js';

describe('ConfigTemplates', () => {
  describe('generateConfigTemplates', () => {
    it('scaffolds one conventions file per platform, plus settings and pipeline', () => {
      const templates = generateConfigTemplates();
      expect(Object.keys(templates).sort()).toEqual([
        'config/conventions/figma.yaml',
        'config/conventions/react.yaml',
        'config/conventions/web-components.yaml',
        'config/pipeline.yaml',
        'config/settings.yaml',
      ]);
    });

    it('every template parses as valid YAML — commented example blocks included', () => {
      for (const template of Object.values(generateConfigTemplates())) {
        expect(template).toBeTruthy();
        expect(typeof template).toBe('string');
        expect(() => yaml.parse(template)).not.toThrow();
      }
    });

    it('templates have consistent line endings', () => {
      for (const template of Object.values(generateConfigTemplates())) {
        expect(template.includes('\r\n')).toBe(false);
      }
    });
  });

  describe('generateFigmaConventionsTemplate', () => {
    it('documents every feature-toggle block (commented) with a doc link', () => {
      const template = generateFigmaConventionsTemplate();
      for (const block of ['instanceExamples:', 'states:', 'images:', 'sourceProps:']) {
        expect(template).toContain(block);
      }
      expect(template).toContain('www.specsplugin.com/guides/images/');
      expect(template).toContain('www.specsplugin.com/guides/instance-examples/');
      expect(template).toContain('www.specsplugin.com/settings/states/');
    });

    it('should include commented glyphs block for icon glyph naming', () => {
      const template = generateFigmaConventionsTemplate();
      expect(template).toContain('glyphs:');
      expect(template).toContain('glyph');
    });

    it('should include figma conventions structure', () => {
      const template = generateFigmaConventionsTemplate();
      // The filename is the platform id, so the body has no wrapping key (ADR-078).
      expect(template).not.toContain('\nfigma:');
      expect(template).toContain('# naming: NONE');
      expect(template).toContain('naming:');
      expect(template).toContain('subcomponents:');
      expect(template).toContain('match:');
      expect(template).toContain('slotConstraints:');
      expect(template).toContain('codeOnlyProps:');
    });

    it('the body sits at the root — the filename is the platform id', () => {
      const parsed = yaml.parse(generateFigmaConventionsTemplate());
      // No wrapping key: conventions/figma.yaml IS the figma entry (ADR-078).
      expect(Object.keys(parsed)).not.toContain('figma');
      expect(Object.keys(parsed)).toContain('subcomponents');
    });

    it('a code platform stub is inert until uncommented', () => {
      const templates = generateConfigTemplates();
      for (const key of ['config/conventions/react.yaml', 'config/conventions/web-components.yaml']) {
        const stub = templates[key];
        expect(stub).toContain('# primitives:');
        // Pure comments parse to nothing, which is the same as declaring nothing.
        expect(yaml.parse(stub)).toBeNull();
      }
    });
  });

  describe('generateSettingsTemplate', () => {
    it('should include data.directory with default value', () => {
      const template = generateSettingsTemplate();
      expect(template).toContain('directory: ./data');
      expect(template).toContain('Where fetch writes payloads');
    });

    it('should include spec.directory with default value', () => {
      const template = generateSettingsTemplate();
      expect(template).toContain('directory: ./specs');
      expect(template).toContain('Default location for generated spec files');
    });

    it('should include inline documentation comments', () => {
      const template = generateSettingsTemplate();
      expect(template).toContain('#');
      expect(template).toContain('www.specsplugin.com/settings/');
    });

    it('should include Figma sources section', () => {
      const template = generateSettingsTemplate();
      expect(template).toContain('sources:');
      expect(template).toContain('Figma file sources');
      expect(template).toContain('FIGMA_FILE_KEY');
    });

    it('should include spec serialization settings', () => {
      const template = generateSettingsTemplate();
      expect(template).toContain('spec:');
      expect(template).toContain('keys:');
      expect(template).toContain('format:');
      expect(template).toContain('tokens:');
      expect(template).toContain('layout:');
      expect(template).toContain('color:');
      expect(template).toContain('variantDepth');
      expect(template).toContain('details');
      expect(template).toContain('collapsePrimitiveWrapper');
      expect(template).toContain('defaultSlotContent');
    });

    it('should have valid structure with top-level keys', () => {
      const parsed = yaml.parse(generateSettingsTemplate());
      expect(Object.keys(parsed)).toContain('author');
      expect(Object.keys(parsed)).toContain('data');
      expect(Object.keys(parsed)).toContain('spec');
      expect(parsed.data.sources).toEqual({});
    });

    it('should mention defaults in comments', () => {
      const template = generateSettingsTemplate();
      expect(template).toContain('Default');
      expect(template).toContain('default');
    });
  });

  describe('generatePipelineTemplate', () => {
    it('includes a commented-out transformers: block', () => {
      const template = generatePipelineTemplate();
      expect(template).toContain('# transformers:');
    });

    it('includes commented-out transformer entries for contract, css, react', () => {
      const template = generatePipelineTemplate();
      expect(template).toContain('#   - name: contract');
      expect(template).toContain('#   - name: css');
      expect(template).toContain('#   - name: react');
    });

    it('includes a commented-out analyses: block', () => {
      const template = generatePipelineTemplate();
      expect(template).toContain('# analyses:');
      expect(template).toContain('#   - name: dependencies');
    });
  });
});
