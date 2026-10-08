// `specs testing visual status` — present or missing per shootable variant,
// and nothing more. No staleness model: capture is overt (specs#588), so
// there is no trigger to compute, and missing is knowable with no model at
// all. What the report does carry is provenance — each capture record's
// capturedAt beside the payload's fetch time — so a human can see a baseline
// predates the design without the tool pretending to know what changed.
import fs from 'fs-extra';
import path from 'path';
import type { VisualWorkspace } from './paths.js';
import { readJson, sanitizeNodeId } from './paths.js';
import { manifestEntries, type Manifest, type SpecKind } from './types.js';

export interface WorklistItem {
  kind: SpecKind;
  key: string;
  fileKey: string;
  nodeId: string;
  dest: string;
}

export interface Worklist {
  missing: WorklistItem[];
  present: number;
  /** capturedAt per kind/key, read from .capture.json — provenance, not a trigger. */
  provenance: Record<string, { capturedAt: string | null }>;
}

export function worklist(vw: VisualWorkspace, manifest: Manifest, only?: Set<string> | null): Worklist {
  const missing: WorklistItem[] = [];
  const provenance: Worklist['provenance'] = {};
  let present = 0;

  for (const [kind, key, entry] of manifestEntries(manifest, only)) {
    const dir = vw.dirFor('figma', kind, key);
    const capturePath = path.join(dir, '.capture.json');
    provenance[`${kind}/${key}`] = {
      capturedAt: fs.existsSync(capturePath)
        ? (readJson<{ capturedAt?: string }>(capturePath).capturedAt ?? null)
        : null,
    };
    for (const variant of entry.children) {
      if (variant.status !== 'shootable') continue;
      const dest = path.join(dir, `${sanitizeNodeId(variant.nodeId)}.png`);
      if (fs.existsSync(dest)) present += 1;
      else missing.push({ kind, key, fileKey: entry.fileKey, nodeId: variant.nodeId, dest });
    }
  }
  return { missing, present, provenance };
}

export function runStatus(vw: VisualWorkspace, opts: { components?: string[]; json?: boolean }): Worklist {
  const manifest = readJson<Manifest>(vw.manifestPath);
  const only = opts.components?.length ? new Set(opts.components) : null;
  const list = worklist(vw, manifest, only);

  if (opts.json) {
    console.log(JSON.stringify(list, null, 2));
    return list;
  }

  console.log(`baselines: ${list.present} present, ${list.missing.length} missing`);
  const byKey = new Map<string, WorklistItem[]>();
  for (const item of list.missing) {
    const k = `${item.kind}/${item.key}`;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k)!.push(item);
  }
  for (const [k, items] of byKey) {
    console.log(`  ${k} — ${items.length} to capture`);
  }
  return list;
}
