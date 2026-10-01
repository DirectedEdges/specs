// What a workspace contains, read once per `specs storybook` run and handed to
// every concern. Detection only — nothing here writes.
import fs from 'fs-extra';
import path from 'path';
import { ConfigLoader } from '../Config/ConfigLoader.js';
import type { CLIConfig } from '../Types/CLIConfig.js';

export interface DataSource {
  /** The alias data files are named by: `<alias>.variables.json`, `<alias>.file/`. */
  alias: string;
  /** Which kinds this source fetches (file, variables, styles, icons). */
  fetch: string[];
}

export interface Workspace {
  /** Workspace root: the directory holding config/, data/, specs/, storybook/. */
  root: string;
  config: CLIConfig;
  specsDir: string;
  dataDir: string;
  assetsDir: string;
  storybookDir: string;
  sources: DataSource[];
  /** True when the platform tree has been emitted. */
  hasReact: boolean;
  hasWebComponents: boolean;
  hasSpecs: boolean;
  /** storybook/.storybook/ exists — init has run. */
  scaffolded: boolean;
}

export function resolveWorkspace(configPath?: string): Workspace {
  const loader = new ConfigLoader();
  const config = loader.load(configPath);
  const configDir = loader.resolveDirectory(configPath);
  // The workspace root is the directory that contains config/; with no config
  // on disk the current directory is the only root there is.
  const root = configDir ? path.dirname(configDir) : process.cwd();

  const specsDir = config.settings.spec.directory
    ? path.resolve(config.settings.spec.directory)
    : path.join(root, 'specs');
  const dataDir = config.settings.data?.directory
    ? path.resolve(config.settings.data.directory)
    : path.join(root, 'data');
  const assetsDir = config.settings.assets?.directory
    ? path.resolve(config.settings.assets.directory)
    : path.join(root, 'assets');

  const sources: DataSource[] = Object.entries(config.settings.data?.sources ?? {})
    .map(([alias, s]) => ({ alias, fetch: Array.isArray((s as { fetch?: string[] }).fetch) ? (s as { fetch: string[] }).fetch : [] }));

  const storybookDir = path.join(root, 'storybook');

  return {
    root,
    config,
    specsDir,
    dataDir,
    assetsDir,
    storybookDir,
    sources,
    hasReact: fs.existsSync(path.join(root, 'react', 'src')),
    hasWebComponents: fs.existsSync(path.join(root, 'webcomponents', 'src')),
    hasSpecs: fs.existsSync(specsDir),
    scaffolded: fs.existsSync(path.join(storybookDir, '.storybook')),
  };
}

/** Paths to a source's fetched payloads, existing ones only. */
export function sourcePayloads(ws: Workspace): {
  variables: Array<{ alias: string; file: string }>;
  styles: Array<{ alias: string; file: string }>;
  fileDirs: Array<{ alias: string; dir: string }>;
} {
  const variables: Array<{ alias: string; file: string }> = [];
  const styles: Array<{ alias: string; file: string }> = [];
  const fileDirs: Array<{ alias: string; dir: string }> = [];
  for (const s of ws.sources) {
    if (s.fetch.includes('variables')) {
      const f = path.join(ws.dataDir, `${s.alias}.variables.json`);
      if (fs.existsSync(f)) variables.push({ alias: s.alias, file: f });
    }
    if (s.fetch.includes('styles')) {
      const f = path.join(ws.dataDir, `${s.alias}.styles.json`);
      if (fs.existsSync(f)) styles.push({ alias: s.alias, file: f });
    }
    if (s.fetch.includes('file')) {
      const d = path.join(ws.dataDir, `${s.alias}.file`);
      if (fs.existsSync(path.join(d, 'root.json'))) fileDirs.push({ alias: s.alias, dir: d });
    }
  }
  return { variables, styles, fileDirs };
}
