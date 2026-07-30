import type { Transformer } from '../Types/Transformer.js';
import { ContractTransformer } from './Contract.js';
import { CssTransformer } from './Css.js';
import { ReactTransformer } from './React.js';
import { StoriesTransformer } from './Stories.js';

const ALL_TRANSFORMERS: Transformer[] = [
  new ContractTransformer(),
  new CssTransformer(),
  new ReactTransformer(),
  new StoriesTransformer(),
];

const BY_NAME = new Map(ALL_TRANSFORMERS.map(t => [t.name, t]));

export const DEFAULT_TRANSFORMERS = ['contract'];

export function resolveTransformers(names: string[]): Transformer[] {
  const resolved: Transformer[] = [];
  for (const name of names) {
    const t = BY_NAME.get(name);
    if (t) {
      resolved.push(t);
    } else {
      console.warn(`Warning: unknown transformer "${name}" — skipping`);
    }
  }
  return resolved;
}
