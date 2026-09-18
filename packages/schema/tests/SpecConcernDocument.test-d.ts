/**
 * Type-level tests for SpecConcernDocument and Metadata.concern (ADR-091).
 * These files are intentionally never executed — they are compiled with tsc
 * to assert that the type shape is correct.
 */
import type { SpecConcernDocument, SpecConcernSubcomponent, Concern, Metadata } from '../types/index.js';

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
const known: Concern[] = ['api', 'variants', 'examples'];
// @ts-expect-error — 'tokens' is not a concern
const unknown: Concern = 'tokens';

// concern is optional on Metadata, so a single-file component omits it.
const wholeComponent: Metadata = { source };

// A subcomponent inside a concern document is sliced by the same concern, so
// it is not held to the whole-subcomponent requirements either.
const slicedSub: SpecConcernSubcomponent = {
  anatomy: { root: { type: 'container' } },
};
const apiWithSubs: SpecConcernDocument = {
  metadata: { source, concern: 'api' },
  title: 'DE Action list',
  subcomponents: { group: slicedSub },
};

// @ts-expect-error — a concern document's subcomponent carries no metadata
const subWithMetadata: SpecConcernSubcomponent = { metadata: { source } };

void api; void variants; void noMetadata; void known; void unknown; void wholeComponent;
void slicedSub; void apiWithSubs; void subWithMetadata;
