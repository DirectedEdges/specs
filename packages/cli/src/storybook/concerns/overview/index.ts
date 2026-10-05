// The overview concern: the Getting-started page, which also makes the
// Overview section exist — Storybook renders a root only when an entry sits
// under it.
import type { Concern, BuiltFile } from '../types.js';
import { readTemplate } from '../../templates.js';

export const overview: Concern = {
  name: 'overview',
  detect(): boolean {
    return true;
  },
  async build(): Promise<BuiltFile[]> {
    return [{ path: 'GettingStarted.stories.tsx', content: readTemplate('pages/GettingStarted.stories.tsx.tpl') }];
  },
};
