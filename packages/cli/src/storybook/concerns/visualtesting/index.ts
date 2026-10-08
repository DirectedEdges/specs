// The visualtesting concern: the visual reports as generated Storybook pages
// (specs#716). Each diff mode keeps its own report and gets its own page —
// "Fidelity to Figma" (vs Figma exports) and "Changes vs Accepted" (vs the
// renders you promoted) answer different questions, and one page with a mode
// flag read as always-fidelity. A page publishes only when its report
// exists, so a regression-only workspace never sees a half-empty fidelity
// page.
//
// This replaces the three hand edits to .storybook/main.ts that used to
// mount the page: `init --force` owns that file now, so a hand edit is an
// edit waiting to be destroyed. The scaffolded host serves testing/visual/
// at /baselines; each page reads its report JSON live, so a re-diff updates
// it on reload with no republish.
import fs from 'fs-extra';
import path from 'path';
import type { Concern, BuiltFile } from '../types.js';
import type { Workspace } from '../../workspace.js';
import { readTemplate, renderTemplate } from '../../templates.js';

interface ModePage {
  /** Report basename, also the fetched file: report/<name>.json. */
  name: string;
  file: string;
  title: string;
  heading: string;
  baselineLabel: string;
  /** The diff flag that produces this report, for the empty-state hint. */
  diffFlag: string;
}

const PAGES: ModePage[] = [
  {
    name: 'fidelity',
    file: 'FidelityToFigma.stories.tsx',
    title: 'Fidelity to Figma',
    heading: 'Fidelity to Figma',
    baselineLabel: 'Figma exports',
    diffFlag: '',
  },
  {
    name: 'regression',
    file: 'ChangesVsAccepted.stories.tsx',
    title: 'Changes vs Accepted',
    heading: 'Changes vs accepted renders',
    baselineLabel: 'last accepted renders',
    diffFlag: ' --against accepted',
  },
];

function reportDir(ws: Workspace): string {
  return path.join(ws.root, 'testing', 'visual', 'report');
}

function present(ws: Workspace): ModePage[] {
  return PAGES.filter((p) => fs.existsSync(path.join(reportDir(ws), `${p.name}.json`)));
}

export const visualtesting: Concern = {
  name: 'visualtesting',

  detect(ws: Workspace): boolean {
    return present(ws).length > 0;
  },

  async build(ws: Workspace): Promise<BuiltFile[]> {
    const template = readTemplate('pages/VisualReport.stories.tsx.tpl');
    return present(ws).map((p) => ({
      path: p.file,
      content: renderTemplate(template, {
        REPORT_NAME: p.name,
        PAGE_TITLE: p.title,
        PAGE_HEADING: p.heading,
        BASELINE_LABEL: p.baselineLabel,
        DIFF_FLAG: p.diffFlag,
      }),
    }));
  },
};
