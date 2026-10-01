// The components concern: tabs.json, the navigation contract between what the
// workspace emitted and what the scaffolded manager registers (specs#642/#631).
// Specs is always present — it is the one view that needs no transform.
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

export const components: Concern = {
  name: 'components',

  // tabs.json must always exist: the scaffolded manager imports it at build
  // time, and the Specs view exists in every workspace.
  detect(): boolean {
    return true;
  },

  async build(ws: Workspace): Promise<BuiltFile[]> {
    return [{ path: 'tabs.json', content: JSON.stringify(deriveTabs(ws), null, 2) + '\n' }];
  },
};
