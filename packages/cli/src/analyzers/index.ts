import type { Transformer } from '../types/Transformer.js';
import { DependenciesAnalyzer } from './Dependencies.js';
import { KeysAnalyzer } from './Keys.js';
import { PropsAnalyzer } from './Props.js';
import { StylingAnalyzer } from './Styling.js';

const ALL_ANALYZERS: Transformer[] = [
  new PropsAnalyzer(),
  new StylingAnalyzer(),
  new DependenciesAnalyzer(),
  new KeysAnalyzer(),
];

const BY_NAME = new Map(ALL_ANALYZERS.map(a => [a.name, a]));

/** Every analyzer, in declaration order — what a run with no names given does. */
export function allAnalyzers(): Transformer[] {
  return [...ALL_ANALYZERS];
}

/** The analyzer names a run may ask for, for help text and error messages. */
export function availableAnalyzerNames(): string[] {
  return ALL_ANALYZERS.map(a => a.name);
}

export function resolveAnalyzers(names: string[]): Transformer[] {
  if (names.length === 0) return allAnalyzers();
  const resolved: Transformer[] = [];
  for (const name of names) {
    const a = BY_NAME.get(name);
    if (a) {
      resolved.push(a);
    } else {
      console.warn(`Warning: unknown analyzer "${name}" — skipping`);
    }
  }
  return resolved;
}
