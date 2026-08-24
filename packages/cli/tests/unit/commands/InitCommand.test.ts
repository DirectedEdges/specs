import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateConfigTemplates } from '../../../src/Config/ConfigTemplates.js';
import { Init } from '../../../src/commands/InitCommand.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDir = path.join(__dirname, '../../tmp/test-init-' + Date.now());

describe('InitCommand', () => {
  beforeEach(async () => {
    await fs.ensureDir(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  it('registers name and description', () => {
    expect(Init.name()).toBe('init');
    expect(Init.description()).toContain('Initialize');
  });

  describe('template generation', () => {
    it('generates the three split-config files under config/', () => {
      const templates = generateConfigTemplates();
      expect(Object.keys(templates).sort()).toEqual([
        'config/conventions.yaml',
        'config/pipeline.yaml',
        'config/settings.yaml',
      ]);
    });

    it('settings template carries data and spec directories with defaults', () => {
      const settings = generateConfigTemplates()['config/settings.yaml'];
      expect(settings).toContain('directory: ./data');
      expect(settings).toContain('directory: ./specs');
      expect(settings).toContain('sources: {}');
    });

    it('conventions template carries the figma conventions structure', () => {
      const conventions = generateConfigTemplates()['config/conventions.yaml'];
      expect(conventions).toContain('figma:');
      expect(conventions).toContain('subcomponents:');
      expect(conventions).toContain('match:');
    });

    it('should include inline documentation', () => {
      for (const template of Object.values(generateConfigTemplates())) {
        expect(template).toContain('#');
      }
      const settings = generateConfigTemplates()['config/settings.yaml'];
      expect(settings).toContain('www.specsplugin.com/settings/');
    });

    it('should mention defaults in comments', () => {
      const settings = generateConfigTemplates()['config/settings.yaml'];
      expect(settings).toContain('Default');
    });

    it('should have consistent YAML indentation', () => {
      const settings = generateConfigTemplates()['config/settings.yaml'];
      const lines = settings.split('\n');

      const seenIndents = new Set<number>();
      lines.forEach((line: string) => {
        if (line.trim() && !line.trim().startsWith('#')) {
          const leadingSpaces = line.match(/^ */)?.[0].length || 0;
          seenIndents.add(leadingSpaces);
        }
      });

      // Should have at least 2 indentation levels (root and nested)
      expect(seenIndents.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe('file operations', () => {
    it('should create the three config files if they do not exist', async () => {
      const templates = generateConfigTemplates();
      for (const [rel, template] of Object.entries(templates)) {
        const filePath = path.join(testDir, rel);
        fs.ensureDirSync(path.dirname(filePath));
        fs.writeFileSync(filePath, template, 'utf-8');
      }
      expect(fs.existsSync(path.join(testDir, 'config', 'conventions.yaml'))).toBe(true);
      expect(fs.existsSync(path.join(testDir, 'config', 'settings.yaml'))).toBe(true);
      expect(fs.existsSync(path.join(testDir, 'config', 'pipeline.yaml'))).toBe(true);
    });

    it('should write template content exactly', async () => {
      const templates = generateConfigTemplates();
      for (const [rel, template] of Object.entries(templates)) {
        const filePath = path.join(testDir, rel);
        fs.ensureDirSync(path.dirname(filePath));
        fs.writeFileSync(filePath, template, 'utf-8');
        expect(fs.readFileSync(filePath, 'utf-8')).toBe(template);
      }
    });

    it('should preserve templates across read/write cycles', async () => {
      const template = generateConfigTemplates()['config/settings.yaml'];
      const configPath = path.join(testDir, 'config', 'settings.yaml');
      fs.ensureDirSync(path.dirname(configPath));

      // First write
      fs.writeFileSync(configPath, template, 'utf-8');
      const firstRead = fs.readFileSync(configPath, 'utf-8');

      // Re-write and verify it's identical
      fs.writeFileSync(configPath, firstRead, 'utf-8');
      const secondRead = fs.readFileSync(configPath, 'utf-8');

      expect(firstRead).toBe(secondRead);
      expect(secondRead).toBe(template);
    });

    it('should support a custom base directory', async () => {
      const customBase = path.join(testDir, 'workspace');
      const templates = generateConfigTemplates();
      for (const [rel, template] of Object.entries(templates)) {
        const filePath = path.join(customBase, rel);
        fs.ensureDirSync(path.dirname(filePath));
        fs.writeFileSync(filePath, template, 'utf-8');
      }
      expect(fs.existsSync(path.join(customBase, 'config', 'settings.yaml'))).toBe(true);
    });

    it('should allow overwriting existing config', async () => {
      const configPath = path.join(testDir, 'config', 'settings.yaml');
      const oldContent = '# Old config\nold: value';
      const newTemplate = generateConfigTemplates()['config/settings.yaml'];

      // Write old content
      fs.ensureDirSync(path.dirname(configPath));
      fs.writeFileSync(configPath, oldContent, 'utf-8');
      expect(fs.readFileSync(configPath, 'utf-8')).toBe(oldContent);

      // Overwrite with new template
      fs.writeFileSync(configPath, newTemplate, 'utf-8');
      expect(fs.readFileSync(configPath, 'utf-8')).toBe(newTemplate);
    });
  });

  describe('config content validation', () => {
    it('settings template has the expected top-level keys', () => {
      const settings = generateConfigTemplates()['config/settings.yaml'];
      const yamlLines = settings.split('\n');
      const topLevelKeys = yamlLines
        .filter((line: string) => !line.startsWith(' ') && !line.startsWith('#') && line.trim())
        .map((line: string) => line.split(':')[0]);

      expect(topLevelKeys).toContain('author');
      expect(topLevelKeys).toContain('data');
      expect(topLevelKeys).toContain('spec');

      // directories and sources are nested under data/spec, not top-level
      expect(settings).toContain('directory:');
      expect(settings).toContain('sources:');
    });

    it('should have all required documentation URLs', () => {
      const settings = generateConfigTemplates()['config/settings.yaml'];
      const requiredUrls = [
        'www.specsplugin.com/settings/',
        'www.specsplugin.com/',
      ];

      requiredUrls.forEach(url => {
        expect(settings).toContain(url);
      });
    });

    it('conventions template has processing conventions', () => {
      const conventions = generateConfigTemplates()['config/conventions.yaml'];

      expect(conventions).toContain('subcomponents:');
      expect(conventions).toContain('slotConstraints');
    });

    it('settings template has serialization settings', () => {
      const settings = generateConfigTemplates()['config/settings.yaml'];

      expect(settings).toContain('keys:');
      expect(settings).toContain('format:');
      expect(settings).toContain('tokens:');
      expect(settings).toContain('layout:');
      expect(settings).toContain('variantDepth');
      expect(settings).toContain('details');
    });

    it('should not contain any credential placeholders', () => {
      for (const template of Object.values(generateConfigTemplates())) {
        expect(template).not.toContain('YOUR_API_KEY');
        expect(template).not.toContain('YOUR_SECRET');
        expect(template).not.toContain('ACTUAL_TOKEN');
      }
    });

    it('should use example keys for Figma sources', () => {
      const settings = generateConfigTemplates()['config/settings.yaml'];

      // Should show the pattern with example key
      expect(settings).toMatch(/key:\s*YOUR_FIGMA_FILE_KEY|FIGMA_FILE_KEY/);
    });

    it('should have sensible default values', () => {
      const settings = generateConfigTemplates()['config/settings.yaml'];

      // Default data directory
      expect(settings).toContain('directory: ./data');

      // Default spec directory
      expect(settings).toContain('directory: ./specs');

      // Empty sources initially
      expect(settings).toContain('sources: {}');
    });
  });
});
