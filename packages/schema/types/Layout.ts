/**
 * Serialized tree representation returned by data().
 * Format: Array containing the root node object.
 * Leaf nodes are strings, parent nodes are { [nodeName]: children[] }.
 * 
 * Example:
 * [
 *   {
 *     "root": [
 *       {
 *         "labelContainer": [
 *           "requiredIndicator",
 *           "label",
 *           "secondaryDescription"
 *         ]
 *       },
 *       {
 *         "control": [
 *           "value",
 *           "placeholder",
 *           "startIcon"
 *         ]
 *       }
 *     ]
 *   }
 * ]
 */
export type LayoutNode = string | { [nodeName: string]: LayoutNode[] };
export type Layout = LayoutNode[];
