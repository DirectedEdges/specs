import type { Transformer } from '../Types/Transformer.js';
import { ContractTransformer } from './Contract.js';
import { CssTransformer } from './Css.js';
import { CssvarsTransformer } from './Cssvars.js';
// React/stories transforms live in the closed implementation package, consumed
// like the processing engine. The license gates Pro output inside the package.
import { ReactTransformer, StoriesTransformer } from '@directededges/react-from-specs';

const ALL_TRANSFORMERS: Transformer[] = [
  new ContractTransformer(),
  new CssTransformer(),
  new CssvarsTransformer(),
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
