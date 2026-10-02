// The analysis concern: one page per analysis found in specs/_analysis/, each
// a Report tab (the dashboard, per-analysis subissues) and a Specs tab viewing
// the analysis's own YAML. The section exists only when at least one analysis
// does — `specs analyze` writing its first file is what creates it.
import fs from 'fs-extra';
import path from 'path';
import type { Concern, BuiltFile } from '../types.js';
import type { Workspace } from '../../workspace.js';
import { readTemplate, renderTemplate } from '../../templates.js';

interface AnalysisEntry {
  /** The filename prefix before the first dot: props, styling, dependencies… */
  id: string;
  /** PascalCase id, doubling as the page title and component name. */
  title: string;
  files: string[];
}

export function discoverAnalyses(ws: Workspace): AnalysisEntry[] {
  const dir = path.join(ws.specsDir, '_analysis');
  if (!fs.existsSync(dir)) return [];
  const byId = new Map<string, string[]>();
  for (const entry of fs.readdirSync(dir).sort()) {
    if (!entry.endsWith('.yaml') && !entry.endsWith('.yml')) continue;
    const id = entry.split('.')[0];
    if (!id) continue;
    byId.set(id, [...(byId.get(id) ?? []), entry]);
  }
  return [...byId.entries()].map(([id, files]) => ({
    id,
    title: id.charAt(0).toUpperCase() + id.slice(1).replace(/[^A-Za-z0-9]/g, ''),
    files,
  }));
}

export const analysis: Concern = {
  name: 'analysis',

  detect(ws: Workspace): boolean {
    return discoverAnalyses(ws).length > 0;
  },

  async build(ws: Workspace): Promise<BuiltFile[]> {
    const analyses = discoverAnalyses(ws);
    const template = readTemplate('pages/Analysis.stories.tsx.tpl');
    const out: BuiltFile[] = [
      { path: 'data/analyses.json', content: JSON.stringify({ analyses }, null, 2) + '\n' },
    ];
    for (const entry of analyses) {
      out.push({
        path: `${entry.title}.stories.tsx`,
        content: renderTemplate(template, {
          ANALYSIS_ID: entry.id,
          ANALYSIS_TITLE: entry.title,
          ANALYSIS_FILES: JSON.stringify(entry.files),
        }),
      });
    }
    return out;
  },
};
