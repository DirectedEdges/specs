import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { PayloadSplitter, splitDirFor } from '../../../src/utilities/payloadSplit.js';
import { SectionedFile } from '../../../src/utilities/sectionedFile.js';

// The committed cross-page fixture encodes the specs#558 audit findings:
// P1 "Components" holds an instance of a component defined on P2 "Parts"
// (cross-page structural dependency), P2's component contains an instance of a
// component on P4 "Deep" (chained fault), an instance references a component in
// NO page (remote-library — must not fault), and P3 "Decoys" is referenced by
// nothing (must never load; its strings contain decoy key text).
const FIXTURE = join(__dirname, '../../fixtures/sectioned/cross-page.file.json');

const P1 = '1:0', P2 = '2:0', P3 = '3:0', P4 = '4:0';

describe('SectionedFile', () => {
  let dataDir: string;

  beforeAll(async () => {
    dataDir = mkdtempSync(join(tmpdir(), 'specs-sectioned-'));
    const splitter = new PayloadSplitter(splitDirFor(dataDir, 'library'));
    splitter.write(readFileSync(FIXTURE));
    await splitter.finish();
  });

  afterAll(() => rmSync(dataDir, { recursive: true, force: true }));

  it('open returns null when the split artifact is absent', () => {
    expect(SectionedFile.open(dataDir, 'nope')).toBeNull();
  });

  it('open refuses an unknown format version instead of misreading it', async () => {
    const dir = splitDirFor(dataDir, 'future');
    const splitter = new PayloadSplitter(dir);
    splitter.write(readFileSync(FIXTURE));
    await splitter.finish();
    const manifestPath = join(dir, 'manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    manifest.formatVersion = 999;
    writeFileSync(manifestPath, JSON.stringify(manifest));
    expect(() => SectionedFile.open(dataDir, 'future')).toThrow(/v999/);
  });

  it('root() carries the maps with children emptied, as a fresh copy per call', () => {
    const file = SectionedFile.open(dataDir, 'library')!;
    const root = file.root();
    expect((root.document as { children: unknown[] }).children).toEqual([]);
    expect((root.components as Record<string, { key: string }>)['2:200'].key).toBe('k-icon-star');
    (root as { name: string }).name = 'mutated';
    expect((file.root() as { name: string }).name).toBe('Cross-page fixture library');
  });

  it('locates a node id in its defining page, and returns null for remote ids', () => {
    const file = SectionedFile.open(dataDir, 'library')!;
    expect(file.locatePageOfNodeId('2:200')?.id).toBe(P2);
    expect(file.locatePageOfNodeId('4:400')?.id).toBe(P4);
    expect(file.locatePageOfNodeId('9:900')).toBeNull();
  });

  it('assembles the seed page plus the transitive cross-page closure — and nothing else', () => {
    const file = SectionedFile.open(dataDir, 'library')!;
    const { json, stats } = file.assembleDocument([P1]);

    // P2 faulted (component 2:200 / its set 2:250), P4 chained, P3 never loaded.
    expect(stats.pagesLoaded).toEqual([P1, P2, P4]);
    expect(stats.faults.map(f => f.pageId)).toEqual([P2, P4]);
    expect(['2:200', '2:250']).toContain(stats.faults[0].causedBy);
    expect(stats.faults[1].causedBy).toBe('4:400');
    expect(stats.pagesTotal).toBe(4);

    // Remote references resolve to no page and do not fault.
    expect(stats.remoteIds).toContain('9:900');
    expect(stats.remoteIds).toContain('9:950');

    const children = (json.document as { children: Array<{ id: string }> }).children;
    expect(children.map(c => c.id)).toEqual([P1, P2, P4]);
  });

  it('assembling every page reproduces the monolithic payload exactly', () => {
    const file = SectionedFile.open(dataDir, 'library')!;
    const all = file.assembleDocument([P1, P2, P3, P4]);
    expect(all.json).toEqual(JSON.parse(readFileSync(FIXTURE, 'utf-8')));
    expect(all.stats.faults).toEqual([]);
  });

  it('reports fault events through the callback as they happen', () => {
    const file = SectionedFile.open(dataDir, 'library')!;
    const seen: string[] = [];
    file.assembleDocument([P1], f => seen.push(f.pageName));
    expect(seen).toEqual(['Parts', 'Deep']);
  });

  it('loadPage parses a single page; releasePage drops its cached bytes', () => {
    const file = SectionedFile.open(dataDir, 'library')!;
    const entry = file.pageEntries().find(e => e.id === P4)!;
    const page = file.loadPage(entry) as { name: string };
    expect(page.name).toBe('Deep');
    file.releasePage(P4); // no observable failure — just cache hygiene
    expect((file.loadPage(entry) as { name: string }).name).toBe('Deep');
  });

  it('rejects a seed page id that is not in the manifest', () => {
    const file = SectionedFile.open(dataDir, 'library')!;
    expect(() => file.assembleDocument(['no:such'])).toThrow(/not in the split manifest/);
  });
});
