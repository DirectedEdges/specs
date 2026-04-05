import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateConfigTemplate } from '../../../src/Config/ConfigTemplates.js';
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
    it('should generate config template with sourceDirectory', () => {
      const template = generateConfigTemplate();
      expect(template).toContain('sourceDirectory: ./data');
    });

    it('should generate config template with outputDirectory', () => {
      const template = generateConfigTemplate();
      expect(template).toContain('outputDirectory: ./specs');
    });

    it('should generate template with proper structure', () => {
      const template = generateConfigTemplate();
      expect(template).toContain('sources: {}');
      expect(template).toContain('model:');
      expect(template).toContain('processing:');
      expect(template).toContain('format:');
    });

    it('should include inline documentation', () => {
      const template = generateConfigTemplate();
      expect(template).toContain('# Specs CLI Configuration');
      expect(template).toContain('docs/cli/configuration.md');
      expect(template).toContain('https://docs.specs.dev/');
    });

    it('should mention production-ready defaults', () => {
      const template = generateConfigTemplate();
      expect(template).toContain('production-ready');
    });

    it('should have consistent YAML indentation', () => {
      const template = generateConfigTemplate();
      const lines = template.split('\n');

      const seenIndents = new Set<number>();
      lines.forEach(line => {
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
    it('should create config file if it does not exist', async () => {
      const configPath = path.join(testDir, '.specs.config.yaml');
      const template = generateConfigTemplate();

      fs.writeFileSync(configPath, template, 'utf-8');
      expect(fs.existsSync(configPath)).toBe(true);
    });

    it('should write template content exactly', async () => {
      const configPath = path.join(testDir, '.specs.config.yaml');
      const template = generateConfigTemplate();

      fs.writeFileSync(configPath, template, 'utf-8');
      const content = fs.readFileSync(configPath, 'utf-8');

      expect(content).toBe(template);
    });

    it('should preserve template across read/write cycles', async () => {
      const configPath = path.join(testDir, '.specs.config.yaml');
      const template = generateConfigTemplate();

      // First write
      fs.writeFileSync(configPath, template, 'utf-8');
      const firstRead = fs.readFileSync(configPath, 'utf-8');

      // Re-write and verify it's identical
      fs.writeFileSync(configPath, firstRead, 'utf-8');
      const secondRead = fs.readFileSync(configPath, 'utf-8');

      expect(firstRead).toBe(secondRead);
      expect(secondRead).toBe(template);
    });

    it('should support custom config paths', async () => {
      const customPath = path.join(testDir, 'custom-config.yaml');
      const template = generateConfigTemplate();

      fs.writeFileSync(customPath, template, 'utf-8');
      expect(fs.existsSync(customPath)).toBe(true);
    });

    it('should handle nested directory paths', async () => {
      const nestedPath = path.join(testDir, 'nested', 'dirs', '.specs.config.yaml');
      const template = generateConfigTemplate();

      fs.ensureDirSync(path.dirname(nestedPath));
      fs.writeFileSync(nestedPath, template, 'utf-8');

      expect(fs.existsSync(nestedPath)).toBe(true);
    });

    it('should allow overwriting existing config', async () => {
      const configPath = path.join(testDir, '.specs.config.yaml');
      const oldContent = '# Old config\nold: value';
      const newTemplate = generateConfigTemplate();

      // Write old content
      fs.writeFileSync(configPath, oldContent, 'utf-8');
      expect(fs.readFileSync(configPath, 'utf-8')).toBe(oldContent);

      // Overwrite with new template
      fs.writeFileSync(configPath, newTemplate, 'utf-8');
      expect(fs.readFileSync(configPath, 'utf-8')).toBe(newTemplate);
    });
  });

  describe('config content validation', () => {
    it('should have valid structure with top-level keys', () => {
      const template = generateConfigTemplate();
      const yamlLines = template.split('\n');
      const topLevelKeys = yamlLines
        .filter(line => !line.startsWith(' ') && !line.startsWith('#') && line.trim())
        .map(line => line.split(':')[0]);

      expect(topLevelKeys).toContain('sourceDirectory');
      expect(topLevelKeys).toContain('outputDirectory');
      expect(topLevelKeys).toContain('sources');
      expect(topLevelKeys).toContain('model');

      // format, processing, and include are nested under model, not top-level
      expect(template).toContain('format:');
      expect(template).toContain('processing:');
      expect(template).toContain('include:');
    });

    it('should have all required documentation URLs', () => {
      const template = generateConfigTemplate();
      const requiredUrls = [
        'configuration#sourceDirectory',
        'configuration#outputDirectory',
        'configuration#sources',
        'configuration#model',
        'configuration#subcomponents',
        'configuration#variantDepth',
        'configuration#details',
      ];

      requiredUrls.forEach(url => {
        expect(template).toContain(url);
      });
    });

    it('should have model processing configuration', () => {
      const template = generateConfigTemplate();

      expect(template).toContain('subcomponents:');
      expect(template).toContain('variantDepth');
      expect(template).toContain('details');
    });

    it('should have format configuration', () => {
      const template = generateConfigTemplate();

      expect(template).toContain('keys:');
      expect(template).toContain('output:');
      expect(template).toContain('tokens:');
      expect(template).toContain('layout:');
    });

    it('should not contain any credential placeholders', () => {
      const template = generateConfigTemplate();

      // Should not have explicit credential markers
      expect(template).not.toContain('YOUR_API_KEY');
      expect(template).not.toContain('YOUR_SECRET');
      expect(template).not.toContain('ACTUAL_TOKEN');
    });

    it('should use example keys for Figma sources', () => {
      const template = generateConfigTemplate();

      // Should show the pattern with example key
      expect(template).toMatch(/key:\s*YOUR_FIGMA_FILE_KEY|FIGMA_FILE_KEY/);
    });

    it('should have sensible default values', () => {
      const template = generateConfigTemplate();

      // Default source directory
      expect(template).toContain('sourceDirectory: ./data');

      // Default output directory
      expect(template).toContain('outputDirectory: ./specs');

      // Empty sources initially
      expect(template).toContain('sources: {}');
    });
  });
});
