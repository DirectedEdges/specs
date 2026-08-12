import { describe, it, expect } from 'vitest';
import { collectGlyphComponents } from '../../../src/commands/FetchCommand.js';

const PATTERN = 'DS Icon asset / {i}';

function component(id: string, name: string, children: unknown[] = []) {
  return { id, name, type: 'COMPONENT', children };
}

describe('collectGlyphComponents', () => {
  it('collects COMPONENT nodes matching the pattern and captures the icon name', () => {
    const doc = { children: [component('1:1', 'DS Icon asset / Check'), component('1:2', 'Button')] };
    const glyphs = collectGlyphComponents(doc, PATTERN);
    expect(glyphs).toEqual([{ id: '1:1', name: 'Check', slug: 'check' }]);
  });

  it('ignores non-COMPONENT nodes even when their names match', () => {
    const doc = {
      children: [
        { id: '2:1', name: 'DS Icon asset / Close', type: 'FRAME', children: [] },
        { id: '2:2', name: 'DS Icon asset / Close', type: 'INSTANCE', children: [] },
      ],
    };
    expect(collectGlyphComponents(doc, PATTERN)).toEqual([]);
  });

  it('walks nested children at any depth', () => {
    const doc = {
      children: [
        { id: 'p', name: 'Page', type: 'CANVAS', children: [
          { id: 'f', name: 'Icons', type: 'FRAME', children: [component('3:1', 'DS Icon asset / Star')] },
        ] },
      ],
    };
    expect(collectGlyphComponents(doc, PATTERN)).toHaveLength(1);
  });

  it('kebabizes spaces, underscores, and camelCase into stable slugs', () => {
    const doc = {
      children: [
        component('4:1', 'DS Icon asset / Arrow Left'),
        component('4:2', 'DS Icon asset / expandMore'),
        component('4:3', 'DS Icon asset / snake_case_name'),
        component('4:4', 'DS Icon asset /   padded   '),
      ],
    };
    const slugs = collectGlyphComponents(doc, PATTERN).map(g => g.slug);
    expect(slugs).toEqual(['arrow-left', 'expand-more', 'snake-case-name', 'padded']);
  });

  it('suffixes duplicate slugs with the node id instead of dropping them', () => {
    const doc = {
      children: [component('5:1', 'DS Icon asset / Check'), component('5:2', 'DS Icon asset / check')],
    };
    const slugs = collectGlyphComponents(doc, PATTERN).map(g => g.slug);
    expect(slugs).toEqual(['check', 'check-5-2']);
  });

  it('escapes regex-special characters in the pattern', () => {
    const doc = { children: [component('6:1', 'Icons (v2) / Check'), component('6:2', 'Icons xv2y / Check')] };
    const glyphs = collectGlyphComponents(doc, 'Icons (v2) / {i}');
    expect(glyphs).toEqual([{ id: '6:1', name: 'Check', slug: 'check' }]);
  });

  it('requires a full-name match, not a substring', () => {
    const doc = { children: [component('7:1', 'Prefix DS Icon asset / Check suffix')] };
    expect(collectGlyphComponents(doc, PATTERN)).toEqual([]);
  });

  it('a pattern without {i} matches literally and uses the full name', () => {
    const doc = { children: [component('8:1', 'Logo')] };
    expect(collectGlyphComponents(doc, 'Logo')).toEqual([{ id: '8:1', name: 'Logo', slug: 'logo' }]);
  });

  it('returns empty for null or non-object documents', () => {
    expect(collectGlyphComponents(null, PATTERN)).toEqual([]);
    expect(collectGlyphComponents(undefined, PATTERN)).toEqual([]);
    expect(collectGlyphComponents('text', PATTERN)).toEqual([]);
  });
});
