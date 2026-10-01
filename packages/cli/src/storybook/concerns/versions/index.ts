// The versions concern: a placeholder until the versions index lands, so the
// section holds its place in the navigation.
import type { Concern, BuiltFile } from '../types.js';
import { readTemplate } from '../../templates.js';

export const versions: Concern = {
  name: 'versions',
  detect(): boolean {
    return true;
  },
  async build(): Promise<BuiltFile[]> {
    return [{ path: 'Stub.stories.tsx', content: readTemplate('pages/VersionsStub.stories.tsx.tpl') }];
  },
};
