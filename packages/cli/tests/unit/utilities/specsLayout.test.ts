import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import {
  resolveSpecsLayout, writeLayout, legacyLayoutNotice, specFolderNames,
  COMPONENTS_DIR, COMPOSITIONS_DIR, ANALYSIS_DIR, LEGACY_ANALYSIS_DIR, dirNameFor,
} from '../../../src/utilities/specsLayout.js';

/** ADR-096: one resolver owns where each kind lives and how a legacy directory reads. */
describe('specsLayout', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'specs-layout-'));
  });
  afterEach(() => fs.removeSync(root));

  function spec(...segments: string[]) {
    const dir = path.join(root, ...segments);
    fs.ensureDirSync(dir);
    fs.writeFileSync(path.join(dir, 'api.yaml'), 'title: X\n');
  }

  describe('the current layout', () => {
    it('places each kind under its own directory', () => {
      spec(COMPONENTS_DIR, 'button');
      const layout = resolveSpecsLayout(root);
      expect(layout.legacy).toBe(false);
      expect(layout.dirFor('component')).toBe(path.join(root, COMPONENTS_DIR));
      expect(layout.dirFor('composition')).toBe(path.join(root, COMPOSITIONS_DIR));
      expect(layout.analysisDir()).toBe(path.join(root, ANALYSIS_DIR));
    });

    it('lists each kind separately', () => {
      spec(COMPONENTS_DIR, 'button');
      spec(COMPONENTS_DIR, 'card');
      spec(COMPOSITIONS_DIR, 'checkout');
      const layout = resolveSpecsLayout(root);
      expect(layout.folderNames('component')).toEqual(['button', 'card']);
      expect(layout.folderNames('composition')).toEqual(['checkout']);
    });

    it('ignores spec folders at the root rather than merging them', () => {
      // A workspace mid-migration: merging would emit one component from two
      // sources, and a stale root folder would resurrect a retired component.
      spec(COMPONENTS_DIR, 'button');
      spec('staleButton');
      const layout = resolveSpecsLayout(root);
      expect(layout.folderNames('component')).toEqual(['button']);
    });

    it('is current as soon as only compositions/ exists', () => {
      spec(COMPOSITIONS_DIR, 'checkout');
      expect(resolveSpecsLayout(root).legacy).toBe(false);
    });

    it('reports no deprecation notice', () => {
      spec(COMPONENTS_DIR, 'button');
      expect(legacyLayoutNotice(resolveSpecsLayout(root))).toBeNull();
    });
  });

  describe('a legacy flat layout', () => {
    it('reads root folders as components and keeps _analysis', () => {
      spec('button');
      spec('card');
      const layout = resolveSpecsLayout(root);
      expect(layout.legacy).toBe(true);
      expect(layout.dirFor('component')).toBe(root);
      expect(layout.folderNames('component')).toEqual(['button', 'card']);
      expect(layout.analysisDir()).toBe(path.join(root, LEGACY_ANALYSIS_DIR));
    });

    it('has no compositions — the layout could not hold one', () => {
      spec('button');
      expect(resolveSpecsLayout(root).folderNames('composition')).toEqual([]);
    });

    it('earns a deprecation notice naming the remedy', () => {
      spec('button');
      const notice = legacyLayoutNotice(resolveSpecsLayout(root));
      expect(notice).toContain('specs generate');
      expect(notice).toContain(COMPONENTS_DIR);
    });
  });

  describe('an empty or absent directory', () => {
    it('is not legacy, and lists nothing', () => {
      const layout = resolveSpecsLayout(root);
      expect(layout.legacy).toBe(false);
      expect(layout.folderNames('component')).toEqual([]);
    });

    it('resolves an absent directory without throwing', () => {
      const layout = resolveSpecsLayout(path.join(root, 'nope'));
      expect(layout.legacy).toBe(false);
      expect(layout.folderNames('component')).toEqual([]);
    });
  });

  describe('writeLayout', () => {
    it('is always current, even over a legacy directory — nothing writes the old shape', () => {
      spec('button');
      const layout = writeLayout(root);
      expect(layout.legacy).toBe(false);
      expect(layout.dirFor('component')).toBe(path.join(root, COMPONENTS_DIR));
      expect(layout.analysisDir()).toBe(path.join(root, ANALYSIS_DIR));
    });
  });

  describe('specFolderNames', () => {
    it('recognises a folder by its api document, not its name', () => {
      spec('button');
      fs.ensureDirSync(path.join(root, 'notASpec'));
      fs.writeFileSync(path.join(root, 'notASpec', 'notes.md'), '');
      expect(specFolderNames(root)).toEqual(['button']);
    });

    it('accepts json and yml when no format is named, and narrows when one is', () => {
      fs.ensureDirSync(path.join(root, 'fromJson'));
      fs.writeFileSync(path.join(root, 'fromJson', 'api.json'), '{}');
      expect(specFolderNames(root)).toEqual(['fromJson']);
      expect(specFolderNames(root, 'yaml')).toEqual([]);
    });
  });

  it('names each kind directory', () => {
    expect(dirNameFor('component')).toBe(COMPONENTS_DIR);
    expect(dirNameFor('composition')).toBe(COMPOSITIONS_DIR);
  });
});
