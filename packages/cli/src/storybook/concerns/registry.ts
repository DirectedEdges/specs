// Ordered concern registry — the order is the sidebar's reading order.
import type { Concern } from './types.js';
import { overview } from './overview/index.js';
import { foundations } from './foundations/index.js';
import { components } from './components/index.js';
import { analysis } from './analysis/index.js';
import { versions } from './versions/index.js';

export const registry: Concern[] = [overview, foundations, components, analysis, versions];

export function concernNames(): string[] {
  return registry.map((c) => c.name);
}
