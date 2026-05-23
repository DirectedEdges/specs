import { Anatomy } from "./Anatomy.js";
import { Elements } from "./Element.js";
import { Layout } from "./Layout.js";

/**
 * The anonymous structural triplet — anatomy, elements, layout — used as a
 * named slot fill. Carries no metadata of its own; identity lives at the
 * key under which it is stored (`Component.slotContentExamples` or
 * `Composition.slotContent`).
 */
export interface SlotContent {
  anatomy: Anatomy;
  elements: Elements;
  layout: Layout;
}
