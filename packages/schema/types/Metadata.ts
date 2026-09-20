import { MetadataConventions } from './Conventions.js';
import { ResolvedSettings } from './Settings.js';

/**
 * Facts about the generation run that produced a set of component specs.
 *
 * Every key here is identical for every component produced by the same run —
 * none of them describe any one component. A run may state them once in a
 * document of its own rather than repeating them on each component (ADR-089).
 *
 * @property author - The author of the specs.
 * @property lastUpdated - The last update timestamp in ISO 8601 format.
 * @property generator - Information about the tool that generated the specs.
 * @property schema - Schema validation information.
 * @property conventions - Conventions of the one platform that produced the specs.
 * @property settings - Choices about the run that generated the specs.
 */
export type RunMetadata = {
  author: string;
  lastUpdated: string;
  generator: {
    url: string;
    version: string;
    name: string;
    /**
     * Resolved license state at the time this spec was generated.
     * Absent when no license was supplied to the generator.
     */
    license?: {
      /** License validation status (e.g. "VALID", "EXPIRED", "NONE"). */
      status: string;
      /** Output entitlement level (e.g. "FREE", "PRO", "EXTENDED"). */
      level: string;
    };
  };
  schema: {
    /** Versioned schema URL pinned to a git tag (e.g. https://raw.githubusercontent.com/.../v0.13.0/schema/component.schema.json) */
    url: string;
    version: string;
    /** Stable URL pointing to the latest schema on the main branch for discovery */
    latest?: string;
  };
  conventions: MetadataConventions;
  settings: ResolvedSettings;
};

/**
 * Which slice of a component a document carries.
 *
 * A run with `Settings.spec.splitConcerns` writes one file per concern rather
 * than a single component file. The value names the slice, and is what tells a
 * consumer — and a validator — which document it is holding (ADR-091).
 */
export type Concern = 'api' | 'variants' | 'examples';

/**
 * Represents the metadata for a component.
 *
 * `source` is the one metadata fact that belongs to the component carrying it —
 * the Figma node the spec was captured from — and is always present when a
 * `metadata` block is.
 *
 * The run's facts ({@link RunMetadata}) are optional here. A document that
 * states them carries the full block; one produced alongside a run metadata
 * document omits them, and a consumer reads them there instead (ADR-089).
 *
 * @property source - Figma source information.
 */
export type Metadata = Partial<RunMetadata> & {
  source: {
    pageId: string;
    nodeId: string;
    nodeType: 'COMPONENT' | 'COMPONENT_SET' | 'FRAME';
  };

  /**
   * Which slice of a component this document carries, when a run wrote one
   * file per concern. Absent on a single-file component, which carries every
   * concern at once (ADR-091).
   */
  concern?: Concern;
};
