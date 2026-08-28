import type { Transformer } from '../Types/Transformer.js';
import { ContractTransformer } from './Contract.js';
import { CssTransformer } from './Css.js';
import { CssvarsTransformer } from './Cssvars.js';
// React/stories and webcomponents transforms live in closed implementation
// packages, consumed like the processing engine. The license gates Pro output
// inside each package.
import { ReactTransformer, StoriesTransformer } from '@directededges/react-from-specs';
import { WebComponentsTransformer, WcStoriesTransformer } from '@directededges/webcomponents-from-specs';

const ALL_TRANSFORMERS: Transformer[] = [
  new ContractTransformer(),
  new CssTransformer(),
  new CssvarsTransformer(),
  new ReactTransformer(),
  new StoriesTransformer(),
  // Experimental — the Lit output is not yet stable.
  new WebComponentsTransformer(),
  new WcStoriesTransformer(),
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
