// The analysis concern: a placeholder until the analysis pages land, so the
// section holds its place in the navigation.
import type { Concern, BuiltFile } from '../types.js';
import { readTemplate } from '../../templates.js';

export const analysis: Concern = {
  name: 'analysis',
  detect(): boolean {
    return true;
  },
  async build(): Promise<BuiltFile[]> {
    return [{ path: 'Stub.stories.tsx', content: readTemplate('pages/AnalysisStub.stories.tsx.tpl') }];
  },
};
