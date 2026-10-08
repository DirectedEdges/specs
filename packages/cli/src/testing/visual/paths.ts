// Where visual-testing state lives, and the small file helpers every stage
// shares. State is the workspace's own `testing/visual/` directory — NOT under
// storybook/, which `specs storybook` generates wholesale and `init --force`
// rewrites; a hand-tuned ignore file kept there is a file waiting to be
// overwritten.
import fs from 'fs-extra';
import path from 'path';
import { resolveWorkspace, type Workspace } from '../../storybook/workspace.js';
import { kindDir, type SpecKind } from './types.js';

export interface VisualWorkspace {
  ws: Workspace;
  /** <workspace>/testing/visual */
  root: string;
  manifestPath: string;
  ignorePath: string;
  reportDir: string;
  /** figma | render | diff | accepted trees, keyed kind-first. */
  dirFor(tree: 'figma' | 'render' | 'diff' | 'accepted', kind: SpecKind, key: string): string;
}

export function resolveVisual(configPath?: string): VisualWorkspace {
  const ws = resolveWorkspace(configPath);
  const root = path.join(ws.root, 'testing', 'visual');
  return {
    ws,
    root,
    manifestPath: path.join(root, 'manifest.json'),
    ignorePath: path.join(root, 'visual-ignore.yaml'),
    reportDir: path.join(root, 'report'),
    dirFor(tree, kind, key) {
      return path.join(root, tree, kindDir(kind), key);
    },
  };
}

/** Node ids contain ':'; keep files portable. */
export function sanitizeNodeId(nodeId: string): string {
  return nodeId.replace(/:/g, '-');
}

export function readJson<T = unknown>(file: string): T {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}

export function writeJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}

/** The dev-server port from the scaffolded npm script, as serve.ts infers it. */
export function scaffoldPort(ws: Workspace): number | null {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(ws.storybookDir, 'package.json'), 'utf-8'),
    ) as { scripts?: { storybook?: string } };
    const m = pkg.scripts?.storybook?.match(/-p\s+(\d+)/);
    return m ? Number(m[1]) : null;
  } catch {
    return null;
  }
}
