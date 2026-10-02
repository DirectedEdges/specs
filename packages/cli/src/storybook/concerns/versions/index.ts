// The versions concern: a placeholder page until the versions index lands
// (specs#641) — but only for a workspace that HAS versions. The section gates
// on the versions/ folder existing, exactly as analysis gates on
// specs/_analysis/ (specs#654): a shipped navigation carries no permanent
// "coming soon" for a feature the workspace has never used.
import fs from 'fs-extra';
import path from 'path';
import type { Workspace } from '../../workspace.js';
import type { Concern, BuiltFile } from '../types.js';
import { readTemplate } from '../../templates.js';

export const versions: Concern = {
  name: 'versions',
  detect(ws: Workspace): boolean {
    return fs.existsSync(path.join(ws.root, 'versions'));
  },
  async build(): Promise<BuiltFile[]> {
    return [{ path: 'Stub.stories.tsx', content: readTemplate('pages/VersionsStub.stories.tsx.tpl') }];
  },
};
