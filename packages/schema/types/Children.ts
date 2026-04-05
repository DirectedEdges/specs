import { PropBinding } from './PropBinding.js';

/**
 * Data output for children.
 * Can be an array of child names or a PropBinding when bound to a slot prop.
 */
export type Children = string[] | PropBinding;
