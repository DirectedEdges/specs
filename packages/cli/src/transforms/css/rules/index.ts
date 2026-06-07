import type { CssRule } from '../CssRule.js';
import { borderShiftInsetShadow } from './borderShiftInsetShadow.js';

const RULE_REGISTRY: Record<string, CssRule> = {
  'border-shift-inset-shadow': borderShiftInsetShadow,
};

export function resolveRules(names: string[]): CssRule[] {
  return names.map(name => {
    const rule = RULE_REGISTRY[name];
    if (!rule) throw new Error(`Unknown CSS rule: "${name}"`);
    return rule;
  });
}
