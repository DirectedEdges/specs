// Examples/registry loading — the OPEN half of what was slotComposition.ts.
// The stylesheet transformer needs the examples images registry; the
// composition core (JSX emission) lives in @directededges/react-from-specs.
import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';

/** Layout entries are element names, or { name: [childEntries] } for nesting. */
export type SlotLayoutEntry = string | Record<string, SlotLayoutEntry[]>;

export interface SlotExample {
  anatomy?: Record<string, Record<string, unknown>>;
  elements: Record<string, Record<string, unknown>>;
  layout: SlotLayoutEntry[];
}

/** ADR-063 images registry entry: src when resolved, Figma identity always. */
export interface ImageEntry {
  src?: string;
  $extensions?: { 'com.figma'?: { imageHash?: string } };
}

export interface ExamplesData {
  main: Record<string, SlotExample>;
  subs: Record<string, Record<string, SlotExample>>;
  /** Component images registry (ADR-063), keyed by image id. */
  images: Record<string, ImageEntry>;
}


/** Parse <componentDir>/examples.yaml, if present. */
export function loadExamples(componentDir: string): ExamplesData | undefined {
  const p = path.join(componentDir, 'examples.yaml');
  if (!fs.existsSync(p)) return undefined;
  const parsed = yaml.parse(fs.readFileSync(p, 'utf-8')) as Record<string, unknown> | null;
  if (!parsed) return undefined;
  const main = (parsed.slotContentExamples ?? {}) as Record<string, SlotExample>;
  const images = (parsed.images ?? {}) as Record<string, ImageEntry>;
  const subs: ExamplesData['subs'] = {};
  const subBlocks = (parsed.subcomponents ?? {}) as Record<string, Record<string, unknown>>;
  for (const [k, block] of Object.entries(subBlocks)) {
    subs[k] = (block.slotContentExamples ?? {}) as Record<string, SlotExample>;
    Object.assign(images, (block.images ?? {}) as Record<string, ImageEntry>);
  }
  return { main, subs, images };
}

