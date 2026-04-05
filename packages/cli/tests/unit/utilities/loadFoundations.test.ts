/**
 * Unit tests for loadFoundations utility
 * 
 * Tests the loading and parsing of variables and styles JSON files
 * into strongly-typed Maps for the transformer.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { loadFoundations } from '../../../src/utilities/loadFoundations.js';

describe('loadFoundations', () => {
  let testDir: string;

  beforeEach(() => {
    // Create temporary test directory
    testDir = path.join(process.cwd(), 'tests', 'tmp', `loadFoundations-${Date.now()}`);
    fs.ensureDirSync(testDir);
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.removeSync(testDir);
    }
  });

  describe('Variables loading', () => {
    it('should load variables from a single JSON file', async () => {
      const variablesPath = path.join(testDir, 'variables.json');
      const variablesData = {
        meta: {
          variables: {
            'var-1': { name: 'Primary Color', resolvedType: 'COLOR' },
            'var-2': { name: 'Font Size', resolvedType: 'FLOAT' }
          },
          variableCollections: {
            'col-1': { name: 'Theme Colors' }
          }
        }
      };

      fs.writeJSONSync(variablesPath, variablesData);

      const result = await loadFoundations([variablesPath], []);

      expect(result.variables.size).toBe(2);
      expect(result.variables.get('var-1')).toMatchObject({
        id: 'var-1',
        name: 'Primary Color',
        resolvedType: 'COLOR'
      });
      expect(result.variables.get('var-2')).toMatchObject({
        id: 'var-2',
        name: 'Font Size',
        resolvedType: 'FLOAT'
      });

      expect(result.collections.size).toBe(1);
      expect(result.collections.get('col-1')).toMatchObject({
        id: 'col-1',
        name: 'Theme Colors'
      });
    });

    it('should merge variables from multiple JSON files', async () => {
      const vars1Path = path.join(testDir, 'variables1.json');
      const vars2Path = path.join(testDir, 'variables2.json');

      fs.writeJSONSync(vars1Path, {
        meta: {
          variables: {
            'var-1': { name: 'Color 1', resolvedType: 'COLOR' }
          },
          variableCollections: {
            'col-1': { name: 'Collection 1' }
          }
        }
      });

      fs.writeJSONSync(vars2Path, {
        meta: {
          variables: {
            'var-2': { name: 'Color 2', resolvedType: 'COLOR' }
          },
          variableCollections: {
            'col-2': { name: 'Collection 2' }
          }
        }
      });

      const result = await loadFoundations([vars1Path, vars2Path], []);

      expect(result.variables.size).toBe(2);
      expect(result.collections.size).toBe(2);
      expect(result.variables.has('var-1')).toBe(true);
      expect(result.variables.has('var-2')).toBe(true);
      expect(result.collections.has('col-1')).toBe(true);
      expect(result.collections.has('col-2')).toBe(true);
    });

    it('should handle empty variables array', async () => {
      const result = await loadFoundations([], []);

      expect(result.variables.size).toBe(0);
      expect(result.collections.size).toBe(0);
    });

    it('should handle missing meta.variables', async () => {
      const variablesPath = path.join(testDir, 'variables.json');
      fs.writeJSONSync(variablesPath, { meta: {} });

      const result = await loadFoundations([variablesPath], []);

      expect(result.variables.size).toBe(0);
      expect(result.collections.size).toBe(0);
    });
  });

  describe('Styles loading', () => {
    it('should load styles from a single JSON file', async () => {
      const stylesPath = path.join(testDir, 'styles.json');
      const stylesData = {
        meta: {
          styles: [
            { key: 'style-1', name: 'Heading', style_type: 'TEXT', description: 'Main heading' },
            { key: 'style-2', name: 'Primary Fill', style_type: 'FILL' }
          ]
        }
      };

      fs.writeJSONSync(stylesPath, stylesData);

      const result = await loadFoundations([], [stylesPath]);

      expect(result.styles.size).toBe(2);
      expect(result.styles.get('style-1')).toEqual({
        id: 'style-1',
        name: 'Heading',
        type: 'TEXT',
        description: 'Main heading'
      });
      expect(result.styles.get('style-2')).toEqual({
        id: 'style-2',
        name: 'Primary Fill',
        type: 'FILL',
        description: undefined
      });
    });

    it('should merge styles from multiple JSON files', async () => {
      const styles1Path = path.join(testDir, 'styles1.json');
      const styles2Path = path.join(testDir, 'styles2.json');

      fs.writeJSONSync(styles1Path, {
        meta: {
          styles: [
            { key: 'style-1', name: 'Style 1', style_type: 'TEXT' }
          ]
        }
      });

      fs.writeJSONSync(styles2Path, {
        meta: {
          styles: [
            { key: 'style-2', name: 'Style 2', style_type: 'FILL' }
          ]
        }
      });

      const result = await loadFoundations([], [styles1Path, styles2Path]);

      expect(result.styles.size).toBe(2);
      expect(result.styles.has('style-1')).toBe(true);
      expect(result.styles.has('style-2')).toBe(true);
    });

    it('should handle empty styles array', async () => {
      const result = await loadFoundations([], []);

      expect(result.styles.size).toBe(0);
    });

    it('should handle missing meta.styles', async () => {
      const stylesPath = path.join(testDir, 'styles.json');
      fs.writeJSONSync(stylesPath, { meta: {} });

      const result = await loadFoundations([], [stylesPath]);

      expect(result.styles.size).toBe(0);
    });

    it('should handle non-array meta.styles', async () => {
      const stylesPath = path.join(testDir, 'styles.json');
      fs.writeJSONSync(stylesPath, { meta: { styles: {} } });

      const result = await loadFoundations([], [stylesPath]);

      expect(result.styles.size).toBe(0);
    });
  });

  describe('Combined loading', () => {
    it('should load both variables and styles together', async () => {
      const variablesPath = path.join(testDir, 'variables.json');
      const stylesPath = path.join(testDir, 'styles.json');

      fs.writeJSONSync(variablesPath, {
        meta: {
          variables: {
            'var-1': { name: 'Color Var', resolvedType: 'COLOR' }
          },
          variableCollections: {
            'col-1': { name: 'Collection' }
          }
        }
      });

      fs.writeJSONSync(stylesPath, {
        meta: {
          styles: [
            { key: 'style-1', name: 'Text Style', style_type: 'TEXT' }
          ]
        }
      });

      const result = await loadFoundations([variablesPath], [stylesPath]);

      expect(result.variables.size).toBe(1);
      expect(result.collections.size).toBe(1);
      expect(result.styles.size).toBe(1);
    });

    it('should return properly typed Maps', async () => {
      const result = await loadFoundations([], []);

      // Verify the result matches FoundationsData interface
      expect(result).toHaveProperty('styles');
      expect(result).toHaveProperty('variables');
      expect(result).toHaveProperty('collections');

      // Verify these are Maps
      expect(result.styles instanceof Map).toBe(true);
      expect(result.variables instanceof Map).toBe(true);
      expect(result.collections instanceof Map).toBe(true);
    });
  });
});
