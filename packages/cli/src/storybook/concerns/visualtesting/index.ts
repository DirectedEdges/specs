// The visualtesting concern: the visual report as a generated Storybook page
// (specs#716). Exists only when the workspace has a report — `specs testing
// visual diff` writing its first one is what creates the section.
//
// This replaces the three hand edits to .storybook/main.ts that used to
// mount the page: `init --force` owns that file now, so a hand edit is an
// edit waiting to be destroyed. The scaffolded host already serves
// testing/visual/ at /baselines when it exists; this page reads the report
// JSON live, so a re-diff updates it on reload with no republish.
import fs from 'fs-extra';
import path from 'path';
import type { Concern, BuiltFile } from '../types.js';
import type { Workspace } from '../../workspace.js';
import { readTemplate } from '../../templates.js';

function reportPath(ws: Workspace): string {
  return path.join(ws.root, 'testing', 'visual', 'report', 'visual-report.json');
}

export const visualtesting: Concern = {
  name: 'visualtesting',

  detect(ws: Workspace): boolean {
    return fs.existsSync(reportPath(ws));
  },

  async build(_ws: Workspace): Promise<BuiltFile[]> {
    // No interpolation: the page fetches the report in the browser, and every
    // path it needs is fixed by the /baselines static mapping.
    return [
      { path: 'VisualReport.stories.tsx', content: readTemplate('pages/VisualReport.stories.tsx.tpl') },
    ];
  },
};
