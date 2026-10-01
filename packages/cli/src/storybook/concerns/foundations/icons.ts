// Icon foundations: what the workspace has against what the specs reference
// (specs#608). A spec naming a glyph nobody fetched is the failure the page
// exists to make visible, so icons.json carries missing[] beside present[].
import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';

export interface IconsJson {
  present: Array<{ name: string; referenced: boolean }>;
  missing: Array<{ name: string; referencedBy: string[] }>;
}

/**
 * Asset-file naming used by `specs fetch`, mirrored from the emitters'
 * glyph slug rule so the diff compares like with like.
 */
function slugify(name: string): string {
  return name.trim().replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/[\s_]+/g, '-').replace(/-+/g, '-').toLowerCase();
}

/** Element keys whose anatomy type renders as a glyph, subcomponents included. */
function glyphKeys(api: Record<string, unknown>): Set<string> {
  const keys = new Set<string>();
  const collect = (anatomy: unknown) => {
    if (!anatomy || typeof anatomy !== 'object') return;
    for (const [key, element] of Object.entries(anatomy as Record<string, unknown>)) {
      const type = (element as Record<string, unknown> | null)?.type;
      if (type === 'glyph' || type === 'vector') keys.add(key);
    }
  };
  collect(api.anatomy);
  const subs = api.subcomponents;
  if (subs && typeof subs === 'object') {
    for (const sub of Object.values(subs as Record<string, unknown>)) {
      collect((sub as Record<string, unknown> | null)?.anatomy);
    }
  }
  return keys;
}

/** Literal glyph names: `content` strings on glyph elements, anywhere in the document. */
function collectRefs(doc: unknown, keys: Set<string>, into: Set<string>): void {
  if (!doc || typeof doc !== 'object') return;
  for (const [key, value] of Object.entries(doc as Record<string, unknown>)) {
    if (keys.has(key) && value && typeof value === 'object') {
      const content = (value as Record<string, unknown>).content;
      if (typeof content === 'string') into.add(content);
    }
    collectRefs(value, keys, into);
  }
}

/** Every `*.yaml` under a component folder, recursively. */
function yamlFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...yamlFiles(full));
    else if (entry.name.endsWith('.yaml')) out.push(full);
  }
  return out;
}

export function buildIconsData(specsDir: string, iconsDir: string): IconsJson | null {
  const files = fs.existsSync(iconsDir)
    ? fs.readdirSync(iconsDir).filter((f) => f.endsWith('.svg')).map((f) => f.replace(/\.svg$/, '')).sort()
    : [];

  // slug → component keys referencing it
  const referenced = new Map<string, Set<string>>();
  if (fs.existsSync(specsDir)) {
    const componentDirs = fs.readdirSync(specsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith('_'))
      .map((e) => e.name)
      .sort();
    for (const componentKey of componentDirs) {
      const dir = path.join(specsDir, componentKey);
      const apiPath = path.join(dir, 'api.yaml');
      if (!fs.existsSync(apiPath)) continue;
      let api: Record<string, unknown>;
      try {
        api = yaml.parse(fs.readFileSync(apiPath, 'utf-8')) as Record<string, unknown>;
      } catch {
        continue;
      }
      const keys = glyphKeys(api);
      if (keys.size === 0) continue;
      const names = new Set<string>();
      for (const file of yamlFiles(dir)) {
        try {
          collectRefs(yaml.parse(fs.readFileSync(file, 'utf-8')), keys, names);
        } catch {
          // An unparseable spec file is some other command's problem to report.
        }
      }
      for (const name of names) {
        const slug = slugify(name);
        const set = referenced.get(slug) ?? new Set<string>();
        set.add(componentKey);
        referenced.set(slug, set);
      }
    }
  }

  if (files.length === 0 && referenced.size === 0) return null;

  const fileSet = new Set(files);
  return {
    present: files.map((name) => ({ name, referenced: referenced.has(name) })),
    missing: [...referenced.entries()]
      .filter(([slug]) => !fileSet.has(slug))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([slug, by]) => ({ name: slug, referencedBy: [...by].sort() })),
  };
}
