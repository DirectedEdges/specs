import { describe, it, expect } from 'vitest';
import yaml from 'yaml';
import { DEFAULT_SETTINGS } from '@directededges/specs-schema';
import {
  generateFigmaConventionsTemplate,
  generateSpecsConventionsTemplate,
  generateSettingsTemplate,
  generateConfigTemplates,
} from '../../../src/Config/ConfigTemplates.js';

describe('ConfigTemplates', () => {
  describe('generateConfigTemplates', () => {
    it('scaffolds one conventions file per platform, the specs file, plus settings', () => {
      const templates = generateConfigTemplates();
      expect(Object.keys(templates).sort()).toEqual([
        'config/conventions/figma.yaml',
        'config/conventions/react.yaml',
        'config/conventions/specs.yaml',
        'config/conventions/web-components.yaml',
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
      for (const block of ['instanceExamples:', 'images:', 'sourceProps:']) {
        expect(template).toContain(block);
      }
      expect(template).toContain('www.specsplugin.com/guides/images/');
      expect(template).toContain('www.specsplugin.com/guides/instance-examples/');
      // states describes the spec's own props, so it lives in specs.yaml (ADR-073 Decision 4)
      expect(template).not.toContain('states:');
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
      // A commented line is the opposite of the default, so uncommenting it
      // always changes behaviour — NONE, the default, would be inert.
      expect(template).toContain('# naming: SENTENCE');
      expect(template).not.toContain('# naming: NONE');
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

  describe('generateSpecsConventionsTemplate', () => {
    it('documents every member (commented) with a doc link', () => {
      const template = generateSpecsConventionsTemplate();
      for (const block of ['# states:', '# accessibility:', '# value:', 'indeterminate:']) {
        expect(template).toContain(block);
      }
      expect(template).toContain('www.specsplugin.com/settings/states/');
    });

    it('is inert until uncommented', () => {
      // Pure comments parse to nothing, which is the same as declaring nothing.
      expect(yaml.parse(generateSpecsConventionsTemplate())).toBeNull();
    });
  });

  describe('generateSettingsTemplate', () => {
    it('should include data.directory with default value', () => {
      const template = generateSettingsTemplate();
      expect(template).toContain('directory: ./data');
      expect(template).toContain('www.specsplugin.com/settings/data-sources/');
    });

    it('should include spec.directory with default value', () => {
      const template = generateSettingsTemplate();
      expect(template).toContain('directory: ./specs');
      expect(template).toContain('www.specsplugin.com/settings/folders/');
    });

    it('should include inline documentation comments', () => {
      const template = generateSettingsTemplate();
      expect(template).toContain('#');
      expect(template).toContain('www.specsplugin.com/settings/');
    });

    it('should include Figma sources section', () => {
      const template = generateSettingsTemplate();
      expect(template).toContain('sources:');
      expect(template).toContain('What to fetch');
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

    it('declares the scaffolded serialization defaults', () => {
      const parsed = yaml.parse(generateSettingsTemplate());
      expect(parsed.spec.format).toBe('YAML');
      expect(parsed.spec.keys).toBe('CAMEL');
      expect(parsed.spec.color).toBe('HEXA');
    });

    it('should have valid structure with top-level keys', () => {
      const parsed = yaml.parse(generateSettingsTemplate());
      expect(Object.keys(parsed)).toContain('author');
      expect(Object.keys(parsed)).toContain('data');
      expect(Object.keys(parsed)).toContain('spec');
      expect(Object.keys(parsed)).toContain('assets');
      expect(parsed.data.sources).toEqual({
        library: { key: 'YOUR_FIGMA_FILE_KEY', fetch: ['file', 'variables', 'styles', 'icons'] },
      });
      expect(parsed.assets.directory).toBe('./assets');
      // curation is a mapping of commented members, so it parses to null rather
      // than being absent — the key itself must still be there to be found.
      expect(Object.keys(parsed)).toContain('curation');
    });

    it('states the commenting contract rather than annotating each default', () => {
      const template = generateSettingsTemplate();
      expect(template).toContain('Every commented line is the opposite of the default');
    });

    /**
     * A commented member whose value equals its default is inert: uncommenting it
     * changes nothing, which makes the template read as a list of switches that do
     * not work. Every default lives in DEFAULT_SETTINGS, so this is checkable.
     */
    it('never shows a commented spec setting at its default value', () => {
      const template = generateSettingsTemplate();
      for (const [key, value] of Object.entries(DEFAULT_SETTINGS.spec)) {
        if (typeof value === 'object') continue;
        expect(template).not.toContain(`# ${key}: ${String(value)}`);
      }
      for (const [key, value] of Object.entries(DEFAULT_SETTINGS.curation)) {
        expect(template).not.toContain(`# ${key}: ${String(value)}`);
      }
    });

    /** Every setting the schema defines is offered, so none is discoverable only in docs. */
    it('offers every spec and curation setting the schema defines', () => {
      const template = generateSettingsTemplate();
      for (const key of Object.keys(DEFAULT_SETTINGS.spec)) {
        expect(template).toContain(`${key}:`);
      }
      for (const key of Object.keys(DEFAULT_SETTINGS.curation)) {
        expect(template).toContain(`${key}:`);
      }
    });
  });

});
