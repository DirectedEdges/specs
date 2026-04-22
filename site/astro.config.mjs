import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://directededges.github.io',
  base: '/specs',
  integrations: [
    starlight({
      title: 'Specs',
      description: 'Generate structured, machine-readable UI component specifications from Figma.',
      social: {
        github: 'https://github.com/DirectedEdges/specs',
      },
      sidebar: [
        {
          label: 'Overview',
          items: [
            { label: 'Introduction', slug: '' },
            { label: 'Licensing', slug: 'overview/licensing' },
            { label: 'License (Legal)', slug: 'overview/license' },
            { label: 'Terms of Service', slug: 'overview/terms-of-service' },
          ],
        },
        {
          label: 'CLI',
          items: [
            { label: 'Overview', slug: 'cli' },
            { label: 'Getting Started', slug: 'cli/getting-started' },
            { label: 'Claude Code Onboarding', slug: 'cli/claude-onboarding' },
            { label: 'Configuration', slug: 'cli/configuration' },
            { label: 'Examples', slug: 'cli/examples' },
            {
              label: 'Commands',
              items: [
                { label: 'Commands Overview', slug: 'cli/commands' },
                { label: 'init', slug: 'cli/commands/init' },
                { label: 'fetch', slug: 'cli/commands/fetch' },
                { label: 'scan', slug: 'cli/commands/scan' },
                { label: 'generate', slug: 'cli/commands/generate' },
                { label: 'applyCustomTokens', slug: 'cli/commands/apply-custom-tokens' },
              ],
            },
          ],
        },
        {
          label: 'Schema',
          items: [
            { label: 'Schema Reference', slug: 'schema' },
            { label: 'Component', slug: 'schema/component' },
            { label: 'Anatomy', slug: 'schema/anatomy' },
            { label: 'Elements', slug: 'schema/elements' },
            { label: 'Layout', slug: 'schema/layout' },
            { label: 'Props', slug: 'schema/props' },
            { label: 'Styles', slug: 'schema/styles' },
            { label: 'Variants', slug: 'schema/variants' },
            { label: 'Subcomponents', slug: 'schema/subcomponents' },
            { label: 'Metadata', slug: 'schema/metadata' },
            { label: 'Config', slug: 'schema/config' },
            { label: 'Token Reference', slug: 'schema/token-reference' },
            { label: 'Prop Binding', slug: 'schema/prop-binding' },
            { label: 'Prop Configurations', slug: 'schema/prop-configurations' },
            { label: 'Conditional', slug: 'schema/conditional' },
            { label: 'Gradient Value', slug: 'schema/gradient-value' },
            { label: 'Typography', slug: 'schema/typography' },
            { label: 'Effects', slug: 'schema/effects' },
            { label: 'Sides', slug: 'schema/sides' },
            { label: 'Corners', slug: 'schema/corners' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'Variant Depth', slug: 'guides/variant-depth' },
            { label: 'Variant Layering', slug: 'guides/variant-layering' },
            { label: 'Data Layout', slug: 'guides/data-layout' },
            { label: 'Token Format', slug: 'guides/token-format' },
            { label: 'Key Formatting', slug: 'guides/key-formatting' },
            { label: 'Number Inference', slug: 'guides/number-inference' },
            { label: 'Slot Constraints', slug: 'guides/slot-constraints' },
            { label: 'Subcomponent Scoping', slug: 'guides/subcomponent-scoping' },
            { label: 'Code-Only Props', slug: 'guides/code-only-props' },
          ],
        },
      ],
    }),
  ],
});
