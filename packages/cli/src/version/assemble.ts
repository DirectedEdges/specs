/**
 * Component assembly — parse a component's concern files into one object, tagging
 * each section with its source concern, plus workspace discovery helpers.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import type { AssembledComponent, ConcernDoc, LedgerRun } from './types.js';
import { resolveSpecsLayout } from '../utilities/specsLayout.js';

/**
 * The directory a specs root keeps its component spec folders in (ADR-096) —
 * `components/`, or the root itself for a directory that predates it, which is how
 * a versioned snapshot cut before the layout change still reads.
 *
 * Versioning covers components only. A composition arranges components and declares
 * no contract of its own, so there is nothing about it a consumer could depend on
 * and nothing for a semver rule to grade.
 */
export function componentsDirOf(specsDir: string): string {
  return resolveSpecsLayout(specsDir).dirFor('component');
}

/** Component spec folder names inside a specs/ directory. */
export function componentNames(specsDir: string): string[] {
  const dir = componentsDirOf(specsDir);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(name => !name.startsWith('_') && !name.startsWith('.'))
    .filter(name => fs.statSync(path.join(dir, name)).isDirectory())
    .filter(name => fs.readdirSync(path.join(dir, name)).some(f => /\.ya?ml$/.test(f)))
    .sort();
}

/** Parse every concern file in the component's folder. */
export function assemble(specsDir: string, name: string): AssembledComponent {
  const dir = path.join(componentsDirOf(specsDir), name);
  const concerns: Record<string, ConcernDoc> = {};
  for (const file of fs.readdirSync(dir).sort()) {
    if (!/\.ya?ml$/.test(file)) continue;
    const concern = file.replace(/\.ya?ml$/, '');
    const parsed = yaml.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    if (parsed && typeof parsed === 'object') concerns[concern] = parsed as ConcernDoc;
  }
  const title = typeof concerns.api?.title === 'string' ? (concerns.api.title as string) : name;
  return { name, title, concerns };
}

export function assembleAll(specsDir: string): Map<string, AssembledComponent> {
  const map = new Map<string, AssembledComponent>();
  for (const name of componentNames(specsDir)) map.set(name, assemble(specsDir, name));
  return map;
}

/** `DE Primary Button` → `dePrimaryButton`, matching how spec folders are named. */
export function slugify(title: string): string {
  return title
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .map((word, i) => (i === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1)))
    .join('');
}

// ---------------------------------------------------------------- run metadata

export interface RunMetadata {
  author?: string;
  run: LedgerRun;
  schemaVersion?: string;
  generatorVersion?: string;
}

/** Read `latest.metadata.yaml` beside the specs (ADR-089). Absent file → empty facts. */
export function readRunMetadata(specsDir: string): RunMetadata {
  for (const ext of ['yaml', 'yml', 'json']) {
    const file = path.join(specsDir, `latest.metadata.${ext}`);
    if (!fs.existsSync(file)) continue;
    try {
      const raw = fs.readFileSync(file, 'utf8');
      const doc = (ext === 'json' ? JSON.parse(raw) : yaml.parse(raw)) as Record<string, any>;
      return {
        author: typeof doc?.author === 'string' ? doc.author : undefined,
        run: {
          generatorVersion: doc?.generator?.version !== undefined ? String(doc.generator.version) : undefined,
          schemaVersion: doc?.schema?.version !== undefined ? String(doc.schema.version) : undefined,
        },
      };
    } catch {
      return { run: {} };
    }
  }
  return { run: {} };
}

// ---------------------------------------------------------------- workspace

export interface Workspace {
  root: string;
  specsDir: string;
  assetsDir: string;
  versionsDir: string;
}

/**
 * Resolve a workspace from a directory: the root is the folder that contains
 * `specs/`. Accepts the root itself or its specs/ directory.
 */
export function resolveWorkspace(dir: string): Workspace {
  const abs = path.resolve(dir);
  const root = path.basename(abs) === 'specs' && fs.existsSync(abs) ? path.dirname(abs) : abs;
  const specsDir = path.join(root, 'specs');
  if (!fs.existsSync(specsDir)) {
    throw new Error(`Not a spec workspace: no specs/ directory under ${root}`);
  }
  return {
    root,
    specsDir,
    assetsDir: path.join(root, 'assets'),
    versionsDir: path.join(root, 'versions'),
  };
}
