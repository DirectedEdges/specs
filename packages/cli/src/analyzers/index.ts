import type { Transformer } from '../Types/Transformer.js';
import { DependenciesAnalyzer } from './Dependencies.js';
import { PropsAnalyzer } from './Props.js';
import { StylingAnalyzer } from './Styling.js';

const ALL_ANALYZERS: Transformer[] = [
  new PropsAnalyzer(),
  new StylingAnalyzer(),
  new DependenciesAnalyzer(),
];

const BY_NAME = new Map(ALL_ANALYZERS.map(a => [a.name, a]));

export function resolveAnalyzers(names: string[]): Transformer[] {
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
