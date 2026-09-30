import { describe, it, expect } from 'vitest';
import { listableCompositions, deriveDefaultInclusion, mergeRows } from '../../../src/commands/ScanCommand.js';
import { ManifestParserV2 } from '../../../src/utilities/ManifestParserV2.js';
import { ComponentDiscovery, type ComponentInfo } from '../../../src/utilities/ComponentDiscovery.js';
import { specFolderKey } from '../../../src/utilities/specFolderKey.js';

function frame(id: string, name: string): ComponentInfo {
  return { id, name, type: 'FRAME', devStatus: 'READY_FOR_DEV' };
}

/**
 * ADR-095. The composition qualifier is the ready-for-dev marking and nothing
 * else about the frame's position; the outermost marking wins; and the manifest
 * section is recorded, not curated.
 */
describe('composition discovery — the qualifying rule', () => {
  function doc(children: any[]): any {
    return {
      document: {
        id: '0:0', name: 'Document', type: 'DOCUMENT',
        children: [{ id: '1:0', name: 'Page 1', type: 'PAGE', children }],
      },
    };
  }
  const ready = { type: 'READY_FOR_DEV' };

  it('lists a marked frame that is a direct child of a page', () => {
    const d = new ComponentDiscovery(doc([{ id: '2:0', name: 'Checkout', type: 'FRAME', devStatus: ready }]));
    expect(d.findCompositions().map(c => c.id)).toEqual(['2:0']);
  });

  it('lists a marked frame nested in a SECTION or a plain container', () => {
    const d = new ComponentDiscovery(doc([
      { id: '2:0', name: 'Screens', type: 'SECTION', children: [
        { id: '2:1', name: 'Home', type: 'FRAME', devStatus: ready, children: [] },
      ] },
      { id: '3:0', name: 'Working', type: 'GROUP', children: [
        { id: '3:1', name: 'Inbox', type: 'FRAME', devStatus: ready, children: [] },
      ] },
    ]));
    expect(d.findCompositions().map(c => c.id).sort()).toEqual(['2:1', '3:1']);
  });

  it('does not list an unmarked frame', () => {
    const d = new ComponentDiscovery(doc([
      { id: '2:0', name: 'Scratch', type: 'FRAME', children: [] },
      { id: '2:1', name: 'Draft', type: 'FRAME', devStatus: { type: 'NONE' }, children: [] },
    ]));
    expect(d.findCompositions()).toHaveLength(0);
  });

  it('does not list a marked frame inside another marked frame — the outermost wins', () => {
    const d = new ComponentDiscovery(doc([
      { id: '2:0', name: 'Checkout', type: 'FRAME', devStatus: ready, children: [
        { id: '2:1', name: 'Checkout / Panel', type: 'FRAME', devStatus: ready, children: [
          { id: '2:2', name: 'Deeper', type: 'FRAME', devStatus: ready, children: [] },
        ] },
      ] },
    ]));
    expect(d.findCompositions().map(c => c.id)).toEqual(['2:0']);
  });

  it('lists a marked frame whose only marked ancestor chain is broken by an unmarked frame', () => {
    const d = new ComponentDiscovery(doc([
      { id: '2:0', name: 'Wrapper', type: 'FRAME', children: [
        { id: '2:1', name: 'Home', type: 'FRAME', devStatus: ready, children: [] },
      ] },
    ]));
    expect(d.findCompositions().map(c => c.id)).toEqual(['2:1']);
  });

  it('does not list a marked COMPONENT or COMPONENT_SET as a composition', () => {
    const d = new ComponentDiscovery(doc([
      { id: '2:0', name: 'Button', type: 'COMPONENT_SET', devStatus: ready, children: [] },
    ]));
    expect(d.findCompositions()).toHaveLength(0);
  });

  it('leaves component discovery unchanged when compositions are present', () => {
    const d = new ComponentDiscovery(doc([
      { id: '2:0', name: 'Checkout', type: 'FRAME', devStatus: ready, children: [
        { id: '2:1', name: 'Button', type: 'COMPONENT', children: [] },
      ] },
    ]));
    // A component inside a composition is still a component of the library.
    expect(d.findAllComponents().map(c => c.id)).toEqual(['2:1']);
  });
});

describe('listableCompositions', () => {
  it('sorts by name for stable diffs', () => {
    const { compositions } = listableCompositions(
      [frame('3:0', 'Trips'), frame('1:0', 'Account'), frame('2:0', 'Home')]
    );
    expect(compositions.map(c => c.name)).toEqual(['Account', 'Home', 'Trips']);
  });

  it('drops a frame whose name yields no spec key, and reports it', () => {
    const { compositions, unnameable } = listableCompositions(
      [frame('1:0', '  '), frame('2:0', 'Home')]
    );
    expect(compositions.map(c => c.id)).toEqual(['2:0']);
    expect(unnameable.map(c => c.id)).toEqual(['1:0']);
  });

  it('rejects exactly the names the writer could not have named', () => {
    // The guard and the writer share one derivation, so a name the guard passes is a
    // name the writer can use. Without that, a whitespace-named frame passed a
    // formatKey check and the writer then put it in a folder called `component`.
    expect(specFolderKey(' ')).toBeNull();
    expect(specFolderKey('/ - /')).toBeNull();
    expect(specFolderKey('Home / Large')).toBe('homeLarge');

    const { compositions, unnameable } = listableCompositions([
      frame('1:0', ' '), frame('2:0', '/ - /'), frame('3:0', 'Home / Large'),
    ]);
    expect(compositions.map(c => c.id)).toEqual(['3:0']);
    expect(unnameable.map(c => c.id)).toEqual(['1:0', '2:0']);
  });

  it('drops an authoring-aid frame, and counts it separately from an unnameable one', () => {
    const { compositions, authoringAids } = listableCompositions(
      [frame('1:0', 'Examples / Home'), frame('2:0', 'Home')],
      { exclude: ['Examples / {S}'] }
    );
    expect(compositions.map(c => c.id)).toEqual(['2:0']);
    expect(authoringAids).toBe(1);
  });
});

describe('the Compositions manifest section', () => {
  const manifest = [
    '**Scan format version:** 2  ',
    '**File:** /tmp/library.file.json',
    '',
    '## Components',
    '',
    '| ✓ | Name | ID | Type | Dev Status |',
    '|---|------|----|------|------------|',
    '| [x] | Button | 1:23 | COMPONENT_SET | READY_FOR_DEV |',
    '',
    '## Compositions',
    '',
    '_Frames marked `READY_FOR_DEV` in Figma._',
    '',
    '| ✓ | Name | ID | Type | Dev Status |',
    '|---|------|----|------|------------|',
    '| [x] | Checkout \\| Small | 3:67 | FRAME | READY_FOR_DEV |',
    '| [ ] | Home | 3:68 | FRAME | READY_FOR_DEV |',
    '',
    '## Glyphs',
    '',
    '| Name | ID | Type |',
    '|------|------|------|',
    '| Glyph / arrow | 9:1 | COMPONENT |',
  ].join('\n');

  it('parses the checkbox, so a composition can be curated', () => {
    const { compositions } = ManifestParserV2.parse(manifest);
    expect(compositions).toHaveLength(2);
    expect(compositions[0]).toEqual({
      id: '3:67',
      name: 'Checkout | Small',
      type: 'FRAME',
      included: true,
      devStatus: 'READY_FOR_DEV',
    });
    expect(compositions[1].included).toBe(false);
  });

  it('keeps the Components section unaffected, and does not absorb Glyph rows', () => {
    const { components, compositions, warnings } = ManifestParserV2.parse(manifest);
    expect(components.map(c => c.id)).toEqual(['1:23']);
    expect(compositions.map(c => c.id)).toEqual(['3:67', '3:68']);
    expect(warnings).toHaveLength(0);
  });

  it('yields an empty compositions list when the section is absent', () => {
    const withoutSection = manifest.slice(0, manifest.indexOf('## Compositions'));
    expect(ManifestParserV2.parse(withoutSection).compositions).toEqual([]);
  });
});

/**
 * Compositions curate exactly as components do (ADR-095) — the same functions, so
 * these pin that the shared machinery behaves for a set whose every member is marked.
 */
describe('composition curation', () => {
  const marked = (id: string, name: string): ComponentInfo =>
    ({ id, name, type: 'FRAME', devStatus: 'READY_FOR_DEV' });

  it('checks every composition on a first scan, since eligibility is the marking', () => {
    const defaults = deriveDefaultInclusion([marked('1:0', 'Home'), marked('2:0', 'Checkout')], 'READY_FOR_DEV');
    expect([...defaults.values()]).toEqual([true, true]);
  });

  it('sustains a check recorded by a previous scan', () => {
    const current = [marked('1:0', 'Home'), marked('2:0', 'Checkout')];
    const prior = [
      { id: '1:0', name: 'Home', type: 'FRAME' as const, included: true, devStatus: 'READY_FOR_DEV' },
      { id: '2:0', name: 'Checkout', type: 'FRAME' as const, included: false, devStatus: 'READY_FOR_DEV' },
    ];
    const defaults = deriveDefaultInclusion(current, 'READY_FOR_DEV');
    const { rows, stats } = mergeRows(current, prior, defaults, false);

    // An eligible composition is always READY_FOR_DEV, so devStatus never changes and
    // the recorded checkbox always wins — which is the whole of "sustain the check".
    expect(rows.find(r => r.id === '1:0')!.included).toBe(true);
    expect(rows.find(r => r.id === '2:0')!.included).toBe(false);
    expect(stats.preserved).toBe(2);
    expect(stats.flippedByFigma).toBe(0);
  });

  it('adds a newly marked frame checked, and drops one that lost its marking', () => {
    const prior = [
      { id: '1:0', name: 'Home', type: 'FRAME' as const, included: false, devStatus: 'READY_FOR_DEV' },
      { id: '9:0', name: 'Retired', type: 'FRAME' as const, included: true, devStatus: 'READY_FOR_DEV' },
    ];
    const current = [marked('1:0', 'Home'), marked('2:0', 'Inbox')];
    const { rows, stats } = mergeRows(current, prior, deriveDefaultInclusion(current, 'READY_FOR_DEV'), false);

    expect(rows.map(r => r.id)).toEqual(['1:0', '2:0']);
    expect(rows.find(r => r.id === '1:0')!.included).toBe(false); // hand-unchecked, kept
    expect(rows.find(r => r.id === '2:0')!.included).toBe(true);  // newly marked
    expect(stats.added).toBe(1);
    expect(stats.removed).toBe(1);
  });
});
