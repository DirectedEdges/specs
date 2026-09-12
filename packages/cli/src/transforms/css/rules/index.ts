import type { CssRule } from '../CssRule.js';

// The registry is empty since `border-shift-inset-shadow` was retired: it
// existed to stop a border-width change between variants from shifting layout,
// and no stroke shifts layout any more — every alignment emits an outline. The
// pipeline stays, because a rule is how a workspace-specific CSS rewrite is
// expressed and the next one will register here.
const RULE_REGISTRY: Record<string, CssRule> = {};

export function resolveRules(names: string[]): CssRule[] {
  return names.map(name => {
    const rule = RULE_REGISTRY[name];
    if (!rule) throw new Error(`Unknown CSS rule: "${name}"`);
    return rule;
  });
}
