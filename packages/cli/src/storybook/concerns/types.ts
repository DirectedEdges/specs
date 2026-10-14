// The concern interface `specs storybook publish` iterates (architecture §3).
import type { Workspace } from '../workspace.js';

/** One file a concern wants on disk, relative to storybook/content/<concern>/. */
export interface BuiltFile {
  path: string;
  content: string;
}

export interface Concern {
  name: string;
  /** Whether the workspace has the data this concern builds from. */
  detect(ws: Workspace): boolean;
  /** Build every file for this concern. Paths are relative to content/<name>/. */
  build(ws: Workspace): Promise<BuiltFile[]>;
}
