// The components concern: tabs.json, the navigation contract between what the
// workspace emitted and what the scaffolded manager registers (specs#642/#631).
// Specs is always present — it is the one view that needs no transform.
import fs from 'fs-extra';
import path from 'path';
import type { Concern, BuiltFile } from '../types.js';
import type { Workspace } from '../../workspace.js';

export type TabId = 'react' | 'webcomponents' | 'specs';

export interface TabsJson {
  /** In fixed order: react, webcomponents, specs — absent platforms produce no tab. */
  tabs: TabId[];
  /** What the built-in canvas shows: the first tree that exists, else specs. */
  canvas: TabId;
}

export function deriveTabs(ws: Workspace): TabsJson {
  const tabs: TabId[] = [];
  if (ws.hasReact) tabs.push('react');
  if (ws.hasWebComponents) tabs.push('webcomponents');
  tabs.push('specs');
  return { tabs, canvas: tabs[0] };
}

export interface ModeControl {
  /** Collection name, as the cssvars modes manifest keys it. */
  name: string;
  /** The data attribute the stylesheet switches on. */
  attr: string;
  /** Display name → the attribute value the stylesheet's mode block uses. */
  modes: Array<{ name: string; value: string }>;
  default: string;
}

export interface ModesJson {
  controls: ModeControl[];
}

/** Matches the cssvars emitters' kebabization of mode names into attr values. */
function kebabMode(name: string): string {
  return name.trim().replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/[\s_]+/g, '-').replace(/-+/g, '-').toLowerCase();
}

/**
 * Mode toolbar controls (specs#636): the author lists collections in
 * conventions/storybook.yaml under `modes.collections`, and each becomes a
 * toolbar dropdown driving the attribute the emitted stylesheet already
 * switches on. Nothing is inferred — no list, no controls; a listed name the
 * manifest does not carry warns by name (ADR-098).
 */
export function deriveModes(ws: Workspace, modesConventions: Record<string, unknown> | undefined): ModesJson {
  const where = 'conventions/storybook.yaml modes';
  const controls: ModeControl[] = [];
  if (!modesConventions) return { controls };
  for (const key of Object.keys(modesConventions)) {
    if (key !== 'collections') console.warn(`⚠ ${where}: unknown feature "${key}" ignored (known: collections)`);
  }
  const list = modesConventions.collections;
  if (list === undefined) return { controls };
  if (!Array.isArray(list) || !list.every((n) => typeof n === 'string')) {
    console.warn(`⚠ ${where}.collections: expected an ordered list of collection names. Ignoring.`);
    return { controls };
  }
  const manifestPath = path.join(ws.assetsDir, 'cssvars', 'modes.json');
  const manifest: Record<string, { attr?: string; modes?: string[]; default?: string }> =
    fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) : {};
  for (const name of list as string[]) {
    const entry = manifest[name];
    if (!entry?.attr || !Array.isArray(entry.modes) || entry.modes.length < 2 || !entry.default) {
      console.warn(`⚠ ${where}.collections: "${name}" has no switchable modes in assets/cssvars/modes.json — ignored.`);
      continue;
    }
    controls.push({
      name,
      attr: entry.attr,
      modes: entry.modes.map((m) => ({ name: m, value: kebabMode(m) })),
      default: entry.default,
    });
  }
  return { controls };
}

export const components: Concern = {
  name: 'components',

  // tabs.json must always exist: the scaffolded manager imports it at build
  // time, and the Specs view exists in every workspace.
  detect(): boolean {
    return true;
  },

  async build(ws: Workspace): Promise<BuiltFile[]> {
    return [
      { path: 'tabs.json', content: JSON.stringify(deriveTabs(ws), null, 2) + '\n' },
      {
        path: 'modes.json',
        content: JSON.stringify(deriveModes(ws, ws.config.conventions.storybook?.modes), null, 2) + '\n',
      },
    ];
  },
};
