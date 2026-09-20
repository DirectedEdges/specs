/**
 * Shared helpers for the versioning suite: build a throwaway workspace on disk
 * from the checked-in fixture specs, and edit YAML in place to simulate change
 * classes.
 */

import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';

export const FIXTURES = path.join(__dirname, '../../fixtures/version');

let counter = 0;

/** A fresh workspace directory seeded with the fixture specs. */
export function makeWorkspace(name: string): string {
  const dir = path.join(__dirname, `../../tmp/version-${name}-${Date.now()}-${counter++}`);
  fs.ensureDirSync(dir);
  fs.copySync(path.join(FIXTURES, 'base', 'specs'), path.join(dir, 'specs'));
  return dir;
}

export function removeWorkspace(dir: string): void {
  fs.removeSync(dir);
}

export function readYaml(workspace: string, relPath: string): any {
  return yaml.parse(fs.readFileSync(path.join(workspace, relPath), 'utf8'));
}

export function writeYaml(workspace: string, relPath: string, doc: unknown): void {
  const file = path.join(workspace, relPath);
  fs.ensureDirSync(path.dirname(file));
  fs.writeFileSync(file, yaml.stringify(doc));
}

/** Load, edit, and write back one YAML file. */
export function editYaml(workspace: string, relPath: string, edit: (doc: any) => void): void {
  const doc = readYaml(workspace, relPath);
  edit(doc);
  writeYaml(workspace, relPath, doc);
}

export function writeAsset(workspace: string, relPath: string, content: string): void {
  const file = path.join(workspace, 'assets', relPath);
  fs.ensureDirSync(path.dirname(file));
  fs.writeFileSync(file, content);
}
