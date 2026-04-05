import { Layout } from "./Layout.js";
import { PropConfigurations } from "./PropConfigurations.js";
import { Elements } from "./Element.js";

/**
 * Array of component variants
 */
export type Variants = Variant[];

/**
 * Represents a single variant of a component.
 */
export type Variant = {
  name?: string;
  baseline?: string;
  configuration?: PropConfigurations;
  invalid?: boolean;
  elements?: Elements;
  layout?: Layout;
};
