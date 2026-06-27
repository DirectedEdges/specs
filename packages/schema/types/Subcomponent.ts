import { Component } from "./Component.js";

/**
 * Figma source identity for a subcomponent node.
 * Carries the Figma-specific provenance needed to resolve a subcomponent
 * back to its originating node — pageId, nodeId, and nodeType.
 * Intentionally a subset of Metadata.source; kept independent so the two
 * can evolve separately.
 * @since 0.27.0
 */
export type SubcomponentSource = {
  /** The Figma page ID containing this subcomponent's node. */
  pageId: string;
  /** The Figma node ID for this subcomponent's component node. */
  nodeId: string;
  /** The Figma node type. */
  nodeType: 'COMPONENT' | 'COMPONENT_SET' | 'FRAME';
};

/**
 * Represents a subcomponent in the data model.
 *
 * A subcomponent is like a component but excludes full metadata and nested subcomponents.
 * The optional `source` field carries the Figma node identity needed for reverse-direction
 * tools (e.g. spec → Figma writers) to instantiate subcomponent-referenced elements.
 */
export type Subcomponent = Omit<Component, 'metadata' | 'subcomponents'> & {
  /**
   * Figma source identity for this subcomponent's node.
   * Populated by the generator; absent in specs produced before ADR-060.
   */
  source?: SubcomponentSource;
};

/**
 * Record of subcomponents keyed by name
 */
export type Subcomponents = Record<string, Subcomponent>;
