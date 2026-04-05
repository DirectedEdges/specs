import { Component } from "./Component.js";

/**
 * Represents a subcomponent in the data model.
 * 
 * A subcomponent is like a component but excludes metadata and nested subcomponents.
 */
export type Subcomponent = Omit<Component, 'metadata' | 'subcomponents'>;

/**
 * Record of subcomponents keyed by name
 */
export type Subcomponents = Record<string, Subcomponent>;
