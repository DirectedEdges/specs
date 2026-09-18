/**
 * Type-level tests for SpecConcernDocument and Metadata.concern (ADR-091).
 * These files are intentionally never executed — they are compiled with tsc
 * to assert that the type shape is correct.
 */
import type { SpecConcernDocument, Concern, Metadata } from '../types/index.js';

const source: Metadata['source'] = {
  pageId: '0:1',
  nodeId: '1:2',
  nodeType: 'COMPONENT',
};

// An api document: title and anatomy, no default block.
const api: SpecConcernDocument = {
  metadata: { source, concern: 'api' },
  title: 'DE Favorite button',
  anatomy: { root: { type: 'container' } },
};

// A variants document: the reverse — a default block, no title or anatomy.
const variants: SpecConcernDocument = {
  metadata: { source, concern: 'variants' },
  default: { elements: {} },
};

// metadata is the one required property.
// @ts-expect-error — a concern document must carry metadata
const noMetadata: SpecConcernDocument = { title: 'DE Favorite button' };

// The concern vocabulary is closed.
const known: Concern[] = ['api', 'styling', 'variants'];
// @ts-expect-error — 'tokens' is not a concern
const unknown: Concern = 'tokens';

// concern is optional on Metadata, so a single-file component omits it.
const wholeComponent: Metadata = { source };

void api; void variants; void noMetadata; void known; void unknown; void wholeComponent;
